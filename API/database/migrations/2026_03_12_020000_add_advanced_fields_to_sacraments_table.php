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
        Schema::table('sacraments', static function (Blueprint $table): void {
            $table->string('apellido')->nullable()->after('nombre');
            $table->string('lugar')->nullable()->after('fecha');
            $table->string('tomo')->nullable()->after('folio');
            $table->string('pagina')->nullable()->after('tomo');
            $table->string('numero_asiento')->nullable()->after('pagina');
            $table->json('datos_adicionales')->nullable()->after('notas');

            $table->index('apellido');
            $table->index('numero_asiento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sacraments', static function (Blueprint $table): void {
            $table->dropIndex(['apellido']);
            $table->dropIndex(['numero_asiento']);
            $table->dropColumn([
                'apellido',
                'lugar',
                'tomo',
                'pagina',
                'numero_asiento',
                'datos_adicionales',
            ]);
        });
    }
};
