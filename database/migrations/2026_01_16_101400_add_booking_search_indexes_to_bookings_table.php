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
        Schema::table('bookings', function (Blueprint $table) {
            // Index for guest name search (LIKE queries)
            $table->index('guest_name', 'bookings_guest_name_index');
            
            // Index for guest phone search
            $table->index('guest_phone', 'bookings_guest_phone_index');
            
            // Composite index for property + status + date filtering
            // This optimizes common query pattern: WHERE property_id = X AND booking_status = Y AND check_in >= Z
            $table->index(['property_id', 'booking_status', 'check_in'], 'bookings_property_status_checkin_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_guest_name_index');
            $table->dropIndex('bookings_guest_phone_index');
            $table->dropIndex('bookings_property_status_checkin_index');
        });
    }
};
