<?php

namespace App\Http\Controllers\Admin;

use App\Events\BookingStatusChanged;
use App\Exports\BookingsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CancelBookingRequest;
use App\Http\Requests\Admin\CreateBookingRequest;
use App\Http\Requests\Admin\GeneratePaymentLinkRequest;
use App\Http\Requests\Admin\RejectBookingRequest;
use App\Http\Requests\Admin\SendPaymentLinkRequest;
use App\Http\Requests\Admin\UpdateBookingRequest;
use App\Http\Requests\Admin\UpdateBookingStatusRequest;
use App\Http\Requests\Admin\VerifyBookingRequest;
use App\Imports\BookingsImport;
use App\Models\BankAccount;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\ServiceMaster;
use App\Models\User;
use App\Services\AdminBookingService;
use App\Services\AvailabilityService;
use App\Services\BookingDailyRevenueService;
use App\Services\BookingExtraServiceSyncService;
use App\Services\BookingQueryService;
use App\Services\GuestCountService;
use App\Services\PaymentGatewayService;
use App\Services\RateCalculationService;
use App\Services\RateOverrideLogService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

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
    public function __construct(
        private AdminBookingService $adminBookingService,
        private BookingQueryService $bookingQueryService,
        private RateCalculationService $rateCalculationService,
        private AvailabilityService $availabilityService,
        private GuestCountService $guestCountService,
        private BookingDailyRevenueService $dailyRevenueService,
        private RateOverrideLogService $rateOverrideLogService,
        private BookingExtraServiceSyncService $serviceSyncService,
        private PaymentGatewayService $gatewayService,
    ) {}

    /**
     * Display Daily Operations List
     * For quick Check-In/Check-Out actions and daily decisions
     */
    public function dailyOperations(Request $request): Response
    {
        $user = $request->user();

        // Get properties based on user role for filter dropdown
        $propertiesQuery = Property::query()->with(['owner', 'media']);

        if ($user->role === 'property_owner') {
            $propertiesQuery->where('owner_id', $user->id);
        }

        $properties = $propertiesQuery->active()->get();

        $bookingsQuery = Booking::query()
            ->with(['property', 'verifiedBy', 'payments', 'services.serviceMaster', 'review', 'createdBy', 'followedUpBy']);

        // Filter by property if specified
        if ($request->filled('property_id')) {
            $bookingsQuery->where('property_id', $request->input('property_id'));
        } elseif ($user->role === 'property_owner') {
            $bookingsQuery->whereHas('property', function ($query) use ($user) {
                $query->where('owner_id', $user->id);
            });
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $bookingsQuery->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                    ->orWhere('guest_name', 'like', "%{$search}%")
                    ->orWhere('guest_phone', 'like', "%{$search}%");
            });
        }

        // Status & Date Filters
        if ($request->filled('status')) {
            $bookingsQuery->where('booking_status', $request->input('status'));
        } else {
            // Default filter: CI today/tomorrow OR status is checked_in
            $today = now()->toDateString();
            $tomorrow = now()->addDay()->toDateString();

            $bookingsQuery->where(function ($q) use ($today, $tomorrow) {
                $q->whereIn('check_in', [$today, $tomorrow])
                    ->orWhere('booking_status', 'checked_in');
            });
            // Exclude cancelled by default
            $bookingsQuery->where('booking_status', '!=', 'cancelled');
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'check_in'); // check_in or created_at
        $sortDir = $request->input('sort_dir', 'asc');

        if (in_array($sortBy, ['check_in', 'created_at'])) {
            $bookingsQuery->orderBy($sortBy, $sortDir);
        }

        $bookings = $bookingsQuery->paginate(15)->withQueryString();

        return Inertia::render('Admin/Bookings/DailyOperations', [
            'properties' => $properties,
            'bookings' => $bookings,
            'filters' => [
                'property_id' => $request->input('property_id'),
                'status' => $request->input('status'),
                'search' => $request->input('search'),
                'sort_by' => $sortBy,
                'sort_dir' => $sortDir,
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
            $selectedProperty = $properties->firstWhere('id', $request->input('property_id'));
        }

        // Get pre-filled dates if specified
        $prefilledData = [
            'property_id' => $request->input('property_id'),
            'check_in_date' => $request->input('check_in'),
            'check_out_date' => $request->input('check_out'),
        ];

        // Get availability data for selected property if exists
        $availabilityData = null;
        if ($selectedProperty) {
            try {
                $startDate = $request->input('check_in') ?: now()->toDateString();
                $endDate = $request->input('check_out') ?: now()->addMonths(3)->toDateString();

                $availabilityData = $this->availabilityService->getAvailabilityData($selectedProperty, $startDate, $endDate);
            } catch (\Throwable $e) {
                \Log::error('Error getting availability data for admin booking create: '.$e->getMessage());
            }
        }

        // Get payment methods for inline payment form
        $paymentMethods = PaymentMethod::active()->get();

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

        $staffUsers = User::whereIn('role', ['super_admin', 'property_manager', 'front_desk'])->orderBy('name')->get(['id', 'name', 'role']);

        return Inertia::render('Admin/Bookings/Create', [
            'properties' => $properties,
            'selectedProperty' => $selectedProperty,
            'prefilledData' => $prefilledData,
            'availabilityData' => $availabilityData,
            'paymentMethods' => $paymentMethods,
            'bankAccounts' => BankAccount::all(),
            'serviceMasters' => $serviceMasters,
            'staffUsers' => $staffUsers,
        ]);
    }

    /**
     * Store manual booking created by admin using AdminBookingService
     */
    public function store(CreateBookingRequest $request): RedirectResponse
    {
        set_time_limit(300);

        $result = $this->adminBookingService->createAdminBooking(
            $request->validated(),
            $request->file('payment_proof'),
            $request->user()
        );

        if ($result->isFailure()) {
            return back()->withErrors($result->getErrors());
        }

        return redirect()
            ->route('admin.bookings.show', $result->getBooking())
            ->with('success', 'Booking created successfully.');
    }

    /**
     * Display admin bookings listing
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
                'external_reservation_url',
                'created_at',
                'updated_at',
            ])
            ->with([
                'property:id,name,capacity,base_rate',
                'payments:id,booking_id,amount,payment_status,payment_method_id',
            ]);

        // Filter by property for property owners
        if ($user->role === 'property_owner') {
            $query->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                    ->orWhere('guest_name', 'like', "%{$search}%")
                    ->orWhere('guest_email', 'like', "%{$search}%")
                    ->orWhere('guest_phone', 'like', "%{$search}%");
            });
        }

        // Status filter - exclude cancelled by default unless explicitly requested
        if ($request->filled('status')) {
            $query->where('booking_status', $request->input('status'));
        } else {
            // Exclude cancelled bookings by default
            $query->where('booking_status', '!=', 'cancelled');
        }

        // Payment status filter
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->input('payment_status'));
        }

        // Property filter
        if ($request->filled('property_id')) {
            $query->where('property_id', $request->input('property_id'));
        }

        // Date filter (Overlap Logic)
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

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
            'extra_bed_rate',
        ]);

        return Inertia::render('Admin/Bookings/Index', [
            'bookings' => $bookings,
            'properties' => $properties,
            'filters' => [
                'search' => $request->input('search'),
                'status' => $request->input('status'),
                'payment_status' => $request->input('payment_status'),
                'property_id' => $request->input('property_id'),
                'date_from' => $dateFrom, // Return effective date from
                'date_to' => $dateTo,     // Return effective date to
            ],
        ]);
    }

    /**
     * Show the form for editing the specified booking.
     */
    public function edit(Booking $booking): Response
    {
        $this->authorize('update', $booking);

        $booking->load([
            'property',
            'guests',
            'services',
            'payments.paymentMethod',
            'workflow.processor',
        ]);

        // Get properties for dropdown
        $properties = Property::active()->get(['id', 'name']);

        // Get payment methods for inline payment form
        $paymentMethods = PaymentMethod::active()->get();

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

        $staffUsers = User::whereIn('role', ['super_admin', 'property_manager', 'front_desk'])->orderBy('name')->get(['id', 'name', 'role']);

        return Inertia::render('Admin/Bookings/Edit', [
            'booking' => $booking,
            'properties' => $properties,
            'paymentMethods' => $paymentMethods,
            'serviceMasters' => $serviceMasters,
            'staffUsers' => $staffUsers,
        ]);
    }

    /**
     * Update the specified booking.
     */
    public function update(UpdateBookingRequest $request, Booking $booking): RedirectResponse
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
                $booking->property_id != $validated['property_id'] ||
                isset($validated['daily_extra_beds'])
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
                'followed_up_by' => $validated['followed_up_by'] ?? $booking->followed_up_by,
            ];

            // Calculate lodging amount without services and discount
            $currentDiscount = $booking->discount_amount ?? 0;
            $currentServices = $booking->services()->sum('total_price');
            $lodgingBase = $booking->total_amount - $currentServices + $currentDiscount;

            $discount = (int) ($validated['discount_amount'] ?? 0);
            $updateData['discount_amount'] = $discount;

            if ($needsRecalculation && ! ($validated['rate_override'] ?? false)) {
                // Recalculate using RateCalculationService
                $rateCalculation = $this->rateCalculationService->calculateRate(
                    $property,
                    $validated['check_in_date'],
                    $validated['check_out_date'],
                    $guestCount, // Use calculated guest count
                    $validated['daily_extra_beds'] ?? null
                );

                $lodgingBase = $rateCalculation->totalAmount;
                $updateData['base_amount'] = $rateCalculation->baseAmount;
                $updateData['extra_bed_amount'] = $rateCalculation->extraBedAmount;
                $updateData['extra_bed_count'] = $rateCalculation->extraBeds;
                $updateData['nights'] = $rateCalculation->nights;

                // Sync BookingDailyRevenue using BookingDailyRevenueService
                $this->dailyRevenueService->syncFromRateBreakdown($booking, $property, $rateCalculation);
            } elseif ($validated['rate_override'] ?? false) {
                $lodgingBase = $validated['override_amount'];

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

            // Sync Services using BookingExtraServiceSyncService
            $servicesTotal = 0;
            if (isset($services)) {
                $servicesTotal = $this->serviceSyncService->sync($booking, $services, true);
            } else {
                // If services not in request, keep existing services and calculate their total
                $servicesTotal = $currentServices;
            }

            // Set final total amount: lodging - discount + services
            $updateData['total_amount'] = max(0, $lodgingBase - $discount) + $servicesTotal;
            $updateData['service_amount'] = $servicesTotal;

            // Recalculate DP and remaining amount
            $finalTotalAmount = $updateData['total_amount'];
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
            if (! empty($changes)) {
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
                'notes' => 'Booking updated by admin'.($needsRecalculation ? ' (dates/guests changed, rate recalculated)' : ''),
            ]);

            // Trigger status change event if status changed
            if ($booking->wasChanged('booking_status')) {
                $newStatus = $booking->booking_status;
                event(new BookingStatusChanged($booking, $oldStatus, $newStatus, $user));
            }

            DB::commit();

            return redirect()->route('admin.bookings.show', $booking->booking_number)
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
                ->withErrors(['error' => 'Failed to update booking: '.$e->getMessage()]);
        }
    }

    /**
     * Update booking status with refund handling
     */
    public function updateStatus(UpdateBookingStatusRequest $request, Booking $booking): RedirectResponse
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
                'notes' => "Status changed from {$oldStatus} to {$newStatus}".
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
                ->withErrors(['error' => 'Failed to update booking status: '.$e->getMessage()]);
        }
    }

    /**
     * Display booking details
     */
    public function show(Booking $booking): Response
    {
        $this->authorize('view', $booking);

        $booking->load([
            'property',
            'guests',
            'services',
            'payments.paymentMethod',
            'workflow.processor',
            'dailyRevenues',
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
     */
    public function verify(VerifyBookingRequest $request, Booking $booking): RedirectResponse
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
                'notes' => $request->input('notes', 'Booking verified and confirmed by admin'),
            ]);

            DB::commit();

            // Dispatch BookingStatusChanged event
            event(new BookingStatusChanged($booking->load('property'), $oldStatus, 'confirmed', $request->user()));

            return redirect()->back()
                ->with('success', 'Booking verified successfully. Guest can now proceed with payment.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Booking verification failed: '.$e->getMessage());

            return redirect()->back()
                ->withErrors(['error' => 'Failed to verify booking. Please try again.']);
        }
    }

    /**
     * Reject booking with reason
     */
    public function reject(RejectBookingRequest $request, Booking $booking): RedirectResponse
    {
        // Authorization and validation handled in RejectBookingRequest

        DB::beginTransaction();
        try {
            $oldStatus = $booking->booking_status;

            $booking->update([
                'verification_status' => 'rejected',
                'booking_status' => 'cancelled',
                'cancellation_reason' => $request->input('notes', 'Booking rejected by admin'),
                'cancelled_by' => $request->user()->id,
                'cancelled_at' => now(),
            ]);

            // Create workflow record
            $booking->workflow()->create([
                'step' => 'rejected',
                'status' => 'completed',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => $request->input('notes', 'Booking rejected by admin'),
            ]);

            DB::commit();

            // Dispatch BookingStatusChanged event
            event(new BookingStatusChanged($booking->load('property'), $oldStatus, 'cancelled', $request->user()));

            return redirect()->back()
                ->with('success', 'Booking rejected successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Booking rejection failed: '.$e->getMessage());

            return redirect()->back()
                ->with('error', 'Failed to reject booking. Please try again.');
        }
    }

    /**
     * Cancel booking with reason
     */
    public function cancel(CancelBookingRequest $request, Booking $booking): RedirectResponse
    {
        // Authorization and validation handled in CancelBookingRequest

        DB::beginTransaction();
        try {
            $oldStatus = $booking->booking_status;

            $booking->update([
                'booking_status' => 'cancelled',
                'cancellation_reason' => $request->input('cancellation_reason'),
                'cancelled_by' => $request->user()->id,
                'cancelled_at' => now(),
            ]);

            // Create workflow record
            $booking->workflow()->create([
                'step' => 'cancelled',
                'status' => 'completed',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'notes' => $request->input('cancellation_reason'),
            ]);

            DB::commit();

            // Dispatch BookingStatusChanged event
            event(new BookingStatusChanged($booking->load('property'), $oldStatus, 'cancelled', $request->user()));

            return redirect()->back()
                ->with('success', 'Booking cancelled successfully.');

        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Booking cancellation failed: '.$e->getMessage());

            return redirect()->back()
                ->with('error', 'Failed to cancel booking. Please try again.');
        }
    }

    /**
     * Check-in guest
     */
    public function checkin(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('update', $booking);

        // Bisnis villa Indonesia: check-in diizinkan jika booking confirmed
        // dan minimal DP sudah dibayar (dp_received atau fully_paid)
        $validPaymentStatuses = ['dp_received', 'fully_paid'];

        if ($booking->booking_status !== 'confirmed' || ! in_array($booking->payment_status, $validPaymentStatuses)) {
            return redirect()->back()
                ->with('error', 'Check-in hanya bisa dilakukan untuk booking yang sudah confirmed dan minimal DP sudah diterima.');
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
            \Log::error('Check-in failed: '.$e->getMessage());

            return redirect()->back()
                ->with('error', 'Failed to check in guest. Please try again.');
        }
    }

    /**
     * Check-out guest
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
            \Log::error('Check-out failed: '.$e->getMessage());

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
        $message .= '📅 *Check-in*: '.Carbon::parse($booking->check_in)->format('d M Y')."\n";
        $message .= '📅 *Check-out*: '.Carbon::parse($booking->check_out)->format('d M Y')."\n";
        $message .= "👥 *Jumlah Tamu*: {$booking->guest_count} orang\n";
        $message .= '💰 *Total*: Rp '.number_format($booking->total_amount, 0, ',', '.')."\n\n";

        // Payment information
        $message .= "*Status Pembayaran:*\n";
        $message .= '• Status: '.ucfirst($booking->payment_status)."\n";

        if ($booking->payment_status !== 'fully_paid') {
            $message .= "• Silakan selesaikan pembayaran untuk konfirmasi booking\n";
            $message .= '• Link pembayaran: '.route('payments.create', $booking->booking_number)."\n\n";
        } else {
            $message .= "• Pembayaran telah lunas ✅\n";
            $message .= "• Informasi check-in akan tersedia di dashboard Anda\n";
            $message .= '• Dashboard: '.route('dashboard')."\n\n";
        }

        // Add login info for new users (only if account was just created)
        if ($isNewUser && $guestUser) {
            $message .= "*Akun Login Anda:*\n";
            $message .= "• Email: {$guestUser->email}\n";
            $message .= '• Login di: '.route('login')."\n";
            $message .= "_Cek email Anda untuk password login_\n\n";
        } elseif ($guestUser) {
            // Existing user
            $message .= "*Akses Dashboard:*\n";
            $message .= '• Login dengan akun Anda di: '.route('login')."\n";
            $message .= "• Email: {$guestUser->email}\n\n";
        }

        $message .= "Terima kasih telah memilih properti kami! 🏠\n";
        $message .= "Tim {$property->name}";

        $canSend = ! empty($booking->guest_phone);

        return [
            'phone' => $canSend ? $this->formatPhoneNumber($booking->guest_phone) : null,
            'message' => $message,
            'whatsapp_url' => $canSend ? "https://wa.me/{$this->formatPhoneNumber($booking->guest_phone)}?text=".urlencode($message) : null,
            'can_send' => $canSend,
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
            $phone = '62'.substr($phone, 1);
        } elseif (substr($phone, 0, 2) !== '62') {
            $phone = '62'.$phone;
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

        if (! $whatsappData['can_send']) {
            return redirect()->back()->with('error', 'Guest phone number not available.');
        }

        return redirect($whatsappData['whatsapp_url']);
    }

    /**
     * Generate and download PDF Invoice for booking
     */
    public function invoice(Booking $booking)
    {
        $this->authorize('view', $booking);

        $booking->load(['property', 'payments', 'services.serviceMaster']);

        $pdf = Pdf::loadView('admin.bookings.invoice', compact('booking'));

        return $pdf->download("invoice-{$booking->booking_number}.pdf");
    }

    /**
     * Generate payment link untuk booking
     */
    public function generatePaymentLink(GeneratePaymentLinkRequest $request, Booking $booking): JsonResponse|RedirectResponse
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
                    'amount' => 'Payment amount exceeds pending amount.',
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
                'error' => 'Failed to generate payment link: '.$e->getMessage(),
            ]);
        }
    }

    /**
     * Send payment link via WhatsApp atau Email
     */
    public function sendPaymentLink(SendPaymentLinkRequest $request, Booking $booking): RedirectResponse
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
                    'user_id' => Auth::id(),
                    'user' => Auth::user(),
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
            $message .= 'Amount: Rp '.number_format($validated['amount'], 0, ',', '.')."\n\n";
            $message .= "Link Pembayaran:\n{$paymentUrl}\n\n";
            $message .= 'Link ini berlaku hingga: '.$result['expired_at']->format('d M Y H:i')."\n\n";
            $message .= 'Terima kasih!';

            // Kembalikan URL ke frontend untuk dibuka di tab baru
            // (lebih baik daripada server redirect yang membuang admin keluar dari konteks)
            if (($validated['channel'] === 'whatsapp' || $validated['channel'] === 'both') && $booking->guest_phone) {
                $phone = $this->formatPhoneNumber($booking->guest_phone);
                $whatsappUrl = 'https://wa.me/'.$phone.'?text='.urlencode($message);

                return redirect()->route('admin.bookings.show', $booking->booking_number)
                    ->with([
                        'success' => 'Payment link generated. Klik tombol WhatsApp untuk mengirim ke guest.',
                        'payment_url' => $paymentUrl,
                        'whatsapp_url' => $whatsappUrl,
                        'payment_number' => $payment->payment_number,
                    ]);
            }

            // Send via Email (TODO: implement email sending)
            if ($validated['channel'] === 'email' || $validated['channel'] === 'both') {
                // TODO: Implement email notification via Mailable
                Log::info('Email payment link requested (not yet implemented)', [
                    'booking_id' => $booking->id,
                    'email' => $booking->guest_email,
                ]);
            }

            return redirect()->route('admin.bookings.show', $booking->booking_number)
                ->with([
                    'success' => 'Payment link generated successfully.',
                    'payment_url' => $paymentUrl,
                    'payment_number' => $payment->payment_number,
                ]);

        } catch (\Exception $e) {
            Log::error('Failed to send payment link', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors([
                'error' => 'Failed to send payment link: '.$e->getMessage(),
            ]);
        }
    }

    /**
     * Delete the specified booking (soft delete).
     */
    public function destroy(Request $request, Booking $booking): RedirectResponse
    {
        $this->authorize('delete', $booking);

        $user = $request->user();
        $bookingNumber = $booking->booking_number;
        $bookingStatus = $booking->booking_status;
        $paymentStatus = $booking->payment_status;
        $deletionReason = $request->input('deletion_reason', 'No reason provided');

        try {
            DB::beginTransaction();

            // Soft delete booking. The associated payments and incomes are deleted
            // automatically via BookingObserver's deleting event hook.
            $booking->delete();

            // Log deletion
            Log::warning('Booking deleted', [
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

            return redirect()->route('admin.bookings.index')
                ->with('success', "Booking #{$bookingNumber} dan pembayaran/income terkait berhasil dihapus.");

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Booking deletion failed', [
                'booking_id' => $booking->id,
                'booking_number' => $bookingNumber,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return back()->withErrors([
                'error' => 'Gagal menghapus booking: '.$e->getMessage(),
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
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'X-Content-Type-Options' => 'nosniff',
                'Content-Security-Policy' => "default-src 'none'",
                'X-Download-Options' => 'noopen',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]);

        } catch (\Exception $e) {
            \Log::error('Export failed: '.$e->getMessage());

            return back()->withErrors(['error' => 'Export failed: '.$e->getMessage()]);
        }
    }

    /**
     * Preview import changes
     */
    public function importPreview(Request $request)
    {
        $this->authorize('create', Booking::class);

        $request->validate([
            'file' => 'required|mimes:xlsx,csv',
        ]);

        try {
            $file = $request->file('file');
            $spreadsheet = IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // Skip header row
            $headers = array_shift($rows);

            $preview = [
                'new' => [],
                'updated' => [],
                'unchanged' => [],
                'errors' => [],
            ];

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2; // +2 because we skipped header and arrays are 0-indexed

                // Skip empty rows (check Property Name and Guest Name)
                if (empty($row[1]) && empty($row[4])) {
                    continue;
                }

                try {
                    $bookingNumber = $row[0] ?? null;
                    $propertyName = $row[1] ?? null;

                    // Find property by name
                    $property = null;
                    if ($propertyName && $propertyName !== 'N/A') {
                        $property = Property::where('name', $propertyName)->first();
                    }

                    // NEW BOOKING LOGIC: If no booking number, treat as new booking
                    if (! $bookingNumber) {
                        $missingFields = $this->validateImportRequiredFields($row);

                        if (! empty($missingFields)) {
                            $preview['errors'][] = [
                                'row' => $rowNumber,
                                'is_new' => true,
                                'missing_fields' => $missingFields,
                                'error' => 'Incomplete data for new booking: '.implode(', ', $missingFields),
                                'data' => $this->mapImportRowToRawData($row, $property),
                            ];

                            continue;
                        }

                        if (! $property) {
                            $preview['errors'][] = [
                                'row' => $rowNumber,
                                'is_new' => true,
                                'error' => "Property '{$propertyName}' not found",
                                'data' => $this->mapImportRowToRawData($row),
                            ];

                            continue;
                        }

                        $checkIn = $this->parseImportDate($row[10] ?? null);
                        $checkOut = $this->parseImportDate($row[11] ?? null);

                        $guestMale = (int) ($row[7] ?? 1);
                        $guestFemale = (int) ($row[8] ?? 0);
                        $guestChildren = (int) ($row[9] ?? 0);
                        if ($property->capacity < $property->capacity_max) {
                            $guestCount = $guestMale + $guestFemale + (int) floor($guestChildren / 2);
                        } else {
                            $guestCount = $guestMale + $guestFemale + $guestChildren;
                        }

                        $availabilityIssue = $this->checkImportAvailability($property->id, $checkIn, $checkOut, $guestCount);

                        $preview['new'][] = [
                            'row' => $rowNumber,
                            'is_new' => true,
                            'booking_number' => null,
                            'data' => $this->mapImportRowToRawData($row, $property),
                            'availability_warning' => $availabilityIssue,
                        ];

                        continue;
                    }

                    // EXISTING BOOKING LOGIC
                    if (! $property) {
                        $preview['errors'][] = [
                            'row' => $rowNumber,
                            'error' => "Property '{$propertyName}' not found",
                            'data' => $this->mapImportRowToRawData($row),
                        ];

                        continue;
                    }

                    $existingBooking = Booking::where('booking_number', $bookingNumber)->first();
                    $newData = $this->mapImportRowToRawData($row, $property);

                    if (! $existingBooking) {
                        $checkIn = $this->parseImportDate($row[10] ?? null);
                        $checkOut = $this->parseImportDate($row[11] ?? null);

                        $guestMale = (int) ($row[7] ?? 1);
                        $guestFemale = (int) ($row[8] ?? 0);
                        $guestChildren = (int) ($row[9] ?? 0);
                        if ($property->capacity < $property->capacity_max) {
                            $guestCount = $guestMale + $guestFemale + (int) floor($guestChildren / 2);
                        } else {
                            $guestCount = $guestMale + $guestFemale + $guestChildren;
                        }

                        $availabilityIssue = $this->checkImportAvailability($property->id, $checkIn, $checkOut, $guestCount);

                        $preview['new'][] = [
                            'row' => $rowNumber,
                            'is_new' => true,
                            'booking_number' => $bookingNumber,
                            'data' => $newData,
                            'availability_warning' => $availabilityIssue,
                        ];
                    } else {
                        $changes = $this->detectImportChanges($existingBooking, $newData);

                        if (empty($changes)) {
                            $preview['unchanged'][] = [
                                'row' => $rowNumber,
                                'booking_number' => $bookingNumber,
                            ];
                        } else {
                            $availabilityWarning = null;
                            $datesChanged = isset($changes['check_in']) || isset($changes['check_out']);

                            if ($datesChanged) {
                                $checkIn = $newData['check_in'];
                                $checkOut = $newData['check_out'];

                                $guestMale = (int) ($row[7] ?? 1);
                                $guestFemale = (int) ($row[8] ?? 0);
                                $guestChildren = (int) ($row[9] ?? 0);
                                if ($property->capacity < $property->capacity_max) {
                                    $guestCount = $guestMale + $guestFemale + (int) floor($guestChildren / 2);
                                } else {
                                    $guestCount = $guestMale + $guestFemale + $guestChildren;
                                }

                                $availabilityWarning = $this->checkImportAvailabilityForUpdate(
                                    $property->id,
                                    $checkIn,
                                    $checkOut,
                                    $guestCount,
                                    $existingBooking->id
                                );
                            }

                            $preview['updated'][] = [
                                'row' => $rowNumber,
                                'booking_number' => $bookingNumber,
                                'changes' => $changes,
                                'old_data' => $this->extractImportBookingData($existingBooking),
                                'new_data' => $newData,
                                'availability_warning' => $availabilityWarning,
                            ];
                        }
                    }
                } catch (\Exception $e) {
                    $preview['errors'][] = [
                        'row' => $rowNumber,
                        'error' => $e->getMessage(),
                        'data' => $this->mapImportRowToRawData($row, $property ?? null),
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'preview' => $preview,
                'summary' => [
                    'new_count' => count($preview['new']),
                    'updated_count' => count($preview['updated']),
                    'unchanged_count' => count($preview['unchanged']),
                    'error_count' => count($preview['errors']),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to preview import: '.$e->getMessage(),
            ], 400);
        }
    }

    /**
     * Parse date from Excel format (d/m/Y or Y-m-d) for import preview
     */
    private function parseImportDate($dateValue): ?string
    {
        if (empty($dateValue)) {
            return null;
        }

        if (is_numeric($dateValue)) {
            try {
                $date = Date::excelToDateTimeObject($dateValue);

                return Carbon::instance($date)->format('Y-m-d');
            } catch (\Exception $e) {
                return Carbon::createFromDate(1899, 12, 30)->addDays($dateValue)->format('Y-m-d');
            }
        }

        if ($dateValue instanceof \DateTime) {
            return $dateValue->format('Y-m-d');
        }

        try {
            return Carbon::createFromFormat('d/m/Y', $dateValue)->format('Y-m-d');
        } catch (\Exception $e) {
            try {
                return Carbon::parse($dateValue)->format('Y-m-d');
            } catch (\Exception $e2) {
                return null;
            }
        }
    }

    /**
     * Validate required fields for new booking in import preview
     */
    private function validateImportRequiredFields(array $row): array
    {
        $missing = [];
        $requiredFields = [
            1 => 'Property Name',
            2 => 'Guest Name',
            3 => 'Guest Email',
            4 => 'Guest Phone',
            6 => 'Guest Gender',
            10 => 'Check-in Date',
            11 => 'Check-out Date',
            13 => 'Total Amount',
            22 => 'Booking Status',
        ];

        foreach ($requiredFields as $index => $fieldName) {
            if (empty($row[$index]) && $row[$index] !== 0) {
                $missing[] = $fieldName;
            }
        }

        return $missing;
    }

    /**
     * Check availability for import preview (new booking)
     */
    private function checkImportAvailability(int $propertyId, ?string $checkIn, ?string $checkOut, int $guestCount = 1): ?string
    {
        if (! $checkIn || ! $checkOut) {
            return null;
        }

        $property = Property::find($propertyId);
        if (! $property) {
            return 'Property not found';
        }

        $availabilityCheck = $this->availabilityService->checkAvailability($property, $checkIn, $checkOut);

        if (! $availabilityCheck['available']) {
            $conflicts = count($availabilityCheck['booked_periods'] ?? []);

            return "Property has {$conflicts} conflicting booking(s) on selected dates";
        }

        try {
            $rateCalculation = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guestCount);
            if (! $rateCalculation || $rateCalculation->totalAmount <= 0) {
                return 'Unable to calculate rate for selected dates';
            }
        } catch (\Exception $e) {
            return 'Rate calculation error: '.$e->getMessage();
        }

        return null;
    }

    /**
     * Check availability for import preview (existing booking update, with exclusion)
     */
    private function checkImportAvailabilityForUpdate(int $propertyId, ?string $checkIn, ?string $checkOut, int $guestCount = 1, ?int $excludeBookingId = null): ?string
    {
        if (! $checkIn || ! $checkOut) {
            return null;
        }

        $property = Property::find($propertyId);
        if (! $property) {
            return 'Property not found';
        }

        $conflictingBookings = Booking::where('property_id', $propertyId)
            ->where('booking_status', '!=', 'cancelled')
            ->when($excludeBookingId, fn ($q) => $q->where('id', '!=', $excludeBookingId))
            ->where(function ($query) use ($checkIn, $checkOut) {
                $query->where(fn ($q) => $q->where('check_in', '<=', $checkIn)->where('check_out', '>', $checkIn))
                    ->orWhere(fn ($q) => $q->where('check_in', '<', $checkOut)->where('check_out', '>=', $checkOut))
                    ->orWhere(fn ($q) => $q->where('check_in', '>=', $checkIn)->where('check_out', '<=', $checkOut));
            })
            ->count();

        if ($conflictingBookings > 0) {
            return "Property has {$conflictingBookings} conflicting booking(s) on selected dates";
        }

        try {
            $rateCalculation = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guestCount);
            if (! $rateCalculation || $rateCalculation->totalAmount <= 0) {
                return 'Unable to calculate rate for selected dates';
            }
        } catch (\Exception $e) {
            return 'Rate calculation error: '.$e->getMessage();
        }

        return null;
    }

    /**
     * Map spreadsheet row to raw booking data for import preview
     */
    private function mapImportRowToRawData(array $row, ?Property $property = null): array
    {
        $checkIn = $this->parseImportDate($row[10] ?? null);
        $checkOut = $this->parseImportDate($row[11] ?? null);

        $nights = 0;
        if ($checkIn && $checkOut) {
            try {
                $ci = Carbon::parse($checkIn);
                $co = Carbon::parse($checkOut);
                $nights = $ci->diffInDays($co);
            } catch (\Exception $e) {
            }
        }
        if ($nights <= 0) {
            $nights = 1;
        }

        // Parse daily extra bed count
        $extraBedInput = trim((string) ($row[12] ?? '0'));
        $extraBedsPerNight = [];
        if (str_contains($extraBedInput, '|')) {
            $extraBedsPerNight = array_map('intval', explode('|', $extraBedInput));
        } else {
            $singleVal = (int) $extraBedInput;
            $extraBedsPerNight = array_fill(0, max(1, $nights), $singleVal);
        }
        $totalExtraBedCount = array_sum($extraBedsPerNight);
        $extraBedRate = (float) ($property->extra_bed_rate ?? 150000);
        $totalExtraBedAmount = 0;
        foreach ($extraBedsPerNight as $count) {
            $totalExtraBedAmount += $count * $extraBedRate;
        }

        $totalAmount = ! empty($row[13]) ? (float) $row[13] : 0;
        $baseAmount = max(0.0, $totalAmount - $totalExtraBedAmount);

        $p1Amount = ! empty($row[14]) ? (float) $row[14] : 0;
        $p2Amount = ! empty($row[18]) ? (float) $row[18] : 0;
        $totalPaid = $p1Amount + $p2Amount;

        if ($totalPaid >= $totalAmount && $totalAmount > 0) {
            $paymentStatus = 'fully_paid';
        } elseif ($totalPaid > 0) {
            $paymentStatus = 'dp_received';
        } else {
            $paymentStatus = 'dp_pending';
        }

        $dpPercentage = $totalAmount > 0 ? (int) round(($p1Amount / $totalAmount) * 100) : 50;

        $bookingStatusInput = strtolower(trim((string) ($row[22] ?? '')));
        if ($bookingStatusInput === 'cancelled' || $bookingStatusInput === 'cancel') {
            $bookingStatus = 'cancelled';
        } else {
            $bookingStatus = 'confirmed';
        }

        return [
            'booking_number' => $row[0] ? trim($row[0]) : null,
            'property_id' => $property ? $property->id : null,
            'property_name' => $row[1] ? trim($row[1]) : null,
            'guest_name' => $row[2] ? trim($row[2]) : null,
            'guest_email' => $row[3] ? trim($row[3]) : null,
            'guest_phone' => $row[4] ? trim($row[4]) : null,
            'guest_country' => $row[5] ? trim($row[5]) : null,
            'guest_gender' => $row[6] ? trim($row[6]) : null,
            'guest_male' => ! empty($row[7]) ? (int) $row[7] : 0,
            'guest_female' => ! empty($row[8]) ? (int) $row[8] : 0,
            'guest_children' => ! empty($row[9]) ? (int) $row[9] : 0,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'jumlah_extra_bed' => $extraBedInput,
            'extra_bed_count' => $totalExtraBedCount,
            'extra_bed_amount' => $totalExtraBedAmount,
            'base_amount' => $baseAmount,
            'total_amount' => $totalAmount,
            'dp_percentage' => $dpPercentage,
            'dp_amount' => $p1Amount,
            'remaining_amount' => max(0.0, $totalAmount - $p1Amount),
            'booking_status' => $bookingStatus,
            'payment_status' => $paymentStatus,
            'payment_1_amount' => $p1Amount ?: null,
            'payment_1_date' => $row[15] ? trim($row[15]) : null,
            'payment_1_bank' => $row[16] ? trim($row[16]) : null,
            'payment_1_no_rekening' => $row[17] ? trim($row[17]) : null,
            'payment_2_amount' => $p2Amount ?: null,
            'payment_2_date' => $row[19] ? trim($row[19]) : null,
            'payment_2_bank' => $row[20] ? trim($row[20]) : null,
            'payment_2_no_rekening' => $row[21] ? trim($row[21]) : null,
            'internal_notes' => $row[23] ? trim($row[23]) : null,
            'closed_by' => $row[24] ? trim($row[24]) : null,
            'followed_up_by' => $row[25] ? trim($row[25]) : null,
        ];
    }

    /**
     * Extract booking data for import change comparison
     */
    private function extractImportBookingData(Booking $booking): array
    {
        $verifiedPayments = $booking->payments->sortBy('created_at')->values();
        $p1 = $verifiedPayments[0] ?? null;
        $p2 = $verifiedPayments[1] ?? null;

        $dailyExtraBeds = $booking->dailyRevenues->sortBy('tanggal')->pluck('extra_bed_count')->toArray();
        $uniqueCounts = array_unique($dailyExtraBeds);
        if (count($uniqueCounts) === 1) {
            $jumlahExtraBed = (string) reset($uniqueCounts);
        } elseif (count($dailyExtraBeds) > 0) {
            $jumlahExtraBed = implode('|', $dailyExtraBeds);
        } else {
            $jumlahExtraBed = '0';
        }

        return [
            'booking_number' => $booking->booking_number,
            'property_id' => $booking->property_id,
            'property_name' => $booking->property->name,
            'guest_name' => $booking->guest_name,
            'guest_email' => $booking->guest_email,
            'guest_phone' => $booking->guest_phone,
            'guest_country' => $booking->guest_country,
            'guest_gender' => $booking->guest_gender,
            'guest_male' => $booking->guest_male,
            'guest_female' => $booking->guest_female,
            'guest_children' => $booking->guest_children,
            'check_in' => $booking->check_in instanceof \DateTimeInterface ? $booking->check_in->format('Y-m-d') : $booking->check_in,
            'check_out' => $booking->check_out instanceof \DateTimeInterface ? $booking->check_out->format('Y-m-d') : $booking->check_out,
            'jumlah_extra_bed' => $jumlahExtraBed,
            'extra_bed_count' => $booking->extra_bed_count,
            'extra_bed_amount' => (float) $booking->extra_bed_amount,
            'base_amount' => (float) $booking->base_amount,
            'total_amount' => (float) $booking->total_amount,
            'dp_percentage' => $booking->dp_percentage,
            'dp_amount' => (float) $booking->dp_amount,
            'remaining_amount' => (float) $booking->remaining_amount,
            'booking_status' => $booking->booking_status,
            'payment_status' => $booking->payment_status,
            'payment_1_amount' => $p1 ? (float) $p1->amount : null,
            'payment_1_date' => $p1 ? $p1->payment_date->format('Y-m-d') : null,
            'payment_1_bank' => $p1 ? $p1->bank_name : null,
            'payment_1_no_rekening' => $p1 ? $p1->account_number : null,
            'payment_2_amount' => $p2 ? (float) $p2->amount : null,
            'payment_2_date' => $p2 ? $p2->payment_date->format('Y-m-d') : null,
            'payment_2_bank' => $p2 ? $p2->bank_name : null,
            'payment_2_no_rekening' => $p2 ? $p2->account_number : null,
            'internal_notes' => $booking->internal_notes,
            'closed_by' => $booking->closedBy ? $booking->closedBy->name : null,
            'followed_up_by' => $booking->followedUpBy ? $booking->followedUpBy->name : null,
        ];
    }

    /**
     * Detect changes between existing booking and import data
     */
    private function detectImportChanges(Booking $existing, array $newData): array
    {
        $oldData = $this->extractImportBookingData($existing);
        $changes = [];

        $fieldsToCompare = [
            'guest_name', 'guest_email', 'guest_phone', 'guest_country',
            'guest_gender', 'guest_male', 'guest_female', 'guest_children',
            'check_in', 'check_out', 'jumlah_extra_bed', 'total_amount',
            'booking_status', 'payment_status',
            'payment_1_amount', 'payment_1_date', 'payment_1_bank', 'payment_1_no_rekening',
            'payment_2_amount', 'payment_2_date', 'payment_2_bank', 'payment_2_no_rekening',
            'internal_notes', 'closed_by', 'followed_up_by',
        ];

        foreach ($fieldsToCompare as $field) {
            $oldValue = $oldData[$field] ?? null;
            $newValue = $newData[$field] ?? null;

            if (is_numeric($oldValue) && is_numeric($newValue)) {
                $oldValue = (float) $oldValue;
                $newValue = (float) $newValue;
            }

            if ($oldValue != $newValue) {
                $changes[$field] = ['old' => $oldValue, 'new' => $newValue];
            }
        }

        return $changes;
    }

    /**
     * Import bookings with confirmed rows
     */
    public function importConfirmed(Request $request)
    {
        $this->authorize('create', Booking::class);

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
            return back()->withErrors(['error' => 'Import failed: '.$e->getMessage()]);
        }
    }
}
