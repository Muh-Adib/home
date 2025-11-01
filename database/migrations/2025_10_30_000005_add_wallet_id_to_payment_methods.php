<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('payment_methods', 'wallet_id')) {
            Schema::table('payment_methods', function (Blueprint $table) {
                $table->foreignId('wallet_id')->nullable()->after('sort_order');
                $table->index('wallet_id');
            });
            // Tambahkan FK jika DB mendukung (SQLite sering bermasalah pada alter add FK)
            try {
                Schema::table('payment_methods', function (Blueprint $table) {
                    $table->foreign('wallet_id')->references('id')->on('wallets')->nullOnDelete();
                });
            } catch (\Throwable $e) {
                // Abaikan untuk SQLite; pada MySQL/Postgres akan sukses
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('payment_methods', 'wallet_id')) {
            try {
                Schema::table('payment_methods', function (Blueprint $table) {
                    $table->dropForeign(['wallet_id']);
                });
            } catch (\Throwable $e) {
                // Ignore if FK not present
            }
            Schema::table('payment_methods', function (Blueprint $table) {
                if (Schema::hasColumn('payment_methods', 'wallet_id')) {
                    $table->dropColumn('wallet_id');
                }
            });
        }
    }
};


