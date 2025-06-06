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
        Schema::create('booking_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->onDelete('cascade');
            $table->enum('service_type', ['extra_bed', 'breakfast', 'airport_transfer', 'bbq_package', 'private_chef', 'laundry', 'tour_package', 'other']);
            $table->string('service_name');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_price', 10, 2); // Will be calculated in application
            $table->boolean('is_auto_calculated')->default(false); // For auto extra bed calculation
            $table->date('service_date')->nullable(); // When service is provided
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('booking_id');
            $table->index(['booking_id', 'service_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_services');
    }
};
