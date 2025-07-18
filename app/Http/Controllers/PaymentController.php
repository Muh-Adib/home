<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Booking;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
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

        // Get guest count - fix field names
        $booking->guest_count = ($booking->guest_count_male ?? 0) + 
                               ($booking->guest_count_female ?? 0) + 
                               ($booking->guest_count_children ?? 0);

        return Inertia::render('Payment/Create', [
            'booking' => $booking->load('property'),
            'paymentMethods' => $paymentMethods,
            'pendingAmount' => $pendingAmount,
            'paidAmount' => $paidAmount,
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
                $q->where('guest_email', $user->email)
                  ->orWhere('user_id', $user->id);
            });

        // Filter by status
        if ($request->filled('status')) {
            $query->where('payment_status', $request->get('status'));
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

        return Inertia::render('Payment/MyPayments', [
            'payments' => $payments,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
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
     * Generate secure payment link for booking
     */
    public function generatePaymentLink(Booking $booking): string
    {
        $token = \Illuminate\Support\Str::random(32);
        
        // Store token in cache for 24 hours
        \Illuminate\Support\Facades\Cache::put(
            "payment_token_{$booking->booking_number}_{$token}",
            $booking->booking_number,
            now()->addHours(24)
        );

        return route('booking.secure-payment', [
            'booking' => $booking->booking_number,
            'token' => $token
        ]);
    }

    /**
     * Secure payment page with token verification
     */
    public function securePayment(Request $request, Booking $booking, string $token): Response
    {
        // Verify token
        $cachedBookingId = \Illuminate\Support\Facades\Cache::get("payment_token_{$booking->booking_number}_{$token}");

        if (!$cachedBookingId || $cachedBookingId != $booking->booking_number) {
            abort(404, 'Payment link is invalid or expired.');
        }

        // Calculate pending amount
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $pendingAmount = $booking->total_amount - $paidAmount;

        if ($pendingAmount <= 0) {
            return redirect()->route('my-bookings')
                ->with('info', 'This booking has been fully paid.');
        }

        // Get active payment methods
        $paymentMethods = PaymentMethod::active()->get();

        return Inertia::render('Payment/SecurePayment', [
            'booking' => $booking->load('property'),
            'paymentMethods' => $paymentMethods,
            'pendingAmount' => $pendingAmount,
            'paidAmount' => $paidAmount,
            'token' => $token,
        ]);
    }

    /**
     * Store secure payment
     */
    public function securePaymentStore(Request $request, Booking $booking, string $token): RedirectResponse
    {
        // Verify token
        $cachedBookingId = \Illuminate\Support\Facades\Cache::get("payment_token_{$booking->booking_number}_{$token}");
        
        if (!$cachedBookingId || $cachedBookingId != $booking->booking_number) {
            abort(404, 'Payment link is invalid or expired.');
        }

        // Same validation and processing as regular store method
        return $this->store($request, $booking);
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
