<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->string('review_status')->default('aprobado')->index();
        });
        Schema::create('service_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('type')->index();
            $table->string('status')->default('pendiente')->index();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('donation_id')->nullable()->unique()->constrained('donations')->restrictOnDelete();
            $table->foreignId('sacrament_id')->nullable()->constrained('sacraments')->nullOnDelete();
            $table->json('details')->nullable();
            $table->text('response')->nullable();
            $table->unsignedInteger('version')->default(0);
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
        // Public submissions were never reviewed; send existing ones to the inbox too.
        DB::table('donations')->whereNotNull('public_receipt_token')->orderBy('id')->chunkById(100, function ($items) {
            foreach ($items as $item) {
                DB::table('donations')->where('id', $item->id)->update(['review_status' => 'pendiente']);
                DB::table('service_tickets')->insert(['type' => 'donacion', 'status' => 'pendiente', 'donation_id' => $item->id, 'user_id' => $item->created_by, 'details' => json_encode(['nombre' => $item->nombre_donante]), 'created_at' => now(), 'updated_at' => now()]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_tickets');
        Schema::table('donations', fn (Blueprint $table) => $table->dropColumn('review_status'));
    }
};
