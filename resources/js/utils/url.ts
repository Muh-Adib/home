import { usePage } from '@inertiajs/react';

export interface AppConfig {
    url: string;
    asset_url?: string;
    env: string;
}

// Get app configuration from Inertia shared data
export const useAppConfig = (): AppConfig => {
    const { props } = usePage();
    return (props as any).app || {
        url: window.location.origin,
        asset_url: window.location.origin,
        env: 'production'
    };
};

// Build URL dinamis berdasarkan environment
export const buildUrl = (path: string = ''): string => {
    const config = useAppConfig();
    const baseUrl = config.url || window.location.origin;
    
    // Remove leading slash if exists
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

// Build asset URL untuk static files
export const buildAssetUrl = (path: string): string => {
    const config = useAppConfig();
    const baseUrl = config.asset_url || config.url || window.location.origin;
    
    // Remove leading slash if exists
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    return `${baseUrl}/${cleanPath}`;
};

// Get WebSocket URL dinamis
export const getWebSocketUrl = (): string => {
    const config = useAppConfig();
    
    // Development environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:6001';
    }
    
    // Production - gunakan URL dari config atau fallback ke window.location
    const baseUrl = config.url || window.location.origin;
    return baseUrl.replace(/^http/, 'http'); // Ensure proper protocol
};

// Check if we're in development
export const isDevelopment = (): boolean => {
    const config = useAppConfig();
    return config.env === 'local' || 
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
    buildUrl,
    buildAssetUrl,
    getWebSocketUrl,
    isDevelopment,
    getCurrentDomain,
    getCurrentProtocol,
    buildFullUrl,
};