/**
 * push-manager.ts
 * Utility for registering the Service Worker and managing VAPID push subscriptions.
 */

const SW_PATH = '/sw.js';
const SUBSCRIBE_ENDPOINT = '/push/subscribe';
const UNSUBSCRIBE_ENDPOINT = '/push/unsubscribe';
const VAPID_KEY_ENDPOINT = '/push/vapid-public-key';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCsrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

/**
 * Convert a Base64URL string to a Uint8Array (required by PushManager.subscribe).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// ─── Service Worker Registration ─────────────────────────────────────────────

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
        console.warn('[PushManager] Service Workers not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
        console.log('[PushManager] Service Worker registered', registration.scope);
        return registration;
    } catch (error) {
        console.error('[PushManager] Service Worker registration failed:', error);
        return null;
    }
}

// ─── VAPID Public Key ─────────────────────────────────────────────────────────

async function fetchVapidPublicKey(): Promise<string | null> {
    try {
        const response = await fetch(VAPID_KEY_ENDPOINT);
        const data = await response.json();
        return data.vapid_public_key ?? null;
    } catch (error) {
        console.error('[PushManager] Failed to fetch VAPID public key:', error);
        return null;
    }
}

// ─── Subscribe ────────────────────────────────────────────────────────────────

/**
 * Request push permission and subscribe the browser to VAPID push.
 * Sends the subscription endpoint to the Laravel backend.
 *
 * @returns true if subscription was successful, false otherwise.
 */
export async function subscribeToPush(): Promise<boolean> {
    if (!('PushManager' in window)) {
        console.warn('[PushManager] Push API not supported');
        return false;
    }

    // 1. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.warn('[PushManager] Notification permission denied:', permission);
        return false;
    }

    // 2. Get service worker registration
    const registration = await registerServiceWorker();
    if (!registration) {
        return false;
    }

    // 3. Fetch VAPID public key
    const vapidPublicKey = await fetchVapidPublicKey();
    if (!vapidPublicKey) {
        return false;
    }

    // 4. Subscribe to push
    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        // 5. Send subscription to backend
        const response = await fetch(SUBSCRIBE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
                Accept: 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify(subscription),
        });

        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }

        console.log('[PushManager] Successfully subscribed to push notifications');
        return true;
    } catch (error) {
        console.error('[PushManager] Push subscription failed:', error);
        return false;
    }
}

// ─── Unsubscribe ──────────────────────────────────────────────────────────────

export async function unsubscribeFromPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
        if (!registration) {
            return false;
        }

        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            return true; // Already unsubscribed
        }

        // Notify backend
        await fetch(UNSUBSCRIBE_ENDPOINT, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
                Accept: 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe();
        console.log('[PushManager] Unsubscribed from push notifications');
        return true;
    } catch (error) {
        console.error('[PushManager] Failed to unsubscribe:', error);
        return false;
    }
}

// ─── Check Status ─────────────────────────────────────────────────────────────

export async function isPushSubscribed(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
        if (!registration) {
            return false;
        }
        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
    } catch {
        return false;
    }
}
