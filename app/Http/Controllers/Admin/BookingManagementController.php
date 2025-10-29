<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Services\BookingService;
use App\Services\RateCalculationService;
use App\Events\BookingStatusChanged;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * BookingManagementController - Controller untuk mengelola booking admin
 * 
 * Controller ini menangani semua fungsi admin terkait booking:
 * - Menampilkan daftar booking untuk admin
 * - Menampilkan detail booking
 * - Membuat booking manual (admin-created bookings)  
 * - Verifikasi booking
 * - Cancel booking
 * - Check-in/Check-out
 * - Calendar view
 * - Timeline view
 * 
 * User yang dapat mengakses:
 * - super_admin: dapat mengakses semua booking
 * - admin: dapat mengakses semua booking  
 * - property_owner: dapat mengakses booking terkait property mereka
 * - property_manager: dapat mengakses booking terkait property mereka
 * - front_desk: dapat mengakses booking terkait property mereka
 * - housekeeping: dapat mengakses booking terkait property mereka
 * - finance: dapat mengakses booking terkait property mereka
 * 
 * Guest tidak dapat mengakses controller ini
 */
class BookingManagementController extends Controller
{
    private BookingService $bookingService;
    private RateCalculationService $rateCalculationService;

    public function __construct(
        BookingService $bookingService,
        RateCalculationService $rateCalculationService
    ) {
        $this->bookingService = $bookingService;
        $this->rateCalculationService = $rateCalculationService;
    }

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
        $calendarBookings = $bookings->map(function ($booking) use ($user) {
            return [
                'id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'property_id' => $booking->property_id,
                'property' => [
                    'id' => $booking->property->id,
                    'name' => $booking->property->name,
                    'address' => $booking->property->address,
                ],
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
                'can_edit' => $this->canEditBooking($booking, $user),
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

        // Get availability data for selected property if exists
        $availabilityData = null;
        if ($selectedProperty) {
            try {
                $startDate = $request->get('check_in') ?: now()->toDateString();
                $endDate = $request->get('check_out') ?: now()->addMonths(3)->toDateString();
                
                $availabilityData = $selectedProperty->getAvailabilityData($startDate, $endDate);
            } catch (\Exception $e) {
                \Log::error('Error getting availability data for admin booking create: ' . $e->getMessage());
            }
        }
        
        // Get payment methods for inline payment form
        $paymentMethods = \App\Models\PaymentMethod::active()->get();
        
        return Inertia::render('Admin/Bookings/Create', [
            'properties' => $properties,
            'selectedProperty' => $selectedProperty,
            'prefilledData' => $prefilledData,
            'availabilityData' => $availabilityData,
            'paymentMethods' => $paymentMethods,
        ]);
    }
    
    /**
     * Store manual booking created by admin using BookingService
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'check_in_date' => 'required|date',
            'check_out_date' => 'required|date|after:check_in_date',
            'guest_male' => 'required|integer|min:0',
            'guest_female' => 'required|integer|min:0',
            'guest_children' => 'required|integer|min:0',
            'guest_name' => 'required|string|max:255',
            'guest_email' => 'required|email|max:255',
            'guest_phone' => 'required|string|max:20',
            'guest_country' => 'required|string|max:100',
            'guest_id_number' => 'nullable|string|max:50',
            'guest_gender' => 'required|in:male,female',
            'relationship_type' => 'required|in:keluarga,teman,kolega,pasangan,campuran',
            'special_requests' => 'nullable|string|max:1000',
            'internal_notes' => 'nullable|string|max:1000',
            'booking_status' => 'required|in:pending_verification,confirmed',
            'payment_status' => 'nullable|in:dp_pending,dp_received,fully_paid',
            'dp_percentage' => 'required|integer|in:30,50,70,100',
            'auto_confirm' => 'boolean',
            'guests' => 'nullable|array',
            // Payment fields
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'payment_amount' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:100',
            'account_name' => 'nullable|string|max:255',
            'payment_status' => 'nullable|in:pending,verified',
            'verification_notes' => 'nullable|string|max:1000',
            // Rate override fields
            'rate_override' => 'nullable|boolean',
            'override_amount' => 'nullable|numeric|min:0',
            'override_reason' => 'nullable|string|max:500',
        ]);
        
        // Additional validation rules
        $this->validateBookingRules($validated, $request);
        
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

        try {
            // ✅ FIX: Transform data to match BookingRequest format
            $bookingData = [
                'property_id' => $validated['property_id'],
                'check_in' => $validated['check_in_date'],
                'check_out' => $validated['check_out_date'],
                'check_in_time' => '15:00',
                'guest_count' => $validated['guest_male'] + $validated['guest_female'] + $validated['guest_children'],
                'guest_male' => $validated['guest_male'],
                'guest_female' => $validated['guest_female'],
                'guest_children' => $validated['guest_children'],
                'guest_name' => $validated['guest_name'],
                'guest_email' => $validated['guest_email'],
                'guest_phone' => $validated['guest_phone'],
                'guest_country' => $validated['guest_country'],
                'guest_id_number' => $validated['guest_id_number'],
                'guest_gender' => $validated['guest_gender'],
                'relationship_type' => $validated['relationship_type'],
                'guests' => $validated['guests'] ?? [],
                'special_requests' => $validated['special_requests'],
                'internal_notes' => $validated['internal_notes'],
                'booking_status' => $validated['booking_status'],
                'payment_status' => $validated['payment_status'],
                'dp_percentage' => $validated['dp_percentage'],
                'auto_confirm' => $validated['auto_confirm'] ?? false,
            ];

            // Create or find user for booking
            $guestUser = \App\Models\User::where('email', $validated['guest_email'])->first();
            if (!$guestUser) {
                $guestUser = \App\Models\User::create([
                    'name' => $validated['guest_name'],
                    'email' => $validated['guest_email'],
                    'phone' => $validated['guest_phone'],
                    'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(12)),
                    'role' => 'guest',
                    'status' => 'active',
                    'email_verified_at' => now(), // Admin-created users are auto-verified
                ]);
            }
            
            // ✅ FIX: Use new BookingService with BookingRequest
            $bookingRequest = \App\Domain\Booking\ValueObjects\BookingRequest::fromArray($bookingData);
            $booking = $this->bookingService->createBooking($bookingRequest, $guestUser);
            
            // ✅ FIX: Admin-specific updates
            $booking->update([
                'created_by' => $user->id,
                // Use allowed enum values only; mark admin source via created_by and logs
                'source' => $request->get('source', 'direct'),
            ]);

            // Handle rate override if specified
            if (!empty($validated['rate_override']) && !empty($validated['override_amount'])) {
                $originalAmount = $booking->total_amount;
                $booking->update([
                    'total_amount' => $validated['override_amount'],
                    'internal_notes' => $booking->internal_notes . "\n[" . now() . "] Rate override by " . $user->name . 
                                       ": " . $validated['override_reason'] . 
                                       " (Original: " . $originalAmount . ", New: " . $validated['override_amount'] . ")",
                ]);
            }

            // Auto-verify if requested
            if ($validated['auto_confirm']) {
                $booking->update([
                    'verification_status' => 'approved',
                    'verified_by' => $user->id,
                    'verified_at' => now(),
                ]);

                // Update workflow
                $booking->workflow()->create([
                    'step' => 'approved',
                    'status' => 'completed',
                    'processed_by' => $user->id,
                    'processed_at' => now(),
                    'notes' => 'Manual booking created by admin and auto-confirmed',
                ]);
            }

            // Create payment if payment data provided
            if ($validated['payment_method_id'] && $validated['payment_amount']) {
                $paymentMethod = \App\Models\PaymentMethod::findOrFail($validated['payment_method_id']);
                
                $payment = $booking->payments()->create([
                    'payment_method_id' => $validated['payment_method_id'],
                    'payment_number' => \App\Models\Payment::generatePaymentNumber(),
                    'amount' => $validated['payment_amount'],
                    'payment_type' => 'dp',
                    'payment_method' => $paymentMethod->type,
                    'payment_status' => $validated['payment_status'] ?? 'verified',
                    'payment_date' => $validated['payment_date'] ?: now(),
                    'reference_number' => $validated['reference_number'],
                    'bank_name' => $validated['bank_name'] ?: $paymentMethod->bank_name,
                    'account_number' => $validated['account_number'],
                    'account_name' => $validated['account_name'],
                    'verification_notes' => $validated['verification_notes'],
                    'processed_by' => $user->id,
                    'verified_by' => ($validated['payment_status'] ?? 'verified') === 'verified' ? $user->id : null,
                    'verified_at' => ($validated['payment_status'] ?? 'verified') === 'verified' ? now() : null,
                ]);

                // Update booking payment status
                $booking->updatePaymentStatus();
            }
            
            return redirect()->route('admin.booking-management.show', $booking)
                ->with('success', 'Booking created successfully.');
                
        } catch (\Exception $e) {
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
            'exclude_booking_id' => 'nullable|exists:bookings,id',
        ]);
        
        $property = Property::findOrFail($request->property_id);
        $excludeBookingId = $request->get('exclude_booking_id');
        
        $isAvailable = $property->isAvailableForDates(
            $request->check_in,
            $request->check_out,
            $excludeBookingId
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
            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $request->check_in,
                $request->check_out,
                $request->guest_count
            );
            
            return response()->json([
                'success' => true,
                'calculation' => $rateCalculation->toArray(),
                'formatted' => [
                    'base_amount' => 'Rp ' . number_format($rateCalculation->baseAmount, 0, ',', '.'),
                    'extra_bed_amount' => 'Rp ' . number_format($rateCalculation->extraBedAmount, 0, ',', '.'),
                    'total_amount' => 'Rp ' . number_format($rateCalculation->totalAmount, 0, ',', '.'),
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
     * Get availability and rates combined for admin (single endpoint)
     */
    public function availabilityAndRates(Request $request)
    {
        $request->validate([
            'property_id' => 'required|exists:properties,id',
            'check_in' => 'required|date',
            'check_out' => 'required|date|after:check_in',
            'guest_count' => 'required|integer|min:1',
        ]);
        
        $property = Property::findOrFail($request->property_id);
        
        try {
            // Availability
            $availabilityService = app(\App\Services\AvailabilityService::class);
            $availability = $availabilityService->checkAvailability(
                $property,
                $request->check_in,
                $request->check_out
            );
            
            // Rate calculation
            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $request->check_in,
                $request->check_out,
                (int) $request->guest_count
            );
            
            return response()->json([
                'success' => true,
                'property' => [
                    'id' => $property->id,
                    'name' => $property->name,
                    'base_rate' => $property->base_rate,
                    'capacity' => $property->capacity,
                    'capacity_max' => $property->capacity_max,
                    'cleaning_fee' => $property->cleaning_fee,
                    'extra_bed_rate' => $property->extra_bed_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                ],
                'date_range' => [
                    'start' => $request->check_in,
                    'end' => $request->check_out,
                ],
                'guest_count' => (int) $request->guest_count,
                'availability' => $availability,
                'booked_dates' => $availability['booked_dates'] ?? [],
                'booked_periods' => $availability['booked_periods'] ?? [],
                'calculation' => $rateCalculation->toArray(),
                'formatted' => [
                    'base_amount' => 'Rp ' . number_format($rateCalculation->baseAmount, 0, ',', '.'),
                    'extra_bed_amount' => 'Rp ' . number_format($rateCalculation->extraBedAmount, 0, ',', '.'),
                    'total_amount' => 'Rp ' . number_format($rateCalculation->totalAmount, 0, ',', '.'),
                    'per_night' => 'Rp ' . number_format(($rateCalculation->totalAmount / max($rateCalculation->nights, 1)), 0, ',', '.'),
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
     * Display timeline view page
     */
    public function timelineView(Request $request): Response
    {
        $user = $request->user();
        
        // Get properties for filter
        $propertiesQuery = Property::query();
        if ($user->role === 'property_owner') {
            $propertiesQuery->where('owner_id', $user->id);
        }
        $properties = $propertiesQuery->active()->get(['id', 'name']);
        
        return Inertia::render('Admin/Bookings/Timeline', [
            'properties' => $properties,
            'filters' => [
                'start_date' => $request->get('start_date', now()->startOfMonth()->toDateString()),
                'end_date' => $request->get('end_date', now()->addMonths(2)->endOfMonth()->toDateString()),
            ]
        ]);
    }
    
    /**
     * Get property date range data for admin booking creation
     */
    public function getPropertyDateRange(Request $request)
    {
        $request->validate([
            'property_id' => 'required|exists:properties,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
        ]);
        
        $property = Property::findOrFail($request->property_id);
        $startDate = $request->get('start_date', now()->toDateString());
        $endDate = $request->get('end_date', now()->addMonths(3)->toDateString());
        
        try {
            // Get availability data using AvailabilityService
            $availabilityService = app(\App\Services\AvailabilityService::class);
            $availability = $availabilityService->checkAvailability($property, $startDate, $endDate);
            
            // Get booked dates
            $bookedDates = Booking::where('property_id', $property->id)
                ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                ->where(function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('check_in', [$startDate, $endDate])
                          ->orWhereBetween('check_out', [$startDate, $endDate])
                          ->orWhere(function ($q) use ($startDate, $endDate) {
                              $q->where('check_in', '<=', $startDate)
                                ->where('check_out', '>=', $endDate);
                          });
                })
                ->get()
                ->flatMap(function ($booking) {
                    $dates = [];
                    $current = \Carbon\Carbon::parse($booking->check_in);
                    $end = \Carbon\Carbon::parse($booking->check_out);
                    
                    while ($current < $end) {
                        $dates[] = $current->toDateString();
                        $current->addDay();
                    }
                    
                    return $dates;
                })
                ->unique()
                ->values()
                ->toArray();
            
            // Get seasonal rates if available
            $seasonalRates = [];
            if (method_exists($property, 'getSeasonalRates')) {
                $seasonalRates = $property->getSeasonalRates($startDate, $endDate);
            }
            
            return response()->json([
                'success' => true,
                'property' => [
                    'id' => $property->id,
                    'name' => $property->name,
                    'base_rate' => $property->base_rate,
                    'capacity' => $property->capacity,
                    'capacity_max' => $property->capacity_max,
                    'cleaning_fee' => $property->cleaning_fee,
                    'extra_bed_rate' => $property->extra_bed_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                ],
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate,
                ],
                'booked_dates' => $bookedDates,
                'availability_data' => $availability,
                'seasonal_rates' => $seasonalRates,
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error getting property date range: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to get property date range data',
            ], 500);
        }
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
        // Super admin can edit all bookings including guest bookings
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
    
    /**
     * Additional validation rules for booking creation/update
     */
    private function validateBookingRules(array $validated, Request $request): void
    {
        // Payment requirement validation
        if ($validated['booking_status'] === 'confirmed' && $validated['payment_status'] !== 'dp_pending') {
            if (empty($validated['payment_method_id'])) {
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []),
                    ['payment_method_id' => ['Payment method is required for confirmed bookings']]
                );
            }
            
            if (empty($validated['payment_amount']) || $validated['payment_amount'] <= 0) {
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []),
                    ['payment_amount' => ['Payment amount is required for confirmed bookings']]
                );
            }
        }
        
        // Rate override validation
        if (!empty($validated['rate_override'])) {
            if (!isset($validated['override_amount']) || $validated['override_amount'] <= 0) {
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []),
                    ['override_amount' => ['Override amount is required when rate override is enabled']]
                );
            }
            
            if (!isset($validated['override_reason']) || empty($validated['override_reason'])) {
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []),
                    ['override_reason' => ['Override reason is required and must be at least 10 characters']]
                );
            }
            
            if (strlen(trim($validated['override_reason'])) < 10) {
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []),
                    ['override_reason' => ['Override reason must be at least 10 characters']]
                );
            }
        }
        
        // Guest count validation
        $totalGuests = $validated['guest_male'] + $validated['guest_female'] + $validated['guest_children'];
        if ($totalGuests <= 0) {
            throw new \Illuminate\Validation\ValidationException(
                validator([], []),
                ['guest_count' => ['Total guest count must be at least 1']]
            );
        }
        
        // Property capacity validation
        $property = Property::find($validated['property_id']);
        if ($property && $totalGuests > $property->capacity_max) {
            throw new \Illuminate\Validation\ValidationException(
                validator([], []),
                ['guest_count' => ["Guest count ({$totalGuests}) exceeds property maximum capacity ({$property->capacity_max})"]]
            );
        }
    }

    /**
     * Display admin bookings listing
     * 
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
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

        // Status filter - exclude cancelled by default unless explicitly requested
        if ($request->filled('status')) {
            $query->where('booking_status', $request->get('status'));
        } else {
            // Exclude cancelled bookings by default
            $query->where('booking_status', '!=', 'cancelled');
        }

        // Payment status filter
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->get('payment_status'));
        }

        // Property filter
        if ($request->filled('property_id')) {
            $query->where('property_id', $request->get('property_id'));
        }

        // Date filter
        if ($request->filled('date_from')) {
            $query->where('check_in', '>=', $request->get('date_from'));
        }
        
        if ($request->filled('date_to')) {
            $query->where('check_out', '<=', $request->get('date_to'));
        }

        $bookings = $query->latest()->paginate(15);

        // Get properties for filter dropdown
        $propertiesQuery = Property::query();
        
        // Filter by property for property owners
        if ($user->role === 'property_owner') {
            $propertiesQuery->where('owner_id', $user->id);
        }
        
        $properties = $propertiesQuery->active()->get(['id', 'name']);

        return Inertia::render('Admin/Bookings/Index', [
            'bookings' => $bookings,
            'properties' => $properties,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
                'payment_status' => $request->get('payment_status'),
                'property_id' => $request->get('property_id'),
                'date_from' => $request->get('date_from'),
                'date_to' => $request->get('date_to'),
            ]
        ]);
    }

    /**
     * Show the form for editing the specified booking.
     * 
     * @param Booking $booking
     * @return Response
     */
    public function edit(Booking $booking): Response
    {
        $this->authorize('update', $booking);

        $booking->load([
            'property',
            'guests',
            'services',
            'payments.paymentMethod',
            'workflow.processor'
        ]);

        // Get properties for dropdown
        $properties = Property::active()->get(['id', 'name']);
        
        // Get payment methods for inline payment form
        $paymentMethods = \App\Models\PaymentMethod::active()->get();

        return Inertia::render('Admin/Bookings/Edit', [
            'booking' => $booking,
            'properties' => $properties,
            'paymentMethods' => $paymentMethods,
        ]);
    }

    /**
     * Update the specified booking.
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function update(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('update', $booking);

        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'check_in_date' => 'required|date',
            'check_out_date' => 'required|date|after:check_in_date',
            'guest_male' => 'required|integer|min:0',
            'guest_female' => 'required|integer|min:0',
            'guest_children' => 'required|integer|min:0',
            'guest_name' => 'required|string|max:255',
            'guest_email' => 'required|email|max:255',
            'guest_phone' => 'required|string|max:20',
            'guest_country' => 'required|string|max:100',
            'guest_id_number' => 'nullable|string|max:50',
            'guest_gender' => 'required|in:male,female',
            'relationship_type' => 'required|in:keluarga,teman,kolega,pasangan,campuran',
            'special_requests' => 'nullable|string|max:1000',
            'internal_notes' => 'nullable|string|max:1000',
            'booking_status' => 'required|in:pending_verification,confirmed',
            'payment_status' => 'nullable|in:dp_pending,dp_received,fully_paid',
            'dp_percentage' => 'required|integer|in:30,50,70,100',
            'check_in_time' => 'required|string',
            'source' => 'required|in:direct,phone,walk_in,ota',
            // Payment fields
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'payment_amount' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:100',
            'account_name' => 'nullable|string|max:255',
            'verification_notes' => 'nullable|string|max:1000',
            // Rate override fields
            'rate_override' => 'nullable|boolean',
            'override_amount' => 'nullable|numeric|min:0',
            'override_reason' => 'nullable|string|max:500',
        ]);
        
        // Additional validation rules
        $this->validateBookingRules($validated, $request);

        $property = Property::findOrFail($validated['property_id']);
        $user = $request->user();
        
        // Check if user can manage this property
        if ($user->role === 'property_owner' && $property->owner_id !== $user->id) {
            abort(403, 'You can only edit bookings for your own properties.');
        }
        
        // Check if dates changed - validate availability
        if ($booking->check_in_date != $validated['check_in_date'] || 
            $booking->check_out_date != $validated['check_out_date']) {
            
            $isAvailable = $property->isAvailableForDates(
                $validated['check_in_date'],
                $validated['check_out_date'],
                $booking->id // exclude current booking
            );
            
            if (!$isAvailable) {
                return back()->withErrors(['error' => 'Property tidak tersedia untuk tanggal baru']);
            }
        }
        
        try {
            DB::beginTransaction();
            
            // Recalculate rate if dates/guests/property changed
            $needsRecalculation = (
                $booking->check_in_date != $validated['check_in_date'] ||
                $booking->check_out_date != $validated['check_out_date'] ||
                $booking->guest_count != ($validated['guest_male'] + $validated['guest_female'] + $validated['guest_children']) ||
                $booking->property_id != $validated['property_id']
            );
            
            $updateData = [
                'property_id' => $validated['property_id'],
                'check_in_date' => $validated['check_in_date'],
                'check_out_date' => $validated['check_out_date'],
                'guest_male' => $validated['guest_male'],
                'guest_female' => $validated['guest_female'],
                'guest_children' => $validated['guest_children'],
                'guest_count' => $validated['guest_male'] + $validated['guest_female'] + $validated['guest_children'],
                'guest_name' => $validated['guest_name'],
                'guest_email' => $validated['guest_email'],
                'guest_phone' => $validated['guest_phone'],
                'guest_country' => $validated['guest_country'],
                'guest_id_number' => $validated['guest_id_number'],
                'guest_gender' => $validated['guest_gender'],
                'relationship_type' => $validated['relationship_type'],
                'special_requests' => $validated['special_requests'],
                'internal_notes' => $validated['internal_notes'],
                'booking_status' => $validated['booking_status'],
                'payment_status' => $validated['payment_status'],
                'dp_percentage' => $validated['dp_percentage'],
                'check_in_time' => $validated['check_in_time'],
                'source' => $validated['source'],
            ];
            
            if ($needsRecalculation && !$validated['rate_override']) {
                // Recalculate using RateCalculationService
                $rateCalculation = $this->rateCalculationService->calculateRate(
                    $property,
                    $validated['check_in_date'],
                    $validated['check_out_date'],
                    $validated['guest_male'] + $validated['guest_female'] + $validated['guest_children']
                );
                
                $updateData['total_amount'] = $rateCalculation->totalAmount;
                $updateData['base_amount'] = $rateCalculation->baseAmount;
                $updateData['extra_bed_amount'] = $rateCalculation->extraBedAmount;
                $updateData['nights'] = $rateCalculation->nights;
            } elseif ($validated['rate_override']) {
                $updateData['total_amount'] = $validated['override_amount'];
                
                // Log rate override
                $updateData['internal_notes'] = ($updateData['internal_notes'] ? $updateData['internal_notes'] . "\n" : '') . 
                    "[" . now() . "] Rate override by " . $user->name . 
                    ": " . $validated['override_reason'] . 
                    " (Original: " . $booking->total_amount . ", New: " . $validated['override_amount'] . ")";
            }
            
            // Update booking
            $booking->update($updateData);
            
            // Create payment if payment data provided
            if ($validated['payment_method_id'] && $validated['payment_amount']) {
                $paymentMethod = \App\Models\PaymentMethod::findOrFail($validated['payment_method_id']);
                
                $payment = $booking->payments()->create([
                    'payment_method_id' => $validated['payment_method_id'],
                    'payment_number' => \App\Models\Payment::generatePaymentNumber(),
                    'amount' => $validated['payment_amount'],
                    'payment_type' => 'dp',
                    'payment_method' => $paymentMethod->type,
                    'payment_status' => $validated['payment_status'] ?? 'verified',
                    'payment_date' => $validated['payment_date'] ?: now(),
                    'reference_number' => $validated['reference_number'],
                    'bank_name' => $validated['bank_name'] ?: $paymentMethod->bank_name,
                    'account_number' => $validated['account_number'],
                    'account_name' => $validated['account_name'],
                    'verification_notes' => $validated['verification_notes'],
                    'processed_by' => $user->id,
                    'verified_by' => ($validated['payment_status'] ?? 'verified') === 'verified' ? $user->id : null,
                    'verified_at' => ($validated['payment_status'] ?? 'verified') === 'verified' ? now() : null,
                ]);

                // Update booking payment status
                $booking->updatePaymentStatus();
            }
            
            // Create workflow entry for edit
            $booking->workflow()->create([
                'step' => 'edited',
                'status' => 'completed',
                'processed_by' => $user->id,
                'processed_at' => now(),
                'notes' => 'Booking updated by admin' . ($needsRecalculation ? ' (dates/guests changed, rate recalculated)' : ''),
            ]);
            
            // Trigger status change event if status changed
            if ($booking->wasChanged('booking_status')) {
                event(new BookingStatusChanged($booking, $user));
            }

            DB::commit();

            return redirect()->route('admin.booking-management.show', $booking->booking_number)
                ->with('success', 'Booking updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            
            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to update booking: ' . $e->getMessage()]);
        }
    }

    /**
     * Update booking status with refund handling
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function updateStatus(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('update', $booking);
        
        $validated = $request->validate([
            'new_status' => 'required|in:pending_verification,confirmed,cancelled,completed',
            'refund_data' => 'nullable|array',
            'refund_data.refund_amount' => 'nullable|numeric|min:0',
            'refund_data.refund_reason' => 'nullable|string|max:500',
            'refund_data.refund_method' => 'nullable|string|max:100',
            'refund_data.refund_account' => 'nullable|string|max:255',
            'refund_data.refund_notes' => 'nullable|string|max:1000',
        ]);
        
        try {
            DB::beginTransaction();
            
            $user = $request->user();
            $oldStatus = $booking->booking_status;
            $newStatus = $validated['new_status'];
            
            // Update booking status
            $booking->update([
                'booking_status' => $newStatus,
                'updated_by' => $user->id,
            ]);
            
            // Handle refund if status changed to cancelled
            if ($newStatus === 'cancelled' && isset($validated['refund_data'])) {
                $refundData = $validated['refund_data'];
                
                // Create refund record
                $refund = $booking->refunds()->create([
                    'refund_amount' => $refundData['refund_amount'] ?? 0,
                    'refund_reason' => $refundData['refund_reason'] ?? 'Booking cancelled',
                    'refund_method' => $refundData['refund_method'] ?? 'bank_transfer',
                    'refund_account' => $refundData['refund_account'] ?? '',
                    'refund_notes' => $refundData['refund_notes'] ?? '',
                    'refund_status' => 'pending',
                    'processed_by' => $user->id,
                    'processed_at' => now(),
                ]);
                
                // Update booking payment status
                $booking->update(['payment_status' => 'refund_pending']);
            }
            
            // Create workflow entry
            $booking->workflow()->create([
                'step' => 'status_changed',
                'status' => 'completed',
                'processed_by' => $user->id,
                'processed_at' => now(),
                'notes' => "Status changed from {$oldStatus} to {$newStatus}" . 
                          ($newStatus === 'cancelled' ? ' (refund processed)' : ''),
            ]);
            
            // Trigger status change event
            event(new BookingStatusChanged($booking, $user));
            
            DB::commit();
            
            return redirect()->back()
                ->with('success', "Booking status updated to {$newStatus} successfully");
                
        } catch (\Exception $e) {
            DB::rollBack();
            
            return redirect()->back()
                ->withErrors(['error' => 'Failed to update booking status: ' . $e->getMessage()]);
        }
    }

    /**
     * Display booking details
     * 
     * @param Booking $booking
     * @return Response
     */
    public function show(Booking $booking): Response
    {
        $this->authorize('view', $booking);

        $booking->load([
            'property',
            'guests',
            'services',
            'payments.paymentMethod',
            'workflow.processor'
        ]);

        // Generate WhatsApp message template
        $whatsappData = $this->generateWhatsAppMessage($booking);

        return Inertia::render('Admin/Bookings/Show', [
            'booking' => $booking,
            'whatsappData' => $whatsappData,
        ]);
    }

    /**
     * Verify booking and change status to confirmed
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
            $oldStatus = $booking->booking_status;
            
            $booking->update([
                'verification_status' => 'approved',
                'booking_status' => 'confirmed',
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
            ]);

            // Create workflow record
            $booking->workflow()->create([
                'step' => 'approved',
                'status' => 'in_progress',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => $request->get('notes', 'Booking verified and confirmed by admin'),
            ]);

            DB::commit();

            // Dispatch BookingStatusChanged event
            event(new BookingStatusChanged($booking->load('property'), $oldStatus, 'confirmed', $request->user()));

            return redirect()->back()
                ->with('success', 'Booking verified successfully. Guest can now proceed with payment.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Booking verification failed: ' . $e->getMessage());
            return redirect()->back()
                ->withErrors(['error' => 'Failed to verify booking. Please try again.']);
        }
    }

    /**
     * Reject booking with reason
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function reject(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('reject', $booking);

        $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $oldStatus = $booking->booking_status;
            
            $booking->update([
                'verification_status' => 'rejected',
                'booking_status' => 'cancelled',
                'cancellation_reason' => $request->get('notes', 'Booking rejected by admin'),
                'cancelled_by' => $request->user()->id,
                'cancelled_at' => now(),
            ]);

            // Create workflow record
            $booking->workflow()->create([
                'step' => 'rejected',
                'status' => 'completed',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => $request->get('notes', 'Booking rejected by admin'),
            ]);

            DB::commit();

            // Dispatch BookingStatusChanged event
            event(new BookingStatusChanged($booking->load('property'), $oldStatus, 'cancelled', $request->user()));

            return redirect()->back()
                ->with('success', 'Booking rejected successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Booking rejection failed: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to reject booking. Please try again.');
        }
    }

    /**
     * Cancel booking with reason
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

        DB::beginTransaction();
        try {
            $oldStatus = $booking->booking_status;
            
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

            // Dispatch BookingStatusChanged event
            event(new BookingStatusChanged($booking->load('property'), $oldStatus, 'cancelled', $request->user()));

            return redirect()->back()
                ->with('success', 'Booking cancelled successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Booking cancellation failed: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to cancel booking. Please try again.');
        }
    }

    /**
     * Check-in guest
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function checkin(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('update', $booking);

        if ($booking->booking_status !== 'confirmed' && $booking->payment_status !== 'fully_paid') {
            return redirect()->back()
                ->with('error', 'Only confirmed bookings can be checked in.');
        }

        DB::beginTransaction();
        try {
            $oldStatus = $booking->booking_status;
            
            $booking->update([
                'booking_status' => 'checked_in',
                'checked_in_at' => now(),
                'checked_in_by' => $request->user()->id,
            ]);

            // Create workflow record
            $booking->workflow()->create([
                'step' => 'checked_in',
                'status' => 'in_progress',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => 'Guest checked in successfully',
            ]);

            DB::commit();

            // Dispatch BookingStatusChanged event
            event(new BookingStatusChanged($booking->load('property'), $oldStatus, 'checked_in', $request->user()));

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
     * Check-out guest  
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
                'is_cleaned' => false,
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
     * Generate WhatsApp message template (simplified - booking confirmation only)
     */
    private function generateWhatsAppMessage(Booking $booking): array
    {
        $property = $booking->property;
        
        // Find the guest user by email (correct approach)
        $guestUser = User::where('email', $booking->guest_email)->first();
        
        // Check if user is truly new (just created for this booking)
        $isNewUser = $guestUser && $guestUser->created_at->gte(now()->subHours(1));

        $message = "*Konfirmasi Booking #{$booking->booking_number}*\n\n";
        $message .= "Halo {$booking->guest_name},\n\n";
        $message .= "Booking Anda telah dikonfirmasi:\n";
        $message .= "📍 *Property*: {$property->name}\n";
        $message .= "📅 *Check-in*: " . \Carbon\Carbon::parse($booking->check_in)->format('d M Y') . "\n";
        $message .= "📅 *Check-out*: " . \Carbon\Carbon::parse($booking->check_out)->format('d M Y') . "\n";
        $message .= "👥 *Jumlah Tamu*: {$booking->guest_count} orang\n";
        $message .= "💰 *Total*: Rp " . number_format($booking->total_amount, 0, ',', '.') . "\n\n";

        // Payment information
        $message .= "*Status Pembayaran:*\n";
        $message .= "• Status: " . ucfirst($booking->payment_status) . "\n";
        
        if ($booking->payment_status !== 'fully_paid') {
            $message .= "• Silakan selesaikan pembayaran untuk konfirmasi booking\n";
            $message .= "• Link pembayaran: " . route('payments.create', $booking->booking_number) . "\n\n";
        } else {
            $message .= "• Pembayaran telah lunas ✅\n";
            $message .= "• Informasi check-in akan tersedia di dashboard Anda\n";
            $message .= "• Dashboard: " . route('dashboard') . "\n\n";
        }

        // Add login info for new users (only if account was just created)
        if ($isNewUser && $guestUser) {
            $message .= "*Akun Login Anda:*\n";
            $message .= "• Email: {$guestUser->email}\n";
            $message .= "• Login di: " . route('login') . "\n";
            $message .= "_Cek email Anda untuk password login_\n\n";
        } elseif ($guestUser) {
            // Existing user
            $message .= "*Akses Dashboard:*\n";
            $message .= "• Login dengan akun Anda di: " . route('login') . "\n";
            $message .= "• Email: {$guestUser->email}\n\n";
        }

        $message .= "Terima kasih telah memilih properti kami! 🏠\n";
        $message .= "Tim {$property->name}";

        return [
            'phone' => $this->formatPhoneNumber($booking->guest_phone),
            'message' => $message,
            'whatsapp_url' => "https://wa.me/{$this->formatPhoneNumber($booking->guest_phone)}?text=" . urlencode($message),
            'can_send' => !empty($booking->guest_phone),
        ];
    }

    /**
     * Format phone number for WhatsApp
     */
    private function formatPhoneNumber(string $phone): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Convert Indonesian format to international
        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        } elseif (substr($phone, 0, 2) !== '62') {
            $phone = '62' . $phone;
        }
        
        return $phone;
    }

    /**
     * Send WhatsApp message (redirect to WhatsApp Web)
     */
    public function sendWhatsApp(Booking $booking): RedirectResponse
    {
        $this->authorize('view', $booking);
        
        $whatsappData = $this->generateWhatsAppMessage($booking);
        
        if (!$whatsappData['can_send']) {
            return redirect()->back()->with('error', 'Guest phone number not available.');
        }

        return redirect($whatsappData['whatsapp_url']);
    }
}