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
            $table->string('payment_status', 50)->change();
            $table->string('payment_type', 50)->change();
            $table->string('payment_method', 50)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->enum('payment_status', ['pending', 'verified', 'failed', 'cancelled'])->default('pending')->change();
            $table->enum('payment_type', ['dp', 'remaining', 'full', 'refund', 'penalty'])->change();
            $table->enum('payment_method', ['cash', 'bank_transfer', 'credit_card', 'e_wallet', 'other'])->change();
        });
    }
};
