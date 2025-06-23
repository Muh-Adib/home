<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
use App\Models\User;

/**
 * Payment Controller
 * 
 * This controller handles the payment process for admin bookings.
 * It includes methods for creating, storing, and managing payments.
 * 
 * @package App\Http\Controllers\Admin
 * @author Muhammad Adib Aulia Hanif <adwk.project@gmail.com>
 */

class PaymentController extends Controller
{
    /**
     * Display payments index
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Payment::class);
        
        $query = Payment::query()
            ->with(['booking.property', 'paymentMethod', 'verifier']);

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
                  ->orWhere('reference_number', 'like', "%{$search}%")
                  ->orWhereHas('booking', function ($bq) use ($search) {
                      $bq->where('booking_number', 'like', "%{$search}%")
                         ->orWhere('guest_name', 'like', "%{$search}%");
                  });
            });
        }

        $payments = $query->latest()->paginate(20);
        $paymentMethods = PaymentMethod::active()->get();

        // Statistics
        $stats = [
            'pending_payments' => Payment::where('payment_status', 'pending')->count(),
            'verified_payments' => Payment::where('payment_status', 'verified')->count(),
            'failed_payments' => Payment::where('payment_status', 'failed')->count(),
            'cancelled_payments' => Payment::where('payment_status', 'cancelled')->count(),
            'refunded_payments' => Payment::where('payment_status', 'refunded')->count(),
            'total_payments' => Payment::count(),
            'today_amount' => Payment::where('payment_date', now()->toDateString())->sum('amount'),
            'month_amount' => Payment::where('payment_date', now()->startOfMonth()->toDateString())->sum('amount'),
        ];

        return Inertia::render('Admin/Payments/Index', [
            'payments' => $payments,
            'paymentMethods' => $paymentMethods,
            'stats' => $stats,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
                'payment_method' => $request->get('payment_method'),
            ]
        ]);
    }

    /**
     * Show the form for creating a new payment
     */
    public function create(Request $request): Response
    {
        $this->authorize('create', Payment::class);
        
        $selectedBooking = null;
        if ($request->filled('booking_id')) {
            // Support both booking_id and booking_number
            if (is_numeric($request->get('booking_id'))) {
                $selectedBooking = Booking::with('property')->find($request->get('booking_id'));
            } else {
                $selectedBooking = Booking::with('property')->where('booking_number', $request->get('booking_id'))->first();
            }
            
            if ($selectedBooking) {
                // Calculate remaining amount
                $paidAmount = $selectedBooking->payments()->where('payment_status', 'verified')->sum('amount');
                $selectedBooking->paid_amount = $paidAmount;
                $selectedBooking->remaining_amount = $selectedBooking->total_amount - $paidAmount;
            }
        }

        // Get bookings with pending payments for selection
        $bookings = Booking::with('property')
            ->whereIn('payment_status', ['dp_pending', 'dp_received'])
            ->where('booking_status', '!=', 'cancelled')
            ->latest()
            ->get()
            ->map(function ($booking) {
                $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
                $booking->paid_amount = $paidAmount;
                $booking->remaining_amount = $booking->total_amount - $paidAmount;
                return $booking;
            })
            ->filter(function ($booking) {
                return $booking->remaining_amount > 0;
            });

        $paymentMethods = PaymentMethod::active()->get();
        $users = User::whereIn('role', ['super_admin', 'property_manager', 'finance'])->get();

        return Inertia::render('Admin/Payments/Create', [
            'selectedBooking' => $selectedBooking,
            'bookings' => $bookings,
            'paymentMethods' => $paymentMethods,
            'users' => $users,
        ]);
    }

