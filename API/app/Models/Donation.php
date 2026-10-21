<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Donation extends Model
{
    use HasFactory, \Illuminate\Database\Eloquent\SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'nombre_donante',
        'email_donante',
        'tipo_movimiento',
        'categoria',
        'monto',
        'fecha',
        'numero_comprobante',
        'public_receipt_token',
        'descripcion',
        'comprobante_path',
        'review_status',
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
            'monto' => 'decimal:2',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}


