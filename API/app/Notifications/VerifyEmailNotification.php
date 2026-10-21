<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends Notification
{
    use Queueable;

    /**
     * @return array<int, string>
     */
    public function via(MustVerifyEmail $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(MustVerifyEmail $notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl($notifiable);
        $frontUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        $query = parse_url($verificationUrl, PHP_URL_QUERY) ?? '';
        parse_str($query, $signedQueryParams);

        $frontendParams = array_filter([
            'id' => (string) $notifiable->getKey(),
            'hash' => sha1($notifiable->getEmailForVerification()),
            'expires' => $signedQueryParams['expires'] ?? null,
            'signature' => $signedQueryParams['signature'] ?? null,
        ], static fn ($value): bool => $value !== null && $value !== '');

        $frontendVerificationUrl = $frontUrl.'/verify-email?'.http_build_query($frontendParams);

        return (new MailMessage)
            ->subject('Verifica tu correo electrónico')
            ->line('Gracias por registrarte. Debes verificar tu correo para iniciar sesión.')
            ->action('Verificar correo', $frontendVerificationUrl)
            ->line('Si no creaste esta cuenta, ignora este mensaje.');
    }

    private function verificationUrl(MustVerifyEmail $notifiable): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes((int) Config::get('auth.verification.expire', 60)),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );
    }
}
