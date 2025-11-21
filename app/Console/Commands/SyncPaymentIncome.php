<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\PaymentIncomeSyncService;
use App\Models\Payment;

class SyncPaymentIncome extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payment:sync-income 
                            {--all : Sync all verified payments}
                            {--cleanup : Cleanup income for unverified payments}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sinkronkan payment dengan income records';

    /**
     * Execute the console command.
     */
    public function handle(PaymentIncomeSyncService $syncService): int
    {
        $this->info('Starting payment-income synchronization...');

        $synced = 0;
        $cleaned = 0;

        if ($this->option('all')) {
            $this->info('Syncing all verified payments...');
            $synced = $syncService->syncAllVerifiedPayments();
            $this->info("✓ Synced {$synced} verified payments.");
        }

        if ($this->option('cleanup')) {
            $this->info('Cleaning up unverified payments...');
            $cleaned = $syncService->cleanupUnverifiedPayments();
            $this->info("✓ Cleaned up {$cleaned} unverified payments.");
        }

        if (!$this->option('all') && !$this->option('cleanup')) {
            $this->warn('Please specify --all or --cleanup option.');
            $this->info('Usage:');
            $this->info('  php artisan payment:sync-income --all      : Sync all verified payments');
            $this->info('  php artisan payment:sync-income --cleanup  : Cleanup unverified payments');
            $this->info('  php artisan payment:sync-income --all --cleanup : Do both');
            return 1;
        }

        $this->info('Synchronization completed!');
        return 0;
    }
}



























