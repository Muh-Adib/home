<?php

namespace App\Http\Controllers\Admin;

use App\Events\PaymentStatusChanged;
use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\BankMutation;
use App\Models\Booking;
use App\Models\Income;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\User;
use App\Services\PaymentGatewayService;
use App\Services\PaymentIncomeSyncService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Payment Controller
 *
 * This controller handles the payment process for admin bookings.
 * It includes methods for creating, storing, and managing payments.
 *
 * @author Muhammad Adib Aulia Hanif <adwk.project@gmail.com>
 */
class PaymentController extends Controller
{
    protected PaymentIncomeSyncService $incomeSyncService;

    protected PaymentGatewayService $gatewayService;

    public function __construct(
        PaymentIncomeSyncService $incomeSyncService,
        PaymentGatewayService $gatewayService
    ) {
        $this->incomeSyncService = $incomeSyncService;
        $this->gatewayService = $gatewayService;
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
     * Display payments index
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Payment::class);

        $query = Payment::query()
            ->with(['booking.property.bankAccount', 'paymentMethod', 'verifier', 'reverifier']);

        // Filter by status
        if ($request->filled('status')) {
            $query->where('payment_status', $request->input('status'));
        }

        // Filter by payment method
        if ($request->filled('payment_method')) {
            $query->where('payment_method_id', $request->input('payment_method'));
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('payment_number', 'like', "%{$search}%")
                    ->orWhere('reference_number', 'like', "%{$search}%")
                    ->orWhereHas('booking', function ($bq) use ($search) {
                        $bq->where('booking_number', 'like', "%{$search}%")
                            ->orWhere('guest_name', 'like', "%{$search}%");
                    });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'date');
        $sortDir = $request->input('sort_dir', 'desc');

        if ($sortBy === 'bank_account') {
            $query->leftJoin('payment_methods', 'payments.payment_method_id', '=', 'payment_methods.id')
                ->select('payments.*')
                ->orderBy('payment_methods.name', $sortDir);
        } else {
            $query->orderBy('payment_date', $sortDir)->orderBy('payments.created_at', $sortDir);
        }

