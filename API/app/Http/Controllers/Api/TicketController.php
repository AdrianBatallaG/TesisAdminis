<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sacrament;
use App\Models\ServiceTicket;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class TicketController extends Controller
{
    public function storeDocument(Request $request)
    {
        abort_if($request->user()->hasAnyRole(['admin', 'editor']), 403, 'El personal parroquial gestiona documentos desde Sacramentos.');
        $details = $request->validate([
            'nombres_completos' => ['required', 'string', 'min:5', 'max:511'],
            'cedula' => ['required', 'string', 'regex:/^[0-9]{10}$/'],
            'numero_certificado' => ['nullable', 'string', 'max:80'],
            'tipo' => ['required', Rule::in(['bautismo', 'comunion', 'confirmacion', 'matrimonio'])],
            'anio' => ['nullable', 'integer', 'min:1500', 'max:'.date('Y')],
            'email' => ['required', 'email', 'max:255'],
            'comprobante' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        unset($details['comprobante']);
        $path = $request->file('comprobante')?->store('document-proofs', 'local');
        abort_if($path === false,500,'No se pudo guardar el comprobante.');
        try {
        $ticket = DB::transaction(function () use ($request, $details, $path) {
            $ticket = ServiceTicket::create(['type' => 'documento', 'user_id' => $request->user()->id, 'status' => 'pendiente', 'details' => $details, 'proof_path' => $path]);
            AuditLogger::log($request, 'tickets', 'solicitar_documento', $ticket, 'Solicitud de documento recibida.');

            return $ticket;
        });

        } catch (\Throwable $exception) {
            if ($path) Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json(['message' => 'Solicitud recibida. El equipo parroquial revisarÃƒ¡ tu documento.', 'ticket' => $this->format($ticket)], 201);
    }

    public function proof(ServiceTicket $ticket)
    {
        abort_unless($ticket->type === 'documento' && $ticket->proof_path && Storage::disk('local')->exists($ticket->proof_path),404,'No hay comprobante adjunto.');
        return response()->file(Storage::disk('local')->path($ticket->proof_path), ['Cache-Control'=>'private, no-store']);
    }

    public function mine(Request $request)
    {
        return ServiceTicket::where('user_id', $request->user()->id)->with(['assignee', 'donation'])->latest()->get()->map(fn ($ticket) => $this->format($ticket));
    }

    public function index(Request $request)
    {
        $input = $request->validate(['status' => ['nullable', Rule::in(['pendiente', 'en_revision', 'aprobado', 'rechazado', 'resuelto'])], 'type' => ['nullable', Rule::in(['documento', 'donacion'])]]);
        $query = ServiceTicket::with(['assignee', 'requester', 'donation', 'sacrament'])->latest();
        foreach (['status', 'type'] as $key) {
            if (! empty($input[$key])) {
                $query->where($key, $input[$key]);
            }
        }

        return $query->paginate(20)->through(fn ($ticket) => $this->format($ticket, true));
    }

    public function show(ServiceTicket $ticket)
    {
        return $this->format($ticket->load(['assignee', 'requester', 'donation', 'sacrament']), true);
    }

    public function update(Request $request, ServiceTicket $ticket)
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['tomar', 'liberar', 'aprobar', 'rechazar', 'resolver', 'responder'])],
            'version' => ['required', 'integer', 'min:0'],
            'response' => ['nullable', 'string', 'max:2000'],
            'sacrament_id' => ['nullable', 'integer', 'exists:sacraments,id'],
            'confirmed' => ['nullable', 'boolean'],
        ]);

        return DB::transaction(function () use ($request, $ticket, $data) {
            $ticket = ServiceTicket::lockForUpdate()->findOrFail($ticket->id);
            abort_if($ticket->version !== (int)$data['version'], 409, 'El ticket cambiÃƒÂ³. Actualiza la bandeja antes de continuar.');
            abort_unless(in_array($ticket->status, ['pendiente', 'en_revision']), 409, 'Este ticket ya fue resuelto.');
            abort_if($ticket->type === 'donacion' && $ticket->donation?->trashed(), 409, 'El movimiento fue eliminado. Su ticket se conserva como historial.');
            $old = $ticket->only(['status', 'assigned_to']);
            if ($data['action'] === 'liberar') {
                abort_unless($ticket->assigned_to === $request->user()->id || $request->user()->hasRole('admin'),403,'Solo el responsable o un administrador puede liberar el ticket.');
                $ticket->assigned_to = null;
                $ticket->status = 'pendiente';
            } elseif ($data['action'] === 'tomar') {
                abort_if($ticket->assigned_to && $ticket->assigned_to !== $request->user()->id, 409, 'Otro colaborador estÃƒ¡ revisando este ticket.');
                $ticket->assigned_to = $request->user()->id;
                $ticket->status = 'en_revision';
            } else {
                abort_unless($ticket->assigned_to === $request->user()->id, 409, 'Primero toma el ticket para revisarlo.');
                abort_if(empty(trim($data['response'] ?? '')), 422, 'Escribe una respuesta para el solicitante.');
                if ($data['action'] === 'responder') {
                    $ticket->status = 'en_revision';
                } elseif ($data['action'] === 'aprobar') {
                    abort_unless($ticket->type === 'donacion' && ($data['confirmed'] ?? false), 422, 'Confirma que verificaste el comprobante y la recepciÃƒÂ³n del aporte.');
                    abort_unless($ticket->donation?->comprobante_path, 422, 'La donaciÃƒÂ³n no tiene foto de comprobante.');
                    $ticket->status = 'aprobado';
                } elseif ($data['action'] === 'resolver') {
                    abort_unless($ticket->type === 'documento' && ! empty($data['sacrament_id']) && ($data['confirmed'] ?? false), 422, 'Selecciona el registro y confirma que corresponde al solicitante.');
                    $ticket->sacrament_id = $data['sacrament_id'];
                    $ticket->status = 'resuelto';
                } else {
                    $ticket->status = 'rechazado';
                }
                $ticket->response = $data['response'];
                $ticket->resolved_at = $data['action'] === 'responder' ? null : now();
            }
            if ($ticket->type === 'donacion') {
                $ticket->donation()->update(['review_status' => $ticket->status, 'updated_by' => $request->user()->id]);
            }
            $ticket->version++;
            $ticket->save();
            AuditLogger::log($request, 'tickets', $data['action'], $ticket, 'Ticket actualizado.', $old, $ticket->only(['status', 'assigned_to', 'sacrament_id']));

            return $this->format($ticket->load(['assignee', 'requester', 'donation', 'sacrament']), true);
        });
    }

    public function document(Request $request, ServiceTicket $ticket)
    {
        abort_unless($ticket->user_id === $request->user()->id, 403);
        abort_unless($ticket->type === 'documento' && $ticket->status === 'resuelto' && $ticket->sacrament_id, 409, 'El documento todavÃƒÂ­a no estÃƒ¡ disponible.');

        return app(SacramentController::class)->certificate(Sacrament::findOrFail($ticket->sacrament_id));
    }

    private function format(ServiceTicket $ticket, bool $staff = false): array
    {
        $result = ['has_proof' => (bool)$ticket->proof_path, 'id' => $ticket->id, 'type' => $ticket->type, 'status' => $ticket->status, 'details' => $ticket->details, 'response' => $ticket->response, 'version' => $ticket->version, 'assigned_to' => $ticket->assigned_to, 'assigned_name' => $ticket->assignee?->name, 'created_at' => $ticket->created_at?->toIso8601String(), 'resolved_at' => $ticket->resolved_at?->toIso8601String(), 'document_ready' => $ticket->type === 'documento' && $ticket->status === 'resuelto' && (bool) $ticket->sacrament_id];
        if ($ticket->donation) {
            $result['donation'] = ['id' => $ticket->donation->id, 'nombre' => $ticket->donation->nombre_donante, 'monto' => (float) $ticket->donation->monto, 'fecha' => $ticket->donation->fecha?->toDateString(), 'categoria' => $ticket->donation->categoria, 'tiene_comprobante' => (bool) $ticket->donation->comprobante_path, 'review_status' => $ticket->donation->review_status];
        }
        if ($staff) {
            $result['requester_email'] = $ticket->requester?->email ?? $ticket->donation?->email_donante;
            $result['sacrament_id'] = $ticket->sacrament_id;
        }

        return $result;
    }
}
