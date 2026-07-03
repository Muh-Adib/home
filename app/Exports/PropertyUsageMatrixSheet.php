<?php

namespace App\Exports;

use App\Models\InventoryUsage;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PropertyUsageMatrixSheet implements FromArray, WithTitle, WithStyles, ShouldAutoSize
{
    protected $propertyId;
    protected $propertyName;
    protected $dateFrom;
    protected $dateTo;

    public function __construct($propertyId, $propertyName, $dateFrom = null, $dateTo = null)
    {
        $this->propertyId = $propertyId;
        $this->propertyName = $propertyName;
        $this->dateFrom = $dateFrom;
        $this->dateTo = $dateTo;
    }

    public function title(): string
    {
        // Limit sheet title to 30 chars (Excel restriction)
        return substr($this->propertyName, 0, 30);
    }

    public function array(): array
    {
        $query = InventoryUsage::with('item')
            ->where('property_id', $this->propertyId);

        if ($this->dateFrom) {
            $query->whereDate('usage_date', '>=', $this->dateFrom);
        }
        if ($this->dateTo) {
            $query->whereDate('usage_date', '<=', $this->dateTo);
        }

        $usages = $query->get();

        // Distinct sorted dates (columns)
        $dates = $usages->pluck('usage_date')->unique()->sort()->values()->toArray();
        // Distinct items (rows)
        $items = $usages->pluck('item')->unique('id')->sortBy('name')->values();

        // Header row: dates horizontally
        $header = array_merge(['Nama Barang \ Tanggal'], $dates);
        $rows = [$header];

        // Item row: items vertically
        foreach ($items as $item) {
            if (!$item) continue;
            $row = [$item->name . ' (' . $item->unit . ')'];
            foreach ($dates as $date) {
                $qty = $usages->where('inventory_item_id', $item->id)
                    ->where('usage_date', $date)
                    ->sum('quantity_used');
                $row[] = $qty > 0 ? (float) $qty : 0;
            }
            $rows[] = $row;
        }

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '2563EB'],
                ],
            ],
        ];
    }
}
