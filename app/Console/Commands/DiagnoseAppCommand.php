<?php

namespace App\Console\Commands;

use App\Services\DeploymentDiagnosticService;
use Illuminate\Console\Command;

class DiagnoseAppCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:diagnose';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run full diagnostic & auto-repair on application data and deployment status';

    /**
     * Execute the console command.
     */
    public function handle(DeploymentDiagnosticService $diagnosticService): int
    {
        $this->info('Starting full application diagnostic & auto-repair...');

        $result = $diagnosticService->runFullDiagnosticAndRepair();

        $this->newLine();
        $this->info('=== DIAGNOSTIC & AUTO-REPAIR RESULT ===');
        $this->line('- Income records created for un-synced bookings : '.$result['repairs']['missing_incomes_created']);
        $this->line('- Verified payment incomes synced              : '.$result['repairs']['verified_payments_synced']);
        $this->line('- Booking balances recalculated               : '.$result['repairs']['booking_balances_recalculated']);
        $this->line('- HK staff locations defaulted to Selatan      : '.$result['repairs']['hk_staff_locations_defaulted_to_selatan']);
        $this->newLine();
        $this->info('✓ Database connection: '.$result['system']['db_connection']);
        $this->info('✓ Active bookings count: '.$result['system']['active_bookings_count']);
        $this->info('✓ Housekeeping staff count: '.$result['system']['housekeeping_staff_count']);

        return Command::SUCCESS;
    }
}
