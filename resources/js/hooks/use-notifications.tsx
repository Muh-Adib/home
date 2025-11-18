import { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import { getEcho } from '@/lib/echo';
import { createNotificationFallback } from '@/lib/echo-fallback';
import { notificationsService } from '@/lib/api';

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
    
    // Refs untuk cleanup
    const fallbackInstanceRef = useRef<any>(null);
    const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const echoChannelsRef = useRef<any[]>([]);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const data = await notificationsService.getAll();
            
            setState(prev => ({
                ...prev,
                notifications: Array.isArray(data) ? data : (data as any).notifications?.data || [],
                unreadCount: (data as any).unread_count || 0,
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
            const data = await notificationsService.getRecent(limit);
            
            setState(prev => ({
                ...prev,
                notifications: Array.isArray(data) ? data : [],
                unreadCount: (data as any).unread_count || 0,
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
            await notificationsService.markAsRead(id);
            
            setState(prev => ({
                ...prev,
                notifications: prev.notifications.map(notification =>
                    notification.id === id
                        ? { ...notification, read_at: new Date().toISOString() }
                        : notification
                ),
                unreadCount: Math.max(0, prev.unreadCount - 1),
            }));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            await notificationsService.markAllAsRead();
            
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
            await notificationsService.delete(id);
            
            setState(prev => {
                const notification = prev.notifications.find(n => n.id === id);
                return {
                    ...prev,
                    notifications: prev.notifications.filter(notification => notification.id !== id),
                    unreadCount: notification && !notification.read_at ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
                };
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }, []);

    // Clear read notifications
    const clearReadNotifications = useCallback(async () => {
        try {
            await notificationsService.clearRead();
            
            setState(prev => ({
                ...prev,
                notifications: prev.notifications.filter(notification => !notification.read_at),
            }));
        } catch (error) {
            console.error('Error clearing read notifications:', error);
        }
    }, []);

    // Handle new notification (used by both WebSocket and polling)
    const handleNewNotification = useCallback((notification: any) => {
        console.log('🔔 New notification received:', notification);
        
        // Check if notification already exists to avoid duplicates
        setState(prev => {
            const exists = prev.notifications.some(n => n.id === notification.id);
            if (exists) {
                return prev;
            }
            
            return {
            ...prev,
            notifications: [notification, ...prev.notifications],
            unreadCount: prev.unreadCount + 1,
            };
        });
        
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            const browserNotification = new Notification(notification.data?.title || 'New Notification', {
                body: notification.data?.message || 'You have a new notification',
                icon: '/logo.svg',
                badge: '/logo.svg',
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

    // Start polling fallback
    const startPollingFallback = useCallback(() => {
        if (!userId) return;
        
        console.log('📡 Starting polling fallback for notifications');
        setConnectionMode('polling');
        setIsConnected(true);
        
        // Stop existing fallback if any
        if (fallbackInstanceRef.current) {
            fallbackInstanceRef.current.stopPolling();
        }
        
        // Create new fallback instance
        fallbackInstanceRef.current = createNotificationFallback(userId);
        fallbackInstanceRef.current.startPolling(handleNewNotification);
    }, [userId, handleNewNotification]);

    // Stop polling fallback
    const stopPollingFallback = useCallback(() => {
        if (fallbackInstanceRef.current) {
            fallbackInstanceRef.current.stopPolling();
            fallbackInstanceRef.current = null;
        }
    }, []);

    // Setup real-time listeners with WebSocket and polling fallback
    useEffect(() => {
        if (!userId) return;

        const { echo, isAvailable } = getEcho();
        let websocketConnected = false;

        // Function untuk setup WebSocket channels
        const setupWebSocketChannels = () => {
            if (!echo || !isAvailable) {
                console.warn('🔄 WebSocket not available, using polling fallback');
                startPollingFallback();
                return;
            }

            try {
                console.log('🔌 Setting up WebSocket channels...');
                
                const channels = [
                    echo.private(`user.${userId}`),
                    echo.channel('admin-notifications'),
                    echo.channel('staff-notifications')
                ];
                
                echoChannelsRef.current = channels;

                // Setup event listeners for each channel
                channels.forEach((channel, index) => {
                    const channelName = index === 0 ? `user.${userId}` : 
                                     index === 1 ? 'admin-notifications' : 'staff-notifications';
                    
                    channel.notification((notification: any) => {
                        console.log(`🔔 Notification from ${channelName}:`, notification);
                    handleNewNotification(notification);
                });

                    channel.subscribed(() => {
                        console.log(`✅ Subscribed to ${channelName}`);
                        if (index === 0) { // User channel
                    setIsConnected(true);
                    setConnectionMode('websocket');
                            websocketConnected = true;
                            
                            // Stop polling if WebSocket is working
                            stopPollingFallback();
                        }
                    });

                    channel.error((error: any) => {
                        console.warn(`❌ ${channelName} error:`, error);
                        if (index === 0) { // User channel error
                    setConnectionMode('polling');
                            setIsConnected(false);
                            websocketConnected = false;
                            
                            // Start polling fallback
                            startPollingFallback();
                        }
                    });
                });

            } catch (error) {
                console.error('❌ WebSocket setup failed:', error);
                setConnectionMode('polling');
                startPollingFallback();
            }
        };

        // Setup WebSocket channels
        setupWebSocketChannels();

        // Monitor connection status for Pusher
        connectionCheckIntervalRef.current = setInterval(() => {
            if (echo && isAvailable) {
                const pusher = (echo.connector as any)?.pusher;
                const isPusherConnected = pusher?.connection?.state === 'connected';
                
                if (isPusherConnected && !websocketConnected) {
                    console.log('✅ Pusher reconnected');
                    setConnectionMode('websocket');
                    setIsConnected(true);
                    websocketConnected = true;
                    stopPollingFallback();
                } else if (!isPusherConnected && websocketConnected) {
                    console.log('❌ Pusher disconnected, switching to polling');
                    setConnectionMode('polling');
                    setIsConnected(false);
                    websocketConnected = false;
                    startPollingFallback();
                }
            } else {
                // WebSocket not available, ensure polling is running
                if (connectionMode !== 'polling') {
                    console.log('🔄 WebSocket not available, ensuring polling is active');
                    setConnectionMode('polling');
                    startPollingFallback();
                }
            }
        }, 5000);

        // Cleanup function
        return () => {
            console.log('🧹 Cleaning up notification listeners');
            
            // Clear connection check interval
            if (connectionCheckIntervalRef.current) {
                clearInterval(connectionCheckIntervalRef.current);
                connectionCheckIntervalRef.current = null;
            }
            
            // Stop polling fallback
            stopPollingFallback();
            
            // Leave WebSocket channels
            try {
                if (echo && echoChannelsRef.current.length > 0) {
                    echoChannelsRef.current.forEach(channel => {
                        try {
                            channel.unsubscribe();
                        } catch (error) {
                            console.warn('Error unsubscribing from channel:', error);
                        }
                    });
                    echoChannelsRef.current = [];
                }
            } catch (error) {
                console.warn('Error leaving WebSocket channels:', error);
            }
        };
    }, [userId, handleNewNotification, startPollingFallback, stopPollingFallback, connectionMode]);

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

 