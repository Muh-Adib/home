<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\GowaService;
use App\Services\WhatsappAuthService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class WhatsappAuthController extends Controller
{
    protected WhatsappAuthService $whatsappAuthService;
    protected GowaService $gowaService;

    public function __construct(
        WhatsappAuthService $whatsappAuthService,
        GowaService $gowaService
    ) {
        $this->whatsappAuthService = $whatsappAuthService;
        $this->gowaService = $gowaService;
    }

    /**
     * Check if phone number is registered on WhatsApp
     */
    public function checkNumber(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
        ]);

        $isValid = $this->gowaService->checkWhatsappNumber($request->phone);

        return response()->json([
            'valid' => $isValid,
            'message' => $isValid 
                ? __('auth.phone_registered_on_whatsapp')
                : __('auth.phone_not_on_whatsapp'),
        ]);
    }

    /**
     * Request OTP for phone number
     */
    public function requestOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
        ]);

        // Store redirect URL in session if provided
        if ($request->has('redirect')) {
            $request->session()->put('intended_url', $request->input('redirect'));
        }

        $result = $this->whatsappAuthService->sendOtp($request->phone);

        return response()->json($result);
    }

    /**
     * Verify OTP and login/register user
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
            'otp' => 'required|string|size:6',
        ]);

        $isValid = $this->whatsappAuthService->verifyOtp(
            $request->phone,
            $request->otp
        );

        if (!$isValid) {
            return response()->json([
                'success' => false,
                'message' => __('auth.invalid_otp'),
            ], 400);
        }

        // Login or register user
        $user = $this->whatsappAuthService->loginOrRegister($request->phone);
        Auth::login($user);

        // Get redirect URL
        $redirectUrl = session()->pull('intended_url', route('dashboard'));

        return response()->json([
            'success' => true,
            'message' => __('auth.login_successful'),
            'redirect_url' => $redirectUrl,
        ]);
    }

    /**
     * Resend OTP
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
        ]);

        $result = $this->whatsappAuthService->sendOtp($request->phone);

        return response()->json($result);
    }
}
