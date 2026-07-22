<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Find properties with name containing Dapur, Laundry, or Operasional
        $opsProperties = DB::table('properties')
            ->where(function ($q) {
                $q->where('name', 'LIKE', '%Dapur%')
                    ->orWhere('name', 'LIKE', '%Laundry%')
                    ->orWhere('name', 'LIKE', '%Operasional%')
                    ->orWhere('name', 'LIKE', '%Global%');
            })->get();

        foreach ($opsProperties as $prop) {
            $nameLower = strtolower($prop->name);
            $scope = 'house';
            if (str_contains($nameLower, 'dapur') || str_contains($nameLower, 'kitchen')) {
                $scope = 'kitchen';
            } elseif (str_contains($nameLower, 'laundry')) {
                $scope = 'laundry';
            }

            // Update Property Expenses
            DB::table('property_expenses')
                ->where('property_id', $prop->id)
                ->update([
                    'property_id' => null,
                    'expense_scope' => $scope,
                ]);

            // Update Inventory Usages
            DB::table('inventory_usages')
                ->where('property_id', $prop->id)
                ->update([
                    'property_id' => null,
                ]);

            // Update Inventory Stock Movements
            DB::table('inventory_stock_movements')
                ->where('property_id', $prop->id)
                ->update([
                    'property_id' => null,
                ]);

            // Delete operational property
            DB::table('properties')->where('id', $prop->id)->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse operation needed
    }
};
