<?php

namespace App\Exports;

use App\Models\Booking;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\User;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
// opsional
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class BookingsExport implements FromQuery, WithColumnWidths, WithEvents, WithHeadings, WithMapping, WithStyles
{
    protected $filters;

    protected $properties;

    protected $propertyDetails; // Store full property details

    protected $statuses;

    protected $relationshipTypes;

    protected $filename;

    protected $paymentStatuses;

    protected $paymentMethods;

    protected $paymentMethodsDetails;

    protected $users; // Added users for Created By dropdown

    protected $dpPercentages; // Added DP percentages

    protected $currentRow = 1;

    public function __construct(array $filters = [])
    {
        $this->filters = $filters;

        // Set filename with timestamp
        $this->filename = 'bookings_'.now()->format('Y-m-d_His').'.xlsx';

        // Get all properties for dropdown and lookup
        // We need name, capacity, capacity_max
        $this->propertyDetails = Property::select('name', 'capacity', 'capacity_max')->get();
        $this->properties = $this->propertyDetails->pluck('name')->toArray();

        // Define valid statuses
        $this->statuses = ['pending_verification', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'];

        // Define valid relationship types
        $this->relationshipTypes = ['keluarga', 'teman', 'kolega', 'pasangan', 'campuran'];

        // Define valid payment statuses
        $this->paymentStatuses = ['dp_pending', 'dp_received', 'fully_paid'];

        // Get active payment methods
        $this->paymentMethodsDetails = PaymentMethod::active()->get();
        $this->paymentMethods = $this->paymentMethodsDetails->pluck('name')->toArray();

        // Get all users except guests for Created By dropdown
        $this->users = User::where('role', '!=', 'guest')->pluck('name')->toArray();

        // Define valid DP percentages
        $this->dpPercentages = [30, 50, 70, 100];
    }

    public function getFilename(): string
    {
        return $this->filename;
    }

    public function query()
    {
        $query = Booking::query()->with(['property', 'createdBy', 'verifiedBy', 'followedUpBy', 'closedBy', 'payments.paymentMethod', 'dailyRevenues']);

        if (! empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                    ->orWhere('guest_name', 'like', "%{$search}%")
                    ->orWhere('guest_email', 'like', "%{$search}%");
            });
        }

        if (! empty($this->filters['status']) && $this->filters['status'] !== 'all') {
            $query->where('booking_status', $this->filters['status']);
        }

        if (! empty($this->filters['property_id']) && $this->filters['property_id'] !== 'all') {
            $query->where('property_id', $this->filters['property_id']);
        }

        if (! empty($this->filters['date_from'])) {
            $query->whereDate('check_in', '>=', $this->filters['date_from']);
        }

        if (! empty($this->filters['date_to'])) {
            $query->whereDate('check_out', '<=', $this->filters['date_to']);
        }

        return $query->orderBy('created_at', 'desc');
    }

    public function headings(): array
    {
        return [
            'Booking Number',
            'Property Name',
            'Guest Name',
            'Guest Email',
            'Guest Phone',
            'Guest Country',
            'Guest Gender',
            'Guest Male',
            'Guest Female',
            'Guest Children',
            'Check In',
            'Check Out',
            'Jumlah Extra Bed',
            'Total Amount',
            'Pembayaran 1 Nominal',
            'Pembayaran 1 Tanggal',
            'Pembayaran 1 Bank',
            'Pembayaran 1 No Rekening',
            'Pembayaran 2 Nominal',
            'Pembayaran 2 Tanggal',
            'Pembayaran 2 Bank',
            'Pembayaran 2 No Rekening',
            'Booking Status',
            'Internal Notes',
            'Closed By',
            'Followed Up By',
        ];
    }

    public function map($booking): array
    {
        $property = $booking->property;

        // Fetch daily extra bed counts
        $dailyExtraBeds = $booking->dailyRevenues->sortBy('tanggal')->pluck('extra_bed_count')->toArray();
        $uniqueCounts = array_unique($dailyExtraBeds);
        if (count($uniqueCounts) === 1) {
            $jumlahExtraBed = (string) reset($uniqueCounts);
        } elseif (count($dailyExtraBeds) > 0) {
            $jumlahExtraBed = implode('|', $dailyExtraBeds);
        } else {
            $jumlahExtraBed = '0';
        }

        // Get actual payment transactions
        $verifiedPayments = $booking->payments->sortBy('created_at')->values();
        $p1 = $verifiedPayments[0] ?? null;
        $p2 = $verifiedPayments[1] ?? null;

        $this->currentRow++;
        $rowNum = $this->currentRow;

        $pmCount = count($this->paymentMethods);
        $pmLookupRange = '$BC$2:$BF$'.($pmCount + 1);

        $p1AccountFormula = "=IFERROR(VLOOKUP(Q{$rowNum}, $pmLookupRange, 4, FALSE), \"\")";
        $p2AccountFormula = "=IFERROR(VLOOKUP(U{$rowNum}, $pmLookupRange, 4, FALSE), \"\")";

        return [
            $booking->booking_number,
            $property ? $property->name : 'N/A',
            $booking->guest_name ?? '',
            $booking->guest_email ?? '',
            $booking->guest_phone ?? '',
            $booking->guest_country ?? '',
            $booking->guest_gender ?? '',
            $booking->guest_male,
            $booking->guest_female,
            $booking->guest_children,
            $booking->check_in ? $booking->check_in->format('d/m/Y') : '',
            $booking->check_out ? $booking->check_out->format('d/m/Y') : '',
            $jumlahExtraBed,
            $booking->total_amount ?? 0,
            $p1 ? (float) $p1->amount : '',
            $p1 ? $p1->payment_date->format('d/m/Y') : '',
            $p1 ? $p1->bank_name : '',
            $p1AccountFormula,
            $p2 ? (float) $p2->amount : '',
            $p2 ? $p2->payment_date->format('d/m/Y') : '',
            $p2 ? $p2->bank_name : '',
            $p2AccountFormula,
            $booking->booking_status ?? '',
            $booking->internal_notes ?? '',
            $booking->closedBy ? $booking->closedBy->name : 'N/A',
            $booking->followedUpBy ? $booking->followedUpBy->name : 'N/A',
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet;

                // Populate hidden property data for VLOOKUP
                // Columns: AZ (Name), BA (Capacity), BB (Max Capacity)
                $row = 2;
                foreach ($this->propertyDetails as $property) {
                    $sheet->setCellValue("AZ{$row}", $property->name);
                    $sheet->setCellValue("BA{$row}", $property->capacity);
                    $sheet->setCellValue("BB{$row}", $property->capacity_max);
                    $row++;
                }

                // Populate hidden payment methods for dropdown
                // Column: BC (Name), BF (Account Number)
                $row = 2;
                foreach ($this->paymentMethodsDetails as $method) {
                    $sheet->setCellValue("BC{$row}", $method->name);
                    $sheet->setCellValue("BF{$row}", $method->account_number ?? '');
                    $row++;
                }

                // Populate hidden users for Created By dropdown
                // Column: BD
                $row = 2;
                foreach ($this->users as $user) {
                    $sheet->setCellValue("BD{$row}", $user);
                    $row++;
                }

                // Populate hidden DP percentages for dropdown
                // Column: BE
                $row = 2;
                foreach ($this->dpPercentages as $percentage) {
                    $sheet->setCellValue("BE{$row}", $percentage);
                    $row++;
                }

                // Hide the lookup columns
                $sheet->getDelegate()->getColumnDimension('AZ')->setVisible(false);
                $sheet->getDelegate()->getColumnDimension('BA')->setVisible(false);
                $sheet->getDelegate()->getColumnDimension('BB')->setVisible(false);
                $sheet->getDelegate()->getColumnDimension('BC')->setVisible(false);
                $sheet->getDelegate()->getColumnDimension('BD')->setVisible(false);
                $sheet->getDelegate()->getColumnDimension('BE')->setVisible(false);
                $sheet->getDelegate()->getColumnDimension('BF')->setVisible(false);
            },
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Style header row (columns A to Z)
        $sheet->getStyle('A1:Z1')->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 11,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
        ]);

        // Hide Booking Number column (A)
        $sheet->getColumnDimension('A')->setVisible(false);

        $highestRow = $sheet->getHighestRow();

        // Color code required fields for new bookings (yellow background for emphasis)
        // Required columns: B (Property), C (Guest Name), K (Check-in), L (Check-out), N (Total Amount), W (Booking Status)
        if ($highestRow > 1) {
            for ($row = 2; $row <= $highestRow; $row++) {
                // Property Name - Column B
                if (empty($sheet->getCell("B{$row}")->getValue()) || $sheet->getCell("B{$row}")->getValue() === 'N/A') {
                    $sheet->getStyle("B{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699'); // Light yellow
                }

                // Guest Name - Column C
                if (empty($sheet->getCell("C{$row}")->getValue())) {
                    $sheet->getStyle("C{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699');
                }

                // Check-in Date - Column K
                if (empty($sheet->getCell("K{$row}")->getValue())) {
                    $sheet->getStyle("K{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699');
                }

                // Check-out Date - Column L
                if (empty($sheet->getCell("L{$row}")->getValue())) {
                    $sheet->getStyle("L{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699');
                }

                // Total Amount - Column N
                if (empty($sheet->getCell("N{$row}")->getValue())) {
                    $sheet->getStyle("N{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699');
                }

                // Booking Status - Column W
                if (empty($sheet->getCell("W{$row}")->getValue())) {
                    $sheet->getStyle("W{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699');
                }
            }
        }

        // Add data validation for Property Name column (B)
        for ($row = 2; $row <= $highestRow; $row++) {
            $validation = $sheet->getCell("B{$row}")->getDataValidation();
            $validation->setType(DataValidation::TYPE_LIST);
            $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
            $validation->setAllowBlank(false);
            $validation->setShowInputMessage(true);
            $validation->setShowErrorMessage(true);
            $validation->setShowDropDown(true);
            $validation->setErrorTitle('Invalid Property');
            $validation->setError('Please select a property from the list');
            $validation->setPromptTitle('Select Property');
            $validation->setPrompt('Choose a property from the dropdown');
            $validation->setFormula1('"'.implode(',', $this->properties).'"');
        }

        // Add data validation for Booking Status column (W)
        for ($row = 2; $row <= $highestRow; $row++) {
            $validation = $sheet->getCell("W{$row}")->getDataValidation();
            $validation->setType(DataValidation::TYPE_LIST);
            $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
            $validation->setAllowBlank(false);
            $validation->setShowInputMessage(true);
            $validation->setShowErrorMessage(true);
            $validation->setShowDropDown(true);
            $validation->setErrorTitle('Invalid Status');
            $validation->setError('Please select a status from the list');
            $validation->setPromptTitle('Select Status');
            $validation->setPrompt('Choose a status from the dropdown');
            $validation->setFormula1('"'.implode(',', $this->statuses).'"');
        }

        // Add data validation for Payment 1 Bank column (Q) and Payment 2 Bank column (U)
        $paymentMethodCount = count($this->paymentMethods);
        $pmLookupRange = '$BC$2:$BC$'.($paymentMethodCount + 1);
        for ($row = 2; $row <= $highestRow; $row++) {
            foreach (['Q', 'U'] as $col) {
                $validation = $sheet->getCell("{$col}{$row}")->getDataValidation();
                $validation->setType(DataValidation::TYPE_LIST);
                $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                $validation->setAllowBlank(true);
                $validation->setShowInputMessage(true);
                $validation->setShowErrorMessage(true);
                $validation->setShowDropDown(true);
                $validation->setErrorTitle('Invalid Bank');
                $validation->setError('Please select a bank from the list');
                $validation->setPromptTitle('Select Bank');
                $validation->setPrompt('Choose a bank from the dropdown');
                $validation->setFormula1($pmLookupRange);
            }
        }

        // Add data validation for Closed By / Followed Up By columns (Y, Z)
        $userCount = count($this->users);
        $userLookupRange = '$BD$2:$BD$'.($userCount + 1);
        for ($row = 2; $row <= $highestRow; $row++) {
            foreach (['Y', 'Z'] as $col) {
                $validation = $sheet->getCell("{$col}{$row}")->getDataValidation();
                $validation->setType(DataValidation::TYPE_LIST);
                $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                $validation->setAllowBlank(true);
                $validation->setShowInputMessage(true);
                $validation->setShowErrorMessage(true);
                $validation->setShowDropDown(true);
                $validation->setErrorTitle('Invalid User');
                $validation->setError('Please select a user from the list');
                $validation->setPromptTitle('Select User');
                $validation->setPrompt('Choose a user from the dropdown');
                $validation->setFormula1($userLookupRange);
            }
        }

        return $sheet;
    }

    public function columnWidths(): array
    {
        return [
            'A' => 20, // Booking Number
            'B' => 25, // Property Name
            'C' => 25, // Guest Name
            'D' => 30, // Guest Email
            'E' => 18, // Guest Phone
            'F' => 15, // Guest Country
            'G' => 15, // Guest Gender
            'H' => 12, // Guest Male
            'I' => 15, // Guest Female
            'J' => 15, // Guest Children
            'K' => 15, // Check In
            'L' => 15, // Check Out
            'M' => 20, // Jumlah Extra Bed
            'N' => 15, // Total Amount
            'O' => 20, // Pembayaran 1 Nominal
            'P' => 15, // Pembayaran 1 Tanggal
            'Q' => 25, // Pembayaran 1 Bank
            'R' => 20, // Pembayaran 1 No Rekening
            'S' => 20, // Pembayaran 2 Nominal
            'T' => 15, // Pembayaran 2 Tanggal
            'U' => 25, // Pembayaran 2 Bank
            'V' => 20, // Pembayaran 2 No Rekening
            'W' => 20, // Booking Status
            'X' => 30, // Internal Notes
            'Y' => 25, // Closed By
            'Z' => 25, // Followed Up By
        ];
    }
}
