import axios from 'axios';
window.axios = axios;

// Konfigurasi base URL untuk HTTPS
window.axios.defaults.baseURL = import.meta.env.VITE_APP_URL || window.location.origin;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Ensure CSRF token header is sent with axios requests (prevents 419 on POST)
const csrfTokenMeta = document.head.querySelector('meta[name="csrf-token"]');
if (csrfTokenMeta && csrfTokenMeta.getAttribute('content')) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfTokenMeta.getAttribute('content');
}

// Echo is an optional dependency that can be used for real-time features
// import Echo from 'laravel-echo';
// import Pusher from 'pusher-js';
// window.Pusher = Pusher;
// window.Echo = new Echo({
//     broadcaster: 'pusher',
//     key: import.meta.env.VITE_PUSHER_APP_KEY,
//     cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
//     wsHost: import.meta.env.VITE_PUSHER_HOST ? import.meta.env.VITE_PUSHER_HOST : `ws-${import.meta.env.VITE_PUSHER_APP_CLUSTER}.pusherapp.com`,
//     wsPort: import.meta.env.VITE_PUSHER_PORT ?? 80,
//     wssPort: import.meta.env.VITE_PUSHER_PORT ?? 443,
//     forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https',
//     enabledTransports: ['ws', 'wss'],
// });
