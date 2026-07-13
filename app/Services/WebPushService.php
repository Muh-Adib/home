<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    private WebPush $webPush;

    public function __construct()
    {
        $auth = [
            'VAPID' => [
                'subject' => config('app.url'),
                'publicKey' => config('webpush.vapid.public_key'),
                'privateKey' => config('webpush.vapid.private_key'),
            ],
        ];

        $this->webPush = new WebPush($auth);
    }

    /**
     * Send a push notification to all push subscribers of a given user.
     *
     * @param  array<string, mixed>  $payload
     */
    public function sendToUser(User $user, array $payload): void
    {
        $subscriptions = PushSubscription::where('user_id', $user->id)->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        $this->send($subscriptions, $payload);
    }

    /**
     * Send a push notification to all users with a given role.
     *
     * @param  string|array<string>  $roles
     * @param  array<string, mixed>  $payload
     */
    public function sendToRoles(string|array $roles, array $payload): void
    {
        $roles = (array) $roles;

        $subscriptions = PushSubscription::whereHas('user', function ($query) use ($roles) {
            $query->whereIn('role', $roles);
        })->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        $this->send($subscriptions, $payload);
    }

    /**
     * Deliver push messages and handle expired subscriptions.
     *
     * @param  Collection<int, PushSubscription>  $subscriptions
     * @param  array<string, mixed>  $payload
     */
    private function send(Collection $subscriptions, array $payload): void
    {
        $json = json_encode($payload);

        foreach ($subscriptions as $sub) {
            try {
                $subscription = Subscription::create([
                    'endpoint' => $sub->endpoint,
                    'publicKey' => $sub->p256dh_key,
                    'authToken' => $sub->auth_key,
                    'contentEncoding' => 'aesgcm',
                ]);

                $this->webPush->queueNotification($subscription, $json);
            } catch (\Throwable $e) {
                Log::warning('[WebPush] Failed to queue notification', [
                    'subscription_id' => $sub->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        /** @var MessageSentReport $report */
        foreach ($this->webPush->flush() as $report) {
            if (! $report->isSuccess()) {
                Log::warning('[WebPush] Delivery failed', [
                    'endpoint' => $report->getEndpoint(),
                    'reason' => $report->getReason(),
                    'expired' => $report->isSubscriptionExpired(),
                ]);

                // Remove expired / invalid subscriptions automatically
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $report->getEndpoint())->delete();
                }
            }
        }
    }
}
