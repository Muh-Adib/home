<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CheckAvailabilityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // This is an API endpoint, authorization is handled by controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'property_id' => 'required|exists:properties,id',
            'check_in' => 'required|date',
            'check_out' => 'required|date|after:check_in',
            'exclude_booking_id' => 'nullable|exists:bookings,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'property_id.required' => 'Property ID harus diisi.',
            'property_id.exists' => 'Property tidak ditemukan.',
            'check_in.required' => 'Tanggal check-in harus diisi.',
            'check_in.date' => 'Format tanggal check-in tidak valid.',
            'check_out.required' => 'Tanggal check-out harus diisi.',
            'check_out.date' => 'Format tanggal check-out tidak valid.',
            'check_out.after' => 'Tanggal check-out harus setelah check-in.',
        ];
    }
}
