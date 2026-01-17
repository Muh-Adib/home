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
        Schema::create('seo_landing_pages', function (Blueprint $table) {
            $table->id();
            
            // URL & SEO
            $table->string('slug')->unique();  // villa-jogja, homestay-murah-bantul
            $table->string('title');           // For <title> tag
            $table->string('h1');              // Main heading
            $table->text('meta_description');  // SEO description
            $table->text('content')->nullable(); // SEO-optimized HTML content
            
            // Filter Configuration (JSON)
            $table->json('filters')->nullable(); // {"property_type": "villa", "location": "jogja"}
            
            // SEO Metadata
            $table->string('target_keyword');  // "villa jogja"
            $table->integer('search_volume')->default(0);
            $table->decimal('sitemap_priority', 2, 1)->default(0.7); // 0.0 - 1.0
            $table->string('sitemap_changefreq')->default('weekly'); // always, hourly, daily, weekly, monthly, yearly, never
            
            // Content Sections (for dynamic rendering)
            $table->text('intro_text')->nullable();        // Introduction paragraph
            $table->json('benefits')->nullable();          // List of benefits
            $table->json('faqs')->nullable();              // Custom FAQs for this page
            $table->text('location_description')->nullable(); // Location-specific info
            
            // Status & Analytics
            $table->boolean('is_active')->default(true);
            $table->timestamp('indexed_at')->nullable();   // When Google indexed
            $table->integer('views_count')->default(0);    // Page views
            
            $table->timestamps();
            
            // Indexes
            $table->index('slug');
            $table->index('is_active');
            $table->index(['is_active', 'sitemap_priority']); // For sitemap generation
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seo_landing_pages');
    }
};
