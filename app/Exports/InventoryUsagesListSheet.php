<?php

namespace App\Exports;

use App\Models\InventoryUsage;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InventoryUsagesListSheet implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize, WithTitle
{
    protected $dateFrom;
    protected $dateTo;

    public function __construct($dateFrom = null, $dateTo = null)
    {
        $this->dateFrom = $dateFrom;
        $this->dateTo = $dateTo;
    }

    public function title(): string
    {
        return 'Ringkasan Pemakaian';
    }

    public function collection()
    {
        $query = InventoryUsage::with(['item.assignedUser', 'property', 'user']);

        if ($this->dateFrom) {
            $query->whereDate('usage_date', '>=', $this->dateFrom);
        }
        if ($this->dateTo) {
            $query->whereDate('usage_date', '<=', $this->dateTo);
        }

        return $query->orderBy('usage_date', 'desc')->get()->map(function ($u) {
            return [
                $u->usage_date,
                $u->property?->name ?? 'Global',
                $u->item?->sku,
                $u->item?->name,
                $u->item?->unit,
                (float) $u->quantity_used,
                (float) $u->total_cost,
                $u->notes ?? '-',
                $u->user?->name ?? 'System',
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Tanggal Pemakaian',
            'Lokasi Properti',
            'SKU',
            'Nama Barang',
            'Satuan',
            'Jumlah Digunakan',
            'Estimasi Biaya (Rp)',
            'Catatan/Keperluan',
            'Direkam Oleh',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4F46E5'],
                ],
            ],
        ];
    }
}
