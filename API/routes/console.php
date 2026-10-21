<?php

use App\Models\Event;
use App\Models\EventReminder;
use App\Models\User;
use App\Notifications\EventReminderNotification;
use Carbon\Carbon;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('users:create-admin {email?} {name?} {--password=}', function (): void {
    $email = (string) ($this->argument('email') ?: $this->ask('Correo del administrador'));
    $name = (string) ($this->argument('name') ?: $this->ask('Nombre del administrador'));
    $password = (string) ($this->option('password') ?: $this->secret('Contrasena inicial'));

    if (trim($email) === '' || trim($name) === '' || trim($password) === '') {
        $this->error('Correo, nombre y contrasena son obligatorios.');

        return;
    }

    if (strlen($password) < 8) {
        $this->error('La contrasena debe tener al menos 8 caracteres.');

        return;
    }

    $user = User::query()->firstOrNew([
        'email' => mb_strtolower(trim($email)),
    ]);

    $user->fill([
        'name' => trim($name),
        'password' => $password,
        'is_active' => true,
        'activity_blocked' => false,
    ]);

    if (! $user->exists) {
        $user->email_verified_at = now();
    } elseif (! $user->email_verified_at) {
        $user->email_verified_at = now();
    }

    $user->save();
    $user->syncRoles(['admin']);

    $this->info('Administrador listo: '.$user->email);
})->purpose('Crear o actualizar manualmente un usuario administrador');

Artisan::command('events:send-reminders', function (): void {
    $targetDate = Carbon::now()->addDay()->toDateString();

    $events = Event::query()
        ->whereDate('fecha', $targetDate)
        ->get();

    if ($events->isEmpty()) {
        $this->info('No hay eventos para recordar.');

        return;
    }

    $users = User::query()
        ->whereNotNull('email_verified_at')
        ->where('is_active', true)
        ->get();

    $sentCount = 0;
    $failedCount = 0;

    foreach ($events as $event) {
        foreach ($users as $user) {
            $alreadySent = EventReminder::query()
                ->where('event_id', $event->id)
                ->where('user_id', $user->id)
                ->whereDate('reminder_date', $targetDate)
                ->exists();

            if ($alreadySent) {
                continue;
            }

            try {
                $user->notify(new EventReminderNotification($event));
            } catch (\Throwable $exception) {
                report($exception);
                $failedCount++;
                continue;
            }

            EventReminder::create([
                'event_id' => $event->id,
                'user_id' => $user->id,
                'reminder_date' => $targetDate,
                'sent_at' => now(),
            ]);

            $sentCount++;
        }
    }

    $this->info('Recordatorios enviados: '.$sentCount.' | fallidos: '.$failedCount);
})->purpose('Enviar recordatorios de eventos proximos por correo');

Schedule::command('events:send-reminders')->dailyAt('07:00');
Schedule::command('sanctum:prune-expired --hours=24')->dailyAt('03:15');
