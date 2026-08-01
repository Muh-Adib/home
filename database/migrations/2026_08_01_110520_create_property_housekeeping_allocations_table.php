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
        Schema::create('property_housekeeping_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('percentage', 5, 2)->default(0.00)->comment('Allocation percentage 0-100%');
            $table->timestamps();

            $table->unique(['property_id', 'user_id'], 'prop_hk_alloc_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_housekeeping_allocations');
    }
};
