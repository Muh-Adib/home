<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PropertyPerformanceDailyBreakdownSheet implements FromArray, WithEvents, WithHeadings, WithStyles, WithTitle
{
    protected string $propertyName;

    protected string $propertyColor;

    protected array $breakdown;

    public function __construct(string $propertyName, string $propertyColor, array $breakdown)
    {
        $this->propertyName = $propertyName;
        $this->propertyColor = $propertyColor ?: '#3b82f6';
        $this->breakdown = $breakdown;
    }

    public function title(): string
    {
        return substr('Detail '.$this->propertyName, 0, 31);
    }

    public function headings(): array
    {
        return [
            'Tanggal',
            'Nomor Booking',
            'Nama Tamu',
            'Tarif Dasar (Base)',
            'Weekend Premium',
            'Seasonal Premium',
            'Extra Bed',
            'Layanan Extra',
            'Total Pendapatan Hari Ini',
        ];
    }

    public function array(): array
    {
        $rows = [];
        foreach ($this->breakdown as $item) {
            $rows[] = [
                $item['date'],
                $item['booking_number'],
                $item['guest_name'],
                $item['base_amount'],
                $item['weekend_premium'],
                $item['seasonal_premium'],
                $item['extra_bed_amount'],
                $item['extra_services_amount'],
                $item['amount'],
            ];
        }

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        $highestRow = $sheet->getHighestRow();
        $colorHex = ltrim($this->propertyColor, '#');

        // Header Row Styling (using Property specific Color)
        $sheet->getStyle('A1:I1')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => $colorHex],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        // Body Styling with thin borders
        if ($highestRow >= 2) {
            $sheet->getStyle('A2:I'.$highestRow)->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E2E8F0'],
                    ],
                ],
            ]);

            // Number alignments
            $sheet->getStyle('D2:I'.$highestRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            // Currencies formatting for D (Base), E (Weekend), F (Seasonal), G (Extra Bed), H (Extra Services), I (Total Amount)
            $sheet->getStyle('D2:I'.$highestRow)->getNumberFormat()->setFormatCode('"Rp"#,##0');
        }
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                // Set Tab Color to Property Hex Color
                $colorHex = ltrim($this->propertyColor, '#');
                $event->sheet->getDelegate()->getTabColor()->setRGB($colorHex);

                // Auto size columns
                foreach (range('A', 'I') as $col) {
                    $event->sheet->getDelegate()->getColumnDimension($col)->setAutoSize(true);
                }
            },
        ];
    }
}
