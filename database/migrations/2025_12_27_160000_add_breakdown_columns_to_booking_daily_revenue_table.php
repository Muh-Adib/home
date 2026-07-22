<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add breakdown columns to track revenue sources:
     * - base_amount: Base rate for the day
     * - weekend_premium: Weekend premium applied
     * - seasonal_premium: Seasonal rate premium applied
     * - rate_type: Type of rate applied (base, weekend, seasonal, override)
     * - rate_name: Name of seasonal rate if applicable
     */
    public function up(): void
    {
        Schema::table('booking_daily_revenue', function (Blueprint $table) {
            $table->decimal('base_amount', 15, 2)->default(0)->after('amount');
            $table->decimal('weekend_premium', 15, 2)->default(0)->after('base_amount');
            $table->decimal('seasonal_premium', 15, 2)->default(0)->after('weekend_premium');
            $table->decimal('extra_bed_amount', 15, 2)->default(0)->after('seasonal_premium');
            $table->string('rate_type', 50)->default('base')->after('extra_bed_amount');
            $table->string('rate_name', 255)->nullable()->after('rate_type');
            $table->boolean('is_weekend')->default(false)->after('rate_name');
            $table->index(['property_id', 'tanggal']);
            $table->index(['tanggal']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_daily_revenue', function (Blueprint $table) {
            $table->dropIndex(['property_id', 'tanggal']);
            $table->dropIndex(['tanggal']);
            $table->dropColumn([
                'base_amount',
                'weekend_premium',
                'seasonal_premium',
                'extra_bed_amount',
                'rate_type',
                'rate_name',
                'is_weekend',
            ]);
        });
    }
};
