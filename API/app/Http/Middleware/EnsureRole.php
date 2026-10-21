<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $roles = array_values(
            array_filter(
                array_map(
                    static fn (string $value): string => trim($value),
                    $roles
                )
            )
        );
        $hasAllowedRole = false;

        if ($user && ! empty($roles)) {
            foreach ($roles as $allowedRole) {
                if ($user->hasRole($allowedRole)) {
                    $hasAllowedRole = true;
                    break;
                }
            }
        }

        if (! $user || empty($roles) || ! $hasAllowedRole) {
            return new JsonResponse([
                'message' => 'No tienes permisos para acceder a este recurso.',
            ], 403);
        }

        return $next($request);
    }
}
