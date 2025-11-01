<?php

namespace App\Services;

use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WalletService
{
    /**
     * Transfer between wallets
     *
     * @param int $fromWalletId Source wallet ID
     * @param int $toWalletId Destination wallet ID
     * @param float $amount Transfer amount
     * @param string $date Transaction date
     * @param int $userId User performing the transfer
     * @param string|null $description Transfer description
     * @return array Array containing both transaction records
     * @throws \Exception
     */
    public function transfer(
        int $fromWalletId,
        int $toWalletId,
        float $amount,
        string $date,
        int $userId,
        ?string $description = null
    ): array {
        // Validate wallets exist
        $fromWallet = Wallet::findOrFail($fromWalletId);
        $toWallet = Wallet::findOrFail($toWalletId);

        // Validate same wallet transfer
        if ($fromWalletId === $toWalletId) {
            throw new \Exception('Cannot transfer to the same wallet');
        }

        // Validate amount
        if ($amount <= 0) {
            throw new \Exception('Transfer amount must be greater than 0');
        }

        // Validate sufficient balance
        if ($fromWallet->balance < $amount) {
            throw new \Exception(
                'Insufficient balance. Current balance: Rp ' . 
                number_format($fromWallet->balance, 0, ',', '.')
            );
        }

        return DB::transaction(function () use (
            $fromWallet,
            $toWallet,
            $amount,
            $date,
            $userId,
            $description
        ) {
            $desc = $description ?? "Transfer dari {$fromWallet->name} ke {$toWallet->name}";

            // Create OUT transaction for source wallet
            $outTransaction = WalletTransaction::create([
                'wallet_id' => $fromWallet->id,
                'direction' => 'out',
                'category' => 'transfer',
                'amount' => $amount,
                'transaction_date' => $date,
                'reference_type' => 'transfer',
                'reference_id' => $toWallet->id,
                'description' => $desc . " (keluar)",
                'created_by' => $userId,
            ]);

            // Create IN transaction for destination wallet
            $inTransaction = WalletTransaction::create([
                'wallet_id' => $toWallet->id,
                'direction' => 'in',
                'category' => 'transfer',
                'amount' => $amount,
                'transaction_date' => $date,
                'reference_type' => 'transfer',
                'reference_id' => $fromWallet->id,
                'related_transaction_id' => $outTransaction->id,
                'description' => $desc . " (masuk)",
                'created_by' => $userId,
            ]);

            // Link transactions together
            $outTransaction->update([
                'related_transaction_id' => $inTransaction->id,
            ]);

            // Update wallet balances
            $fromWallet->decrement('balance', $amount);
            $toWallet->increment('balance', $amount);

            Log::info('Wallet transfer completed', [
                'from_wallet_id' => $fromWallet->id,
                'to_wallet_id' => $toWallet->id,
                'amount' => $amount,
                'out_transaction_id' => $outTransaction->id,
                'in_transaction_id' => $inTransaction->id,
            ]);

            return [
                'out_transaction' => $outTransaction->fresh(),
                'in_transaction' => $inTransaction->fresh(),
                'from_wallet' => $fromWallet->fresh(),
                'to_wallet' => $toWallet->fresh(),
            ];
        });
    }

    /**
     * Record a wallet transaction with category
     *
     * @param int $walletId Wallet ID
     * @param string $direction in or out
     * @param string $category Transaction category
     * @param float $amount Transaction amount
     * @param string $date Transaction date
     * @param string|null $referenceType Reference type (income, expense, manual)
     * @param int|null $referenceId Reference ID
     * @param string|null $description Transaction description
     * @param int|null $userId User ID
     * @return WalletTransaction
     */
    public function recordTransaction(
        int $walletId,
        string $direction,
        string $category,
        float $amount,
        string $date,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $description = null,
        ?int $userId = null
    ): WalletTransaction {
        $wallet = Wallet::findOrFail($walletId);

        // Validate OUT transaction has sufficient balance
        if ($direction === 'out' && $wallet->balance < $amount) {
            throw new \Exception(
                'Insufficient balance. Current balance: Rp ' . 
                number_format($wallet->balance, 0, ',', '.')
            );
        }

        return DB::transaction(function () use (
            $wallet,
            $direction,
            $category,
            $amount,
            $date,
            $referenceType,
            $referenceId,
            $description,
            $userId
        ) {
            $transaction = WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'direction' => $direction,
                'category' => $category,
                'amount' => $amount,
                'transaction_date' => $date,
                'reference_type' => $referenceType ?? 'manual',
                'reference_id' => $referenceId,
                'description' => $description,
                'created_by' => $userId,
            ]);

            // Update wallet balance
            if ($direction === 'in') {
                $wallet->increment('balance', $amount);
            } else {
                $wallet->decrement('balance', $amount);
            }

            Log::info('Wallet transaction recorded', [
                'wallet_id' => $wallet->id,
                'direction' => $direction,
                'category' => $category,
                'amount' => $amount,
                'transaction_id' => $transaction->id,
            ]);

            return $transaction->fresh();
        });
    }

    /**
     * Get wallet summary
     *
     * @param int $walletId Wallet ID
     * @param string|null $startDate Start date filter
     * @param string|null $endDate End date filter
     * @return array Wallet summary data
     */
    public function getWalletSummary(int $walletId, ?string $startDate = null, ?string $endDate = null): array
    {
        $wallet = Wallet::with(['property', 'creator'])->findOrFail($walletId);

        $query = $wallet->transactions();

        if ($startDate) {
            $query->whereDate('transaction_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('transaction_date', '<=', $endDate);
        }

        $transactions = $query->orderByDesc('transaction_date')->get();

        $totalIn = $transactions->where('direction', 'in')->sum('amount');
        $totalOut = $transactions->where('direction', 'out')->sum('amount');
        $netAmount = $totalIn - $totalOut;

        // Group by category
        $byCategory = $transactions->groupBy('category')->map(function ($group) {
            return [
                'total' => $group->sum('amount'),
                'count' => $group->count(),
            ];
        });

        return [
            'wallet' => $wallet,
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'net_amount' => $netAmount,
            'by_category' => $byCategory,
            'transactions' => $transactions,
        ];
    }
}
