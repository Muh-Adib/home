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
        Schema::table('payment_methods', function (Blueprint $table) {

            // Protect: Pastikan kolom belum ada sebelum menambahkan
            if (! Schema::hasColumn('payment_methods', 'fee_percentage')) {
                $table->decimal('fee_percentage', 5, 2)->default(0)->after('sort_order');
            }

            if (! Schema::hasColumn('payment_methods', 'fee_fixed')) {
                $table->decimal('fee_fixed', 12, 2)->default(0)->after('fee_percentage');
            }

            if (! Schema::hasColumn('payment_methods', 'fee_type')) {
                $table->string('fee_type', 20)->default('percentage')->after('fee_fixed');
            }

            if (! Schema::hasColumn('payment_methods', 'ipaymu_settings')) {
                $table->json('ipaymu_settings')->nullable()->after('fee_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            // Drop only if the column exists
            if (Schema::hasColumn('payment_methods', 'fee_percentage')) {
                $table->dropColumn('fee_percentage');
            }
            if (Schema::hasColumn('payment_methods', 'fee_fixed')) {
                $table->dropColumn('fee_fixed');
            }
            if (Schema::hasColumn('payment_methods', 'fee_type')) {
                $table->dropColumn('fee_type');
            }
            if (Schema::hasColumn('payment_methods', 'ipaymu_settings')) {
                $table->dropColumn('ipaymu_settings');
            }
        });
    }
};
