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

class PropertyPerformanceBookingsSheet implements FromArray, WithEvents, WithHeadings, WithStyles, WithTitle
{
    protected array $bookings;

    public function __construct(array $bookings)
    {
        $this->bookings = $bookings;
    }

    public function title(): string
    {
        return 'Data Booking Keseluruhan';
    }

    public function headings(): array
    {
        return [
            'Nomor Booking',
            'Nama Properti',
            'Nama Tamu',
            'Check In',
            'Check Out',
            'Jumlah Malam (Nights)',
            'Tarif Kamar (Room Charge)',
            'Layanan Extra',
            'Total Pembayaran',
            'Status',
        ];
    }

    public function array(): array
    {
        $rows = [];
        foreach ($this->bookings as $item) {
            $rows[] = [
                $item['booking_number'],
                $item['property_name'],
                $item['guest_name'],
                $item['check_in'],
                $item['check_out'],
                $item['nights'],
                $item['room_charge'],
                $item['extra_services'],
                $item['total_amount'],
                $item['booking_status'],
            ];
        }

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        $highestRow = $sheet->getHighestRow();

        // Header Row Styling
        $sheet->getStyle('A1:J1')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E1B4B'], // Dark Indigo
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        // Body Styling with thin borders
        if ($highestRow >= 2) {
            $sheet->getStyle('A2:J'.$highestRow)->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E2E8F0'],
                    ],
                ],
            ]);

            // Number alignments
            $sheet->getStyle('F2:I'.$highestRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            // Currencies formatting for G (Room Charge), H (Extra Services), I (Total Amount)
            $sheet->getStyle('G2:I'.$highestRow)->getNumberFormat()->setFormatCode('"Rp"#,##0');
        }
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                // Set Tab Color to Dark Indigo
                $event->sheet->getDelegate()->getTabColor()->setRGB('1E1B4B');

                // Auto size columns
                foreach (range('A', 'J') as $col) {
                    $event->sheet->getDelegate()->getColumnDimension($col)->setAutoSize(true);
                }
            },
        ];
    }
}
