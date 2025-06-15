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
        Schema::create('property_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->enum('media_type', ['image', 'video', 'virtual_tour']);
            $table->string('file_path', 500);
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('file_name');
            $table->bigInteger('file_size');
            $table->string('mime_type', 100);
            $table->enum('category', [
                'exterior', 
                'living_room', 
                'bedroom', 
                'kitchen', 
                'bathroom', 
                'amenities', 
                'tour'
            ])->default('exterior');
            $table->string('title')->nullable();
            $table->string('alt_text')->nullable();
            $table->text('description')->nullable();
            $table->integer('display_order')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_cover')->default(false);
            $table->string('dimensions', 20)->nullable(); // e.g., "1920x1080"
            $table->timestamps();

            // Indexes for performance
            $table->index(['property_id', 'media_type']);
            $table->index(['property_id', 'is_featured']);
            $table->index(['property_id', 'is_cover']);
            $table->index(['property_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_media');
    }
};
