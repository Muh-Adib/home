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
use App\Services\PaymentService;
use App\Services\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * BookingController - Controller untuk mengelola booking guest
 * 
 * Controller ini menangani semua fungsi guest terkait booking:
 * - Membuat booking baru (guest-facing)
 * - Melihat konfirmasi booking
 * - Melihat daftar booking milik user
 * - API untuk availability check
 * - API untuk rate calculation
 * 
 * Fungsi admin telah dipindahkan ke BookingManagementController
 */
class BookingController extends Controller
{
    public function __construct(
        private BookingService $bookingService,
        private PaymentService $paymentService,
        private AvailabilityService $availabilityService
    ) {
    }

    // ========================================
    // PUBLIC BOOKING METHODS (Guest-facing)
    // ========================================

    /**
     * Show the form for creating a new booking with guest details
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
     * Store a newly created booking
     * 
     * @param Request $request
     * @param Property $property
     * @return RedirectResponse
     */
    public function store(Request $request, Property $property): RedirectResponse
    {
        $validated = $request->validate([
            'check_in_date' => 'required|date|after_or_equal:today',
            'check_in_time' => 'required|date_format:H:i',
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
            'dp_percentage' => 'required|integer|in:30,50,70',
            'guests' => 'nullable|array',
        ]);

        try {
            // Check if user is authenticated
            if (!auth()->check()) {
                // Check if email already exists
                $existingUser = \App\Models\User::where('email', $validated['guest_email'])->first();
                
                if ($existingUser) {
                    // Email exists, user should login first
                    return back()->withErrors([
                        'guest_email' => 'Email sudah terdaftar. Silakan login terlebih dahulu atau gunakan fitur lupa password jika tidak ingat kata sandi.'
                    ])->withInput();
                }

                // Auto-register user if email doesn't exist
                return $this->autoRegisterAndBook($validated, $property);
            }

            // User is authenticated, proceed with normal booking
            $booking = $this->bookingService->createBooking($property, $validated, auth()->user());

            return redirect()->route('bookings.confirmation', $booking->booking_number)
                ->with('success', 'Booking berhasil dibuat. Silakan tunggu verifikasi dari admin.');

        } catch (\Exception $e) {
            Log::error('Booking creation failed: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Gagal membuat booking: ' . $e->getMessage()]);
        }
    }

    /**
     * Auto-register user and create booking
     * 
     * @param array $validated
     * @param Property $property
     * @return RedirectResponse
     */
    private function autoRegisterAndBook(array $validated, Property $property): RedirectResponse
    {
        DB::beginTransaction();
        try {
            // Generate random password
            $password = \Str::random(12);

            $user = \App\Models\User::create([
                'name' => $validated['guest_name'],
                'email' => $validated['guest_email'],
                'phone' => $validated['guest_phone'],
                'gender' => $validated['guest_gender'],
                'country' => $validated['guest_country'],
                'password' => \Hash::make($password),
                'role' => 'guest',
                'status' => 'active',
            ]);

            // Send welcome email with credentials
            try {
                \Mail::to($user->email)->send(new \App\Mail\WelcomeGuest($user, $password));
            } catch (\Exception $e) {
                Log::warning('Failed to send welcome email: ' . $e->getMessage());
            }

            // Login user
            Auth::login($user);

            // Create booking
            $booking = $this->bookingService->createBooking($property, $validated, $user);

            DB::commit();

            return redirect()->route('bookings.confirmation', $booking->booking_number)
                ->with('success', 'Akun berhasil dibuat dan booking berhasil disubmit! Silakan cek email untuk kredensial login dan verifikasi email.');

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Auto registration failed: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Gagal membuat akun dan booking. Silakan coba lagi.']);
        }
    }

    /**
     * Check if email exists (API)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function checkEmailExists(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $exists = \App\Models\User::where('email', $request->email)->exists();

        return response()->json([
            'exists' => $exists
        ]);
    }

    /**
     * Show booking confirmation page
     * 
     * @param Request $request
     * @param string $bookingNumber
     * @return Response
     */
    public function confirmation(Request $request, string $bookingNumber): Response
    {
        $booking = Booking::where('booking_number', $bookingNumber)->firstOrFail();
        $booking->load(['property', 'workflow']);
        // Generate payment link if needed
        if ($booking->booking_status === 'confirmed' && 
            in_array($booking->payment_status, ['dp_pending', 'dp_received'])) {
            $booking->payment_link = route('payments.create', $booking->booking_number);
        }

        return Inertia::render('Booking/Confirmation', [
            'booking' => $booking,
        ]);
    }

    /**
     * Display user's bookings
     * 
     * @param Request $request
     * @return Response
     */
    public function myBookings(Request $request): Response
    {
        $query = Booking::query()
            ->with(['property.media'])
            ->where('guest_email', auth()->user()->email ?? '')
            ->orWhere('created_by', auth()->id());

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

        $bookings = $query->latest()->paginate(10);

        // Transform bookings for frontend
        $bookings->getCollection()->transform(function ($booking) {
            // Calculate nights
            $checkIn = Carbon::parse($booking->check_in);
            $checkOut = Carbon::parse($booking->check_out);
            $booking->nights = $checkIn->diffInDays($checkOut);

            // Determine if can cancel (before check-in date and status allows)
            $booking->can_cancel = in_array($booking->booking_status, ['pending_verification', 'confirmed']) && 
                                   $checkIn->greaterThan(now()->addDay());

            // Generate payment link if needed
            if ($booking->booking_status === 'confirmed' && 
                in_array($booking->payment_status, ['dp_pending', 'dp_received'])) {
                $booking->payment_link = route('payments.create', $booking->booking_number);
            }

            return $booking;
        });

        return Inertia::render('Guest/MyBookings', [
            'bookings' => $bookings,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
                'payment_status' => $request->get('payment_status'),
            ]
        ]);
    }

    // ========================================
    // PUBLIC API METHODS
    // ========================================

    /**
     * Get property availability for date range (API)
     * 
     * @param Request $request
     * @param Property $property
     * @return JsonResponse
     */
    public function getAvailability(Request $request, Property $property): JsonResponse
    {
        try {
            //$property = Property::where('slug', $slug)->firstOrFail();
            
            //$request->validate([
            //    'check_in' => 'required|date',
            //    'check_out' => 'required|date|after:check_in',
            //]);

            //$checkIn = $request->get('check_in');
            //$checkOut = $request->get('check_out');
            $checkIn = new Carbon(today());
            $checkOut = new Carbon(today()->addDays(90));

            // Get booked dates in the range
            $bookedDates = $this->availabilityService->getBookedDatesInRange($property, $checkIn, $checkOut);

            return response()->json([
                'success' => true,
                'booked_dates' => $bookedDates,
                'property' => $property->slug,
                'date_range' => [
                    'start' => $checkIn,
                    'end' => $checkOut
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch availability: ' . $e->getMessage(),
                'booked_dates' => []
            ], 500);
        }
    }

    /**
     * Calculate rate for property and dates (API)
     * 
     * @param Request $request
     * @param Property $property
     * @return JsonResponse
     */
    public function calculateRate(Request $request, Property $property): JsonResponse
    {
        try {
            //$property = Property::where('slug', $slug)->firstOrFail();
            
            $request->validate([
                'check_in' => 'required|date|after_or_equal:today',
                'check_out' => 'required|date|after:check_in',
                'guests' => 'required|integer|min:1|max:' . $property->capacity_max,
            ]);

            $checkIn = $request->get('check_in');
            $checkOut = $request->get('check_out');
            $guestCount = $request->integer('guests');

            // Gunakan AvailabilityService untuk calculate rate dengan validation dan formatting
            //$result = $this->availabilityService->calculateRateFormatted($property, $checkIn, $checkOut, $guestCount);
            $result = $property->calculateRate($checkIn, $checkOut, $guestCount);
            dd($result);
            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate rate: ' . $e->getMessage()
            ], 422);
        }
    }
} 