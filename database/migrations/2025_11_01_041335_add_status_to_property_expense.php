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
        if (! Schema::hasColumn('property_expenses', 'status')) {
            Schema::table('property_expenses', function (Blueprint $table) {
                $table->string('status')->default('pending')->after('approved_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('property_expenses', 'status')) {
            Schema::table('property_expenses', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};
