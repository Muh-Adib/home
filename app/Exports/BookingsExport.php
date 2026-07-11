<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class BookingsExport implements WithMultipleSheets
{
    protected $filters;

    protected $filename;

    public function __construct(array $filters = [])
    {
        $this->filters = $filters;
        $this->filename = 'bookings_'.now()->format('Y-m-d_His').'.xlsx';
    }

    public function getFilename(): string
    {
        return $this->filename;
    }

    public function sheets(): array
    {
        return [
            new BookingsSheet($this->filters),
            new LookupsSheet,
        ];
    }
}
