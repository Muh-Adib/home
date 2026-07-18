<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\Income;
use App\Models\Payment;
use App\Models\PropertyExpense;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WalletService
{
    /**
     * Transfer between wallets
     *
     * @param  int  $fromWalletId  Source wallet ID
     * @param  int  $toWalletId  Destination wallet ID
     * @param  float  $amount  Transfer amount
     * @param  string  $date  Transaction date
     * @param  int  $userId  User performing the transfer
     * @param  string|null  $description  Transfer description
     * @return array Array containing both transaction records
     *
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
                'Insufficient balance. Current balance: Rp '.
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
                'description' => $desc.' (keluar)',
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
                'description' => $desc.' (masuk)',
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
     * @param  int  $walletId  Wallet ID
     * @param  string  $direction  in or out
     * @param  string  $category  Transaction category
     * @param  float  $amount  Transaction amount
     * @param  string  $date  Transaction date
     * @param  string|null  $referenceType  Reference type (income, expense, manual)
     * @param  int|null  $referenceId  Reference ID
     * @param  string|null  $description  Transaction description
     * @param  int|null  $userId  User ID
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
     * @param  int  $walletId  Wallet ID
     * @param  string|null  $startDate  Start date filter
     * @param  string|null  $endDate  End date filter
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

    /**
     * Synchronize and recalculate all wallet transactions and balances.
     */
    public function syncAll(): void
    {
        DB::transaction(function () {
            // 1. Sync verified payments
            $payments = Payment::where('payment_status', 'verified')
                ->with(['booking.property.bankAccount', 'paymentMethod'])
                ->get();

            foreach ($payments as $payment) {
                $walletId = null;

                // 1a. Dari bank account milik properti booking
                if ($payment->booking && $payment->booking->property) {
                    $bankAccount = $payment->booking->property->bankAccount;
                    if ($bankAccount && $bankAccount->wallet_id) {
                        $walletId = $bankAccount->wallet_id;
                    }
                }

                // 1b. Fallback ke payment method
                if (! $walletId && $payment->paymentMethod && $payment->paymentMethod->wallet_id) {
                    $walletId = $payment->paymentMethod->wallet_id;
                }

                if (! $walletId) {
                    // Jika tidak ada wallet, pastikan tidak ada WalletTransaction dari payment ini
                    WalletTransaction::where('reference_type', 'payment')
                        ->where('reference_id', $payment->id)
                        ->delete();

                    continue;
                }

                // Sync Income records
                Income::where('payment_id', $payment->id)
                    ->update(['wallet_id' => $walletId]);

                // Sync WalletTransaction (in)
                $existing = WalletTransaction::where('wallet_id', $walletId)
                    ->where('reference_type', 'payment')
                    ->where('reference_id', $payment->id)
                    ->first();

                if (! $existing) {
                    WalletTransaction::create([
                        'wallet_id' => $walletId,
                        'direction' => 'in',
                        'category' => 'booking',
                        'amount' => $payment->amount,
                        'transaction_date' => $payment->payment_date?->toDateString() ?? now()->toDateString(),
                        'reference_type' => 'payment',
                        'reference_id' => $payment->id,
                        'description' => 'Payment verified: '.$payment->payment_number,
                        'created_by' => $payment->verified_by ?? $payment->processed_by ?? null,
                    ]);
                } else {
                    $existing->update([
                        'amount' => $payment->amount,
                        'transaction_date' => $payment->payment_date?->toDateString() ?? now()->toDateString(),
                    ]);
                }

                // Remove duplicate transactions for this payment in other wallets
                WalletTransaction::where('reference_type', 'payment')
                    ->where('reference_id', $payment->id)
                    ->where('wallet_id', '!=', $walletId)
                    ->delete();
            }

            // 2. Sync unverified/refunded/failed/cancelled payments
            $unverifiedPayments = Payment::whereIn('payment_status', ['refunded', 'failed', 'cancelled'])
                ->with(['booking.property.bankAccount', 'paymentMethod'])
                ->get();

            foreach ($unverifiedPayments as $payment) {
                $walletId = null;

                // 2a. Dari bank account milik properti booking
                if ($payment->booking && $payment->booking->property) {
                    $bankAccount = $payment->booking->property->bankAccount;
                    if ($bankAccount && $bankAccount->wallet_id) {
                        $walletId = $bankAccount->wallet_id;
                    }
                }

                // 2b. Fallback ke payment method
                if (! $walletId && $payment->paymentMethod && $payment->paymentMethod->wallet_id) {
                    $walletId = $payment->paymentMethod->wallet_id;
                }

                if (! $walletId) {
                    // Delete any transactions
                    WalletTransaction::where('reference_type', 'payment')
                        ->where('reference_id', $payment->id)
                        ->delete();

                    continue;
                }

                // Sync Income records
                Income::where('payment_id', $payment->id)
                    ->update(['wallet_id' => $walletId]);

                if ($payment->payment_status === 'refunded') {
                    $existing = WalletTransaction::where('wallet_id', $walletId)
                        ->where('reference_type', 'payment')
                        ->where('reference_id', $payment->id)
                        ->where('direction', 'out')
                        ->first();

                    if (! $existing) {
                        WalletTransaction::create([
                            'wallet_id' => $walletId,
                            'direction' => 'out',
                            'category' => 'booking',
                            'amount' => $payment->amount,
                            'transaction_date' => now()->toDateString(),
                            'reference_type' => 'payment',
                            'reference_id' => $payment->id,
                            'description' => 'Payment refunded: '.$payment->payment_number,
                            'created_by' => $payment->processed_by ?? null,
                        ]);
                    }
                } else {
                    // Delete for failed/cancelled
                    WalletTransaction::where('reference_type', 'payment')
                        ->where('reference_id', $payment->id)
                        ->delete();
                }
            }

            // 3. Sync expenses with a wallet_id
            $expenses = PropertyExpense::whereNotNull('wallet_id')->get();
            foreach ($expenses as $expense) {
                $category = $expense->expense_scope === 'prive' ? 'prive' : 'expense';

                $existing = WalletTransaction::where('wallet_id', $expense->wallet_id)
                    ->where('reference_type', 'expense')
                    ->where('reference_id', $expense->id)
                    ->first();

                if (! $existing) {
                    WalletTransaction::create([
                        'wallet_id' => $expense->wallet_id,
                        'direction' => 'out',
                        'category' => $category,
                        'amount' => $expense->amount,
                        'transaction_date' => Carbon::parse($expense->expense_date)->toDateString(),
                        'reference_type' => 'expense',
                        'reference_id' => $expense->id,
                        'description' => $expense->description ?? 'Pengeluaran: '.$expense->getCategoryLabel(),
                        'created_by' => $expense->created_by,
                    ]);
                } else {
                    $existing->update([
                        'amount' => $expense->amount,
                        'transaction_date' => Carbon::parse($expense->expense_date)->toDateString(),
                    ]);
                }
            }

            // 4. Recalculate all wallet balances
            $wallets = Wallet::all();
            foreach ($wallets as $wallet) {
                $totalIn = WalletTransaction::where('wallet_id', $wallet->id)
                    ->where('direction', 'in')
                    ->sum('amount');

                $totalOut = WalletTransaction::where('wallet_id', $wallet->id)
                    ->where('direction', 'out')
                    ->sum('amount');

                $wallet->balance = $totalIn - $totalOut;
                $wallet->save();
            }
        });
    }

    /**
     * Ensure every BankAccount has a corresponding Wallet.
     */
    public function ensureEveryBankAccountHasWallet(?int $userId = null): void
    {
        $bankAccounts = BankAccount::whereNull('wallet_id')->get();

        if ($bankAccounts->isEmpty()) {
            return;
        }

        foreach ($bankAccounts as $account) {
            DB::transaction(function () use ($account, $userId) {
                // Create a corresponding wallet
                $wallet = Wallet::create([
                    'name' => $account->label ?? ($account->bank_name.' - '.$account->account_number),
                    'type' => 'property_linked',
                    'balance' => 0,
                    'purpose' => 'general',
                    'created_by' => $userId,
                    'notes' => 'Auto-created for bank account '.$account->account_number,
                ]);

                // Update the bank account
                $account->update([
                    'wallet_id' => $wallet->id,
                ]);
            });
        }

        // Trigger sync to calculate balances
        $this->syncAll();
    }
}
