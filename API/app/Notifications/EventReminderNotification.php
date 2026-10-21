<?php

namespace App\Notifications;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EventReminderNotification extends Notification
{
    use Queueable;

    public function __construct(private Event $event)
    {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $eventDate = optional($this->event->fecha)->format('Y-m-d') ?? 'Fecha por definir';
        $eventTime = $this->event->hora ?: 'Hora por definir';

        return (new MailMessage)
            ->subject('Recordatorio de evento pastoral')
            ->greeting('Paz y bien, '.$notifiable->name.'.')
            ->line('Te recordamos un evento próximo de la parroquia.')
            ->line('Evento: '.$this->event->titulo)
            ->line('Fecha: '.$eventDate)
            ->line('Hora: '.$eventTime)
            ->line('Lugar: '.($this->event->lugar ?: 'Por confirmar'))
            ->line('Descripción: '.($this->event->descripcion ?: 'Sin descripción adicional.'))
            ->line('Te esperamos.');
    }
}