        $payments = $query->paginate(20)->withQueryString();
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
            'month_amount' => Payment::whereMonth('payment_date', now()->month)->sum('amount'),
        ];

        return Inertia::render('Admin/Payments/Index', [
            'payments' => $payments,
            'paymentMethods' => $paymentMethods,
            'stats' => $stats,
            'filters' => [
                'search' => $request->input('search'),
                'status' => $request->input('status'),
                'payment_method' => $request->input('payment_method'),
                'sort_by' => $sortBy,
                'sort_dir' => $sortDir,
                'grouped' => $request->input('grouped', 'true'),
            ],
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
            if (is_numeric($request->input('booking_id'))) {
                $selectedBooking = Booking::with('property')->find($request->input('booking_id'));
            } else {
                $selectedBooking = Booking::with('property')->where('booking_number', $request->input('booking_id'))->first();
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
            'bankOptions' => self::BANK_OPTIONS,
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

            // Update booking payment status (centralized — sets dp_paid_amount & remaining_amount)
            $booking->updatePaymentStatus(save: true);

            // Auto-confirm booking if requested, verified and fully paid
            if ($validated['payment_status'] === 'verified') {
                $totalPaid = $booking->getTotalPaidAmount();
                if ($totalPaid >= $booking->total_amount && ($validated['auto_confirm'] ?? false) && $booking->booking_status === 'pending_verification') {
                    $booking->booking_status = 'confirmed';
                    $booking->save();
                }
            }

            // Sinkronkan income saat verified
            if ($validated['payment_status'] === 'verified') {
                $this->incomeSyncService->syncOnVerified($payment);

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

            return back()->withErrors(['error' => 'Failed to create payment: '.$e->getMessage()]);
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
            $booking = Booking::with('property')->find($request->input('booking_id'));
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
            'bankAccounts' => BankAccount::all(),
            'users' => $users,
            'bankOptions' => self::BANK_OPTIONS,
        ]);
    }

    /**
     * Store payment for specific booking
     * Support 2 metode: iPaymu (gateway) dan Manual Transfer
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
        // dd($validated);

        try {
            // Check if amount is valid
            $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount) {
                return back()->withErrors(['amount' => 'Payment amount exceeds pending amount.']);
            }

            // Manual transfer flow
            DB::beginTransaction();

            $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);

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

            // Update booking payment status (centralized — sets dp_paid_amount & remaining_amount)
            $booking->updatePaymentStatus(save: true);

            // Auto-confirm booking if requested, verified and fully paid
            if ($validated['payment_status'] === 'verified') {
                $totalPaid = $booking->getTotalPaidAmount();
                if ($totalPaid >= $booking->total_amount && ($validated['auto_confirm'] ?? false) && $booking->booking_status === 'pending_verification') {
                    $booking->booking_status = 'confirmed';
                    $booking->save();
                }
            }

            // Sinkronkan income saat verified
            if ($validated['payment_status'] === 'verified') {
                $this->incomeSyncService->syncOnVerified($payment);

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
            DB::rollBack();
            Log::error('Failed to create payment', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return back()->withErrors(['error' => 'Failed to create payment: '.$e->getMessage()]);
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

            // Update booking payment status (centralized — sets dp_paid_amount & remaining_amount)
            $booking->updatePaymentStatus(save: true);

            // Sinkronkan income jika payment verified
            if ($validated['payment_status'] === 'verified') {
                $this->incomeSyncService->syncOnVerified($payment);
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

            return back()->withErrors(['error' => 'Failed to create additional payment: '.$e->getMessage()]);
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

            // Update booking payment status (centralized — sets dp_paid_amount & remaining_amount)
            $booking->updatePaymentStatus(save: true);

            // Auto-confirm booking if requested, verified and fully paid
            if ($validated['payment_status'] === 'verified') {
                $totalPaid = $booking->getTotalPaidAmount();
                if ($totalPaid >= $booking->total_amount && ($validated['auto_confirm'] ?? false) && $booking->booking_status === 'pending_verification') {
                    $booking->booking_status = 'confirmed';
                    $booking->save();
                }
            }

            // Sinkronkan income saat verified
            if ($validated['payment_status'] === 'verified') {
                $this->incomeSyncService->syncOnVerified($payment);

                // Create workflow entry
                $booking->workflow()->create([
                    'step' => 'payment_verified',
                    'status' => 'completed',
                    'processed_by' => Auth::id(),
                    'processed_at' => now(),
                    'notes' => "Manual payment recorded: {$payment->payment_number} - ".$validated['admin_notes'],
                ]);
            }

            DB::commit();

            return redirect()->route('admin.payments.index')
                ->with('success', 'Payment recorded successfully.');

        } catch (\Exception $e) {
            DB::rollback();

            return back()->withErrors(['error' => 'Failed to record payment: '.$e->getMessage()]);
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
            'booking.guests',
            'paymentMethod',
            'processor',
            'verifier',
        ]);

        // Calculate booking payment summary
        $booking = $payment->booking;
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $booking->paid_amount = $paidAmount;
        $booking->remaining_amount = $booking->total_amount - $paidAmount;

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
            'verifier',
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
     * Update the payment (supports both PUT for full update and PATCH for partial update)
     */
    public function update(Request $request, Payment $payment): RedirectResponse
    {
        $this->authorize('update', $payment);

        // Determine if this is a full update (PUT) or partial update (PATCH)
        $isFullUpdate = $request->isMethod('PUT');

        // Validation rules - make required fields conditional for PATCH
        $rules = [
            'payment_method_id' => [$isFullUpdate ? 'required' : 'nullable', 'exists:payment_methods,id'],
            'amount' => [$isFullUpdate ? 'required' : 'nullable', 'numeric', 'min:0'],
            'payment_type' => [$isFullUpdate ? 'required' : 'nullable', 'in:dp,remaining,full,refund,penalty'],
            'payment_status' => [$isFullUpdate ? 'required' : 'nullable', 'in:pending,verified,failed,cancelled'],
            'payment_date' => [$isFullUpdate ? 'required' : 'nullable', 'date'],
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
        ];

        $validated = $request->validate($rules);

        DB::beginTransaction();
        try {
            $booking = $payment->booking;

            // Check if amount is valid (excluding current payment from calculation) - only if amount is being updated
            if (isset($validated['amount'])) {
                // cek apakah ada payment lainnya
                $paidAmount = $booking->payments()
                    ->where('payment_status', 'verified')
                    ->where('id', '!=', $payment->id)
                    ->sum('amount');
                $pendingAmount = $booking->total_amount - $paidAmount;

                if ($validated['amount'] > $pendingAmount) {
                    DB::rollBack();

                    return back()->withErrors(['amount' => 'Payment amount exceeds pending amount.']);
                }
            }

            // Handle file upload
            $attachmentPath = $payment->attachment_path;
            if ($request->hasFile('attachment')) {
                // Delete old attachment if exists
                if ($payment->attachment_path && Storage::disk('public')->exists($payment->attachment_path)) {
                    Storage::disk('public')->delete($payment->attachment_path);
                }
                $attachmentPath = $request->file('attachment')->store('payments/attachments', 'public');
            } elseif ($request->has('keep_existing_attachment') && ! $validated['keep_existing_attachment']) {
                // Remove attachment if not keeping existing
                if ($payment->attachment_path && Storage::disk('public')->exists($payment->attachment_path)) {
                    Storage::disk('public')->delete($payment->attachment_path);
                }
                $attachmentPath = null;
            }

            // Store old status for comparison
            $oldStatus = $payment->payment_status;

            // Get payment method if provided
            $paymentMethod = null;
            if (isset($validated['payment_method_id'])) {
                $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);
            } else {
                $paymentMethod = $payment->paymentMethod;
            }

            // Prepare update data - only include fields that are provided (for PATCH)
            $updateData = [];

            if (isset($validated['payment_method_id'])) {
                $updateData['payment_method_id'] = $validated['payment_method_id'];
                $updateData['payment_method'] = $paymentMethod->type;
            }
            if (isset($validated['amount'])) {
                $updateData['amount'] = $validated['amount'];
            }
            if (isset($validated['payment_type'])) {
                $updateData['payment_type'] = $validated['payment_type'];
            }
            if (isset($validated['payment_status'])) {
                $updateData['payment_status'] = $validated['payment_status'];
            }
            if (isset($validated['payment_date'])) {
                $updateData['payment_date'] = $validated['payment_date'];
            }
            if (isset($validated['due_date'])) {
                $updateData['due_date'] = $validated['due_date'];
            } elseif (array_key_exists('due_date', $validated) && $validated['due_date'] === null) {
                $updateData['due_date'] = null;
            }
            if (isset($validated['reference_number'])) {
                $updateData['reference_number'] = $validated['reference_number'];
            }
            if (isset($validated['bank_name'])) {
                $updateData['bank_name'] = $validated['bank_name'] ?: ($paymentMethod ? $paymentMethod->bank_name : null);
            }
            if (isset($validated['account_number'])) {
                $updateData['account_number'] = $validated['account_number'];
            }
            if (isset($validated['account_name'])) {
                $updateData['account_name'] = $validated['account_name'];
            }
            if (isset($validated['verification_notes'])) {
                $updateData['verification_notes'] = $validated['verification_notes'];
            }
            if (isset($attachmentPath)) {
                $updateData['attachment_path'] = $attachmentPath;
            }
            if (isset($validated['processed_by'])) {
                $updateData['processed_by'] = $validated['processed_by'] ?: $payment->processed_by;
            }
            if (isset($validated['verified_by'])) {
                $updateData['verified_by'] = $validated['payment_status'] === 'verified'
                    ? ($validated['verified_by'] ?: Auth::id())
                    : null;
            }
            if (isset($validated['gateway_transaction_id'])) {
                $updateData['gateway_transaction_id'] = $validated['gateway_transaction_id'];
            }

            // Handle verified_at based on payment_status
            if (isset($validated['payment_status'])) {
                if ($validated['payment_status'] === 'verified' && ! $payment->verified_at) {
                    $updateData['verified_at'] = now();
                } elseif ($validated['payment_status'] !== 'verified') {
                    $updateData['verified_at'] = null;
                }
            }

            // Update payment record
            $payment->update($updateData);

            // Sync booking status and amounts (centralized — sets dp_paid_amount & remaining_amount)
            $booking->updatePaymentStatus(save: true);

            // Handle perubahan status payment
            $newStatus = $validated['payment_status'] ?? $oldStatus;
            if ($oldStatus !== $newStatus) {
                if ($newStatus === 'verified') {
                    // Sinkronkan income saat verified
                    $this->incomeSyncService->syncOnVerified($payment);

                    // Create workflow entry
                    $booking->workflow()->create([
                        'step' => 'payment_verified',
                        'status' => 'completed',
                        'processed_by' => Auth::id(),
                        'processed_at' => now(),
                        'notes' => "Payment updated and verified: {$payment->payment_number}",
                    ]);
                } elseif ($newStatus === 'refunded') {
                    // Status berubah menjadi refunded - hapus income
                    $this->incomeSyncService->syncOnRefunded($payment);
                } elseif (in_array($newStatus, ['pending', 'failed', 'cancelled'])) {
                    // Status berubah menjadi unverified - hapus income
                    $this->incomeSyncService->syncOnUnverified($payment);
                }
            }

            // Send notification if status changed
            if ($oldStatus !== $newStatus) {
                event(new PaymentStatusChanged($payment, Auth::user(), $oldStatus, $newStatus));
            }

            DB::commit();

            // Redirect based on context
            if ($booking) {
                return redirect()->route('admin.bookings.show', $booking->booking_number)
                    ->with('success', 'Payment updated successfully.');
            }

            return redirect()->back()
                ->with('success', 'Payment updated successfully.');

        } catch (\Exception $e) {
            DB::rollback();

            return back()->withErrors(['error' => 'Failed to update payment: '.$e->getMessage()]);
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
                'status' => 'cocok',
                'verification_notes' => $request->input('verification_notes'),
                'verified_by' => Auth::id(),
                'verified_at' => now(),
            ]);

            // Update booking payment status (centralized — sets dp_paid_amount & remaining_amount)
            $booking = $payment->booking;
            $booking->updatePaymentStatus(save: true);

            // Promote booking_status if still pending
            if ($booking->booking_status === 'pending_verification') {
                $booking->update(['booking_status' => 'confirmed']);
            }

            // Create workflow entry
            $booking->workflow()->create([
                'step' => 'payment_verified',
                'status' => 'completed',
                'processed_by' => Auth::id(),
                'processed_at' => now(),
                'notes' => "Payment verified: {$payment->payment_number}",
            ]);

            // Send notification for status change
            event(new PaymentStatusChanged($payment, Auth::user(), 'pending', 'verified'));

            // Sinkronkan income saat verified
            $this->incomeSyncService->syncOnVerified($payment);

            DB::commit();

            return redirect()->back()
                ->with('success', 'Payment verified successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('[PaymentController@verify] Error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return back()->withErrors(['error' => 'Failed to verify payment. Error: '.$e->getMessage()]);
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
                'status' => 'ditolak',
                'verification_notes' => $request->input('rejection_reason'),
                'verified_by' => Auth::id(),
                'verified_at' => now(),
            ]);

            // Hapus income jika payment direject (karena tidak verified)
            $this->incomeSyncService->syncOnUnverified($payment);

            // Create workflow entry
            $payment->booking->workflow()->create([
                'step' => 'payment_rejected',
                'status' => 'failed',
                'processed_by' => Auth::id(),
                'processed_at' => now(),
                'notes' => "Payment rejected: {$request->input('rejection_reason')}",
            ]);

            // Send notification for status change
            event(new PaymentStatusChanged($payment, Auth::user(), 'pending', 'failed'));

            DB::commit();

            return redirect()->back()
                ->with('success', 'Payment rejected successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('[PaymentController@reject] Error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return back()->withErrors(['error' => 'Failed to reject payment. Error: '.$e->getMessage()]);
        }
    }

    /**
     * Delete payment
     */
    public function destroy(Payment $payment): RedirectResponse
    {
        $this->authorize('delete', $payment);

        DB::beginTransaction();
        try {
            $booking = $payment->booking;
            $paymentNumber = $payment->payment_number;
            $oldStatus = $payment->payment_status;

            // Delete attachment if exists
            if ($payment->attachment_path && Storage::disk('public')->exists($payment->attachment_path)) {
                Storage::disk('public')->delete($payment->attachment_path);
            }

            // Hapus income jika payment sudah verified
            if ($oldStatus === 'verified') {
                $this->incomeSyncService->syncOnUnverified($payment);
            }

            // Delete payment
            $payment->delete();

            // Update booking payment status and amounts
            $totalPaid = $booking->getTotalPaidAmount();
            $booking->dp_paid_amount = $totalPaid;
            $booking->remaining_amount = max(0, $booking->total_amount - $totalPaid);
            $booking->updatePaymentStatus();
            $booking->save();

            // Create workflow entry
            $booking->workflow()->create([
                'step' => 'payment_deleted',
                'status' => 'completed',
                'processed_by' => Auth::id(),
                'processed_at' => now(),
                'notes' => "Payment deleted: {$paymentNumber}",
            ]);

            DB::commit();

            // Redirect based on context
            if ($booking) {
                return redirect()->route('admin.bookings.show', $booking->booking_number)
                    ->with('success', 'Payment deleted successfully.');
            }

            return redirect()->route('admin.payments.index')
                ->with('success', 'Payment deleted successfully.');

        } catch (\Exception $e) {
            DB::rollback();

            return back()->withErrors(['error' => 'Failed to delete payment: '.$e->getMessage()]);
        }
    }

    /**
     * Display payment reconciliation dashboard
     */
    public function reconciliation(Request $request): Response
    {
        $pendingPayments = Payment::where('status', 'menunggu')
            ->with(['booking.property'])
            ->orderByDesc('created_at')
            ->get();

        $unassignedMutations = BankMutation::where('status', 'baru')
            ->where('direction', 'kredit')
            ->with(['bankAccount'])
            ->orderByDesc('trx_at')
            ->get();

        // Map candidate matching mutations for each pending payment
        $pendingPayments = $pendingPayments->map(function ($payment) {
            $trxDate = Carbon::parse($payment->payment_date ?? $payment->created_at);
            $dateStart = $trxDate->copy()->subDays(1)->startOfDay();
            $dateEnd = $trxDate->copy()->addDays(14)->endOfDay();

            $candidates = BankMutation::where('status', 'baru')
                ->where('direction', 'kredit')
                ->where('amount', $payment->expected_amount)
                ->whereBetween('trx_at', [$dateStart, $dateEnd])
                ->get();

            $payment->candidates = $candidates;

            return $payment;
        });

        return Inertia::render('Admin/Payments/Reconciliation', [
            'pendingPayments' => $pendingPayments,
            'unassignedMutations' => $unassignedMutations,
        ]);
    }

    /**
     * Manually match a pending payment to a bank mutation
     */
    public function manualMatch(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'payment_id' => 'required|exists:payments,id',
            'bank_mutation_id' => 'required|exists:bank_mutations,id',
        ]);

        $payment = Payment::findOrFail($validated['payment_id']);
        $mutation = BankMutation::findOrFail($validated['bank_mutation_id']);

        try {
            DB::beginTransaction();

            $payment->update([
                'status' => 'cocok',
                'payment_status' => 'verified',
                'matched_mutation_id' => $mutation->id,
                'matched_at' => now(),
                'verified_at' => now(),
                'verified_by' => Auth::id(),
                'processed_by' => Auth::id(),
            ]);

            $mutation->update([
                'status' => 'cocok',
                'matched_payment_id' => $payment->id,
            ]);

            // Update booking payment totals/status
            $booking = $payment->booking;
            if ($booking) {
                $totalPaid = $booking->payments()->where('payment_status', 'verified')->sum('amount');
                $booking->update([
                    'dp_paid_amount' => $totalPaid,
                    'remaining_amount' => max(0, $booking->total_amount - $totalPaid),
                ]);

                if ($booking->remaining_amount <= 0) {
                    $booking->update([
                        'payment_status' => 'fully_paid',
                        'booking_status' => 'confirmed',
                    ]);
                } else {
                    $booking->update([
                        'payment_status' => 'dp_received',
                    ]);
                }
            }

            DB::commit();

            return redirect()->back()->with('success', 'Pembayaran berhasil dicocokkan secara manual.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Manual matching failed', ['error' => $e->getMessage()]);

            return redirect()->back()->withErrors(['error' => 'Gagal mencocokkan pembayaran: '.$e->getMessage()]);
        }
    }

    /**
     * Ignore/dismiss a bank mutation
     */
    public function ignoreMutation(Request $request, int $id): RedirectResponse
    {
        $mutation = BankMutation::findOrFail($id);
        $mutation->update(['status' => 'diabaikan']);

        return redirect()->back()->with('success', 'Mutasi bank berhasil diabaikan.');
    }

    /**
     * Authorize re-verification action
     */
    private function authorizeReverification(Payment $payment): void
    {
        $user = Auth::user();
        if (! $user) {
            abort(403, 'Unauthorized');
        }

        // Roles allowed: super_admin, finance, property_owner
        if ($user->role === 'super_admin' || $user->role === 'finance') {
            return;
        }

        if ($user->role === 'property_owner') {
            $ownerId = $payment->booking?->property?->owner_id;
            if ($ownerId && $ownerId === $user->id) {
                return;
            }
        }

        abort(403, 'Anda tidak memiliki hak akses untuk melakukan verifikasi ulang pada pembayaran ini.');
    }

    /**
     * Accept reverification of a payment (manual check confirmed correct)
     */
    public function reverifyAccept(Request $request, Payment $payment): RedirectResponse
    {
        $this->authorizeReverification($payment);

        $request->validate([
            'reverification_notes' => 'nullable|string|max:1000',
        ]);

        try {
            DB::beginTransaction();

            $payment->update([
                'reverification_status' => 'accepted',
                'reverified_by' => Auth::id(),
                'reverified_at' => now(),
                'reverification_notes' => $request->input('reverification_notes'),
            ]);

            // Create workflow entry for booking
            $booking = $payment->booking;
            if ($booking) {
                $booking->workflow()->create([
                    'step' => 'payment_verified_recheck',
                    'status' => 'completed',
                    'processed_by' => Auth::id(),
                    'processed_at' => now(),
                    'notes' => "Payment re-verified & accepted: {$payment->payment_number}. Notes: ".($request->input('reverification_notes') ?? '-'),
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Pembayaran berhasil diverifikasi ulang dan disetujui.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Reverification accept failed', ['error' => $e->getMessage()]);

            return redirect()->back()->withErrors(['error' => 'Gagal verifikasi ulang: '.$e->getMessage()]);
        }
    }

    /**
     * Reject reverification of a payment (manual check confirmed incorrect)
     */
    public function reverifyReject(Request $request, Payment $payment): RedirectResponse
    {
        $this->authorizeReverification($payment);

        $request->validate([
            'reverification_notes' => 'required|string|max:1000',
            'reverification_action' => 'required|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            $payment->update([
                'reverification_status' => 'rejected',
                'reverified_by' => Auth::id(),
                'reverified_at' => now(),
                'reverification_notes' => $request->input('reverification_notes'),
                'reverification_action' => $request->input('reverification_action'),
                // When rejected, mark the payment itself as failed/ditolak
                'payment_status' => 'failed',
                'status' => 'ditolak',
            ]);

            // Sync income as unverified (which deletes/reverts the associated income)
            $this->incomeSyncService->syncOnUnverified($payment);

            // Re-update booking amounts and statuses
            $booking = $payment->booking;
            if ($booking) {
                $totalPaid = $booking->getTotalPaidAmount();
                $booking->dp_paid_amount = $totalPaid;
                $booking->remaining_amount = max(0, $booking->total_amount - $totalPaid);
                $booking->updatePaymentStatus();
                $booking->save();

                // Create workflow entry for booking
                $booking->workflow()->create([
                    'step' => 'payment_rejected_recheck',
                    'status' => 'failed',
                    'processed_by' => Auth::id(),
                    'processed_at' => now(),
                    'notes' => "Payment re-verified & REJECTED: {$payment->payment_number}. Reason: {$request->input('reverification_notes')}. Follow-up Action: {$request->input('reverification_action')}",
                ]);

                // Send notification for status change
                event(new PaymentStatusChanged($payment, Auth::user(), 'verified', 'failed'));
            }

            DB::commit();

            return redirect()->back()->with('success', 'Pembayaran ditolak pada verifikasi ulang. Status pembayaran dan income telah diperbarui.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Reverification reject failed', ['error' => $e->getMessage()]);

            return redirect()->back()->withErrors(['error' => 'Gagal penolakan verifikasi ulang: '.$e->getMessage()]);
        }
    }
}
