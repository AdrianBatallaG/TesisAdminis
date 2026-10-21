<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\Sacrament;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Member::query()->latest();

        if ($request->filled('q')) {
            $search = $request->string('q');
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('nombre', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('telefono', 'like', '%'.$search.'%')
                    ->orWhere('numero_identificacion', 'like', '%'.$search.'%');
            });
        }

        if ($request->filled('grupo_pastoral')) {
            $query->where('grupo_pastoral', $request->string('grupo_pastoral'));
        }

        $items = $query->get()->map(fn (Member $member) => $this->formatMember($member));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'nombre' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'telefono' => ['nullable', 'string', 'max:60'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'fecha_nacimiento' => ['nullable', 'date'],
            'estado_civil' => ['nullable', 'string', 'max:80'],
            'numero_identificacion' => ['nullable', 'string', 'max:40'],
            'foto_perfil' => ['nullable', 'image', 'max:4096'],
            'grupo_pastoral' => ['nullable', 'string', 'max:255'],
            'historial_participacion' => ['nullable', 'string'],
            'activo' => ['nullable', 'boolean'],
        ]);

        if ($request->hasFile('foto_perfil')) {
            $validated['foto_perfil'] = $request->file('foto_perfil')->store('members/profile-photos', 'public');
        }

        $item = Member::create([
            ...$validated,
            'activo' => $validated['activo'] ?? true,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'miembros', 'crear', $item, 'Miembro/feligres registrado.', [], $item->toArray());

        return response()->json($this->formatMember($item), 201);
    }

    public function update(Request $request, Member $member): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'nombre' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'telefono' => ['nullable', 'string', 'max:60'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'fecha_nacimiento' => ['nullable', 'date'],
            'estado_civil' => ['nullable', 'string', 'max:80'],
            'numero_identificacion' => ['nullable', 'string', 'max:40'],
            'foto_perfil' => ['nullable', 'image', 'max:4096'],
            'grupo_pastoral' => ['nullable', 'string', 'max:255'],
            'historial_participacion' => ['nullable', 'string'],
            'activo' => ['nullable', 'boolean'],
        ]);

        $oldValues = $member->toArray();

        if ($request->hasFile('foto_perfil')) {
            $this->deletePhotoIfNeeded($member->foto_perfil);
            $validated['foto_perfil'] = $request->file('foto_perfil')->store('members/profile-photos', 'public');
        }

        $member->update([
            ...$validated,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log(
            $request,
            'miembros',
            'editar',
            $member,
            'Datos de miembro/feligres actualizados.',
            $oldValues,
            $member->fresh()->toArray()
        );

        return response()->json($this->formatMember($member->fresh()));
    }

    public function destroy(Request $request, Member $member): JsonResponse
    {
        $oldValues = $member->toArray();
        $this->deletePhotoIfNeeded($member->foto_perfil);
        $member->delete();

        AuditLogger::log($request, 'miembros', 'eliminar', null, 'Miembro/feligres eliminado.', $oldValues, []);

        return response()->json([
            'message' => 'Miembro eliminado correctamente.',
        ]);
    }

    public function myProfile(Request $request): JsonResponse
    {
        $member = $this->resolveOwnMember($request);

        return response()->json([
            'member' => $this->formatMember($member),
            'sacramental_status' => $this->sacramentalStatus($member),
        ]);
    }

    public function updateMyProfile(Request $request): JsonResponse
    {
        $member = $this->resolveOwnMember($request);

        $validated = $request->validate([
            'telefono' => ['nullable', 'string', 'max:60'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'fecha_nacimiento' => ['nullable', 'date'],
            'estado_civil' => ['nullable', 'string', 'max:80'],
            'numero_identificacion' => ['nullable', 'string', 'max:40'],
            'foto_perfil' => ['nullable', 'image', 'max:4096'],
            'grupo_pastoral' => ['nullable', 'string', 'max:255'],
        ]);

        $oldValues = $member->toArray();

        if ($request->hasFile('foto_perfil')) {
            $this->deletePhotoIfNeeded($member->foto_perfil);
            $validated['foto_perfil'] = $request->file('foto_perfil')->store('members/profile-photos', 'public');
        }

        $member->update([
            ...$validated,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log(
            $request,
            'miembros',
            'actualizar_perfil_propio',
            $member,
            'Perfil propio actualizado.',
            $oldValues,
            $member->fresh()->toArray()
        );

        return response()->json([
            'message' => 'Perfil actualizado correctamente.',
            'member' => $this->formatMember($member->fresh()),
            'sacramental_status' => $this->sacramentalStatus($member->fresh()),
        ]);
    }

    private function resolveOwnMember(Request $request): Member
    {
        $user = $request->user();

        $member = Member::query()
            ->where('user_id', $user->id)
            ->first();

        if ($member) {
            return $member;
        }

        $memberQuery = Member::query()->whereNull('user_id');

        if ($user->email) {
            $memberQuery->where('email', $user->email);
        } else {
            $memberQuery->whereRaw('1 = 0');
        }

        $member = $memberQuery->first();

        if ($member) {
            $member->update([
                'user_id' => $user->id,
                'nombre' => $member->nombre ?: $user->name,
                'email' => $member->email ?: $user->email,
                'updated_by' => $user->id,
            ]);

            return $member->fresh();
        }

        return Member::create([
            'user_id' => $user->id,
            'nombre' => $user->name,
            'email' => $user->email,
            'activo' => true,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);
    }

    private function sacramentalStatus(Member $member): array
    {
        $records = Sacrament::query()
            ->where(function ($query) use ($member): void {
                if ($member->email) {
                    $query->where('email', $member->email);
                }

                $query->orWhere(function ($nested) use ($member): void {
                    $nameParts = preg_split('/\s+/', trim((string) $member->nombre)) ?: [];
                    $firstName = $nameParts[0] ?? null;
                    $lastName = count($nameParts) > 1 ? end($nameParts) : null;

                    if ($firstName) {
                        $nested->where('nombre', 'like', '%'.$firstName.'%');
                    }

                    if ($lastName) {
                        $nested->where('apellido', 'like', '%'.$lastName.'%');
                    }
                });
            })
            ->orderByDesc('fecha')
            ->get()
            ->groupBy('tipo');

        $types = ['bautismo', 'confirmacion', 'matrimonio'];

        return collect($types)->mapWithKeys(function (string $type) use ($records): array {
            $record = $records->get($type)?->first();

            return [
                $type => [
                    'completed' => (bool) $record,
                    'fecha' => $record?->fecha?->toDateString(),
                    'parroquia' => $record?->lugar,
                ],
            ];
        })->all();
    }

    private function formatMember(Member $member): array
    {
        return [
            'id' => $member->id,
            'user_id' => $member->user_id,
            'nombre' => $member->nombre,
            'email' => $member->email,
            'telefono' => $member->telefono,
            'direccion' => $member->direccion,
            'fecha_nacimiento' => $member->fecha_nacimiento?->toDateString(),
            'estado_civil' => $member->estado_civil,
            'numero_identificacion' => $member->numero_identificacion,
            'foto_perfil' => $member->foto_perfil,
            'foto_perfil_url' => $member->foto_perfil ? Storage::disk('public')->url($member->foto_perfil) : null,
            'grupo_pastoral' => $member->grupo_pastoral,
            'historial_participacion' => $member->historial_participacion,
            'activo' => $member->activo,
            'created_at' => $member->created_at,
            'updated_at' => $member->updated_at,
        ];
    }

    private function deletePhotoIfNeeded(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
