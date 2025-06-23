// Fallback notification system for when WebSocket is not available
interface NotificationFallback {
    userId: number;
    pollingInterval?: NodeJS.Timeout;
    isPolling: boolean;
    lastFetchTime: number;
    pollIntervalMs: number;
}

export function createNotificationFallback(userId: number): NotificationFallback {
    let pollingInterval: NodeJS.Timeout | undefined;
    let isPolling = false;
    let lastFetchTime = Date.now();
    const pollIntervalMs = 10000; // 10 seconds

    const fallback: NotificationFallback = {
        userId,
        pollingInterval,
        isPolling,
        lastFetchTime,
        pollIntervalMs,
    };

    async function fetchNotifications(): Promise<any[]> {
        try {
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
            
            // Check for new notifications based on creation time
            const currentTime = Date.now();
            const newNotifications = (data.notifications || []).filter((notification: any) => {
                const notificationTime = new Date(notification.created_at).getTime();
                return notificationTime > lastFetchTime;
            });

            lastFetchTime = currentTime;
            
            return newNotifications;
        } catch (error) {
            console.warn('📡 Polling failed:', error);
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

        pollingInterval = setInterval(async () => {
            try {
                const notifications = await fetchNotifications();
                
                // Process new notifications
                notifications.forEach((notification) => {
                    // Format notification to match WebSocket format
                    const formattedNotification = {
                        id: notification.id,
                        type: notification.type,
                        notifiable_type: notification.notifiable_type,
                        notifiable_id: notification.notifiable_id,
                        data: notification.data,
                        read_at: notification.read_at,
                        created_at: notification.created_at,
                        updated_at: notification.updated_at,
                    };
                    
                    callback(formattedNotification);
                });

                if (notifications.length > 0) {
                    console.log(`📡 Polled ${notifications.length} new notifications`);
                }
            } catch (error) {
                console.error('📡 Polling error:', error);
            }
        }, pollIntervalMs);

        fallback.pollingInterval = pollingInterval;
        fallback.isPolling = isPolling;
    }

    function stopPolling(): void {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = undefined;
        }
        isPolling = false;
        console.log('📡 Stopped notification polling');
        
        fallback.pollingInterval = pollingInterval;
        fallback.isPolling = isPolling;
    }

    // Public API
    return {
        ...fallback,
        startPolling,
        stopPolling,
        fetchNotifications,
    };
} 