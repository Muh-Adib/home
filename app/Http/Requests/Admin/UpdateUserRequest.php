<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     * Use 'sometimes' for PATCH (partial update), and 'required' for PUT (full update).
     */
    public function rules(): array
    {
        $user = $this->route('user');
        $isPatch = $this->isMethod('patch');

        $presence = $isPatch ? 'sometimes' : 'required';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'email' => [
                $presence,
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'role' => [$presence, Rule::in(['super_admin', 'property_owner', 'property_manager', 'front_desk', 'housekeeping', 'finance', 'guest', 'content_creator'])],
            'status' => [$presence, Rule::in(['active', 'inactive', 'suspended'])],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed'],
            'avatar' => ['sometimes', 'nullable', 'image', 'max:2048'],

            // Profile fields
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'state' => ['sometimes', 'nullable', 'string', 'max:100'],
            'country' => ['sometimes', 'nullable', 'string', 'max:100'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'birth_date' => ['sometimes', 'nullable', 'date'],
            'gender' => ['sometimes', 'nullable', Rule::in(['male', 'female', 'other'])],
            'bio' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
