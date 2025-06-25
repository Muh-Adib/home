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
            $table->string('sender_account_name')->nullable()->after('verification_notes');
            $table->string('sender_account_number')->nullable()->after('sender_account_name');
            $table->string('sender_bank_name')->nullable()->after('sender_account_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['sender_account_name', 'sender_account_number', 'sender_bank_name']);
        });
    }
};
