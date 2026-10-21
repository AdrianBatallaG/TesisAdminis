<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenIsFresh
{
    private const SESSION_ACTIVITY_KEY = 'auth.last_activity';

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $inactivityMinutes = (int) env('SANCTUM_INACTIVITY_TIMEOUT', 1440);

        if ($inactivityMinutes <= 0) {
            return $next($request);
        }

        $token = $user->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            return $this->handlePersonalAccessToken($request, $next, $token, $inactivityMinutes);
        }

        return $this->handleSession($request, $next, $inactivityMinutes);
    }

    /**
     * @param  Closure(Request): (Response)  $next
     */
    private function handlePersonalAccessToken(
        Request $request,
        Closure $next,
        PersonalAccessToken $token,
        int $inactivityMinutes
    ): Response
    {
        $lastUsedAt = $token->last_used_at ?? $token->created_at;

        if ($lastUsedAt && $lastUsedAt->lt(now()->subMinutes($inactivityMinutes))) {
            $token->delete();

            return new JsonResponse([
                'message' => 'Tu sesion expiro por inactividad. Inicia sesion nuevamente.',
                'code' => 'TOKEN_EXPIRED_INACTIVITY',
            ], 401);
        }

        return $next($request);
    }

    /**
     * @param  Closure(Request): (Response)  $next
     */
    private function handleSession(Request $request, Closure $next, int $inactivityMinutes): Response
    {
        $lastActivity = (int) $request->session()->get(self::SESSION_ACTIVITY_KEY, 0);

        if ($lastActivity > 0 && $lastActivity < now()->subMinutes($inactivityMinutes)->timestamp) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return new JsonResponse([
                'message' => 'Tu sesion expiro por inactividad. Inicia sesion nuevamente.',
                'code' => 'SESSION_EXPIRED_INACTIVITY',
            ], 401);
        }

        $request->session()->put(self::SESSION_ACTIVITY_KEY, now()->timestamp);

        return $next($request);
    }
}
