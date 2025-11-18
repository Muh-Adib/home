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
        Schema::table('payments', function (Blueprint $table) {
            $table->string('ipaymu_session_id', 100)->nullable()->after('gateway_transaction_id');
            $table->text('ipaymu_payment_url')->nullable()->after('ipaymu_session_id');
            $table->datetime('ipaymu_expired_at')->nullable()->after('ipaymu_payment_url');
            
            // Index untuk query performance
            $table->index('ipaymu_session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['ipaymu_session_id']);
            $table->dropColumn(['ipaymu_session_id', 'ipaymu_payment_url', 'ipaymu_expired_at']);
        });
    }
};








