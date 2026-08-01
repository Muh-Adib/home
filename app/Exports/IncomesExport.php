<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\Income;
use App\Models\Property;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class IncomesExport implements WithMultipleSheets
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

        // Sheet 1: Semua Pendapatan
        $sheets[] = new IncomesListSheet(null, $this->filters);

        // Get properties with incomes in range/filters
        $query = Income::query();
        if (! empty($this->filters['from'])) {
            $query->whereDate('income_date', '>=', $this->filters['from']);
        }
        if (! empty($this->filters['to'])) {
            $query->whereDate('income_date', '<=', $this->filters['to']);
        }
        if (! empty($this->filters['property_id']) && $this->filters['property_id'] !== 'null') {
            $query->where('property_id', $this->filters['property_id']);
        }

        $propertyIds = $query->distinct()->pluck('property_id')->toArray();
        $propertyIdsFiltered = array_filter($propertyIds);

        if (! empty($propertyIdsFiltered)) {
            $properties = Property::whereIn('id', $propertyIdsFiltered)->orderBy('name')->get();
            foreach ($properties as $property) {
                $sheets[] = new IncomesListSheet($property, $this->filters);
            }
        }

        // If there's general/no property incomes
        if (in_array(null, $propertyIds, true) || in_array('', $propertyIds, true) || in_array(0, $propertyIds, true)) {
            $sheets[] = new IncomesListSheet('general', $this->filters);
        }

        return $sheets;
    }
}
