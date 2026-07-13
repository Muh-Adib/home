<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_masters', function (Blueprint $table) {
            $table->foreignId('property_id')->nullable()->after('id')->constrained('properties')->nullOnDelete();
            $table->boolean('is_default')->default(false)->after('is_active');
            $table->integer('default_quantity')->default(1)->after('is_default');
            $table->string('default_frequency', 20)->default('once')->after('default_quantity'); // once, per_night, first_night, first_two_nights
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_masters', function (Blueprint $table) {
            $table->dropForeign(['property_id']);
            $table->dropColumn(['property_id', 'is_default', 'default_quantity', 'default_frequency']);
        });
    }
};
