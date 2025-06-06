<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Property;
use App\Models\PaymentMethod;
use App\Models\BookingWorkflow;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

/**
 * BookingController handles all booking-related operations
 * 
 * This controller manages:
 * - Public booking creation and confirmation (Guest-facing)
 * - Admin booking management (Admin-facing)
 * - Booking workflow operations (verify, check-in, check-out, cancel)
 * - Calendar view for visual booking management
 */
class BookingController extends Controller
{
    // ========================================
    // PUBLIC BOOKING METHODS (Guest-facing)
    // ========================================

    /**
     * Show the form for creating a new booking (Public)
     * 
     * @param Property $property
     * @return Response
     */
    public function create(Property $property): Response
    {
        // Check if property is available for booking
        if ($property->status !== 'active') {
            abort(404, 'Property not available for booking.');
        }

        $property->load(['amenities', 'media', 'owner']);
        $paymentMethods = PaymentMethod::active()->get();

        return Inertia::render('Booking/Create', [
            'property' => $property,
            'paymentMethods' => $paymentMethods,
            'dpOptions' => [
                ['value' => 30, 'label' => '30%'],
                ['value' => 50, 'label' => '50%'],
                ['value' => 70, 'label' => '70%'],
            ]
        ]);
    }

    /**
     * Store a newly created booking from guest form (Public)
     * 
     * @param Request $request
     * @param Property $property
     * @return RedirectResponse
     */
    public function store(Request $request, Property $property): RedirectResponse
    {
        $validated = $request->validate([
            'check_in' => 'required|date|after_or_equal:today',
            'check_out' => 'required|date|after:check_in',
            'guest_count_male' => 'required|integer|min:0',
            'guest_count_female' => 'required|integer|min:0', 
            'guest_count_children' => 'required|integer|min:0',
            'guest_name' => 'required|string|max:255',
            'guest_email' => 'required|email|max:255',
            'guest_phone' => 'required|string|max:20',
            'special_requests' => 'nullable|string|max:1000',
            'dp_percentage' => 'required|integer|in:30,50,70',
        ]);

        // Check availability
        $isAvailable = $property->isAvailableForDates(
            $validated['check_in'], 
            $validated['check_out']
        );

        if (!$isAvailable) {
            return redirect()->back()
                ->with('error', 'Property is not available for selected dates.');
        }

        // Calculate rates
        $totalGuests = $validated['guest_count_male'] + 
                      $validated['guest_count_female'] + 
                      $validated['guest_count_children'];

        $rateCalculation = $property->calculateRate(
            $validated['check_in'],
            $validated['check_out'],
            $totalGuests
        );

        DB::beginTransaction();
        try {
            // Create booking
            $booking = $property->bookings()->create([
                'booking_number' => 'BK' . date('Ymd') . str_pad(Booking::count() + 1, 4, '0', STR_PAD_LEFT),
                'guest_name' => $validated['guest_name'],
                'guest_email' => $validated['guest_email'],
                'guest_phone' => $validated['guest_phone'],
                'guest_count' => $totalGuests,
                'guest_male' => $validated['guest_count_male'],
                'guest_female' => $validated['guest_count_female'],
                'guest_children' => $validated['guest_count_children'],
                'check_in' => $validated['check_in'],
                'check_out' => $validated['check_out'],
                'nights' => Carbon::parse($validated['check_in'])->diffInDays($validated['check_out']),
                'base_amount' => $rateCalculation['base_amount'],
                'extra_bed_amount' => $rateCalculation['extra_bed_amount'],
                'service_amount' => 0,
                'total_amount' => $rateCalculation['total_amount'],
                'dp_percentage' => $validated['dp_percentage'],
                'dp_amount' => $rateCalculation['total_amount'] * $validated['dp_percentage'] / 100,
                'remaining_amount' => $rateCalculation['total_amount'] * (100 - $validated['dp_percentage']) / 100,
                'booking_status' => 'pending_verification',
                'payment_status' => 'dp_pending',
                'verification_status' => 'pending',
                'special_requests' => $validated['special_requests'],
            ]);

            // Create initial workflow
            $booking->workflow()->create([
                'step' => 'booking_created',
                'status' => 'completed',
                'processed_at' => now(),
                'notes' => 'Booking created by guest',
            ]);

            DB::commit();

            return redirect()->route('booking.confirmation', $booking->booking_number)
                ->with('success', 'Your booking has been submitted for verification.');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to create booking. Please try again.']);
        }
    }

