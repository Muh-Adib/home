// Notification System Test Utilities
// Untuk testing WebSocket dan polling fallback

import { getEcho } from './echo';
import { createNotificationFallback } from './echo-fallback';

export interface NotificationTestResult {
    websocket: {
        available: boolean;
        connected: boolean;
        error?: string;
    };
    polling: {
        available: boolean;
        working: boolean;
        error?: string;
    };
    overall: {
        status: 'working' | 'partial' | 'failed';
        message: string;
    };
}

export async function testNotificationSystem(userId: number): Promise<NotificationTestResult> {
    const result: NotificationTestResult = {
        websocket: { available: false, connected: false },
        polling: { available: false, working: false },
        overall: { status: 'failed', message: 'Testing...' }
    };

    console.log('🧪 Testing notification system...');

    // Test WebSocket
    try {
        const { echo, isAvailable } = getEcho();
        
        result.websocket.available = isAvailable;
        
        if (echo && isAvailable) {
            const socket = (echo.connector as any)?.socket;
            result.websocket.connected = socket?.connected || false;
            
            if (result.websocket.connected) {
                console.log('✅ WebSocket is available and connected');
            } else {
                console.log('⚠️ WebSocket is available but not connected');
                result.websocket.error = 'Socket not connected';
            }
        } else {
            console.log('❌ WebSocket is not available');
            result.websocket.error = 'Echo not available';
        }
    } catch (error) {
        console.error('❌ WebSocket test failed:', error);
        result.websocket.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test Polling
    try {
        const fallback = createNotificationFallback(userId);
        
        // Test if we can fetch notifications
        const notifications = await fallback.fetchNotifications();
        
        result.polling.available = true;
        result.polling.working = true;
        
        console.log('✅ Polling fallback is working');
    } catch (error) {
        console.error('❌ Polling test failed:', error);
        result.polling.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Determine overall status
    if (result.websocket.connected && result.polling.working) {
        result.overall.status = 'working';
        result.overall.message = 'Both WebSocket and polling are working';
    } else if (result.polling.working) {
        result.overall.status = 'partial';
        result.overall.message = 'Polling is working, WebSocket may be unavailable';
    } else {
        result.overall.status = 'failed';
        result.overall.message = 'Both WebSocket and polling are not working';
    }

    console.log('📊 Test Results:', result);
    return result;
}

export function logNotificationStatus(userId: number): void {
    console.log('🔍 Checking notification system status...');
    
    const { echo, isAvailable } = getEcho();
    
    console.log('WebSocket Status:');
    console.log('- Available:', isAvailable);
    console.log('- Echo instance:', echo ? 'Created' : 'Not created');
    
    if (echo) {
        const socket = (echo.connector as any)?.socket;
        console.log('- Socket connected:', socket?.connected || false);
        console.log('- Socket readyState:', socket?.readyState);
    }
    
    console.log('Polling Status:');
    try {
        const fallback = createNotificationFallback(userId);
        console.log('- Fallback created:', !!fallback);
        console.log('- Polling interval:', fallback.pollIntervalMs);
    } catch (error) {
        console.log('- Fallback error:', error);
    }
}

export function createTestNotification(userId: number): void {
    console.log('🧪 Creating test notification...');
    
    fetch('/test-notification', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
            user_id: userId,
            title: 'Test Notification',
            message: 'This is a test notification from the client',
            type: 'test'
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Test notification created:', data);
    })
    .catch(error => {
        console.error('❌ Failed to create test notification:', error);
    });
}

// Export untuk use di browser console
if (typeof window !== 'undefined') {
    (window as any).NotificationTest = {
        testNotificationSystem,
        logNotificationStatus,
        createTestNotification
    };
} 