<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\Property;
use App\Models\PropertyExpense;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ExpensesListSheet implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    /**
     * @param  mixed  $property  Property model, 'general', or null
     * @param  array<string, mixed>  $filters
     */
    public function __construct(protected mixed $property = null, protected array $filters = []) {}

    public function title(): string
    {
        if ($this->property === null) {
            return 'Semua Pengeluaran';
        }
        if ($this->property === 'general') {
            return 'Perusahaan (Umum)';
        }

        return substr($this->property->name, 0, 30);
    }

    public function collection(): Collection
    {
        $query = PropertyExpense::with(['property', 'booking', 'wallet', 'creator', 'inventoryUsage.item', 'stockMovement.item']);

        // Apply property filter based on sheet context
        if ($this->property === 'general') {
            $query->whereNull('property_id');
        } elseif ($this->property instanceof Property) {
            $query->where('property_id', $this->property->id);
        } elseif (! empty($this->filters['property_id'])) {
            if ($this->filters['property_id'] === 'null') {
                $query->whereNull('property_id');
            } else {
                $query->where('property_id', $this->filters['property_id']);
            }
        }

        // Apply other filters
        if (! empty($this->filters['q'])) {
            $search = $this->filters['q'];
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('vendor_name', 'like', "%{$search}%");
            });
        }
        if (! empty($this->filters['from'])) {
            $query->whereDate('expense_date', '>=', $this->filters['from']);
        }
        if (! empty($this->filters['to'])) {
            $query->whereDate('expense_date', '<=', $this->filters['to']);
        }
        if (! empty($this->filters['type'])) {
            $query->where('expense_type', $this->filters['type']);
        }
        if (! empty($this->filters['category'])) {
            $query->where('expense_category', $this->filters['category']);
        }
        if (! empty($this->filters['scope'])) {
            $query->where('expense_scope', $this->filters['scope']);
        }
        if (! empty($this->filters['wallet_id'])) {
            $query->where('wallet_id', $this->filters['wallet_id']);
        }
        if (! empty($this->filters['is_inventory']) && $this->filters['is_inventory'] === 'true') {
            $query->whereHas('inventoryUsage');
        }

        $expenseScopes = config('finance.expense_scopes', []);
        $expenseCategories = config('finance.expense_categories', []);

        return $query->orderBy('expense_date', 'desc')->get()->map(function ($exp) use ($expenseScopes, $expenseCategories) {
            $tracking = 'Input Manual';
            if ($exp->booking) {
                $tracking = 'Booking #'.$exp->booking->booking_number;
            } elseif ($exp->inventoryUsage) {
                $tracking = 'Inventory: '.($exp->inventoryUsage->item?->name ?? 'Item').' ('.(float) $exp->inventoryUsage->quantity_used.')';
            } elseif ($exp->stockMovement) {
                $tracking = 'Purchase: '.($exp->stockMovement->item?->name ?? 'Item').' ('.(float) $exp->stockMovement->quantity.')';
            }

            return [
                $exp->expense_date ? $exp->expense_date->format('Y-m-d') : '-',
                $exp->property?->name ?? 'Perusahaan (Umum)',
                $expenseScopes[$exp->expense_scope] ?? $exp->expense_scope,
                $expenseCategories[$exp->expense_category] ?? $exp->expense_category,
                $exp->wallet?->name ?? '-',
                $exp->description ?? '-',
                $tracking,
                $exp->vendor_name ?? '-',
                $exp->receipt_number ?? '-',
                ucfirst($exp->payment_method ?? '-'),
                $exp->notes ?? '-',
                (float) $exp->amount,
                $exp->creator?->name ?? 'System',
            ];
        });
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'Tanggal Pengeluaran',
            'Lokasi Properti',
            'Scope',
            'Kategori',
            'Rekening/Wallet',
            'Deskripsi',
            'Pelacakan Data',
            'Vendor/Toko',
            'No. Nota',
            'Metode Pembayaran',
            'Catatan',
            'Nominal (Rp)',
            'Direkam Oleh',
        ];
    }

    /**
     * @return array<int|string, mixed>
     */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'B91C1C'], // Red/Rose color for expenses
                ],
            ],
        ];
    }
}
