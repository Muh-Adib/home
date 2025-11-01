<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->foreignId('wallet_id')->nullable()->after('bank_name')->constrained('wallets')->nullOnDelete();
            $table->index('wallet_id');
        });
    }

    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropIndex(['wallet_id']);
            $table->dropConstrainedForeignId('wallet_id');
        });
    }
};


