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
        Schema::table('pastoral_contents', static function (Blueprint $table): void {
            $table->json('datos_extra')->nullable()->after('duracion_minutos');
            $table->index(['tipo', 'subtipo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pastoral_contents', static function (Blueprint $table): void {
            $table->dropIndex(['tipo', 'subtipo']);
            $table->dropColumn('datos_extra');
        });
    }
};
