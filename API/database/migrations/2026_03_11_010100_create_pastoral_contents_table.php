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
        Schema::create('pastoral_contents', static function (Blueprint $table): void {
            $table->id();
            $table->string('tipo');
            $table->string('titulo');
            $table->text('contenido')->nullable();
            $table->string('url')->nullable();
            $table->string('imagen_url')->nullable();
            $table->string('autor_nombre')->nullable();
            $table->timestamp('fecha_publicacion')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('tipo');
            $table->index('fecha_publicacion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pastoral_contents');
    }
};

