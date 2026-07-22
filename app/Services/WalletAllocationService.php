<?php

namespace App\Services;

use App\Models\Income;
use App\Models\PropertyExpense;
use App\Models\Wallet;
use App\Models\WalletAllocationRule;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

class WalletAllocationService
{
    /**
     * Jalankan alokasi tabungan per property untuk periode (bulan) tertentu berbasis cash income.
     */
    public function runMonthlyAllocation(int $propertyId, string $periodStart, string $periodEnd, ?int $userId = null): void
    {
        DB::transaction(function () use ($propertyId, $periodStart, $periodEnd, $userId) {
            $rules = WalletAllocationRule::where('property_id', $propertyId)
                ->where('active', true)
                ->orderBy('priority')
                ->get();

            if ($rules->isEmpty()) {
                return;
            }

            $totalIncome = (float) Income::where('property_id', $propertyId)
                ->whereBetween('income_date', [$periodStart, $periodEnd])
                ->sum('amount');

            foreach ($rules as $rule) {
                $amount = $rule->mode === 'percentage'
                    ? round($totalIncome * ((float) $rule->value) / 100, 2)
                    : (float) $rule->value;

                if ($amount <= 0) {
                    continue;
                }

                // Catat sebagai pengeluaran kategori savings
                $expense = PropertyExpense::create([
                    'property_id' => $propertyId,
                    'expense_category' => 'savings',
                    'expense_type' => 'fixed',
                    'description' => $rule->name.' periode '.$periodStart.' s.d. '.$periodEnd,
                    'amount' => $amount,
                    'expense_date' => $periodEnd,
                    'vendor_name' => null,
                    'receipt_number' => null,
                    'payment_method' => 'internal_allocation',
                    'notes' => 'Auto allocation',
                    'created_by' => $userId,
                    'recorded_by' => $userId, // Set recorded_by sama dengan created_by
                    'status' => 'approved',
                ]);

                // Jika terhubung wallet, catat transaksi OUT
                if ($rule->wallet_id) {
                    $wallet = Wallet::find($rule->wallet_id);
                    if ($wallet) {
                        WalletTransaction::create([
                            'wallet_id' => $wallet->id,
                            'direction' => 'out',
                            'amount' => $amount,
                            'transaction_date' => $periodEnd,
                            'reference_type' => 'allocation',
                            'reference_id' => $expense->id,
                            'description' => $rule->name.' allocation',
                            'created_by' => $userId,
                        ]);
                        $wallet->decrement('balance', $amount);
                    }
                }
            }
        });
    }
}
