// bootstrap.ts — axios removed in Inertia v3.
// CSRF token is now injected automatically by @/lib/api for all fetch calls.
// Laravel Echo / Pusher setup remains here.

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any> | null;
    }
}

if (typeof window !== 'undefined') {
    window.Pusher = Pusher;

    const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;

    // Only initialize Echo when a real Pusher key is configured.
    // Skips initialization when key is missing or is the default placeholder.
    if (pusherKey && pusherKey !== 'app-key') {
        window.Echo = new Echo({
            broadcaster: 'pusher',
            key: pusherKey,
            cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
            wsHost: import.meta.env.VITE_PUSHER_HOST
                ? import.meta.env.VITE_PUSHER_HOST
                : `ws-${import.meta.env.VITE_PUSHER_APP_CLUSTER}.pusher.com`,
            wsPort: import.meta.env.VITE_PUSHER_PORT ?? 80,
            wssPort: import.meta.env.VITE_PUSHER_PORT ?? 443,
            forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https',
            enabledTransports: ['ws', 'wss'],
        });
    } else {
        window.Echo = null;
    }
}
