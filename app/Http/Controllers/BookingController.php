<?php

namespace App\Http\Controllers;

use App\Actions\Booking\CreateBookingAction;
use App\Actions\User\EnsureGuestUserAction;
use App\Http\Requests\Booking\CreateBookingRequest;
use App\Models\Booking;
use App\Models\Property;
use App\Models\ServiceMaster;
use App\Models\User;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use App\Services\RateCalculationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

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
        private RateCalculationService $rateCalculationService,
        private CreateBookingAction $createBookingAction,
        private EnsureGuestUserAction $ensureUserAction
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
        // Fallback default jika tidak ada input
        $today = now()->toDateString();
        $tomorrow = now()->addDay()->toDateString();

        $checkIn = $request->query('check_in') ?? $today;
        $checkOut = $request->query('check_out') ?? $tomorrow;
        $guests = (int) $request->query('guests', 2); // Default 2 jika tidak ada

        $guestMale = (int) ($guests / 2);
        $guestFemale = (int) ($guests / 2);
        $guestChildren = (int) ($guests % 2);

        // Get availability data using the same service as show property
        $availabilityService = app(AvailabilityService::class);

        // Get availability data
        $availability = $availabilityService->checkAvailability(
            $property,
            $checkIn,
            $checkOut
        );

        if (! $availability['available']) {
            return redirect()->back()->withErrors('Tanggal yang dipilih tidak tersedia');
        }

        $initialFormData = [
            'check_in' => $checkIn,
            'check_out' => $checkOut,
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
        $serviceMasters = ServiceMaster::active()->ordered()->get()->map(function ($service) {
            return [
                'id' => $service->id,
                'name' => $service->name,
                'description' => $service->description,
                'service_type' => $service->service_type,
                'service_type_label' => $service->getServiceTypeLabel(),
                'unit_price' => (float) $service->unit_price,
                'vendor_unit_price' => (float) $service->vendor_unit_price,
                'discount_amount' => (float) $service->discount_amount,
                'discount_limit' => $service->discount_limit,
                'thumbnail_url' => $service->thumbnail_url,
                'is_active' => $service->is_active,
            ];
        });

        // jika tanggal yang dipilih sudah terdapat booking kirim ke halaman property dengan info tanggal yang di tilih tidak tersedia silahkan hubungi admin/ pilih property lain

        return Inertia::render('Booking/Create', [
            'property' => $property->load(['amenities', 'media']),
            'initialFormData' => $initialFormData,
            'serviceMasters' => $serviceMasters,
            'auth' => [
                'user' => $user,
            ],
        ]);
    }

    public function store(CreateBookingRequest $request, Property $property)
    {
        try {
            $data = $request->validated();
            $data['property_id'] = $property->id;

            // Use CreateBookingAction (consolidated logic)
            $booking = $this->createBookingAction->execute($data, auth()->user());

            return to_route('bookings.confirmation', $booking->booking_number)
                ->with('success', 'Booking berhasil dibuat!');

        } catch (\Exception $e) {
            Log::error('Public booking store failed', [
                'error' => $e->getMessage(),
                'property_id' => $property->id,
                'data' => $request->except(['password']),
            ]);

            return back()->withErrors(['error' => 'Gagal membuat booking: '.$e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Resume booking after login
     */
    public function resumeBooking()
    {
        $pendingData = session('pending_booking_data');
        if (! $pendingData) {
            return to_route('home');
        }

        try {
            $property = Property::findOrFail($pendingData['property_id']);

            // Use CreateBookingAction
            $booking = $this->createBookingAction->execute($pendingData['form_data'], auth()->user());

            // Clear pending data
            session()->forget('pending_booking_data');

            return to_route('bookings.confirmation', $booking->booking_number)
                ->with('success', 'Booking berhasil dilanjutkan!');

        } catch (\Exception $e) {
            Log::error('Resume booking failed', [
                'error' => $e->getMessage(),
                'pending_data' => $pendingData,
            ]);

            return to_route('home')->withErrors(['error' => 'Gagal melanjutkan booking: '.$e->getMessage()]);
        }
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
            } catch (AuthorizationException $e) {
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
            // Check if booking was created in the last 2 minutes (reduced from 5 for security)
            if ($booking->created_at->diffInMinutes(now()) > 2) {
                // Booking is older than 2 minutes, require authentication
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
            // if ($isNewUser && !session('password_changed')) {
            //    session(['redirect_after_password_change' => route('bookings.confirmation', $booking->booking_number)]);
            //    return redirect()->route('password.change')
            //        ->with('info', 'Silakan ganti password Anda terlebih dahulu untuk melanjutkan.');
            // }
        }

        // Load booking with check-in instructions
        $booking->load(['property', 'payments']);
        // $booking->checkin_instructions = $booking->getCheckinInstructions();
        // $booking->checkin_instructions_formatted = $booking->getFormattedCheckinInstructions();

        return Inertia::render('Booking/Confirmation', [
            'booking' => $booking,
            'isNewUser' => $isNewUser,
        ]);
    }

    /**
     * Show booking detail for guest
     *
     * Route: GET /booking/{booking:booking_number}
     */
    public function show(Booking $booking): Response
    {
        $user = auth()->user();

        // Authorization: strict check for guest email or super_admin
        if ($booking->guest_email !== $user->email && ! $user->hasAnyRole(['super_admin', 'front_desk'])) {
            abort(403);
        }

        $booking->load(['property.media', 'payments', 'guests']);

        // Check-in instructions logic
        $checkInDate = Carbon::parse($booking->check_in);
        $canShowInstructions = $checkInDate->isToday() && now()->gte($checkInDate->setTimeFromTimeString('12:00')) || $booking->booking_status === 'checked_in';

        // WiFi logic: only show if checked in
        $showWifi = $booking->booking_status === 'checked_in';

        return Inertia::render('Guest/Booking/Show', [
            'booking' => array_merge($booking->toArray(), [
                'checkin_instructions' => $canShowInstructions ? $booking->getCheckinInstructions() : null,
                'checkin_instructions_formatted' => $canShowInstructions ? $booking->getFormattedCheckinInstructions() : null,
            ]),
            'show_wifi' => $showWifi,
            'wifi_password' => $showWifi ? $booking->property->wifi_password : null,
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
                'guest_count' => 'required|integer|min:1|max:'.$property->capacity_max,
            ]);

            $result = $this->rateCalculationService->calculateRateFormatted(
                $property,
                $request->input('check_in'),
                $request->input('check_out'),
                $request->input('guest_count')
            );

            return response()->json($result);

        } catch (ValidationException $e) {
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
                'message' => 'Rate calculation failed: '.$e->getMessage(),
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
                $request->input('check_in'),
                $request->input('check_out')
            );

            return response()->json([
                'success' => true,
                'booked_dates' => $bookedDates,
                'property' => $property->slug,
                'date_range' => [
                    'start' => $request->input('check_in'),
                    'end' => $request->input('check_out'),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Availability check failed', [
                'property_id' => $property->id,
                'property_slug' => $property->slug,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to check availability: '.$e->getMessage(),
                'booked_dates' => [],
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
                'guest_count' => 'required|integer|min:1|max:'.$property->capacity_max,
            ]);

            // Get availability data using the same service as show property
            $availabilityService = app(AvailabilityService::class);

            // Get availability data
            $availability = $availabilityService->checkAvailability(
                $property,
                $request->input('check_in'),
                $request->input('check_out')
            );

            // Get rate calculation using RateCalculationService directly
            $rateCalculationService = app(RateCalculationService::class);
            $rateCalculation = $rateCalculationService->calculateRateFormatted(
                $property,
                $request->input('check_in'),
                $request->input('check_out'),
                $request->input('guest_count')
            );

            // Format response for frontend with comprehensive data
            $response = [
                'success' => true,
                'property_id' => $property->id,
                'property_slug' => $property->slug,
                'date_range' => [
                    'start' => $request->input('check_in'),
                    'end' => $request->input('check_out'),
                ],
                'guest_count' => $request->input('guest_count'),
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

        } catch (ValidationException $e) {
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
                'message' => 'Failed to get availability and rates: '.$e->getMessage(),
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

        if (! $email) {
            return response()->json([
                'exists' => false,
                'email' => $request->email,
                'error' => 'Invalid email format',
            ], 422);
        }

        $exists = User::where('email', $email)->exists();

        return response()->json([
            'exists' => $exists,
            'email' => $email,
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
                $request->input('reason'),
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

            return back()->withErrors(['error' => 'Gagal membatalkan booking: '.$e->getMessage()]);
        }
    }

    /**
     * Generate and download PDF Invoice for booking (public guest route)
     */
    public function invoice(Booking $booking)
    {
        $booking->load(['property', 'payments', 'services.serviceMaster']);

        $pdf = Pdf::loadView('admin.bookings.invoice', compact('booking'));

        return $pdf->download("invoice-{$booking->booking_number}.pdf");
    }
}
