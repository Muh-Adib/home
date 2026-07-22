<?php

namespace App\Exports;

use App\Models\InventoryStockMovement;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InventoryPurchasesExport implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles
{
    protected $dateFrom;

    protected $dateTo;

    public function __construct($dateFrom = null, $dateTo = null)
    {
        $this->dateFrom = $dateFrom;
        $this->dateTo = $dateTo;
    }

    public function collection()
    {
        $query = InventoryStockMovement::with(['item.assignedUser', 'property', 'user'])
            ->where('type', 'purchase');

        if ($this->dateFrom) {
            $query->whereDate('movement_date', '>=', $this->dateFrom);
        }
        if ($this->dateTo) {
            $query->whereDate('movement_date', '<=', $this->dateTo);
        }

        return $query->orderBy('movement_date', 'desc')->get()->map(function ($m) {
            return [
                $m->movement_date,
                $m->item?->sku,
                $m->item?->name,
                $m->item?->unit,
                (float) $m->quantity,
                (float) $m->unit_cost,
                (float) $m->total_cost,
                $m->property?->name ?? 'Global/Gudang',
                $m->vendor_name ?? '-',
                $m->notes ?? '-',
                $m->user?->name ?? 'System',
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Tanggal Pembelian',
            'SKU',
            'Nama Barang',
            'Satuan',
            'Jumlah (Qty)',
            'Harga Satuan (Rp)',
            'Total Biaya (Rp)',
            'Lokasi Properti',
            'Vendor',
            'Catatan',
            'Direkam Oleh',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '059669'],
                ],
            ],
        ];
    }
}
