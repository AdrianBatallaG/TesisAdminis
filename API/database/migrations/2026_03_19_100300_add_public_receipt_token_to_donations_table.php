<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donations', static function (Blueprint $table): void {
            $table->string('public_receipt_token', 80)->nullable()->unique()->after('numero_comprobante');
        });
    }

    public function down(): void
    {
        Schema::table('donations', static function (Blueprint $table): void {
            $table->dropUnique(['public_receipt_token']);
            $table->dropColumn('public_receipt_token');
        });
    }
};