    /**
     * Store a newly created payment
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Payment::class);

        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1',
            'payment_type' => 'required|in:dp,remaining,full,refund,penalty',
            'payment_status' => 'required|in:pending,verified,failed,cancelled',
            'payment_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:payment_date',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'account_name' => 'nullable|string|max:255',
            'verification_notes' => 'nullable|string|max:1000',
            'attachment' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
            'processed_by' => 'nullable|exists:users,id',
            'verified_by' => 'nullable|exists:users,id',
            'gateway_transaction_id' => 'nullable|string|max:255',
            'auto_confirm' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            $booking = Booking::findOrFail($validated['booking_id']);
            $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);
            
            // Check if amount is valid
            $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount) {
                return back()->withErrors(['amount' => 'Payment amount exceeds pending amount.']);
            }

            // Handle file upload
            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $request->file('attachment')->store('payments/attachments', 'public');
            }

            // Create payment record
            $payment = $booking->payments()->create([
                'payment_method_id' => $validated['payment_method_id'],
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $validated['amount'],
                'payment_type' => $validated['payment_type'],
                'payment_method' => $paymentMethod->type,
                'payment_status' => $validated['payment_status'],
                'payment_date' => $validated['payment_date'],
                'due_date' => $validated['due_date'],
                'reference_number' => $validated['reference_number'],
                'bank_name' => $validated['bank_name'] ?: $paymentMethod->bank_name,
                'account_number' => $validated['account_number'],
                'account_name' => $validated['account_name'],
                'verification_notes' => $validated['verification_notes'],
                'attachment_path' => $attachmentPath,
                'processed_by' => $validated['processed_by'] ?: Auth::id(),
                'verified_by' => $validated['payment_status'] === 'verified' ? ($validated['verified_by'] ?: Auth::id()) : null,
                'verified_at' => $validated['payment_status'] === 'verified' ? now() : null,
                'gateway_transaction_id' => $validated['gateway_transaction_id'],
            ]);

            // Update booking payment status if verified
            if ($validated['payment_status'] === 'verified') {
                $totalPaid = $booking->payments()->where('payment_status', 'verified')->sum('amount');
                
                if ($totalPaid >= $booking->total_amount) {
                    $booking->update(['payment_status' => 'fully_paid']);
                    
                    // Auto-confirm booking if requested and fully paid
                    if ($validated['auto_confirm'] && $booking->booking_status === 'pending_verification') {
                        $booking->update(['booking_status' => 'confirmed']);
                    }
                } elseif ($validated['payment_type'] === 'dp') {
                    $booking->update(['payment_status' => 'dp_received']);
                }

                // Create workflow entry
                $booking->workflow()->create([
                    'step' => 'payment_verified',
                    'status' => 'completed',
                    'processed_by' => Auth::id(),
                    'processed_at' => now(),
                    'notes' => "Payment created and verified: {$payment->payment_number}",
                ]);
            }

            DB::commit();

            return redirect()->route('admin.payments.index')
                ->with('success', 'Payment created successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to create payment: ' . $e->getMessage()]);
        }
    }

    /**
     * Show manual payment entry form
     */
    public function manualCreate(Request $request): Response
    {
        $this->authorize('create', Payment::class);
        
        $booking = null;
        if ($request->filled('booking_id')) {
            $booking = Booking::with('property')->find($request->get('booking_id'));
            if ($booking) {
                // Calculate remaining amount
                $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
                $booking->paid_amount = $paidAmount;
                $booking->remaining_amount = $booking->total_amount - $paidAmount;
            }
        }

        // Get bookings with pending payments for selection
        $bookings = Booking::with('property')
            ->whereIn('payment_status', ['dp_pending', 'dp_received'])
            ->where('booking_status', '!=', 'cancelled')
            ->latest()
            ->get()
            ->map(function ($booking) {
                $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
                $booking->paid_amount = $paidAmount;
                $booking->remaining_amount = $booking->total_amount - $paidAmount;
                return $booking;
            })
            ->filter(function ($booking) {
                return $booking->remaining_amount > 0;
            });

        $paymentMethods = PaymentMethod::active()->get();

        return Inertia::render('Admin/Payments/ManualPayment', [
            'booking' => $booking,
            'bookings' => $bookings,
            'paymentMethods' => $paymentMethods,
        ]);
    }

    /**
     * Create payment for specific booking
     */
    public function createForBooking(Booking $booking): Response
    {
        $this->authorize('create', Payment::class);
        
        // Calculate remaining amount
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $booking->paid_amount = $paidAmount;
        $booking->remaining_amount = $booking->total_amount - $paidAmount;
        
        $paymentMethods = PaymentMethod::active()->get();
        $users = User::whereIn('role', ['super_admin', 'property_manager', 'finance'])->get();

        return Inertia::render('Admin/Payments/CreateForBooking', [
            'booking' => $booking->load('property', 'guests'),
            'paymentMethods' => $paymentMethods,
            'users' => $users,
        ]);
    }

    /**
     * Store payment for specific booking
     */
    public function storeForBooking(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('create', Payment::class);

        $validated = $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1',
            'payment_type' => 'required|in:dp,remaining,full,refund,penalty',
            'payment_status' => 'required|in:pending,verified',
            'payment_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:payment_date',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'account_name' => 'nullable|string|max:255',
            'verification_notes' => 'nullable|string|max:1000',
            'attachment' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
            'processed_by' => 'nullable|exists:users,id',
            'verified_by' => 'nullable|exists:users,id',
            'gateway_transaction_id' => 'nullable|string|max:255',
            'auto_confirm' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);
            
