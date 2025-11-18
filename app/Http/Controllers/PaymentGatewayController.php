<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use App\Services\PaymentGatewayService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PaymentGatewayController extends Controller
{
    protected PaymentGatewayService $gatewayService;

    public function __construct(PaymentGatewayService $gatewayService)
    {
        $this->gatewayService = $gatewayService;
    }

    /**
     * Initiate payment gateway untuk booking
     *
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse|JsonResponse
     */
    public function initiate(Request $request, Booking $booking)
    {
        // Authorization check
        if (Auth::check()) {
            $this->authorize('makePayment', $booking);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'type' => 'nullable|in:dp,remaining,full',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'expiry_hours' => 'nullable|integer|min:1|max:168', // Max 7 days
        ]);

        try {
            // Calculate payment type jika tidak di-set
            $paidAmount = $booking->payments()
                ->where('payment_status', 'verified')
                ->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount) {
                return back()->withErrors([
                    'amount' => 'Payment amount exceeds pending amount.'
                ]);
            }

            $type = $validated['type'] ?? ($paidAmount === 0 ? 'dp' : 'remaining');

            // Initiate gateway payment dengan options
            $payment = $this->gatewayService->initiateGatewayPayment(
                $booking,
                $validated['amount'],
                $type,
                [
                    'user_id' => Auth::id(),
                    'user' => Auth::user(),
                    'customer_name' => $booking->guest_name,
                    'customer_phone' => $booking->guest_phone,
                    'customer_email' => $booking->guest_email,
                    'payment_method_id' => $validated['payment_method_id'] ?? null,
                    'expiry_hours' => $validated['expiry_hours'] ?? null,
                ]
            );

            // Redirect ke payment URL
            if ($payment->ipaymu_payment_url) {
                return redirect($payment->ipaymu_payment_url);
            }

            return back()->withErrors([
                'error' => 'Failed to generate payment URL.'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to initiate gateway payment', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors([
                'error' => 'Failed to initiate payment: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Handle callback dari payment gateway (redirect)
     *
     * @param Request $request
     * @return RedirectResponse|Response
     */
    public function callback(Request $request)
    {
        try {
            $callbackData = $request->all();
            
            Log::info('Payment gateway callback received', [
                'data' => $callbackData,
            ]);

            // Process callback
            $payment = $this->gatewayService->processCallback($callbackData);

            if (!$payment) {
                return redirect()->route('my-bookings')
                    ->with('error', 'Payment not found.');
            }

            // Redirect berdasarkan status
            $status = $payment->payment_status;
            $booking = $payment->booking;

            if (Auth::check()) {
                $redirectRoute = 'my-bookings';
            } else {
                // Guest redirect - bisa menggunakan secure payment link
                $redirectRoute = route('bookings.show', $booking->booking_number);
            }

            return match($status) {
                'verified' => redirect($redirectRoute)
                    ->with('success', 'Payment successful! Your payment has been verified.'),
                'pending' => redirect($redirectRoute)
                    ->with('info', 'Payment is being processed. We will notify you once it is verified.'),
                'failed' => redirect($redirectRoute)
                    ->with('error', 'Payment failed. Please try again.'),
                'cancelled' => redirect($redirectRoute)
                    ->with('info', 'Payment was cancelled.'),
                default => redirect($redirectRoute)
                    ->with('info', 'Payment status: ' . $status),
            };

        } catch (\Exception $e) {
            Log::error('Payment gateway callback error', [
                'error' => $e->getMessage(),
                'data' => $request->all(),
            ]);

            return redirect()->route('my-bookings')
                ->with('error', 'An error occurred while processing payment callback.');
        }
    }

    /**
     * Handle webhook dari payment gateway
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function webhook(Request $request): JsonResponse
    {
        try {
            $webhookData = $request->all();

            Log::info('Payment gateway webhook received', [
                'data' => $webhookData,
                'ip' => $request->ip(),
            ]);

            // Process webhook
            $payment = $this->gatewayService->processWebhook($webhookData);

            if (!$payment) {
                Log::warning('Payment not found for webhook', [
                    'data' => $webhookData,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Webhook processed successfully',
                'payment_number' => $payment->payment_number,
                'status' => $payment->payment_status,
            ]);

        } catch (\Exception $e) {
            Log::error('Payment gateway webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Webhook processing failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate payment link untuk admin
     *
     * @param Request $request
     * @param Booking $booking
     * @return JsonResponse|RedirectResponse
     */
    public function generateLink(Request $request, Booking $booking)
    {
        $this->authorize('view', $booking);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'type' => 'nullable|in:dp,remaining,full',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'expiry_hours' => 'nullable|integer|min:1|max:168', // Max 7 days
        ]);

        try {
            // Calculate payment type jika tidak di-set
            $paidAmount = $booking->payments()
                ->where('payment_status', 'verified')
                ->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount) {
                return back()->withErrors([
                    'amount' => 'Payment amount exceeds pending amount.'
                ]);
            }

            $type = $validated['type'] ?? ($paidAmount === 0 ? 'dp' : 'remaining');

            // Generate payment link dengan options
            $payment = $this->gatewayService->initiateGatewayPayment(
                $booking,
                $validated['amount'],
                $type,
                [
                    'payment_method_id' => $validated['payment_method_id'] ?? null,
                    'expiry_hours' => $validated['expiry_hours'] ?? null,
                    'description' => "Payment link for booking {$booking->booking_number}",
                ]
            );

            $result = [
                'success' => true,
                'payment' => $payment,
                'payment_url' => $payment->ipaymu_payment_url,
                'expired_at' => $payment->ipaymu_expired_at,
            ];

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'payment_url' => $result['payment_url'],
                    'expired_at' => $result['expired_at'],
                    'payment_number' => $result['payment']->payment_number,
                ]);
            }

            return back()->with([
                'success' => 'Payment link generated successfully.',
                'payment_url' => $result['payment_url'],
                'payment_number' => $result['payment']->payment_number,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to generate payment link', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors([
                'error' => 'Failed to generate payment link: ' . $e->getMessage()
            ]);
        }
    }
}

