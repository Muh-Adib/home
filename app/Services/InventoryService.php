<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\InventoryStockMovement;
use App\Models\InventoryUsage;
use App\Models\PropertyExpense;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InventoryService
{
    public function recordPurchase(int $itemId, float $quantity, float $unitCost, $propertyId, string $date, ?int $userId, ?string $notes = null, ?string $vendorName = null): InventoryStockMovement
    {
        return DB::transaction(function () use ($itemId, $quantity, $unitCost, $propertyId, $date, $userId, $notes, $vendorName) {
            $item = InventoryItem::lockForUpdate()->findOrFail($itemId);

            $totalCost = round($quantity * $unitCost, 2);

            // Weighted Average Cost update
            $existingQty = (float) InventoryStockMovement::where('inventory_item_id', $itemId)
                ->whereIn('type', ['purchase', 'in'])
                ->sum('quantity')
                - (float) InventoryStockMovement::where('inventory_item_id', $itemId)->where('type', 'out')->sum('quantity');

            $currentValue = $existingQty * (float) $item->average_unit_cost;
            $newTotalQty = $existingQty + $quantity;
            $newAvg = $newTotalQty > 0 ? ($currentValue + $totalCost) / $newTotalQty : $unitCost;

            $item->update([
                'average_unit_cost' => $newAvg,
                'last_unit_cost' => $unitCost,
            ]);

            $movement = InventoryStockMovement::create([
                'inventory_item_id' => $itemId,
                'property_id' => $propertyId,
                'type' => 'purchase',
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'movement_date' => $date,
                'reference_type' => 'expense',
                'reference_id' => null,
                'notes' => $notes,
                'created_by' => $userId,
            ]);

            // Jika propertyId adalah null, maka tidak di simpan di property expense
            if ($propertyId === null) {
                return $movement;
            }

            // Tentukan wallet untuk pembelian inventaris (default: Kas Kecil / expense_account)
            $walletPurpose = config('finance.inventory_purchase_wallet_purpose', 'expense_account');
            $wallet = Wallet::where('purpose', $walletPurpose)->first();

            // Catat pengeluaran supplies (variable) ke property_id=NULL = pengeluaran global
            $expense = PropertyExpense::create([
                'property_id' => null,
                'expense_category' => 'supplies',
                'expense_type' => 'variable',
                'description' => 'Pembelian '.$item->name.' qty '.$quantity.' '.$item->unit,
                'amount' => $totalCost,
                'expense_date' => $date,
                'vendor_name' => $vendorName,
                'receipt_number' => null,
                'payment_method' => null,
                'wallet_id' => $wallet?->id,
                'notes' => $notes,
                'created_by' => $userId,
                'recorded_by' => $userId,
                'approved_by' => null,
                'approved_at' => null,
                'status' => 'approved',
            ]);

            $movement->update([
                'reference_id' => $expense->id,
            ]);

            // Catat transaksi keluar di wallet
            if ($wallet) {
                WalletTransaction::create([
                    'wallet_id' => $wallet->id,
                    'direction' => 'out',
                    'category' => 'expense',
                    'amount' => $totalCost,
                    'transaction_date' => $date,
                    'reference_type' => 'expense',
                    'reference_id' => $expense->id,
                    'description' => 'Pembelian inventaris: '.$item->name.' ('.$quantity.' '.$item->unit.')',
                    'created_by' => $userId,
                ]);

                // Recalculate wallet balance
                $totalIn = (float) WalletTransaction::where('wallet_id', $wallet->id)
                    ->where('direction', 'in')->sum('amount');
                $totalOut = (float) WalletTransaction::where('wallet_id', $wallet->id)
                    ->where('direction', 'out')->sum('amount');

                $wallet->update(['balance' => $totalIn - $totalOut]);
            }

            return $movement;
        });
    }

    public function recordUsage(int $itemId, int $propertyId, string $date, float $quantity, ?int $userId, ?string $notes = null): InventoryUsage
    {
        return DB::transaction(function () use ($itemId, $propertyId, $date, $quantity, $userId, $notes) {
            $formattedDate = Carbon::parse($date)->toDateString();
            $item = InventoryItem::lockForUpdate()->findOrFail($itemId);
            $unitCost = $item->selling_price > 0 ? (float) $item->selling_price : (float) $item->average_unit_cost;
            $totalCost = round($unitCost * $quantity, 2);

            // Movement OUT
            $movement = InventoryStockMovement::create([
                'inventory_item_id' => $itemId,
                'property_id' => $propertyId,
                'type' => 'out',
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'movement_date' => $formattedDate,
                'reference_type' => 'usage',
                'reference_id' => null,
                'notes' => $notes,
                'created_by' => $userId,
            ]);

            // Cek apakah usage untuk kombinasi ini sudah ada
            $usage = InventoryUsage::where('inventory_item_id', $itemId)
                ->where('property_id', $propertyId)
                ->whereDate('usage_date', $formattedDate)
                ->lockForUpdate()
                ->first();

            $isNewUsage = ! $usage;
            $oldTotalCost = $usage ? (float) $usage->total_cost : 0;

            if ($usage) {
                // Tambah nilai quantity_used dan total_cost secara manual
                $usage->quantity_used = (float) $usage->quantity_used + $quantity;
                $usage->unit_cost_snapshot = $unitCost;
                $usage->total_cost = (float) $usage->total_cost + $totalCost;
                $usage->notes = $notes;
                $usage->created_by = $userId;
                $usage->save();
            } else {
                $usage = InventoryUsage::create([
                    'inventory_item_id' => $itemId,
                    'property_id' => $propertyId,
                    'usage_date' => $formattedDate,
                    'quantity_used' => $quantity,
                    'unit_cost_snapshot' => $unitCost,
                    'total_cost' => $totalCost,
                    'notes' => $notes,
                    'created_by' => $userId,
                ]);
            }

            // Sinkronkan dengan PropertyExpense
            $this->syncExpenseForUsage($usage, $isNewUsage, $oldTotalCost, $item);

            // Update movement reference_id ke usage
            $movement->update(['reference_id' => $usage->id]);

            return $usage->refresh();
        });
    }

    /**
     * Sinkronkan InventoryUsage dengan PropertyExpense
     */
    private function syncExpenseForUsage(InventoryUsage $usage, bool $isNewUsage, float $oldTotalCost, InventoryItem $item): void
    {
        try {
            // Description untuk expense
            $description = "Penggunaan {$item->name} - ".(float) $usage->quantity_used." {$item->unit}";

            if ($isNewUsage || ! $usage->expense_id) {
                // Buat expense baru
                $expense = PropertyExpense::create([
                    'property_id' => $usage->property_id,
                    'expense_category' => 'supplies',
                    'expense_type' => 'variable',
                    'description' => $description,
                    'amount' => $usage->total_cost,
                    'expense_date' => $usage->usage_date->toDateString(),
                    'vendor_name' => null,
                    'receipt_number' => null,
                    'payment_method' => 'inventory_usage',
                    'notes' => $usage->notes ?? "Inventory usage: {$item->name}",
                    'created_by' => $usage->created_by,
                    'recorded_by' => $usage->created_by, // Set recorded_by sama dengan created_by
                    'status' => 'approved', // Auto-approved karena dari inventory usage
                ]);

                // Update usage dengan expense_id
                $usage->update(['expense_id' => $expense->id]);

                Log::info('Expense created for inventory usage', [
                    'usage_id' => $usage->id,
                    'expense_id' => $expense->id,
                    'property_id' => $usage->property_id,
                    'amount' => $usage->total_cost,
                ]);
            } else {
                // Update expense yang sudah ada
                $expense = PropertyExpense::find($usage->expense_id);
                if ($expense) {
                    $expense->update([
                        'amount' => $usage->total_cost,
                        'description' => $description,
                        'notes' => $usage->notes ?? "Inventory usage: {$item->name}",
                    ]);

                    Log::info('Expense updated for inventory usage', [
                        'usage_id' => $usage->id,
                        'expense_id' => $expense->id,
                        'old_amount' => $oldTotalCost,
                        'new_amount' => $usage->total_cost,
                    ]);
                } else {
                    Log::warning('Expense not found for inventory usage', [
                        'usage_id' => $usage->id,
                        'expense_id' => $usage->expense_id,
                    ]);
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to sync expense for inventory usage', [
                'usage_id' => $usage->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
