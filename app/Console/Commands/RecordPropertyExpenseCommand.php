<?php

namespace App\Console\Commands;

use App\Models\Property;
use App\Services\PropertyFinancialReportService;
use Illuminate\Console\Command;

class RecordPropertyExpenseCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'finance:record-expense
                            {property : Property ID or slug (e.g. toscana-malioboro)}
                            {amount : Expense amount in IDR}
                            {description : Short description of expense}
                            {--category=other : Expense category (utilities, maintenance, supplies, staff, marketing, insurance, tax, other)}
                            {--scope=operational : Expense scope (operational, capital, prive)}
                            {--date= : Expense date YYYY-MM-DD (defaults to today or July 2026 date)}
                            {--vendor= : Optional vendor name}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Record property expense easily via CLI / MCP context';

    /**
     * Execute the console command.
     */
    public function handle(PropertyFinancialReportService $reportService): int
    {
        $propertyInput = $this->argument('property');
        $amount = (float) $this->argument('amount');
        $description = $this->argument('description');
        $category = $this->option('category');
        $scope = $this->option('scope');
        $date = $this->option('date') ?: now()->toDateString();
        $vendor = $this->option('vendor');

        $property = is_numeric($propertyInput)
            ? Property::find((int) $propertyInput)
            : Property::where('slug', $propertyInput)->first();

        if (! $property) {
            $this->error("Property '{$propertyInput}' not found.");

            return Command::FAILURE;
        }

        if ($amount <= 0) {
            $this->error('Amount must be greater than 0.');

            return Command::FAILURE;
        }

        $expense = $reportService->recordExpense([
            'property_id' => $property->id,
            'amount' => $amount,
            'description' => $description,
            'expense_category' => $category,
            'expense_scope' => $scope,
            'expense_date' => $date,
            'vendor' => $vendor,
        ]);

        $this->info('✓ Recorded expense of Rp '.number_format($expense->amount, 0, ',', '.')." for {$property->name} ({$expense->expense_date}). ID: {$expense->id}");

        return Command::SUCCESS;
    }
}
