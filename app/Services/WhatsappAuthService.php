<?php

namespace App\Services;

use App\Models\User;
use App\Models\WhatsappOtp;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class WhatsappAuthService
{
    protected GowaService $gowaService;

    public function __construct(GowaService $gowaService)
    {
        $this->gowaService = $gowaService;
    }

    /**
     * Send OTP to phone number via WhatsApp
     */
    public function sendOtp(string $phone): array
    {
        // 1. Validate phone format
        if (! $this->isValidPhoneFormat($phone)) {
            return [
                'success' => false,
                'message' => __('auth.invalid_phone_format'),
            ];
        }

        // 2. Check if phone is registered on WhatsApp
        if (! $this->gowaService->checkWhatsappNumber($phone)) {
            return [
                'success' => false,
                'message' => __('auth.phone_not_on_whatsapp'),
            ];
        }

        // 3. Check rate limiting
        if ($this->isRateLimited($phone)) {
            return [
                'success' => false,
                'message' => __('auth.too_many_requests'),
            ];
        }

        // 4. Generate 6-digit OTP
        $otpCode = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        // 5. Save to database
        WhatsappOtp::create([
            'phone' => $phone,
            'otp_code' => $otpCode,
            'expires_at' => Carbon::now()->addMinutes(5),
            'is_verified' => false,
            'attempts' => 0,
            'ip_address' => request()->ip(),
        ]);

        // 6. Send OTP via GOWA
        $message = __('auth.otp_message', ['otp' => $otpCode]);
        $result = $this->gowaService->sendMessage($phone, $message);

        if (! $result['success']) {
            return [
                'success' => false,
                'message' => __('auth.failed_to_send_otp'),
            ];
        }

        return [
            'success' => true,
            'message' => __('auth.otp_sent'),
        ];
    }

    /**
     * Verify OTP code
     */
    public function verifyOtp(string $phone, string $otp): bool
    {
        $otpRecord = WhatsappOtp::getLatestForPhone($phone);

        if (! $otpRecord) {
            return false;
        }

        // Check if expired
        if ($otpRecord->isExpired()) {
            return false;
        }

        // Check max attempts
        if ($otpRecord->isMaxAttempts()) {
            return false;
        }

        // Verify OTP code
        if ($otpRecord->otp_code !== $otp) {
            $otpRecord->incrementAttempts();

            return false;
        }

        // Mark as verified
        $otpRecord->markAsVerified();

        return true;
    }

    /**
     * Login or register user with phone number
     */
    public function loginOrRegister(string $phone): User
    {
        // Find user by phone
        $user = User::where('phone', $phone)->first();

        if ($user) {
            // Update existing user
            $user->update([
                'last_login' => now(),
                'phone_verified_at' => $user->phone_verified_at ?? now(),
            ]);

            return $user;
        }

        // Create new user
        // Try to get user info from WhatsApp
        $userInfo = $this->gowaService->getUserInfo($phone);
        $name = $userInfo['push_name'] ?? 'WhatsApp User';

        $user = User::create([
            'name' => $name,
            'phone' => $phone,
            'email' => $phone.'@whatsapp.local', // Dummy email
            'password' => Hash::make(Str::random(32)), // Random password
            'role' => 'guest',
            'status' => 'active',
            'country' => 'Indonesia',
            'phone_verified_at' => now(),
            'last_login' => now(),
        ]);

        return $user;
    }

    /**
     * Check if phone format is valid
     */
    protected function isValidPhoneFormat(string $phone): bool
    {
        // Phone should start with country code (e.g., 628xxx)
        // and contain only digits
        return preg_match('/^[0-9]{10,15}$/', $phone);
    }

    /**
     * Check if phone is rate limited
     */
    protected function isRateLimited(string $phone): bool
    {
        // Check if phone has requested OTP more than 3 times in last 30 minutes
        $count = WhatsappOtp::where('phone', $phone)
            ->where('created_at', '>=', Carbon::now()->subMinutes(30))
            ->count();

        return $count >= 3;
    }
}
