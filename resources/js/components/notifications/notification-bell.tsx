import React, { useEffect } from 'react';
import { Bell, X, Trash2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Notification, useNotifications } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface NotificationBellProps {
    userId: number;
    className?: string;
}

export function NotificationBell({ userId, className = '' }: NotificationBellProps) {
    const {
        notifications,
        unreadCount,
        loading,
        error,
        fetchRecentNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearReadNotifications,
        isConnected,
        connectionMode,
    } = useNotifications(userId);

    // Load initial notifications
    useEffect(() => {
        fetchRecentNotifications(10);
    }, [fetchRecentNotifications]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read_at) {
            await markAsRead(notification.id);
        }
        
        if (notification.data.action_url) {
            window.location.href = notification.data.action_url;
        }
    };

    const getConnectionIcon = () => {
        switch (connectionMode) {
            case 'websocket':
                return <Wifi className="h-3 w-3 text-green-500" />;
            case 'polling':
                return <RefreshCw className="h-3 w-3 text-blue-500" />;
            default:
                return <WifiOff className="h-3 w-3 text-red-500" />;
        }
    };

    const getConnectionText = () => {
        switch (connectionMode) {
            case 'websocket':
                return 'Real-time (WebSocket)';
            case 'polling':
                return 'Auto-refresh (Polling)';
            default:
                return 'Disconnected';
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`relative p-2 hover:bg-sidebar-accent ${className}`}
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-96">
                <DropdownMenuLabel className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold">Notifikasi</h4>
                            {getConnectionIcon()}
                            <span className="text-xs text-muted-foreground">
                                {getConnectionText()}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchRecentNotifications(10)}
                                disabled={loading}
                                className="h-6 px-2 text-xs"
                            >
                                Refresh
                            </Button>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={markAllAsRead}
                                    className="h-6 px-2 text-xs"
                                >
                                    Mark All Read
                                </Button>
                            )}
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                        </p>
                    )}
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md mx-2 my-2">
                        {error}
                    </div>
                )}

                <ScrollArea className="h-96">
                    {loading && notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading notifications...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications yet
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`group flex items-start gap-3 p-3 hover:bg-sidebar-accent cursor-pointer transition-colors ${
                                        !notification.read_at ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h5 className="text-sm font-medium truncate">
                                                {notification.data.title}
                                            </h5>
                                            {!notification.read_at && (
                                                <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {notification.data.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDistanceToNow(new Date(notification.created_at), {
                                                addSuffix: true,
                                                locale: id,
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!notification.read_at && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                                className="h-6 w-6 p-0"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notification.id);
                                            }}
                                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {notifications.some(n => n.read_at) && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearReadNotifications}
                                className="w-full text-xs"
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Clear Read Notifications
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 