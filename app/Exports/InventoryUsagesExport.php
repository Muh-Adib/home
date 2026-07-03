<?php

namespace App\Exports;

use App\Models\InventoryUsage;
use App\Models\Property;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class InventoryUsagesExport implements WithMultipleSheets
{
    protected $dateFrom;
    protected $dateTo;

    public function __construct($dateFrom = null, $dateTo = null)
    {
        $this->dateFrom = $dateFrom;
        $this->dateTo = $dateTo;
    }

    public function sheets(): array
    {
        $sheets = [];

        // 1. First sheet is the raw logs/list sheet
        $sheets[] = new InventoryUsagesListSheet($this->dateFrom, $this->dateTo);

        // 2. Query properties that have usages in the range
        $query = InventoryUsage::query();
        if ($this->dateFrom) {
            $query->whereDate('usage_date', '>=', $this->dateFrom);
        }
        if ($this->dateTo) {
            $query->whereDate('usage_date', '<=', $this->dateTo);
        }
        
        $propertyIds = $query->distinct()->pluck('property_id')->toArray();
        $properties = Property::whereIn('id', $propertyIds)->orderBy('name')->get();

        foreach ($properties as $property) {
            $sheets[] = new PropertyUsageMatrixSheet($property->id, $property->name, $this->dateFrom, $this->dateTo);
        }

        return $sheets;
    }
}
