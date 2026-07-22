<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GowaConfig;
use App\Services\GowaService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class GowaAdminController extends Controller
{
    protected GowaService $gowaService;

    public function __construct(GowaService $gowaService)
    {
        $this->middleware(['auth', 'role:super_admin,manager']);
        $this->gowaService = $gowaService;
    }

    /**
     * Show GOWA management page
     */
    public function index(): Response
    {
        $config = GowaConfig::getActive();
        $devicesResult = $this->gowaService->getDevices();

        return Inertia::render('Admin/Gowa/GowaManagement', [
            'config' => $config ? [
                'id' => $config->id,
                'name' => $config->name,
                'url' => $config->url,
                'username' => $config->username,
                'whatsapp_number' => $config->whatsapp_number,
                'is_active' => $config->is_active,
            ] : null,
            'devices' => $devicesResult['devices'] ?? [],
            'isConnected' => $devicesResult['success'] ?? false,
        ]);
    }

    /**
     * Get QR code for WhatsApp login
     */
    public function getQRCode(): JsonResponse
    {
        $result = $this->gowaService->getLoginQRCode();

        if (! $result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['error'] ?? 'Failed to generate QR code',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'qr_code' => $result['qr_code'],
            'timeout' => $result['timeout'],
        ]);
    }

    /**
     * Send WhatsApp message
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string|max:4096',
        ]);

        try {
            $result = $this->gowaService->sendMessage(
                $request->phone,
                $request->message
            );

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Message sent successfully',
                    'data' => $result['data'],
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Failed to send message',
                ], 500);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error sending message: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Logout from WhatsApp
     */
    public function logout(): JsonResponse
    {
        $success = $this->gowaService->logout();

        return response()->json([
            'success' => $success,
            'message' => $success
                ? __('gowa.logout_success')
                : __('gowa.logout_failed'),
        ]);
    }

    /**
     * Reconnect to WhatsApp server
     */
    public function reconnect(): JsonResponse
    {
        $success = $this->gowaService->reconnect();

        return response()->json([
            'success' => $success,
            'message' => $success
                ? __('gowa.reconnect_success')
                : __('gowa.reconnect_failed'),
        ]);
    }

    /**
     * Get connection status and devices
     */
    public function getStatus(): JsonResponse
    {
        $devicesResult = $this->gowaService->getDevices();

        return response()->json([
            'success' => $devicesResult['success'],
            'devices' => $devicesResult['devices'] ?? [],
            'isConnected' => $devicesResult['success'],
        ]);
    }

    /**
     * Update GOWA configuration
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $request->validate([
            'url' => 'required|url',
            'username' => 'required|string',
            'password' => 'nullable|string',
            'whatsapp_number' => 'required|string',
        ]);

        $config = GowaConfig::getActive();

        if (! $config) {
            // Create new config and set as active
            $config = GowaConfig::create([
                'name' => 'default',
                'url' => $request->url,
                'username' => $request->username,
                'password' => $request->password ?? '',
                'whatsapp_number' => $request->whatsapp_number,
                'is_active' => true,
            ]);
        } else {
            // Update existing config
            $updateData = [
                'url' => $request->url,
                'username' => $request->username,
                'whatsapp_number' => $request->whatsapp_number,
            ];

            // Only update password if provided
            if ($request->filled('password')) {
                $updateData['password'] = $request->password;
            }

            $config->update($updateData);
        }

        // Ensure this is the only active config
        GowaConfig::where('id', '!=', $config->id)->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => __('gowa.config_updated'),
            'config' => [
                'id' => $config->id,
                'name' => $config->name,
                'url' => $config->url,
                'username' => $config->username,
                'whatsapp_number' => $config->whatsapp_number,
                'is_active' => $config->is_active,
            ],
        ]);
    }

    /**
     * Test GOWA connection with detailed debugging
     */
    public function testConnection(): JsonResponse
    {
        $config = GowaConfig::getActive();

        if (! $config) {
            return response()->json([
                'success' => false,
                'message' => 'No active GOWA configuration found',
                'debug' => [
                    'config_exists' => false,
                    'error' => 'Please configure GOWA settings first',
                ],
            ]);
        }

        $debugInfo = [
            'config_exists' => true,
            'url' => $config->url,
            'username' => $config->username,
            'whatsapp_number' => $config->whatsapp_number,
        ];

        try {
            // Test basic HTTP connection
            $response = Http::timeout(10)
                ->withBasicAuth($config->username, $config->password)
                ->get($config->url.'/app/devices');

            $debugInfo['http_status'] = $response->status();
            $debugInfo['response_time'] = $response->handlerStats()['total_time'] ?? 'N/A';

            if ($response->successful()) {
                $data = $response->json();
                $debugInfo['response_data'] = $data;
                $debugInfo['api_code'] = $data['code'] ?? 'N/A';

                $isConnected = isset($data['code']) && $data['code'] === 200;

                return response()->json([
                    'success' => $isConnected,
                    'message' => $isConnected
                        ? 'GOWA server connected successfully'
                        : 'GOWA server responded but not connected',
                    'debug' => $debugInfo,
                ]);
            } else {
                $debugInfo['error'] = 'HTTP request failed';
                $debugInfo['response_body'] = $response->body();

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to connect to GOWA server',
                    'debug' => $debugInfo,
                ], 500);
            }
        } catch (ConnectionException $e) {
            $debugInfo['error'] = 'Connection failed';
            $debugInfo['error_message'] = $e->getMessage();
            $debugInfo['error_type'] = 'ConnectionException';

            return response()->json([
                'success' => false,
                'message' => 'Cannot reach GOWA server - Connection timeout or refused',
                'debug' => $debugInfo,
            ], 500);
        } catch (\Exception $e) {
            $debugInfo['error'] = 'Unexpected error';
            $debugInfo['error_message'] = $e->getMessage();
            $debugInfo['error_type'] = get_class($e);

            return response()->json([
                'success' => false,
                'message' => 'Error testing connection: '.$e->getMessage(),
                'debug' => $debugInfo,
            ], 500);
        }
    }

    /**
     * Get detailed GOWA status for debugging
     */
    public function debugStatus(): JsonResponse
    {
        $config = GowaConfig::getActive();

        $debugData = [
            'timestamp' => now()->toISOString(),
            'config' => $config ? [
                'id' => $config->id,
                'name' => $config->name,
                'url' => $config->url,
                'username' => $config->username,
                'whatsapp_number' => $config->whatsapp_number,
                'is_active' => $config->is_active,
                'created_at' => $config->created_at,
                'updated_at' => $config->updated_at,
            ] : null,
            'environment' => [
                'app_env' => config('app.env'),
                'app_debug' => config('app.debug'),
                'php_version' => PHP_VERSION,
            ],
        ];

        if ($config) {
            try {
                // Test /app/devices endpoint
                $devicesResult = $this->gowaService->getDevices();
                $debugData['devices_test'] = $devicesResult;

                // Test /user/check endpoint
                $checkResult = $this->gowaService->checkWhatsappNumber($config->whatsapp_number);
                $debugData['number_check'] = [
                    'number' => $config->whatsapp_number,
                    'is_registered' => $checkResult,
                ];
            } catch (\Exception $e) {
                $debugData['service_error'] = [
                    'message' => $e->getMessage(),
                    'type' => get_class($e),
                ];
            }
        }

        return response()->json($debugData);
    }
}
