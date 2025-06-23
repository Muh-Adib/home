<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get user notifications with pagination
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $notifications = $user->notifications()
            ->latest()
            ->paginate($request->get('per_page', 10));

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    /**
     * Get only unread notifications
     */
    public function unread(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $notifications = $user->unreadNotifications()
            ->latest()
            ->paginate($request->get('per_page', 10));

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    /**
     * Mark a specific notification as read
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        
        $notification = $user->notifications()->find($id);

        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read',
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(): JsonResponse
    {
        $user = Auth::user();
        
        $user->unreadNotifications()->markAsRead();

        return response()->json([
            'message' => 'All notifications marked as read',
            'unread_count' => 0,
        ]);
    }

    /**
     * Delete a notification
     */
    public function destroy(string $id): JsonResponse
    {
        $user = Auth::user();
        
        $notification = $user->notifications()->find($id);

        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        $notification->delete();

        return response()->json([
            'message' => 'Notification deleted',
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    /**
     * Get notification count for navbar
     */
    public function count(): JsonResponse
    {
        $user = Auth::user();
        
        return response()->json([
            'unread_count' => $user->unreadNotifications()->count(),
            'total_count' => $user->notifications()->count(),
        ]);
    }

    /**
     * Get recent notifications for dropdown
     */
    public function recent(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $limit = $request->get('limit', 5);
        
        $notifications = $user->notifications()
            ->latest()
            ->limit($limit)
            ->get();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $user->unreadNotifications()->count(),
            'has_more' => $user->notifications()->count() > $limit,
        ]);
    }

    /**
     * Clear all read notifications
     */
    public function clearRead(): JsonResponse
    {
        $user = Auth::user();
        
        $deleted = $user->readNotifications()->delete();

        return response()->json([
            'message' => "Deleted {$deleted} read notifications",
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }
}
