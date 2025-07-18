import Echo from 'laravel-echo';
import io from 'socket.io-client';
import { createNotificationFallback } from './echo-fallback';

// Make Socket.IO client available globally for Echo
declare global {
    interface Window {
        io: typeof io;
        Echo: Echo | null;
        NotificationFallback: any;
    }
}

// Setup Socket.IO for Laravel Echo
window.io = io;

let echoInstance: Echo | null = null;

// Enhanced Echo configuration with error handling
function createEchoInstance(): Echo | null {
    try {
        // Determine WebSocket URL based on environment
        const getWebSocketUrl = () => {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'http://localhost:6001';
            }
            
            // Production - use same domain with different path
            // WebSocket will be proxied through nginx at /socket.io/
            return window.location.origin;
        };

        const echo = new Echo({
            broadcaster: 'socket.io',
            host: getWebSocketUrl(),
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

        // Connection event handlers
        echo.connector.socket.on('connect', () => {
            console.log('✅ Echo connected to server');
        });

        echo.connector.socket.on('disconnect', () => {
            console.log('❌ Echo disconnected from server');
        });

        echo.connector.socket.on('connect_error', (error: any) => {
            console.warn('🔄 Echo connection error, will use polling fallback:', error.message);
        });

        return echo;
    } catch (error) {
        console.error('❌ Failed to create Echo instance:', error);
        return null;
    }
}

// Initialize Echo with fallback
function initializeEcho(): Echo | null {
    try {
        echoInstance = createEchoInstance();
        
        // Test connection after short delay
        setTimeout(() => {
            if (echoInstance && !echoInstance.connector?.socket?.connected) {
                console.warn('🔄 Echo not connected after timeout, fallback will be used');
            }
        }, 5000);

        return echoInstance;
    } catch (error) {
        console.error('❌ Echo initialization failed:', error);
        return null;
    }
}

// Initialize Echo
const echo = initializeEcho();

// Make available globally
window.Echo = echo;
window.NotificationFallback = createNotificationFallback;

// Check if Echo is working
export const isEchoAvailable = (): boolean => {
    return echo?.connector?.socket?.connected || false;
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