<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('property_expenses', 'expense_type')) {
            Schema::table('property_expenses', function (Blueprint $table) {
                $table->string('expense_type', 30)->nullable()->default('variable')->after('expense_category');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('property_expenses', 'expense_type')) {
            Schema::table('property_expenses', function (Blueprint $table) {
                $table->dropColumn('expense_type');
            });
        }
    }
};