    /**
     * Show booking confirmation page (Public)
     * 
     * @param string $bookingNumber
     * @return Response
     */
    public function confirmation($bookingNumber): Response
    {
        $booking = Booking::where('booking_number', $bookingNumber)
            ->with(['property', 'workflow'])
            ->firstOrFail();

        return Inertia::render('Booking/Confirmation', [
            'booking' => $booking,
        ]);
    }

    // ========================================
    // ADMIN BOOKING MANAGEMENT
    // ========================================

    /**
     * Display admin bookings listing (Admin)
     * 
     * @param Request $request
     * @return Response
     */
    public function admin_index(Request $request): Response
    {
        $this->authorize('viewAny', Booking::class);
        
        $user = $request->user();
        
        $query = Booking::query()
            ->with(['property', 'payments', 'workflow' => function ($q) {
                $q->latest();
            }]);

        // Filter by property for property owners
        if ($user->role === 'property_owner') {
            $query->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                  ->orWhere('guest_name', 'like', "%{$search}%")
                  ->orWhere('guest_email', 'like', "%{$search}%")
                  ->orWhere('guest_phone', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('booking_status', $request->get('status'));
        }

        // Date filter
        if ($request->filled('date_from')) {
            $query->where('check_in', '>=', $request->get('date_from'));
        }
        
        if ($request->filled('date_to')) {
            $query->where('check_out', '<=', $request->get('date_to'));
        }

        $bookings = $query->latest()->paginate(15);

        return Inertia::render('Admin/Bookings/Index', [
            'bookings' => $bookings,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
                'date_from' => $request->get('date_from'),
                'date_to' => $request->get('date_to'),
            ]
        ]);
    }

    /**
     * Display booking details (Admin)
     * 
     * @param Booking $booking
     * @return Response
     */
    public function admin_show(Booking $booking): Response
    {
        $this->authorize('view', $booking);

        $booking->load([
            'property',
            'guests',
            'services',
            'payments.payment_method',
            'workflow.processor'
        ]);

        return Inertia::render('Admin/Bookings/Show', [
            'booking' => $booking,
        ]);
    }

    /**
     * Display calendar view for admin
     * 
     * @param Request $request
     * @return Response
     */
    public function calendar(Request $request): Response
    {
        $user = $request->user();
        
        // Base query with relationships
        $query = Booking::query()
            ->with(['property' => function ($q) {
                $q->select('id', 'name', 'address', 'owner_id');
            }]);

        // Filter by property for property owners
        if ($user->role === 'property_owner') {
            $query->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        // Apply filters
        if ($request->filled('property_id')) {
            $query->where('property_id', $request->get('property_id'));
        }

        if ($request->filled('status')) {
            $query->where('booking_status', $request->get('status'));
        }

        // Get bookings for the current period (3 months back and forward)
        $startDate = now()->subMonths(3)->startOfMonth();
        $endDate = now()->addMonths(3)->endOfMonth();
        
        $bookings = $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('check_in', [$startDate, $endDate])
              ->orWhereBetween('check_out', [$startDate, $endDate])
              ->orWhere(function ($q2) use ($startDate, $endDate) {
                  $q2->where('check_in', '<=', $startDate)
                     ->where('check_out', '>=', $endDate);
              });
        })->get();

        // Get properties for filter
        $propertiesQuery = Property::active()->select('id', 'name');
        if ($user->role === 'property_owner') {
            $propertiesQuery->where('owner_id', $user->id);
        }
        $properties = $propertiesQuery->get();

