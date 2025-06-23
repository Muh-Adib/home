import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { getEcho } from '@/lib/echo';
import { createNotificationFallback } from '@/lib/echo-fallback';

export interface Notification {
    id: string;
    type: string;
    data: {
        type: string;
        title: string;
        message: string;
        data: any;
        action_url?: string;
        icon?: string;
        color?: string;
    };
    read_at: string | null;
    created_at: string;
}

export interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
}

export interface UseNotificationsReturn {
    // State
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    
    // Actions
    fetchNotifications: () => Promise<void>;
    fetchRecentNotifications: (limit?: number) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    clearReadNotifications: () => Promise<void>;
    
    // Real-time
    isConnected: boolean;
    connectionMode: 'websocket' | 'polling' | 'disconnected';
}

export function useNotifications(userId?: number): UseNotificationsReturn {
    const [state, setState] = useState<NotificationState>({
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: null,
    });
    
    const [isConnected, setIsConnected] = useState(false);
    const [connectionMode, setConnectionMode] = useState<'websocket' | 'polling' | 'disconnected'>('disconnected');

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const response = await fetch('/notifications');
            const data = await response.json();
            
            setState(prev => ({
                ...prev,
                notifications: data.notifications.data || [],
                unreadCount: data.unread_count || 0,
                loading: false,
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: 'Failed to fetch notifications',
                loading: false,
            }));
            console.error('Error fetching notifications:', error);
        }
    }, []);

    // Fetch recent notifications for dropdown
    const fetchRecentNotifications = useCallback(async (limit: number = 5) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const response = await fetch(`/notifications/recent?limit=${limit}`);
            const data = await response.json();
            
            setState(prev => ({
                ...prev,
                notifications: data.notifications || [],
                unreadCount: data.unread_count || 0,
                loading: false,
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: 'Failed to fetch notifications',
                loading: false,
            }));
            console.error('Error fetching recent notifications:', error);
        }
    }, []);

    // Mark notification as read
    const markAsRead = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/notifications/${id}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            
            const data = await response.json();
            
            setState(prev => ({
                ...prev,
                notifications: prev.notifications.map(notification =>
                    notification.id === id
                        ? { ...notification, read_at: new Date().toISOString() }
                        : notification
                ),
                unreadCount: data.unread_count || 0,
            }));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            const response = await fetch('/notifications/mark-all-read', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            
            await response.json();
            
            setState(prev => ({
                ...prev,
                notifications: prev.notifications.map(notification => ({
                    ...notification,
                    read_at: notification.read_at || new Date().toISOString(),
                })),
                unreadCount: 0,
            }));
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }, []);

    // Delete notification
    const deleteNotification = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            
            const data = await response.json();
            
            setState(prev => ({
                ...prev,
                notifications: prev.notifications.filter(notification => notification.id !== id),
                unreadCount: data.unread_count || 0,
            }));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }, []);

    // Clear read notifications
    const clearReadNotifications = useCallback(async () => {
        try {
            const response = await fetch('/notifications/clear/read', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            
            const data = await response.json();
            
            setState(prev => ({
                ...prev,
                notifications: prev.notifications.filter(notification => !notification.read_at),
                unreadCount: data.unread_count || 0,
            }));
        } catch (error) {
            console.error('Error clearing read notifications:', error);
        }
    }, []);

    // Handle new notification (used by both WebSocket and polling)
    const handleNewNotification = useCallback((notification: any) => {
        console.log('🔔 New notification received:', notification);
        
        setState(prev => ({
            ...prev,
            notifications: [notification, ...prev.notifications],
            unreadCount: prev.unreadCount + 1,
        }));
        
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            const browserNotification = new Notification(notification.data?.title || 'New Notification', {
                body: notification.data?.message || 'You have a new notification',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id,
                requireInteraction: false,
                silent: false,
            });

            setTimeout(() => {
                browserNotification.close();
            }, 5000);

            browserNotification.onclick = () => {
                window.focus();
                if (notification.data?.action_url) {
                    window.location.href = notification.data.action_url;
                }
                browserNotification.close();
            };
        }
    }, []);

    // Setup real-time listeners with WebSocket and polling fallback
    useEffect(() => {
        if (!userId) return;

        const { echo, isAvailable } = getEcho();
        let fallbackInstance: any = null;
        let connectionCheckInterval: NodeJS.Timeout;

        // Try WebSocket first
        if (echo && isAvailable) {
            try {
                const userChannel = echo.private(`user.${userId}`);
                
                userChannel.notification((notification: any) => {
                    handleNewNotification(notification);
                });

                userChannel.subscribed(() => {
                    setIsConnected(true);
                    setConnectionMode('websocket');
                    console.log('✅ WebSocket connected for notifications');
                });

                userChannel.error((error: any) => {
                    console.warn('❌ WebSocket error, switching to polling:', error);
                    setConnectionMode('polling');
                    
                    // Switch to polling fallback
                    if (!fallbackInstance) {
                        fallbackInstance = createNotificationFallback(userId);
                        fallbackInstance.startPolling(handleNewNotification);
                    }
                });

                // Monitor connection status
                connectionCheckInterval = setInterval(() => {
                    if (echo.connector?.socket?.connected) {
                        setIsConnected(true);
                        setConnectionMode('websocket');
                    } else {
                        setIsConnected(false);
                        setConnectionMode('polling');
                        
                        // Start polling fallback if not already started
                        if (!fallbackInstance) {
                            fallbackInstance = createNotificationFallback(userId);
                            fallbackInstance.startPolling(handleNewNotification);
                        }
                    }
                }, 5000);

            } catch (error) {
                console.warn('❌ WebSocket setup failed, using polling:', error);
                setConnectionMode('polling');
            }
        } else {
            console.warn('🔄 WebSocket not available, using polling fallback');
            setConnectionMode('polling');
        }

        // If WebSocket is not available or fails, use polling fallback
        if (!echo || !isAvailable) {
            fallbackInstance = createNotificationFallback(userId);
            fallbackInstance.startPolling(handleNewNotification);
            setIsConnected(true); // Polling is considered "connected"
        }

        // Cleanup
        return () => {
            if (connectionCheckInterval) {
                clearInterval(connectionCheckInterval);
            }
            
            if (fallbackInstance) {
                fallbackInstance.stopPolling();
            }
            
            try {
                if (echo) {
                    echo.leave(`user.${userId}`);
                }
            } catch (error) {
                console.warn('Error leaving channel:', error);
            }
        };
    }, [userId, handleNewNotification]);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    return {
        // State
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        loading: state.loading,
        error: state.error,
        
        // Actions
        fetchNotifications,
        fetchRecentNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearReadNotifications,
        
        // Real-time
        isConnected,
        connectionMode,
    };
}

 