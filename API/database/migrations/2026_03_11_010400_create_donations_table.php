<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('donations', static function (Blueprint $table): void {
            $table->id();
            $table->string('nombre_donante');
            $table->string('email_donante')->nullable();
            $table->string('tipo_movimiento')->default('ingreso');
            $table->string('categoria');
            $table->decimal('monto', 12, 2);
            $table->date('fecha');
            $table->string('numero_comprobante')->nullable()->unique();
            $table->text('descripcion')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('fecha');
            $table->index('categoria');
            $table->index('tipo_movimiento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('donations');
    }
};

