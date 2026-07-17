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
        Schema::table('property_expenses', function (Blueprint $table) {
            $table->foreignId('wallet_id')->nullable()->after('payment_method')
                ->constrained('wallets')->nullOnDelete();
            $table->string('expense_scope')->default('operational')->after('wallet_id');
            $table->string('receipt_image')->nullable()->after('receipt_number');
            $table->decimal('capital_split_investor_pct', 5, 2)->nullable()->after('expense_scope');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('property_expenses', function (Blueprint $table) {
            $table->dropForeign(['wallet_id']);
            $table->dropColumn(['wallet_id', 'expense_scope', 'receipt_image', 'capital_split_investor_pct']);
        });
    }
};
