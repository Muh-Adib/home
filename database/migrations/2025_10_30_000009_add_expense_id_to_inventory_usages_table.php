<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_usages', function (Blueprint $table) {
            $table->foreignId('expense_id')->nullable()->after('total_cost')->constrained('property_expenses')->nullOnDelete();
            $table->index('expense_id');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_usages', function (Blueprint $table) {
            $table->dropIndex(['expense_id']);
            $table->dropConstrainedForeignId('expense_id');
        });
    }
};

