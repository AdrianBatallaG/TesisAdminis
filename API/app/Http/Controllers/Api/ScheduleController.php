<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScheduleItem;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ScheduleController extends Controller
{
    private array $allowedTypes = ['misa', 'atencion'];

    public function index(Request $request): JsonResponse
    {
        $query = ScheduleItem::query()->orderBy('tipo')->orderBy('dia_semana')->orderBy('hora_inicio');

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->string('tipo'));
        }

        if (! $request->user()) {
            $query->where('publico', true);
        }

        $items = $query
            ->get()
            ->map(fn (ScheduleItem $item) => $this->formatItem($item));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request);

        $item = ScheduleItem::create([
            ...$validated,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'horarios', 'crear', $item, 'Horario parroquial creado.', [], $item->toArray());

        return response()->json($this->formatItem($item), 201);
    }

    public function update(Request $request, ScheduleItem $schedule): JsonResponse
    {
        $validated = $this->validatePayload($request);

        $oldValues = $schedule->toArray();
        $schedule->update([
            ...$validated,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'horarios', 'editar', $schedule, 'Horario parroquial actualizado.', $oldValues, $schedule->fresh()->toArray());

        return response()->json($this->formatItem($schedule->fresh()));
    }

    public function destroy(Request $request, ScheduleItem $schedule): JsonResponse
    {
        $oldValues = $schedule->toArray();
        $schedule->delete();

        AuditLogger::log($request, 'horarios', 'eliminar', null, 'Horario parroquial eliminado.', $oldValues, []);

        return response()->json([
            'message' => 'Horario eliminado correctamente.',
        ]);
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'tipo' => ['required', Rule::in($this->allowedTypes)],
            'titulo' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'dia_semana' => ['required', 'integer', 'between:0,6'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['nullable', 'date_format:H:i', 'after:hora_inicio'],
            'lugar' => ['nullable', 'string', 'max:255'],
            'responsable' => ['nullable', 'string', 'max:255'],
            'publico' => ['nullable', 'boolean'],
        ]);
    }

    private function formatItem(ScheduleItem $item): array
    {
        return [
            'id' => $item->id,
            'tipo' => $item->tipo,
            'titulo' => $item->titulo,
            'descripcion' => $item->descripcion,
            'dia_semana' => $item->dia_semana,
            'hora_inicio' => substr((string) $item->hora_inicio, 0, 5),
            'hora_fin' => $item->hora_fin ? substr((string) $item->hora_fin, 0, 5) : null,
            'lugar' => $item->lugar,
            'responsable' => $item->responsable,
            'publico' => (bool) $item->publico,
        ];
    }
}
