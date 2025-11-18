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
            // Fee untuk payment gateway (dalam persen atau fixed amount)
            $table->decimal('fee_percentage', 5, 2)->nullable()->after('sort_order')->default(0);
            $table->decimal('fee_fixed', 12, 2)->nullable()->after('fee_percentage')->default(0);
            $table->string('fee_type', 20)->nullable()->after('fee_fixed')->default('percentage'); // percentage atau fixed
            
            // Settings untuk iPaymu
            $table->json('ipaymu_settings')->nullable()->after('fee_type'); // Store iPaymu specific settings
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn(['fee_percentage', 'fee_fixed', 'fee_type', 'ipaymu_settings']);
        });
    }
};








