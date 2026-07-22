<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_usages', function (Blueprint $table) {
            if (! Schema::hasColumn('inventory_usages', 'expense_id')) {
                $table->foreignId('expense_id')->nullable()->after('total_cost')->constrained('property_expenses')->nullOnDelete();
                $table->index('expense_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inventory_usages', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_usages', 'expense_id')) {
                try {
                    // Try to drop index if exists
                    $table->dropIndex(['expense_id']);
                } catch (Exception $e) {
                    // Index might not exist, continue
                }
                try {
                    $table->dropConstrainedForeignId('expense_id');
                } catch (Exception $e) {
                    // Foreign key might not exist, continue
                }
            }
        });
    }
};
