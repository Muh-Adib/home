<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Sync notes for inventory_usages linked to property_expenses with kitchen/laundry scopes
        if (Schema::hasTable('inventory_usages') && Schema::hasTable('property_expenses')) {
            $usages = DB::table('inventory_usages')
                ->join('property_expenses', 'inventory_usages.expense_id', '=', 'property_expenses.id')
                ->select('inventory_usages.id', 'inventory_usages.notes', 'property_expenses.expense_scope')
                ->get();

            foreach ($usages as $u) {
                $scopeLabel = null;
                if ($u->expense_scope === 'kitchen') {
                    $scopeLabel = '[Dapur]';
                } elseif ($u->expense_scope === 'laundry' || $u->expense_scope === 'house') {
                    $scopeLabel = '[Laundry]';
                }

                if ($scopeLabel && ! str_contains($u->notes ?? '', $scopeLabel)) {
                    $newNotes = trim($scopeLabel.' '.($u->notes ?? ''));
                    DB::table('inventory_usages')
                        ->where('id', $u->id)
                        ->update(['notes' => $newNotes]);
                }
            }
        }

        // 2. Sync notes for inventory_stock_movements linked to property_expenses
        if (Schema::hasTable('inventory_stock_movements') && Schema::hasTable('property_expenses')) {
            $movements = DB::table('inventory_stock_movements')
                ->join('property_expenses', 'inventory_stock_movements.reference_id', '=', 'property_expenses.id')
                ->where('inventory_stock_movements.reference_type', '=', 'expense')
                ->select('inventory_stock_movements.id', 'inventory_stock_movements.notes', 'property_expenses.expense_scope')
                ->get();

            foreach ($movements as $m) {
                $scopeLabel = null;
                if ($m->expense_scope === 'kitchen') {
                    $scopeLabel = '[Dapur]';
                } elseif ($m->expense_scope === 'laundry' || $m->expense_scope === 'house') {
                    $scopeLabel = '[Laundry]';
                }

                if ($scopeLabel && ! str_contains($m->notes ?? '', $scopeLabel)) {
                    $newNotes = trim($scopeLabel.' '.($m->notes ?? ''));
                    DB::table('inventory_stock_movements')
                        ->where('id', $m->id)
                        ->update(['notes' => $newNotes]);
                }
            }
        }

        // 3. Clean orphan property_id in inventory_usages
        if (Schema::hasTable('inventory_usages')) {
            $validPropertyIds = DB::table('properties')->pluck('id')->toArray();
            DB::table('inventory_usages')
                ->whereNotNull('property_id')
                ->whereNotIn('property_id', $validPropertyIds)
                ->update(['property_id' => null]);
        }

        // 4. Clean orphan property_id in inventory_stock_movements
        if (Schema::hasTable('inventory_stock_movements')) {
            $validPropertyIds = DB::table('properties')->pluck('id')->toArray();
            DB::table('inventory_stock_movements')
                ->whereNotNull('property_id')
                ->whereNotIn('property_id', $validPropertyIds)
                ->update(['property_id' => null]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reversible action needed for orphan cleanup
    }
};
