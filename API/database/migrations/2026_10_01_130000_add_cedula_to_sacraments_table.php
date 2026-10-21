<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sacraments', function (Blueprint $table): void {
            $table->string('cedula', 10)->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('sacraments', function (Blueprint $table): void {
            $table->dropColumn('cedula');
        });
    }
};
