<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'tipo',
        'titulo',
        'descripcion',
        'dia_semana',
        'hora_inicio',
        'hora_fin',
        'lugar',
        'responsable',
        'publico',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'dia_semana' => 'integer',
            'publico' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
