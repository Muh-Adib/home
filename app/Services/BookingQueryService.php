<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class BookingQueryService
{
    /**
     * Get bookings for timeline view, applying date-range overlap logic,
     * role-based filtering, property filter, and status filter.
     *
     * Used by both timeline() and timelineView() controller methods.
     */
    public function getTimelineBookings(
        string $startDate,
        string $endDate,
        ?string $propertyId,
        ?string $status,
        User $user
    ): Collection {
        return $this->buildTimelineQuery($startDate, $endDate, $propertyId, $status, $user)
            ->orderBy('check_in')
            ->get()
            ->map(function ($booking) {
                $booking->status_color = $booking->getStatusColor();
                return $booking;
            });
    }

    /**
     * Build the base Eloquent query for timeline bookings.
     *
     * Handles:
     * - Date-range overlap (check_in in range, check_out in range, or booking spans entire range)
     * - Role-based filter for property_owner
     * - Optional property_id filter
     * - Optional status filter
     */
    private function buildTimelineQuery(
        string $startDate,
        string $endDate,
        ?string $propertyId,
        ?string $status,
        User $user
    ): Builder {
        $query = Booking::query()
            ->with(['property'])
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('check_in', [$startDate, $endDate])
                    ->orWhereBetween('check_out', [$startDate, $endDate])
                    ->orWhere(function ($q) use ($startDate, $endDate) {
                        $q->where('check_in', '<=', $startDate)
                            ->where('check_out', '>=', $endDate);
                    });
            });

        if ($user->role === 'property_owner') {
            $query->whereHas('property', function ($query) use ($user) {
                $query->where('owner_id', $user->id);
            });
        }

        if ($propertyId !== null && $propertyId !== 'all') {
            $query->where('property_id', $propertyId);
        }

        if ($status !== null && $status !== 'all') {
            $query->where('booking_status', $status);
        }

        return $query;
    }
}
