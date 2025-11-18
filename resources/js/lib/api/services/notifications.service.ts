/**
 * Notifications API Service
 * Centralized service untuk semua notification-related API calls
 */

import ApiClient from '../client';

export interface Notification {
    id: string;
    type: string;
    notifiable_type: string;
    notifiable_id: number;
    data: {
        title: string;
        message: string;
        action_url?: string;
        booking_number?: string;
        [key: string]: any;
    };
    read_at?: string;
    created_at: string;
    updated_at: string;
}

class NotificationsService {
    /**
     * Get all notifications
     */
    async getAll(): Promise<Notification[]> {
        return ApiClient.get('/notifications');
    }

    /**
     * Get unread notifications
     */
    async getUnread(): Promise<Notification[]> {
        return ApiClient.get('/notifications/unread');
    }

    /**
     * Get recent notifications
     */
    async getRecent(limit: number = 10): Promise<Notification[]> {
        return ApiClient.get(`/notifications/recent?limit=${limit}`);
    }

    /**
     * Get notification count
     */
    async getCount(): Promise<{ unread: number; total: number }> {
        return ApiClient.get('/notifications/count');
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id: string): Promise<Notification> {
        return ApiClient.patch(`/notifications/${id}/read`);
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<void> {
        return ApiClient.patch('/notifications/mark-all-read');
    }

    /**
     * Delete notification
     */
    async delete(id: string): Promise<void> {
        return ApiClient.delete(`/notifications/${id}`);
    }

    /**
     * Clear read notifications
     */
    async clearRead(): Promise<void> {
        return ApiClient.delete('/notifications/clear/read');
    }
}

// Export singleton instance
export const notificationsService = new NotificationsService();
export default notificationsService;



