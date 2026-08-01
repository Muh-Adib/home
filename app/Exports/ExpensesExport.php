<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\Property;
use App\Models\PropertyExpense;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class ExpensesExport implements WithMultipleSheets
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function __construct(protected array $filters = []) {}

    /**
     * @return array<int, object>
     */
    public function sheets(): array
    {
        $sheets = [];

        // Sheet 1: Semua Pengeluaran
        $sheets[] = new ExpensesListSheet(null, $this->filters);

        // Get properties with expenses in range/filters
        $query = PropertyExpense::query();
        if (! empty($this->filters['from'])) {
            $query->whereDate('expense_date', '>=', $this->filters['from']);
        }
        if (! empty($this->filters['to'])) {
            $query->whereDate('expense_date', '<=', $this->filters['to']);
        }
        if (! empty($this->filters['property_id']) && $this->filters['property_id'] !== 'null') {
            $query->where('property_id', $this->filters['property_id']);
        }

        $propertyIds = $query->distinct()->pluck('property_id')->toArray();
        $propertyIdsFiltered = array_filter($propertyIds);

        if (! empty($propertyIdsFiltered)) {
            $properties = Property::whereIn('id', $propertyIdsFiltered)->orderBy('name')->get();
            foreach ($properties as $property) {
                $sheets[] = new ExpensesListSheet($property, $this->filters);
            }
        }

        // If there's general/no property expenses
        if (in_array(null, $propertyIds, true) || in_array('', $propertyIds, true) || in_array(0, $propertyIds, true)) {
            $sheets[] = new ExpensesListSheet('general', $this->filters);
        }

        return $sheets;
    }
}
