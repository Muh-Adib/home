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
        Schema::create('content_plans', function (Blueprint $table) {
            $table->id();

            // Planning Details
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('target_keywords')->nullable(); // Keywords to target
            $table->string('target_audience')->nullable();
            $table->enum('content_type', ['article', 'guide', 'tips', 'comparison', 'news', 'review'])->default('article');

            // Workflow Status
            $table->enum('status', [
                'idea',
                'researching',
                'outlining',
                'writing',
                'reviewing',
                'scheduled',
                'published'
            ])->default('idea');

            // AI Assistance Data
            $table->json('ai_research_data')->nullable(); // Web search results, facts
            $table->json('ai_outline')->nullable(); // Generated outline
            $table->json('ai_suggestions')->nullable(); // AI recommendations

            // Scheduling
            $table->date('planned_publish_date')->nullable();
            $table->date('actual_publish_date')->nullable();

            // Priority & Assignment
            $table->unsignedTinyInteger('priority')->default(3); // 1-5 scale
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('status');
            $table->index('planned_publish_date');
            $table->index('created_by');
            $table->index('assigned_to');
            $table->index('priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_plans');
    }
};
