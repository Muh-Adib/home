import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';
import { type RouteName, route } from 'ziggy-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from './lib/i18n';
// Hapus import AOS atau initializeTheme jika mereka dieksekusi di level global di file sumbernya.

const appName = import.meta.env.VITE_APP_NAME || 'Homsjogja';

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => `${title} - ${appName}`,
        defaults: {
            future: {
                useDataInertiaHeadAttribute: true,
            },
        },
        resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx', { eager: false })),
        setup: ({ App, props }) => {
            /* eslint-disable */
            // ... (Kode Ziggy Global Routes Anda di sini, sudah benar)
            // @ts-ignore
            global.route = (name, params, absolute) =>
                route(name, params, absolute, {
                    // @ts-ignore
                    ...page.props.ziggy,
                    // @ts-ignore
                    location: new URL(page.props.ziggy.location),
                });
            /* eslint-enable */

            // Buat QueryClient baru untuk setiap request (sudah benar untuk isolasi request)
            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false, // Penting untuk SSR, jangan retry jika gagal di server
                        // Jika Anda menggunakan data fetching di server, Anda perlu
                        // menambahkan dehydrator di sini dan rehydrator di app.tsx
                    },
                },
            });

            return (
                <QueryClientProvider client={queryClient}>
                    <I18nextProvider i18n={i18n}>
                        <App {...props} />
                    </I18nextProvider>
                </QueryClientProvider>
            );
        },
    }),
    { cluster: true },

);