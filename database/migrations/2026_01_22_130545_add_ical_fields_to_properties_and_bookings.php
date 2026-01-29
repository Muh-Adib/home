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
            $table->json('ical_import_urls')->nullable()->after('checkin_instructions');
            $table->string('ical_export_token')->nullable()->after('ical_import_urls');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->string('external_id')->nullable()->index()->after('source');
            $table->string('source')->default('direct')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn(['ical_import_urls', 'ical_export_token']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('external_id');
            // Reverting enum change is tricky, usually left as string
        });
    }
};
