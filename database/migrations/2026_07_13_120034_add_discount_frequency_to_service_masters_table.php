<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_masters', function (Blueprint $table) {
            $table->string('discount_frequency', 20)->default('all')->after('discount_limit'); // all, first_night
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_masters', function (Blueprint $table) {
            $table->dropColumn('discount_frequency');
        });
    }
};
