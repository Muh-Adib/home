<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incomes', function (Blueprint $table) {
            $table->foreignId('payment_id')->nullable()->after('booking_id')->constrained('payments')->nullOnDelete();
            $table->unique('payment_id');
            $table->index(['payment_id', 'income_date']);
        });
    }

    public function down(): void
    {
        Schema::table('incomes', function (Blueprint $table) {
            $table->dropUnique(['payment_id']);
            $table->dropIndex(['payment_id', 'income_date']);
            $table->dropConstrainedForeignId('payment_id');
        });
    }
};
