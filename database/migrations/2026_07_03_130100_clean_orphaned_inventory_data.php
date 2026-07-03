<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Delete orphaned out stock movements that point to deleted usages
        DB::table('inventory_stock_movements')
            ->where('type', 'out')
            ->where('reference_type', 'usage')
            ->whereNotNull('reference_id')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('inventory_usages')
                    ->whereColumn('inventory_usages.id', 'inventory_stock_movements.reference_id');
            })
            ->delete();

        // 2. Delete orphaned expenses that point to deleted usages
        DB::table('property_expenses')
            ->where('payment_method', 'inventory_usage')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('inventory_usages')
                    ->whereColumn('inventory_usages.expense_id', 'property_expenses.id');
            })
            ->delete();

        // 3. Delete orphaned expenses that point to deleted purchases
        DB::table('property_expenses')
            ->where('expense_category', 'supplies')
            ->where('description', 'like', 'Pembelian %')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('inventory_stock_movements')
                    ->where('inventory_stock_movements.reference_type', 'expense')
                    ->whereColumn('inventory_stock_movements.reference_id', 'property_expenses.id');
            })
            ->delete();
    }

    public function down(): void
    {
        // No rollback possible/needed for data purging
    }
};
