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
            // Weekend premium type: 'percentage' or 'fixed'
            $table->enum('weekend_premium_type', ['percentage', 'fixed'])
                ->default('percentage')
                ->after('weekend_premium_percent');
            
            // Fixed price for weekend premium (when type is 'fixed')
            $table->decimal('weekend_premium_fixed', 12, 0)
                ->nullable()
                ->default(0)
                ->after('weekend_premium_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn([
                'weekend_premium_type',
                'weekend_premium_fixed'
            ]);
        });
    }
};

