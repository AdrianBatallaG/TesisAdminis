<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donation;
use App\Models\ServiceTicket;
use App\Support\AuditLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DonationController extends Controller
{
    private array $allowedMovementTypes = ['ingreso', 'egreso'];

    public function index(Request $request): JsonResponse
    {
        $query = Donation::query()->latest('fecha');

        if ($request->filled('tipo_movimiento')) {
            $query->where('tipo_movimiento', $request->string('tipo_movimiento'));
        }

        if ($request->filled('categoria')) {
            $query->where('categoria', $request->string('categoria'));
        }

        if ($request->filled('from')) {
            $query->whereDate('fecha', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('fecha', '<=', $request->string('to'));
        }

        $items = $query->get()->map(fn (Donation $donation) => $this->formatDonation($donation));

        return response()->json($items);
    }

    public function myDonations(Request $request): JsonResponse
    {
        $items = Donation::query()
            ->where(function ($query) use ($request) {
                $query->where('created_by', $request->user()->id)
                    ->orWhere(function ($legacy) use ($request) {
                        $legacy->whereNull('public_receipt_token')->where('email_donante', $request->user()->email);
                    });
            })
            ->latest('fecha')
            ->get()
            ->map(fn (Donation $donation) => $this->formatDonation($donation));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre_donante' => ['required', 'string', 'max:255'],
            'email_donante' => ['nullable', 'email', 'max:255'],
            'tipo_movimiento' => ['required', Rule::in($this->allowedMovementTypes)],
            'categoria' => ['required', 'string', 'max:120'],
            'monto' => ['required', 'numeric', 'min:0.01'],
            'fecha' => ['required', 'date'],
            'numero_comprobante' => ['nullable', 'string', 'max:100', 'unique:donations,numero_comprobante'],
            'descripcion' => ['nullable', 'string'],
        ]);

        $item = Donation::create([
            ...$validated,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'finanzas', 'crear_movimiento', $item, 'Movimiento financiero registrado.', [], $item->toArray());

        return response()->json($this->formatDonation($item), 201);
    }

    public function update(Request $request, Donation $donation): JsonResponse
    {
        $validated = $request->validate([
            'nombre_donante' => ['required', 'string', 'max:255'],
            'email_donante' => ['nullable', 'email', 'max:255'],
            'tipo_movimiento' => ['required', Rule::in($this->allowedMovementTypes)],
            'categoria' => ['required', 'string', 'max:120'],
            'monto' => ['required', 'numeric', 'min:0.01'],
            'fecha' => ['required', 'date'],
            'numero_comprobante' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('donations', 'numero_comprobante')->ignore($donation->id),
            ],
            'descripcion' => ['nullable', 'string'],
        ]);

        $oldValues = $donation->toArray();
        $donation->update([
            ...$validated,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'finanzas', 'editar_movimiento', $donation, 'Movimiento financiero actualizado.', $oldValues, $donation->fresh()->toArray());

        return response()->json($this->formatDonation($donation->fresh()));
    }

    public function destroy(Request $request, Donation $donation): JsonResponse
    {
        $oldValues = $donation->toArray();
        DB::transaction(function () use ($request, $donation, $oldValues): void {
            $ticket = ServiceTicket::where('donation_id', $donation->id)->lockForUpdate()->first();
            if ($ticket && in_array($ticket->status, ['pendiente', 'en_revision'])) {
                $ticket->update(['status'=>'rechazado', 'response'=>'El registro de este aporte fue eliminado por administración. Para más información, comunícate con secretaría.', 'resolved_at'=>now(), 'version'=>$ticket->version + 1]);
            }
            $donation->delete();
            AuditLogger::log($request, 'finanzas', 'eliminar_movimiento', null, 'Movimiento financiero eliminado.', $oldValues, []);
        });


        return response()->json([
            'message' => 'Movimiento financiero eliminado correctamente.',
        ]);
    }

    public function publicDonation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre_donante' => ['required', 'string', 'max:255'],
            'email_donante' => ['nullable', 'email', 'max:255'],
            'monto' => ['required', 'numeric', 'min:0.01'],
            'categoria' => ['nullable', 'string', 'max:120'],
            'descripcion' => ['nullable', 'string'],
            'comprobante' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'max:5120'],
        ], [
            'comprobante.required' => 'Debes adjuntar una foto del comprobante.',
            'comprobante.max' => 'La foto del comprobante no debe superar los 5 MB.',
            'comprobante.image' => 'Selecciona una imagen válida del comprobante.',
            'comprobante.mimes' => 'El comprobante debe ser una imagen JPG, PNG o WebP.',
        ]);

        $owner = Auth::guard('sanctum')->user();
        if ($owner) {
            abort_unless($owner->hasVerifiedEmail() && $owner->is_active && ! $owner->activity_blocked, 403, 'Tu cuenta no puede enviar aportes en este momento.');
        }

        $attachmentPath = $request->hasFile('comprobante')
            ? $request->file('comprobante')->store('donation-proofs', 'local')
            : null;
        abort_if($attachmentPath === false, 500, 'No se pudo guardar la foto del comprobante.');

        try {
            $donation = DB::transaction(function () use ($validated, $attachmentPath, $owner) {
                $donation = Donation::create([
                    'nombre_donante' => $validated['nombre_donante'],
                    'email_donante' => $validated['email_donante'] ?? null,
                    'tipo_movimiento' => 'ingreso',
                    'categoria' => $validated['categoria'] ?? 'donacion_general',
                    'monto' => $validated['monto'],
                    'fecha' => now()->toDateString(),
                    'descripcion' => $validated['descripcion'] ?? null,
                    'public_receipt_token' => Str::random(48),
                    'comprobante_path' => $attachmentPath,
                    'review_status' => 'pendiente',
                    'created_by' => $owner?->id,
                ]);
                ServiceTicket::create(['type' => 'donacion', 'status' => 'pendiente', 'donation_id' => $donation->id, 'user_id' => $owner?->id, 'details' => ['nombre' => $donation->nombre_donante]]);

                return $donation;
            });
        } catch (\Throwable $exception) {
            if ($attachmentPath) {
                Storage::disk('local')->delete($attachmentPath);
            }
            throw $exception;
        }

        return response()->json([
            'message' => 'Comprobante recibido. Tu donación está pendiente de revisión.',
            'receipt' => [
                'id' => $donation->id,
                'nombre_donante' => $donation->nombre_donante,
                'monto' => (float) $donation->monto,
                'fecha' => optional($donation->fecha)->toDateString(),
                'token' => $donation->public_receipt_token,
                'download_url' => null,
                'review_status' => 'pendiente',
                'ticket_id' => ServiceTicket::where('donation_id', $donation->id)->value('id'),
                'tiene_comprobante' => (bool) $donation->comprobante_path,
            ],
        ], 201);
    }

    public function publicReceipt(Request $request, Donation $donation)
    {
        $token = (string) $request->query('token', '');

        abort_unless($token !== '' && hash_equals((string) $donation->public_receipt_token, $token), 403, 'Token inválido.');

        return $this->buildReceipt($donation);
    }

    public function publicStatus(Request $request, Donation $donation)
    {
        $token = (string) $request->query('token', '');
        abort_unless($token !== '' && hash_equals((string) $donation->public_receipt_token, $token), 403);
        $ticket = ServiceTicket::where('donation_id', $donation->id)->first();

        return response()->json(['id' => $donation->id, 'ticket_id' => $ticket?->id, 'review_status' => $donation->review_status, 'response' => $ticket?->response,
            'download_url' => $donation->review_status === 'aprobado' ? rtrim(config('app.url'), '/').'/api/finanzas/donaciones/public/'.$donation->id.'/comprobante?token='.$token : null,
        ])->header('Cache-Control', 'private, no-store');
    }

    public function myReceipt(Request $request, Donation $donation)
    {
        abort_unless($donation->created_by === $request->user()->id || (! $donation->public_receipt_token && ($donation->email_donante ?? '') === $request->user()->email), 403, 'No puedes acceder a este comprobante.');

        return $this->buildReceipt($donation);
    }

    public function receipt(Donation $donation)
    {
        return $this->buildReceipt($donation);
    }

    public function proof(Donation $donation)
    {
        abort_unless($donation->comprobante_path && Storage::disk('local')->exists($donation->comprobante_path), 404, 'No hay una foto de comprobante adjunta.');

        return response()->file(Storage::disk('local')->path($donation->comprobante_path), [
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function buildReceipt(Donation $donation)
    {
        abort_unless($donation->review_status === 'aprobado', 409, 'El comprobante está pendiente de aprobación o fue rechazado.');
        $pdf = Pdf::loadView('pdf.donation-receipt', [
            'donation' => $donation,
            'issuedAt' => now(),
        ])->setPaper('a5', 'portrait');

        return $pdf->download('comprobante-donacion-'.$donation->id.'.pdf');
    }

    private function formatDonation(Donation $item): array
    {
        return [
            'id' => $item->id,
            'nombre_donante' => $item->nombre_donante,
            'email_donante' => $item->email_donante,
            'tipo_movimiento' => $item->tipo_movimiento,
            'categoria' => $item->categoria,
            'monto' => (float) $item->monto,
            'fecha' => optional($item->fecha)->toDateString(),
            'numero_comprobante' => $item->numero_comprobante,
            'descripcion' => $item->descripcion,
            'tiene_comprobante' => (bool) $item->comprobante_path,
            'review_status' => $item->review_status,
            'has_ticket' => (bool) $item->public_receipt_token,
            'review_response' => ServiceTicket::where('donation_id', $item->id)->value('response'),
            'created_at' => $item->created_at,
        ];
    }
}
