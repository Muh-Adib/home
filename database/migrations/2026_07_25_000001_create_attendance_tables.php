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
        // 1. Raw Attendances Table (Stores raw imported logs from fingerprint device/file)
        Schema::create('raw_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('fingerprint_id')->nullable();
            $table->date('date');
            $table->string('check_in')->nullable();
            $table->string('check_out')->nullable();
            $table->json('raw_payload')->nullable();
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Attendances Table (Final calculated daily attendance per employee)
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->string('shift_start_time')->default('08:00');
            $table->string('shift_end_time')->default('16:00');
            $table->string('check_in')->nullable();
            $table->string('check_out')->nullable();
            $table->decimal('work_hours', 8, 2)->default(0);
            $table->integer('late_minutes')->default(0);
            $table->integer('overtime_minutes')->default(0);
            $table->string('status')->default('present'); // present, absent, sick, permission, off, holiday, standby
            $table->boolean('is_off_day')->default(false);
            $table->boolean('is_corrected')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'date']);
        });

        // 3. Attendance Corrections Table (Audit logs for HR manual edits)
        Schema::create('attendance_corrections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->constrained('attendances')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->string('original_check_in')->nullable();
            $table->string('original_check_out')->nullable();
            $table->string('corrected_check_in')->nullable();
            $table->string('corrected_check_out')->nullable();
            $table->string('reason');
            $table->text('notes')->nullable();
            $table->foreignId('corrected_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_corrections');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('raw_attendances');
    }
};
