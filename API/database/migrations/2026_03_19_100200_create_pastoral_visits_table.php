<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pastoral_visits', static function (Blueprint $table): void {
            $table->id();
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            $table->date('fecha');
            $table->time('hora')->nullable();
            $table->string('lugar');
            $table->string('responsable');
            $table->string('contacto')->nullable();
            $table->string('estado', 40)->default('programada');
            $table->boolean('publico')->default(true);
            $table->text('notas')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fecha', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pastoral_visits');
    }
};
