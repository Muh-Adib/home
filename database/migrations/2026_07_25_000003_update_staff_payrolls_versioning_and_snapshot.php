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
            // First add non-unique index for user_id so foreign key requirement is satisfied
            $table->index('user_id', 'staff_payrolls_user_id_fk_index');

            // Drop old unique constraint
            $table->dropUnique('staff_payrolls_user_id_month_year_unique');

            $table->string('batch_id')->nullable()->after('year');
            $table->integer('version')->default(1)->after('batch_id');
            $table->boolean('is_active')->default(true)->after('version');

            $table->timestamp('approved_at')->nullable()->after('status');
            $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();

            $table->json('attendance_summary')->nullable()->after('expense_id');
            $table->json('allowance_details')->nullable()->after('attendance_summary');
            $table->json('deduction_details')->nullable()->after('allowance_details');

            $table->unique(['user_id', 'month', 'year', 'version'], 'staff_payrolls_user_month_year_version_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('staff_payrolls', function (Blueprint $table) {
            $table->dropUnique('staff_payrolls_user_month_year_version_unique');

            $table->unique(['user_id', 'month', 'year'], 'staff_payrolls_user_id_month_year_unique');
            $table->dropIndex('staff_payrolls_user_id_fk_index');

            $table->dropForeign(['approved_by']);
            $table->dropColumn([
                'batch_id',
                'version',
                'is_active',
                'approved_at',
                'approved_by',
                'attendance_summary',
                'allowance_details',
                'deduction_details',
            ]);
        });
    }
};
