<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_items', static function (Blueprint $table): void {
            $table->id();
            $table->string('tipo', 40);
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            $table->unsignedTinyInteger('dia_semana');
            $table->time('hora_inicio');
            $table->time('hora_fin')->nullable();
            $table->string('lugar')->nullable();
            $table->string('responsable')->nullable();
            $table->boolean('publico')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tipo', 'dia_semana']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_items');
    }
};
