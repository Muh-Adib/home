import Echo from 'laravel-echo';
import io from 'socket.io-client';
import { createNotificationFallback } from './echo-fallback';

// Make Socket.IO client available globally for Echo
declare global {
    interface Window {
        io: typeof io;
        Echo: Echo<any> | null;
        NotificationFallback: any;
    }
}

// Setup Socket.IO for Laravel Echo
window.io = io;

let echoInstance: Echo<any> | null = null;

// Get WebSocket URL without using React hooks
function getWebSocketUrlSafe(): string {
    // Development environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:6001';
    }
    
    // Production - gunakan URL dari window.location
    const baseUrl = window.location.origin;
    return baseUrl.replace(/^http/, 'http'); // Ensure proper protocol
}

// Enhanced Echo configuration with error handling
function createEchoInstance(): Echo<any> | null {
    try {
        // Get WebSocket URL dinamis dari utility function (non-hook version)
        const wsUrl = getWebSocketUrlSafe();

        const echo = new Echo({
            broadcaster: 'socket.io',
            host: wsUrl,
            // Auth configuration for private channels
            auth: {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
                },
            },
            // Socket.IO client options (updated for latest version)
            client: io,
            // Additional options for better connection handling
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true,
            reconnection: true,
            reconnectionAttempts: 3, // Reduced attempts for faster fallback
            reconnectionDelay: 1000,
            timeout: 10000, // Reduced timeout for faster fallback
            forceNew: false,
        });

        // Connection event handlers - check if socket exists
        const socket = (echo.connector as any)?.socket;
        if (socket) {
            socket.on('connect', () => {
                console.log('✅ Echo connected to server');
            });

            socket.on('disconnect', () => {
                console.log('❌ Echo disconnected from server');
            });

            socket.on('connect_error', (error: any) => {
                console.warn('🔄 Echo connection error, will use polling fallback:', error.message);
            });
        }

        return echo;
    } catch (error) {
        console.error('❌ Failed to create Echo instance:', error);
        return null;
    }
}

// Initialize Echo with fallback - delay initialization until DOM is ready
function initializeEcho(): Echo<any> | null {
    try {
        // Only initialize if we're in a browser environment
        if (typeof window === 'undefined') {
            return null;
        }

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                echoInstance = createEchoInstance();
            });
            return null;
        }

        echoInstance = createEchoInstance();
        
        // Test connection after short delay
        setTimeout(() => {
            const socket = (echoInstance?.connector as any)?.socket;
            if (echoInstance && socket && !socket.connected) {
                console.warn('🔄 Echo not connected after timeout, fallback will be used');
            }
        }, 5000);

        return echoInstance;
    } catch (error) {
        console.error('❌ Echo initialization failed:', error);
        return null;
    }
}

// Initialize Echo when DOM is ready
let echo: Echo<any> | null = null;

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            echo = initializeEcho();
            window.Echo = echo;
            window.NotificationFallback = createNotificationFallback;
        });
    } else {
        echo = initializeEcho();
        window.Echo = echo;
        window.NotificationFallback = createNotificationFallback;
    }
}

// Check if Echo is working
export const isEchoAvailable = (): boolean => {
    const socket = (echo?.connector as any)?.socket;
    return socket?.connected || false;
};

// Get Echo instance with fallback info
export const getEcho = () => {
    return {
        echo,
        isAvailable: isEchoAvailable(),
        createFallback: createNotificationFallback,
    };
};

// Export for use in React components
export { echo };
export default echo; 