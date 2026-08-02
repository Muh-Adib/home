<?php

namespace App\Console\Commands;

use App\Models\Property;
use App\Services\PropertyFinancialReportService;
use Illuminate\Console\Command;

class GenerateFinancialReportCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'finance:report
                            {--month= : Month number (1-12, default current month)}
                            {--year= : Year number (e.g. 2026, default current year)}
                            {--from= : Start date YYYY-MM-DD}
                            {--to= : End date YYYY-MM-DD}
                            {--property= : Filter by property slug or ID}
                            {--save : Save report to database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate property financial reports per ownership schema for any month, period, or property';

    /**
     * Execute the console command.
     */
    public function handle(PropertyFinancialReportService $reportService): int
    {
        $month = $this->option('month') ? (int) $this->option('month') : null;
        $year = $this->option('year') ? (int) $this->option('year') : null;
        $from = $this->option('from');
        $to = $this->option('to');
        $propertyFilter = $this->option('property');
        $save = (bool) $this->option('save');

        $propertyId = null;
        if ($propertyFilter) {
            if (is_numeric($propertyFilter)) {
                $propertyId = (int) $propertyFilter;
            } else {
                $prop = Property::where('slug', $propertyFilter)->first();
                if ($prop) {
                    $propertyId = $prop->id;
                } else {
                    $this->error("Property with slug/ID '{$propertyFilter}' not found.");

                    return Command::FAILURE;
                }
            }
        }

        $this->info('Calculating Financial Report...');

        $data = $reportService->generateMonthlyReport(
            month: $month,
            year: $year,
            propertyId: $propertyId,
            saveToDatabase: $save,
            from: $from,
            to: $to
        );

        $period = $data['period'];
        $summary = $data['summary'];

        $this->newLine();
        $this->line("=== LAPORAN KEUANGAN BULANAN ({$period['start_date']} s/d {$period['end_date']}) ===");
        $this->line('Total Properti      : '.$summary['total_properties']);
        $this->line('Total Pendapatan    : Rp '.number_format($summary['total_income'], 0, ',', '.'));
        $this->line('Total Pengeluaran   : Rp '.number_format($summary['total_expenses'], 0, ',', '.'));
        $this->line('Total Laba Bersih   : Rp '.number_format($summary['net_profit'], 0, ',', '.'));
        $this->line('Hak Owner (Total)   : Rp '.number_format($summary['owner_share'], 0, ',', '.'));
        $this->line('Hak Investor (Total): Rp '.number_format($summary['investor_share'], 0, ',', '.'));
        $this->newLine();

        $headers = ['Property', 'Model Schema', 'Pendapatan', 'Pengeluaran', 'Laba Operasional', 'Hak Owner', 'Hak Investor', 'Occupancy'];
        $rows = [];

        foreach ($data['properties'] as $p) {
            $modelLabel = match ($p['ownership_model']) {
                'partnership' => "Partnership ({$p['owner_split_pct']}% / {$p['investor_split_pct']}%)",
                'rented' => 'Rented (Sewa)',
                'owned' => 'Owned (Milik Sendiri)',
                default => $p['ownership_model']
            };

            $rows[] = [
                $p['property_name'],
                $modelLabel,
                'Rp '.number_format($p['total_income'], 0, ',', '.'),
                'Rp '.number_format($p['total_expenses'], 0, ',', '.'),
                'Rp '.number_format($p['laba_operasional'], 0, ',', '.'),
                'Rp '.number_format($p['owner_share'], 0, ',', '.'),
                'Rp '.number_format($p['investor_share'], 0, ',', '.'),
                $p['occupancy_rate'].'% ('.$p['booked_nights'].' malam)',
            ];
        }

        $this->table($headers, $rows);

        if ($save) {
            $this->info("✓ Report data saved into 'financial_reports' database table.");
        }

        return Command::SUCCESS;
    }
}
