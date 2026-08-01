<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // HK staff zone assignment: 'utara' = North (percentage-based allocation),
            // 'selatan' = South (point-based pool), null defaults to 'selatan'
            $table->enum('hk_location', ['utara', 'selatan'])->nullable()->after('holiday_quota');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('hk_location');
        });
    }
};
