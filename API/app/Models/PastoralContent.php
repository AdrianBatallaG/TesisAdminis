<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PastoralContent extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'tipo',
        'subtipo',
        'titulo',
        'contenido',
        'url',
        'imagen_url',
        'precio',
        'stock',
        'edad_min',
        'edad_max',
        'duracion_minutos',
        'datos_extra',
        'autor_nombre',
        'fecha_publicacion',
        'created_by',
        'updated_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fecha_publicacion' => 'datetime',
            'precio' => 'decimal:2',
            'stock' => 'integer',
            'edad_min' => 'integer',
            'edad_max' => 'integer',
            'duracion_minutos' => 'integer',
            'datos_extra' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
