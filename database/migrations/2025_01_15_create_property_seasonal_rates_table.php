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
        Schema::create('property_seasonal_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->string('name'); // e.g., "Christmas Holiday", "New Year Peak", "Eid Season"
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('rate_type', [
                'percentage', // percentage increase from base_rate
                'fixed', // fixed amount per night
                'multiplier' // multiply base_rate by this factor
            ])->default('percentage');
            $table->decimal('rate_value', 8, 2); // percentage (e.g., 50), fixed amount (e.g., 2000000), or multiplier (e.g., 1.5)
            $table->integer('min_stay_nights')->default(1); // minimum nights for this rate
            $table->boolean('applies_to_weekends_only')->default(false); // if true, only applies on weekends
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0); // higher priority rates override lower ones
            $table->text('description')->nullable();
            $table->json('applicable_days')->nullable(); // array of day numbers (0=Sunday, 1=Monday, etc.)
            $table->timestamps();
            
            // Ensure no overlapping dates for same property with same priority
            $table->index(['property_id', 'start_date', 'end_date']);
            $table->index(['property_id', 'is_active', 'priority']);
        });
    }

    /**
     * Run the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_seasonal_rates');
    }
}; 