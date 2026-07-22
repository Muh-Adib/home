<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('inventory_items', 'min_stock')) {
            Schema::table('inventory_items', function (Blueprint $table) {
                $table->decimal('min_stock', 15, 4)->default(0)->after('unit');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('inventory_items', 'min_stock')) {
            Schema::table('inventory_items', function (Blueprint $table) {
                $table->dropColumn('min_stock');
            });
        }
    }
};
