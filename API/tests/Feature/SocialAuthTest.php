<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_callback_creates_ticket_and_redirects_to_frontend(): void
    {
        Role::query()->create(['name' => 'usuario', 'guard_name' => 'web']);

        config()->set('services.google.client_id', 'google-client-id');
        config()->set('services.google.client_secret', 'google-client-secret');
        config()->set('services.google.redirect', 'http://localhost:8000/auth/google/callback');
        config()->set('app.frontend_url', 'http://localhost:5173');

        $providerUser = new SocialiteUser();
        $providerUser->map([
            'id' => 'google-user-123',
            'name' => 'Maria Google',
            'email' => 'maria.google@example.com',
            'avatar' => 'https://example.com/avatar.jpg',
        ]);

        Socialite::shouldReceive('driver->user')
            ->once()
            ->andReturn($providerUser);

        $response = $this->get('/auth/google/callback');

        $redirectUrl = $response->headers->get('Location');

        $this->assertNotNull($redirectUrl);
        $this->assertStringStartsWith('http://localhost:5173/auth/social/callback?provider=google&ticket=', $redirectUrl);

        parse_str((string) parse_url($redirectUrl, PHP_URL_QUERY), $query);

        $user = User::query()->where('email', 'maria.google@example.com')->first();

        $this->assertNotNull($user);
        $this->assertSame('google', $user->oauth_provider);
        $this->assertSame('google-user-123', $user->oauth_provider_id);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertGuest('web');
        $this->assertSame([
            'user_id' => $user->id,
            'provider' => 'google',
        ], Cache::get('social-login-ticket:'.$query['ticket']));
    }

    public function test_social_ticket_completion_logs_user_in(): void
    {
        Role::query()->create(['name' => 'usuario', 'guard_name' => 'web']);

        $user = User::factory()->create([
            'name' => 'Cuenta Local',
            'email' => 'local@example.com',
            'email_verified_at' => now(),
            'oauth_provider' => 'google',
            'oauth_provider_id' => 'google-user-999',
            'is_active' => true,
            'activity_blocked' => false,
        ]);
        $user->assignRole('usuario');

        $ticket = str_repeat('a', 64);

        Cache::put('social-login-ticket:'.$ticket, [
            'user_id' => $user->id,
            'provider' => 'google',
        ], now()->addMinutes(5));

        $csrfToken = 'test-csrf-token';

        $response = $this->withSession(['_token' => $csrfToken])
            ->withHeader('X-CSRF-TOKEN', $csrfToken)
            ->withHeader('Origin', 'http://localhost:5173')
            ->withHeader('Referer', 'http://localhost:5173/auth/social/callback')
            ->postJson('/api/auth/social/complete', [
                'provider' => 'google',
                'ticket' => $ticket,
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.email', 'local@example.com')
            ->assertJsonMissingPath('token');

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertNull(Cache::get('social-login-ticket:'.$ticket));
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'modulo' => 'autenticacion',
            'accion' => 'login_google',
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }
}
