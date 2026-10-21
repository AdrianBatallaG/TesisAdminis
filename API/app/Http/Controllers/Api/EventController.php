<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventAttendance;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    /**
     * @var list<string>
     */
    private array $eventTypes = ['misa', 'catequesis', 'retiro', 'actividad_social', 'otro'];

    public function index(Request $request): JsonResponse
    {
        $query = Event::query()
            ->orderBy('fecha')
            ->orderBy('hora');

        if ($request->filled('from')) {
            $query->whereDate('fecha', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('fecha', '<=', $request->string('to'));
        }

        if ($request->filled('tipo_evento')) {
            $query->where('tipo_evento', $request->string('tipo_evento'));
        }

        $events = $query
            ->get()
            ->map(fn (Event $event) => $this->formatEvent($event));

        return response()->json($events);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'fecha' => ['required', 'date'],
            'hora' => ['required', 'date_format:H:i'],
            'lugar' => ['required', 'string', 'max:255'],
            'tipo_evento' => ['required', 'string', Rule::in($this->eventTypes)],
            'tipo_evento_otro' => ['exclude_unless:tipo_evento,otro','required','string','max:80'],
            'encargado' => ['required', 'string', 'max:255'],
        ]);

        $event = Event::create([
            ...$validated,
            'tipo_evento_otro' => $validated['tipo_evento_otro'] ?? null,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'eventos', 'crear', $event, 'Evento pastoral creado.', [], $event->toArray());

        return response()->json($this->formatEvent($event), 201);
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'fecha' => ['required', 'date'],
            'hora' => ['required', 'date_format:H:i'],
            'lugar' => ['required', 'string', 'max:255'],
            'tipo_evento' => ['required', 'string', Rule::in($this->eventTypes)],
            'tipo_evento_otro' => ['exclude_unless:tipo_evento,otro','required','string','max:80'],
            'encargado' => ['required', 'string', 'max:255'],
        ]);

        $oldValues = $event->getOriginal();
        $event->update([
            ...$validated,
            'tipo_evento_otro' => $validated['tipo_evento_otro'] ?? null,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'eventos', 'editar', $event, 'Evento pastoral actualizado.', $oldValues, $event->fresh()->toArray());

        return response()->json($this->formatEvent($event->fresh()));
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $oldValues = $event->toArray();
        $event->delete();

        AuditLogger::log($request, 'eventos', 'eliminar', null, 'Evento pastoral eliminado.', $oldValues, []);

        return response()->json([
            'message' => 'Evento eliminado correctamente.',
        ]);
    }

    public function attendanceIndex(Event $event): JsonResponse
    {
        $attendances = EventAttendance::query()
            ->where('event_id', $event->id)
            ->latest('registrado_en')
            ->get()
            ->map(fn (EventAttendance $attendance) => [
                'id' => $attendance->id,
                'event_id' => $attendance->event_id,
                'member_id' => $attendance->member_id,
                'nombre' => $attendance->nombre,
                'email' => $attendance->email,
                'registrado_en' => $attendance->registrado_en,
            ]);

        return response()->json([
            'event' => $this->formatEvent($event),
            'attendances' => $attendances,
        ]);
    }

    public function attendanceStore(Request $request, Event $event): JsonResponse
    {
        $validated = $request->validate([
            'member_id' => ['nullable', 'integer', 'exists:members,id'],
            'nombre' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $attendance = EventAttendance::create([
            ...$validated,
            'event_id' => $event->id,
            'created_by' => $request->user()?->id,
        ]);

        AuditLogger::log(
            $request,
            'eventos',
            'registrar_asistencia',
            $event,
            'Asistencia registrada en evento pastoral.',
            [],
            $attendance->toArray()
        );

        return response()->json([
            'message' => 'Asistencia registrada correctamente.',
            'attendance' => [
                'id' => $attendance->id,
                'event_id' => $attendance->event_id,
                'member_id' => $attendance->member_id,
                'nombre' => $attendance->nombre,
                'email' => $attendance->email,
                'registrado_en' => $attendance->registrado_en,
            ],
        ], 201);
    }

    private function formatEvent(Event $event): array
    {
        return [
            'id' => $event->id,
            'titulo' => $event->titulo,
            'descripcion' => $event->descripcion,
            'fecha' => optional($event->fecha)->toDateString(),
            'hora' => $event->hora,
            'lugar' => $event->lugar,
            'tipo_evento_otro' => $event->tipo_evento_otro,
            'tipo_evento' => $event->tipo_evento ?: 'actividad_social',
            'encargado' => $event->encargado,
            'created_at' => $event->created_at,
            'updated_at' => $event->updated_at,
        ];
    }
}
