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
        Schema::table('booking_guests', function (Blueprint $table) {
            // Add new columns for enhanced guest management
            $table->string('full_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->enum('gender', ['male', 'female'])->nullable();
            $table->enum('age_category', ['adult', 'child', 'infant'])->default('adult');
            $table->string('relationship_to_primary')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->text('notes')->nullable();
            
            // Add indexes for performance
            $table->index(['booking_id', 'guest_type']);
            $table->index(['booking_id', 'age_category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_guests', function (Blueprint $table) {
            // Remove added columns
            $table->dropColumn([
                'full_name',
                'phone',
                'email',
                'gender',
                'age_category',
                'relationship_to_primary',
                'emergency_contact_name',
                'emergency_contact_phone',
                'notes'
            ]);
            
            // Drop indexes
            $table->dropIndex(['booking_guests_booking_id_guest_type_index']);
            $table->dropIndex(['booking_guests_booking_id_age_category_index']);
        });
    }
};
