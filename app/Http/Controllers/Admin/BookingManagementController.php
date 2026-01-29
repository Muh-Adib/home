<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Services\BookingService;
use App\Services\AvailabilityService;
use App\Services\RateCalculationService;
use App\Services\PaymentIncomeSyncService;
use App\Services\PaymentGatewayService;
use App\Services\GuestCountService;
use App\Services\BookingDailyRevenueService;
use App\Services\BookingServiceSyncService;
use App\Services\RateOverrideLogService;
use App\Events\BookingStatusChanged;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\BookingsExport;
use App\Imports\BookingsImport;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\Storage;

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
    private PaymentGatewayService $gatewayService;
    private GuestCountService $guestCountService;
    private BookingDailyRevenueService $dailyRevenueService;
    private BookingServiceSyncService $serviceSyncService;
    private RateOverrideLogService $rateOverrideLogService;
    private \App\Services\AdminBookingService $adminBookingService;
    private AvailabilityService $availabilityService;

    public function __construct(
        BookingService $bookingService,
        RateCalculationService $rateCalculationService,
        PaymentGatewayService $gatewayService,
        GuestCountService $guestCountService,
        BookingDailyRevenueService $dailyRevenueService,
        BookingServiceSyncService $serviceSyncService,
        RateOverrideLogService $rateOverrideLogService,
        \App\Services\AdminBookingService $adminBookingService,
        AvailabilityService $availabilityService
    ) {
        $this->bookingService = $bookingService;
        $this->rateCalculationService = $rateCalculationService;
        $this->gatewayService = $gatewayService;
        $this->guestCountService = $guestCountService;
        $this->dailyRevenueService = $dailyRevenueService;
        $this->serviceSyncService = $serviceSyncService;
        $this->rateOverrideLogService = $rateOverrideLogService;
        $this->adminBookingService = $adminBookingService;
        $this->availabilityService = $availabilityService;
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
                'status_color' => $booking->getStatusColor(),
                'can_edit' => $user->can('update', $booking),
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

                $availabilityData = $this->availabilityService->getAvailabilityData($selectedProperty, $startDate, $endDate);
            } catch (\Throwable $e) {
                \Log::error('Error getting availability data for admin booking create: ' . $e->getMessage());
            }
        }

        // Get payment methods for inline payment form
        $paymentMethods = \App\Models\PaymentMethod::active()->get();

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

        return Inertia::render('Admin/Bookings/Create', [
            'properties' => $properties,
            'selectedProperty' => $selectedProperty,
            'prefilledData' => $prefilledData,
            'availabilityData' => $availabilityData,
            'paymentMethods' => $paymentMethods,
            'serviceMasters' => $serviceMasters,
        ]);
    }

    /**
     * Store manual booking created by admin using AdminBookingService
     * ✅ REFACTORED: Business logic moved to AdminBookingService
     */
    public function store(\App\Http\Requests\Admin\CreateBookingRequest $request): RedirectResponse
    {
        // Increase execution time for processing heavy request (images, emails, etc)
        set_time_limit(300);

        // ✅ All form validation is handled by CreateBookingRequest automatically
        $validated = $request->validated();

        $property = Property::findOrFail($validated['property_id']);
        $user = $request->user();

        $guestCount = (int) ($validated['guest_male'] + $validated['guest_female'] + $validated['guest_children']);
        if ($guestCount > $property->capacity_max) {
            return back()->withErrors([
                'guest_count' => "Total guests ({$guestCount}) exceeds property maximum capacity ({$property->capacity_max}).",
            ])->withInput();
        }

        // ✅ Check availability using AvailabilityService for consistency
        $availabilityService = app(\App\Services\AvailabilityService::class);
        $forceOverride = $request->boolean('force_ota_override');

        $availability = $availabilityService->checkAvailability(
            $property,
            $validated['check_in_date'],
            $validated['check_out_date'],
            $guestCount,
            null, // No exclude booking ID
            $forceOverride // Ignore OTA bookings if forced
        );

        if (!$availability['available']) {
            // Get detailed information about overlapping bookings for debugging
            $overlappingBookings = \App\Models\Booking::where('property_id', $property->id)
                ->whereIn('booking_status', ['pending_verification', 'confirmed', 'checked_in', 'checked_out'])
                ->where(function ($query) use ($validated) {
                    $query->where('check_in', '<', $validated['check_out_date'])
                        ->where('check_out', '>', $validated['check_in_date']);
                })
                ->get(['id', 'booking_number', 'booking_status', 'check_in', 'check_out', 'guest_name', 'source']);

            // Check if blocked by OTA only
            $blockedByOtaOnly = $overlappingBookings->every(function ($booking) {
                return in_array($booking->source, ['airbnb', 'booking_com', 'ota']);
            });

            // Log for debugging with detailed information
            \Log::warning('Booking creation blocked - property not available', [
                'property_id' => $property->id,
                'property_name' => $property->name,
                'check_in' => $validated['check_in_date'],
                'check_out' => $validated['check_out_date'],
                'booked_dates_count' => count($availability['booked_dates'] ?? []),
                'booked_periods_count' => count($availability['booked_periods'] ?? []),
                'overlapping_bookings' => $overlappingBookings->map(function ($b) {
                    return [
                        'id' => $b->id,
                        'booking_number' => $b->booking_number,
                        'status' => $b->booking_status,
                        'check_in' => $b->check_in,
                        'check_out' => $b->check_out,
                        'guest_name' => $b->guest_name,
                        'source' => $b->source,
                    ];
                })->toArray(),
            ]);

            return back()->withErrors([
                'error' => 'Property is not available for selected dates.',
                'booked_periods' => $availability['booked_periods'] ?? [],
                'can_override' => $blockedByOtaOnly, // Trigger frontend to show override option
            ]);
        }

        // ✅ Delegate all business logic to AdminBookingService
        $result = $this->adminBookingService->createAdminBooking(
            $validated,
            $request->file('payment_proof'),
            $user
        );

        if ($result->isFailure()) {
            return back()->withErrors($result->getErrors());
        }

        return redirect()
            ->route('admin.booking-management.show', $result->getBooking())
            ->with('success', 'Booking created successfully.');
    }

    /**
     * Get property availability for date range (API)
     */
    public function checkAvailability(\App\Http\Requests\Admin\CheckAvailabilityRequest $request)
    {
        // Validation handled in CheckAvailabilityRequest

        $property = Property::findOrFail($request->property_id);
        $excludeBookingId = $request->get('exclude_booking_id');

        // Use AvailabilityService for all availability checking (now supports excludeBookingId)
        $availabilityService = app(\App\Services\AvailabilityService::class);
        $availabilityData = $availabilityService->checkAvailability(
            $property,
            $request->check_in,
            $request->check_out,
            $excludeBookingId
        );

        return response()->json([
            'available' => $availabilityData['available'],
            'property_id' => $property->id,
            'check_in' => $request->check_in,
            'check_out' => $request->check_out,
            'booked_dates' => $availabilityData['booked_dates'] ?? [],
            'booked_periods' => $availabilityData['booked_periods'] ?? [],
        ]);
    }

    /**
     * Calculate rate for property and dates (API)
     */
    public function calculateRate(\App\Http\Requests\Admin\CalculateRateRequest $request)
    {
        // Validation handled in CalculateRateRequest
        $validated = $request->validated();

        try {
            $property = Property::findOrFail($validated['property_id']);

            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $validated['check_in'],
                $validated['check_out'],
                $validated['guest_count']
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
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Property not found',
                'message' => 'Property dengan ID ' . ($validated['property_id'] ?? 'unknown') . ' tidak ditemukan',
            ], 404);
        } catch (\Throwable $e) {
            \Log::error('Rate calculation error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Failed to calculate rate: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get availability and rates combined for admin (single endpoint)
     */
    public function availabilityAndRates(\App\Http\Requests\Admin\CalculateRateRequest $request)
    {
        // Validation handled in CalculateRateRequest
        $validated = $request->validated();

        try {
            $property = Property::findOrFail($validated['property_id']);

            // Availability
            $availabilityService = app(\App\Services\AvailabilityService::class);
            $availability = $availabilityService->checkAvailability(
                $property,
                $validated['check_in'],
                $validated['check_out']
            );

            // Rate calculation
            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $validated['check_in'],
                $validated['check_out'],
                (int) $validated['guest_count']
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
                    'weekend_premium_type' => $property->weekend_premium_type ?? 'percentage',
                    'weekend_premium_fixed' => $property->weekend_premium_fixed ?? 0,
                ],
                'date_range' => [
                    'start' => $validated['check_in'],
                    'end' => $validated['check_out'],
                ],
                'guest_count' => (int) $validated['guest_count'],
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
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Property not found',
                'message' => 'Property dengan ID ' . ($validated['property_id'] ?? 'unknown') . ' tidak ditemukan',
            ], 404);
        } catch (\Throwable $e) {
            \Log::error('Availability and rates error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Failed to get availability and rates: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get timeline data for properties
     */
    /**
     * Get timeline data for properties
     */
    public function timeline(Request $request)
    {
        $user = $request->user();
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->addMonths(2)->endOfMonth()->toDateString());

        // Get bookings for timeline
        $bookingsQuery = Booking::query()
            ->with(['property'])
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('check_in', [$startDate, $endDate])
                    ->orWhereBetween('check_out', [$startDate, $endDate])
                    ->orWhere(function ($q) use ($startDate, $endDate) {
                        $q->where('check_in', '<=', $startDate)
                            ->where('check_out', '>=', $endDate);
                    });
            });

        // Filter by property owner role
        if ($user->role === 'property_owner') {
            $bookingsQuery->whereHas('property', function ($query) use ($user) {
                $query->where('owner_id', $user->id);
            });
        }

        // Filter by specific property if requested
        if ($request->filled('property_id') && $request->property_id !== 'all') {
            $bookingsQuery->where('property_id', $request->property_id);
        }

        // Filter by status if requested
        if ($request->filled('status') && $request->status !== 'all') {
            $bookingsQuery->where('booking_status', $request->status);
        }

        $bookings = $bookingsQuery->orderBy('check_in')->get()->map(function ($booking) {
            $booking->status_color = $booking->getStatusColor();
            return $booking;
        });

        return response()->json([
            'bookings' => $bookings,
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

        // Date range
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->addMonths(2)->endOfMonth()->toDateString());

        $bookingsQuery = Booking::query()
            ->with(['property'])
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('check_in', [$startDate, $endDate])
                    ->orWhereBetween('check_out', [$startDate, $endDate])
                    ->orWhere(function ($q) use ($startDate, $endDate) {
                        $q->where('check_in', '<=', $startDate)
                            ->where('check_out', '>=', $endDate);
                    });
            });

        // Filter by property owner role
        if ($user->role === 'property_owner') {
            $bookingsQuery->whereHas('property', function ($query) use ($user) {
                $query->where('owner_id', $user->id);
            });
        }

        // Filter by specific property if requested
        if ($request->filled('property_id') && $request->property_id !== 'all') {
            $bookingsQuery->where('property_id', $request->property_id);
        }

        // Filter by status if requested
        if ($request->filled('status') && $request->status !== 'all') {
            $bookingsQuery->where('booking_status', $request->status);
        }

        $bookings = $bookingsQuery->get()->map(function ($booking) {
            $booking->status_color = $booking->getStatusColor();
            return $booking;
        });

        // Calculate stats based on current filter context
        $stats = [
            'total_bookings' => $bookings->count(),
            'pending_verification' => $bookings->where('booking_status', 'pending_verification')->count(),
            'confirmed' => $bookings->where('booking_status', 'confirmed')->count(),
            'checked_in' => $bookings->where('booking_status', 'checked_in')->count(),
            'total_revenue' => $bookings->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out', 'completed'])->sum('total_amount'),
        ];

        return Inertia::render('Admin/Bookings/Timeline', [
            'properties' => $properties,
            'bookings' => $bookings,
            'stats' => $stats,
            'filters' => [
                'property_id' => $request->get('property_id'),
                'status' => $request->get('status'),
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days' => $request->get('days', '30'),
            ]
        ]);
    }

    /**
     * Get property date range data for admin booking creation
     */
    public function getPropertyDateRange(\App\Http\Requests\Admin\GetPropertyDateRangeRequest $request)
    {
        // Validation handled in GetPropertyDateRangeRequest

        $property = Property::findOrFail($request->property_id);
        $startDate = $request->get('start_date', now()->toDateString());
        $endDate = $request->get('end_date', now()->addMonths(3)->toDateString());

        try {
            // Get availability data using AvailabilityService
            $availabilityService = app(\App\Services\AvailabilityService::class);
            $availability = $availabilityService->checkAvailability($property, $startDate, $endDate);

            // Use AvailabilityService for consistency (single source of truth)
            // This ensures we get ALL booked dates including pending_verification bookings
            $bookedDates = $availabilityService->getBookedDatesInRange($property, $startDate, $endDate);

            // Get seasonal rates if available
            $seasonalRates = \App\Models\PropertySeasonalRate::getEffectiveRateForProperty(
                $property->id,
                \Carbon\Carbon::parse($startDate),
                \Carbon\Carbon::parse($endDate)
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
                    'weekend_premium_type' => $property->weekend_premium_type ?? 'percentage',
                    'weekend_premium_fixed' => $property->weekend_premium_fixed ?? 0,
                ],
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate,
                ],
                'booked_dates' => $bookedDates,
                'availability_data' => $availability,
                'seasonal_rates' => $seasonalRates,
            ]);

        } catch (\Throwable $e) {
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
    // ✅ REMOVED: getStatusColor() - Now using $booking->getStatusColor() from HasBookingStatus trait
    // ✅ REMOVED: canEditBooking() - Now using Policy: $user->can('update', $booking)

    /**
     * Additional validation rules for booking creation/update
     */
    // ✅ REMOVED: validateBookingRules() - This logic should be in Form Request (withValidator method)
    // TODO: Move remaining validation logic to CreateBookingRequest::withValidator()

    /**
     * Search bookings (independent search API for search bar)
     */
    public function search(Request $request): JsonResponse
    {
        $query = $request->input('q', '');

        // Minimum 2 characters
        if (strlen($query) < 2) {
            return response()->json([
                'success' => true,
                'bookings' => [],
                'count' => 0
            ]);
        }

        $user = $request->user();

        // Build query with minimal columns for performance
        $bookings = Booking::query()
            ->select([
                'id',
                'booking_number',
                'guest_name',
                'guest_email',
                'guest_phone',
                'check_in',
                'check_out',
                'total_amount',
                'booking_status',
                'payment_status',
                'property_id',
                'created_at'
            ])
            ->with('property:id,name');

        // Role-based filtering
        if ($user->role === 'property_owner') {
            $bookings->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        // Search across multiple fields
        $bookings->where(function ($q) use ($query) {
            $q->where('booking_number', 'LIKE', "%{$query}%")
                ->orWhere('guest_name', 'LIKE', "%{$query}%")
                ->orWhere('guest_email', 'LIKE', "%{$query}%")
                ->orWhere('guest_phone', 'LIKE', "%{$query}%");
        });

        // Exclude cancelled by default
        $bookings->where('booking_status', '!=', 'cancelled');

        // Order by most recent and limit results
        $results = $bookings->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'bookings' => $results,
            'count' => $results->count()
        ]);
    }

    /**
     * Get timeline data for infinite scroll (API endpoint for lazy loading)
     * Optimized for performance with minimal queries and data
     */
    public function timelineData(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Validate date range
            $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'property_id' => 'nullable|exists:properties,id',
                'status' => 'nullable|string',
            ]);

            $dateFrom = $request->get('date_from');
            $dateTo = $request->get('date_to');

            $query = Booking::query()
                ->select([
                    'id',
                    'booking_number',
                    'property_id',
                    'guest_name',
                    'guest_email',
                    'guest_phone',
                    'check_in',
                    'check_out',
                    'nights',
                    'total_amount',
                    'booking_status',
                    'payment_status',
                    'guest_count'
                ])
                ->with([
                    'property:id,name,capacity,base_rate',
                ]);

            // Filter by property for property owners
            if ($user->role === 'property_owner') {
                $query->whereHas('property', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }

            // Property filter
            if ($request->filled('property_id')) {
                $query->where('property_id', $request->get('property_id'));
            }

            // Status filter
            if ($request->filled('status') && $request->status !== 'all') {
                $query->where('booking_status', $request->get('status'));
            } else {
                // Exclude cancelled bookings by default
                $query->where('booking_status', '!=', 'cancelled');
            }

            // Date range filter (overlap logic)
            $query->where('check_out', '>=', $dateFrom)
                ->where('check_in', '<=', $dateTo);

            $bookings = $query->orderBy('check_in')->get();

            return response()->json([
                'success' => true,
                'bookings' => $bookings,
                'date_range' => [
                    'from' => $dateFrom,
                    'to' => $dateTo,
                ],
                'count' => $bookings->count(),
            ]);
        } catch (\Exception $e) {
            \Log::error('[Timeline API] Error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch timeline data',
                'message' => config('app.debug') ? $e->getMessage() : null
            ], 500);
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
            ->select([
                'id',
                'booking_number',
                'property_id',
                'guest_name',
                'guest_email',
                'guest_phone',
                'check_in',
                'check_out',
                'nights',
                'total_amount',
                'booking_status',
                'payment_status',
                'guest_count',
                'created_at',
                'updated_at'
            ])
            ->with([
                'property:id,name,capacity,base_rate',
                'payments:id,booking_id,amount,payment_status,payment_method_id'
            ]);

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

        // Date filter (Overlap Logic)
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        // Set default dates if not provided (T-7 to T+23 = 30 days)
        if (empty($dateFrom) && empty($dateTo)) {
            $dateFrom = now()->subDays(7)->toDateString();
            $dateTo = now()->addDays(23)->toDateString();
        }

        if ($dateFrom) {
            // Include bookings that end on or after date_from (Active during period)
            $query->where('check_out', '>=', $dateFrom);
        }

        if ($dateTo) {
            // Include bookings that start on or before date_to (Active during period)
            $query->where('check_in', '<=', $dateTo);
        }

        $bookings = $query->orderBy('check_in', 'desc')->get();

        // Get properties for filter dropdown
        $propertiesQuery = Property::query();

        // Filter by property for property owners
        if ($user->role === 'property_owner') {
            $propertiesQuery->where('owner_id', $user->id);
        }

        $properties = $propertiesQuery->active()->get([
            'id',
            'name',
            'capacity',
            'capacity_max',
            'base_rate',
            'extra_bed_rate'
        ]);

        return Inertia::render('Admin/Bookings/Index', [
            'bookings' => $bookings,
            'properties' => $properties,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
                'payment_status' => $request->get('payment_status'),
                'property_id' => $request->get('property_id'),
                'date_from' => $dateFrom, // Return effective date from
                'date_to' => $dateTo,     // Return effective date to
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

        return Inertia::render('Admin/Bookings/Edit', [
            'booking' => $booking,
            'properties' => $properties,
            'paymentMethods' => $paymentMethods,
            'serviceMasters' => $serviceMasters,
        ]);
    }

    /**
     * Update the specified booking.
     * 
     * @param \App\Http\Requests\Admin\UpdateBookingRequest $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function update(\App\Http\Requests\Admin\UpdateBookingRequest $request, Booking $booking): RedirectResponse
    {
        // Authorization is handled in UpdateBookingRequest
        // Validation is handled in UpdateBookingRequest
        // Property ownership check is handled in UpdateBookingRequest
        // Availability check is handled in UpdateBookingRequest

        $validated = $request->validated();
        $property = Property::findOrFail($validated['property_id']);
        $user = $request->user();
        $services = $request->input('services');

        try {
            DB::beginTransaction();

            // Calculate guest_count using GuestCountService
            $oldStatus = $booking->booking_status;
            $guestCount = $this->guestCountService->calculateFromRequest($property, $validated);

            // Extract guest counts from validated data
            $guestMale = (int) ($validated['guest_male'] ?? 0);
            $guestFemale = (int) ($validated['guest_female'] ?? 0);
            $guestChildren = (int) ($validated['guest_children'] ?? 0);

            // Recalculate rate if dates/guests/property changed
            $currentCheckIn = $booking->check_in instanceof \DateTimeInterface ? $booking->check_in->format('Y-m-d') : $booking->check_in;
            $currentCheckOut = $booking->check_out instanceof \DateTimeInterface ? $booking->check_out->format('Y-m-d') : $booking->check_out;

            $needsRecalculation = (
                $currentCheckIn != $validated['check_in_date'] ||
                $currentCheckOut != $validated['check_out_date'] ||
                $booking->guest_count != $guestCount ||
                $booking->property_id != $validated['property_id']
            );

            $updateData = [
                'property_id' => $validated['property_id'],
                'check_in' => $validated['check_in_date'],
                'check_out' => $validated['check_out_date'],
                'guest_male' => $guestMale,
                'guest_female' => $guestFemale,
                'guest_children' => $guestChildren,
                'guest_count' => $guestCount, // Use calculated guest count
                'guest_name' => $validated['guest_name'],
                'guest_email' => $validated['guest_email'],
                'guest_phone' => $validated['guest_phone'],
                'guest_country' => $validated['guest_country'] ?? 'Indonesia',
                'guest_id_number' => $validated['guest_id_number'] ?? null,
                'guest_gender' => $validated['guest_gender'] ?? 'male',
                'relationship_type' => $validated['relationship_type'] ?? 'keluarga',
                'special_requests' => $validated['special_requests'] ?? null,
                'internal_notes' => $validated['internal_notes'] ?? null,
                'booking_status' => $validated['booking_status'],
                'payment_status' => $validated['payment_status'],
                'dp_percentage' => $validated['dp_percentage'],
                'check_in_time' => $validated['check_in_time'] ?? '15:00',
                'source' => $validated['source'] ?? 'direct',
            ];


            if ($needsRecalculation && !($validated['rate_override'] ?? false)) {
                // Recalculate using RateCalculationService
                $rateCalculation = $this->rateCalculationService->calculateRate(
                    $property,
                    $validated['check_in_date'],
                    $validated['check_out_date'],
                    $guestCount // Use calculated guest count
                );

                $updateData['total_amount'] = $rateCalculation->totalAmount;
                $updateData['base_amount'] = $rateCalculation->baseAmount;
                $updateData['extra_bed_amount'] = $rateCalculation->extraBedAmount;
                $updateData['nights'] = $rateCalculation->nights;

                // Sync BookingDailyRevenue using BookingDailyRevenueService
                $this->dailyRevenueService->syncFromRateBreakdown($booking, $property, $rateCalculation);
            } elseif ($validated['rate_override'] ?? false) {
                $updateData['total_amount'] = $validated['override_amount'];

                // Log rate override using RateOverrideLogService
                $logMessage = $this->rateOverrideLogService->generateLog(
                    $user,
                    $booking->total_amount,
                    $validated['override_amount'],
                    $validated['override_reason'] ?? null
                );
                $updateData['internal_notes'] = $this->rateOverrideLogService->appendToNotes(
                    $updateData['internal_notes'] ?? '',
                    $logMessage
                );

                if ($needsRecalculation) {
                    // If dates changed, sync daily revenue evenly using BookingDailyRevenueService
                    $this->dailyRevenueService->syncEvenlyDistributed(
                        $booking,
                        $property,
                        $validated['check_in_date'],
                        $validated['check_out_date'],
                        $validated['override_amount']
                    );
                }
            }

            // Sync Services using BookingServiceSyncService
            $servicesTotal = 0;
            if (isset($services)) {
                $servicesTotal = $this->serviceSyncService->sync($booking, $services, true);
            } else {
                // If services not in request, keep existing services and calculate their total
                $servicesTotal = $booking->services()->sum('total_price');
            }

            // Update total amount with services
            if (isset($updateData['total_amount'])) {
                $updateData['total_amount'] += $servicesTotal;
            } else {
                // If total_amount wasn't recalculated (no changes to dates/guests and no override),
                // we still need to update it if services changed.

                if (!$needsRecalculation && !$validated['rate_override']) {
                    // Recalculate base to be safe and ensure consistency
                    $rateCalculation = $this->rateCalculationService->calculateRate(
                        $property,
                        $validated['check_in_date'],
                        $validated['check_out_date'],
                        $validated['guest_male'] + $validated['guest_female'] + $validated['guest_children']
                    );
                    $updateData['total_amount'] = $rateCalculation->totalAmount + $servicesTotal;
                } else {
                    // If we did recalculate or override, we already set total_amount (base), so add services
                    $updateData['total_amount'] += $servicesTotal;
                }
            }

            // Recalculate DP and remaining amount
            // Use new total_amount if recalculated, otherwise use current booking total_amount
            $finalTotalAmount = $updateData['total_amount'] ?? $booking->total_amount;
            $updateData['dp_amount'] = ($finalTotalAmount * $validated['dp_percentage']) / 100;

            // Calculate remaining amount based on current paid amount
            $paidAmount = $booking->getTotalPaidAmount();
            $updateData['remaining_amount'] = $finalTotalAmount - $paidAmount;

            // Log changes before update
            $changes = [];
            foreach ($updateData as $key => $value) {
                $oldValue = $booking->getOriginal($key);
                if ($oldValue != $value) {
                    $changes[$key] = [
                        'old' => $oldValue,
                        'new' => $value,
                    ];
                }
            }

            // Update booking
            $booking->update($updateData);

            // Log detailed changes
            if (!empty($changes)) {
                \Log::info('Booking updated', [
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'changes' => $changes,
                    'updated_by' => $user->id,
                    'updated_by_name' => $user->name,
                ]);
            }

            // Create workflow entry for edit
            $booking->workflow()->create([
                'step' => 'staff_review',
                'status' => 'completed',
                'processed_by' => $user->id,
                'processed_at' => now(),
                'notes' => 'Booking updated by admin' . ($needsRecalculation ? ' (dates/guests changed, rate recalculated)' : ''),
            ]);

            // Trigger status change event if status changed
            if ($booking->wasChanged('booking_status')) {
                $newStatus = $booking->booking_status;
                event(new BookingStatusChanged($booking, $oldStatus, $newStatus, $user));
            }

            DB::commit();

            return redirect()->route('admin.booking-management.show', $booking->booking_number)
                ->with('success', 'Booking updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Booking update failed', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to update booking: ' . $e->getMessage()]);
        }
    }

    /**
     * Update booking status with refund handling
     * 
     * @param \App\Http\Requests\Admin\UpdateBookingStatusRequest $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function updateStatus(\App\Http\Requests\Admin\UpdateBookingStatusRequest $request, Booking $booking): RedirectResponse
    {
        // Authorization and validation handled in UpdateBookingStatusRequest
        $validated = $request->validated();

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
            event(new BookingStatusChanged($booking, $oldStatus, $newStatus, $user));

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
     * @param \App\Http\Requests\Admin\VerifyBookingRequest $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function verify(\App\Http\Requests\Admin\VerifyBookingRequest $request, Booking $booking): RedirectResponse
    {
        // Authorization and validation handled in VerifyBookingRequest

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
     * @param \App\Http\Requests\Admin\RejectBookingRequest $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function reject(\App\Http\Requests\Admin\RejectBookingRequest $request, Booking $booking): RedirectResponse
    {
        // Authorization and validation handled in RejectBookingRequest

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
     * @param \App\Http\Requests\Admin\CancelBookingRequest $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function cancel(\App\Http\Requests\Admin\CancelBookingRequest $request, Booking $booking): RedirectResponse
    {
        // Authorization and validation handled in CancelBookingRequest

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

    /**
     * Generate payment link untuk booking
     */
    public function generatePaymentLink(\App\Http\Requests\Admin\GeneratePaymentLinkRequest $request, Booking $booking): JsonResponse|RedirectResponse
    {
        // Authorization and validation handled in GeneratePaymentLinkRequest
        $validated = $request->validated();

        try {
            // Calculate payment type jika tidak di-set
            $paidAmount = $booking->payments()
                ->where('payment_status', 'verified')
                ->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount) {
                return back()->withErrors([
                    'amount' => 'Payment amount exceeds pending amount.'
                ]);
            }

            $type = $validated['type'] ?? ($paidAmount === 0 ? 'dp' : 'remaining');

            // Generate payment link dengan options
            $payment = $this->gatewayService->initiateGatewayPayment(
                $booking,
                $validated['amount'],
                $type,
                [
                    'payment_method_id' => $validated['payment_method_id'] ?? null,
                    'expiry_hours' => $validated['expiry_hours'] ?? null,
                    'description' => "Payment link for booking {$booking->booking_number}",
                ]
            );

            $result = [
                'success' => true,
                'payment' => $payment,
                'payment_url' => $payment->ipaymu_payment_url,
                'expired_at' => $payment->ipaymu_expired_at,
            ];

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'payment_url' => $result['payment_url'],
                    'expired_at' => $result['expired_at'],
                    'payment_number' => $result['payment']->payment_number,
                ]);
            }

            return back()->with([
                'success' => 'Payment link generated successfully.',
                'payment_url' => $result['payment_url'],
                'payment_number' => $result['payment']->payment_number,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to generate payment link', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors([
                'error' => 'Failed to generate payment link: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Send payment link via WhatsApp atau Email
     */
    public function sendPaymentLink(\App\Http\Requests\Admin\SendPaymentLinkRequest $request, Booking $booking): RedirectResponse
    {
        // Authorization and validation handled in SendPaymentLinkRequest
        $validated = $request->validated();

        try {
            // Generate payment link dengan options
            $payment = $this->gatewayService->initiateGatewayPayment(
                $booking,
                $validated['amount'],
                $validated['type'] ?? 'dp',
                [
                    'payment_method_id' => $validated['payment_method_id'] ?? null,
                    'expiry_hours' => $validated['expiry_hours'] ?? null,
                    'description' => "Payment link for booking {$booking->booking_number}",
                ]
            );

            $result = [
                'success' => true,
                'payment' => $payment,
                'payment_url' => $payment->ipaymu_payment_url,
                'expired_at' => $payment->ipaymu_expired_at,
            ];

            $paymentUrl = $result['payment_url'];
            $message = "Halo {$booking->guest_name},\n\n";
            $message .= "Berikut adalah link pembayaran untuk booking Anda:\n";
            $message .= "Booking Number: {$booking->booking_number}\n";
            $message .= "Amount: Rp " . number_format($validated['amount'], 0, ',', '.') . "\n\n";
            $message .= "Link Pembayaran:\n{$paymentUrl}\n\n";
            $message .= "Link ini berlaku hingga: " . $result['expired_at']->format('d M Y H:i') . "\n\n";
            $message .= "Terima kasih!";

            // Send via WhatsApp
            if ($validated['channel'] === 'whatsapp' || $validated['channel'] === 'both') {
                if ($booking->guest_phone) {
                    $phone = $this->formatPhoneNumber($booking->guest_phone);
                    $whatsappUrl = "https://wa.me/{$phone}?text=" . urlencode($message);

                    return redirect($whatsappUrl);
                }
            }

            // Send via Email (TODO: implement email sending)
            if ($validated['channel'] === 'email' || $validated['channel'] === 'both') {
                // TODO: Implement email notification
                Log::info('Email payment link sent', [
                    'booking_id' => $booking->id,
                    'email' => $booking->guest_email,
                ]);
            }

            return redirect()->route('admin.bookings.show', $booking->booking_number)
                ->with([
                    'success' => 'Payment link generated successfully.',
                    'payment_url' => $paymentUrl,
                ]);

        } catch (\Exception $e) {
            Log::error('Failed to send payment link', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors([
                'error' => 'Failed to send payment link: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Delete the specified booking (soft delete).
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function destroy(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('delete', $booking);

        $user = $request->user();
        $bookingNumber = $booking->booking_number;
        $bookingStatus = $booking->booking_status;
        $paymentStatus = $booking->payment_status;
        $deletionReason = $request->input('deletion_reason', 'No reason provided');

        // Prevent delete if booking has verified payments (require refund first)
        $hasVerifiedPayments = $booking->payments()
            ->where('payment_status', 'verified')
            ->exists();

        if ($hasVerifiedPayments) {
            return back()->withErrors([
                'error' => 'Booking tidak dapat dihapus karena memiliki pembayaran yang sudah terverifikasi. Proses refund terlebih dahulu sebelum menghapus booking.',
            ]);
        }

        // Extra confirmation for certain statuses
        $requiresExtraConfirmation = in_array($bookingStatus, ['checked_in', 'confirmed', 'fully_paid']);
        if ($requiresExtraConfirmation && !$request->has('confirm_delete')) {
            return back()->withErrors([
                'error' => 'Booking dengan status ini memerlukan konfirmasi tambahan. Centang kotak konfirmasi untuk melanjutkan.',
            ]);
        }

        try {
            DB::beginTransaction();

            // Soft delete related payments (if any)
            $booking->payments()->each(function ($payment) {
                $payment->delete();
            });

            // Keep notifications and workflow for audit trail (they reference booking_id)
            // Soft delete booking
            $booking->delete();

            // Log deletion
            \Log::warning('Booking deleted', [
                'booking_id' => $booking->id,
                'booking_number' => $bookingNumber,
                'booking_status' => $bookingStatus,
                'payment_status' => $paymentStatus,
                'deletion_reason' => $deletionReason,
                'deleted_by' => $user->id,
                'deleted_by_name' => $user->name,
                'deleted_at' => now()->toDateTimeString(),
            ]);

            DB::commit();

            return redirect()->route('admin.booking-management.index')
                ->with('success', "Booking #{$bookingNumber} berhasil dihapus.");

        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Booking deletion failed', [
                'booking_id' => $booking->id,
                'booking_number' => $bookingNumber,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return back()->withErrors([
                'error' => 'Gagal menghapus booking: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Export bookings to Excel
     */

    public function export(Request $request)
    {
        \Log::info('Export requested with filters:', $request->all());

        try {
            $export = new BookingsExport($request->all());
            $filename = $export->getFilename();

            // Use Excel::download with explicit security headers
            return Excel::download($export, $filename, \Maatwebsite\Excel\Excel::XLSX, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'X-Content-Type-Options' => 'nosniff',
                'Content-Security-Policy' => "default-src 'none'",
                'X-Download-Options' => 'noopen',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]);

        } catch (\Exception $e) {
            \Log::error('Export failed: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Export failed: ' . $e->getMessage()]);
        }
    }

    /**
     * Preview import changes
     */
    public function importPreview(Request $request)
    {
        $availabilityService = app(\App\Services\AvailabilityService::class);
        $rateCalculationService = app(\App\Services\RateCalculationService::class);

        $controller = new \App\Http\Controllers\Admin\BookingImportPreviewController($availabilityService, $rateCalculationService);
        return $controller->preview($request);
    }

    /**
     * Import bookings with confirmed rows
     */
    public function importConfirmed(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,csv',
            'accepted_rows' => 'nullable|array',
        ]);

        try {
            $acceptedRows = $request->input('accepted_rows', []);
            $importer = new BookingsImport($acceptedRows);
            Excel::import($importer, $request->file('file'));

            $count = $importer->getImportedCount();
            return back()->with('success', "{$count} Bookings imported successfully.");
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Import failed: ' . $e->getMessage()]);
        }
    }
}