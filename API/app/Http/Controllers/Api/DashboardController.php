<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donation;
use App\Models\Event;
use App\Models\EventAttendance;
use App\Models\Sacrament;
use App\Models\ServiceTicket;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function summary(): JsonResponse
    {
        $now = now();

        $totalSacramentos = Sacrament::count();
        $eventosProximos = Event::query()
            ->whereDate('fecha', '>=', $now->toDateString())
            ->orderBy('fecha')
            ->orderBy('hora')
            ->limit(5)
            ->get(['id', 'titulo', 'fecha', 'hora', 'lugar']);

        $donacionesMes = (float) Donation::query()->where('review_status', 'aprobado')
            ->where('tipo_movimiento', 'ingreso')
            ->whereYear('fecha', $now->year)
            ->whereMonth('fecha', $now->month)
            ->sum('monto');

        $participacionMes = EventAttendance::query()
            ->whereYear('registrado_en', $now->year)
            ->whereMonth('registrado_en', $now->month)
            ->count();

        $sacramentosPorTipo = Sacrament::query()
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')
            ->orderBy('tipo')
            ->get()
            ->map(fn ($item) => [
                'tipo' => $item->tipo,
                'total' => (int) $item->total,
            ]);

        $asistenciaTendencia = collect(range(5, 0))
            ->map(function (int $offset) use ($now): array {
                $month = $now->copy()->subMonths($offset);
                $total = EventAttendance::query()
                    ->whereYear('registrado_en', $month->year)
                    ->whereMonth('registrado_en', $month->month)
                    ->count();

                return [
                    'mes' => Carbon::create($month->year, $month->month)->translatedFormat('M Y'),
                    'total' => $total,
                ];
            })
            ->values();

        return response()->json([
            'tickets' => [
                'counts' => ServiceTicket::whereIn('status', ['pendiente', 'en_revision'])->selectRaw('type, COUNT(*) as total')->groupBy('type')->pluck('total', 'type'),
                'recent' => ServiceTicket::whereIn('status', ['pendiente', 'en_revision'])->latest()->limit(8)->get(['id','type','status','created_at']),
            ],
            'metrics' => [
                'total_sacramentos' => $totalSacramentos,
                'eventos_proximos' => $eventosProximos,
                'donaciones_mes' => $donacionesMes,
                'participacion_mes' => $participacionMes,
            ],
            'charts' => [
                'sacramentos_por_tipo' => $sacramentosPorTipo,
                'tendencia_asistencia' => $asistenciaTendencia,
            ],
        ]);
    }
}

