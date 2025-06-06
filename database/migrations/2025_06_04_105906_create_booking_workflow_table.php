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
        Schema::create('booking_workflow', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->onDelete('cascade');
            $table->enum('step', ['submitted', 'staff_review', 'approved', 'rejected', 'payment_pending', 'dp_received', 'payment_verified', 'confirmed', 'checked_in', 'checked_out', 'completed']);
            $table->enum('status', ['pending', 'in_progress', 'completed', 'skipped', 'failed'])->default('pending');
            $table->foreignId('processed_by')->nullable()->constrained('users');
            $table->timestamp('processed_at')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable(); // Additional step data
            $table->timestamps();

            // Indexes
            $table->index('booking_id');
            $table->index(['booking_id', 'step']);
            $table->index(['booking_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_workflow');
    }
};
