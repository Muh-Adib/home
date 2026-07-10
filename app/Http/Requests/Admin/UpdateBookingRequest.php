<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Booking;
use App\Models\Property;
use App\Services\AvailabilityService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateBookingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('booking'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            // Property & Dates
            'property_id' => 'required|exists:properties,id',
            'check_in_date' => 'required|date',
            'check_out_date' => 'required|date|after:check_in_date',
            'check_in_time' => 'required|string',

            // Guest Information
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

            // Booking Status
            'booking_status' => 'required|in:pending_verification,confirmed,cancelled,checked_in,checked_out,no_show',
            'payment_status' => 'nullable|in:dp_pending,dp_received,fully_paid',
            'dp_percentage' => 'required|integer|in:30,50,70,100',
            'source' => 'required|in:direct,phone,walk_in,ota',
            'force_capacity_override' => 'boolean',
            'guest_phone_alternative' => 'nullable|string|max:20',
            'followed_up_by' => 'nullable|exists:users,id',

            // Rate Override
            'rate_override' => 'nullable|boolean',
            'override_amount' => 'nullable|numeric|min:0',
            'override_reason' => 'required_if:rate_override,true|nullable|string|min:10|max:500',
            'discount_amount' => 'nullable|integer|min:0',

            // Extra Services
            'services' => 'nullable|array',
            'daily_extra_beds' => 'nullable|array',
            'daily_extra_beds.*' => 'integer|min:0',
        ];

        // Add services validation only if services array exists and is not empty
        if ($this->has('services') && is_array($this->services) && count($this->services) > 0) {
            $rules['services.*.service_master_id'] = 'nullable|exists:service_masters,id';
            $rules['services.*.service_name'] = 'required|string|max:255';
            $rules['services.*.service_type'] = 'required|string';
            $rules['services.*.quantity'] = 'required|integer|min:1';
            $rules['services.*.unit_price'] = 'required|numeric|min:0';
            $rules['services.*.discount_amount'] = 'nullable|numeric|min:0';
            $rules['services.*.total_price'] = 'required|numeric|min:0';
            $rules['services.*.vendor_unit_price'] = 'nullable|numeric|min:0';
            $rules['services.*.vendor_total_price'] = 'nullable|numeric|min:0';
            $rules['services.*.service_date'] = 'nullable|date';
        }

        return $rules;
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            // Validate total guest count
            $guestMale = (int) $this->input('guest_male', 0);
            $guestFemale = (int) $this->input('guest_female', 0);
            $guestChildren = (int) $this->input('guest_children', 0);
            $totalGuests = $guestMale + $guestFemale + $guestChildren;

            if ($totalGuests === 0) {
                $validator->errors()->add('guest_count', 'Minimal harus ada 1 tamu.');
            }

            // Check property ownership for property owners
            if ($this->user()->role === 'property_owner') {
                $property = Property::find($this->input('property_id'));
                if ($property && $property->owner_id !== $this->user()->id) {
                    $validator->errors()->add('property_id', 'You can only edit bookings for your own properties.');
                }
            }

            // Check availability when dates change
            $booking = $this->route('booking');
            if ($booking && $this->input('property_id')) {
                $property = Property::find($this->input('property_id'));

                if ($property) {
                    $checkIn = $this->input('check_in_date');
                    $checkOut = $this->input('check_out_date');

                    if ($checkIn && $checkOut && ($booking->check_in->format('Y-m-d') != $checkIn || $booking->check_out->format('Y-m-d') != $checkOut)) {
                        $availabilityService = app(AvailabilityService::class);
                        $availability = $availabilityService->checkAvailability(
                            property: $property,
                            checkIn: $checkIn,
                            checkOut: $checkOut,
                            guestCount: $totalGuests,
                            excludeBookingId: $booking->id,
                            ignoreCapacity: (bool) $this->input('force_capacity_override', false)
                        );

                        if (! $availability['available']) {
                            $validator->errors()->add('check_in_date', 'Property tidak tersedia untuk tanggal baru.');
                        }
                    }
                }
            }
        });
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'property_id.required' => 'Pilih property terlebih dahulu.',
            'property_id.exists' => 'Property yang dipilih tidak valid.',
            'check_in_date.required' => 'Tanggal check-in harus diisi.',
            'check_out_date.required' => 'Tanggal check-out harus diisi.',
            'check_out_date.after' => 'Tanggal check-out harus setelah tanggal check-in.',
            'guest_name.required' => 'Nama tamu utama harus diisi.',
            'guest_email.required' => 'Email tamu harus diisi.',
            'guest_email.email' => 'Format email tidak valid.',
            'guest_phone.required' => 'Nomor telepon harus diisi.',
            'guest_gender.required' => 'Jenis kelamin harus dipilih.',
            'guest_gender.in' => 'Jenis kelamin tidak valid.',
            'relationship_type.required' => 'Tipe hubungan harus dipilih.',
            'booking_status.required' => 'Status booking harus dipilih.',
            'dp_percentage.required' => 'Persentase DP harus diisi.',
            'dp_percentage.in' => 'Persentase DP harus 30, 50, 70, atau 100.',
        ];
    }
}
