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

            if (! Schema::hasColumn('payments', 'ipaymu_session_id')) {
                $table->string('ipaymu_session_id', 100)->nullable()->after('gateway_transaction_id');
                $table->index('ipaymu_session_id');
            }

            if (! Schema::hasColumn('payments', 'ipaymu_payment_url')) {
                $table->text('ipaymu_payment_url')->nullable()->after('ipaymu_session_id');
            }

            if (! Schema::hasColumn('payments', 'ipaymu_expired_at')) {
                $table->datetime('ipaymu_expired_at')->nullable()->after('ipaymu_payment_url');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {

            if (Schema::hasColumn('payments', 'ipaymu_session_id')) {
                $table->dropIndex(['ipaymu_session_id']);
                $table->dropColumn('ipaymu_session_id');
            }

            if (Schema::hasColumn('payments', 'ipaymu_payment_url')) {
                $table->dropColumn('ipaymu_payment_url');
            }

            if (Schema::hasColumn('payments', 'ipaymu_expired_at')) {
                $table->dropColumn('ipaymu_expired_at');
            }
        });
    }
};
