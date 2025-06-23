<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Property;
use App\Models\PaymentMethod;
use App\Models\BookingWorkflow;
use App\Events\BookingCreated;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use App\Services\BookingService;

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
    private BookingService $bookingService;

    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;
    }

    // ========================================
    // PUBLIC BOOKING METHODS (Guest-facing)
    // ========================================


    /**
     * Show the enhanced form for creating a new booking with guest details (Public)
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

        return Inertia::render('Booking/Create', [
            'property' => $property,
        ]);
    }

    /**
     * Store a newly created booking from enhanced form (Public)
     * 
     * @param Request $request
     * @param Property $property
     * @return RedirectResponse
     */
    public function store(Request $request, Property $property): RedirectResponse
    {
        $validated = $request->validate([
            'check_in_date' => 'required|date|after_or_equal:today',
            'check_out_date' => 'required|date|after:check_in_date',
            'guest_count_male' => 'required|integer|min:0',
            'guest_count_female' => 'required|integer|min:0',
            'guest_count_children' => 'required|integer|min:0',
            'guest_name' => 'required|string|max:255',
            'guest_email' => 'required|email|max:255',
            'guest_phone' => 'required|string|max:20',
            'guest_country' => 'required|string|max:100',
            'guest_id_number' => 'nullable|string|max:50',
            'guest_gender' => 'required|in:male,female',
            'relationship_type' => 'required|in:keluarga,teman,kolega,pasangan,campuran',
            'special_requests' => 'nullable|string|max:1000',
            'dp_percentage' => 'required|integer|in:30,50,70,100',
            'guests' => 'required|array|min:1',
            'guests.*.name' => 'required|string|max:255',
            'guests.*.gender' => 'required|in:male,female',
            'guests.*.age_category' => 'required|in:adult,child,infant',
            'guests.*.relationship_to_primary' => 'required|string|max:100',
            'guests.*.id_number' => 'nullable|string|max:50',
            'guests.*.phone' => 'nullable|string|max:20',
            'guests.*.email' => 'nullable|email|max:255',
            'is_auto_register' => 'boolean',
        ]);

        try {
            $booking = $this->bookingService->createBooking($property, $validated, auth()->user());
        } catch (\Exception $e) {
            \Log::error('Booking creation failed: ' . $e->getMessage());
            return back()->withErrors(['error' => $e->getMessage()]);
        }

        // Redirect sesuai user login
        if (auth()->check()) {
            return redirect()->route('dashboard')
                ->with('success', 'Your booking has been submitted for verification. You will receive payment instructions after verification.');
        }

        return redirect()->route('bookings.confirmation', $booking->booking_number)
            ->with('success', 'Your booking has been submitted for verification.');
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

    /**
     * Show guest's own bookings (User-facing)
     * 
     * @param Request $request
     * @return Response
     */
    public function myBookings(Request $request): Response
    {
        $user = $request->user();
        
        $query = Booking::query()
            ->with([
                'property:id,name,slug,address', 
                'payments' => function ($q) {
                    $q->with('paymentMethod:id,name,type')->latest();
                },
                'workflow' => function ($q) {
                    $q->latest();
                }
            ])
            ->where('guest_email', $user->email)
            ->orWhere('user_id', $user->id);

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                  ->orWhere('guest_name', 'like', "%{$search}%")
                  ->orWhereHas('property', function ($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by booking status
        if ($request->filled('status')) {
            $query->where('booking_status', $request->get('status'));
        }

        // Filter by payment status
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->get('payment_status'));
        }

        $bookings = $query->latest()->paginate(10);

        // Transform bookings with additional data
        $bookings->getCollection()->transform(function ($booking) use ($user) {
            // Calculate nights
            $checkIn = \Carbon\Carbon::parse($booking->check_in_date);
            $checkOut = \Carbon\Carbon::parse($booking->check_out_date);
            $booking->nights = $checkIn->diffInDays($checkOut);

            // Determine if can cancel (before check-in date and status allows)
            $booking->can_cancel = in_array($booking->booking_status, ['pending_verification', 'confirmed']) && 
                                   $checkIn->greaterThan(now()->addDay());

            // Determine if can review (completed booking)
            $booking->can_review = $booking->booking_status === 'completed' && 
                                   !$booking->has_review;

            // Generate payment link if needed
            if ($booking->booking_status === 'confirmed' && 
                in_array($booking->payment_status, ['dp_pending', 'dp_received'])) {
                $booking->payment_link = route('payments.show', $booking->booking_number);
            }
            //dd($booking->payment_link);
            return $booking;
        });

        return Inertia::render('Bookings/MyBookings', [
            'bookings' => $bookings,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
                'payment_status' => $request->get('payment_status'),
            ]
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
            'payments.paymentMethod',
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
        $this->authorize('update', $booking);

        $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $booking->update([
                'verification_status' => 'approved',
                'booking_status' => 'confirmed',
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
            ]);

            // Create workflow record
            $booking->workflow()->create([
                'step' => 'approved',
                'status' => 'completed',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => $request->get('notes', 'Booking verified and confirmed by admin'),
            ]);

            DB::commit();

            return redirect()->back()
                ->with('success', 'Booking verified successfully. Guest can now proceed with payment.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Booking verification failed: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to verify booking. Please try again.');
        }
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
            'step' => 'rejected',
            'status' => 'completed',
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
        $this->authorize('update', $booking);

        if ($booking->booking_status !== 'confirmed') {
            return redirect()->back()
                ->with('error', 'Only confirmed bookings can be checked in.');
        }

        DB::beginTransaction();
        try {
            $booking->update([
                'booking_status' => 'checked_in',
                'checked_in_at' => now(),
                'checked_in_by' => $request->user()->id,
            ]);

            // Create workflow record
            $booking->workflow()->create([
                'step' => 'checked_in',
                'status' => 'completed',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => 'Guest checked in successfully',
            ]);

            DB::commit();

            return redirect()->back()
                ->with('success', 'Guest checked in successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Check-in failed: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to check in guest. Please try again.');
        }
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
        $this->authorize('update', $booking);

        if ($booking->booking_status !== 'checked_in') {
            return redirect()->back()
                ->with('error', 'Only checked-in bookings can be checked out.');
        }

        DB::beginTransaction();
        try {
            $booking->update([
                'booking_status' => 'checked_out',
                'checked_out_at' => now(),
                'checked_out_by' => $request->user()->id,
            ]);

            // Create workflow record
            $booking->workflow()->create([
                'step' => 'checked_out',
                'status' => 'completed',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => 'Guest checked out successfully',
            ]);

            DB::commit();

            return redirect()->back()
                ->with('success', 'Guest checked out successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Check-out failed: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to check out guest. Please try again.');
        }
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
        $this->authorize('update', $booking);

        $request->validate([
            'cancellation_reason' => 'required|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $booking->update([
                'booking_status' => 'cancelled',
                'cancellation_reason' => $request->get('cancellation_reason'),
                'cancelled_by' => $request->user()->id,
                'cancelled_at' => now(),
            ]);

            // Create workflow record
            $booking->workflow()->create([
                'step' => 'cancelled',
                'status' => 'completed',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => $request->get('cancellation_reason'),
            ]);

            DB::commit();

            return redirect()->back()
                ->with('success', 'Booking cancelled successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Booking cancellation failed: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to cancel booking. Please try again.');
        }
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
