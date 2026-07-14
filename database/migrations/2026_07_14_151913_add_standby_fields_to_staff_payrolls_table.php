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
            $table->integer('standby_nights')->default(0)->after('late_days');
            $table->decimal('standby_bonus', 15, 2)->default(0)->after('housekeeping_bonus');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('staff_payrolls', function (Blueprint $table) {
            $table->dropColumn(['standby_nights', 'standby_bonus']);
        });
    }
};
