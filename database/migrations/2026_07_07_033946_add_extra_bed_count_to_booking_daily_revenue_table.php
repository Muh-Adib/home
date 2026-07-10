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
        Schema::table('booking_daily_revenue', function (Blueprint $table) {
            $table->integer('extra_bed_count')->default(0)->after('extra_bed_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_daily_revenue', function (Blueprint $table) {
            $table->dropColumn('extra_bed_count');
        });
    }
};
