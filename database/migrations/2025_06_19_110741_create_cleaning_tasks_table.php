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
        Schema::create('cleaning_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->onDelete('set null');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null'); // Housekeeping staff
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade'); // Admin who created
            $table->foreignId('completed_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->string('task_number', 50)->unique(); // Generated task number CT-YYYY-MMDD-001
            $table->string('title', 255);
            $table->text('description')->nullable();
            
            // Task types
            $table->enum('task_type', [
                'checkout_cleaning', // After guest checkout
                'preparation_cleaning', // Before guest checkin
                'maintenance_cleaning', // Deep cleaning/maintenance
                'scheduled_cleaning', // Regular scheduled cleaning
                'inspection_cleaning', // Property inspection cleaning
                'emergency_cleaning' // Emergency cleaning
            ])->default('scheduled_cleaning');
            
            // Priority levels
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            
            // Status tracking
            $table->enum('status', [
                'pending', 
                'assigned', 
                'in_progress', 
                'review_required', 
                'completed', 
                'cancelled'
            ])->default('pending');
            
            // Timing
            $table->datetime('scheduled_date');
            $table->time('estimated_duration')->default('02:00:00'); // 2 hours default
            $table->datetime('started_at')->nullable();
            $table->datetime('completed_at')->nullable();
            $table->datetime('deadline')->nullable();
            
            // Areas to clean (JSON)
            $table->json('cleaning_areas')->nullable(); // bedroom, bathroom, kitchen, living_room, outdoor
            
            // Checklist items (JSON)
            $table->json('checklist')->nullable();
            
            // Special instructions
            $table->text('special_instructions')->nullable();
            $table->text('completion_notes')->nullable();
            
            // Quality control
            $table->enum('quality_rating', ['poor', 'fair', 'good', 'excellent'])->nullable();
            $table->text('quality_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->datetime('reviewed_at')->nullable();
            
            // Cost tracking
            $table->decimal('estimated_cost', 10, 2)->default(0);
            $table->decimal('actual_cost', 10, 2)->default(0);
            
            // Photos and documentation
            $table->json('before_photos')->nullable();
            $table->json('after_photos')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['property_id', 'scheduled_date']);
            $table->index(['assigned_to', 'status']);
            $table->index(['task_type', 'status']);
            $table->index(['status', 'priority']);
            $table->index(['scheduled_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cleaning_tasks');
    }
};
