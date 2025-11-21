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
use Illuminate\Database\QueryException;
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

        // Get availability data using the same service as show property
        $availabilityService = app(\App\Services\AvailabilityService::class);
            
        // Get availability data
        $availability = $availabilityService->checkAvailability(
            $property,
            $checkIn,
            $checkOut
        );
        
        if(!$availability['available']){
            return redirect()->back()->withErrors("Tanggal yang dipilih tidak tersedia");
        }        

        $initialFormData = [
            'check_in' => $checkIn ?? $today,
            'check_out' => $checkOut ?? $tomorrow,
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
       
        // Get active service masters for extra services
        $serviceMasters = \App\Models\ServiceMaster::active()->ordered()->get()->map(function ($service) {
            return [
                'id' => $service->id,
                'name' => $service->name,
                'description' => $service->description,
                'service_type' => $service->service_type,
                'service_type_label' => $service->getServiceTypeLabel(),
                'unit_price' => (float) $service->unit_price,
                'thumbnail_url' => $service->thumbnail_url,
                'is_active' => $service->is_active,
            ];
        });

        //jika tanggal yang dipilih sudah terdapat booking kirim ke halaman property dengan info tanggal yang di tilih tidak tersedia silahkan hubungi admin/ pilih property lain 

        return Inertia::render('Booking/Create', [
            'property' => $property->load(['amenities', 'media']),
            'initialFormData' => $initialFormData,
            'serviceMasters' => $serviceMasters,
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
        try {
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
            $booking = $this->createBookingNormally($property, $validated);
            
            return redirect()->route('bookings.confirmation', $booking->booking_number)
                ->with('success', 'Booking berhasil dibuat!');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Re-throw validation exceptions to let Laravel handle them properly
            // Inertia will automatically handle validation errors
            throw $e;
        } catch (\Illuminate\Database\QueryException $e) {
            // Handle database errors (like unique constraint violations)
            if ($e->getCode() == 23000 || str_contains($e->getMessage(), 'UNIQUE constraint')) {
                Log::warning('Booking number conflict detected, retrying...', [
                    'error' => $e->getMessage(),
                    'property_id' => $property->id ?? null,
                ]);
                
                // Retry booking creation - minimal delay since boot method handles uniqueness
                try {
                    // Minimal delay (10ms) - boot method will handle uniqueness with microsecond suffix
                    usleep(10000); // 10ms delay only
                    
                    // Force clear any cached booking number generation
                    // The boot method will handle generating a new unique booking number
                    $booking = $this->createBookingNormally($property, $validated);
                    
                    if ($booking && $booking->booking_number) {
                        Log::info('Booking retry successful', [
                            'booking_number' => $booking->booking_number,
                            'property_id' => $property->id,
                        ]);
                        return redirect()->route('bookings.confirmation', $booking->booking_number)
                            ->with('success', 'Booking berhasil dibuat!');
                    } else {
                        throw new \Exception('Booking created but booking_number is missing');
                    }
                } catch (\Illuminate\Database\QueryException $retryQueryException) {
                    // If retry also fails with duplicate, boot method should have handled it
                    // This should rarely happen now
                    Log::error('Booking retry failed - unexpected duplicate', [
                        'error' => $retryQueryException->getMessage(),
                    ]);
                    return back()
                        ->withInput()
                        ->withErrors(['error' => 'Gagal membuat booking karena konflik nomor booking. Silakan refresh halaman dan coba lagi.']);
                } catch (\Exception $retryException) {
                    Log::error('Booking retry failed', [
                        'error' => $retryException->getMessage(),
                        'trace' => $retryException->getTraceAsString(),
                    ]);
                    return back()
                        ->withInput()
                        ->withErrors(['error' => 'Gagal membuat booking. Silakan coba lagi.']);
                }
            }
            
            Log::error('Database error during booking creation', [
                'error' => $e->getMessage(),
                'property_id' => $property->id ?? null,
            ]);
            
            return back()
                ->withInput()
                ->withErrors(['error' => 'Terjadi kesalahan database. Silakan coba lagi.']);
        } catch (\Exception $e) {
            Log::error('Booking creation failed in store method', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'property_id' => $property->id ?? null,
                'property_slug' => $property->slug ?? null,
                'request_data' => $request->except(['password', '_token']),
            ]);
            
            return back()
                ->withInput()
                ->withErrors(['error' => 'Gagal membuat booking: ' . $e->getMessage()]);
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
            // ✅ FIX: Filter out invalid fields (like rate_breakdown) that might be sent from frontend
            // Only include fields that are valid for BookingRequest
            
            $allowedFields = [
                'property_id', 'check_in', 'check_in_date', 'check_out', 'check_out_date', 
                'check_in_time', 'guest_male', 'guest_female', 'guest_children', 'guest_count',
                'guest_name', 'guest_email', 'guest_phone', 'guest_country', 'guest_id_number',
                'guest_gender', 'relationship_type', 'guests', 'special_requests', 'internal_notes',
                'booking_status', 'payment_status', 'dp_percentage', 'auto_confirm', 'services'
            ];
            
            // Filter data to only include allowed fields
            $filteredData = array_intersect_key($data, array_flip($allowedFields));
            
            // ✅ FIX: Better field mapping and data preparation
            $bookingData = [
                'property_id' => $property->id,
                
                // ✅ FIX: Handle different date field names
                'check_in' => $filteredData['check_in'] ?? $filteredData['check_in_date'] ?? session('booking_data.check_in'),
                'check_out' => $filteredData['check_out'] ?? $filteredData['check_out_date'] ?? session('booking_data.check_out'),
                'check_in_time' => $filteredData['check_in_time'] ?? '15:00',

                // ✅ FIX: Better guest count calculation
                'guest_male' => (int)($filteredData['guest_male'] ?? 1),
                'guest_female' => (int)($filteredData['guest_female'] ?? 1),
                'guest_children' => (int)($filteredData['guest_children'] ?? 0),
                'guest_count' => (int)($filteredData['guest_count'] ?? 
                    ((int)($filteredData['guest_male'] ?? 1) + (int)($filteredData['guest_female'] ?? 1) + (int)($filteredData['guest_children'] ?? 0))),
                
                // Guest information
                'guest_name' => $filteredData['guest_name'] ?? '',
                'guest_email' => $filteredData['guest_email'] ?? '',
                'guest_phone' => $filteredData['guest_phone'] ?? '',
                'guest_country' => $filteredData['guest_country'] ?? 'Indonesia',
                'guest_id_number' => $filteredData['guest_id_number'] ?? '',
                'guest_gender' => $filteredData['guest_gender'] ?? 'male',
                'relationship_type' => $filteredData['relationship_type'] ?? 'keluarga',
                'guests' => $filteredData['guests'] ?? [],

                // Booking details
                'special_requests' => $filteredData['special_requests'] ?? '',
                'internal_notes' => $filteredData['internal_notes'] ?? '',
                'booking_status' => $filteredData['booking_status'] ?? 'pending_verification',
                'payment_status' => $filteredData['payment_status'] ?? 'dp_pending',
                'dp_percentage' => (int)($filteredData['dp_percentage'] ?? 50),
                'auto_confirm' => (bool)($filteredData['auto_confirm'] ?? false),
            ];

            // ✅ FIX: Validate required fields before proceeding
            $requiredFields = ['guest_name', 'guest_email', 'guest_phone'];
            foreach ($requiredFields as $field) {
                if (empty($bookingData[$field])) {
                    throw new \InvalidArgumentException("Field '{$field}' is required");
                }
            }

            // Create or find user if not authenticated
            $user = auth()->user();
            if (!$user) {
                $user = $this->createOrFindUser($bookingData);
                
                // ✅ AUTO LOGIN ENABLED: Auto-login new users immediately
                auth()->login($user);
                
                \Illuminate\Support\Facades\Log::info('New user auto-logged in after booking', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'was_recently_created' => $user->wasRecentlyCreated,
                ]);
            }
            
            // ✅ FIX: Create booking using service with proper error handling
            try {
                // Ensure booking_number is not set so it will be auto-generated
                unset($bookingData['booking_number']);
                
                $bookingRequest = BookingRequest::fromArray($bookingData);
                $booking = $this->bookingService->createBooking($bookingRequest, $user);
                
                // Create booking services if provided
                if (!empty($filteredData['services']) && is_array($filteredData['services'])) {
                    $servicesTotal = 0;
                    foreach ($filteredData['services'] as $serviceData) {
                        $bookingService = \App\Models\BookingService::create([
                            'booking_id' => $booking->id,
                            'service_master_id' => $serviceData['service_master_id'] ?? null,
                            'service_name' => $serviceData['service_name'],
                            'service_type' => $serviceData['service_type'],
                            'quantity' => $serviceData['quantity'],
                            'unit_price' => $serviceData['unit_price'],
                            'total_price' => $serviceData['total_price'],
                        ]);
                        $servicesTotal += $bookingService->total_price;
                    }

                    // Update booking total amount to include services
                    if ($servicesTotal > 0) {
                        $booking->update([
                            'service_amount' => $servicesTotal,
                            'total_amount' => $booking->total_amount + $servicesTotal,
                        ]);
                        // Recalculate DP and remaining amount
                        $booking->update([
                            'dp_amount' => ($booking->total_amount * $booking->dp_percentage) / 100,
                            'remaining_amount' => $booking->total_amount - (($booking->total_amount * $booking->dp_percentage) / 100),
                        ]);
                    }
                }
            } catch (\InvalidArgumentException $e) {
                Log::error('BookingRequest validation failed', [
                    'error' => $e->getMessage(),
                    'data' => $bookingData,
                    'user_id' => $user->id ?? null,
                ]);
                throw new \Exception('Invalid booking data: ' . $e->getMessage());
            }
            
            // Clear session data
            session()->forget(['booking_data', 'pending_booking_data']);
            
            return $booking;

        } catch (\Exception $e) {
            Log::error('Booking creation failed', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
                'property_id' => $property->id,
                'property_slug' => $property->slug,
                'data' => $data,
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

        // ✅ AUTO LOGIN ENABLED: Create new user with auto login
        $password = \Illuminate\Support\Str::random(12); // Generate secure random password
        
        $user = \App\Models\User::create([
            'name' => $data['guest_name'],
            'email' => $data['guest_email'],
            'phone' => $data['guest_phone'],
            'password' => \Illuminate\Support\Facades\Hash::make($password),
            'role' => 'guest',
            'status' => 'active',
            'email_verified_at' => now(), // Auto verify for immediate login
        ]);

        // ✅ AUTO LOGIN: Send welcome email with password (async to avoid timeout)
        // Kirim email welcome dengan secure signed URL untuk set password
try {
    // Dispatch ke queue (lebih baik untuk email)
    $user->notify(new \App\Notifications\GuestWelcomeNotification());

} catch (\Exception $e) {
    \Illuminate\Support\Facades\Log::error('Failed to send welcome email', [
        'user_id' => $user->id,
        'email' => $user->email,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
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
    public function confirmation(Booking $booking): RedirectResponse|Response
    {
        $user = auth()->user();
        
        // Allow access if:
        // 1. User is authenticated and email matches booking guest_email
        // 2. User is admin/staff
        // 3. No user but booking exists (for public confirmation after booking)
        if ($user) {
            // Check authorization only if user exists
            try {
                $this->authorize('view', $booking);
            } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
                // If authorization fails, check if it's because user email doesn't match
                // Allow access if user email matches guest_email (for newly created users)
                if ($user->email === $booking->guest_email) {
                    // Allow access even if role check fails
                } else {
                    // Re-throw if email doesn't match
                    throw $e;
                }
            }
        } else {
            // For unauthenticated users, allow access if booking was just created
            // This handles the case where user is redirected immediately after booking creation
            // Check if booking was created in the last 5 minutes
            if ($booking->created_at->diffInMinutes(now()) > 5) {
                // Booking is older than 5 minutes, require authentication
                return redirect()->route('login')
                    ->with('info', 'Silakan login untuk melihat detail booking Anda.');
            }
        }

        $isNewUser = false;

        if ($user && $user->email === $booking->guest_email) {
            // Check if user is new (created within last 24 hours and hasn't changed password)
            // We check if password was changed by checking if user has logged in more than once
            // or if there's a flag indicating password was changed
            $isNewUser = $user->created_at->diffInHours(now()) < 24;
            
            // If it's a new user, redirect to change password page
            //if ($isNewUser && !session('password_changed')) {
            //    session(['redirect_after_password_change' => route('bookings.confirmation', $booking->booking_number)]);
            //    return redirect()->route('password.change')
            //        ->with('info', 'Silakan ganti password Anda terlebih dahulu untuk melanjutkan.');
            //}
        }

        // Load booking with check-in instructions
        $booking->load(['property', 'payments']);
        //$booking->checkin_instructions = $booking->getCheckinInstructions();
        //$booking->checkin_instructions_formatted = $booking->getFormattedCheckinInstructions();

        return Inertia::render('Booking/Confirmation', [
            'booking' => $booking,
            'isNewUser' => $isNewUser,
        ]);
    }

    /**
     * Show user's bookings
     * 
     * Route: GET /my-bookings
     * User is automatically resolved by Laravel's route model binding
     */
    public function myBookings(Request $request): Response
    {
        $user = auth()->user();
        
        // ✅ FIX: Add pagination and filtering support
        $query = Booking::where('guest_email', $user->email)
            ->with(['property', 'payments']);
        
        // Search filter
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                  ->orWhere('guest_name', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('booking_status', $request->get('status'));
        }

        // Payment status filter
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->get('payment_status'));
        }

        // ✅ FIX: Return paginated results like frontend expects
        $bookings = $query->orderBy('created_at', 'desc')->paginate(10);
        
        return Inertia::render('Guest/MyBookings', [
            'bookings' => $bookings,
            'filters' => $request->only(['search', 'status', 'payment_status']),
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

            // Get rate calculation using RateCalculationService directly
            $rateCalculationService = app(\App\Services\RateCalculationService::class);
            $rateCalculation = $rateCalculationService->calculateRateFormatted(
                $property,
                $request->get('check_in'),
                $request->get('check_out'),
                $request->get('guest_count')
            );

            // Format response for frontend with comprehensive data
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
                'rates' => $rateCalculation && $rateCalculation['success'] ? $rateCalculation['calculation'] ?? [] : [],
                'property_info' => [
                    'id' => $property->id,
                    'name' => $property->name,
                    'base_rate' => $property->base_rate,
                    'capacity' => $property->capacity,
                    'capacity_max' => $property->capacity_max,
                    'cleaning_fee' => $property->cleaning_fee,
                    'extra_bed_rate' => $property->extra_bed_rate,
                    'weekend_premium_percent' => $property->weekend_premium_percent,
                    'weekend_premium_type' => $property->weekend_premium_type ?? 'percentage',
                    'weekend_premium_fixed' => $property->weekend_premium_fixed ?? 0,
                ],
                'availability' => [
                    'available' => $availability['available'] ?? false,
                    'booked_dates' => $availability['booked_dates'] ?? [],
                    'booked_periods' => $availability['booked_periods'] ?? [],
                ],
                'rate_calculation' => $rateCalculation && $rateCalculation['success'] ? $rateCalculation : null,
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