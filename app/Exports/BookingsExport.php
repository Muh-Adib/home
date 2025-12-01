<?php

namespace App\Exports;

use App\Models\Booking;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Illuminate\Database\Eloquent\Builder;

class BookingsExport implements FromQuery, WithHeadings, WithMapping
{
    protected $filters;

    public function __construct(array $filters = [])
    {
        $this->filters = $filters;
    }

    public function query()
    {
        $query = Booking::query()->with(['property', 'payments']);

        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                  ->orWhere('guest_name', 'like', "%{$search}%")
                  ->orWhere('guest_email', 'like', "%{$search}%");
            });
        }

        if (!empty($this->filters['status']) && $this->filters['status'] !== 'all') {
            $query->where('booking_status', $this->filters['status']);
        }

        if (!empty($this->filters['property_id']) && $this->filters['property_id'] !== 'all') {
            $query->where('property_id', $this->filters['property_id']);
        }

        if (!empty($this->filters['date_from'])) {
            $query->whereDate('check_in', '>=', $this->filters['date_from']);
        }

        if (!empty($this->filters['date_to'])) {
            $query->whereDate('check_out', '<=', $this->filters['date_to']);
        }

        return $query->orderBy('created_at', 'desc');
    }

    public function headings(): array
    {
        return [
            'Booking Number',
            'Property',
            'Guest Name',
            'Guest Email',
            'Guest Phone',
            'Check In',
            'Check Out',
            'Nights',
            'Guests',
            'Status',
            'Payment Status',
            'Total Amount',
            'DP Amount',
            'Remaining Amount',
            'Created At',
        ];
    }

    public function map($booking): array
    {
        return [
            $booking->booking_number,
            $booking->property ? $booking->property->name : 'N/A',
            $booking->guest_name,
            $booking->guest_email,
            $booking->guest_phone,
            $booking->check_in->format('Y-m-d'),
            $booking->check_out->format('Y-m-d'),
            $booking->nights,
            $booking->guest_count,
            $booking->booking_status,
            $booking->payment_status,
            $booking->total_amount,
            $booking->dp_amount,
            $booking->remaining_amount,
            $booking->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
