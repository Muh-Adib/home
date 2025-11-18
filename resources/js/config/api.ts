// API Configuration for React
export const API_CONFIG = {
    // Base URL - gunakan relative path untuk same-origin requests
    BASE_URL: '', // Empty string untuk relative URLs (same-origin)
    
    // WebSocket URL - force HTTPS di production
    WS_URL: process.env.NODE_ENV === 'production'
        ? 'https://' + window.location.hostname + ':6001'
        : 'http://localhost:6001',
    
    // CORS Configuration
    CORS: {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        }
    },
    
    // Timeout settings
    TIMEOUT: 30000,
    
    // Retry configuration
    RETRY: {
        attempts: 3,
        delay: 1000,
    }
};

// Environment-specific configurations
export const ENV_CONFIG = {
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
    
    // Feature flags
    features: {
        websocket: true,
        notifications: true,
        realTimeUpdates: true,
    }
};

// API Endpoints
export const API_ENDPOINTS = {
    // Auth endpoints
    auth: {
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        register: '/api/auth/register',
        refresh: '/api/auth/refresh',
    },
    
    // Property endpoints
    properties: {
        index: '/api/properties',
        show: (id: string | number) => `/api/properties/${id}`,
        create: '/api/properties',
        update: (id: string | number) => `/api/properties/${id}`,
        delete: (id: string | number) => `/api/properties/${id}`,
    },
    
    // Booking endpoints
    bookings: {
        index: '/api/bookings',
        show: (id: string | number) => `/api/bookings/${id}`,
        create: '/api/bookings',
        update: (id: string | number) => `/api/bookings/${id}`,
        cancel: (id: string | number) => `/api/bookings/${id}/cancel`,
    },
    
    // Payment endpoints
    payments: {
        index: '/api/payments',
        show: (id: string | number) => `/api/payments/${id}`,
        create: '/api/payments',
        verify: (id: string | number) => `/api/payments/${id}/verify`,
    },
    
    // Broadcasting endpoints
    broadcasting: {
        auth: '/broadcasting/auth',
    }
};

// Utility functions
export const apiUtils = {
    // Get full URL for API endpoint
    getFullUrl: (endpoint: string): string => {
        return API_CONFIG.BASE_URL + endpoint;
    },
    
    // Get WebSocket URL
    getWebSocketUrl: (): string => {
        return API_CONFIG.WS_URL;
    },
    
    // Check if running on HTTPS
    isHttps: (): boolean => {
        return window.location.protocol === 'https:';
    },
    
    // Get CSRF token
    getCsrfToken: (): string => {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    },
    
    // Get auth token
    getAuthToken: (): string => {
        return localStorage.getItem('auth_token') || '';
    }
};
