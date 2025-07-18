<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Property;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class CleaningDashboardController extends Controller
{
    public function index()
    {
        // Properties that checked out today and need cleaning
        $needsCleaning = Booking::whereDate('check_out', today())
            ->where('booking_status', 'checked_out')
            ->where('is_cleaned', false)
            ->with(['property:id,name,address,current_keybox_code', 'guests'])
            ->get()
            ->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'property_name' => $booking->property->name,
                    'property_address' => $booking->property->address,
                    'guest_name' => $booking->guest_name,
                    'guest_count' => $booking->guest_count,
                    'check_out' => $booking->check_out,
                    'current_keybox_code' => $booking->property->current_keybox_code,
                    'next_checkin' => $booking->property->getNextCheckIn(),
                    'priority' => $this->calculateCleaningPriority($booking),
                ];
            });

        // Recently cleaned properties
        $recentlyCleaned = Booking::whereDate('cleaned_at', today())
            ->where('is_cleaned', true)
            ->with(['property:id,name,current_keybox_code,keybox_updated_at', 'cleanedBy:id,name'])
            ->latest('cleaned_at')
            ->get();

        return Inertia::render('Staff/CleaningDashboard', [
            'needsCleaning' => $needsCleaning,
            'recentlyCleaned' => $recentlyCleaned,
            'stats' => [
                'total_checkout_today' => Booking::whereDate('check_out', today())->count(),
                'cleaned_today' => Booking::whereDate('cleaned_at', today())->count(),
                'pending_cleaning' => $needsCleaning->count(),
                'high_priority' => $needsCleaning->where('priority', 'high')->count(),
            ]
        ]);
    }

    /**
     * Mark as cleaned and generate new keybox code
     */
    public function markAsCleaned(Request $request, Booking $booking)
    {
        $this->authorize('update', $booking);

        DB::beginTransaction();
        try {
            // Mark booking as cleaned
            $booking->update([
                'is_cleaned' => true,
                'cleaned_at' => now(),
                'cleaned_by' => auth()->id(),
            ]);

            // Generate new keybox code for property
            $newKeyboxCode = $booking->property->generateNewKeyboxCode(auth()->id());

            DB::commit();

            return redirect()->back()->with('success', 
                "Property cleaned successfully! New keybox code: {$newKeyboxCode}"
            );

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Mark as cleaned failed: ' . $e->getMessage());
            
            return redirect()->back()->with('error', 'Failed to mark as cleaned.');
        }
    }

    /**
     * Calculate cleaning priority based on next check-in
     */
    private function calculateCleaningPriority(Booking $booking): string
    {
        $nextBooking = $booking->property->getNextCheckIn();
        
        if (!$nextBooking) {
            return 'low';
        }

        $hoursUntilNextCheckin = now()->diffInHours($nextBooking->check_in);
        
        if ($hoursUntilNextCheckin <= 6) {
            return 'high';
        } elseif ($hoursUntilNextCheckin <= 24) {
            return 'medium';
        }
        
        return 'low';
    }

    /**
     * Get current keybox code for property (for staff reference)
     */
    public function getKeyboxCode(Property $property)
    {
        $this->authorize('view', $property);

        return response()->json([
            'keybox_code' => $property->current_keybox_code,
            'last_updated' => $property->keybox_updated_at,
            'updated_by' => $property->keyboxUpdatedBy?->name,
        ]);
    }
}