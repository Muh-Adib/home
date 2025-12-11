import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    // Biarkan base default agar Laravel Vite menghasilkan path /build/... yang benar
    esbuild: {
        jsx: 'automatic',
        drop: ['console', 'debugger'],
        // Tambahan konfigurasi untuk mengatasi EPIPE error
        target: 'es2020',
    },
    build: {
        rollupOptions: {
            onwarn(warning, warn) {
                // Suppress specific warnings that might be causing issues
                if (warning.code === 'CIRCULAR_DEPENDENCY') return;
                if (warning.message.includes('object is not extensible')) return;
                warn(warning);
            },
            treeshake: {
                moduleSideEffects: false,
            },
        },
        target: 'es2020',
        minify: 'esbuild',
    },
    // Tambahan konfigurasi server untuk stabilitas
    server: {
        host: '127.0.0.1', // Use IPv4 instead of IPv6
        port: 5173,
        hmr: {
            overlay: false, // Disable error overlay yang bisa menyebabkan crash
        },
        watch: {
            usePolling: true, // Gunakan polling untuk file watching yang lebih stabil
        },
    },
    optimizeDeps: {
        force: true, // Force re-optimization
        exclude: [
            'axios',
        ],
        include: [
            'react',
            'react-dom',
            '@inertiajs/react',
            'leaflet',
            'react-leaflet',
        ],
        esbuildOptions: {
            // Fix for Leaflet CommonJS compatibility
            define: {
                global: 'globalThis',
            },
        },
    },
    resolve: {
        alias: {
            // 'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
    define: {
        global: 'globalThis',
    },
});
