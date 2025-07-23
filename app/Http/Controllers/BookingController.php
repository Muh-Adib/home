<?php

namespace App\Http\Controllers;

use App\Http\Requests\Booking\CreateBookingRequest;
use App\Services\BookingService;
use App\Services\RateCalculationService;

use App\Domain\Booking\ValueObjects\BookingRequest;

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
        private BookingService $bookingService,
        private RateCalculationService $rateCalculationService
    ) {}

    /**
     * Show booking creation form
     * 
     * Route: GET|POST /properties/{property:slug}/book
     * Property is automatically resolved by Laravel's route model binding
     */
    public function create(Request $request, Property $property)
    {
        $user = auth()->user();
        // Ambil data dari request (GET)
        $checkIn = $request->query('check_in');
        $checkOut = $request->query('check_out'); 
        $guests = (int) $request->query('guests', 2); // Default 2 jika tidak ada

        $guestMale = (int)($guests/2);
        $guestFemale = (int)($guests/2);
        $guestChildren = (int)($guests%2);

        // Fallback default jika tidak ada input
        $today = now()->toDateString();
        $tomorrow = now()->addDay()->toDateString();

        $initialFormData = [
            'check_in_date' => $checkIn ?? $today,
            'check_out_date' => $checkOut ?? $tomorrow,
            'check_in_time' => '15:00',
            'guest_male' => $guestMale,
            'guest_female' => $guestFemale,
            'guest_children' => $guestChildren,
            'guest_name' => $user->name ?? '',
            'guest_email' => $user->email ?? '',
            'guest_phone' => $user->phone ?? '',
            'guest_country' => 'Indonesia',
            'guest_id_number' => '',
            'guest_gender' => $user->gender ?? 'male',
            'relationship_type' => 'keluarga',
            'special_requests' => '',
            'dp_percentage' => 50,
            'guests' => [],
        ];
       
        return Inertia::render('Booking/Create', [
            'property' => $property->load(['amenities', 'media']),
            'initialFormData' => $initialFormData,
            'auth' => [
                'user' => $user,
            ],
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
        $validated = $request->validated();
    
        // Check if user exists with email or phone
        $existingUser = \App\Models\User::where('email', $validated['guest_email'])
            ->orWhere('phone', $validated['guest_phone'])
            ->first();

        if ($existingUser && !auth()->check()) {
            // Save booking data to session
            session([
                'pending_booking_data' => [
                    'property_id' => $property->id,
                    'form_data' => $validated,
                    'booking_session' => session('booking_data'),
                    'created_at' => now(),
                ]
            ]);

            return redirect()->route('login')
                ->with('info', 'We found an existing account with your email/phone. Please login to continue booking.')
                ->with('intended_url', route('bookings.resume'));
        }

        // Proceed with normal booking creation
        try {
            $booking = $this->createBookingNormally($property, $validated);
            
            return redirect()->route('bookings.confirmation', $booking->booking_number)
                ->with('success', 'Booking berhasil dibuat!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Gagal membuat booking: ' . $e->getMessage()]);
        }
    }

    /**
     * Resume booking after login
     */
    public function resumeBooking(): RedirectResponse
    {
        if (!auth()->check()) {
            return redirect()->route('login');
        }

        $pendingData = session('pending_booking_data');
        
        if (!$pendingData || $pendingData['created_at']->lt(now()->subHours(2))) {
            session()->forget('pending_booking_data');
            return redirect()->route('properties.index')
                ->with('error', 'Booking session expired. Please start again.');
        }

        $property = Property::find($pendingData['property_id']);
        
        if (!$property) {
            return redirect()->route('properties.index')
                ->with('error', 'Property not found.');
        }

        // Restore session data
        session(['booking_data' => $pendingData['booking_session']]);

        try {
            // Create booking with saved data
            $booking = $this->createBookingNormally($property, $pendingData['form_data']);
            
            // Clear pending data
            session()->forget('pending_booking_data');
            
            return redirect()->route('bookings.confirmation', $booking->booking_number)
                ->with('success', 'Welcome back! Your booking has been created successfully.');

        } catch (\Exception $e) {
            return redirect()->route('properties.show', $property->slug)
                ->with('error', 'Failed to create booking. Please try again.');
        }
    }

    /**
     * Create booking normally (extracted for reuse)
     */
    private function createBookingNormally(Property $property, array $data)
    {
        
        try {
            // Ensure required fields are present and transform data for BookingService
            $bookingData = array_merge($data, [
                'property_id' => $property->id,

                'check_in_date' => $data['check_in_date'] ?? session('booking_data.check_in'),
                'check_out_date' => $data['check_out_date'] ?? session('booking_data.check_out'),
                'check_in_time' => $data['check_in_time'] ?? '15:00',

                'guest_name' => $data['guest_name'] ?? '',
                'guest_email' => $data['guest_email'] ?? '',
                'guest_phone' => $data['guest_phone'] ?? '',
                'guest_country' => $data['guest_country'] ?? 'Indonesia',
                'guest_id_number' => $data['guest_id_number'] ?? '',
                'guest_gender' => $data['guest_gender'] ?? 'male',
                'guest_count' => $data['guest_count'] ?? ($data['guest_male'] + $data['guest_female'] + $data['guest_children']),
                'guest_male' => $data['guest_male'] ?? 1,
                'guest_female' => $data['guest_female'] ?? 1,
                'guest_children' => $data['guest_children'] ?? 0,                
                'relationship_type' => $data['relationship_type'] ?? 'family',
                'guests' => $data['guests'] ?? [],

                
                'special_requests' => $data['special_requests'] ?? '',
                
                'dp_percentage' => $data['dp_percentage'] ?? 50,
            ]);
            

            // Create or find user if not authenticated
            $user = auth()->user();
            if (!$user) {
                $user = $this->createOrFindUser($bookingData);
                
                // Auto-login the user for better UX
                auth()->login($user);
            }
            
            // Create booking using service with correct signature
            $bookingRequest = BookingRequest::fromArray($bookingData);
            $booking = $this->bookingService->createBooking( $bookingRequest, $user);
            
            // Clear session data
            session()->forget(['booking_data', 'pending_booking_data']);
            
            return $booking;

        } catch (\Exception $e) {
            Log::error('Booking creation failed', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
                'property_id' => $property->id,
                'property_slug' => $property->slug,
            ]);

            throw $e;
        }
    }

    /**
     * Create or find user for booking (with proper password handling)
     */
    private function createOrFindUser(array $data): \App\Models\User
    {
        // Try to find existing user
        $user = \App\Models\User::where('email', $data['guest_email'])->first();
        
        if ($user) {
            // Update phone if needed
            if (empty($user->phone) && !empty($data['guest_phone'])) {
                $user->update(['phone' => $data['guest_phone']]);
            }
            return $user;
        }

        // Create new user with proper password
        $password = \Illuminate\Support\Str::random(12); // Generate secure random password
        
        $user = \App\Models\User::create([
            'name' => $data['guest_name'],
            'email' => $data['guest_email'],
            'phone' => $data['guest_phone'],
            'password' => \Illuminate\Support\Facades\Hash::make($password),
            'role' => 'guest',
            'status' => 'active',
        ]);

        // Send welcome email with password
        try {
            $user->notify(new \App\Notifications\GuestWelcomeNotification($password));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to send welcome email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage()
            ]);
        }

        return $user;
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