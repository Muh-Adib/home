<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\Income;
use App\Models\Property;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class IncomesListSheet implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    /**
     * @param  mixed  $property  Property model, 'general', or null
     * @param  array<string, mixed>  $filters
     */
    public function __construct(protected mixed $property = null, protected array $filters = []) {}

    public function title(): string
    {
        if ($this->property === null) {
            return 'Semua Pendapatan';
        }
        if ($this->property === 'general') {
            return 'Perusahaan (Umum)';
        }

        return substr($this->property->name, 0, 30);
    }

    public function collection(): Collection
    {
        $query = Income::with(['property', 'booking', 'wallet', 'payment', 'creator']);

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
                    ->orWhere('source', 'like', "%{$search}%");
            });
        }
        if (! empty($this->filters['from'])) {
            $query->whereDate('income_date', '>=', $this->filters['from']);
        }
        if (! empty($this->filters['to'])) {
            $query->whereDate('income_date', '<=', $this->filters['to']);
        }
        if (! empty($this->filters['source'])) {
            $query->where('source', $this->filters['source']);
        }
        if (! empty($this->filters['wallet_id'])) {
            $query->where('wallet_id', $this->filters['wallet_id']);
        }

        return $query->orderBy('income_date', 'desc')->get()->map(function ($inc) {
            $tracking = 'Input Manual';
            if ($inc->booking) {
                $tracking = 'Booking #'.$inc->booking->booking_number;
            } elseif ($inc->payment) {
                $tracking = 'Payment #'.$inc->payment->payment_number;
            }

            return [
                $inc->income_date ? $inc->income_date->format('Y-m-d') : '-',
                $inc->property?->name ?? 'Perusahaan (Umum)',
                ucfirst($inc->source),
                $inc->description ?? '-',
                $inc->wallet?->name ?? '-',
                $tracking,
                $inc->notes ?? '-',
                (float) $inc->amount,
                $inc->creator?->name ?? 'System',
            ];
        });
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'Tanggal Pendapatan',
            'Lokasi Properti',
            'Sumber',
            'Deskripsi',
            'Rekening/Wallet',
            'Pelacakan Data',
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
                    'startColor' => ['rgb' => '0F766E'], // Teal/Emerald-like
                ],
            ],
        ];
    }
}
