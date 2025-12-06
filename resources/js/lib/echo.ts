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
let isEchoAvailable = false;

// Get WebSocket URL without using React hooks
function getWebSocketUrlSafe(): string {
    // Development environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('.test')) {
        return `${window.location.protocol}//${window.location.hostname}:6001`;
    }

    // Production - gunakan URL dari window.location dengan port WebSocket
    const baseUrl = window.location.origin;
    // Force HTTPS for WebSocket in production
    const wsUrl = baseUrl.replace(/^http:/, 'https:').replace(/^https:/, 'https:');
    return wsUrl.replace(/:\d+/, ':6001'); // Replace port with WebSocket port
}

// Test WebSocket connection
async function testWebSocketConnection(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors', // Avoid CORS issues
        });
        return true;
    } catch (error) {
        console.warn('WebSocket connection test failed:', error);
        return false;
    }
}

// Enhanced Echo configuration with error handling
function createEchoInstance(): Echo<any> | null {
    try {
        // Get WebSocket URL dinamis dari utility function (non-hook version)
        const wsUrl = getWebSocketUrlSafe();

        console.log('🔌 Creating Echo instance with URL:', wsUrl);

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
            reconnectionAttempts: 5, // Increased for production
            reconnectionDelay: 1000,
            timeout: 20000, // Increased timeout for production
            forceNew: false,
        });

        // Connection event handlers - check if socket exists
        const socket = (echo.connector as any)?.socket;
        if (socket) {
            socket.on('connect', () => {
                console.log('✅ Echo connected to server');
                isEchoAvailable = true;
            });

            socket.on('disconnect', () => {
                console.log('❌ Echo disconnected from server');
                isEchoAvailable = false;
            });

            socket.on('connect_error', (error: any) => {
                console.warn('🔄 Echo connection error, will use polling fallback:', error.message);
                isEchoAvailable = false;
            });

            socket.on('reconnect', () => {
                console.log('✅ Echo reconnected to server');
                isEchoAvailable = true;
            });

            socket.on('reconnect_error', (error: any) => {
                console.warn('🔄 Echo reconnection error:', error.message);
                isEchoAvailable = false;
            });
        }

        return echo;
    } catch (error) {
        console.error('❌ Failed to create Echo instance:', error);
        isEchoAvailable = false;
        return null;
    }
}

// Initialize Echo with fallback - delay initialization until DOM is ready
function initializeEcho(): Echo<any> | null {
    try {
        if (typeof window === 'undefined') {
            return null;
        }

        if (!echoInstance) {
            echoInstance = createEchoInstance();

            // Test connection after a short delay
            setTimeout(async () => {
                if (echoInstance) {
                    const wsUrl = getWebSocketUrlSafe();
                    const isConnected = await testWebSocketConnection(wsUrl);

                    if (!isConnected) {
                        console.warn('🔄 WebSocket connection test failed, fallback will be used');
                        isEchoAvailable = false;
                    } else {
                        console.log('✅ WebSocket connection test successful');
                        isEchoAvailable = true;
                    }
                }
            }, 2000);
        }

        return echoInstance;
    } catch (error) {
        console.error('❌ Failed to initialize Echo:', error);
        isEchoAvailable = false;
        return null;
    }
}

// Export functions untuk use di hooks
export function getEcho(): { echo: Echo<any> | null; isAvailable: boolean } {
    const echo = initializeEcho();

    // Check if Echo is actually working
    const socket = (echo?.connector as any)?.socket;
    const isSocketConnected = socket?.connected || false;

    // Update availability based on actual connection status
    isEchoAvailable = isEchoAvailable && isSocketConnected;

    return {
        echo,
        isAvailable: isEchoAvailable
    };
}

// Export default Echo instance untuk backward compatibility
export default getEcho().echo;

// Export utility functions
export { createNotificationFallback };
export { getWebSocketUrlSafe };
export { testWebSocketConnection }; 