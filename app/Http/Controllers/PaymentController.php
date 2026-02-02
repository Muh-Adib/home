<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Booking;
use App\Models\PaymentMethod;
use App\Events\PaymentCreated;
use App\Services\PaymentGatewayService;
use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;


/**
 * Payment Controller
 * 
 * This controller handles the payment process for guest bookings.
 * It includes methods for creating, storing, and managing payments.
 * 
 * @package App\Http\Controllers
 * @author Muhammad Adib Aulia Hanif <adwk.project@gmail.com>
 */

class PaymentController extends Controller
{
    protected PaymentGatewayService $gatewayService;
    protected ImageService $imageService;

    public function __construct(
        PaymentGatewayService $gatewayService,
        ImageService $imageService
    ) {
        $this->gatewayService = $gatewayService;
        $this->imageService = $imageService;
    }

    /**
     * List of Indonesian banks and e-wallets for sender account
     */
    const BANK_OPTIONS = [
        // Major Banks
        'BCA - Bank Central Asia',
        'BRI - Bank Rakyat Indonesia',
        'BNI - Bank Negara Indonesia',
        'Mandiri - Bank Mandiri',
        'CIMB Niaga',
        'Danamon',
        'Permata Bank',
        'OCBC NISP',
        'Maybank',
        'BTPN',
        'BJB - Bank Jabar Banten',
        'Bank Mega',
        'Bank Bukopin',
        'Bank Syariah Indonesia (BSI)',

        // Digital Banks
        'Jenius (BTPN)',
        'Digibank by DBS',
        'Bank Jago',
        'Neo Commerce (Bank Neo)',
        'SeaBank',
        'Allo Bank',

        // E-Wallets
        'GoPay',
        'OVO',
        'DANA',
        'LinkAja',
        'ShopeePay',
        'PayPal',

        // Other
        'Lainnya',
    ];

    /**
     * Show payment page for guest - langsung redirect ke iPaymu
     */
    public function create(Booking $booking): Response
    {
        // Check if user has permission to make payment for this booking
        if (Auth::check()) {
            $this->authorize('makePayment', $booking);
        }

        // Calculate pending amount
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $pendingAmount = $booking->total_amount - $paidAmount;

        if ($pendingAmount <= 0) {
            return redirect()->route('my-bookings')
                ->with('info', 'This booking has been fully paid.');
        }

        // Determine payment type
        $paymentType = $paidAmount === 0 ? 'dp' : 'remaining';

        // Calculate nights
        $checkIn = \Carbon\Carbon::parse($booking->check_in);
        $checkOut = \Carbon\Carbon::parse($booking->check_out);
        $nights = $checkIn->diffInDays($checkOut);

        // Get available payment methods (iPaymu dan methods yang aktif)
        // Untuk sekarang, kita ambil semua payment methods yang aktif
        // Frontend bisa filter untuk hanya show iPaymu atau methods tertentu
        $paymentMethods = PaymentMethod::active()
            ->orderBy('sort_order')
            ->get()
            ->map(function ($method) use ($pendingAmount) {
                return [
                    'id' => $method->id,
                    'name' => $method->name,
                    'code' => $method->code,
                    'type' => $method->type,
                    'icon' => $method->icon,
                    'description' => $method->description,
                    'fee_percentage' => $method->fee_percentage ?? 0,
                    'fee_fixed' => $method->fee_fixed ?? 0,
                    'fee_type' => $method->fee_type ?? 'percentage',
                    'fee_amount' => $method->calculateFee($pendingAmount),
                    'total_with_fee' => $method->getTotalWithFee($pendingAmount),
                    'is_ipaymu' => $method->isIpaymu(),
                ];
            });

        return Inertia::render('Payment/Create', [
            'booking' => $booking->load('property'),
            'pendingAmount' => $pendingAmount,
            'paidAmount' => $paidAmount,
            'paymentType' => $paymentType,
            'nights' => $nights,
            'paymentMethods' => $paymentMethods,
            'defaultExpiryHours' => config('ipaymu.expiry_hours', 24),
        ]);
    }

