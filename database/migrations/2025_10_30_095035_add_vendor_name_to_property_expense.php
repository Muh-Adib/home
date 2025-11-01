<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename only if 'vendor' exists and 'vendor_name' does not exist
        if (Schema::hasColumn('property_expenses', 'vendor') && !Schema::hasColumn('property_expenses', 'vendor_name')) {
            Schema::table('property_expenses', function (Blueprint $table) {
                $table->renameColumn('vendor', 'vendor_name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('property_expenses', 'vendor_name') && !Schema::hasColumn('property_expenses', 'vendor')) {
            Schema::table('property_expenses', function (Blueprint $table) {
                $table->renameColumn('vendor_name', 'vendor');
            });
        }
    }
};