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
        Schema::table('property_expenses', function (Blueprint $table) {
            $table->string('expense_category', 50)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('property_expenses', function (Blueprint $table) {
            $table->enum('expense_category', ['utilities', 'maintenance', 'supplies', 'marketing', 'insurance', 'tax', 'staff', 'other'])->change();
        });
    }
};
