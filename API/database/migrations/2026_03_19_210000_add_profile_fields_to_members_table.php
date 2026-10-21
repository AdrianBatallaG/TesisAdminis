<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', static function (Blueprint $table): void {
            $table->date('fecha_nacimiento')->nullable()->after('direccion');
            $table->string('estado_civil', 80)->nullable()->after('fecha_nacimiento');
            $table->string('numero_identificacion', 40)->nullable()->after('estado_civil');
            $table->string('foto_perfil')->nullable()->after('numero_identificacion');
        });
    }

    public function down(): void
    {
        Schema::table('members', static function (Blueprint $table): void {
            $table->dropColumn(['fecha_nacimiento', 'estado_civil', 'numero_identificacion', 'foto_perfil']);
        });
    }
};
