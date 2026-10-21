<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureTokenIsFresh;
use App\Models\Sacrament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\TransientToken;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_is_temporarily_blocked_after_repeated_failed_attempts(): void
    {
        $user = User::factory()->create([
            'email' => 'seguridad@example.com',
            'password' => 'Password123!',
            'email_verified_at' => now(),
            'is_active' => true,
            'activity_blocked' => false,
        ]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'credencial-incorrecta',
            ])->assertStatus(422);
        }

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'credencial-incorrecta',
        ])->assertStatus(429)->assertJsonPath('code', 'LOGIN_TEMPORARILY_LOCKED');
    }

    public function test_login_uses_stateful_session_and_does_not_return_bearer_token(): void
    {
        $user = User::factory()->create([
            'email' => 'stateful@example.com',
            'password' => 'Password123!',
            'email_verified_at' => now(),
            'is_active' => true,
            'activity_blocked' => false,
        ]);

        $csrfToken = 'test-csrf-token';

        $response = $this->withSession(['_token' => $csrfToken])
            ->withHeader('X-CSRF-TOKEN', $csrfToken)
            ->withHeader('Origin', 'http://localhost:5173')
            ->withHeader('Referer', 'http://localhost:5173/login')
            ->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'Password123!',
            ]);

        $response
            ->assertOk()
            ->assertJsonMissingPath('token')
            ->assertJsonPath('user.email', 'stateful@example.com');

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'modulo' => 'autenticacion',
            'accion' => 'login',
        ]);
    }

    public function test_public_certificate_request_does_not_leak_sensitive_record_data(): void
    {
        Sacrament::query()->create([
            'tipo' => 'bautismo',
            'nombre' => 'Ana',
            'apellido' => 'Lopez',
            'email' => 'ana@example.com',
            'fecha' => now()->toDateString(),
            'lugar' => 'Parroquia Central',
            'numero_certificado' => 'CERT-001',
            'cedula' => '0123456789',
            'celebrante' => 'Padre Demo',
            'estado' => 'registrado',
            'notas' => 'Dato sensible',
        ]);

        $response = $this->postJson('/api/sacramentos/solicitar-certificado', [
            'nombres_completos' => 'Ana Lopez',
            'numero_certificado' => 'CERT-001',
            'cedula' => '0123456789',
            'email' => 'ana@example.com',
        ]);

        $response
            ->assertUnauthorized()
            ->assertJsonMissingPath('record')
            ->assertJsonMissingPath('found');
    }

    public function test_public_qr_verification_only_returns_minimal_certificate_data(): void
    {
        $sacrament = Sacrament::query()->create([
            'tipo' => 'bautismo',
            'nombre' => 'Luis',
            'apellido' => 'Perez',
            'email' => 'luis@example.com',
            'fecha' => now()->toDateString(),
            'lugar' => 'Parroquia Central',
            'numero_certificado' => 'CERT-QR-1',
            'celebrante' => 'Padre Demo',
            'estado' => 'registrado',
            'notas' => 'Nota privada',
            'datos_adicionales' => ['padres' => ['padre' => 'Privado']],
        ]);

        $payload = implode('|', [
            $sacrament->id,
            $sacrament->numero_certificado,
            $sacrament->tipo,
            $sacrament->fecha?->format('Y-m-d'),
            $sacrament->updated_at?->timestamp,
        ]);
        $token = hash_hmac('sha256', $payload, (string) config('app.key'));

        $response = $this->getJson('/api/sacramentos/verificar/'.$sacrament->id.'?token='.$token);

        $response
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('record.nombre_completo', 'Luis Perez')
            ->assertJsonMissingPath('record.email')
            ->assertJsonMissingPath('record.notas')
            ->assertJsonMissingPath('record.datos_adicionales');
    }

    public function test_non_admin_user_cannot_access_admin_user_management(): void
    {
        Role::query()->create(['name' => 'editor', 'guard_name' => 'web']);

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'is_active' => true,
            'activity_blocked' => false,
        ]);
        $user->assignRole('editor');

        $token = $user->createToken('editor-token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/users')
            ->assertStatus(403);
    }

    public function test_api_responses_include_security_headers(): void
    {
        $this->getJson('/api/articulos')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }

    public function test_editor_cannot_store_video_with_untrusted_url(): void
    {
        Role::query()->firstOrCreate(['name' => 'editor', 'guard_name' => 'web']);

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'is_active' => true,
            'activity_blocked' => false,
        ]);
        $user->assignRole('editor');

        $token = $user->createToken('editor-token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/medios/videos', [
                'titulo' => 'Video inseguro',
                'descripcion' => 'Intento de prueba',
                'url' => 'http://10.0.0.8/media.mp4',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('url');
    }

    public function test_token_is_revoked_after_inactivity_timeout(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'is_active' => true,
            'activity_blocked' => false,
        ]);

        $plainTextToken = $user->createToken('idle-token')->plainTextToken;
        $tokenId = (int) explode('|', $plainTextToken, 2)[0];

        PersonalAccessToken::query()
            ->whereKey($tokenId)
            ->update(['last_used_at' => now()->subDays(3)]);

        $request = Request::create('/api/me', 'GET');
        $request->headers->set('Authorization', 'Bearer '.$plainTextToken);
        $request->setUserResolver(static function () use ($user, $tokenId) {
            $accessToken = PersonalAccessToken::query()->findOrFail($tokenId);

            return $user->withAccessToken($accessToken);
        });

        $response = app(EnsureTokenIsFresh::class)->handle($request, fn () => response()->json(['ok' => true]));

        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame('TOKEN_EXPIRED_INACTIVITY', $response->getData(true)['code']);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $tokenId,
        ]);
    }

    public function test_stateful_sanctum_session_uses_session_timeout_branch(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'is_active' => true,
            'activity_blocked' => false,
        ]);

        $request = Request::create('/api/me', 'GET');
        $request->setLaravelSession(app('session')->driver());
        $request->session()->put('auth.last_activity', now()->timestamp);
        $request->setUserResolver(static fn () => $user->withAccessToken(new TransientToken()));

        $response = app(EnsureTokenIsFresh::class)->handle($request, fn () => response()->json(['ok' => true]));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['ok' => true], $response->getData(true));
    }
}
