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
        // 1. Drop bank_account_id from payment_methods
        if (Schema::hasColumn('payment_methods', 'bank_account_id')) {
            Schema::table('payment_methods', function (Blueprint $table) {
                $table->dropForeign(['bank_account_id']);
                $table->dropColumn('bank_account_id');
            });
        }

        // 2. Add payment_method_id to bank_accounts
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->foreignId('payment_method_id')
                ->nullable()
                ->constrained('payment_methods')
                ->onDelete('set null');
        });

        // 3. Add payment_method_id to properties
        Schema::table('properties', function (Blueprint $table) {
            $table->foreignId('payment_method_id')
                ->nullable()
                ->constrained('payment_methods')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropForeign(['payment_method_id']);
            $table->dropColumn('payment_method_id');
        });

        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->dropForeign(['payment_method_id']);
            $table->dropColumn('payment_method_id');
        });

        Schema::table('payment_methods', function (Blueprint $table) {
            $table->foreignId('bank_account_id')
                ->nullable()
                ->constrained('bank_accounts')
                ->onDelete('set null');
        });
    }
};
