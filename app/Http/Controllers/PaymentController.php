<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Booking;
use App\Models\PaymentMethod;
use App\Events\PaymentCreated;
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
     * Show payment form for guest (with authentication check)
     */
    public function create(Booking $booking): Response
    {
        // Check if user has permission to make payment for this booking
        $this->authorize('makePayment', $booking);

        // Calculate pending amount
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $pendingAmount = $booking->total_amount - $paidAmount;

        if ($pendingAmount <= 0) {
            return redirect()->route('my-bookings')
                ->with('info', 'This booking has been fully paid.');
        }

        // Get active payment methods
        $paymentMethods = PaymentMethod::active()->get();

        // Calculate nights
        $checkIn = \Carbon\Carbon::parse($booking->check_in_date);
        $checkOut = \Carbon\Carbon::parse($booking->check_out_date);
        $booking->nights = $checkIn->diffInDays($checkOut);

        return Inertia::render('Payment/Create', [
            'booking' => $booking->load('property'),
            'paymentMethods' => $paymentMethods,
            'pendingAmount' => $pendingAmount,
            'paidAmount' => $paidAmount,
            'bankOptions' => self::BANK_OPTIONS,
        ]);
    }

    /**
     * Store payment for guest
     */
    public function store(Request $request, Booking $booking): RedirectResponse
    {
        // Log request data untuk debugging
        Log::info('Payment submission started', [
            'booking_number' => $booking->booking_number,
            'user_id' => Auth::id(),
            'request_data' => $request->except(['payment_proof']),
            'has_file' => $request->hasFile('payment_proof')
        ]);

        try {
            // Check if user has permission to make payment for this booking
            $this->authorize('makePayment', $booking);
            Log::info('Authorization passed for makePayment');

            $validated = $request->validate([
                'payment_method_id' => 'required|exists:payment_methods,id',
                'amount' => 'required|numeric|min:1',
                'payment_proof' => 'required|image|mimes:jpeg,png,jpg|max:10240',
                'notes' => 'nullable|string|max:1000',
                'sender_account_name' => 'required|string|max:255',
                'sender_account_number' => 'required|string|max:100',
                'sender_bank_name' => 'required|string|max:255',
            ]);
            Log::info('Validation passed');

            // Check if amount is valid
            $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount) {
                Log::warning('Payment amount exceeds pending amount', [
                    'amount' => $validated['amount'],
                    'pending_amount' => $pendingAmount
                ]);
                return back()->withErrors([
                    'amount' => 'Payment amount exceeds pending amount.'
                ]);
            }

            DB::beginTransaction();
            Log::info('Database transaction started');

            // Get payment method
            $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);
            Log::info('Payment method found', ['method' => $paymentMethod->name]);

            // Determine payment type
            $paymentType = $paidAmount === 0 ? 'dp' : 'remaining';
            Log::info('Payment type determined', ['type' => $paymentType]);

            // Upload payment proof with optimization
            $paymentProofPath = $this->uploadAndOptimizePaymentProof($request->file('payment_proof'));
            Log::info('Payment proof uploaded', ['path' => $paymentProofPath]);

            // Create payment record
            $payment = $booking->payments()->create([
                'payment_method_id' => $paymentMethod->id,
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $validated['amount'],
                'payment_type' => $paymentType,
                'payment_method' => $paymentMethod->type,
                'payment_status' => 'pending',
                'payment_date' => now(),
                'attachment_path' => $paymentProofPath,
                'bank_name' => $paymentMethod->bank_name,
                'verification_notes' => $validated['notes'],
                'processed_by' => Auth::id(),
                'sender_account_name' => $validated['sender_account_name'],
                'sender_account_number' => $validated['sender_account_number'],
                'sender_bank_name' => $validated['sender_bank_name'],
            ]);
            Log::info('Payment record created', ['payment_number' => $payment->payment_number]);

            // Create workflow entry if workflow relationship exists
            if (method_exists($booking, 'workflow')) {
                $booking->workflow()->create([
                    'step' => 'payment_pending',
                    'status' => 'pending',
                    'processed_by' => Auth::id(),
                    'processed_at' => now(),
                    'notes' => "Payment submitted: {$payment->payment_number}",
                ]);
                Log::info('Workflow entry created');
            }

            DB::commit();
            Log::info('Transaction committed successfully');

            // Dispatch event
            event(new PaymentCreated($payment, Auth::user()));

            return redirect()->route('my-bookings')
                ->with('success', 'Payment proof submitted successfully. We will verify your payment within 1-2 business hours.');

        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            Log::error('Authorization failed', ['error' => $e->getMessage()]);
            return back()->withErrors([
                'error' => 'You are not authorized to make payment for this booking.'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed', ['errors' => $e->errors()]);
            return back()->withErrors($e->errors());
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Payment submission failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Delete uploaded file if payment creation failed
            if (isset($paymentProofPath)) {
                Storage::disk('public')->delete($paymentProofPath);
            }
            
            return back()->withErrors([
                'error' => 'Failed to submit payment: ' . $e->getMessage()
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
        // Generate unique filename
        $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
        $path = 'payment-proofs/' . $filename;
        
        // Store original file
        $file->storeAs('payment-proofs', $filename, 'public');
        
        // Create thumbnail for preview (optional)
        $this->createThumbnail($file, $filename);
        
        return $path;
    }

    /**
     * Create thumbnail for payment proof
     */
    private function createThumbnail($file, $filename): void
    {
        try {
            // Simple thumbnail creation without intervention image
            $thumbnailDir = storage_path('app/public/payment-proofs/thumbnails');
            if (!file_exists($thumbnailDir)) {
                mkdir($thumbnailDir, 0755, true);
            }
            
            // Copy original file as thumbnail for now
            // In production, you might want to use proper image resizing
            copy($file->getRealPath(), $thumbnailDir . '/' . $filename);
            
        } catch (\Exception $e) {
            // Log error but don't fail the upload
            Log::warning('Failed to create thumbnail: ' . $e->getMessage());
        }
    }
}
