<?php

namespace App\Http\Controllers\Admin\Booking;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CalculateRateRequest;
use App\Http\Requests\Admin\CheckAvailabilityRequest;
use App\Http\Requests\Admin\GetPropertyDateRangeRequest;
use App\Http\Requests\Admin\TimelineDataRequest;
use App\Http\Resources\TimelineBookingResource;
use App\Models\BankAccount;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\PropertySeasonalRate;
use App\Services\AvailabilityService;
use App\Services\BookingQueryService;
use App\Services\ImageService;
use App\Services\PaymentIncomeSyncService;
use App\Services\RateCalculationService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class BookingApiController extends Controller
{
    public function __construct(
        private AvailabilityService $availabilityService,
        private RateCalculationService $rateCalculationService,
        private BookingQueryService $bookingQueryService
    ) {}

    /**
     * Get timeline data for infinite scroll (API endpoint for lazy loading)
     */
    public function timelineData(TimelineDataRequest $request): JsonResponse
    {
        try {
            $user = $request->user();
            $validated = $request->validated();
            $dateFrom = $validated['date_from'];
            $dateTo = $validated['date_to'];

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
                    'extra_bed_count',
                    'remaining_amount',
                    'source',
                    'external_id',
                    'external_reservation_url',
                ])
                ->with([
                    'property:id,name,capacity,base_rate',
                    'payments.paymentMethod',
                    'services',
                    'review',
                    'createdBy',
                    'followedUpBy',
                ]);

            // Filter by property for property owners
            if ($user->role === 'property_owner') {
                $query->whereHas('property', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }

            if (! empty($validated['property_id'])) {
                $query->where('property_id', $validated['property_id']);
            }

            if (! empty($validated['status']) && $validated['status'] !== 'all') {
                $query->where('booking_status', $validated['status']);
            } else {
                $query->where('booking_status', '!=', 'cancelled');
            }

            $query->where('check_out', '>=', $dateFrom)
                ->where('check_in', '<=', $dateTo);

            $bookings = $query->orderBy('check_in')->get();

            return response()->json([
                'success' => true,
                'bookings' => TimelineBookingResource::collection($bookings),
                'date_range' => ['from' => $dateFrom, 'to' => $dateTo],
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
                'message' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function timeline(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->addMonths(2)->endOfMonth()->toDateString());

        $bookings = $this->bookingQueryService->getTimelineBookings(
            startDate: $startDate,
            endDate: $endDate,
            propertyId: $request->input('property_id'),
            status: $request->input('status'),
            user: $request->user()
        );

        return response()->json([
            'bookings' => TimelineBookingResource::collection($bookings),
            'date_range' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $query = $request->input('q', '');

        if (strlen($query) < 2) {
            return response()->json([
                'success' => true,
                'bookings' => [],
                'count' => 0,
            ]);
        }

        $user = $request->user();

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
                'external_reservation_url',
                'created_at',
            ])
            ->with('property:id,name');

        if ($user->role === 'property_owner') {
            $bookings->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        $bookings->where(function ($q) use ($query) {
            $q->where('booking_number', 'LIKE', "%{$query}%")
                ->orWhere('guest_name', 'LIKE', "%{$query}%")
                ->orWhere('guest_email', 'LIKE', "%{$query}%")
                ->orWhere('guest_phone', 'LIKE', "%{$query}%");
        });

        $bookings->where('booking_status', '!=', 'cancelled');

        $results = $bookings->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'bookings' => $results,
            'count' => $results->count(),
        ]);
    }

    public function checkAvailability(CheckAvailabilityRequest $request): JsonResponse
    {
        $property = Property::findOrFail($request->property_id);
        $excludeBookingId = $request->input('exclude_booking_id');

        $availabilityData = $this->availabilityService->checkAvailability(
            property: $property,
            checkIn: $request->check_in,
            checkOut: $request->check_out,
            excludeBookingId: $excludeBookingId
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

    public function calculateRate(CalculateRateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $property = Property::findOrFail($validated['property_id']);

            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $validated['check_in'],
                $validated['check_out'],
                $validated['guest_count'],
                $validated['daily_extra_beds'] ?? null
            );

            return response()->json([
                'success' => true,
                'calculation' => $rateCalculation->toArray(),
                'formatted' => [
                    'base_amount' => 'Rp '.number_format($rateCalculation->baseAmount, 0, ',', '.'),
                    'extra_bed_amount' => 'Rp '.number_format($rateCalculation->extraBedAmount, 0, ',', '.'),
                    'total_amount' => 'Rp '.number_format($rateCalculation->totalAmount, 0, ',', '.'),
                ],
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Property not found',
                'message' => 'Property dengan ID '.($validated['property_id'] ?? 'unknown').' tidak ditemukan',
            ], 404);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Failed to calculate rate: '.$e->getMessage(),
            ], 400);
        }
    }

    public function availabilityAndRates(CalculateRateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $property = Property::findOrFail($validated['property_id']);

            $availability = $this->availabilityService->checkAvailability(
                $property,
                $validated['check_in'],
                $validated['check_out']
            );

            $rateCalculation = $this->rateCalculationService->calculateRate(
                $property,
                $validated['check_in'],
                $validated['check_out'],
                (int) $validated['guest_count'],
                $validated['daily_extra_beds'] ?? null
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
                    'base_amount' => 'Rp '.number_format($rateCalculation->baseAmount, 0, ',', '.'),
                    'extra_bed_amount' => 'Rp '.number_format($rateCalculation->extraBedAmount, 0, ',', '.'),
                    'total_amount' => 'Rp '.number_format($rateCalculation->totalAmount, 0, ',', '.'),
                    'per_night' => 'Rp '.number_format(($rateCalculation->totalAmount / max($rateCalculation->nights, 1)), 0, ',', '.'),
                ],
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Property not found',
                'message' => 'Property dengan ID '.($validated['property_id'] ?? 'unknown').' tidak ditemukan',
            ], 404);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Failed to get availability and rates: '.$e->getMessage(),
            ], 400);
        }
    }

    public function getPropertyDateRange(GetPropertyDateRangeRequest $request): JsonResponse
    {
        $property = Property::findOrFail($request->property_id);

        // Accept both 'start_date'/'end_date' and 'start'/'end' (sent by BookingForm)
        $startDate = $request->input('start_date') ?? $request->input('start', now()->toDateString());
        $endDate = $request->input('end_date') ?? $request->input('end', now()->addMonths(3)->toDateString());
        $excludeBookingId = $request->input('exclude_booking_id') ? (int) $request->input('exclude_booking_id') : null;

        try {
            $availability = $this->availabilityService->checkAvailability(
                property: $property,
                checkIn: $startDate,
                checkOut: $endDate,
                excludeBookingId: $excludeBookingId
            );
            $bookedDates = $this->availabilityService->getBookedDatesInRange($property, $startDate, $endDate, $excludeBookingId);
            $seasonalRates = PropertySeasonalRate::getEffectiveRateForProperty(
                $property->id,
                Carbon::parse($startDate),
                Carbon::parse($endDate)
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
            return response()->json([
                'success' => false,
                'error' => 'Failed to get property date range data',
            ], 500);
        }
    }

    public function detail(Booking $booking): JsonResponse
    {
        $booking->load([
            'property.media',
            'payments.paymentMethod',
            'services',
            'dailyRevenues',
            'review',
            'createdBy',
            'followedUpBy',
        ]);

        return response()->json([
            'success' => true,
            'booking' => $booking,
        ]);
    }

    public function storePayment(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('create', Payment::class);

        try {
            $validated = $request->validate([
                'payment_method_id' => 'required|exists:payment_methods,id',
                'amount' => 'required|numeric|min:1',
                'payment_type' => 'required|in:dp,remaining,full,refund,penalty',
                'payment_status' => 'required|in:pending,verified',
                'payment_date' => 'required|date',
                'reference_number' => 'nullable|string|max:100',
                'bank_name' => 'nullable|string|max:100',
                'account_number' => 'nullable|string|max:50',
                'account_name' => 'nullable|string|max:255',
                'notes' => 'nullable|string|max:1000',
                'proof_of_payment' => 'nullable|file|mimes:jpg,jpeg,png,pdf,webp,heic,heif|max:10240',
            ]);
        } catch (ValidationException $e) {
            Log::error('Validation failed in storePayment: '.json_encode($e->errors()).' | Payload: '.json_encode($request->all()));
            throw $e;
        }

        DB::beginTransaction();
        try {
            $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);

            // Calculate current paid amount
            $paidAmount = $booking->payments()->where('payment_status', 'verified')->sum('amount');
            $pendingAmount = $booking->total_amount - $paidAmount;

            if ($validated['amount'] > $pendingAmount && in_array($validated['payment_type'], ['dp', 'remaining', 'full'])) {
                return response()->json([
                    'success' => false,
                    'error' => 'Jumlah pembayaran melebihi sisa tagihan booking yang belum dibayar.',
                ], 422);
            }

            // Handle proof of payment upload
            $proofPath = null;
            if ($request->hasFile('proof_of_payment')) {
                $file = $request->file('proof_of_payment');
                $imageService = app(ImageService::class);
                $result = $imageService->upload($file, [
                    'directory' => 'payment-proofs',
                    'max_width' => 1920,
                    'max_height' => 1920,
                    'quality' => 85,
                    'convert_to_webp' => true,
                    'generate_thumbnail' => true,
                    'thumbnail_width' => 300,
                    'thumbnail_height' => 200,
                ]);

                if ($result->success) {
                    $proofPath = $result->path;
                } else {
                    Log::warning('Image processing failed in storePayment modal upload, using fallback: '.$result->error);
                    $filename = time().'_'.uniqid().'.'.$file->getClientOriginalExtension();
                    $file->storeAs('payment-proofs', $filename, 'public');
                    $proofPath = 'payment-proofs/'.$filename;
                }
            }

            // Create payment record
            $payment = $booking->payments()->create([
                'payment_method_id' => $validated['payment_method_id'],
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $validated['amount'],
                'payment_type' => $validated['payment_type'],
                'payment_method' => $paymentMethod->type,
                'payment_status' => $validated['payment_status'],
                'payment_date' => $validated['payment_date'],
                'reference_number' => $validated['reference_number'] ?? null,
                'bank_name' => ($validated['bank_name'] ?? null) ?: $paymentMethod->bank_name,
                'account_number' => $validated['account_number'] ?? null,
                'account_name' => $validated['account_name'] ?? null,
                'verification_notes' => $validated['notes'] ?? null,
                'attachment_path' => $proofPath,
                'processed_by' => Auth::id(),
                'verified_by' => $validated['payment_status'] === 'verified' ? Auth::id() : null,
                'verified_at' => $validated['payment_status'] === 'verified' ? now() : null,
            ]);

            // Update booking payment status and remaining amount
            $totalPaid = $booking->getTotalPaidAmount();
            $booking->dp_paid_amount = $totalPaid;
            $booking->remaining_amount = max(0, $booking->total_amount - $totalPaid);
            $booking->updatePaymentStatus();
            $booking->save();

            // Sync income and wallet if verified
            if ($validated['payment_status'] === 'verified') {
                app(PaymentIncomeSyncService::class)->syncOnVerified($payment);
            }

            DB::commit();

            // Return reloaded detailed booking data
            $booking->load([
                'property.media',
                'payments.paymentMethod',
                'services',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil disimpan.',
                'booking' => $booking,
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error in storePayment: '.$e->getMessage()."\n".$e->getTraceAsString());

            return response()->json([
                'success' => false,
                'error' => 'Gagal menyimpan transaksi: '.$e->getMessage(),
            ], 500);
        }
    }

    public function paymentMethods(Request $request): JsonResponse
    {
        $propertyId = $request->query('property_id');
        $methods = PaymentMethod::active()
            ->orderBy('sort_order')
            ->get();

        $preferredPaymentMethodId = null;

        if ($propertyId) {
            $property = Property::find($propertyId);
            if ($property && $property->bankAccount) {
                $bankAccount = $property->bankAccount;
                foreach ($methods as $method) {
                    if ($method->type === 'bank_transfer' && strtolower((string) $method->code) === strtolower((string) $bankAccount->bank_code)) {
                        $preferredPaymentMethodId = $method->id;
                        break;
                    }
                }
            }
        }

        return response()->json([
            'success' => true,
            'payment_methods' => $methods,
            'preferred_payment_method_id' => $preferredPaymentMethodId,
        ]);
    }

    public function bankAccounts(Request $request): JsonResponse
    {
        $paymentMethodId = $request->query('payment_method_id');

        $query = BankAccount::query();

        if ($paymentMethodId) {
            $query->where('payment_method_id', $paymentMethodId);
        }

        $accounts = $query->orderBy('bank_name')->orderBy('label')->get()->map(fn ($acc) => [
            'id' => $acc->id,
            'bank_name' => $acc->bank_name,
            'bank_code' => $acc->bank_code,
            'account_number' => $acc->account_number,
            'account_holder' => $acc->account_holder,
            'label' => $acc->label ?: $acc->bank_name,
        ]);

        return response()->json([
            'success' => true,
            'bank_accounts' => $accounts,
        ]);
    }
}
