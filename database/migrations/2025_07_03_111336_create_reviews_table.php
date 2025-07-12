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
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->onDelete('cascade');
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('guest_name'); // Store guest name for anonymous reviews
            $table->string('guest_email'); // Store guest email for verification
            $table->integer('rating'); // 1-5 stars
            $table->text('comment')->nullable();
            $table->boolean('is_verified')->default(false); // Admin can verify reviews
            $table->boolean('is_approved')->default(true); // Admin can approve/reject
            $table->text('admin_response')->nullable(); // Admin can respond to reviews
            $table->foreignId('responded_by')->nullable()->constrained('users');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['property_id', 'rating']);
            $table->index(['booking_id']);
            $table->index(['user_id']);
            $table->index(['is_approved', 'is_verified']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
