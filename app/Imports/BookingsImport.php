<?php

namespace App\Imports;

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class BookingsImport implements ToModel, WithHeadingRow, WithValidation
{
    public function model(array $row)
    {
        // Find property by name (fuzzy match or exact)
        $property = Property::where('name', $row['property'])->first();
        
        if (!$property) {
            // Skip if property not found, or handle error
            return null;
        }

        // Check if booking exists
        $booking = Booking::where('booking_number', $row['booking_number'])->first();

        if ($booking) {
            // Update existing booking
            $booking->update([
                'booking_status' => $row['status'] ?? $booking->booking_status,
                'payment_status' => $row['payment_status'] ?? $booking->payment_status,
                // Add other updateable fields as needed
            ]);
            return $booking;
        }

        // Create new booking
        // First ensure guest user exists
        $guestUser = User::where('email', $row['guest_email'])->first();
        if (!$guestUser) {
            $guestUser = User::create([
                'name' => $row['guest_name'],
                'email' => $row['guest_email'],
                'phone' => $row['guest_phone'] ?? null,
                'password' => Hash::make(Str::random(12)),
                'role' => 'guest',
                'status' => 'active',
            ]);
        }

        $checkIn = Carbon::parse($row['check_in']);
        $checkOut = Carbon::parse($row['check_out']);
        $nights = $checkIn->diffInDays($checkOut);

        return new Booking([
            'booking_number' => $row['booking_number'], // Will be auto-generated if null, but we use imported one if present
            'property_id' => $property->id,
            'guest_name' => $row['guest_name'],
            'guest_email' => $row['guest_email'],
            'guest_phone' => $row['guest_phone'] ?? 'N/A',
            'guest_country' => 'ID', // Default
            'guest_gender' => 'male', // Default
            'relationship_type' => 'keluarga', // Default
            'guest_count' => $row['guests'] ?? 1,
            'guest_male' => 1, // Default
            'guest_female' => 0,
            'guest_children' => 0,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'nights' => $nights,
            'total_amount' => $row['total_amount'] ?? 0,
            'dp_amount' => $row['dp_amount'] ?? 0,
            'remaining_amount' => $row['remaining_amount'] ?? 0,
            'booking_status' => $row['status'] ?? 'pending_verification',
            'payment_status' => $row['payment_status'] ?? 'dp_pending',
            'dp_percentage' => 30, // Default
            'created_by' => auth()->id(),
            'source' => 'import',
        ]);
    }

    public function rules(): array
    {
        return [
            'property' => 'required',
            'guest_name' => 'required',
            'guest_email' => 'required|email',
            'check_in' => 'required|date',
            'check_out' => 'required|date|after:check_in',
        ];
    }
}
