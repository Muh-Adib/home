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
        Schema::table('booking_workflow', function (Blueprint $table) {
            $table->string('step', 50)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_workflow', function (Blueprint $table) {
            $table->enum('step', ['submitted', 'staff_review', 'approved', 'rejected', 'payment_pending', 'dp_received', 'payment_verified', 'confirmed', 'checked_in', 'checked_out', 'completed'])->change();
        });
    }
};
