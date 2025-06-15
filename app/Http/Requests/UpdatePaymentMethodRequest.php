<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePaymentMethodRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('managePaymentMethods', \App\Models\PaymentMethod::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $paymentMethodId = $this->route('paymentMethod')->id ?? $this->route('paymentMethod');
        
        return [
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50|unique:payment_methods,code,' . $paymentMethodId,
            'type' => 'required|in:bank_transfer,e_wallet,credit_card,cash',
            'icon' => 'nullable|string|max:10',
            'description' => 'nullable|string|max:500',
            'bank_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:100',
            'account_name' => 'nullable|string|max:255',
            'qr_code' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'instructions' => 'nullable|array',
            'instructions.*' => 'string|max:500',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Payment method name is required.',
            'code.required' => 'Payment method code is required.',
            'code.unique' => 'This payment method code already exists.',
            'type.required' => 'Payment method type is required.',
            'type.in' => 'Invalid payment method type.',
            'qr_code.image' => 'QR code must be an image file.',
            'qr_code.mimes' => 'QR code must be a JPEG, PNG, or JPG file.',
            'qr_code.max' => 'QR code file size must not exceed 2MB.',
            'instructions.array' => 'Instructions must be an array.',
            'instructions.*.string' => 'Each instruction must be a string.',
            'instructions.*.max' => 'Each instruction must not exceed 500 characters.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'name' => 'payment method name',
            'code' => 'payment method code',
            'type' => 'payment method type',
            'bank_name' => 'bank name',
            'account_number' => 'account number',
            'account_name' => 'account name',
            'qr_code' => 'QR code',
            'instructions' => 'instructions',
            'is_active' => 'active status',
        ];
    }
}
