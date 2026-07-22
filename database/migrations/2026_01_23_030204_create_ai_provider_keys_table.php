<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Table untuk management multiple AI provider API keys dengan:
     * - Usage tracking
     * - Auto-rotation berdasarkan usage terendah
     * - Rate limiting per key
     */
    public function up(): void
    {
        Schema::create('ai_provider_keys', function (Blueprint $table) {
            $table->id();

            // Provider & Key Info
            $table->string('name'); // User-friendly name "Production Key 1"
            $table->enum('provider', ['openrouter', 'gemini', 'openai', 'anthropic']); // AI provider
            $table->text('api_key'); // Encrypted API key
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(50); // Priority for key selection (0-100, higher = preferred)

            // Usage Tracking
            $table->unsignedBigInteger('requests_count')->default(0); // Total requests made
            $table->unsignedBigInteger('tokens_used')->default(0); // Total tokens consumed
            $table->decimal('total_cost', 10, 4)->default(0); // Total cost in USD
            $table->timestamp('last_used_at')->nullable(); // Last time this key was used

            // Rate Limiting
            $table->integer('requests_per_minute')->nullable(); // Max requests per minute
            $table->integer('daily_limit')->nullable(); // Max requests per day

            // Auto-rotation
            $table->boolean('auto_rotate')->default(true); // Whether to include in auto-rotation

            // Additional metadata (JSON)
            $table->json('metadata')->nullable(); // For storing provider-specific settings

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['provider', 'is_active']);
            $table->index('priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_provider_keys');
    }
};
