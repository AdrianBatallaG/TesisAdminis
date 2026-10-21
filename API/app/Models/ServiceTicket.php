<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceTicket extends Model
{
    protected $guarded = ['id'];

    protected static function booted(): void
    {
        static::created(function (self $ticket) {
            User::where('is_active', true)->where('activity_blocked', false)->whereNotNull('email_verified_at')
                ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'editor']))
                ->select('users.id')->chunkById(100, function ($users) use ($ticket) {
                    foreach ($users as $user) TicketNotification::create([
                        'user_id'=>$user->id, 'service_ticket_id'=>$ticket->id, 'audience'=>'staff',
                        'message'=>"Nuevo ticket #{$ticket->id}: ".($ticket->type === 'documento' ? 'solicitud de documento.' : 'comprobante de donación por revisar.'),
                    ]);
                });
        });
        static::updated(function (self $ticket) {
            if ($ticket->user_id && ($ticket->wasChanged('response') || ($ticket->wasChanged('status') && in_array($ticket->status, ['aprobado', 'rechazado', 'resuelto'])))) {
                TicketNotification::create(['user_id'=>$ticket->user_id, 'service_ticket_id'=>$ticket->id, 'audience'=>'requester',
                    'message'=>"Tu ticket #{$ticket->id} recibió una respuesta. Estado: {$ticket->status}."]);
            }
        });
    }


    protected function casts(): array
    {
        return ['details' => 'array', 'resolved_at' => 'datetime'];
    }

    public function donation()
    {
        return $this->belongsTo(Donation::class)->withTrashed();
    }

    public function sacrament()
    {
        return $this->belongsTo(Sacrament::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
