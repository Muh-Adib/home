<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * EnsureGuestUserAction - Finds an existing guest user or creates a new one
 */
class EnsureGuestUserAction
{
    /**
     * @param array $data ['guest_email', 'guest_name', 'guest_phone']
     * @param bool $autoVerify
     * @return User
     */
    public function execute(array $data, bool $autoVerify = true): User
    {
        $email = $data['guest_email'];
        $phone = $data['guest_phone'] ?? null;
        $name = $data['guest_name'];

        // Try find by email first, then phone
        $user = User::where('email', $email)
            ->when($phone, function ($query) use ($phone) {
                $query->orWhere('phone', $phone);
            })
            ->first();

        if (!$user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'password' => Hash::make(Str::random(16)),
                'role' => 'guest',
                'status' => 'active',
                'email_verified_at' => $autoVerify ? now() : null,
            ]);
        } else {
            // Optional: Update name or phone if they are empty
            $dirty = false;
            if (empty($user->phone) && $phone) {
                $user->phone = $phone;
                $dirty = true;
            }
            if ($dirty) {
                $user->save();
            }
        }

        return $user;
    }
}
