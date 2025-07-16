<?php

namespace App\Http\Controllers;

use App\Http\Requests\Booking\CreateBookingRequest;
use App\Services\BookingServiceRefactored;
use App\Services\RateCalculationService;
use App\Domain\Booking\ValueObjects\BookingRequest as BookingRequestVO;
use App\Models\Property;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Log;

/**
 * Refactored BookingController - Demonstrates Clean Architecture
 * 
 * This controller follows clean architecture principles:
 * - Thin controllers (only handle HTTP concerns)
 * - Business logic in services
 * - Validation in form requests
 * - Data access in repositories
 * - Route model binding with slug
 */
class BookingController extends Controller
{
    public function __construct(
        private BookingServiceRefactored $bookingService,
        private RateCalculationService $rateCalculationService
    ) {}

    /**
     * Show booking creation form
     * 
     * Route: GET /properties/{property:slug}/book
     * Property is automatically resolved by Laravel's route model binding
     */
    public function create(Property $property): Response
    {
        // Get search parameters from URL
        $searchParams = request()->only(['check_in', 'check_out', 'guests']);
        
        // Get initial availability data for the property - same as show property
        $initialAvailabilityData = null;
        try {
            $startDate = $searchParams['check_in'] ?? now()->toDateString();
            $endDate = $searchParams['check_out'] ?? now()->addMonths(3)->toDateString();
            $guestCount = $searchParams['guests'] ?? 2;
            
            // Get availability data using the same service as show property
            $availabilityService = app(\App\Services\AvailabilityService::class);
            
            // Get availability data - same format as show property
            $availability = $availabilityService->checkAvailability($property, $startDate, $endDate);
            
            // Get rate calculation - same format as show property
            $rateCalculation = null;
            try {
                $rateCalculation = $availabilityService->calculateRateFormatted($property, $startDate, $endDate, $guestCount);
            } catch (\Exception $e) {
                \Log::warning('Rate calculation failed for initial data: ' . $e->getMessage());
            }
            
            // Format data for frontend - same format as show property
            $initialAvailabilityData = [
                'success' => true,
                'property_id' => $property->id,
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate,
                ],
                'guest_count' => $guestCount,
                'booked_dates' => $availability['booked_dates'] ?? [],
                'booked_periods' => $availability['booked_periods'] ?? [],
                'rates' => $rateCalculation && isset($rateCalculation['rates']) ? $rateCalculation['rates'] : [],
                'property_info' => [
                    'base_rate' => $property->base_rate,
                    'capacity' => $property->capacity,
                    'capacity_max' => $property->capacity_max,
                    'cleaning_fee' => $property->cleaning_fee,
                    'extra_bed_rate' => $property->extra_bed_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                ],
                // Add additional data needed for booking
                'max_selectable_date' => now()->addMonths(12)->toDateString(),
                'min_stay_weekday' => $property->min_stay_weekday,
                'min_stay_weekend' => $property->min_stay_weekend,
                'min_stay_peak' => $property->min_stay_peak,
            ];
        } catch (\Exception $e) {
            \Log::error('Error getting initial availability data for booking create: ' . $e->getMessage());
            // Provide fallback data
            $initialAvailabilityData = [
                'success' => true,
                'property_id' => $property->id,
                'date_range' => [
                    'start' => $searchParams['check_in'] ?? now()->toDateString(),
                    'end' => $searchParams['check_out'] ?? now()->addMonths(3)->toDateString(),
                ],
                'guest_count' => $searchParams['guests'] ?? 2,
                'booked_dates' => [],
                'booked_periods' => [],
                'rates' => [],
                'property_info' => [
                    'base_rate' => $property->base_rate,
                    'capacity' => $property->capacity,
                    'capacity_max' => $property->capacity_max,
                    'cleaning_fee' => $property->cleaning_fee,
                    'extra_bed_rate' => $property->extra_bed_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                ],
                'max_selectable_date' => now()->addMonths(12)->toDateString(),
                'min_stay_weekday' => $property->min_stay_weekday,
                'min_stay_weekend' => $property->min_stay_weekend,
                'min_stay_peak' => $property->min_stay_peak,
            ];
        }

