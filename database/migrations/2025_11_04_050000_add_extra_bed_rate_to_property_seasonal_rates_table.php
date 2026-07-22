<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Menambahkan kolom extra_bed_rate untuk mengatur tarif extra bed pada seasonal rate
     * Jika null, menggunakan extra_bed_rate dari property
     */
    public function up(): void
    {
        Schema::table('property_seasonal_rates', function (Blueprint $table) {
            $table->decimal('extra_bed_rate', 15, 2)->nullable()->after('rate_value')
                ->comment('Extra bed rate untuk periode seasonal rate ini. Jika null, menggunakan extra_bed_rate dari property');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('property_seasonal_rates', function (Blueprint $table) {
            $table->dropColumn('extra_bed_rate');
        });
    }
};
