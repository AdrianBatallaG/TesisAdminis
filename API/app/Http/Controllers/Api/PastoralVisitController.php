<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PastoralVisit;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PastoralVisitController extends Controller
{
    private array $allowedStatuses = ['programada', 'completada', 'cancelada'];

    public function index(Request $request): JsonResponse
    {
        $query = PastoralVisit::query()->orderBy('fecha')->orderBy('hora');

        if ($request->filled('estado')) {
            $query->where('estado', $request->string('estado'));
        }

        if ($request->filled('from')) {
            $query->whereDate('fecha', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('fecha', '<=', $request->string('to'));
        }

        if (! $request->user()) {
            $query->where('publico', true);
        }

        $items = $query
            ->get()
            ->map(fn (PastoralVisit $visit) => $this->formatVisit($visit));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request);

        $visit = PastoralVisit::create([
            ...$validated,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'visitas_pastorales', 'crear', $visit, 'Visita pastoral creada.', [], $visit->toArray());

        return response()->json($this->formatVisit($visit), 201);
    }

    public function update(Request $request, PastoralVisit $visit): JsonResponse
    {
        $validated = $this->validatePayload($request);

        $oldValues = $visit->toArray();
        $visit->update([
            ...$validated,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'visitas_pastorales', 'editar', $visit, 'Visita pastoral actualizada.', $oldValues, $visit->fresh()->toArray());

        return response()->json($this->formatVisit($visit->fresh()));
    }

    public function destroy(Request $request, PastoralVisit $visit): JsonResponse
    {
        $oldValues = $visit->toArray();
        $visit->delete();

        AuditLogger::log($request, 'visitas_pastorales', 'eliminar', null, 'Visita pastoral eliminada.', $oldValues, []);

        return response()->json([
            'message' => 'Visita pastoral eliminada correctamente.',
        ]);
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'fecha' => ['required', 'date'],
            'hora' => ['nullable', 'date_format:H:i'],
            'lugar' => ['required', 'string', 'max:255'],
            'responsable' => ['required', 'string', 'max:255'],
            'contacto' => ['nullable', 'string', 'max:255'],
            'estado' => ['required', Rule::in($this->allowedStatuses)],
            'publico' => ['nullable', 'boolean'],
            'notas' => ['nullable', 'string'],
        ]);
    }

    private function formatVisit(PastoralVisit $visit): array
    {
        return [
            'id' => $visit->id,
            'titulo' => $visit->titulo,
            'descripcion' => $visit->descripcion,
            'fecha' => optional($visit->fecha)->toDateString(),
            'hora' => $visit->hora ? substr((string) $visit->hora, 0, 5) : null,
            'lugar' => $visit->lugar,
            'responsable' => $visit->responsable,
            'contacto' => $visit->contacto,
            'estado' => $visit->estado,
            'publico' => (bool) $visit->publico,
            'notas' => $visit->notas,
        ];
    }
}
