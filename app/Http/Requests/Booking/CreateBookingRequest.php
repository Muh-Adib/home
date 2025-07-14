<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Property;
use Carbon\Carbon;

class CreateBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Property is resolved from route model binding, so we don't need property_id validation
        return [
            'check_in_date' => 'required|date|after_or_equal:today',
            'check_out_date' => 'required|date|after:check_in_date',
            'check_in_time' => 'required|string|max:10',
            'guest_male' => 'required|integer|min:0',
            'guest_female' => 'required|integer|min:0',
            'guest_children' => 'required|integer|min:0',
            'guest_name' => 'required|string|max:255',
            'guest_email' => 'required|email|max:255',
            'guest_phone' => 'required|string|max:20',
            'guest_country' => 'required|string|max:100',
            'guest_id_number' => 'nullable|string|max:50',
            'guest_gender' => 'required|in:male,female',
            'relationship_type' => 'required|in:keluarga,teman,kolega,pasangan,campuran',
            'special_requests' => 'nullable|string|max:1000',
            'internal_notes' => 'nullable|string|max:1000',
            'booking_status' => 'nullable|in:pending_verification,confirmed|default:pending_verification',
            'payment_status' => 'nullable|in:dp_pending,dp_received,fully_paid|default:dp_pending',
            'dp_percentage' => 'required|integer|min:0|max:100',
            'auto_confirm' => 'boolean',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $this->validateGuestCount($validator);
            $this->validatePropertyAvailability($validator);
            $this->validateMinimumStay($validator);
        });
    }

    private function validateGuestCount($validator)
    {
        $totalGuests = $this->input('guest_male') + $this->input('guest_female') + $this->input('guest_children');
        
        if ($totalGuests <= 0) {
            $validator->errors()->add('guest_count', 'Total tamu harus lebih dari 0.');
            return;
        }

        // Get property from route model binding
        $property = $this->route('property');
        if ($property && $totalGuests > $property->capacity_max) {
            $validator->errors()->add('guest_count', "Jumlah tamu melebihi kapasitas maksimal ({$property->capacity_max} orang).");
        }
    }

    private function validatePropertyAvailability($validator)
    {
        // Get property from route model binding
        $property = $this->route('property');
        if (!$property) {
            return;
        }

        $checkIn = $this->input('check_in_date');
        $checkOut = $this->input('check_out_date');

        // Skip validation if dates are not provided
        if (!$checkIn || !$checkOut) {
            return;
        }

        // Check if property is available for these dates
        try {
            $availabilityService = app(\App\Services\AvailabilityService::class);
            $availability = $availabilityService->checkAvailability($property, $checkIn, $checkOut);

            if (!$availability['available']) {
                $validator->errors()->add('dates', 'Property tidak tersedia untuk tanggal yang dipilih.');
            }
        } catch (\Exception $e) {
            // Log error but don't fail validation
            \Log::warning('Availability check failed: ' . $e->getMessage());
        }
    }

    private function validateMinimumStay($validator)
    {
        // Get property from route model binding
        $property = $this->route('property');
        if (!$property) {
            return;
        }

        $checkInDate = $this->input('check_in_date');
        if (!$checkInDate) {
            return;
        }

        $checkOutDate = $this->input('check_out_date');
        if (!$checkOutDate) {
            return;
        }

        try {
            $checkIn = Carbon::parse($checkInDate);
            $checkOut = Carbon::parse($checkOutDate);
            $nights = $checkIn->diffInDays($checkOut);

            // Determine minimum stay based on check-in day
            $isWeekend = $checkIn->isWeekend();
            $minStay = $isWeekend ? $property->min_stay_weekend : $property->min_stay_weekday;

            if ($nights < $minStay) {
                $validator->errors()->add('dates', "Minimum stay untuk " . ($isWeekend ? 'weekend' : 'weekday') . " adalah {$minStay} malam.");
            }
        } catch (\Exception $e) {
            // Log error but don't fail validation
            \Log::warning('Minimum stay validation failed: ' . $e->getMessage());
        }
    }

    public function messages(): array
    {
        return [
            'check_in_date.after_or_equal' => 'Tanggal check-in harus hari ini atau setelahnya.',
            'check_out_date.after' => 'Tanggal check-out harus setelah tanggal check-in.',
            'guest_male.required' => 'Jumlah tamu pria harus diisi.',
            'guest_female.required' => 'Jumlah tamu wanita harus diisi.',
            'guest_children.required' => 'Jumlah tamu anak-anak harus diisi.',
            'guest_name.required' => 'Nama tamu harus diisi.',
            'guest_email.required' => 'Email tamu harus diisi.',
            'guest_email.email' => 'Format email tidak valid.',
            'guest_phone.required' => 'Nomor telepon tamu harus diisi.',
            'guest_country.required' => 'Negara asal tamu harus diisi.',
            'guest_gender.required' => 'Jenis kelamin tamu harus diisi.',
            'guest_gender.in' => 'Jenis kelamin harus pria atau wanita.',
            'relationship_type.required' => 'Jenis hubungan tamu harus diisi.',
            'relationship_type.in' => 'Jenis hubungan tidak valid.',
            'booking_status.required' => 'Status booking harus diisi.',
            'booking_status.in' => 'Status booking tidak valid.',
            'payment_status.required' => 'Status pembayaran harus diisi.',
            'payment_status.in' => 'Status pembayaran tidak valid.',
            'dp_percentage.required' => 'Persentase DP harus diisi.',
            'dp_percentage.integer' => 'Persentase DP harus berupa angka.',
            'dp_percentage.min' => 'Persentase DP minimal 0%.',
            'dp_percentage.max' => 'Persentase DP maksimal 100%.',
        ];
    }
} 