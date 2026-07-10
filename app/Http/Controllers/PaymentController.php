<?php

namespace App\Http\Controllers;

use App\Events\PaymentCreated;
use App\Models\BankAccount;
use App\Models\BankMutation;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Services\ImageService;
use App\Services\MootaService;
use App\Services\PaymentGatewayService;
use App\Services\ReconciliationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
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
 * This controller handles the payment process for guest bookings.
 * It includes methods for creating, storing, and managing payments.
 *
 * @author Muhammad Adib Aulia Hanif <adwk.project@gmail.com>
 */
class PaymentController extends Controller
{
    protected PaymentGatewayService $gatewayService;

    protected ImageService $imageService;

    protected MootaService $mootaService;

    public function __construct(
        PaymentGatewayService $gatewayService,
        ImageService $imageService,
        MootaService $mootaService
    ) {
        $this->gatewayService = $gatewayService;
        $this->imageService = $imageService;
        $this->mootaService = $mootaService;
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
    public function create(Booking $booking): Response|RedirectResponse
    {
        // Check if user has permission to make payment for this booking
        if (Auth::check()) {
            $this->authorize('makePayment', $booking);
        }

        // Calculate pending amount
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $pendingAmount = $booking->total_amount - $paidAmount;

        if ($pendingAmount <= 0) {
            if (Auth::check()) {
                return redirect()->route('my-bookings')
                    ->with('info', 'This booking has been fully paid.');
            }
            // Guest tidak di-redirect agar bisa melihat status lunas di halaman ini
        }

        // Determine payment type
        $paymentType = $paidAmount === 0 ? 'dp' : 'remaining';

        // Calculate nights
        $checkIn = Carbon::parse($booking->check_in);
        $checkOut = Carbon::parse($booking->check_out);
        $nights = $checkIn->diffInDays($checkOut);

        // Get available payment methods (iPaymu dan methods yang aktif)
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
                    'account_number' => $method->account_number,
                    'account_name' => $method->account_name,
                    'bank_name' => $method->bank_name,
                    'instructions' => $method->instructions,
                ];
            });

        // Retrieve linked bank account details of the property
        $bankAccount = $booking->property->bankAccount;
        if (! $bankAccount) {
            // Fallback: find first bank account with active payment method for bank_transfer
            $bankAccount = BankAccount::whereHas('paymentMethod', fn ($q) => $q->where('type', 'bank_transfer')->where('is_active', true))->first();
        }

        // If property has a custom bank account, override matching bank transfer method details
        // (same logic as securePayment)
        if ($bankAccount) {
            $paymentMethods = $paymentMethods->map(function ($method) use ($bankAccount) {
                if ($method['type'] === 'bank_transfer' && $method['id'] === $bankAccount->payment_method_id) {
                    $method['account_number'] = $bankAccount->account_number;
                    $method['account_name'] = $bankAccount->account_holder;
                    $method['bank_name'] = $bankAccount->bank_name;
                }

                return $method;
            });

            // Only show the bank transfer method that matches the property's bank
            $paymentMethods = $paymentMethods->filter(function ($method) use ($bankAccount) {
                if ($method['type'] === 'bank_transfer') {
                    return $method['id'] === $bankAccount->payment_method_id;
                }

                return true;
            })->values();
        }

        // Allocate unique code
        if ($pendingAmount <= 0) {
            $uniqueCode = 0;
            $expectedAmount = 0;
        } else {
            $existingPayment = Payment::where('booking_id', $booking->id)
                ->where('status', 'menunggu')
                ->where('payment_type', $paymentType)
                ->first();

            if ($existingPayment) {
                $uniqueCode = $existingPayment->unique_code;
                $expectedAmount = $existingPayment->expected_amount;
            } else {
                $bankAccountId = $bankAccount ? $bankAccount->id : 1;
                $uniqueCode = ReconciliationService::generateUniqueCode($bankAccountId, $pendingAmount);
                $expectedAmount = $pendingAmount + $uniqueCode;
            }
        }

        return Inertia::render('Payment/Create', [
            'booking' => $booking->load(['property', 'payments' => function ($q) {
                $q->orderBy('created_at', 'desc');
            }]),
            'pendingAmount' => $pendingAmount,
            'paidAmount' => $paidAmount,
            'paymentType' => $paymentType,
            'nights' => $nights,
            'paymentMethods' => $paymentMethods,
            'bankAccount' => $bankAccount,
            'paymentInfo' => [
                'paidAmount' => $paidAmount,
                'dpAmount' => $booking->dp_amount ?? ($booking->total_amount * 0.5), // Fallback if not set
                'remainingAmount' => $booking->total_amount - $paidAmount - $expectedAmount,
                'requiredAmount' => $expectedAmount,
                'uniqueCode' => $uniqueCode,
                'paymentType' => $paymentType,
                'isDpComplete' => $paidAmount >= ($booking->dp_amount ?? ($booking->total_amount * 0.5)),
            ],
        ]);
    }

    public function store(Request $request, Booking $booking): RedirectResponse
    {
        // Check if user has permission to make payment for this booking
        if (Auth::check()) {
            $this->authorize('makePayment', $booking);
        }

        // Validate request — gunakan pendingAmount sebagai batas maksimal (bukan total_amount)
        $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
        $pendingAmount = max(0, (int) ($booking->total_amount - $paidAmount));

        $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|integer|min:1|max:'.$pendingAmount,
            'proof_of_payment' => 'required|file|mimes:jpg,jpeg,png,pdf|max:2048',
            'payment_notes' => 'nullable|string|max:500',
            'unique_code' => 'nullable|integer|min:0|max:999',
        ]);

        if ($pendingAmount <= 0) {
            return redirect()->route('payments.create', $booking->booking_number)
                ->with('info', 'Booking ini sudah lunas.');
        }

        try {
            DB::beginTransaction();

            // Get payment method
            $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);

            // Upload proof of payment
            $proofPath = $this->uploadAndOptimizePaymentProof($request->file('proof_of_payment'));

            // Calculate paid amount
            $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
            $dpAmount = $booking->dp_amount ?? ($booking->total_amount * 0.3);
            $paymentType = ($paidAmount >= $dpAmount) ? 'remaining' : 'dp';

            $bankAccount = $booking->property->bankAccount;
            $bankAccountId = $bankAccount ? $bankAccount->id : (BankAccount::first()->id ?? 1);

            $uniqueCode = $request->input('unique_code');
            if (! $uniqueCode) {
                $uniqueCode = ReconciliationService::generateUniqueCode($bankAccountId, $request->amount);
            }
            $expectedAmount = $request->amount + $uniqueCode;

            // Create payment record
            $payment = Payment::create([
                'booking_id' => $booking->id,
                'payment_number' => Payment::generatePaymentNumber(),
                'payment_method_id' => $request->payment_method_id,
                'amount' => $expectedAmount,
                'payment_type' => $paymentType,
                'payment_method' => $paymentMethod->type,
                'payment_status' => 'pending',
                'status' => 'menunggu', // set status to menunggu for reconciliation
                'unique_code' => $uniqueCode,
                'expected_amount' => $expectedAmount,
                'attachment_path' => $proofPath,
                'verification_notes' => $request->payment_notes,
                'payment_date' => now(),
                'processed_by' => null, // Guest payment, no processor
            ]);

            // Update booking payment status
            $booking->updatePaymentStatus();

            // Create workflow entry for payment submitted
            if (method_exists($booking, 'workflow')) {
                $booking->workflow()->create([
                    'step' => 'payment_pending',
                    'status' => 'completed',
                    'processed_by' => null, // Guest/System
                    'processed_at' => now(),
                    'notes' => 'Bukti pembayaran Rp '.number_format($expectedAmount, 0, ',', '.').' diunggah oleh tamu untuk metode transfer bank (Menunggu verifikasi).',
                ]);
            }

            // Trigger payment created event
            event(new PaymentCreated($payment, Auth::user()));

            DB::commit();

            if (! Auth::check()) {
                return redirect()->route('payments.create', $booking->booking_number)
                    ->with('success', 'Pembayaran berhasil dikirim. Kami akan memverifikasi pembayaran Anda secara otomatis.');
            }

            return redirect()->route('my-bookings')
                ->with('success', 'Pembayaran berhasil dikirim. Kami akan memverifikasi pembayaran Anda secara otomatis.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Guest manual payment store failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Gagal mengirim pembayaran. Silakan coba lagi.']);
        }
    }

    /**
     * Cancel pending direct payment so guest can select a new method
     */
    public function cancelPending(Booking $booking): RedirectResponse
    {
        $booking->payments()
            ->where('payment_status', 'pending')
            ->update(['payment_status' => 'failed']); // Set ke failed/expired agar dianggap tidak aktif

        return redirect()->route('payments.create', $booking->booking_number)
            ->with('info', 'Metode pembayaran dibatalkan. Silakan pilih metode pembayaran baru.');
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
            $query->where('payment_status', $request->input('status'));
        }

        // Filter by type
        if ($request->filled('type')) {
            $query->where('payment_type', $request->input('type'));
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');
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
                'search' => $request->input('search'),
                'status' => $request->input('status'),
                'type' => $request->input('type'),
            ],
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
        if (! $booking->isPaymentTokenValid($token)) {
            return redirect()->route('my-bookings')
                ->with('error', 'Invalid or expired payment link.');
        }

        // Update expiry time to maximum 2 hours from now when link is opened
        // This ensures countdown is always max 2 hours from when user opens the link
        $twoHoursFromNow = now()->addHours(2);
        if (! $booking->payment_token_expires_at || $booking->payment_token_expires_at->gt($twoHoursFromNow)) {
            $booking->update([
                'payment_token_expires_at' => $twoHoursFromNow,
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
            if (Auth::check()) {
                return redirect()->route('my-bookings')
                    ->with('info', 'This booking has been fully paid.');
            }

            return redirect()->route('payments.create', $booking->booking_number);
        }

        // Retrieve linked bank account details
        $bankAccount = $booking->property->bankAccount;
        if (! $bankAccount) {
            $bankAccount = BankAccount::first();
        }

        // Get active payment methods
        $paymentMethods = PaymentMethod::active()->get();

        // If property has a custom bank account, override matching bank transfer method details
        if ($bankAccount) {
            $paymentMethods = $paymentMethods->map(function ($method) use ($bankAccount) {
                if ($method->type === 'bank_transfer') {
                    // Match exactly using payment_method_id
                    if ($method->id === $bankAccount->payment_method_id) {
                        $method->account_number = $bankAccount->account_number;
                        $method->account_name = $bankAccount->account_holder;
                        $method->bank_name = $bankAccount->bank_name;
                    }
                }

                return $method;
            });

            // Also filter bank transfer methods to only show the one matching the property's bank
            $paymentMethods = $paymentMethods->filter(function ($method) use ($bankAccount) {
                if ($method->type === 'bank_transfer') {
                    return $method->id === $bankAccount->payment_method_id;
                }

                return true;
            })->values();
        }

        // Allocate unique code
        $existingPayment = Payment::where('booking_id', $booking->id)
            ->where('status', 'menunggu')
            ->where('payment_type', $paymentType)
            ->first();

        if ($existingPayment) {
            $uniqueCode = $existingPayment->unique_code;
            $expectedAmount = $existingPayment->expected_amount;
        } else {
            $bankAccountId = $bankAccount ? $bankAccount->id : 1;
            $uniqueCode = ReconciliationService::generateUniqueCode($bankAccountId, $requiredAmount);
            $expectedAmount = $requiredAmount + $uniqueCode;
        }

        // Calculate nights
        $checkIn = Carbon::parse($booking->check_in);
        $checkOut = Carbon::parse($booking->check_out);
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
                'payments' => $booking->payments()->orderBy('created_at', 'desc')->get(),
            ],
            'paymentMethods' => $paymentMethods,
            'bankAccount' => $bankAccount,
            'paymentInfo' => [
                'paidAmount' => $paidAmount,
                'dpAmount' => $dpAmount,
                'remainingAmount' => $remainingAmount - $expectedAmount,
                'requiredAmount' => $expectedAmount,
                'paymentType' => $paymentType,
                'isDpComplete' => $paidAmount >= $dpAmount,
                'uniqueCode' => $uniqueCode,
                'expectedAmount' => $expectedAmount,
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
        if (! $booking->isPaymentTokenValid($token)) {
            return redirect()->route('my-bookings')
                ->with('error', 'Invalid or expired payment link.');
        }

        // Validate request
        $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1|max:'.$booking->total_amount,
            'proof_of_payment' => 'required|file|mimes:jpg,jpeg,png,pdf|max:2048',
            'payment_notes' => 'nullable|string|max:500',
            'unique_code' => 'nullable|integer',
        ]);

        try {
            DB::beginTransaction();

            // Get payment method
            $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);

            // Upload proof of payment
            $proofPath = $this->uploadAndOptimizePaymentProof($request->file('proof_of_payment'));

            // Calculate paid amount
            $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
            $dpAmount = $booking->dp_amount ?? ($booking->total_amount * 0.3);
            $paymentType = ($paidAmount >= $dpAmount) ? 'remaining' : 'dp';

            $bankAccount = $booking->property->bankAccount;
            $bankAccountId = $bankAccount ? $bankAccount->id : (BankAccount::first()->id ?? 1);

            $uniqueCode = $request->input('unique_code');
            if (! $uniqueCode) {
                $uniqueCode = ReconciliationService::generateUniqueCode($bankAccountId, $request->amount);
            }
            $expectedAmount = $request->amount + $uniqueCode;

            // Create payment record
            $payment = Payment::create([
                'booking_id' => $booking->id,
                'payment_number' => Payment::generatePaymentNumber(),
                'payment_method_id' => $request->payment_method_id,
                'amount' => $expectedAmount,
                'payment_type' => $paymentType,
                'payment_method' => $paymentMethod->type,
                'payment_status' => 'pending',
                'status' => 'menunggu', // set status to menunggu for reconciliation
                'unique_code' => $uniqueCode,
                'expected_amount' => $expectedAmount,
                'attachment_path' => $proofPath,
                'verification_notes' => $request->payment_notes,
                'payment_date' => now(),
                'processed_by' => null, // Guest payment, no processor
            ]);

            // Update booking payment status
            $booking->updatePaymentStatus();

            // Trigger payment created event
            event(new PaymentCreated($payment, Auth::user()));

            DB::commit();

            if (! Auth::check()) {
                return redirect()->route('booking.secure-payment', [$booking->booking_number, $token])
                    ->with('success', 'Pembayaran berhasil dikirim. Kami akan memverifikasi pembayaran Anda secara otomatis.');
            }

            return redirect()->route('my-bookings')
                ->with('success', 'Pembayaran berhasil dikirim. Kami akan memverifikasi pembayaran Anda secara otomatis.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Secure payment failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Gagal mengirim pembayaran. Silakan coba lagi.']);
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

        if (! $result->success) {
            // Fallback to simple storage if image processing fails
            Log::warning('Image processing failed, using simple storage', [
                'error' => $result->error,
            ]);

            $filename = time().'_'.uniqid().'.'.$file->getClientOriginalExtension();
            $file->storeAs('payment-proofs', $filename, 'public');

            return 'payment-proofs/'.$filename;
        }

        return $result->path;
    }

    /**
     * Handle incoming webhooks from Moota API v2
     */
    public function mootaWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('Signature') ?? $request->header('signature');

        if (empty($signature)) {
            Log::warning('[Moota Webhook] Missing Signature header.');

            return response()->json(['message' => 'Missing Signature header'], 400);
        }

        // Verify signature
        if (! $this->mootaService->verifySignature($payload, $signature)) {
            Log::warning('[Moota Webhook] Signature verification failed.');

            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $mutations = json_decode($payload, true);
        if (! is_array($mutations)) {
            Log::warning('[Moota Webhook] Invalid payload format.');

            return response()->json(['message' => 'Invalid payload format'], 400);
        }

        Log::info('[Moota Webhook] Webhook received. Processing '.count($mutations).' mutations.');

        $processedCount = 0;

        foreach ($mutations as $mut) {
            // Only process incoming transfers (Credits)
            if (($mut['type'] ?? '') !== 'CR') {
                continue;
            }

            $accountNumber = $mut['account_number'] ?? null;
            $amount = (int) ($mut['amount'] ?? 0);
            $description = $mut['description'] ?? '';
            $trxAt = $mut['date'] ?? now();
            $mutationId = $mut['mutation_id'] ?? null;

            // Ambil semua data pengirim yang tersedia dari payload Moota
            $senderName = $mut['sender_name']
                ?? $mut['description'] // Moota v2 sering menyertakan nama pengirim di description
                ?? null;

            if (! $accountNumber || ! $mutationId) {
                continue;
            }

            // Find the BankAccount matching the account number
            $bankAccount = BankAccount::where('account_number', $accountNumber)->first();
            if (! $bankAccount) {
                Log::warning("[Moota Webhook] BankAccount not found for account number: {$accountNumber}", [
                    'mutation_id' => $mutationId,
                    'amount' => $amount,
                    'description' => $description,
                ]);

                continue;
            }

            // Prevent duplicate processing
            $exists = BankMutation::where('external_ref', $mutationId)->exists();
            if ($exists) {
                Log::debug("[Moota Webhook] Mutation already processed: {$mutationId}");

                continue;
            }

            // Create mutation record with all available data from Moota
            $mutation = BankMutation::create([
                'bank_account_id' => $bankAccount->id,
                'trx_at' => Carbon::parse($trxAt)->setTimezone(config('app.timezone', 'Asia/Jakarta')),
                'amount' => $amount,
                'direction' => 'kredit',
                'description' => $description,
                'sender_name' => $senderName,
                'external_ref' => $mutationId,
                'source' => 'moota',
                'status' => 'baru',
                'imported_at' => now(),
            ]);

            // Attempt automatic reconciliation
            ReconciliationService::match($mutation);
            $processedCount++;
        }

        return response()->json([
            'success' => true,
            'message' => 'Processed '.$processedCount.' credit mutations.',
        ]);
    }
}
