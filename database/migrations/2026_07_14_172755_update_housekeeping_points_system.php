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
        // 1. Update Properties Table
        Schema::table('properties', function (Blueprint $table) {
            $table->integer('cleaning_points')->default(0)->after('cleaning_fee');
        });

        // 2. Update Unit Damages Table
        Schema::table('unit_damages', function (Blueprint $table) {
            $table->string('difficulty')->nullable()->after('status'); // easy, medium, hard
            $table->string('resolved_photo_path')->nullable()->after('photo_path');
            $table->text('completion_notes')->nullable()->after('resolved_notes');
        });

        // 3. Update Unit Damage Actions Table points column
        Schema::table('unit_damage_actions', function (Blueprint $table) {
            $table->decimal('points', 8, 2)->default(0.00)->change();
        });

        // 4. Create Housekeeping Schedules Table (Routine Schedules)
        Schema::create('housekeeping_schedules', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('task_name')->default('laundry');
            $table->decimal('points', 8, 2)->default(1.00);
            $table->boolean('is_completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 5. Create Booking Cleaners Table (Pivot for multiple cleaners)
        Schema::create('booking_cleaners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('points', 8, 2)->default(0.00);
            $table->timestamps();

            $table->unique(['booking_id', 'user_id']);
        });

        // 6. Create Custom Tasks Table
        Schema::create('custom_tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('tier'); // sss, ss, s, a, b, c, d, e
            $table->decimal('points', 8, 2)->default(0.00);
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        // 7. Create Custom Task Members Table (Pivot for custom tasks)
        Schema::create('custom_task_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('custom_task_id')->constrained('custom_tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('points', 8, 2)->default(0.00);
            $table->timestamps();

            $table->unique(['custom_task_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_task_members');
        Schema::dropIfExists('custom_tasks');
        Schema::dropIfExists('booking_cleaners');
        Schema::dropIfExists('housekeeping_schedules');

        Schema::table('unit_damage_actions', function (Blueprint $table) {
            $table->integer('points')->default(0)->change();
        });

        Schema::table('unit_damages', function (Blueprint $table) {
            $table->dropColumn(['difficulty', 'resolved_photo_path', 'completion_notes']);
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn('cleaning_points');
        });
    }
};
