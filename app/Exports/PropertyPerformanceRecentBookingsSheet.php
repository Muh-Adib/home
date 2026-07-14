<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PropertyPerformanceRecentBookingsSheet implements FromArray, WithHeadings, WithStyles, WithTitle
{
    protected array $bookings;

    public function __construct(array $bookings)
    {
        $this->bookings = $bookings;
    }

    public function title(): string
    {
        return 'Booking Terakhir';
    }

    public function headings(): array
    {
        return [
            'Nomor Booking',
            'Nama Properti',
            'Nama Tamu',
            'Check In',
            'Check Out',
            'Nights',
            'Total Booking',
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
                $item['total_amount'],
                $item['booking_status'],
            ];
        }

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
