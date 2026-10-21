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
            $table->string('subtipo')->nullable()->after('tipo');
            $table->decimal('precio', 10, 2)->nullable()->after('imagen_url');
            $table->unsignedInteger('stock')->nullable()->after('precio');
            $table->unsignedInteger('edad_min')->nullable()->after('stock');
            $table->unsignedInteger('edad_max')->nullable()->after('edad_min');
            $table->unsignedInteger('duracion_minutos')->nullable()->after('edad_max');

            $table->index('subtipo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pastoral_contents', static function (Blueprint $table): void {
            $table->dropIndex(['subtipo']);
            $table->dropColumn([
                'subtipo',
                'precio',
                'stock',
                'edad_min',
                'edad_max',
                'duracion_minutos',
            ]);
        });
    }
};
