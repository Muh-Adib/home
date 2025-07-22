import { usePage } from '@inertiajs/react';

export interface AppConfig {
    url: string;
    asset_url?: string;
    env: string;
}

// Non-hook version untuk mendapatkan app config
export const getAppConfig = (): AppConfig => {
    // Fallback values jika tidak ada Inertia context
    return {
        url: window.location.origin,
        asset_url: window.location.origin,
        env: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'local' : 'production'
    };
};

// Hook version untuk use dalam React components
export const useAppConfig = (): AppConfig => {
    try {
        const { props } = usePage();
        return (props as any).app || getAppConfig();
    } catch (error) {
        // Fallback jika hook tidak bisa digunakan
        return getAppConfig();
    }
};

// Build URL dinamis berdasarkan environment (non-hook version)
export const buildUrl = (path: string = '', config?: AppConfig): string => {
    const appConfig = config || getAppConfig();
    const baseUrl = appConfig.url || window.location.origin;
    
    // Remove leading slash if exists
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

// Build asset URL untuk static files (non-hook version)
export const buildAssetUrl = (path: string, config?: AppConfig): string => {
    const appConfig = config || getAppConfig();
    const baseUrl = appConfig.asset_url || appConfig.url || window.location.origin;
    
    // Remove leading slash if exists
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    return `${baseUrl}/${cleanPath}`;
};

// Get WebSocket URL dinamis (non-hook version)
export const getWebSocketUrl = (config?: AppConfig): string => {
    const appConfig = config || getAppConfig();
    
    // Development environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:6001';
    }
    
    // Production - gunakan URL dari config atau fallback ke window.location
    const baseUrl = appConfig.url || window.location.origin;
    return baseUrl.replace(/^http/, 'http'); // Ensure proper protocol
};

// Check if we're in development (non-hook version)
export const isDevelopment = (config?: AppConfig): boolean => {
    const appConfig = config || getAppConfig();
    return appConfig.env === 'local' || 
           window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
};

// Get current domain dari URL
export const getCurrentDomain = (): string => {
    return window.location.hostname;
};

// Get current protocol
export const getCurrentProtocol = (): string => {
    return window.location.protocol;
};

// Build full URL dengan protocol dan domain
export const buildFullUrl = (path: string = ''): string => {
    const protocol = getCurrentProtocol();
    const domain = getCurrentDomain();
    const port = window.location.port ? `:${window.location.port}` : '';
    
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return cleanPath ? `${protocol}//${domain}${port}/${cleanPath}` : `${protocol}//${domain}${port}`;
};

// Export default object dengan semua functions
export default {
    useAppConfig,
    getAppConfig,
    buildUrl,
    buildAssetUrl,
    getWebSocketUrl,
    isDevelopment,
    getCurrentDomain,
    getCurrentProtocol,
    buildFullUrl,
};