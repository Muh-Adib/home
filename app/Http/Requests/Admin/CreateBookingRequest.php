<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Booking;
use App\Models\Property;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class CreateBookingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', Booking::class);
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Merge defaults for optional boolean fields
        $this->merge([
            'auto_confirm' => $this->input('auto_confirm', false),
        ]);
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
            'check_in_time' => 'nullable|date_format:H:i',

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
            'booking_status' => 'required|in:pending_verification,confirmed',
            'payment_status' => 'nullable|in:dp_pending,dp_received,fully_paid',
            'dp_percentage' => 'required|integer|in:30,50,70,100',
            'source' => 'nullable|in:direct,phone,walk_in,ota,yogyes,tiktok,instagram,web,airbnb',
            'auto_confirm' => 'boolean',
            'force_ota_override' => 'boolean',
            'force_capacity_override' => 'boolean',
            'guest_phone_alternative' => 'nullable|string|max:20',
            'followed_up_by' => 'nullable|exists:users,id',

            // Additional Guests depreciated
            'guests' => 'nullable|array',
            'guests.*.guest_type' => 'nullable|string',
            'guests.*.full_name' => 'required_with:guests|string|max:255',
            'guests.*.phone' => 'nullable|string|max:20',
            'guests.*.email' => 'nullable|email|max:255',
            'guests.*.gender' => 'nullable|in:male,female',
            'guests.*.age_category' => 'nullable|in:adult,child,infant',

            // Payment Information
            'payment_method_id' => 'required_if:payment_status,dp_received,fully_paid|nullable|exists:payment_methods,id',
            'payment_amount' => 'required_if:payment_status,dp_received,fully_paid|nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:100',
            'account_name' => 'nullable|string|max:255',
            'payment_status_payment' => 'nullable|in:pending,verified',
            'verification_notes' => 'nullable|string|max:1000',
            'payment_proof' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',

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

        // Add services validation only if services exist
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
            'override_reason.required_if' => 'Alasan override harus diisi jika menggunakan rate override.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'property_id' => 'property',
            'check_in_date' => 'tanggal check-in',
            'check_out_date' => 'tanggal check-out',
            'guest_name' => 'nama tamu',
            'guest_email' => 'email tamu',
            'guest_phone' => 'nomor telepon',
            'guest_country' => 'negara',
            'dp_percentage' => 'persentase DP',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            // Check property ownership for property owners
            if ($this->user()->role === 'property_owner') {
                $property = Property::find($this->input('property_id'));
                if ($property && $property->owner_id !== $this->user()->id) {
                    $validator->errors()->add('property_id', 'You can only create bookings for your own properties.');
                }
            }
        });
    }
}
