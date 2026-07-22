<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('properties', 'tiktok_video_url')) {
            Schema::table('properties', function (Blueprint $table) {
                $table->string('tiktok_video_url', 500)->nullable()->after('maps_link');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('properties', 'tiktok_video_url')) {
            Schema::table('properties', function (Blueprint $table) {
                $table->dropColumn('tiktok_video_url');
            });
        }
    }
};
