<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class MootaService
{
    /**
     * Verify the webhook signature from Moota.
     *
     * @param  string  $payload  Raw request content body
     * @param  string  $signatureHeader  Signature header value
     */
    public function verifySignature(string $payload, string $signatureHeader): bool
    {
        $secret = config('moota.webhook_secret');
        if (empty($secret)) {
            Log::warning('[MootaService] Webhook secret is not configured.');

            return app()->environment('local', 'testing');
        }

        $calculated = hash_hmac('sha256', $payload, $secret);

        return hash_equals($calculated, $signatureHeader);
    }
}
