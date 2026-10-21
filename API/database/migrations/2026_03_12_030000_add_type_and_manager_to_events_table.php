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
        Schema::table('events', static function (Blueprint $table): void {
            $table->string('tipo_evento', 50)->default('actividad_social')->after('lugar');
            $table->string('encargado')->nullable()->after('tipo_evento');

            $table->index('tipo_evento');
            $table->index(['fecha', 'hora']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', static function (Blueprint $table): void {
            $table->dropIndex(['tipo_evento']);
            $table->dropIndex(['fecha', 'hora']);
            $table->dropColumn(['tipo_evento', 'encargado']);
        });
    }
};
