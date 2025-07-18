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
        Schema::table('properties', function (Blueprint $table) {
            // Keybox management
            $table->string('current_keybox_code', 3)->nullable()->after('check_out_time');
            $table->timestamp('keybox_updated_at')->nullable()->after('current_keybox_code');
            $table->unsignedBigInteger('keybox_updated_by')->nullable()->after('keybox_updated_at');
            
            // Check-in instructions as JSON
            $table->json('checkin_instructions')->nullable()->after('keybox_updated_by');
            
            // Foreign key
            $table->foreign('keybox_updated_by')->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropForeign(['keybox_updated_by']);
            $table->dropColumn([
                'current_keybox_code',
                'keybox_updated_at', 
                'keybox_updated_by',
                'checkin_instructions'
            ]);
        });
    }
};
