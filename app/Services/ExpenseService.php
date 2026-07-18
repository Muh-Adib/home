<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PropertyExpense;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ExpenseService
{
    public function __construct(
        private WalletService $walletService
    ) {}

    /**
     * Catat pengeluaran + sinkronisasi saldo wallet.
     *
     * @throws ValidationException
     */
    public function recordExpense(array $data, int $userId): PropertyExpense
    {
        return DB::transaction(function () use ($data, $userId) {
            $walletId = $data['wallet_id'] ?? null;
            $amount = (float) $data['amount'];

            if ($walletId) {
                $wallet = Wallet::find($walletId);
                if (! $wallet) {
                    throw ValidationException::withMessages([
                        'wallet_id' => ['Wallet tidak ditemukan.'],
                    ]);
                }


            }

            // Buat expense record
            $expense = PropertyExpense::create([
                'property_id' => $data['property_id'] ?? null,
                'booking_id' => $data['booking_id'] ?? null,
                'expense_category' => $data['expense_category'],
                'expense_type' => $data['expense_type'] ?? 'variable',
                'description' => $data['description'] ?? null,
                'amount' => $amount,
                'expense_date' => $data['expense_date'],
                'vendor_name' => $data['vendor_name'] ?? null,
                'receipt_number' => $data['receipt_number'] ?? null,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
                'recorded_by' => $userId,
                'status' => 'approved', // Langsung approved untuk input manajer/super_admin
                'wallet_id' => $walletId,
                'expense_scope' => $data['expense_scope'] ?? 'operational',
                'capital_split_investor_pct' => $data['capital_split_investor_pct'] ?? null,
            ]);

            // Jika scope = capital (CAPEX), nominal CAPEX ini otomatis
            // di-calculate di Monthly Financial Report BEP dan Investor Split.

            // Catat transaksi wallet out jika wallet dipilih
            if ($walletId) {
                $category = $expense->expense_scope === 'prive' ? 'prive' : 'expense';

                $this->walletService->recordTransaction(
                    (int) $walletId,
                    'out',
                    $category,
                    $amount,
                    Carbon::parse($expense->expense_date)->toDateString(),
                    'expense',
                    $expense->id,
                    $expense->description ?? 'Pengeluaran: '.$expense->getCategoryLabel(),
                    $userId
                );
            }

            return $expense;
        });
    }

    /**
     * Update pengeluaran + sinkronisasi saldo wallet.
     *
     * @throws ValidationException
     */
    public function updateExpense(PropertyExpense $expense, array $data, int $userId): PropertyExpense
    {
        if ($expense->isLinked()) {
            throw new \Exception('Pengeluaran yang terhubung tidak dapat diubah secara manual.');
        }

        return DB::transaction(function () use ($expense, $data, $userId) {
            $walletId = $data['wallet_id'] ?? null;
            $amount = (float) $data['amount'];

            if ($walletId) {
                $wallet = Wallet::find($walletId);
                if (! $wallet) {
                    throw ValidationException::withMessages([
                        'wallet_id' => ['Wallet tidak ditemukan.'],
                    ]);
                }


            }

            // Hapus transaksi wallet lama yang terasosiasi dengan expense ini
            WalletTransaction::where('reference_type', 'expense')
                ->where('reference_id', $expense->id)
                ->delete();

            // Perbarui data expense
            $expense->update([
                'property_id' => $data['property_id'] ?? null,
                'booking_id' => $data['booking_id'] ?? null,
                'expense_category' => $data['expense_category'],
                'expense_type' => $data['expense_type'] ?? 'variable',
                'description' => $data['description'] ?? null,
                'amount' => $amount,
                'expense_date' => $data['expense_date'],
                'vendor_name' => $data['vendor_name'] ?? null,
                'receipt_number' => $data['receipt_number'] ?? null,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'notes' => $data['notes'] ?? null,
                'wallet_id' => $walletId,
                'expense_scope' => $data['expense_scope'] ?? 'operational',
                'capital_split_investor_pct' => $data['capital_split_investor_pct'] ?? null,
            ]);

            // Jika wallet dipilih, buat transaksi baru
            if ($walletId) {
                $category = $expense->expense_scope === 'prive' ? 'prive' : 'expense';

                $this->walletService->recordTransaction(
                    (int) $walletId,
                    'out',
                    $category,
                    $amount,
                    Carbon::parse($expense->expense_date)->toDateString(),
                    'expense',
                    $expense->id,
                    $expense->description ?? 'Pengeluaran: '.$expense->getCategoryLabel(),
                    $userId
                );
            }

            // Jalankan syncAll untuk merapikan saldo wallet
            $this->walletService->syncAll();

            return $expense->fresh();
        });
    }

    /**
     * Penyesuaian saldo wallet (adjustment).
     */
    public function adjustBalance(int $walletId, float $newBalance, string $reason, string $date, int $userId): WalletTransaction
    {
        return DB::transaction(function () use ($walletId, $newBalance, $reason, $date, $userId) {
            $wallet = Wallet::lockForUpdate()->findOrFail($walletId);
            $currentBalance = (float) $wallet->balance;
            $diff = $newBalance - $currentBalance;

            if (abs($diff) < 0.01) {
                throw ValidationException::withMessages([
                    'new_balance' => ['Saldo baru sama dengan saldo saat ini.'],
                ]);
            }

            $direction = $diff > 0 ? 'in' : 'out';
            $amount = abs($diff);

            // Buat transaksi adjustment
            $transaction = WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'direction' => $direction,
                'category' => 'adjustment',
                'amount' => $amount,
                'transaction_date' => $date,
                'reference_type' => 'manual',
                'reference_id' => null,
                'description' => sprintf('Penyesuaian Saldo: %s (Saldo awal: Rp %s)', $reason, number_format($currentBalance, 0, ',', '.')),
                'created_by' => $userId,
            ]);

            // Update balance
            $wallet->balance = $newBalance;
            $wallet->save();

            return $transaction;
        });
    }

    /**
     * Upload foto struk/nota.
     */
    public function uploadReceipt(PropertyExpense $expense, UploadedFile $file): string
    {
        if ($expense->receipt_image && Storage::disk('public')->exists($expense->receipt_image)) {
            Storage::disk('public')->delete($expense->receipt_image);
        }

        $path = $file->store('expenses/receipts', 'public');
        $expense->update(['receipt_image' => $path]);

        return $path;
    }
}
