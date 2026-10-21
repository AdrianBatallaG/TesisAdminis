<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class EmailVerificationController extends Controller
{
    public function verify(Request $request, string $id, string $hash): JsonResponse
    {
        if (! URL::hasValidSignature($request)) {
            return response()->json([
                'message' => 'El enlace de verificación no es válido o ha expirado.',
            ], 403);
        }

        $user = User::findOrFail($id);

        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return response()->json([
                'message' => 'El hash de verificación no coincide.',
            ], 403);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return response()->json([
            'message' => 'Correo verificado correctamente. Ya puedes iniciar sesión.',
        ]);
    }

    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            $validated = $request->validate([
                'email' => ['required', 'email', 'exists:users,email'],
            ]);

            $user = User::where('email', $validated['email'])->firstOrFail();
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Tu correo ya está verificado.',
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Enlace de verificación reenviado.',
        ]);
    }
}
