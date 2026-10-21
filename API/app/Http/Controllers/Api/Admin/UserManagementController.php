<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->with('roles')
            ->latest()
            ->get()
            ->map(fn (User $user) => $this->formatUser($user));

        return response()->json([
            'users' => $users,
        ]);
    }

    public function roles(): JsonResponse
    {
        return response()->json([
            'roles' => ['usuario', 'editor', 'admin'],
        ]);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(['usuario', 'editor', 'admin'])],
        ]);

        $oldRole = $user->role;
        $user->syncRoles([$validated['role']]);
        $user->refresh()->load('roles');

        AuditLogger::log(
            $request,
            'usuarios',
            'actualizar_rol',
            $user,
            'Rol de usuario actualizado.',
            ['role' => $oldRole],
            ['role' => $user->role]
        );

        return response()->json([
            'message' => 'Rol actualizado correctamente.',
            'user' => $this->formatUser($user),
        ]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $targetStatus = (bool) $validated['is_active'];

        if ($request->user()?->id === $user->id && ! $targetStatus) {
            return response()->json([
                'message' => 'No puedes desactivar tu propia cuenta.',
            ], 422);
        }

        $oldStatus = (bool) $user->is_active;
        $user->forceFill(['is_active' => $targetStatus])->save();

        if (! $targetStatus) {
            $user->tokens()->delete();
        }

        $user->refresh()->load('roles');

        AuditLogger::log(
            $request,
            'usuarios',
            'actualizar_estado',
            $user,
            'Estado de usuario actualizado.',
            ['is_active' => $oldStatus],
            ['is_active' => (bool) $user->is_active]
        );

        return response()->json([
            'message' => $targetStatus ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.',
            'user' => $this->formatUser($user),
        ]);
    }

    public function updateActivityBlock(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'activity_blocked' => ['required', 'boolean'],
        ]);

        $targetStatus = (bool) $validated['activity_blocked'];

        if ($request->user()?->id === $user->id && $targetStatus) {
            return response()->json([
                'message' => 'No puedes bloquear tus propias actividades.',
            ], 422);
        }

        $oldStatus = (bool) $user->activity_blocked;
        $user->forceFill(['activity_blocked' => $targetStatus])->save();
        $user->refresh()->load('roles');

        AuditLogger::log(
            $request,
            'usuarios',
            'bloquear_actividad',
            $user,
            'Estado de actividad del usuario actualizado.',
            ['activity_blocked' => $oldStatus],
            ['activity_blocked' => (bool) $user->activity_blocked]
        );

        return response()->json([
            'message' => $targetStatus ? 'Actividad del usuario bloqueada correctamente.' : 'Actividad del usuario desbloqueada correctamente.',
            'user' => $this->formatUser($user),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()?->id === $user->id) {
            return response()->json([
                'message' => 'No puedes eliminar tu propia cuenta desde este panel.',
            ], 422);
        }

        $oldValues = $this->formatUser($user);

        DB::transaction(function () use ($user): void {
            $user->tokens()->delete();
            $user->syncRoles([]);
            DB::table(config('permission.table_names.model_has_permissions'))
                ->where('model_type', User::class)
                ->where('model_id', $user->id)
                ->delete();
            DB::table(config('permission.table_names.model_has_roles'))
                ->where('model_type', User::class)
                ->where('model_id', $user->id)
                ->delete();
            $user->delete();
        });

        AuditLogger::log(
            $request,
            'usuarios',
            'eliminar',
            null,
            'Usuario eliminado de la base de datos.',
            $oldValues,
            []
        );

        return response()->json([
            'message' => 'Usuario eliminado correctamente.',
        ]);
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
            'email_verified_at' => $user->email_verified_at,
            'is_active' => (bool) $user->is_active,
            'activity_blocked' => (bool) $user->activity_blocked,
            'created_at' => $user->created_at,
        ];
    }
}
