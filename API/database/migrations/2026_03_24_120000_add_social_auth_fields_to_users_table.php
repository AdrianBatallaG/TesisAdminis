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
        Schema::table('users', function (Blueprint $table): void {
            $table->string('oauth_provider')->nullable()->after('password');
            $table->string('oauth_provider_id')->nullable()->after('oauth_provider');
            $table->string('avatar_url')->nullable()->after('oauth_provider_id');
            $table->unique(['oauth_provider', 'oauth_provider_id'], 'users_oauth_provider_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique('users_oauth_provider_unique');
            $table->dropColumn(['oauth_provider', 'oauth_provider_id', 'avatar_url']);
        });
    }
};
