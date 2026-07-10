<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('followed_up_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->after('followed_up_by')->constrained('users')->nullOnDelete();
            $table->foreignId('checked_in_by')->nullable()->after('closed_by')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['followed_up_by']);
            $table->dropColumn('followed_up_by');

            $table->dropForeign(['closed_by']);
            $table->dropColumn('closed_by');

            $table->dropForeign(['checked_in_by']);
            $table->dropColumn('checked_in_by');
        });
    }
};
