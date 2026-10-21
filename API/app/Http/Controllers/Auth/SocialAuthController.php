<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Socialite\Contracts\User as SocialUser;
use Laravel\Socialite\Facades\Socialite;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Str;
use Throwable;

class SocialAuthController extends Controller
{
    public function redirectToGoogle(): RedirectResponse
    {
        if (! $this->providerConfigured('google')) {
            return redirect()->away($this->frontendLoginUrl('GOOGLE_NOT_CONFIGURED'));
        }

        return Socialite::driver('google')
            ->scopes(['openid', 'profile', 'email'])
            ->redirect();
    }

    public function handleGoogleCallback(Request $request): RedirectResponse
    {
        if (! $this->providerConfigured('google')) {
            return redirect()->away($this->frontendLoginUrl('GOOGLE_NOT_CONFIGURED'));
        }

        try {
            /** @var SocialUser $googleUser */
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable $exception) {
            report($exception);

            return redirect()->away($this->frontendLoginUrl('GOOGLE_AUTH_FAILED'));
        }

        if (! $googleUser->getEmail()) {
            return redirect()->away($this->frontendLoginUrl('GOOGLE_EMAIL_REQUIRED'));
        }

        $user = $this->resolveGoogleUser($googleUser);

        if (! $user->is_active || $user->activity_blocked) {
            AuditLogger::log(
                $request,
                'autenticacion',
                'login_google_denegado',
                $user,
                'Intento de acceso con Google denegado por estado de la cuenta.',
                [],
                [
                    'email' => $user->email,
                    'oauth_provider' => 'google',
                ]
            );

            return redirect()->away($this->frontendLoginUrl('ACCOUNT_INACTIVE'));
        }

        $ticket = $this->createLoginTicket($user, 'google');

        return redirect()->away($this->frontendSocialCallbackUrl('google', $ticket));
    }

    private function providerConfigured(string $provider): bool
    {
        $service = (array) config('services.'.$provider, []);

        return filled($service['client_id'] ?? null)
            && filled($service['client_secret'] ?? null)
            && filled($service['redirect'] ?? null);
    }

    private function resolveGoogleUser(SocialUser $googleUser): User
    {
        $email = mb_strtolower(trim((string) $googleUser->getEmail()));
        $googleId = (string) $googleUser->getId();

        $user = User::query()
            ->where('oauth_provider', 'google')
            ->where('oauth_provider_id', $googleId)
            ->first();

        if (! $user) {
            $user = User::query()->where('email', $email)->first();
        }

        if (! $user) {
            $user = new User();
            $user->email = $email;
            $user->password = bin2hex(random_bytes(24));
            $user->is_active = true;
            $user->activity_blocked = false;
        }

        $user->fill([
            'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: $email,
            'oauth_provider' => 'google',
            'oauth_provider_id' => $googleId,
            'avatar_url' => $googleUser->getAvatar(),
        ]);

        if (! $user->email_verified_at) {
            $user->email_verified_at = now();
        }

        $user->save();

        if (! $user->roles()->exists()) {
            $defaultRole = Role::query()->firstOrCreate([
                'name' => 'usuario',
                'guard_name' => 'web',
            ]);

            $user->assignRole($defaultRole);
        }

        return $user->fresh();
    }

    private function frontendLoginUrl(string $errorCode): string
    {
        return rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/')
            .'/login?social_error='.$errorCode;
    }

    private function frontendSocialCallbackUrl(string $provider, ?string $ticket): string
    {
        $url = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/')
            .'/auth/social/callback?provider='.$provider;

        if ($ticket) {
            $url .= '&ticket='.$ticket;
        }

        return $url;
    }

    private function createLoginTicket(User $user, string $provider): string
    {
        $ticket = Str::random(64);

        Cache::put(
            'social-login-ticket:'.$ticket,
            [
                'user_id' => $user->id,
                'provider' => $provider,
            ],
            now()->addMinutes(5)
        );

        return $ticket;
    }
}
