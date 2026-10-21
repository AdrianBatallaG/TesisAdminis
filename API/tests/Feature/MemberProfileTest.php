<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MemberProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_user_can_get_and_update_own_member_profile_even_if_it_does_not_exist(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'name' => 'Admin Demo',
            'email' => 'admin-demo@example.com',
            'email_verified_at' => now(),
            'is_active' => true,
            'activity_blocked' => false,
        ]);

        Sanctum::actingAs($user);

        $profileResponse = $this->getJson('/api/miembros/me');

        $profileResponse
            ->assertOk()
            ->assertJsonPath('member.user_id', $user->id)
            ->assertJsonPath('member.nombre', 'Admin Demo')
            ->assertJsonPath('member.email', 'admin-demo@example.com');

        $this->assertDatabaseHas('members', [
            'user_id' => $user->id,
            'nombre' => 'Admin Demo',
            'email' => 'admin-demo@example.com',
        ]);

        $updateResponse = $this->post('/api/miembros/me', [
            'telefono' => '0999999999',
            'direccion' => 'Calle Principal',
            'estado_civil' => 'soltero',
            'grupo_pastoral' => 'Jovenes',
            'foto_perfil' => UploadedFile::fake()->image('perfil.jpg'),
        ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('member.user_id', $user->id)
            ->assertJsonPath('member.telefono', '0999999999')
            ->assertJsonPath('member.direccion', 'Calle Principal')
            ->assertJsonPath('member.estado_civil', 'soltero')
            ->assertJsonPath('member.grupo_pastoral', 'Jovenes');

        $member = Member::query()->where('user_id', $user->id)->firstOrFail();

        $this->assertNotNull($member->foto_perfil);
        Storage::disk('public')->assertExists($member->foto_perfil);
    }
}
