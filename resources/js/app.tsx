import './bootstrap.js';
import '../css/app.css';

import { createRoot, hydrateRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import i18n from './lib/i18n';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { initializeTheme } from './hooks/use-appearance';
import GlobalPageLoader from '@/components/GlobalPageLoader';
import { Toaster } from 'sonner';

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
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx', { eager: false })),
    setup({ el, App, props }) {
        const jsx = (
            <QueryClientProvider client={queryClient}>
                <I18nextProvider i18n={i18n}>
                    <GlobalPageLoader>
                        {typeof window !== 'undefined' && <Toaster position="top-right" richColors closeButton expand={false} />}
                        <App {...props} />
                    </GlobalPageLoader>
                </I18nextProvider>
            </QueryClientProvider>
        );

        // hydrateRoot if SSR content exists, createRoot otherwise
        if (el.childElementCount > 0) {
            hydrateRoot(el, jsx);
        } else {
            createRoot(el).render(jsx);
        }
    },
    progress: false,
    defaults: {
        future: {
            useDataInertiaHeadAttribute: true,
        },
    },
});