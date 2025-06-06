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
use Illuminate\Support\Facades\Storage;

class PaymentController extends Controller
{
    /**
     * Display payment form for booking
     */
    public function create(Booking $booking): Response
    {
        // Check if booking can receive payment
        if (!in_array($booking->booking_status, ['pending_verification', 'confirmed'])) {
            abort(403, 'Payment not allowed for this booking status.');
        }

        $booking->load(['property']);
        $paymentMethods = PaymentMethod::active()->ordered()->get();

        // Calculate pending amount
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $pendingAmount = $booking->total_amount - $paidAmount;

        return Inertia::render('Payment/Create', [
            'booking' => $booking,
            'paymentMethods' => $paymentMethods,
            'pendingAmount' => $pendingAmount,
            'paidAmount' => $paidAmount,
        ]);
    }

    /**
     * Store payment
     */
    public function store(Request $request, Booking $booking): RedirectResponse
    {
        $validated = $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1',
            'payment_type' => 'required|in:dp,full_payment,remaining_payment',
            'bank_account_name' => 'required|string|max:255',
            'bank_account_number' => 'required|string|max:50',
            'transfer_date' => 'required|date|before_or_equal:today',
            'payment_proof' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        // Check if amount is valid
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $pendingAmount = $booking->total_amount - $paidAmount;

        if ($validated['amount'] > $pendingAmount) {
            return back()->withErrors(['amount' => 'Payment amount exceeds pending amount.']);
        }

        DB::beginTransaction();
        try {
            // Upload payment proof
            $proofPath = $request->file('payment_proof')->store('payment-proofs', 'public');

            // Create payment record
            $payment = $booking->payments()->create([
                'payment_method_id' => $validated['payment_method_id'],
                'payment_number' => 'PAY' . date('Ymd') . str_pad(Payment::count() + 1, 4, '0', STR_PAD_LEFT),
                'amount' => $validated['amount'],
                'payment_type' => $validated['payment_type'],
                'payment_status' => 'pending',
                'payment_date' => $validated['transfer_date'],
                'payment_proof' => $proofPath,
                'bank_account_name' => $validated['bank_account_name'],
                'bank_account_number' => $validated['bank_account_number'],
            ]);

            // Update booking payment status
            if ($validated['payment_type'] === 'dp') {
                $booking->update(['payment_status' => 'dp_received']);
            } elseif ($validated['amount'] + $paidAmount >= $booking->total_amount) {
                $booking->update(['payment_status' => 'fully_paid']);
            }

            // Create workflow entry
            $booking->workflow()->create([
                'step' => 'payment_submitted',
                'status' => 'completed',
                'processed_at' => now(),
                'notes' => "Payment submitted: Rp " . number_format($validated['amount']),
            ]);

            DB::commit();

            return redirect()->route('payment.success', $payment)
                ->with('success', 'Payment submitted successfully. It will be verified by our staff.');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to submit payment. Please try again.']);
        }
    }

    /**
     * Show payment success page
     */
    public function success(Payment $payment): Response
    {
        $payment->load(['booking.property', 'payment_method']);

        return Inertia::render('Payment/Success', [
            'payment' => $payment,
        ]);
    }

    /**
     * Admin payments index
     */
    public function admin_index(Request $request): Response
    {
        $this->authorize('viewAny', Payment::class);
        
        $query = Payment::query()
            ->with(['booking.property', 'payment_method', 'verifier']);

        // Filter by status
        if ($request->filled('status')) {
            $query->where('payment_status', $request->get('status'));
        }

        // Filter by payment method
        if ($request->filled('payment_method')) {
            $query->where('payment_method_id', $request->get('payment_method'));
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('payment_number', 'like', "%{$search}%")
                  ->orWhere('bank_account_name', 'like', "%{$search}%")
                  ->orWhereHas('booking', function ($bq) use ($search) {
                      $bq->where('booking_number', 'like', "%{$search}%")
                         ->orWhere('guest_name', 'like', "%{$search}%");
                  });
            });
        }

        // Date filter
        if ($request->filled('date_from')) {
            $query->whereDate('payment_date', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('payment_date', '<=', $request->get('date_to'));
        }

        $payments = $query->latest()->paginate(20);
        $paymentMethods = PaymentMethod::active()->get();

        // Statistics
        $stats = [
            'pending' => Payment::where('payment_status', 'pending')->count(),
            'verified' => Payment::where('payment_status', 'verified')->count(),
            'today_amount' => Payment::where('payment_status', 'verified')
                                   ->whereDate('verified_at', today())
                                   ->sum('amount'),
            'month_amount' => Payment::where('payment_status', 'verified')
                                   ->whereMonth('verified_at', now()->month)
                                   ->sum('amount'),
        ];

        return Inertia::render('Admin/Payments/Index', [
            'payments' => $payments,
            'paymentMethods' => $paymentMethods,
            'stats' => $stats,
            'filters' => [
                'status' => $request->get('status'),
                'payment_method' => $request->get('payment_method'),
                'search' => $request->get('search'),
                'date_from' => $request->get('date_from'),
                'date_to' => $request->get('date_to'),
            ],
        ]);
    }

    /**
     * Admin payment details
     */
    public function admin_show(Payment $payment): Response
    {
        $this->authorize('view', $payment);
        
        $payment->load([
            'booking.property',
            'booking.guests',
            'payment_method',
            'verifier'
        ]);

        return Inertia::render('Admin/Payments/Show', [
            'payment' => $payment,
        ]);
    }

    /**
     * Verify payment
     */
    public function verify(Request $request, Payment $payment): RedirectResponse
    {
        $this->authorize('verify', $payment);

        $request->validate([
            'verification_notes' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $payment->update([
                'payment_status' => 'verified',
                'verification_notes' => $request->get('verification_notes'),
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
            ]);

            // Update booking payment status
            $booking = $payment->booking;
            $totalPaid = $booking->payments()->where('payment_status', 'verified')->sum('amount');

            if ($totalPaid >= $booking->total_amount) {
                $booking->update(['payment_status' => 'fully_paid']);
            } elseif ($payment->payment_type === 'dp') {
                $booking->update(['payment_status' => 'dp_received']);
            }

            // Create workflow entry
            $booking->workflow()->create([
                'step' => 'payment_verified',
                'status' => 'completed',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => "Payment verified: {$payment->payment_number}",
            ]);

            DB::commit();

            return redirect()->back()
                ->with('success', 'Payment verified successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to verify payment.']);
        }
    }

    /**
     * Reject payment
     */
    public function reject(Request $request, Payment $payment): RedirectResponse
    {
        $this->authorize('verify', $payment);

        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $payment->update([
                'payment_status' => 'failed',
                'verification_notes' => $request->get('rejection_reason'),
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
            ]);

            // Create workflow entry
            $payment->booking->workflow()->create([
                'step' => 'payment_rejected',
                'status' => 'failed',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => "Payment rejected: {$request->get('rejection_reason')}",
            ]);

            DB::commit();

            return redirect()->back()
                ->with('success', 'Payment rejected successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to reject payment.']);
        }
    }
}
