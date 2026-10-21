<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sacrament;
use App\Support\AuditLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SacramentController extends Controller
{
    /**
     * @var list<string>
     */
    private array $allowedTypes = ['bautismo', 'comunion', 'confirmacion', 'matrimonio'];

    public function index(Request $request): JsonResponse
    {
        $query = Sacrament::query()->latest('fecha');

        if ($request->filled('cedula')) { $query->where('cedula', $request->string('cedula')->toString()); }

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->string('tipo'));
        }

        if ($request->filled('fecha')) {
            $query->whereDate('fecha', $request->string('fecha'));
        }

        if ($request->filled('from')) {
            $query->whereDate('fecha', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('fecha', '<=', $request->string('to'));
        }

        if ($request->filled('numero_certificado')) {
            $query->where('numero_certificado', 'like', '%'.$request->string('numero_certificado').'%');
        }

        if ($request->filled('nombre')) {
            $query->where('nombre', 'like', '%'.$request->string('nombre').'%');
        }

        if ($request->filled('apellido')) {
            $query->where('apellido', 'like', '%'.$request->string('apellido').'%');
        }

        if ($request->filled('q')) {
            $search = $request->string('q');
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('nombre', 'like', '%'.$search.'%')
                    ->orWhere('apellido', 'like', '%'.$search.'%')
                    ->orWhere('numero_certificado', 'like', '%'.$search.'%');
            });
        }

        $items = $query->get()->map(fn (Sacrament $item) => $this->formatSacrament($item));

        return response()->json($items);
    }

    public function myRecords(Request $request): JsonResponse
    {
        $items = Sacrament::query()
            ->where('email', $request->user()->email)
            ->latest('fecha')
            ->get()
            ->map(fn (Sacrament $item) => $this->formatSacrament($item));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipo' => ['required', 'string', Rule::in($this->allowedTypes)],
            'nombre' => ['required', 'string', 'max:255'],
            'apellido' => ['required', 'string', 'max:255'],
            'cedula' => ['nullable', 'string', 'regex:/^[0-9]{10}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'fecha' => ['required', 'date'],
            'lugar' => ['nullable', 'string', 'max:255'],
            'numero_certificado' => ['required', 'string', 'max:80', 'unique:sacraments,numero_certificado'],
            'celebrante' => ['nullable', 'string', 'max:255'],
            'padrinos' => ['nullable'],
            'libro' => ['nullable', 'string', 'max:100'],
            'folio' => ['nullable', 'string', 'max:100'],
            'tomo' => ['nullable', 'string', 'max:100'],
            'pagina' => ['nullable', 'string', 'max:100'],
            'numero_asiento' => ['nullable', 'string', 'max:100'],
            'estado' => ['nullable', 'string', 'max:50'],
            'notas' => ['nullable', 'string'],
            'datos_adicionales' => ['nullable', 'array'],
        ]);

        $validated['datos_adicionales'] = $this->normalizeDetails($validated['datos_adicionales'] ?? []);
        $this->validateSpecificDetails($validated['tipo'], $validated['datos_adicionales'], $validated);

        $item = Sacrament::create([
            ...$validated,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'sacramentos', 'crear', $item, 'Registro sacramental creado.', [], $item->toArray());

        return response()->json($this->formatSacrament($item), 201);
    }

    public function update(Request $request, Sacrament $sacrament): JsonResponse
    {
        $validated = $request->validate([
            'tipo' => ['required', 'string', Rule::in($this->allowedTypes)],
            'nombre' => ['required', 'string', 'max:255'],
            'apellido' => ['required', 'string', 'max:255'],
            'cedula' => ['nullable', 'string', 'regex:/^[0-9]{10}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'fecha' => ['required', 'date'],
            'lugar' => ['nullable', 'string', 'max:255'],
            'numero_certificado' => [
                'required',
                'string',
                'max:80',
                Rule::unique('sacraments', 'numero_certificado')->ignore($sacrament->id),
            ],
            'celebrante' => ['nullable', 'string', 'max:255'],
            'padrinos' => ['nullable'],
            'libro' => ['nullable', 'string', 'max:100'],
            'folio' => ['nullable', 'string', 'max:100'],
            'tomo' => ['nullable', 'string', 'max:100'],
            'pagina' => ['nullable', 'string', 'max:100'],
            'numero_asiento' => ['nullable', 'string', 'max:100'],
            'estado' => ['nullable', 'string', 'max:50'],
            'notas' => ['nullable', 'string'],
            'datos_adicionales' => ['nullable', 'array'],
        ]);

        $validated['datos_adicionales'] = $this->normalizeDetails($validated['datos_adicionales'] ?? []);
        $this->validateSpecificDetails($validated['tipo'], $validated['datos_adicionales'], $validated);

        $oldValues = $sacrament->toArray();
        $sacrament->update([
            ...$validated,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log(
            $request,
            'sacramentos',
            'editar',
            $sacrament,
            'Registro sacramental actualizado.',
            $oldValues,
            $sacrament->fresh()->toArray()
        );

        return response()->json($this->formatSacrament($sacrament->fresh()));
    }

    public function destroy(Request $request, Sacrament $sacrament): JsonResponse
    {
        $oldValues = $sacrament->toArray();
        $sacrament->delete();

        AuditLogger::log($request, 'sacramentos', 'eliminar', null, 'Registro sacramental eliminado.', $oldValues, []);

        return response()->json([
            'message' => 'Registro sacramental eliminado correctamente.',
        ]);
    }

    public function certificate(Sacrament $sacrament)
    {
        $verificationToken = $this->verificationToken($sacrament);
        $frontendVerificationUrl = rtrim((string) config('app.frontend_url'), '/').'/certificados/verificar?id='.$sacrament->id.'&token='.$verificationToken;

        $qrDataUri = Builder::create()
            ->writer(new PngWriter())
            ->data($frontendVerificationUrl)
            ->size(360)
            ->margin(24)
            ->build()
            ->getDataUri();

        $pdf = Pdf::loadView('pdf.sacrament-certificate', [
            'sacrament' => $sacrament,
            'issuedAt' => now(),
            'qrDataUri' => $qrDataUri,
            'priestName' => (string) config('app.parish_priest_name'),
            'signatureTitle' => (string) config('app.parish_signature_title'),
            'digitalSealName' => (string) config('app.parish_digital_seal'),
        ])->setPaper('a5', 'portrait');

        return $pdf->download('certificado-'.$sacrament->numero_certificado.'.pdf');
    }

    public function verifyCertificate(Request $request, Sacrament $sacrament): JsonResponse
    {
        $token = (string) $request->query('token', '');

        if ($token === '' || ! hash_equals($this->verificationToken($sacrament), $token)) {
            return response()->json([
                'valid' => false,
                'message' => 'El certificado no pudo validarse. El QR es inválido o ya no corresponde al registro actual.',
            ], 403);
        }

        return response()->json([
            'valid' => true,
            'message' => 'Certificado válido y auténtico.',
            'record' => $this->formatSacrament($sacrament),
        ]);
    }

    public function requestCertificate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'numero_certificado' => ['required', 'string'],
            'email' => ['nullable', 'email'],
        ]);

        $sacrament = Sacrament::query()
            ->where('numero_certificado', $validated['numero_certificado'])
            ->when(
                ! empty($validated['email'] ?? null),
                fn ($query) => $query->where('email', $validated['email'])
            )
            ->first();

        if (! $sacrament) {
            return response()->json([
                'message' => 'No se encontró un registro con los datos proporcionados.',
            ], 404);
        }

        return response()->json([
            'message' => 'Registro encontrado. Solicita apoyo a secretaría para emisión oficial.',
            'record' => $this->formatSacrament($sacrament),
        ]);
    }

    public function verifyPublicCertificate(Request $request, Sacrament $sacrament): JsonResponse
    {
        $token = (string) $request->query('token', '');

        if ($token === '' || ! hash_equals($this->verificationToken($sacrament), $token)) {
            return response()->json([
                'valid' => false,
                'message' => 'El certificado no pudo validarse.',
            ], 403);
        }

        return response()->json([
            'valid' => true,
            'message' => 'Certificado valido y autentico.',
            'record' => $this->formatPublicCertificateVerification($sacrament),
        ]);
    }


    /**
     * @param  array<string, mixed>  $details
     * @param  array<string, mixed>  $payload
     */
    private function validateSpecificDetails(string $type, array $details, array $payload): void
    {
        $errors = [];

        if ($type === 'bautismo') {
            $padres = $details['padres'] ?? [];
            $padrinos = $details['padrinos'] ?? [];

            if (! is_array($padres) || (($padres['padre'] ?? '') === '' && ($padres['madre'] ?? '') === '')) {
                $errors['datos_adicionales.padres'][] = 'Debes registrar al menos un dato de padre o madre para bautismo.';
            }

            if (! is_array($padrinos) || count($padrinos) === 0) {
                $errors['datos_adicionales.padrinos'][] = 'Debes registrar al menos un padrino para bautismo.';
            }

            if (($payload['celebrante'] ?? '') === '') {
                $errors['celebrante'][] = 'El celebrante es obligatorio para bautismo.';
            }

            foreach (['tomo', 'pagina', 'numero_asiento'] as $field) {
                if (($payload[$field] ?? '') === '') {
                    $errors[$field][] = 'Este campo es obligatorio para bautismo.';
                }
            }
        }

        if ($type === 'confirmacion') {
            if (($payload['lugar'] ?? '') === '') {
                $errors['lugar'][] = 'El lugar es obligatorio para confirmación.';
            }

            if (($details['obispo_o_delegado'] ?? '') === '') {
                $errors['datos_adicionales.obispo_o_delegado'][] = 'Debes registrar obispo o delegado para confirmación.';
            }

            $padrinos = $details['padrinos'] ?? [];
            if (! is_array($padrinos) || count($padrinos) === 0) {
                $errors['datos_adicionales.padrinos'][] = 'Debes registrar padrinos para confirmación.';
            }
        }

        if ($type === 'matrimonio') {
            if (($details['conyuge_1'] ?? '') === '') {
                $errors['datos_adicionales.conyuge_1'][] = 'Debes registrar el primer cónyuge.';
            }

            if (($details['conyuge_2'] ?? '') === '') {
                $errors['datos_adicionales.conyuge_2'][] = 'Debes registrar el segundo cónyuge.';
            }

            $testigos = $details['testigos'] ?? [];
            if (! is_array($testigos) || count($testigos) === 0) {
                $errors['datos_adicionales.testigos'][] = 'Debes registrar al menos un testigo para matrimonio.';
            }

            $gender = (string) ($details['genero_matrimonio'] ?? '');
            if (! in_array($gender, ['ecumenico', 'canonico'], true)) {
                $errors['datos_adicionales.genero_matrimonio'][] = 'El género de matrimonio debe ser ecuménico o canónico.';
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * @param  array<string, mixed>  $details
     * @return array<string, mixed>
     */
    private function normalizeDetails(array $details): array
    {
        $normalized = $details;

        foreach (['padrinos', 'testigos'] as $key) {
            if (isset($normalized[$key]) && is_string($normalized[$key])) {
                $normalized[$key] = collect(explode(',', $normalized[$key]))
                    ->map(fn (string $value) => trim($value))
                    ->filter(fn (string $value) => $value !== '')
                    ->values()
                    ->all();
            }

            if (! isset($normalized[$key])) {
                $normalized[$key] = [];
            }
        }

        if (! isset($normalized['padres']) || ! is_array($normalized['padres'])) {
            $normalized['padres'] = [];
        }

        return $normalized;
    }

    private function verificationToken(Sacrament $sacrament): string
    {
        $payload = implode('|', [
            $sacrament->id,
            $sacrament->numero_certificado,
            $sacrament->tipo,
            $sacrament->fecha?->format('Y-m-d'),
            $sacrament->updated_at?->timestamp,
        ]);

        return hash_hmac('sha256', $payload, (string) config('app.key'));
    }

    private function formatPublicCertificateVerification(Sacrament $item): array
    {
        return [
            'id' => $item->id,
            'tipo' => $item->tipo,
            'nombre_completo' => trim($item->nombre.' '.$item->apellido),
            'fecha' => optional($item->fecha)->toDateString(),
            'lugar' => $item->lugar,
            'numero_certificado' => $item->numero_certificado,
            'estado' => $item->estado,
        ];
    }

    private function formatSacrament(Sacrament $item): array
    {
        return [
            'id' => $item->id,
            'tipo' => $item->tipo,
            'nombre' => $item->nombre,
            'apellido' => $item->apellido,
            'cedula' => $item->cedula,
            'email' => $item->email,
            'fecha' => optional($item->fecha)->toDateString(),
            'lugar' => $item->lugar,
            'numero_certificado' => $item->numero_certificado,
            'celebrante' => $item->celebrante,
            'padrinos' => $item->padrinos,
            'libro' => $item->libro,
            'folio' => $item->folio,
            'tomo' => $item->tomo,
            'pagina' => $item->pagina,
            'numero_asiento' => $item->numero_asiento,
            'estado' => $item->estado,
            'notas' => $item->notas,
            'datos_adicionales' => $item->datos_adicionales,
            'created_at' => $item->created_at,
        ];
    }
}
