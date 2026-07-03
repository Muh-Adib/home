<?php

namespace App\Exports;

use App\Models\InventoryItem;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InventoryItemsExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function collection()
    {
        return InventoryItem::with('assignedUser')->get()->map(function ($it) {
            return [
                $it->sku,
                $it->name,
                $it->category ?? 'Tanpa Kategori',
                $it->unit,
                (float) $it->min_stock,
                $it->selling_price,
                (float) $it->current_stock,
                $it->assignedUser?->name ?? 'Tanpa PJ',
            ];
        });
    }

    public function headings(): array
    {
        return [
            'SKU',
            'Nama Barang',
            'Kategori',
            'Satuan',
            'Minimum Stock',
            'Harga Jual (Rp)',
            'Stok Aktual',
            'PJ (Penanggung Jawab)',
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
