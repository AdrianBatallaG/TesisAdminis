<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'titulo',
        'descripcion',
        'fecha',
        'hora',
        'lugar',
        'tipo_evento',
        'tipo_evento_otro',
        'encargado',
        'created_by',
        'updated_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fecha' => 'date',
            'hora' => 'string',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(EventAttendance::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(EventReminder::class);
    }
}
