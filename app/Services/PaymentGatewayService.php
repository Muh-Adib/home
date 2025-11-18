<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Events\PaymentCreated;
use App\Events\PaymentStatusChanged;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PaymentGatewayService
{
    protected IpaymuService $ipaymuService;
    protected PaymentIncomeSyncService $incomeSyncService;

    public function __construct(
        IpaymuService $ipaymuService,
        PaymentIncomeSyncService $incomeSyncService
    ) {
        $this->ipaymuService = $ipaymuService;
        $this->incomeSyncService = $incomeSyncService;
    }

    /**
     * Initiate gateway payment untuk booking
     *
     * @param Booking $booking
     * @param float $amount Base amount (sebelum fee)
     * @param string $type 'dp' atau 'remaining'
     * @param array $options Additional options (payment_method_id, expiry_hours, etc)
     * @return Payment
     * @throws \Exception
     */
    public function initiateGatewayPayment(
        Booking $booking,
        float $amount,
        string $type = 'dp',
        array $options = []
    ): Payment {
        return DB::transaction(function () use ($booking, $amount, $type, $options) {
            // Get payment method (bisa iPaymu atau sub-method seperti bank_transfer, qris, etc)
            $paymentMethodId = $options['payment_method_id'] ?? null;
            $ipaymuMethod = PaymentMethod::where('code', 'ipaymu')->first();
            
            if (!$ipaymuMethod) {
                throw new \Exception('iPaymu payment method not found');
            }

            // Jika ada payment_method_id spesifik, gunakan itu untuk calculate fee
            $selectedMethod = $ipaymuMethod; // Default ke iPaymu
            if ($paymentMethodId) {
                $selectedMethod = PaymentMethod::find($paymentMethodId);
                if (!$selectedMethod || !$selectedMethod->isIpaymu()) {
                    // Jika bukan iPaymu method, tetap gunakan iPaymu sebagai gateway
                    $selectedMethod = $ipaymuMethod;
                }
            }

            // Calculate fee berdasarkan payment method yang dipilih
            $fee = $selectedMethod->calculateFee($amount);
            $totalAmount = $amount + $fee;

            // Validasi total amount (dengan fee)
            $paidAmount = $booking->payments()
                ->where('payment_status', 'verified')
                ->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($totalAmount > $pendingAmount) {
                throw new \Exception('Payment amount (including fee) exceeds pending amount');
            }

            // Get expiry hours dari options atau config
            $expiryHours = $options['expiry_hours'] ?? config('ipaymu.expiry_hours', 24);

            // Prepare payment data untuk iPaymu
            $paymentData = $this->preparePaymentData(
                $booking, 
                $totalAmount, // Send total amount dengan fee ke iPaymu
                $type, 
                array_merge($options, [
                    'expiry_hours' => $expiryHours,
                    'payment_method_id' => $selectedMethod->id,
                ])
            );

            // Create payment request ke iPaymu
            $ipaymuResponse = $this->ipaymuService->createPayment($paymentData);

            if (!$ipaymuResponse['success']) {
                throw new \Exception('Failed to create payment gateway request');
            }

            // Calculate expiry time
            $expiredAt = $ipaymuResponse['expired'] 
                ? Carbon::parse($ipaymuResponse['expired'])
                : Carbon::now()->addHours($expiryHours);

            // Create payment record
            $payment = $booking->payments()->create([
                'payment_method_id' => $selectedMethod->id,
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $totalAmount, // Total dengan fee
                'payment_type' => $type,
                'payment_method' => 'e_wallet',
                'payment_status' => 'pending',
                'payment_date' => now(),
                'gateway_transaction_id' => $ipaymuResponse['session_id'],
                'ipaymu_session_id' => $ipaymuResponse['session_id'],
                'ipaymu_payment_url' => $ipaymuResponse['payment_url'],
                'ipaymu_expired_at' => $expiredAt,
                'gateway_response' => array_merge(
                    $ipaymuResponse['raw_response'] ?? [],
                    [
                        'base_amount' => $amount,
                        'fee_amount' => $fee,
                        'total_amount' => $totalAmount,
                        'expiry_hours' => $expiryHours,
                    ]
                ),
                'description' => $options['description'] ?? "Payment via iPaymu for booking {$booking->booking_number}",
            ]);

            // Create workflow entry
            if (method_exists($booking, 'workflow')) {
                $booking->workflow()->create([
                    'step' => 'payment_pending',
                    'status' => 'in_progress',
                    'processed_by' => $options['user_id'] ?? null,
                    'processed_at' => now(),
                    'notes' => "Gateway payment initiated: {$payment->payment_number}",
                ]);
            }

            // Dispatch event
            if (isset($options['user'])) {
                event(new PaymentCreated($payment->load('booking.property'), $options['user']));
            }

            Log::info('Gateway payment initiated', [
                'payment_id' => $payment->id,
                'payment_number' => $payment->payment_number,
                'session_id' => $ipaymuResponse['session_id'],
                'booking_number' => $booking->booking_number,
            ]);

            return $payment;
        });
    }

    /**
     * Process callback dari payment gateway
     *
     * @param array $callbackData
     * @return Payment|null
     */
    public function processCallback(array $callbackData): ?Payment
    {
        $sessionId = $callbackData['session_id'] ?? $callbackData['sid'] ?? null;
        
        if (!$sessionId) {
            Log::warning('Payment gateway callback missing session_id', [
                'data' => $callbackData,
            ]);
            return null;
        }

        $payment = Payment::where('ipaymu_session_id', $sessionId)->first();

        if (!$payment) {
            Log::warning('Payment not found for callback', [
                'session_id' => $sessionId,
                'data' => $callbackData,
            ]);
            return null;
        }

        // Check payment status dari iPaymu
        try {
            $statusResponse = $this->ipaymuService->checkPaymentStatus($sessionId);
            
            if ($statusResponse['success']) {
                $this->updatePaymentFromGateway($payment, $statusResponse);
            }
        } catch (\Exception $e) {
            Log::error('Failed to check payment status in callback', [
                'payment_id' => $payment->id,
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
            ]);
        }

        return $payment;
    }

    /**
     * Process webhook dari payment gateway
     *
     * @param array $webhookData
     * @return Payment|null
     */
    public function processWebhook(array $webhookData): ?Payment
    {
        try {
            // Handle webhook melalui iPaymuService
            $webhookResponse = $this->ipaymuService->handleWebhook($webhookData);

            if (!$webhookResponse['success']) {
                return null;
            }

            // Find payment by reference_id atau transaction_id
            $payment = Payment::where(function ($query) use ($webhookResponse) {
                $query->where('ipaymu_session_id', $webhookResponse['transaction_id'])
                      ->orWhere('gateway_transaction_id', $webhookResponse['transaction_id'])
                      ->orWhere('payment_number', $webhookResponse['reference_id']);
            })->first();

            if (!$payment) {
                Log::warning('Payment not found for webhook', [
                    'webhook_data' => $webhookResponse,
                ]);
                return null;
            }

            // Update payment status
            $this->updatePaymentFromWebhook($payment, $webhookResponse);

            return $payment;

        } catch (\Exception $e) {
            Log::error('Failed to process webhook', [
                'error' => $e->getMessage(),
                'webhook_data' => $webhookData,
            ]);
            return null;
        }
    }

    /**
     * Generate payment link untuk booking
     *
     * @param Booking $booking
     * @param float $amount
     * @param string $type
     * @return array
     * @throws \Exception
     */
    public function generatePaymentLink(
        Booking $booking,
        float $amount,
        string $type = 'dp'
    ): array {
        $payment = $this->initiateGatewayPayment($booking, $amount, $type, [
            'description' => "Payment link for booking {$booking->booking_number}",
        ]);

        return [
            'success' => true,
            'payment' => $payment,
            'payment_url' => $payment->ipaymu_payment_url,
            'expired_at' => $payment->ipaymu_expired_at,
        ];
    }

    /**
     * Prepare payment data untuk iPaymu API
     *
     * @param Booking $booking
     * @param float $amount
     * @param string $type
     * @param array $options
     * @return array
     */
    protected function preparePaymentData(
        Booking $booking,
        float $amount,
        string $type,
        array $options
    ): array {
        $productName = "Booking {$booking->booking_number}";
        if ($type === 'dp') {
            $productName .= " - Down Payment";
        } else {
            $productName .= " - Remaining Payment";
        }

        // Get payment method untuk channel selection
        $paymentMethodId = $options['payment_method_id'] ?? null;
        $paymentChannel = 'all';
        $paymentMethod = 'all';

        if ($paymentMethodId) {
            $method = PaymentMethod::find($paymentMethodId);
            if ($method) {
                // Map payment method type ke iPaymu channel
                $paymentChannel = match($method->type) {
                    'bank_transfer' => 'bank_transfer',
                    'e_wallet' => 'qris', // iPaymu e-wallet biasanya via QRIS
                    default => 'all',
                };

                // Get channel dari ipaymu_settings jika ada
                if ($method->getIpaymuChannel()) {
                    $paymentChannel = $method->getIpaymuChannel();
                }
            }
        }

        // Override dengan options jika ada
        $paymentChannel = $options['payment_channel'] ?? $paymentChannel;
        $paymentMethod = $options['payment_method'] ?? $paymentMethod;

        // Calculate expiry time
        $expiryHours = $options['expiry_hours'] ?? config('ipaymu.expiry_hours', 24);
        $expiredDateTime = Carbon::now()->addHours($expiryHours)->format('Y-m-d H:i:s');

        return [
            'product' => [$productName],
            'qty' => [1],
            'price' => [$amount],
            'amount' => $amount,
            'reference_id' => $booking->booking_number . '-' . time(),
            'name' => $booking->guest_name ?? $options['customer_name'] ?? 'Guest',
            'phone' => $booking->guest_phone ?? $options['customer_phone'] ?? '',
            'email' => $booking->guest_email ?? $options['customer_email'] ?? '',
            'payment_method' => $paymentMethod,
            'payment_channel' => $paymentChannel,
            'expired' => $expiredDateTime,
            'return_url' => $options['return_url'] ?? route('payment-gateway.callback'),
            'cancel_url' => $options['cancel_url'] ?? route('payment-gateway.callback'),
            'notify_url' => $options['notify_url'] ?? route('payment-gateway.webhook'),
        ];
    }

    /**
     * Update payment dari gateway status response
     *
     * @param Payment $payment
     * @param array $statusResponse
     * @return void
     */
    protected function updatePaymentFromGateway(Payment $payment, array $statusResponse): void
    {
        $oldStatus = $payment->payment_status;
        $newStatus = $this->ipaymuService->mapStatus($statusResponse['status'] ?? 'pending');

        if ($oldStatus === $newStatus) {
            return; // No change
        }

        DB::transaction(function () use ($payment, $newStatus, $statusResponse, $oldStatus) {
            $payment->update([
                'payment_status' => $newStatus,
                'gateway_response' => array_merge(
                    $payment->gateway_response ?? [],
                    ['status_check' => $statusResponse['raw_response'] ?? []]
                ),
            ]);

            // Auto verify jika status berhasil
            if ($newStatus === 'verified') {
                $payment->update([
                    'verified_at' => now(),
                    'verified_by' => null, // Auto verified by gateway
                ]);

                // Update booking payment status
                $payment->booking->updatePaymentStatus();

                // Sync income
                $this->incomeSyncService->syncOnVerified($payment);
            }

            // Dispatch event jika status berubah
            if ($oldStatus !== $newStatus) {
                event(new PaymentStatusChanged($payment, $oldStatus, $newStatus));
            }
        });
    }

    /**
     * Update payment dari webhook
     *
     * @param Payment $payment
     * @param array $webhookResponse
     * @return void
     */
    protected function updatePaymentFromWebhook(Payment $payment, array $webhookResponse): void
    {
        $oldStatus = $payment->payment_status;
        $newStatus = $this->ipaymuService->mapStatus($webhookResponse['status'] ?? 'pending');

        DB::transaction(function () use ($payment, $newStatus, $webhookResponse, $oldStatus) {
            $updateData = [
                'payment_status' => $newStatus,
                'gateway_response' => array_merge(
                    $payment->gateway_response ?? [],
                    ['webhook' => $webhookResponse['raw_data'] ?? []]
                ),
            ];

            // Update transaction ID jika ada
            if (isset($webhookResponse['transaction_id'])) {
                $updateData['gateway_transaction_id'] = $webhookResponse['transaction_id'];
            }

            $payment->update($updateData);

            // Auto verify jika status berhasil
            if ($newStatus === 'verified') {
                $payment->update([
                    'verified_at' => now(),
                    'verified_by' => null, // Auto verified by gateway
                ]);

                // Update booking payment status
                $payment->booking->updatePaymentStatus();

                // Sync income
                $this->incomeSyncService->syncOnVerified($payment);
            }

            // Dispatch event jika status berubah
            if ($oldStatus !== $newStatus) {
                event(new PaymentStatusChanged($payment, $oldStatus, $newStatus));
            }

            Log::info('Payment updated from webhook', [
                'payment_id' => $payment->id,
                'payment_number' => $payment->payment_number,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ]);
        });
    }
}

