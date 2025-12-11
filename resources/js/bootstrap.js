import axios from 'axios';
window.axios = axios;

// Konfigurasi base URL untuk HTTPS
if (typeof window !== 'undefined') {
    window.axios.defaults.baseURL = import.meta.env.VITE_APP_URL || window.location.origin;
    window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
}

// Function to get and update CSRF token
function updateCsrfToken() {
    if (typeof document === 'undefined') return null;
    const csrfTokenMeta = document.head.querySelector('meta[name="csrf-token"]');
    if (csrfTokenMeta && csrfTokenMeta.getAttribute('content')) {
        const token = csrfTokenMeta.getAttribute('content');
        if (typeof window !== 'undefined') {
            window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
        }
        return token;
    }
    return null;
}

// Ensure CSRF token header is sent with axios requests (prevents 419 on POST)
updateCsrfToken();

// Update CSRF token on every axios request to ensure it's always fresh
axios.interceptors.request.use(
    (config) => {
        const token = updateCsrfToken();
        if (token) {
            config.headers['X-CSRF-TOKEN'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle 419 errors (CSRF token expired) and 401 (unauthorized) - refresh token and retry
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (typeof window === 'undefined') return Promise.reject(error);

        const originalRequest = error.config;

        // Handle 419 (CSRF token expired)
        if (error.response?.status === 419 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Try to refresh CSRF token
                const response = await axios.get('/csrf-token');
                if (response.data.token) {
                    const metaTag = document.querySelector('meta[name="csrf-token"]');
                    if (metaTag) {
                        metaTag.setAttribute('content', response.data.token);
                    }
                    updateCsrfToken();
                    originalRequest.headers['X-CSRF-TOKEN'] = response.data.token;
                    return axios(originalRequest);
                }
            } catch (refreshError) {
                // If refresh fails, reload the page
                window.location.reload();
                return Promise.reject(refreshError);
            }
        }

        // Handle 401 (unauthorized) - reload page to get new session
        if (error.response?.status === 401) {
            window.location.reload();
            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

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
