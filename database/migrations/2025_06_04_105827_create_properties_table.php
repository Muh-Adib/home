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
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->text('address');
            $table->string('maps_link')->nullable();
            $table->decimal('lat', 10, 8)->nullable()->index();
            $table->decimal('lng', 11, 8)->nullable()->index();
            $table->integer('capacity'); // Standard capacity
            $table->integer('capacity_max'); // Maximum with extra beds
            $table->integer('bedroom_count');
            $table->integer('bathroom_count');
            $table->decimal('base_rate', 12, 0);
            $table->integer('weekend_premium_percent')->default(20);
            $table->decimal('cleaning_fee', 10, 0)->default(0);
            $table->decimal('extra_bed_rate', 10, 0)->default(0);
            $table->enum('status', ['active', 'inactive', 'maintenance'])->default('active');
            $table->json('amenities')->nullable(); // Stored as JSON for flexibility
            $table->text('house_rules')->nullable();
            $table->time('check_in_time')->default('14:00:00');
            $table->time('check_out_time')->default('11:00:00');
            $table->integer('min_stay_weekday')->default(1);
            $table->integer('min_stay_weekend')->default(2);
            $table->integer('min_stay_peak')->default(3);
            $table->boolean('is_featured')->default(false);
            $table->integer('sort_order')->default(0);
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->text('seo_keywords')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['owner_id', 'status']);
            $table->index(['lat', 'lng']);
            $table->index(['is_featured', 'status']);
            $table->index('status');
            $table->index('slug');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
