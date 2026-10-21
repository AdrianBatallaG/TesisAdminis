<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $this->filtered($request);

        $logs = $query
            ->limit(min($request->integer('limit', 200), 500))
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => AuditLogger::maskEmailValue($log->user->email),
                ] : null,
                'modulo' => $log->modulo,
                'accion' => $log->accion,
                'entidad_tipo' => $log->entidad_tipo,
                'entidad_id' => $log->entidad_id,
                'descripcion' => $log->descripcion,
                'valores_anteriores' => $log->valores_anteriores,
                'valores_nuevos' => $log->valores_nuevos,
                'ip' => $log->ip,
                'created_at' => $log->created_at,
            ]);

        return response()->json([
            'logs' => $logs,
        ]);
    }

    private function filtered(Request $request) {
        $request->validate(['modulo'=>'nullable|string|max:120','accion'=>'nullable|string|max:120']);
        $query = AuditLog::query()
            ->with('user:id,name,email')
            ->latest();

        if ($request->filled('modulo')) {
            $query->where('modulo', $request->string('modulo'));
        }

        if ($request->filled('accion')) {
            $query->where('accion', $request->string('accion'));
        }

        return $query;
    }
    public function export(Request $request) {
        $query = $this->filtered($request);
        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w'); fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Fecha','Usuario','Correo','Módulo','Acción','Descripción','IP','Entidad','ID entidad','Valores anteriores','Valores nuevos'], ';', '"', '');
            foreach ($query->lazy(200) as $log) {
                $row = [$log->created_at->timezone('America/Guayaquil')->format('d/m/Y H:i:s'), $log->user?->name ?? 'Sistema', $log->user ? AuditLogger::maskEmailValue($log->user->email) : '', $log->modulo, $log->accion, $log->descripcion, $log->ip, $log->entidad_tipo, $log->entidad_id, json_encode($log->valores_anteriores, JSON_UNESCAPED_UNICODE), json_encode($log->valores_nuevos, JSON_UNESCAPED_UNICODE)];
                $row = array_map(function ($value) { $value = (string) $value; return preg_match('/^[\s]*[=+@-]/u', $value) ? "'".$value : $value; }, $row);
                fputcsv($out, $row, ';', '"', '');
            }
            fclose($out);
        }, 'auditoria-'.now()->format('Y-m-d').'.csv', ['Content-Type'=>'text/csv; charset=UTF-8']);
    }
}