    /**
     * Store payment for guest - langsung initiate gateway payment
     */
    public function store(Request $request, Booking $booking): RedirectResponse
    {
        try {
            // Check if user has permission to make payment for this booking
            if (Auth::check()) {
                $this->authorize('makePayment', $booking);
            }

            $validated = $request->validate([
                'amount' => 'required|numeric|min:1',
                'type' => 'nullable|in:dp,remaining,full',
                'payment_method_id' => 'nullable|exists:payment_methods,id',
                'expiry_hours' => 'nullable|integer|min:1|max:168', // Max 7 days
            ]);

            // Check if amount is valid
            $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount) {
                return back()->withErrors([
                    'amount' => 'Payment amount exceeds pending amount.'
                ]);
            }

            // Determine payment type
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

        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            Log::error('Authorization failed', ['error' => $e->getMessage()]);
            return back()->withErrors([
                'error' => 'You are not authorized to make payment for this booking.'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed', ['errors' => $e->errors()]);
            return back()->withErrors($e->errors());
        } catch (\Exception $e) {
            Log::error('Payment gateway initiation failed', [
                'error' => $e->getMessage(),
                'booking_id' => $booking->id,
            ]);

            return back()->withErrors([
                'error' => 'Failed to initiate payment: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Show user's payment history
     */
    public function myPayments(Request $request): Response
    {
        $user = $request->user();

        $query = Payment::query()
            ->with(['booking.property', 'paymentMethod'])
            ->whereHas('booking', function ($q) use ($user) {
                $q->where('guest_email', $user->email);
            });

        // Filter by status
        if ($request->filled('status')) {
            $query->where('payment_status', $request->get('status'));
        }

        // Filter by type
        if ($request->filled('type')) {
            $query->where('payment_type', $request->get('type'));
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('payment_number', 'like', "%{$search}%")
                    ->orWhereHas('booking', function ($bq) use ($search) {
                        $bq->where('booking_number', 'like', "%{$search}%");
                    });
            });
        }

        $payments = $query->latest()->paginate(10);

        return Inertia::render('Guest/MyPayments', [
            'payments' => $payments,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
                'type' => $request->get('type'),
            ]
        ]);
    }

    /**
     * Show specific payment details for user
     */
    public function myPaymentShow(Payment $payment): Response
    {
        // Check if user owns this payment
        $this->authorize('view', $payment);

        $payment->load(['booking.property', 'paymentMethod', 'verifier']);

        return Inertia::render('Payment/Show', [
            'payment' => $payment,
        ]);
    }

    /**
     * Show secure payment form (token-based access)
     */
    public function securePayment(Booking $booking, string $token): Response
    {
        // Validate payment token
        if (!$booking->isPaymentTokenValid($token)) {
            return redirect()->route('my-bookings')
                ->with('error', 'Invalid or expired payment link.');
        }

        // Update expiry time to maximum 2 hours from now when link is opened
        // This ensures countdown is always max 2 hours from when user opens the link
        $twoHoursFromNow = now()->addHours(2);
        if (!$booking->payment_token_expires_at || $booking->payment_token_expires_at->gt($twoHoursFromNow)) {
            $booking->update([
                'payment_token_expires_at' => $twoHoursFromNow
            ]);
            // Refresh booking to get updated expiry time
            $booking->refresh();
        }

        // Calculate payment amounts
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $dpAmount = $booking->dp_amount ?? ($booking->total_amount * 0.3); // Default 30% DP
        $remainingAmount = $booking->total_amount - $paidAmount;

        // Determine payment type and amount
        $paymentType = 'dp';
        $requiredAmount = $dpAmount;

        if ($paidAmount >= $dpAmount) {
            $paymentType = 'remaining';
            $requiredAmount = $remainingAmount;
        }

        if ($remainingAmount <= 0) {
            return redirect()->route('my-bookings')
                ->with('info', 'This booking has been fully paid.');
        }

        // Get active payment methods
        $paymentMethods = PaymentMethod::active()->get();

        // Calculate nights
        $checkIn = \Carbon\Carbon::parse($booking->check_in);
        $checkOut = \Carbon\Carbon::parse($booking->check_out);
        $nights = $checkIn->diffInDays($checkOut);

        return Inertia::render('Payment/SecurePayment', [
            'booking' => [
                'id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'property' => [
                    'name' => $booking->property->name,
                    'address' => $booking->property->address,
                    'cover_image' => $booking->property->cover_image,
                ],
                'check_in' => $booking->check_in,
                'check_out' => $booking->check_out,
                'guest_count' => $booking->guest_count,
                'total_amount' => $booking->total_amount,
                'booking_status' => $booking->booking_status,
                'payment_status' => $booking->payment_status,
                'payment_token_expires_at' => $booking->payment_token_expires_at,
                'nights' => $nights,
                'dp_amount' => $dpAmount,
                'dp_percentage' => $booking->dp_percentage ?? 30,
            ],
            'paymentMethods' => $paymentMethods,
            'paymentInfo' => [
                'paidAmount' => $paidAmount,
                'dpAmount' => $dpAmount,
                'remainingAmount' => $remainingAmount,
                'requiredAmount' => $requiredAmount,
                'paymentType' => $paymentType,
                'isDpComplete' => $paidAmount >= $dpAmount,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Store secure payment (token-based access)
     */
    public function securePaymentStore(Request $request, Booking $booking, string $token): RedirectResponse
    {
        // Validate payment token
        if (!$booking->isPaymentTokenValid($token)) {
            return redirect()->route('my-bookings')
                ->with('error', 'Invalid or expired payment link.');
        }

        // Validate request
        $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1|max:' . $booking->total_amount,
            'proof_of_payment' => 'required|file|mimes:jpg,jpeg,png,pdf|max:2048',
            'payment_notes' => 'nullable|string|max:500',
        ]);

        try {
            DB::beginTransaction();

            // Get payment method
            $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);

            // Upload proof of payment
            $proofPath = $this->uploadAndOptimizePaymentProof($request->file('proof_of_payment'));

            // Create payment record
            $payment = Payment::create([
                'booking_id' => $booking->id,
                'payment_number' => Payment::generatePaymentNumber(),
                'payment_method_id' => $request->payment_method_id,
                'amount' => $request->amount,
                'payment_type' => 'dp',
                'payment_method' => $paymentMethod->type,
                'payment_status' => 'pending',
                'attachment_path' => $proofPath,
                'verification_notes' => $request->payment_notes,
                'payment_date' => now(),
                'processed_by' => null, // Guest payment, no processor
            ]);

            // Update booking payment status
            $booking->updatePaymentStatus();

            // Clear payment token after successful payment
            $booking->clearPaymentToken();

            // Trigger payment created event
            event(new PaymentCreated($payment, Auth::user()));

            DB::commit();

            return redirect()->route('my-bookings')
                ->with('success', 'Payment submitted successfully. We will verify your payment within 24 hours.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Secure payment failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Payment submission failed. Please try again.']);
        }
    }

    /**
     * Upload and optimize payment proof image
     */
    private function uploadAndOptimizePaymentProof($file): string
    {
        // Use centralized ImageService for image processing
        $result = $this->imageService->upload($file, [
            'directory' => 'payment-proofs',
            'max_width' => 1920,
            'max_height' => 1920,
            'quality' => 85,
            'convert_to_webp' => true,
            'generate_thumbnail' => true,
            'thumbnail_width' => 300,
            'thumbnail_height' => 200,
        ]);

        if (!$result->success) {
            // Fallback to simple storage if image processing fails
            Log::warning('Image processing failed, using simple storage', [
                'error' => $result->error,
            ]);

            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $file->storeAs('payment-proofs', $filename, 'public');
            return 'payment-proofs/' . $filename;
        }

        return $result->path;
    }
}
