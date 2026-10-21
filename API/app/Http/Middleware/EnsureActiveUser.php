<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if (! $user->is_active) {
            $request->user()?->currentAccessToken()?->delete();

            return new JsonResponse([
                'message' => 'Tu cuenta esta inactiva. Contacta al administrador.',
                'code' => 'ACCOUNT_INACTIVE',
            ], 403);
        }

        return $next($request);
    }
}
