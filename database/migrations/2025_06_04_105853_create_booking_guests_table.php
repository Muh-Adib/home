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
        Schema::create('booking_guests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->onDelete('cascade');
            $table->string('guest_name');
            $table->enum('guest_type', ['male', 'female', 'child']);
            $table->integer('guest_age')->nullable();
            $table->string('id_number', 50)->nullable();
            $table->boolean('is_primary')->default(false); // Primary guest flag
            $table->timestamps();

            // Indexes
            $table->index('booking_id');
            $table->index(['booking_id', 'is_primary']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_guests');
    }
};
