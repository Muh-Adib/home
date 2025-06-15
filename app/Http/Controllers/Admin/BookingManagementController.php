<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BookingManagementController extends Controller
{
    /**
     * Display admin booking calendar with timeline view
     */
    public function calendar(Request $request): Response
    {
        $user = $request->user();
        
        // Get properties based on user role
        $propertiesQuery = Property::query()->with(['owner', 'media']);
        
        if ($user->role === 'property_owner') {
            $propertiesQuery->where('owner_id', $user->id);
        }
        
        $properties = $propertiesQuery->active()->get();
        
        // Get date range for calendar (default to current month)
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());
        
        // Get bookings for the date range
        $bookingsQuery = Booking::query()
            ->with(['property', 'verifiedBy'])
            ->whereBetween('check_in', [$startDate, $endDate])
            ->orWhereBetween('check_out', [$startDate, $endDate])
            ->orWhere(function ($query) use ($startDate, $endDate) {
                $query->where('check_in', '<=', $startDate)
                      ->where('check_out', '>=', $endDate);
            });
            
        // Filter by property if specified
        if ($request->filled('property_id')) {
            $bookingsQuery->where('property_id', $request->get('property_id'));
        }
        
        // Filter by user role
        if ($user->role === 'property_owner') {
            $bookingsQuery->whereHas('property', function ($query) use ($user) {
                $query->where('owner_id', $user->id);
            });
        }
        
        $bookings = $bookingsQuery->get();
        
        // Transform bookings for calendar display
        $calendarBookings = $bookings->map(function ($booking) {
            return [
                'id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'property_id' => $booking->property_id,
                'property_name' => $booking->property->name,
                'guest_name' => $booking->guest_name,
                'guest_count' => $booking->guest_count,
                'check_in' => $booking->check_in->toDateString(),
                'check_out' => $booking->check_out->toDateString(),
                'nights' => $booking->nights,
                'total_amount' => $booking->total_amount,
                'formatted_total_amount' => $booking->formatted_total_amount,
                'booking_status' => $booking->booking_status,
                'payment_status' => $booking->payment_status,
                'status_color' => $this->getStatusColor($booking->booking_status),
                'can_edit' => $this->canEditBooking($booking, $request->user()),
            ];
        });
        
        return Inertia::render('Admin/Bookings/Calendar', [
            'properties' => $properties,
            'bookings' => $calendarBookings,
            'filters' => [
                'property_id' => $request->get('property_id'),
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }
    
    /**
     * Show form for creating manual booking
     */
    public function create(Request $request): Response
    {
        $user = $request->user();
        
        // Get properties based on user role
        $propertiesQuery = Property::query()->with(['amenities', 'media']);
        
        if ($user->role === 'property_owner') {
            $propertiesQuery->where('owner_id', $user->id);
        }
        
        $properties = $propertiesQuery->active()->get();
        
        // Get pre-selected property if specified
        $selectedProperty = null;
        if ($request->filled('property_id')) {
            $selectedProperty = $properties->firstWhere('id', $request->get('property_id'));
        }
        
        // Get pre-filled dates if specified
        $prefilledData = [
            'property_id' => $request->get('property_id'),
            'check_in_date' => $request->get('check_in'),
            'check_out_date' => $request->get('check_out'),
        ];
        
        return Inertia::render('Admin/Bookings/Create', [
            'properties' => $properties,
            'selectedProperty' => $selectedProperty,
            'prefilledData' => $prefilledData,
        ]);
    }
    
    /**
     * Store manual booking created by admin
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
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
            'relationship_type' => 'required|in:keluarga,teman,kolega,pasangan,campuran',
            'special_requests' => 'nullable|string|max:1000',
            'internal_notes' => 'nullable|string|max:1000',
            'booking_status' => 'required|in:pending_verification,confirmed',
            'payment_status' => 'required|in:dp_pending,dp_received,fully_paid',
            'dp_percentage' => 'required|integer|in:30,50,70,100',
            'auto_confirm' => 'boolean',
        ]);
        
        $property = Property::findOrFail($validated['property_id']);
        
        // Check if user can manage this property
        $user = $request->user();
        if ($user->role === 'property_owner' && $property->owner_id !== $user->id) {
            abort(403, 'You can only create bookings for your own properties.');
        }
        
        // Check availability
        $isAvailable = $property->isAvailableForDates(
            $validated['check_in_date'],
            $validated['check_out_date']
        );
        
        if (!$isAvailable) {
            return back()->withErrors(['error' => 'Property is not available for selected dates.']);
        }
        
        // Calculate total guests and rates
        $totalGuests = $validated['guest_count_male'] + 
                      $validated['guest_count_female'] + 
                      $validated['guest_count_children'];
        
        $checkIn = Carbon::parse($validated['check_in_date']);
        $checkOut = Carbon::parse($validated['check_out_date']);
        $nights = $checkIn->diffInDays($checkOut);
        
        $rateCalculation = $property->calculateRate(
            $validated['check_in_date'],
            $validated['check_out_date'],
            $totalGuests
        );
        
        DB::beginTransaction();
        try {
            // Create booking
            $booking = $property->bookings()->create([
                'booking_number' => Booking::generateBookingNumber(),
                'guest_name' => $validated['guest_name'],
                'guest_email' => $validated['guest_email'],
                'guest_phone' => $validated['guest_phone'],
                'guest_country' => $validated['guest_country'],
                'guest_id_number' => $validated['guest_id_number'],
                'guest_count' => $totalGuests,
                'guest_male' => $validated['guest_count_male'],
                'guest_female' => $validated['guest_count_female'],
                'guest_children' => $validated['guest_count_children'],
                'relationship_type' => $validated['relationship_type'],
                'check_in' => $validated['check_in_date'],
                'check_out' => $validated['check_out_date'],
                'nights' => $nights,
                'base_amount' => $rateCalculation['base_amount'],
                'extra_bed_amount' => $rateCalculation['extra_bed_amount'],
                'service_amount' => 0,
                'total_amount' => $rateCalculation['total_amount'],
                'dp_percentage' => $validated['dp_percentage'],
                'dp_amount' => $rateCalculation['total_amount'] * $validated['dp_percentage'] / 100,
                'remaining_amount' => $rateCalculation['total_amount'] * (100 - $validated['dp_percentage']) / 100,
                'booking_status' => $validated['booking_status'],
                'payment_status' => $validated['payment_status'],
                'verification_status' => $validated['auto_confirm'] ? 'approved' : 'pending',
                'special_requests' => $validated['special_requests'],
                'internal_notes' => $validated['internal_notes'],
                'created_by' => $user->id,
                'source' => 'admin_manual',
            ]);
            
            // Auto-verify if requested
            if ($validated['auto_confirm']) {
                $booking->update([
                    'verified_by' => $user->id,
                    'verified_at' => now(),
                ]);
            }
            
            // Create workflow entry
            $booking->workflow()->create([
                'step' => $validated['auto_confirm'] ? 'approved' : 'submitted',
                'status' => 'completed',
                'processed_by' => $user->id,
                'processed_at' => now(),
                'notes' => 'Manual booking created by admin' . ($validated['auto_confirm'] ? ' and auto-confirmed' : ''),
            ]);
            
            DB::commit();
            
            return redirect()->route('admin.bookings.show', $booking)
                ->with('success', 'Booking created successfully.');
                
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Manual booking creation failed: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to create booking: ' . $e->getMessage()]);
        }
    }
    
    /**
     * Get property availability for date range (API)
     */
    public function checkAvailability(Request $request)
    {
        $request->validate([
            'property_id' => 'required|exists:properties,id',
            'check_in' => 'required|date',
            'check_out' => 'required|date|after:check_in',
        ]);
        
        $property = Property::findOrFail($request->property_id);
        $isAvailable = $property->isAvailableForDates(
            $request->check_in,
            $request->check_out
        );
        
        return response()->json([
            'available' => $isAvailable,
            'property_id' => $property->id,
            'check_in' => $request->check_in,
            'check_out' => $request->check_out,
        ]);
    }
    
    /**
     * Calculate rate for property and dates (API)
     */
    public function calculateRate(Request $request)
    {
        $request->validate([
            'property_id' => 'required|exists:properties,id',
            'check_in' => 'required|date',
            'check_out' => 'required|date|after:check_in',
            'guest_count' => 'required|integer|min:1',
        ]);
        
        $property = Property::findOrFail($request->property_id);
        
        try {
            $rateCalculation = $property->calculateRate(
                $request->check_in,
                $request->check_out,
                $request->guest_count
            );
            
            return response()->json([
                'success' => true,
                'calculation' => $rateCalculation,
                'formatted' => [
                    'base_amount' => 'Rp ' . number_format($rateCalculation['base_amount'], 0, ',', '.'),
                    'extra_bed_amount' => 'Rp ' . number_format($rateCalculation['extra_bed_amount'], 0, ',', '.'),
                    'total_amount' => 'Rp ' . number_format($rateCalculation['total_amount'], 0, ',', '.'),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 400);
        }
    }
    
    /**
     * Get timeline data for properties
     */
    public function timeline(Request $request)
    {
        $user = $request->user();
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->addMonths(2)->endOfMonth()->toDateString());
        
        // Get properties
        $propertiesQuery = Property::query()->with(['owner']);
        if ($user->role === 'property_owner') {
            $propertiesQuery->where('owner_id', $user->id);
        }
        $properties = $propertiesQuery->active()->get();
        
        // Get bookings for timeline
        $bookings = Booking::query()
            ->with(['property'])
            ->whereHas('property', function ($query) use ($user) {
                if ($user->role === 'property_owner') {
                    $query->where('owner_id', $user->id);
                }
            })
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('check_in', [$startDate, $endDate])
                      ->orWhereBetween('check_out', [$startDate, $endDate])
                      ->orWhere(function ($q) use ($startDate, $endDate) {
                          $q->where('check_in', '<=', $startDate)
                            ->where('check_out', '>=', $endDate);
                      });
            })
            ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
            ->get();
        
        // Build timeline data
        $timeline = [];
        foreach ($properties as $property) {
            $propertyBookings = $bookings->where('property_id', $property->id);
            
            $timeline[] = [
                'property' => [
                    'id' => $property->id,
                    'name' => $property->name,
                    'base_rate' => $property->base_rate,
                    'formatted_base_rate' => $property->formatted_base_rate,
                ],
                'bookings' => $propertyBookings->map(function ($booking) {
                    return [
                        'id' => $booking->id,
                        'booking_number' => $booking->booking_number,
                        'guest_name' => $booking->guest_name,
                        'check_in' => $booking->check_in->toDateString(),
                        'check_out' => $booking->check_out->toDateString(),
                        'nights' => $booking->nights,
                        'total_amount' => $booking->total_amount,
                        'booking_status' => $booking->booking_status,
                        'status_color' => $this->getStatusColor($booking->booking_status),
                    ];
                })->values(),
            ];
        }
        
        return response()->json([
            'timeline' => $timeline,
            'date_range' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }
    
    /**
     * Helper method to get status color
     */
    private function getStatusColor(string $status): string
    {
        return match($status) {
            'pending_verification' => 'yellow',
            'confirmed' => 'green',
            'checked_in' => 'blue',
            'checked_out' => 'gray',
            'cancelled' => 'red',
            'no_show' => 'red',
            default => 'gray'
        };
    }
    
    /**
     * Helper method to check if booking can be edited
     */
    private function canEditBooking(Booking $booking, User $user): bool
    {
        // Super admin can edit all
        if ($user->role === 'super_admin') {
            return true;
        }
        
        // Property owner can edit their property bookings
        if ($user->role === 'property_owner') {
            return $booking->property->owner_id === $user->id;
        }
        
        // Staff can edit based on role
        return in_array($user->role, ['property_manager', 'front_desk']);
    }
}