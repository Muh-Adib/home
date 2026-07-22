<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateBookingStatusRequest extends FormRequest
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
        return [
            'new_status' => 'required|in:pending_verification,confirmed,cancelled,completed',
            'refund_data' => 'nullable|array',
            'refund_data.refund_amount' => 'nullable|numeric|min:0',
            'refund_data.refund_reason' => 'nullable|string|max:500',
            'refund_data.refund_method' => 'nullable|string|max:100',
            'refund_data.refund_account' => 'nullable|string|max:255',
            'refund_data.refund_notes' => 'nullable|string|max:1000',
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
            'new_status.required' => 'Status baru harus dipilih.',
            'new_status.in' => 'Status tidak valid.',
            'refund_data.refund_amount.numeric' => 'Jumlah refund harus berupa angka.',
            'refund_data.refund_amount.min' => 'Jumlah refund tidak boleh negatif.',
        ];
    }
}
