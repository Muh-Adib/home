<?php

namespace App\Services;

use App\Models\GowaConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GowaService
{
    protected ?GowaConfig $config;

    public function __construct()
    {
        $this->config = GowaConfig::getActive();
    }

    /**
     * Check if phone number is registered on WhatsApp
     */
    public function checkWhatsappNumber(string $phone): bool
    {
        try {
            if (! $this->config) {
                throw new \Exception('GOWA configuration not found');
            }

            // Format phone without @s.whatsapp.net for /user/check endpoint
            $cleanPhone = $this->cleanPhoneNumber($phone);

            $response = $this->makeRequest('GET', '/user/check', [
                'phone' => $cleanPhone,
            ]);

            // Check if response indicates phone is registered
            return isset($response['data']['is_registered']) && $response['data']['is_registered'] === true;
        } catch (\Exception $e) {
            Log::error('GOWA checkWhatsappNumber error: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Send WhatsApp message
     */
    public function sendMessage(string $phone, string $message): array
    {
        try {
            if (! $this->config) {
                throw new \Exception('GOWA configuration not found');
            }

            // Format phone with @s.whatsapp.net for /send/message endpoint
            $formattedPhone = $this->formatPhoneNumber($phone);

            $response = $this->makeRequest('POST', '/send/message', [
                'phone' => $formattedPhone,
                'message' => $message,
            ]);

            return [
                'success' => true,
                'data' => $response,
            ];
        } catch (\Exception $e) {
            Log::error('GOWA sendMessage error: '.$e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get user info from WhatsApp
     */
    public function getUserInfo(string $phone): ?array
    {
        try {
            if (! $this->config) {
                throw new \Exception('GOWA configuration not found');
            }

            $formattedPhone = $this->formatPhoneNumber($phone);

            $response = $this->makeRequest('GET', '/user/info', [
                'phone' => $formattedPhone,
            ]);

            return $response['data'] ?? null;
        } catch (\Exception $e) {
            Log::error('GOWA getUserInfo error: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Get QR code for WhatsApp login (Admin only)
     */
    public function getLoginQRCode(): array
    {
        try {
            if (! $this->config) {
                throw new \Exception('GOWA configuration not found');
            }

            $response = $this->makeRequest('GET', '/app/login');

            return [
                'success' => true,
                'qr_code' => $response['data']['qr_code'] ?? null,
                'timeout' => $response['data']['timeout'] ?? 20,
            ];
        } catch (\Exception $e) {
            Log::error('GOWA getLoginQRCode error: '.$e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Logout from WhatsApp (Admin only)
     */
    public function logout(): bool
    {
        try {
            if (! $this->config) {
                throw new \Exception('GOWA configuration not found');
            }

            $response = $this->makeRequest('GET', '/app/logout');

            return isset($response['code']) && $response['code'] === 200;
        } catch (\Exception $e) {
            Log::error('GOWA logout error: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Reconnect to WhatsApp server (Admin only)
     */
    public function reconnect(): bool
    {
        try {
            if (! $this->config) {
                throw new \Exception('GOWA configuration not found');
            }

            $response = $this->makeRequest('GET', '/app/reconnect');

            return isset($response['code']) && $response['code'] === 200;
        } catch (\Exception $e) {
            Log::error('GOWA reconnect error: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Get connected devices list (Admin only)
     */
    public function getDevices(): array
    {
        try {
            if (! $this->config) {
                throw new \Exception('GOWA configuration not found');
            }

            $response = $this->makeRequest('GET', '/app/devices');

            return [
                'success' => true,
                'devices' => $response['data'] ?? [],
            ];
        } catch (\Exception $e) {
            Log::error('GOWA getDevices error: '.$e->getMessage());

            return [
                'success' => false,
                'devices' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Check GOWA connection status
     */
    public function checkConnection(): bool
    {
        try {
            if (! $this->config) {
                return false;
            }

            $response = $this->makeRequest('GET', '/app/devices');

            return isset($response['code']) && $response['code'] === 200;
        } catch (\Exception $e) {
            Log::error('GOWA checkConnection error: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Make HTTP request to GOWA API
     */
    protected function makeRequest(string $method, string $endpoint, array $data = []): array
    {
        $url = rtrim($this->config->url, '/').$endpoint;

        $request = Http::withBasicAuth($this->config->username, $this->config->password)
            ->timeout(30);

        if ($method === 'GET') {
            $response = $request->get($url, $data);
        } else {
            $response = $request->post($url, $data);
        }

        if (! $response->successful()) {
            throw new \Exception('GOWA API request failed: '.$response->body());
        }

        return $response->json();
    }

    /**
     * Format phone number with @s.whatsapp.net suffix
     */
    protected function formatPhoneNumber(string $phone): string
    {
        $cleanPhone = $this->cleanPhoneNumber($phone);

        // Add @s.whatsapp.net if not already present
        if (! str_contains($cleanPhone, '@')) {
            return $cleanPhone.'@s.whatsapp.net';
        }

        return $cleanPhone;
    }

    /**
     * Clean phone number (remove @s.whatsapp.net and other characters)
     */
    protected function cleanPhoneNumber(string $phone): string
    {
        // Remove @s.whatsapp.net suffix
        $phone = str_replace('@s.whatsapp.net', '', $phone);

        // Remove any non-numeric characters except +
        $phone = preg_replace('/[^0-9+]/', '', $phone);

        // Remove leading + if present
        $phone = ltrim($phone, '+');

        return $phone;
    }
}
