<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sacrament extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'tipo',
        'nombre',
        'apellido',
        'cedula',
        'email',
        'fecha',
        'lugar',
        'numero_certificado',
        'celebrante',
        'padrinos',
        'libro',
        'folio',
        'tomo',
        'pagina',
        'numero_asiento',
        'estado',
        'notas',
        'datos_adicionales',
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
            'padrinos' => 'array',
            'datos_adicionales' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
