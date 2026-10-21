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
        Schema::create('sacraments', static function (Blueprint $table): void {
            $table->id();
            $table->string('tipo');
            $table->string('nombre');
            $table->string('email')->nullable();
            $table->date('fecha');
            $table->string('numero_certificado')->unique();
            $table->string('celebrante')->nullable();
            $table->json('padrinos')->nullable();
            $table->string('libro')->nullable();
            $table->string('folio')->nullable();
            $table->string('estado')->default('registrado');
            $table->text('notas')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('tipo');
            $table->index('fecha');
            $table->index('nombre');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sacraments');
    }
};

