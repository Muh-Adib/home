<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PropertyPerformanceOverviewSheet implements FromArray, WithEvents, WithStyles, WithTitle
{
    protected array $data;

    protected array $filters;

    public function __construct(array $data, array $filters)
    {
        $this->data = $data;
        $this->filters = $filters;
    }

    public function title(): string
    {
        return 'Ringkasan Performa';
    }

    public function array(): array
    {
        $overview = $this->data['overview'];

        $rows = [
            ['LAPORAN PERFORMA DAN PENDAPATAN PROPERTI'],
            ['Rentang Tanggal', ($this->filters['date_from'] ?? 'N/A').' s/d '.($this->filters['date_to'] ?? 'N/A')],
            ['Filter Properti', $this->filters['property_id'] === 'all' ? 'Semua Properti' : $this->filters['property_id']],
            [],
            ['RINGKASAN METRIK GLOBAL'],
            ['Total Pendapatan', 'Total Booking', 'Rerata Okupansi', 'ADR', 'RevPAR'],
            [
                $overview['totalRevenue'],
                $overview['totalBookings'],
                $overview['occupancyRate'].'%',
                $overview['adr'],
                $overview['revpar'],
            ],
            [],
            ['PERFORMA INDIVIDUAL PROPERTI'],
            ['Nama Properti', 'Total Revenue', 'Total Booking', 'Okupansi Rate', 'ADR', 'RevPAR'],
        ];

        foreach ($this->data['propertyPerformance'] as $prop) {
            $rows[] = [
                $prop['name'],
                $prop['total_revenue'],
                $prop['total_bookings'],
                $prop['occupancy_rate'].'%',
                $prop['adr'],
                $prop['revpar'],
            ];
        }

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        $highestRow = $sheet->getHighestRow();

        // Title styling
        $sheet->mergeCells('A1:F1');
        $sheet->getStyle('A1:F1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E1B4B'], // Dark indigo
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(40);

        // Subtitle range / filters styling
        $sheet->getStyle('A2:B3')->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '475569']],
        ]);

        // Section Headers
        $sheet->getStyle('A5')->applyFromArray(['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => '4F46E5']]]);
        if ($highestRow >= 9) {
            $sheet->getStyle('A9')->applyFromArray(['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => '4F46E5']]]);
        }

        // KPI Headers Table
        $sheet->getStyle('A6:E6')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4F46E5'], // Indigo Accent
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $sheet->getRowDimension(6)->setRowHeight(24);

        // KPI Values Table
        $sheet->getStyle('A7:E7')->applyFromArray([
            'font' => ['bold' => true, 'size' => 11],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CBD5E1'],
                ],
            ],
        ]);
        $sheet->getStyle('A7')->getNumberFormat()->setFormatCode('"Rp"#,##0');
        $sheet->getStyle('D7:E7')->getNumberFormat()->setFormatCode('"Rp"#,##0');

        // Properties Table Headers
        $sheet->getStyle('A10:F10')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4F46E5'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $sheet->getRowDimension(10)->setRowHeight(24);

        // Properties Table Values Styling
        if ($highestRow >= 11) {
            $sheet->getStyle('A11:F'.$highestRow)->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E2E8F0'],
                    ],
                ],
            ]);

            // Align numbers to right
            $sheet->getStyle('B11:F'.$highestRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            // Currencies formatting
            $sheet->getStyle('B11:B'.$highestRow)->getNumberFormat()->setFormatCode('"Rp"#,##0');
            $sheet->getStyle('E11:F'.$highestRow)->getNumberFormat()->setFormatCode('"Rp"#,##0');
        }
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                // Set Tab Color to Slate Blue
                $event->sheet->getDelegate()->getTabColor()->setRGB('1E1B4B');

                // Auto size columns
                foreach (range('A', 'F') as $col) {
                    $event->sheet->getDelegate()->getColumnDimension($col)->setAutoSize(true);
                }
            },
        ];
    }
}
