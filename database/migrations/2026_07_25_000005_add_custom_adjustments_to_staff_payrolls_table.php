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
        Schema::table('staff_payrolls', function (Blueprint $table) {
            $table->decimal('custom_allowance', 15, 2)->default(0)->after('performance_bonus');
            $table->decimal('custom_deduction', 15, 2)->default(0)->after('late_deduction');
            $table->string('custom_allowance_reason')->nullable()->after('custom_allowance');
            $table->string('custom_deduction_reason')->nullable()->after('custom_deduction');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('staff_payrolls', function (Blueprint $table) {
            $table->dropColumn([
                'custom_allowance',
                'custom_deduction',
                'custom_allowance_reason',
                'custom_deduction_reason',
            ]);
        });
    }
};
