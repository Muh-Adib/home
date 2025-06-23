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
        Schema::create('cleaning_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('default_assigned_to')->nullable()->constrained('users')->onDelete('set null');
            
            $table->string('name', 255); // e.g., "Weekly Deep Clean - Villa A"
            $table->text('description')->nullable();
            
            // Schedule types
            $table->enum('schedule_type', [
                'recurring', // Regular recurring schedule
                'booking_based', // Based on checkout/checkin events
                'maintenance', // Maintenance-based schedule
                'seasonal' // Seasonal cleaning schedule
            ])->default('recurring');
            
            // Recurrence pattern (for recurring type)
            $table->enum('frequency', [
                'daily', 
                'weekly', 
                'biweekly', 
                'monthly', 
                'quarterly', 
                'yearly',
                'custom'
            ])->nullable();
            
            // Days of week (JSON array) - for weekly/biweekly
            $table->json('days_of_week')->nullable(); // [1,3,5] for Mon, Wed, Fri
            
            // Day of month (for monthly) or dates (for custom)
            $table->integer('day_of_month')->nullable(); // 1-31
            $table->json('custom_dates')->nullable(); // For custom frequency
            
            // Time settings
            $table->time('preferred_time')->default('09:00:00');
            $table->time('estimated_duration')->default('02:00:00');
            
            // Auto-generation settings
            $table->boolean('auto_generate_tasks')->default(true);
            $table->integer('advance_days')->default(7); // Generate tasks X days in advance
            
            // Task template settings
            $table->string('task_title_template', 255)->default('Scheduled Cleaning - {property_name}');
            $table->text('task_description_template')->nullable();
            $table->enum('default_priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            
            // Areas to clean (JSON)
            $table->json('cleaning_areas')->nullable();
            
            // Checklist template (JSON)
            $table->json('checklist_template')->nullable();
            
            // Special instructions template
            $table->text('special_instructions_template')->nullable();
            
            // Cost settings
            $table->decimal('estimated_cost', 10, 2)->default(0);
            
            // Active period
            $table->date('start_date');
            $table->date('end_date')->nullable(); // NULL = no end date
            
            // Status
            $table->boolean('is_active')->default(true);
            
            // Last generation tracking
            $table->datetime('last_generated_at')->nullable();
            $table->date('next_generation_date')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['property_id', 'is_active']);
            $table->index(['schedule_type', 'is_active']);
            $table->index(['frequency', 'is_active']);
            $table->index(['next_generation_date', 'auto_generate_tasks']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cleaning_schedules');
    }
};
