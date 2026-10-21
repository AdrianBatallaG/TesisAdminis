<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
    }

    public function boot(): void
    {
        if ($this->app->environment('production')) {
            \Illuminate\Support\Facades\URL::forceRootUrl(config('app.url'));
            if (str_starts_with(config('app.url'), 'https://')) {
                \Illuminate\Support\Facades\URL::forceScheme('https');
            }
        }

        ResetPassword::createUrlUsing(static function (object $user, string $token): string {
            $frontUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
            $query = http_build_query([
                'token' => $token,
                'email' => $user->email,
            ]);

            return $frontUrl.'/reset-password?'.$query;
        });

        RateLimiter::for('login', static function (Request $request): array {
            $email = strtolower((string) $request->input('email', 'anon'));

            return [
                Limit::perMinute(20)->by('login-ip:'.$request->ip()),
                Limit::perMinute(12)->by('login-email:'.$email.'|'.$request->ip()),
            ];
        });

        RateLimiter::for('auth-register', static function (Request $request): array {
            $email = strtolower((string) $request->input('email', 'anon'));

            return [
                Limit::perMinute(10)->by('register-ip:'.$request->ip()),
                Limit::perHour(5)->by('register-email:'.$email),
            ];
        });

        RateLimiter::for('public-donation', static function (Request $request): array {
            $email = strtolower((string) $request->input('email_donante', 'anon'));

            return [
                Limit::perMinute(15)->by('donation-ip:'.$request->ip()),
                Limit::perHour(6)->by('donation-email:'.$email.'|'.$request->ip()),
            ];
        });

        RateLimiter::for('certificate-request', static function (Request $request): array {
            $email = strtolower((string) $request->input('email', 'anon'));
            $certificate = strtolower((string) $request->input('numero_certificado', 'anon'));

            return [
                Limit::perMinute(10)->by('certificate-ip:'.$request->ip()),
                Limit::perHour(6)->by('certificate-lookup:'.$email.'|'.$certificate.'|'.$request->ip()),
            ];
        });
    }
}
