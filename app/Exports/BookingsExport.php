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
use PhpOffice\PhpSpreadsheet\Style\Conditional;
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

    protected $users; // Added users for Created By dropdown

    protected $dpPercentages; // Added DP percentages

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
        $this->paymentMethods = PaymentMethod::active()->pluck('name')->toArray();

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
        $query = Booking::query()->with(['property', 'createdBy', 'verifiedBy', 'payments.paymentMethod']);

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
            'Property Capacity',
            'Property Max Capacity',
            'Guest Name',
            'Guest Email',
            'Guest Phone',
            'Guest Country',
            'Guest ID Number',
            'Guest Gender',
            'Guest Male',
            'Guest Female',
            'Guest Children',
            'Effective Guest Count',
            'Relationship Type',
            'Check In',
            'Check In Time',
            'Check Out',
            'Nights',
            'Base Amount',
            'Extra Bed Amount',
            'Service Amount',
            'Tax Amount',
            'Total Amount',
            'DP Percentage',
            'DP Amount',
            'Remaining Amount',
            'Booking Status',
            'Payment Status',
            'Payment 1 Amount',
            'Payment 1 Date',
            'Payment 1 Method',
            'Payment 1 Status',
            'Payment 2 Amount',
            'Payment 2 Date',
            'Payment 2 Method',
            'Payment 2 Status',
            'Internal Notes',
            'Created At',
            'Created By',
            'Verified By',
        ];
    }

    public function map($booking): array
    {
        $property = $booking->property;

        // Dynamic formulas for Capacity (C) and Max Capacity (D)
        // Looks up the Property Name in column B against the hidden list in AZ:BB
        $propertyCount = $this->propertyDetails->count();
        $lookupRange = '$AZ$2:$BB$'.($propertyCount + 1);

        $capacityFormula = "=IFERROR(VLOOKUP(INDIRECT(\"B\"&ROW()), $lookupRange, 2, FALSE), 0)";
        $capacityMaxFormula = "=IFERROR(VLOOKUP(INDIRECT(\"B\"&ROW()), $lookupRange, 3, FALSE), 0)";

        // Formula for Effective Guest Count (N)
        // Logic: IF(Capacity < MaxCapacity, Male + Female + FLOOR(Children/2), Male + Female + Children)
        // Columns: C (Capacity), D (Max Capacity), K (Male), L (Female), M (Children)
        $guestCountFormula = '=IF(INDIRECT("C"&ROW()) < INDIRECT("D"&ROW()), INDIRECT("K"&ROW()) + INDIRECT("L"&ROW()) + INT(INDIRECT("M"&ROW())/2), INDIRECT("K"&ROW()) + INDIRECT("L"&ROW()) + INDIRECT("M"&ROW()))';

        // Formula for Nights (S) = Check Out (R) - Check In (P)
        $nightsFormula = '=IF(AND(INDIRECT("P"&ROW())<>"", INDIRECT("R"&ROW())<>""), INDIRECT("R"&ROW())-INDIRECT("P"&ROW()), 0)';

        // Get actual payment transactions
        $verifiedPayments = $booking->payments->sortBy('created_at')->values();
        $p1 = $verifiedPayments[0] ?? null;
        $p2 = $verifiedPayments[1] ?? null;

        return [
            $booking->booking_number,
            $property ? $property->name : 'N/A',
            $capacityFormula,
            $capacityMaxFormula,
            $booking->guest_name ?? '',
            $booking->guest_email ?? '',
            $booking->guest_phone ?? '',
            $booking->guest_country ?? '',
            $booking->guest_id_number ?? '',
            $booking->guest_gender ?? '',
            $booking->guest_male,
            $booking->guest_female,
            $booking->guest_children,
            $guestCountFormula,
            $booking->relationship_type ?? '',
            $booking->check_in ? $booking->check_in->format('d/m/Y') : '',
            $booking->check_in_time ?? '15:00',
            $booking->check_out ? $booking->check_out->format('d/m/Y') : '',
            $nightsFormula, // Use formula for Nights
            $booking->base_amount ?? 0,
            $booking->extra_bed_amount ?? 0,
            $booking->service_amount ?? 0,
            $booking->tax_amount ?? 0,
            $booking->total_amount ?? 0,
            $booking->dp_percentage ?? 0,
            $booking->dp_amount ?? 0,
            $booking->remaining_amount ?? 0,
            $booking->booking_status ?? '',
            $booking->payment_status ?? '',
            $p1 ? (float) $p1->amount : '',
            $p1 ? $p1->payment_date->format('d/m/Y') : '',
            $p1 ? $p1->paymentMethod?->name : '',
            $p1 ? $p1->payment_status : '',
            $p2 ? (float) $p2->amount : '',
            $p2 ? $p2->payment_date->format('d/m/Y') : '',
            $p2 ? $p2->paymentMethod?->name : '',
            $p2 ? $p2->payment_status : '',
            $booking->internal_notes ?? '',
            $booking->created_at ? $booking->created_at->format('Y-m-d H:i:s') : '',
            $booking->createdBy ? $booking->createdBy->name : 'N/A',
            $booking->verifiedBy ? $booking->verifiedBy->name : 'N/A',
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
                // Column: BC
                $row = 2;
                foreach ($this->paymentMethods as $method) {
                    $sheet->setCellValue("BC{$row}", $method);
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
            },
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Style header row (columns A to AO)
        $sheet->getStyle('A1:AO1')->applyFromArray([
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
        // Required columns: B (Property), E (Guest Name), P (Check-in), R (Check-out), Y (DP%), AC (Payment Status)
        if ($highestRow > 1) {
            for ($row = 2; $row <= $highestRow; $row++) {
                // Property Name - Column B
                if (empty($sheet->getCell("B{$row}")->getValue()) || $sheet->getCell("B{$row}")->getValue() === 'N/A') {
                    $sheet->getStyle("B{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699'); // Light yellow
                }

                // Guest Name - Column E
                if (empty($sheet->getCell("E{$row}")->getValue())) {
                    $sheet->getStyle("E{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699');
                }

                // Check-in Date - Column P
                if (empty($sheet->getCell("P{$row}")->getValue())) {
                    $sheet->getStyle("P{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699');
                }

                // Check-out Date - Column R
                if (empty($sheet->getCell("R{$row}")->getValue())) {
                    $sheet->getStyle("R{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699');
                }

                // DP Percentage - Column Y
                if (empty($sheet->getCell("Y{$row}")->getValue())) {
                    $sheet->getStyle("Y{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699');
                }

                // Payment Status - Column AC
                if (empty($sheet->getCell("AC{$row}")->getValue())) {
                    $sheet->getStyle("AC{$row}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FFE699');
                }

                // Conditional Formatting for Effective Guest Count (N) > Max Capacity (D)
                // We use conditional formatting rule for this
                $conditional1 = new Conditional;
                $conditional1->setConditionType(Conditional::CONDITION_EXPRESSION);
                $conditional1->setOperatorType(Conditional::OPERATOR_NONE);
                $conditional1->addCondition('=$N'.$row.'>$D'.$row);
                $conditional1->getStyle()->getFill()->setFillType(Fill::FILL_SOLID)->getEndColor()->setARGB(Color::COLOR_RED);
                $conditional1->getStyle()->getFont()->getColor()->setARGB(Color::COLOR_WHITE);

                $sheet->getStyle("N{$row}")->setConditionalStyles([$conditional1]);
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

        // Add data validation for Booking Status column (AB)
        for ($row = 2; $row <= $highestRow; $row++) {
            $validation = $sheet->getCell("AB{$row}")->getDataValidation();
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

        // Add data validation for Booking Payment Status column (AC)
        for ($row = 2; $row <= $highestRow; $row++) {
            $validation = $sheet->getCell("AC{$row}")->getDataValidation();
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
            $validation->setFormula1('"'.implode(',', $this->paymentStatuses).'"');
        }

        // Add data validation for Payment 1 Method column (AF) and Payment 2 Method column (AJ)
        $paymentMethodCount = count($this->paymentMethods);
        $pmLookupRange = '$BC$2:$BC$'.($paymentMethodCount + 1);
        for ($row = 2; $row <= $highestRow; $row++) {
            foreach (['AF', 'AJ'] as $col) {
                $validation = $sheet->getCell("{$col}{$row}")->getDataValidation();
                $validation->setType(DataValidation::TYPE_LIST);
                $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                $validation->setAllowBlank(true);
                $validation->setShowInputMessage(true);
                $validation->setShowErrorMessage(true);
                $validation->setShowDropDown(true);
                $validation->setErrorTitle('Invalid Payment Method');
                $validation->setError('Please select a payment method from the list');
                $validation->setPromptTitle('Select Payment Method');
                $validation->setPrompt('Choose a payment method from the dropdown');
                $validation->setFormula1($pmLookupRange);
            }
        }

        // Add data validation for Payment 1 Status column (AG) and Payment 2 Status column (AK)
        $indivPaymentStatuses = ['pending', 'verified', 'failed', 'cancelled'];
        for ($row = 2; $row <= $highestRow; $row++) {
            foreach (['AG', 'AK'] as $col) {
                $validation = $sheet->getCell("{$col}{$row}")->getDataValidation();
                $validation->setType(DataValidation::TYPE_LIST);
                $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                $validation->setAllowBlank(true);
                $validation->setShowInputMessage(true);
                $validation->setShowErrorMessage(true);
                $validation->setShowDropDown(true);
                $validation->setErrorTitle('Invalid Payment Status');
                $validation->setError('Please select a valid payment status');
                $validation->setPromptTitle('Select Payment Status');
                $validation->setPrompt('Choose a payment status from the dropdown');
                $validation->setFormula1('"'.implode(',', $indivPaymentStatuses).'"');
            }
        }

        // Add data validation for Relationship Type column (O)
        for ($row = 2; $row <= $highestRow; $row++) {
            $validation = $sheet->getCell("O{$row}")->getDataValidation();
            $validation->setType(DataValidation::TYPE_LIST);
            $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
            $validation->setAllowBlank(false);
            $validation->setShowInputMessage(true);
            $validation->setShowErrorMessage(true);
            $validation->setShowDropDown(true);
            $validation->setErrorTitle('Invalid Relationship Type');
            $validation->setError('Please select a relationship type from the list');
            $validation->setPromptTitle('Select Relationship Type');
            $validation->setPrompt('Choose a relationship type from the dropdown');
            $validation->setFormula1('"'.implode(',', $this->relationshipTypes).'"');
        }

        // Add data validation for Created By column (AN)
        $userCount = count($this->users);
        $userLookupRange = '$BD$2:$BD$'.($userCount + 1);
        for ($row = 2; $row <= $highestRow; $row++) {
            $validation = $sheet->getCell("AN{$row}")->getDataValidation();
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

        // Add data validation for DP Percentage column (Y)
        $dpCount = count($this->dpPercentages);
        $dpLookupRange = '$BE$2:$BE$'.($dpCount + 1);
        for ($row = 2; $row <= $highestRow; $row++) {
            $validation = $sheet->getCell("Y{$row}")->getDataValidation();
            $validation->setType(DataValidation::TYPE_LIST);
            $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
            $validation->setAllowBlank(false);
            $validation->setShowInputMessage(true);
            $validation->setShowErrorMessage(true);
            $validation->setShowDropDown(true);
            $validation->setErrorTitle('Invalid Percentage');
            $validation->setError('Please select a percentage from the list');
            $validation->setPromptTitle('Select Percentage');
            $validation->setPrompt('Choose a percentage from the dropdown');
            $validation->setFormula1($dpLookupRange);
        }

        return $sheet;
    }

    public function columnWidths(): array
    {
        return [
            'A' => 20, // Booking Number
            'B' => 25, // Property Name
            'C' => 18, // Property Capacity
            'D' => 22, // Property Max Capacity
            'E' => 25, // Guest Name
            'F' => 30, // Guest Email
            'G' => 18, // Guest Phone
            'H' => 15, // Guest Country
            'I' => 20, // Guest ID Number
            'J' => 15, // Guest Gender
            'K' => 12, // Guest Male
            'L' => 15, // Guest Female
            'M' => 15, // Guest Children
            'N' => 20, // Effective Guest Count
            'O' => 20, // Relationship Type
            'P' => 15, // Check In
            'Q' => 15, // Check In Time
            'R' => 15, // Check Out
            'S' => 10, // Nights
            'T' => 15, // Base Amount
            'U' => 18, // Extra Bed Amount
            'V' => 18, // Service Amount
            'W' => 15, // Tax Amount
            'X' => 15, // Total Amount
            'Y' => 15, // DP Percentage
            'Z' => 15, // DP Amount
            'AA' => 18, // Remaining Amount
            'AB' => 20, // Booking Status
            'AC' => 20, // Payment Status
            'AD' => 20, // Payment 1 Amount
            'AE' => 15, // Payment 1 Date
            'AF' => 25, // Payment 1 Method
            'AG' => 20, // Payment 1 Status
            'AH' => 20, // Payment 2 Amount
            'AI' => 15, // Payment 2 Date
            'AJ' => 25, // Payment 2 Method
            'AK' => 20, // Payment 2 Status
            'AL' => 30, // Internal Notes
            'AM' => 20, // Created At
            'AN' => 25, // Created By
            'AO' => 25, // Verified By
        ];
    }
}
