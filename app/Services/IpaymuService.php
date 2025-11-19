<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class IpaymuService
{
    protected string $va; // Virtual Account (VA) number
    protected string $apiKey; // API Key dari iPaymu
    protected string $mode;
    protected string $baseUrl;
    protected string $paymentUrl;

    public function __construct()
    {
        // VA (Virtual Account) adalah nomor Virtual Account dari iPaymu
        $this->va = config('ipaymu.va') ?? config('ipaymu.api_key');
        // API Key adalah kunci API dari iPaymu (bisa sama dengan VA atau berbeda)
        $this->apiKey = config('ipaymu.api_key') ?? config('ipaymu.va');
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
            // Prepare request body sesuai dokumentasi iPaymu API v2
            // Field yang wajib: product, qty, price, amount, returnUrl, cancelUrl, notifyUrl, referenceId
            $body = [
                'product' => $data['product'] ?? [],
                'qty' => $data['qty'] ?? [],
                'price' => $data['price'] ?? [],
                'amount' => $data['amount'],
                'returnUrl' => $data['return_url'] ?? config('ipaymu.return_url'),
                'cancelUrl' => $data['cancel_url'] ?? config('ipaymu.return_url'),
                'notifyUrl' => $data['notify_url'] ?? config('ipaymu.notify_url'),
                'referenceId' => $data['reference_id'],
            ];
            
            // Field opsional - hanya tambahkan jika ada value
            if (!empty($data['name'])) {
                $body['name'] = $data['name'];
            }
            if (!empty($data['phone'])) {
                $body['phone'] = $data['phone'];
            }
            if (!empty($data['email'])) {
                $body['email'] = $data['email'];
            }
            if (!empty($data['payment_method'])) {
                $body['paymentMethod'] = $data['payment_method']; // all, bank, qris, va
            }
            if (!empty($data['payment_channel'])) {
                $body['paymentChannel'] = $data['payment_channel']; // all, bank_transfer, qris, va
            }
            if (!empty($data['expired'])) {
                $body['expired'] = $data['expired']; // Expiry time format: YYYY-MM-DD HH:mm:ss atau hours (integer)
            }

            // Generate signature sesuai dokumentasi iPaymu
            // Format: HMAC-256 dengan StringToSign = HTTPMethod:VaNumber:Lowercase(SHA-256(RequestBody)):ApiKey
            $signature = $this->generateSignature('POST', $this->paymentUrl, $body);

            // Make API request dengan header sesuai dokumentasi iPaymu
            // Header yang diperlukan:
            // - Content-Type: application/json
            // - va: Virtual Account number (VA)
            // - signature: HMAC-256 dari StringToSign
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'va' => $this->va,
                'signature' => $signature,
            ])->timeout(30)->post($this->paymentUrl, $body);

            $responseData = $response->json();

            if (config('ipaymu.log_requests')) {
                Log::channel(config('ipaymu.log_channel', 'daily'))->info('iPaymu Create Payment Response', [
                    'status' => $response->status(),
                    'response' => $responseData,
                ]);
            }

            // Handle response sesuai format iPaymu API v2
            // Response format: { "Status": 200, "Message": "...", "Data": { ... } }
            $statusCode = $responseData['Status'] ?? $response->status();
            $message = $responseData['Message'] ?? 'Failed to create payment';
            
            if (!$response->successful() || $statusCode !== 200) {
                Log::error('iPaymu Create Payment Failed', [
                    'status_code' => $statusCode,
                    'message' => $message,
                    'response' => $responseData,
                ]);
                
                throw new \Exception($message, $statusCode);
            }

            // Extract data dari response
            $data = $responseData['Data'] ?? [];
            
            return [
                'success' => true,
                'session_id' => $data['SessionID'] ?? $data['sessionId'] ?? null,
                'payment_url' => $data['Url'] ?? $data['url'] ?? null,
                'expired' => $data['Expired'] ?? $data['expired'] ?? null,
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
            // Prepare request body untuk check payment status
            $body = [
                'transactionId' => $sessionId,
            ];

            // Endpoint untuk check payment status: /api/v2/transaction
            $endpoint = $this->baseUrl . '/transaction';
            
            // Generate signature sesuai dokumentasi iPaymu
            $signature = $this->generateSignature('POST', $endpoint, $body);
            
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'va' => $this->va,
                'signature' => $signature,
            ])->timeout(30)->post($endpoint, $body);

            $responseData = $response->json();

            if (config('ipaymu.log_requests')) {
                Log::channel(config('ipaymu.log_channel', 'daily'))->info('iPaymu Check Payment Status Response', [
                    'status' => $response->status(),
                    'response' => $responseData,
                ]);
            }

            // Handle response sesuai format iPaymu API v2
            $statusCode = $responseData['Status'] ?? $response->status();
            $message = $responseData['Message'] ?? 'Failed to check payment status';
            
            if (!$response->successful() || $statusCode !== 200) {
                Log::error('iPaymu Check Payment Status Failed', [
                    'session_id' => $sessionId,
                    'status_code' => $statusCode,
                    'message' => $message,
                    'response' => $responseData,
                ]);
                
                throw new \Exception($message, $statusCode);
            }

            // Extract data dari response
            $data = $responseData['Data'] ?? [];
            
            return [
                'success' => true,
                'status' => $data['Status'] ?? $data['status'] ?? null,
                'transaction_id' => $data['TransactionId'] ?? $data['transactionId'] ?? $data['TrxId'] ?? null,
                'amount' => $data['Amount'] ?? $data['amount'] ?? null,
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
     * Format webhook iPaymu biasanya:
     * - trx_id: Transaction ID
     * - reference_id: Reference ID (booking number)
     * - status: Payment status
     * - status_code: Status code
     * - amount: Payment amount
     * - signature: Webhook signature untuk verification
     *
     * @param array $data Webhook data
     * @return array
     */
    public function handleWebhook(array $data): array
    {
        if (config('ipaymu.log_requests')) {
            Log::channel(config('ipaymu.log_channel', 'daily'))->info('iPaymu Webhook Received', [
                'data' => $data,
                'ip' => request()->ip(),
            ]);
        }

        // Verify signature jika diperlukan
        if (config('ipaymu.webhook.verify_signature', true)) {
            if (!$this->verifyWebhookSignature($data)) {
                Log::warning('iPaymu Webhook Signature Verification Failed', [
                    'data' => $data,
                    'ip' => request()->ip(),
                ]);
                throw new \Exception('Invalid webhook signature');
            }
        }

        // Extract webhook data dengan berbagai kemungkinan field name
        // iPaymu bisa menggunakan format berbeda (camelCase, snake_case, dll)
        return [
            'success' => true,
            'transaction_id' => $data['trx_id'] ?? $data['trxId'] ?? $data['transaction_id'] ?? $data['transactionId'] ?? null,
            'reference_id' => $data['reference_id'] ?? $data['referenceId'] ?? $data['reference_id'] ?? null,
            'status' => $data['status'] ?? $data['Status'] ?? null,
            'status_code' => $data['status_code'] ?? $data['statusCode'] ?? $data['StatusCode'] ?? null,
            'amount' => $data['amount'] ?? $data['Amount'] ?? null,
            'raw_data' => $data,
        ];
    }

    /**
     * Generate signature untuk request sesuai dokumentasi iPaymu
     * 
     * Format signature: HMAC-256 dengan StringToSign
     * StringToSign = HTTPMethod:VaNumber:Lowercase(SHA-256(RequestBody)):ApiKey
     * Signature = HMAC-256(StringToSign, ApiKey)
     *
     * @param string $httpMethod HTTP Method (POST, GET, dll)
     * @param string $endpoint Endpoint URL (untuk logging/debugging)
     * @param array $body Request body
     * @return string
     */
    protected function generateSignature(string $httpMethod, string $endpoint, array $body): string
    {
        // Remove null values untuk signature generation
        $body = array_filter($body, function($value) {
            return $value !== null && $value !== '';
        });
        
        // Sort array by key (ascending)
        ksort($body);
        
        // Convert to JSON string tanpa escape slash dan tanpa whitespace
        $requestBody = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        // Step 1: Calculate SHA-256 hash dari RequestBody
        $sha256Hash = hash('sha256', $requestBody);
        
        // Step 2: Convert ke lowercase
        $lowercaseHash = strtolower($sha256Hash);
        
        // Step 3: Build StringToSign
        // Format: HTTPMethod:VaNumber:Lowercase(SHA-256(RequestBody)):ApiKey
        $stringToSign = $httpMethod . ':' . $this->va . ':' . $lowercaseHash . ':' . $this->apiKey;
        
        // Step 4: Generate HMAC-256 signature
        // Signature = HMAC-256(StringToSign, ApiKey)
        $signature = hash_hmac('sha256', $stringToSign, $this->apiKey);
        
        if (config('ipaymu.log_requests')) {
            Log::channel(config('ipaymu.log_channel', 'daily'))->debug('iPaymu Signature Generation', [
                'http_method' => $httpMethod,
                'endpoint' => $endpoint,
                'va' => $this->va,
                'request_body' => $requestBody,
                'sha256_hash' => $sha256Hash,
                'lowercase_hash' => $lowercaseHash,
                'string_to_sign' => $stringToSign,
                'signature' => $signature,
            ]);
        }
        
        return $signature;
    }

    /**
     * Verify webhook signature
     * Format webhook dari iPaymu menggunakan format yang sama dengan request signature
     * StringToSign = HTTPMethod:VaNumber:Lowercase(SHA-256(RequestBody)):ApiKey
     * Signature = HMAC-256(StringToSign, ApiKey)
     *
     * @param array $data Webhook data
     * @return bool
     */
    protected function verifyWebhookSignature(array $data): bool
    {
        if (!isset($data['signature'])) {
            Log::warning('iPaymu Webhook missing signature', ['data' => $data]);
            return false;
        }

        $receivedSignature = $data['signature'];
        
        // Copy data tanpa signature untuk verification
        $dataForVerification = $data;
        unset($dataForVerification['signature']);
        
        // Remove null values
        $dataForVerification = array_filter($dataForVerification, function($value) {
            return $value !== null && $value !== '';
        });

        // Sort array by key (ascending)
        ksort($dataForVerification);
        
        // Convert to JSON string tanpa escape slash
        $requestBody = json_encode($dataForVerification, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        // Webhook biasanya menggunakan POST method
        $httpMethod = 'POST';
        
        // Step 1: Calculate SHA-256 hash dari RequestBody
        $sha256Hash = hash('sha256', $requestBody);
        
        // Step 2: Convert ke lowercase
        $lowercaseHash = strtolower($sha256Hash);
        
        // Step 3: Build StringToSign
        // Format: HTTPMethod:VaNumber:Lowercase(SHA-256(RequestBody)):ApiKey
        $stringToSign = $httpMethod . ':' . $this->va . ':' . $lowercaseHash . ':' . $this->apiKey;
        
        // Step 4: Generate expected signature
        // Signature = HMAC-256(StringToSign, ApiKey)
        $expectedSignature = hash_hmac('sha256', $stringToSign, $this->apiKey);

        // Use hash_equals untuk prevent timing attacks
        $isValid = hash_equals($expectedSignature, $receivedSignature);
        
        if (!$isValid) {
            Log::warning('iPaymu Webhook signature mismatch', [
                'expected' => $expectedSignature,
                'received' => $receivedSignature,
                'string_to_sign' => $stringToSign,
                'request_body' => $requestBody,
            ]);
        }

        return $isValid;
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

