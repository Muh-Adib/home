<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('property_expenses', function (Blueprint $table) {
            $table->foreignId('booking_id')->nullable()->after('property_id')->constrained('bookings')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('property_expenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('booking_id');
        });
    }
};
