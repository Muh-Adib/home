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
        Schema::create('article_property', function (Blueprint $table) {
            $table->id();

            // Relationships
            $table->foreignId('article_id')->constrained('articles')->onDelete('cascade');
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');

            // Context & Display
            $table->text('mention_context')->nullable(); // Where/how property is mentioned
            $table->boolean('display_card')->default(true); // Show property card?
            $table->unsignedInteger('card_position')->default(0); // Position in article (0 = auto)

            // Analytics
            $table->unsignedInteger('click_count')->default(0); // Track clicks from article to property

            $table->timestamps();

            // Indexes
            $table->index('article_id');
            $table->index('property_id');
            $table->unique(['article_id', 'property_id']); // Prevent duplicates
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('article_property');
    }
};
