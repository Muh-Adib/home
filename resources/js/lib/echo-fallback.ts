// Fallback notification system for when WebSocket is not available
interface NotificationFallback {
    userId: number;
    pollingInterval?: NodeJS.Timeout;
    isPolling: boolean;
    lastFetchTime: number;
    pollIntervalMs: number;
    retryCount: number;
    maxRetries: number;
    startPolling: (callback: (notification: any) => void) => void;
    stopPolling: () => void;
    fetchNotifications: () => Promise<any[]>;
    formatNotification: (notification: any) => any;
}

export function createNotificationFallback(userId: number): NotificationFallback {
    let pollingInterval: NodeJS.Timeout | undefined;
    let isPolling = false;
    let lastFetchTime = Date.now();
    let retryCount = 0;
    const pollIntervalMs = 10000; // 10 seconds
    const maxRetries = 3;

    const fallback: NotificationFallback = {
        userId,
        pollingInterval,
        isPolling,
        lastFetchTime,
        pollIntervalMs,
        retryCount,
        maxRetries,
        startPolling: () => {}, // Will be defined below
        stopPolling: () => {}, // Will be defined below
        fetchNotifications: async () => [], // Will be defined below
        formatNotification: () => ({}), // Will be defined below
    };

    async function fetchNotifications(): Promise<any[]> {
        try {
            console.log('📡 Polling for new notifications...');
            
            const response = await fetch('/notifications/recent?limit=5', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Reset retry count on successful request
            retryCount = 0;
            
            // Check for new notifications based on creation time
            const currentTime = Date.now();
            const newNotifications = (data.notifications || []).filter((notification: any) => {
                const notificationTime = new Date(notification.created_at).getTime();
                return notificationTime > lastFetchTime;
            });

            lastFetchTime = currentTime;
            
            if (newNotifications.length > 0) {
                console.log(`📡 Found ${newNotifications.length} new notifications via polling`);
            }
            
            return newNotifications;
        } catch (error) {
            retryCount++;
            console.warn(`📡 Polling failed (attempt ${retryCount}/${maxRetries}):`, error);
            
            // If max retries reached, increase polling interval
            if (retryCount >= maxRetries) {
                console.warn('📡 Max retries reached, increasing polling interval');
                fallback.pollIntervalMs = Math.min(fallback.pollIntervalMs * 2, 60000); // Max 60 seconds
            }
            
            return [];
        }
    }

    function startPolling(callback: (notification: any) => void): void {
        if (isPolling) {
            console.log('📡 Polling already started');
            return;
        }

        console.log('📡 Starting notification polling fallback');
        isPolling = true;
        retryCount = 0;
        fallback.pollIntervalMs = 10000; // Reset to default interval

        // Initial fetch
        fetchNotifications().then(notifications => {
            notifications.forEach((notification) => {
                const formattedNotification = formatNotification(notification);
                callback(formattedNotification);
            });
        });

        pollingInterval = setInterval(async () => {
            try {
                const notifications = await fetchNotifications();
                
                // Process new notifications
                notifications.forEach((notification) => {
                    const formattedNotification = formatNotification(notification);
                    callback(formattedNotification);
                });

            } catch (error) {
                console.error('📡 Polling error:', error);
                
                // If too many consecutive errors, stop polling and restart with longer interval
                if (retryCount >= maxRetries * 2) {
                    console.error('📡 Too many consecutive errors, restarting with longer interval');
                    stopPolling();
                    fallback.pollIntervalMs = Math.min(fallback.pollIntervalMs * 2, 60000);
                    // Restart with new interval
                    startPolling(callback);
                }
            }
        }, fallback.pollIntervalMs);

        fallback.pollingInterval = pollingInterval;
        fallback.isPolling = isPolling;
    }

    function stopPolling(): void {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = undefined;
        }
        isPolling = false;
        retryCount = 0;
        console.log('📡 Stopped notification polling');
        
        fallback.pollingInterval = pollingInterval;
        fallback.isPolling = isPolling;
        fallback.retryCount = retryCount;
    }

    // Format notification to match WebSocket format
    function formatNotification(notification: any): any {
        return {
            id: notification.id,
            type: notification.type,
            notifiable_type: notification.notifiable_type,
            notifiable_id: notification.notifiable_id,
            data: notification.data,
            read_at: notification.read_at,
            created_at: notification.created_at,
            updated_at: notification.updated_at,
        };
    }

    // Update the fallback object with the actual functions
    fallback.startPolling = startPolling;
    fallback.stopPolling = stopPolling;
    fallback.fetchNotifications = fetchNotifications;
    fallback.formatNotification = formatNotification;

    // Public API
    return fallback;
} 