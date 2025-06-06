<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Property;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    /**
     * Display a listing of bookings
     */
    public function index(Request $request): Response
    {
        $query = Booking::with(['property'])
            ->latest();

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('guest_name', 'like', "%{$search}%")
                  ->orWhere('booking_number', 'like', "%{$search}%")
                  ->orWhere('guest_email', 'like', "%{$search}%");
            });
        }

        // Apply status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('booking_status', $request->status);
        }

        // Apply payment status filter
        if ($request->filled('payment_status') && $request->payment_status !== 'all') {
            $query->where('payment_status', $request->payment_status);
        }

        // Apply property filter for property owners
        $user = $request->user();
        if ($user->role === 'property_owner') {
            $query->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        $bookings = $query->paginate(20);

        // Get properties for filters
        $properties = Property::select('id', 'name')->get();

        return Inertia::render('Admin/Bookings/Index', [
            'bookings' => $bookings,
            'filters' => $request->only(['search', 'status', 'payment_status', 'property_id']),
            'properties' => $properties,
        ]);
    }

    /**
     * Display the specified booking
     */
    public function show(Request $request, Booking $booking): Response
    {
        $booking->load([
            'property', 
            'guests', 
            'services', 
            'payments.verifier', 
            'workflow.processor'
        ]);

        return Inertia::render('Admin/Bookings/Show', [
            'booking' => $booking,
        ]);
    }

    /**
     * Verify a booking
     */
    public function verify(Request $request, Booking $booking)
    {
        $this->authorize('update', $booking);

        $booking->update([
            'verification_status' => 'approved',
            'booking_status' => 'confirmed',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        // Create workflow entry
        $booking->workflow()->create([
            'step' => 'approved',
            'status' => 'completed',
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
            'notes' => 'Booking verified and confirmed',
        ]);

        return back()->with('success', 'Booking verified successfully');
    }

    /**
     * Cancel a booking
     */
    public function cancel(Request $request, Booking $booking)
    {
        $this->authorize('update', $booking);

        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $booking->update([
            'booking_status' => 'cancelled',
            'cancellation_reason' => $request->reason,
            'cancelled_at' => now(),
            'cancelled_by' => $request->user()->id,
        ]);

        // Create workflow entry
        $booking->workflow()->create([
            'step' => 'cancelled',
            'status' => 'completed',
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
            'notes' => $request->reason ?? 'Booking cancelled',
        ]);

        return back()->with('success', 'Booking cancelled successfully');
    }

    /**
     * Check in a guest
     */
    public function checkIn(Request $request, Booking $booking)
    {
        $this->authorize('update', $booking);

        if ($booking->booking_status !== 'confirmed') {
            return back()->withErrors(['error' => 'Only confirmed bookings can be checked in']);
        }

        $booking->update([
            'booking_status' => 'checked_in',
        ]);

        // Create workflow entry
        $booking->workflow()->create([
            'step' => 'checked_in',
            'status' => 'completed',
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
            'notes' => 'Guest checked in',
        ]);

        return back()->with('success', 'Guest checked in successfully');
    }

    /**
     * Check out a guest
     */
    public function checkOut(Request $request, Booking $booking)
    {
        $this->authorize('update', $booking);

        if ($booking->booking_status !== 'checked_in') {
            return back()->withErrors(['error' => 'Only checked-in guests can be checked out']);
        }

        $booking->update([
            'booking_status' => 'checked_out',
        ]);

        // Create workflow entry
        $booking->workflow()->create([
            'step' => 'checked_out',
            'status' => 'completed',
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
            'notes' => 'Guest checked out',
        ]);

        return back()->with('success', 'Guest checked out successfully');
    }
} 