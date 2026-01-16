<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class SendPaymentLinkRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('view', $this->route('booking'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'amount' => 'required|numeric|min:1',
            'type' => 'nullable|in:dp,remaining,full',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'expiry_hours' => 'nullable|integer|min:1|max:168',
            'channel' => 'required|in:whatsapp,email,both',
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
            'amount.required' => 'Jumlah pembayaran harus diisi.',
            'amount.numeric' => 'Jumlah pembayaran harus berupa angka.',
            'amount.min' => 'Jumlah pembayaran minimal 1.',
            'type.in' => 'Tipe pembayaran tidak valid.',
            'payment_method_id.exists' => 'Metode pembayaran tidak ditemukan.',
            'expiry_hours.integer' => 'Masa berlaku harus berupa angka.',
            'expiry_hours.min' => 'Masa berlaku minimal 1 jam.',
            'expiry_hours.max' => 'Masa berlaku maksimal 168 jam (7 hari).',
            'channel.required' => 'Channel pengiriman harus dipilih.',
            'channel.in' => 'Channel tidak valid. Pilih whatsapp, email, atau both.',
        ];
    }
}
