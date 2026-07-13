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
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            // Store full endpoint URL
            $table->text('endpoint');
            // SHA-256 hash of the endpoint for unique index (avoids MySQL TEXT index length limits)
            $table->string('endpoint_hash', 64)->nullable();
            $table->string('p256dh_key');
            $table->string('auth_key');
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'endpoint_hash'], 'push_subscriptions_user_endpoint_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
