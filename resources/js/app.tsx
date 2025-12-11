import './bootstrap.js';
import '../css/app.css';

import { hydrateRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import i18n from './lib/i18n';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { initializeTheme } from './hooks/use-appearance';

// Initialize theme
initializeTheme();

// Initialize AOS
AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
    offset: 100,
    delay: 0
});

// Create QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
        },
    },
});

const appName = import.meta.env.VITE_APP_NAME || 'Homsjogja';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        hydrateRoot(el,
            <QueryClientProvider client={queryClient}>
                <I18nextProvider i18n={i18n}>
                    <App {...props} />
                </I18nextProvider>
            </QueryClientProvider>
        );
    },
    progress: {
        color: '#074baa',      // warna dasar (tetap diperlukan)
        showSpinner: false,     // matikan spinner bawaan
        includeCSS: true        // tetap gunakan struktur NProgress, tapi style kamu yang override
    },
    defaults: {
        future: {
            useDataInertiaHeadAttribute: true,
        },
    },
});