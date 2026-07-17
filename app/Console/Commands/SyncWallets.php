<?php

namespace App\Console\Commands;

use App\Services\WalletService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('finance:sync-wallets')]
#[Description('Sinkronkan dan hitung ulang seluruh saldo wallet berdasarkan transaksi, pendapatan, dan pengeluaran')]
class SyncWallets extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(WalletService $walletService): int
    {
        $this->info('Memulai sinkronisasi dan perhitungan ulang saldo wallet...');

        try {
            $walletService->ensureEveryBankAccountHasWallet();
            $walletService->syncAll();
            $this->info('✓ Seluruh saldo wallet berhasil disinkronkan dan dihitung ulang.');

            return 0;
        } catch (\Exception $e) {
            $this->error('Gagal melakukan sinkronisasi: '.$e->getMessage());

            return 1;
        }
    }
}