            // Check if amount is valid
            $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount) {
                return back()->withErrors(['amount' => 'Payment amount exceeds pending amount.']);
            }

            // Handle file upload
            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $request->file('attachment')->store('payments/attachments', 'public');
            }

            // Create payment record
            $payment = $booking->payments()->create([
                'payment_method_id' => $validated['payment_method_id'],
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $validated['amount'],
                'payment_type' => $validated['payment_type'],
                'payment_method' => $paymentMethod->type,
                'payment_status' => $validated['payment_status'],
                'payment_date' => $validated['payment_date'],
                'due_date' => $validated['due_date'],
                'reference_number' => $validated['reference_number'],
                'bank_name' => $validated['bank_name'] ?: $paymentMethod->bank_name,
                'account_number' => $validated['account_number'],
                'account_name' => $validated['account_name'],
                'verification_notes' => $validated['verification_notes'],
                'attachment_path' => $attachmentPath,
                'processed_by' => $validated['processed_by'] ?: Auth::id(),
                'verified_by' => $validated['payment_status'] === 'verified' ? ($validated['verified_by'] ?: Auth::id()) : null,
                'verified_at' => $validated['payment_status'] === 'verified' ? now() : null,
                'gateway_transaction_id' => $validated['gateway_transaction_id'],
            ]);

            // Update booking payment status if verified
            if ($validated['payment_status'] === 'verified') {
                $totalPaid = $booking->payments()->where('payment_status', 'verified')->sum('amount');
                
                if ($totalPaid >= $booking->total_amount) {
                    $booking->update(['payment_status' => 'fully_paid']);
                    
                    // Auto-confirm booking if requested and fully paid
                    if ($validated['auto_confirm'] && $booking->booking_status === 'pending_verification') {
                        $booking->update(['booking_status' => 'confirmed']);
                    }
                } elseif ($validated['payment_type'] === 'dp') {
                    $booking->update(['payment_status' => 'dp_received']);
                }

                // Create workflow entry
                $booking->workflow()->create([
                    'step' => 'payment_verified',
                    'status' => 'completed',
                    'processed_by' => Auth::id(),
                    'processed_at' => now(),
                    'notes' => "Payment created and verified: {$payment->payment_number}",
                ]);
            }

            DB::commit();

            return redirect()->route('admin.bookings.show', $booking->booking_number)
                ->with('success', 'Payment created successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to create payment: ' . $e->getMessage()]);
        }
    }

    /**
     * Create additional payment for specific booking (extra charges)
     */
    public function createAdditional(Booking $booking): Response
    {
        $this->authorize('create', Payment::class);
        
        // Calculate current payment status
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $booking->paid_amount = $paidAmount;
        $booking->remaining_amount = $booking->total_amount - $paidAmount;
        
        $paymentMethods = PaymentMethod::active()->get();
        $users = User::whereIn('role', ['super_admin', 'property_manager', 'finance'])->get();

        return Inertia::render('Admin/Payments/CreateAdditional', [
            'booking' => $booking->load('property', 'guests'),
            'paymentMethods' => $paymentMethods,
            'users' => $users,
        ]);
    }

    /**
     * Store additional payment for specific booking
     */
    public function storeAdditional(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('create', Payment::class);

        $validated = $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1',
            'payment_type' => 'required|in:penalty,additional,damage,cleaning,extra_service',
            'payment_status' => 'required|in:pending,verified',
            'payment_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:payment_date',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'account_name' => 'nullable|string|max:255',
            'verification_notes' => 'nullable|string|max:1000',
            'description' => 'required|string|max:500', // Description for additional charge
            'attachment' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
            'processed_by' => 'nullable|exists:users,id',
            'verified_by' => 'nullable|exists:users,id',
            'gateway_transaction_id' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);

            // Handle file upload
            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $request->file('attachment')->store('payments/attachments', 'public');
            }

            // Create additional payment record
            $payment = $booking->payments()->create([
                'payment_method_id' => $validated['payment_method_id'],
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $validated['amount'],
                'payment_type' => $validated['payment_type'],
                'payment_method' => $paymentMethod->type,
                'payment_status' => $validated['payment_status'],
                'payment_date' => $validated['payment_date'],
                'due_date' => $validated['due_date'],
                'reference_number' => $validated['reference_number'],
                'bank_name' => $validated['bank_name'] ?: $paymentMethod->bank_name,
                'account_number' => $validated['account_number'],
                'account_name' => $validated['account_name'],
                'verification_notes' => $validated['verification_notes'],
                'description' => $validated['description'],
                'attachment_path' => $attachmentPath,
                'processed_by' => $validated['processed_by'] ?: Auth::id(),
                'verified_by' => $validated['payment_status'] === 'verified' ? ($validated['verified_by'] ?: Auth::id()) : null,
                'verified_at' => $validated['payment_status'] === 'verified' ? now() : null,
                'gateway_transaction_id' => $validated['gateway_transaction_id'],
            ]);

            // Update booking total amount for additional charges
            if (in_array($validated['payment_type'], ['penalty', 'additional', 'damage', 'cleaning', 'extra_service'])) {
                $booking->increment('total_amount', $validated['amount']);
            }

            // Create workflow entry
            $booking->workflow()->create([
                'step' => 'additional_payment_created',
                'status' => 'completed',
                'processed_by' => Auth::id(),
                'processed_at' => now(),
                'notes' => "Additional payment created: {$payment->payment_number} - {$validated['description']}",
            ]);

            DB::commit();

            return redirect()->route('admin.bookings.show', $booking->booking_number)
                ->with('success', 'Additional payment created successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to create additional payment: ' . $e->getMessage()]);
        }
    }

    /**
     * Store manual payment
     */
    public function manualStore(Request $request): RedirectResponse
    {
        $this->authorize('create', Payment::class);

        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1',
            'payment_type' => 'required|in:dp,remaining,full,refund,penalty',
            'payment_status' => 'required|in:pending,verified',
            'payment_date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'account_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'admin_notes' => 'nullable|string|max:1000',
            'auto_confirm' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            $booking = Booking::findOrFail($validated['booking_id']);
            $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);
            
            // Check if amount is valid
            $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount) {
                return back()->withErrors(['amount' => 'Payment amount exceeds pending amount.']);
            }

            // Create payment record
            $payment = $booking->payments()->create([
                'payment_method_id' => $validated['payment_method_id'],
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $validated['amount'],
                'payment_type' => $validated['payment_type'],
                'payment_method' => $paymentMethod->type,
                'payment_status' => $validated['payment_status'],
                'payment_date' => $validated['payment_date'],
                'reference_number' => $validated['reference_number'],
                'bank_name' => $validated['bank_name'] ?: $paymentMethod->bank_name,
                'account_number' => $validated['account_number'],
                'account_name' => $validated['account_name'],
                'verification_notes' => $validated['notes'],
                'processed_by' => Auth::id(),
                'verified_by' => $validated['payment_status'] === 'verified' ? Auth::id() : null,
                'verified_at' => $validated['payment_status'] === 'verified' ? now() : null,
            ]);

            // Update booking payment status if verified
            if ($validated['payment_status'] === 'verified') {
                $totalPaid = $booking->payments()->where('payment_status', 'verified')->sum('amount');
                
                if ($totalPaid >= $booking->total_amount) {
                    $booking->update(['payment_status' => 'fully_paid']);
                    
                    // Auto-confirm booking if requested and fully paid
                    if ($validated['auto_confirm'] && $booking->booking_status === 'pending_verification') {
                        $booking->update(['booking_status' => 'confirmed']);
                    }
                } elseif ($validated['payment_type'] === 'dp') {
                    $booking->update(['payment_status' => 'dp_received']);
                }

                // Create workflow entry
                $booking->workflow()->create([
                    'step' => 'payment_verified',
                    'status' => 'completed',
                    'processed_by' => Auth::id(),
                    'processed_at' => now(),
                    'notes' => "Manual payment recorded: {$payment->payment_number} - " . $validated['admin_notes'],
                ]);
            }

            DB::commit();

            return redirect()->route('admin.payments.index')
                ->with('success', 'Payment recorded successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to record payment: ' . $e->getMessage()]);
        }
    }

    /**
     * Show payment details
     */
    public function show(Payment $payment): Response
    {
        $this->authorize('view', $payment);

        $payment->load([
            'booking.property',
            'booking.workflow',
            'paymentMethod',
            'processor',
            'verifier'
        ]);

        return Inertia::render('Admin/Payments/Show', [
            'payment' => $payment,
        ]);
    }

    /**
     * Show the form for editing the payment
     */
    public function edit(Payment $payment): Response
    {
        $this->authorize('update', $payment);

        $payment->load([
            'booking.property',
            'paymentMethod',
            'processor',
            'verifier'
        ]);

        $paymentMethods = PaymentMethod::active()->get();
        $users = User::whereIn('role', ['super_admin', 'property_manager', 'finance'])->get();

        return Inertia::render('Admin/Payments/Edit', [
            'payment' => $payment,
            'paymentMethods' => $paymentMethods,
            'users' => $users,
        ]);
    }

    /**
     * Update the payment
     */
    public function update(Request $request, Payment $payment): RedirectResponse
    {
        $this->authorize('update', $payment);

        $validated = $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1',
            'payment_type' => 'required|in:dp,remaining,full,refund,penalty',
            'payment_status' => 'required|in:pending,verified,failed,cancelled',
            'payment_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:payment_date',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'account_name' => 'nullable|string|max:255',
            'verification_notes' => 'nullable|string|max:1000',
            'attachment' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
            'processed_by' => 'nullable|exists:users,id',
            'verified_by' => 'nullable|exists:users,id',
            'gateway_transaction_id' => 'nullable|string|max:255',
            'keep_existing_attachment' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            $booking = $payment->booking;
            $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);
            
            // Check if amount is valid (excluding current payment from calculation)
            $paidAmount = $booking->payments()
                ->where('payment_status', 'verified')
                ->where('id', '!=', $payment->id)
                ->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount) {
                return back()->withErrors(['amount' => 'Payment amount exceeds pending amount.']);
            }

            // Handle file upload
            $attachmentPath = $payment->attachment_path;
            if ($request->hasFile('attachment')) {
                // Delete old attachment if exists
                if ($payment->attachment_path && Storage::disk('public')->exists($payment->attachment_path)) {
                    Storage::disk('public')->delete($payment->attachment_path);
                }
                $attachmentPath = $request->file('attachment')->store('payments/attachments', 'public');
            } elseif (!$validated['keep_existing_attachment']) {
                // Remove attachment if not keeping existing
                if ($payment->attachment_path && Storage::disk('public')->exists($payment->attachment_path)) {
                    Storage::disk('public')->delete($payment->attachment_path);
                }
                $attachmentPath = null;
            }

            // Store old status for comparison
            $oldStatus = $payment->payment_status;

            // Update payment record
            $payment->update([
                'payment_method_id' => $validated['payment_method_id'],
                'amount' => $validated['amount'],
                'payment_type' => $validated['payment_type'],
                'payment_method' => $paymentMethod->type,
                'payment_status' => $validated['payment_status'],
                'payment_date' => $validated['payment_date'],
                'due_date' => $validated['due_date'],
                'reference_number' => $validated['reference_number'],
                'bank_name' => $validated['bank_name'] ?: $paymentMethod->bank_name,
                'account_number' => $validated['account_number'],
                'account_name' => $validated['account_name'],
                'verification_notes' => $validated['verification_notes'],
                'attachment_path' => $attachmentPath,
                'processed_by' => $validated['processed_by'] ?: $payment->processed_by,
                'verified_by' => $validated['payment_status'] === 'verified' ? ($validated['verified_by'] ?: Auth::id()) : null,
                'verified_at' => $validated['payment_status'] === 'verified' ? ($payment->verified_at ?: now()) : null,
                'gateway_transaction_id' => $validated['gateway_transaction_id'],
            ]);

            // Update booking payment status if status changed to verified
            if ($oldStatus !== 'verified' && $validated['payment_status'] === 'verified') {
                $totalPaid = $booking->payments()->where('payment_status', 'verified')->sum('amount');
                
                if ($totalPaid >= $booking->total_amount) {
                    $booking->update(['payment_status' => 'fully_paid']);
                } elseif ($validated['payment_type'] === 'dp') {
                    $booking->update(['payment_status' => 'dp_received']);
                }

                // Create workflow entry
                $booking->workflow()->create([
                    'step' => 'payment_verified',
                    'status' => 'completed',
                    'processed_by' => Auth::id(),
                    'processed_at' => now(),
                    'notes' => "Payment updated and verified: {$payment->payment_number}",
                ]);
            }

            DB::commit();

            return redirect()->route('admin.payments.index')
                ->with('success', 'Payment updated successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to update payment: ' . $e->getMessage()]);
        }
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
                'verified_by' => Auth::id(),
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
                'processed_by' => Auth::id(),
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
                'verified_by' => Auth::id(),
                'verified_at' => now(),
            ]);

            // Create workflow entry
            $payment->booking->workflow()->create([
                'step' => 'payment_rejected',
                'status' => 'failed',
                'processed_by' => Auth::id(),
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