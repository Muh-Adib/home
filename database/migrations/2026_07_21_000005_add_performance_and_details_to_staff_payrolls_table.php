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
            $table->decimal('performance_bonus', 15, 2)->default(0)->after('frontdesk_next_nights_bonus_share');
            $table->json('kpi_details')->nullable()->after('notes');
            $table->json('points_details')->nullable()->after('kpi_details');
            $table->json('loans_details')->nullable()->after('points_details');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('staff_payrolls', function (Blueprint $table) {
            $table->dropColumn(['performance_bonus', 'kpi_details', 'points_details', 'loans_details']);
        });
    }
};