        return Inertia::render('Admin/Bookings/Calendar', [
            'bookings' => $bookings,
            'properties' => $properties,
            'filters' => [
                'property_id' => $request->get('property_id'),
                'status' => $request->get('status'),
                'view' => $request->get('view', 'month'),
            ],
        ]);
    }

    // ========================================
    // BOOKING WORKFLOW OPERATIONS
    // ========================================

    /**
     * Verify booking (Admin)
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function verify(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('verify', $booking);

        $request->validate([
            'verification_notes' => 'nullable|string|max:1000',
        ]);

        $booking->update([
            'verification_status' => 'approved',
            'booking_status' => 'confirmed',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        // Create workflow record
        $booking->workflow()->create([
            'step' => 'verification',
            'status' => 'completed',
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
            'notes' => $request->get('verification_notes'),
        ]);

        return redirect()->back()
            ->with('success', 'Booking verified successfully.');
    }

    /**
     * Reject booking (Admin)
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function reject(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('verify', $booking);

        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $booking->update([
            'verification_status' => 'rejected',
            'booking_status' => 'cancelled',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        // Create workflow record
        $booking->workflow()->create([
            'step' => 'verification',
            'status' => 'failed',
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
            'notes' => $request->get('rejection_reason'),
        ]);

        return redirect()->back()
            ->with('success', 'Booking rejected successfully.');
    }

    /**
     * Check-in guest (Admin)
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function checkin(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('checkin', $booking);

        if ($booking->booking_status !== 'confirmed') {
            return redirect()->back()
                ->with('error', 'Only confirmed bookings can be checked in.');
        }

        $booking->update([
            'booking_status' => 'checked_in',
        ]);

        // Create workflow record
        $booking->workflow()->create([
            'step' => 'check_in',
            'status' => 'completed',
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
            'notes' => 'Guest checked in',
        ]);

        return redirect()->back()
            ->with('success', 'Guest checked in successfully.');
    }

    /**
     * Check-out guest (Admin)
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function checkout(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('checkout', $booking);

        if ($booking->booking_status !== 'checked_in') {
            return redirect()->back()
                ->with('error', 'Only checked-in bookings can be checked out.');
        }

        $booking->update([
            'booking_status' => 'checked_out',
        ]);

        // Create workflow record
        $booking->workflow()->create([
            'step' => 'check_out',
            'status' => 'completed',
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
            'notes' => 'Guest checked out',
        ]);

        return redirect()->back()
            ->with('success', 'Guest checked out successfully.');
    }

    /**
     * Cancel booking (Admin)
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function cancel(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('cancel', $booking);

        $request->validate([
            'cancellation_reason' => 'required|string|max:1000',
        ]);

        $booking->update([
            'booking_status' => 'cancelled',
            'cancellation_reason' => $request->get('cancellation_reason'),
            'cancelled_by' => $request->user()->id,
            'cancelled_at' => now(),
        ]);

        // Create workflow record
        $booking->workflow()->create([
            'step' => 'cancellation',
            'status' => 'completed',
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
            'notes' => $request->get('cancellation_reason'),
        ]);

        return redirect()->back()
            ->with('success', 'Booking cancelled successfully.');
    }

    // ========================================
    // LEGACY METHODS (For backwards compatibility)
    // ========================================

    /**
     * Display a listing of the resource (Legacy - use admin_index instead)
     */
    public function index(Request $request): Response
    {
        return $this->admin_index($request);
    }

    /**
     * Display the specified resource (Legacy - use admin_show instead)
     */
    public function show(Booking $booking): Response
    {
        return $this->admin_show($booking);
    }

    /**
     * Show the form for editing the specified resource (Not implemented)
     */
    public function edit(Booking $booking)
    {
        abort(404, 'Method not implemented');
    }

    /**
     * Update the specified resource in storage (Not implemented)
     */
    public function update(Request $request, Booking $booking)
    {
        abort(404, 'Method not implemented');
    }

    /**
     * Remove the specified resource from storage (Not implemented)
     */
    public function destroy(Booking $booking)
    {
        abort(404, 'Method not implemented');
    }
}
