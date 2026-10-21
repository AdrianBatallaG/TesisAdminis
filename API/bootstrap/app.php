<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();

        $middleware->web(prepend: [
            \App\Http\Middleware\AddSecurityHeaders::class,
        ]);
        $middleware->api(prepend: [
            \App\Http\Middleware\AddSecurityHeaders::class,
        ]);

        $middleware->alias([
            'security_headers' => \App\Http\Middleware\AddSecurityHeaders::class,
            'active_api' => \App\Http\Middleware\EnsureActiveUser::class,
            'activity_api' => \App\Http\Middleware\EnsureActivityAllowed::class,
            'token_fresh_api' => \App\Http\Middleware\EnsureTokenIsFresh::class,
            'role_api' => \App\Http\Middleware\EnsureRole::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
