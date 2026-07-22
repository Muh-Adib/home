<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            $table->decimal('target_amount', 18, 2)->nullable()->after('savings_monthly_amount');
            $table->date('target_date')->nullable()->after('target_amount');
            $table->index('target_date');
        });
    }

    public function down(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            $table->dropIndex(['target_date']);
            $table->dropColumn(['target_amount', 'target_date']);
        });
    }
};
