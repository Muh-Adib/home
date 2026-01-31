<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();

            // Basic Information
            $table->string('title');
            $table->string('slug')->unique();
            $table->longText('content')->nullable(); // Markdown content
            $table->text('excerpt')->nullable();

            // SEO Fields
            $table->string('meta_title', 60)->nullable();
            $table->string('meta_description', 160)->nullable();
            $table->json('seo_keywords')->nullable(); // Array of keywords
            $table->json('target_keywords')->nullable(); // Primary keywords for SEO

            // Language & Publishing
            $table->string('language', 5)->default('id'); // 'id', 'en', etc.
            $table->enum('status', ['draft', 'scheduled', 'published', 'archived'])->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('scheduled_at')->nullable();

            // AI Generation Metadata
            $table->string('ai_provider')->nullable(); // 'openrouter', 'gemini'
            $table->string('ai_model')->nullable(); // Model used for generation
            $table->json('generation_metadata')->nullable(); // Prompts, settings, etc.

            // Relationships
            $table->foreignId('author_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('content_plan_id')->nullable()->constrained('content_plans')->onDelete('set null');

            // SEO Analytics
            $table->unsignedBigInteger('view_count')->default(0);
            $table->unsignedInteger('click_count')->default(0); // Clicks to property links
            $table->decimal('avg_time_on_page', 8, 2)->nullable(); // In seconds

            // Featured Image
            $table->string('featured_image')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index('slug');
            $table->index(['status', 'published_at']);
            $table->index(['status', 'scheduled_at']);
            $table->index('author_id');
            $table->index('language');
            $table->index('created_at');

            // Full-text search index (for MySQL)
            $table->fullText(['title', 'content']); // Uncomment for MySQL 5.7+
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