        return Inertia::render('Booking/Create', [
            'property' => $property->load(['amenities', 'media']),
            'initialAvailabilityData' => $initialAvailabilityData,
        ]);
    }

    /**
     * Store new booking
     * 
     * Route: POST /properties/{property:slug}/book
     * Property is automatically resolved by Laravel's route model binding
     */
    public function store(CreateBookingRequest $request, Property $property): RedirectResponse
    {
        try {
            // Add property_id to validated data since it comes from route
            $validatedData = $request->validated();
            $validatedData['property_id'] = $property->id;
            
            // Convert request to value object
            $bookingRequest = BookingRequestVO::fromArray($validatedData);
            
            // Create booking using service
            $booking = $this->bookingService->createBooking($bookingRequest, auth()->user());
            
            return redirect()->route('bookings.confirmation', $booking->booking_number)
                ->with('success', 'Booking berhasil dibuat!');

        } catch (\Exception $e) {
            Log::error('Booking creation failed', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
                'property_id' => $property->id,
                'property_slug' => $property->slug,
            ]);

            return back()->withErrors(['error' => 'Gagal membuat booking: ' . $e->getMessage()]);
        }
    }

    /**
     * Show booking confirmation
     * 
     * Route: GET /bookings/{booking:booking_number}/confirmation
     * Booking is automatically resolved by Laravel's route model binding
     */
    public function confirmation(Booking $booking): Response
    {
        $this->authorize('view', $booking);

        return Inertia::render('Booking/Confirmation', [
            'booking' => $booking->load(['property', 'payments']),
        ]);
    }

    /**
     * Show user's bookings
     * 
     * Route: GET /my-bookings
     * User is automatically resolved by Laravel's route model binding
     */
    public function myBookings(): Response
    {
        $bookings = $this->bookingService->getUserBookings(auth()->user());

        return Inertia::render('Guest/MyBookings', [
            'bookings' => $bookings,
        ]);
    }

    /**
     * Calculate rate (API)
     * 
     * Route: GET /api/properties/{property:slug}/calculate-rate
     * Property is automatically resolved by Laravel's route model binding
     */
    public function calculateRate(Request $request, Property $property): JsonResponse
    {
        try {
            $request->validate([
                'check_in' => 'required|date|after_or_equal:today',
                'check_out' => 'required|date|after:check_in',
                'guest_count' => 'required|integer|min:1|max:' . $property->capacity_max,
            ]);

            $result = $this->rateCalculationService->calculateRateFormatted(
                $property,
                $request->get('check_in'),
                $request->get('check_out'),
                $request->get('guest_count')
            );

            return response()->json($result);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('Rate calculation failed', [
                'property_id' => $property->id,
                'property_slug' => $property->slug,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Rate calculation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check availability (API)
     * 
     * Route: GET /api/properties/{property:slug}/availability
     * Property is automatically resolved by Laravel's route model binding
     */
    public function getAvailability(Request $request, Property $property): JsonResponse
    {
        try {
            $request->validate([
                'check_in' => 'required|date',
                'check_out' => 'required|date|after:check_in',
            ]);

            $bookedDates = $this->bookingService->getBookedDates(
                $property,
                $request->get('check_in'),
                $request->get('check_out')
            );

            return response()->json([
                'success' => true,
                'booked_dates' => $bookedDates,
                'property' => $property->slug,
                'date_range' => [
                    'start' => $request->get('check_in'),
                    'end' => $request->get('check_out')
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Availability check failed', [
                'property_id' => $property->id,
                'property_slug' => $property->slug,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to check availability: ' . $e->getMessage(),
                'booked_dates' => []
            ], 500);
        }
    }

    /**
     * Get availability and rates (API)
     * 
     * Route: GET /api/properties/{property:slug}/availability-and-rates
     * Property is automatically resolved by Laravel's route model binding
     */
    public function getAvailabilityAndRates(Request $request, Property $property): JsonResponse
    {
        try {
            $request->validate([
                'check_in' => 'required|date',
                'check_out' => 'required|date|after:check_in',
                'guest_count' => 'required|integer|min:1|max:' . $property->capacity_max,
            ]);

            // Get availability data using the same service as show property
            $availabilityService = app(\App\Services\AvailabilityService::class);
            
            // Get availability data
            $availability = $availabilityService->checkAvailability(
                $property,
                $request->get('check_in'),
                $request->get('check_out')
            );

            // Get rate calculation
            $rateCalculation = $availabilityService->calculateRateFormatted(
                $property,
                $request->get('check_in'),
                $request->get('check_out'),
                $request->get('guest_count')
            );

            // Format response for frontend
            $response = [
                'success' => true,
                'property_id' => $property->id,
                'property_slug' => $property->slug,
                'date_range' => [
                    'start' => $request->get('check_in'),
                    'end' => $request->get('check_out')
                ],
                'guest_count' => $request->get('guest_count'),
                'booked_dates' => $availability['booked_dates'] ?? [],
                'booked_periods' => $availability['booked_periods'] ?? [],
                'rates' => $rateCalculation && $rateCalculation['success'] ? $rateCalculation['rates'] ?? [] : [],
                'property_info' => [
                    'base_rate' => $property->base_rate,
                    'capacity' => $property->capacity,
                    'capacity_max' => $property->capacity_max,
                    'cleaning_fee' => $property->cleaning_fee,
                    'extra_bed_rate' => $property->extra_bed_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                ],
            ];

            return response()->json($response);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('Availability and rates check failed', [
                'property_id' => $property->id,
                'property_slug' => $property->slug,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get availability and rates: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if email exists (API)
     * 
     * Route: GET /api/check-email-exists
     * Request is validated using Laravel's request validation
     */
    public function checkEmailExists(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|max:255',
        ]);

        // Use validated data to prevent any potential injection
        $email = $request->validated()['email'];
        
        // Additional sanitization for extra security
        $email = filter_var($email, FILTER_SANITIZE_EMAIL);
        
        if (!$email) {
            return response()->json([
                'exists' => false,
                'email' => $request->email,
                'error' => 'Invalid email format'
            ], 422);
        }

        $exists = \App\Models\User::where('email', $email)->exists();

        return response()->json([
            'exists' => $exists,
            'email' => $email
        ]);
    }

    /**
     * Cancel booking
     * 
     * Route: POST /bookings/{booking:booking_number}/cancel
     * Booking is automatically resolved by Laravel's route model binding
     * Request is validated using Laravel's request validation
     */
    public function cancel(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('cancel', $booking);

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $success = $this->bookingService->cancelBooking(
                $booking,
                $request->get('reason'),
                auth()->user()
            );

            if ($success) {
                return back()->with('success', 'Booking berhasil dibatalkan.');
            }

            return back()->withErrors(['error' => 'Gagal membatalkan booking.']);

        } catch (\Exception $e) {
            Log::error('Booking cancellation failed', [
                'booking_number' => $booking->booking_number,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors(['error' => 'Gagal membatalkan booking: ' . $e->getMessage()]);
        }
    }
} 