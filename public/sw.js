/**
 * HomsJogja Service Worker
 * Handles background Web Push Notifications via VAPID.
 *
 * IMPORTANT: This file must stay at the root /sw.js so that its scope covers the entire origin.
 * Do NOT bundle this through Vite — place it directly in /public/sw.js.
 */

const APP_NAME = 'HomsJogja';

// ─── Push Event ──────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
    if (!event.data) {
        return;
    }

    let payload;
    try {
        payload = event.data.json();
    } catch {
        payload = { title: APP_NAME, body: event.data.text() };
    }

    const title = payload.title || APP_NAME;
    const options = {
        body: payload.body || '',
        icon: payload.icon || '/logo.svg',
        badge: payload.badge || '/logo.svg',
        tag: payload.tag || 'homs-push',
        data: {
            url: payload.url || payload.action_url || '/',
        },
        // Keep notification visible until user interacts
        requireInteraction: false,
        // Vibration pattern: short-long-short
        vibrate: [100, 50, 100],
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a tab is already open on this origin, focus & navigate it
            for (const client of clientList) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(targetUrl);
                    }
                    return;
                }
            }
            // Otherwise open a new tab
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// ─── Notification Close ───────────────────────────────────────────────────────

self.addEventListener('notificationclose', () => {
    // Optional: track dismissed notifications
});

// ─── Activate / Install ───────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
    // Take control immediately without waiting for old SW to die
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});
