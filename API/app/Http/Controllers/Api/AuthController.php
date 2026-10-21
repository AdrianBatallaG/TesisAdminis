<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const SESSION_ACTIVITY_KEY = 'auth.last_activity';

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc,dns', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        $user->assignRole('usuario');

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Registro exitoso, pero no se pudo enviar el correo de verificacion. Revisa la configuracion de correo SMTP en .env.',
                'requires_verification' => true,
                'user' => $this->formatUser($user),
            ], 201);
        }

        return response()->json([
            'message' => 'Registro exitoso. Revisa tu correo para verificar la cuenta.',
            'requires_verification' => true,
            'user' => $this->formatUser($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $lockKey = $this->loginLockKey($request, $validated['email']);

        if (RateLimiter::tooManyAttempts($lockKey, 5)) {
            $retryAfter = RateLimiter::availableIn($lockKey);

            return response()->json([
                'message' => 'Demasiados intentos fallidos. Intenta nuevamente en unos minutos.',
                'code' => 'LOGIN_TEMPORARILY_LOCKED',
                'retry_after' => $retryAfter,
            ], 429);
        }

        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            RateLimiter::hit($lockKey, 900);

            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas no son validas.'],
            ]);
        }

        RateLimiter::clear($lockKey);

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Tu cuenta esta inactiva. Contacta al administrador.',
                'code' => 'ACCOUNT_INACTIVE',
            ], 403);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Debes verificar tu correo antes de iniciar sesion.',
                'code' => 'EMAIL_NOT_VERIFIED',
            ], 403);
        }

        Auth::guard('web')->login($user);

        if ($request->hasSession()) {
            $request->session()->regenerate();
            $request->session()->put(self::SESSION_ACTIVITY_KEY, now()->timestamp);
        }

        AuditLogger::log(
            $request,
            'autenticacion',
            'login',
            $user,
            'Inicio de sesion exitoso con correo y contrasena.',
            [],
            [
                'email' => $user->email,
                'auth_method' => 'password',
            ]
        );

        return response()->json([
            'message' => 'Sesion iniciada correctamente.',
            'user' => $this->formatUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            AuditLogger::log(
                $request,
                'autenticacion',
                'logout',
                $user,
                'Cierre de sesion.',
                [],
                [
                    'email' => $user->email,
                ]
            );
        }

        $user?->currentAccessToken()?->delete();
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Sesion cerrada correctamente.',
        ]);
    }

    public function completeSocialLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'string', 'in:google'],
            'ticket' => ['required', 'string', 'min:32'],
        ]);

        $payload = Cache::pull('social-login-ticket:'.$validated['ticket']);

        if (! is_array($payload) || ($payload['provider'] ?? null) !== $validated['provider']) {
            return response()->json([
                'message' => 'La confirmacion de acceso social ya no es valida. Intenta nuevamente.',
                'code' => 'SOCIAL_LOGIN_INVALID',
            ], 422);
        }

        /** @var User|null $user */
        $user = User::query()->find($payload['user_id'] ?? null);

        if (! $user) {
            return response()->json([
                'message' => 'No se pudo recuperar la cuenta asociada al acceso social.',
                'code' => 'SOCIAL_LOGIN_USER_NOT_FOUND',
            ], 404);
        }

        if (! $user->is_active || $user->activity_blocked) {
            return response()->json([
                'message' => 'Tu cuenta esta inactiva. Contacta al administrador.',
                'code' => 'ACCOUNT_INACTIVE',
            ], 403);
        }

        Auth::guard('web')->login($user);

        if ($request->hasSession()) {
            $request->session()->regenerate();
            $request->session()->put(self::SESSION_ACTIVITY_KEY, now()->timestamp);
        }

        AuditLogger::log(
            $request,
            'autenticacion',
            'login_'.$validated['provider'],
            $user,
            'Inicio de sesion exitoso con '.ucfirst($validated['provider']).'.',
            [],
            [
                'email' => $user->email,
                'oauth_provider' => $validated['provider'],
            ]
        );

        return response()->json([
            'message' => 'Sesion iniciada correctamente.',
            'user' => $this->formatUser($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUser($request->user()),
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        try {
            $status = Password::sendResetLink([
                'email' => $validated['email'],
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'No se pudo enviar el correo de recuperacion. Revisa la configuracion SMTP en .env.',
            ], 500);
        }

        if ($status === Password::INVALID_USER) {
            return response()->json([
                'message' => 'Si el correo existe en el sistema, se envio un enlace de recuperacion.',
            ]);
        }

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => [trans($status)],
            ]);
        }

        return response()->json([
            'message' => 'Enlace de recuperacion enviado. Revisa tu correo.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $validated,
            static function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [trans($status)],
            ]);
        }

        return response()->json([
            'message' => 'Contrasena actualizada correctamente. Ya puedes iniciar sesion.',
        ]);
    }

    private function loginLockKey(Request $request, string $email): string
    {
        return 'login-lock:'.Str::lower($email).'|'.$request->ip();
    }

    private function formatUser(User $user): array
    {
        $user->loadMissing('roles');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
            'avatar_url' => $user->avatar_url,
            'oauth_provider' => $user->oauth_provider,
            'email_verified_at' => $user->email_verified_at,
            'is_active' => (bool) $user->is_active,
            'activity_blocked' => (bool) $user->activity_blocked,
            'created_at' => $user->created_at,
        ];
    }
}
