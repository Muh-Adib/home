<?php

namespace App\Console\Commands;

use App\Services\WalletService;
use Illuminate\Console\Command;

class SyncWallets extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'finance:sync-wallets';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sinkronkan dan hitung ulang seluruh saldo wallet berdasarkan transaksi, pendapatan, dan pengeluaran';

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
