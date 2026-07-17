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
        // 1. Update users table
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('base_salary', 15, 2)->default(0)->after('status');
            $table->integer('holiday_quota')->default(4)->after('base_salary');
        });

        // 2. Update staff_payrolls table
        Schema::table('staff_payrolls', function (Blueprint $table) {
            $table->integer('sick_days')->default(0)->after('absent_days');
            $table->decimal('sick_deduction', 15, 2)->default(0)->after('sick_days');
            $table->integer('permission_days')->default(0)->after('sick_deduction');
            $table->decimal('permission_deduction', 15, 2)->default(0)->after('permission_days');
            $table->decimal('absent_deduction', 15, 2)->default(0)->after('permission_deduction');
            $table->decimal('late_hours', 8, 2)->default(0)->after('late_days');
            $table->decimal('overtime_hours', 8, 2)->default(0)->after('late_hours');
            $table->decimal('overtime_bonus', 15, 2)->default(0)->after('overtime_hours');
            $table->integer('holiday_days')->default(0)->after('overtime_bonus');
            $table->foreignId('expense_id')->nullable()->after('created_by')->constrained('property_expenses')->nullOnDelete();
        });

        // 3. Create staff_shifts table
        Schema::create('staff_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->string('shift_start_time')->default('08:00');
            $table->string('shift_end_time')->default('16:00');
            $table->boolean('is_off_day')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_shifts');

        Schema::table('staff_payrolls', function (Blueprint $table) {
            $table->dropForeign(['expense_id']);
            $table->dropColumn([
                'sick_days',
                'sick_deduction',
                'permission_days',
                'permission_deduction',
                'absent_deduction',
                'late_hours',
                'overtime_hours',
                'overtime_bonus',
                'holiday_days',
                'expense_id',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['base_salary', 'holiday_quota']);
        });
    }
};
