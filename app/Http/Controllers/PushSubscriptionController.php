<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    /**
     * Store a new push subscription for the authenticated user.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'url', 'max:2048'],
            'keys.p256dh' => ['required', 'string'],
            'keys.auth' => ['required', 'string'],
        ]);

        // Manually handle upsert to avoid querying the virtual endpoint_hash column
        PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint', $validated['endpoint'])
            ->delete();

        PushSubscription::create([
            'user_id' => $request->user()->id,
            'endpoint' => $validated['endpoint'],
            'p256dh_key' => $validated['keys']['p256dh'],
            'auth_key' => $validated['keys']['auth'],
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Subscribed successfully']);
    }

    /**
     * Remove a push subscription for the authenticated user.
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'url', 'max:2048'],
        ]);

        PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint', $validated['endpoint'])
            ->delete();

        return response()->json(['message' => 'Unsubscribed successfully']);
    }

    /**
     * Return the VAPID public key for the client to use when subscribing.
     */
    public function vapidPublicKey(): JsonResponse
    {
        return response()->json([
            'vapid_public_key' => config('webpush.vapid.public_key'),
        ]);
    }
}
