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
    esbuild: {
        jsx: 'automatic',
        drop: ['console', 'debugger'],
        // Tambahan konfigurasi untuk mengatasi EPIPE error
        target: 'es2020',
    },
    resolve: {
        alias: {
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
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
        hmr: {
            overlay: false, // Disable error overlay yang bisa menyebabkan crash
        },
        watch: {
            usePolling: true, // Gunakan polling untuk file watching yang lebih stabil
        },
    },
    optimizeDeps: {
        force: true, // Force re-optimization
    },
});
