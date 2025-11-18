<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class IpaymuService
{
    protected string $apiKey;
    protected string $secretKey;
    protected string $mode;
    protected string $baseUrl;
    protected string $paymentUrl;

    public function __construct()
    {
        $this->apiKey = config('ipaymu.api_key');
        $this->secretKey = config('ipaymu.secret_key');
        $this->mode = config('ipaymu.mode', 'sandbox');
        
        $config = $this->mode === 'production' 
            ? config('ipaymu.production') 
            : config('ipaymu.sandbox');
            
        $this->baseUrl = $config['api_url'];
        $this->paymentUrl = $config['payment_url'];
    }

    /**
     * Create payment request ke iPaymu
     *
     * @param array $data Payment data
     * @return array
     * @throws \Exception
     */
    public function createPayment(array $data): array
    {
        if (config('ipaymu.log_requests')) {
            Log::channel(config('ipaymu.log_channel', 'daily'))->info('iPaymu Create Payment Request', [
                'mode' => $this->mode,
                'data' => $data,
            ]);
        }

        try {
            // Prepare request body
            $body = [
                'product' => $data['product'] ?? [],
                'qty' => $data['qty'] ?? [],
                'price' => $data['price'] ?? [],
                'amount' => $data['amount'],
                'returnUrl' => $data['return_url'] ?? config('ipaymu.return_url'),
                'cancelUrl' => $data['cancel_url'] ?? config('ipaymu.return_url'),
                'notifyUrl' => $data['notify_url'] ?? config('ipaymu.notify_url'),
                'referenceId' => $data['reference_id'],
                'name' => $data['name'] ?? '',
                'phone' => $data['phone'] ?? '',
                'email' => $data['email'] ?? '',
                'paymentMethod' => $data['payment_method'] ?? 'all', // all, bank, qris, va
                'paymentChannel' => $data['payment_channel'] ?? 'all', // all, bank_transfer, qris, va
                'expired' => $data['expired'] ?? null, // Expiry time in hours or datetime
            ];

            // Generate signature
            $signature = $this->generateSignature($body);

            // Make API request
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'va' => $this->apiKey,
                'signature' => $signature,
            ])->post($this->paymentUrl, $body);

            $responseData = $response->json();

            if (config('ipaymu.log_requests')) {
                Log::channel(config('ipaymu.log_channel', 'daily'))->info('iPaymu Create Payment Response', [
                    'status' => $response->status(),
                    'response' => $responseData,
                ]);
            }

            if (!$response->successful() || ($responseData['Status'] ?? null) !== 200) {
                throw new \Exception(
                    $responseData['Message'] ?? 'Failed to create payment',
                    $responseData['Status'] ?? $response->status()
                );
            }

            return [
                'success' => true,
                'session_id' => $responseData['Data']['SessionID'] ?? null,
                'payment_url' => $responseData['Data']['Url'] ?? null,
                'expired' => $responseData['Data']['Expired'] ?? null,
                'raw_response' => $responseData,
            ];

        } catch (\Exception $e) {
            Log::error('iPaymu Create Payment Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Check payment status
     *
     * @param string $sessionId
     * @return array
     * @throws \Exception
     */
    public function checkPaymentStatus(string $sessionId): array
    {
        if (config('ipaymu.log_requests')) {
            Log::channel(config('ipaymu.log_channel', 'daily'))->info('iPaymu Check Payment Status', [
                'session_id' => $sessionId,
            ]);
        }

        try {
            $body = [
                'transactionId' => $sessionId,
            ];

            $signature = $this->generateSignature($body);

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'va' => $this->apiKey,
                'signature' => $signature,
            ])->post($this->baseUrl . '/payment/status', $body);

            $responseData = $response->json();

            if (config('ipaymu.log_requests')) {
                Log::channel(config('ipaymu.log_channel', 'daily'))->info('iPaymu Check Payment Status Response', [
                    'status' => $response->status(),
                    'response' => $responseData,
                ]);
            }

            if (!$response->successful() || ($responseData['Status'] ?? null) !== 200) {
                throw new \Exception(
                    $responseData['Message'] ?? 'Failed to check payment status',
                    $responseData['Status'] ?? $response->status()
                );
            }

            return [
                'success' => true,
                'status' => $responseData['Data']['Status'] ?? null,
                'transaction_id' => $responseData['Data']['TransactionId'] ?? null,
                'amount' => $responseData['Data']['Amount'] ?? null,
                'raw_response' => $responseData,
            ];

        } catch (\Exception $e) {
            Log::error('iPaymu Check Payment Status Error', [
                'error' => $e->getMessage(),
                'session_id' => $sessionId,
            ]);

            throw $e;
        }
    }

    /**
     * Handle webhook dari iPaymu
     *
     * @param array $data Webhook data
     * @return array
     */
    public function handleWebhook(array $data): array
    {
        if (config('ipaymu.log_requests')) {
            Log::channel(config('ipaymu.log_channel', 'daily'))->info('iPaymu Webhook Received', [
                'data' => $data,
            ]);
        }

        // Verify signature jika diperlukan
        if (config('ipaymu.webhook.verify_signature', true)) {
            if (!$this->verifyWebhookSignature($data)) {
                Log::warning('iPaymu Webhook Signature Verification Failed', [
                    'data' => $data,
                ]);
                throw new \Exception('Invalid webhook signature');
            }
        }

        return [
            'success' => true,
            'transaction_id' => $data['trx_id'] ?? null,
            'reference_id' => $data['reference_id'] ?? null,
            'status' => $data['status'] ?? null,
            'status_code' => $data['status_code'] ?? null,
            'amount' => $data['amount'] ?? null,
            'raw_data' => $data,
        ];
    }

    /**
     * Generate signature untuk request
     *
     * @param array $body
     * @return string
     */
    protected function generateSignature(array $body): string
    {
        // Sort array by key
        ksort($body);
        
        // Convert to JSON string
        $jsonBody = json_encode($body, JSON_UNESCAPED_SLASHES);
        
        // Generate signature: md5(apiKey + secretKey + jsonBody)
        $signatureString = $this->apiKey . $this->secretKey . $jsonBody;
        
        return md5($signatureString);
    }

    /**
     * Verify webhook signature
     *
     * @param array $data
     * @return bool
     */
    protected function verifyWebhookSignature(array $data): bool
    {
        if (!isset($data['signature'])) {
            return false;
        }

        $receivedSignature = $data['signature'];
        unset($data['signature']);

        // Sort array by key
        ksort($data);
        
        // Convert to JSON string
        $jsonBody = json_encode($data, JSON_UNESCAPED_SLASHES);
        
        // Generate expected signature
        $expectedSignature = md5($this->apiKey . $this->secretKey . $jsonBody);

        return hash_equals($expectedSignature, $receivedSignature);
    }

    /**
     * Get available payment methods
     *
     * @return array
     */
    public function getPaymentMethods(): array
    {
        $methods = [];
        
        if (config('ipaymu.payment_methods.bank_transfer', true)) {
            $methods[] = 'bank_transfer';
        }
        
        if (config('ipaymu.payment_methods.e_wallet', true)) {
            $methods[] = 'e_wallet';
        }
        
        if (config('ipaymu.payment_methods.qris', true)) {
            $methods[] = 'qris';
        }

        return $methods;
    }

    /**
     * Map iPaymu status ke payment status sistem
     *
     * @param string $ipaymuStatus
     * @return string
     */
    public function mapStatus(string $ipaymuStatus): string
    {
        return match(strtolower($ipaymuStatus)) {
            'berhasil', 'paid', 'success' => 'verified',
            'pending', 'waiting' => 'pending',
            'failed', 'gagal', 'expired' => 'failed',
            'canceled', 'cancelled' => 'cancelled',
            default => 'pending',
        };
    }
}

