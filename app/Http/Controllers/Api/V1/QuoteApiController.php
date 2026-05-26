<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Services\RateCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * API v1 — Quotes & Pricing
 *
 * Calculates total price including extras, seasonal rates, and weekend premiums.
 * AI Agent MUST call this before quoting any price to a guest.
 */
class QuoteApiController extends Controller
{
    public function __construct(
        private RateCalculationService $rateCalculationService,
    ) {}

    /**
     * POST /api/v1/quotes/calculate
     *
     * Calculate total price for a booking.
     * Returns full breakdown including per-night rates, premiums, extras.
     */
    public function calculate(Request $request): JsonResponse
    {
        $request->validate([
            'unit_id' => 'required_without:unit_slug|integer',
            'unit_slug' => 'required_without:unit_id|string',
            'check_in' => 'required|date|after_or_equal:today',
            'check_out' => 'required|date|after:check_in',
            'guests' => 'required|integer|min:1|max:50',
            'extras' => 'nullable|array|max:10',
            'extras.*.code' => 'required|string|in:extra_bed,early_checkin,late_checkout,floating_breakfast,breakfast',
            'extras.*.quantity' => 'required|integer|min:1|max:20',
            'promo_code' => 'nullable|string|max:50',
        ]);

        $property = $request->filled('unit_slug')
            ? Property::active()->where('slug', $request->input('unit_slug'))->firstOrFail()
            : Property::active()->findOrFail($request->integer('unit_id'));

        $checkIn = $request->input('check_in');
        $checkOut = $request->input('check_out');
        $guests = $request->integer('guests');

        // Validate guest count
        if ($guests > $property->capacity_max) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_CAPACITY_EXCEEDED',
                    'message' => "Jumlah tamu ({$guests}) melebihi kapasitas maksimum ({$property->capacity_max}).",
                ],
            ], 422);
        }

        try {
            $calc = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guests);
            $calcArray = $calc->toArray();

            // Build breakdown items
            $breakdown = [];

            // Base accommodation cost
            $totalBaseAmount = $calcArray['breakdown']['total_base_amount'] ?? $calc->baseAmount;
            $breakdown[] = [
                'label' => "{$calc->nights} malam ({$checkIn} s/d {$checkOut})",
                'calculation' => $this->buildNightCalculationLabel($calcArray),
                'amount' => $totalBaseAmount,
                'formatted' => 'Rp '.number_format($totalBaseAmount, 0, ',', '.'),
            ];

            // Extra bed
            if ($calc->extraBedAmount > 0) {
                $breakdown[] = [
                    'label' => "Extra bed × {$calc->extraBeds}",
                    'amount' => $calc->extraBedAmount,
                    'formatted' => 'Rp '.number_format($calc->extraBedAmount, 0, ',', '.'),
                ];
            }

            // Cleaning fee
            if ($calc->cleaningFee > 0) {
                $breakdown[] = [
                    'label' => 'Biaya kebersihan',
                    'amount' => $calc->cleaningFee,
                    'formatted' => 'Rp '.number_format($calc->cleaningFee, 0, ',', '.'),
                ];
            }

            // Process extras (add-on services)
            $extrasTotal = 0;
            $extrasBreakdown = [];
            foreach ($request->input('extras', []) as $extra) {
                $extraPrice = $this->getExtraPrice($extra['code'], $property);
                $extraAmount = $extraPrice * $extra['quantity'];
                $extrasTotal += $extraAmount;
                $extrasBreakdown[] = [
                    'code' => $extra['code'],
                    'label' => $this->getExtraLabel($extra['code']),
                    'quantity' => $extra['quantity'],
                    'unit_price' => $extraPrice,
                    'amount' => $extraAmount,
                    'formatted' => 'Rp '.number_format($extraAmount, 0, ',', '.'),
                ];
                $breakdown[] = [
                    'label' => $this->getExtraLabel($extra['code']).' × '.$extra['quantity'],
                    'amount' => $extraAmount,
                    'formatted' => 'Rp '.number_format($extraAmount, 0, ',', '.'),
                ];
            }

            $subtotal = $calc->totalAmount + $extrasTotal;
            $taxAmount = 0; // Tax = 0% for now
            $total = $subtotal + $taxAmount;

            // Generate quote ID (valid 30 minutes)
            $quoteId = 'quote_'.Str::random(12);
            $expiresAt = now()->addMinutes(30);

            // DP calculation (default 50%)
            $dpPercent = 50;
            $dpAmount = (int) ($total * $dpPercent / 100);

            return response()->json([
                'success' => true,
                'data' => [
                    'unit_id' => $property->id,
                    'unit_slug' => $property->slug,
                    'unit_name' => $property->name,
                    'nights' => $calc->nights,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'guests' => $guests,
                    'extra_beds' => $calc->extraBeds,
                    'breakdown' => $breakdown,
                    'extras_breakdown' => $extrasBreakdown,
                    'subtotal' => $subtotal,
                    'tax' => $taxAmount,
                    'total' => $total,
                    'deposit_required' => [
                        'percent' => $dpPercent,
                        'amount' => $dpAmount,
                        'due_within_hours' => 24,
                        'formatted' => 'Rp '.number_format($dpAmount, 0, ',', '.'),
                    ],
                    'currency' => 'IDR',
                    'formatted' => [
                        'subtotal' => 'Rp '.number_format($subtotal, 0, ',', '.'),
                        'total' => 'Rp '.number_format($total, 0, ',', '.'),
                        'per_night_avg' => 'Rp '.number_format((int) ($total / $calc->nights), 0, ',', '.'),
                    ],
                    'rate_details' => [
                        'weekday_nights' => $calcArray['breakdown']['weekday_nights'] ?? 0,
                        'weekend_nights' => $calcArray['breakdown']['weekend_nights'] ?? 0,
                        'seasonal_nights' => $calcArray['breakdown']['seasonal_nights'] ?? 0,
                        'seasonal_rates_applied' => $calc->seasonalRatesApplied,
                        'daily_breakdown' => $calcArray['breakdown']['daily_breakdown'] ?? [],
                    ],
                    'quote_id' => $quoteId,
                    'expires_at' => $expiresAt->toISOString(),
                ],
                'meta' => $this->meta($request),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INTERNAL_CALCULATION_ERROR',
                    'message' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    /**
     * GET /api/v1/extras
     *
     * List available add-on services.
     */
    public function extras(Request $request): JsonResponse
    {
        $extras = [
            [
                'code' => 'extra_bed',
                'label' => 'Extra Bed',
                'description' => 'Kasur tambahan untuk 1 orang',
                'price' => 150000,
                'unit' => 'per_bed',
                'available_for' => 'all',
            ],
            [
                'code' => 'early_checkin',
                'label' => 'Early Check-in (sebelum 14:00)',
                'description' => 'Check-in lebih awal dari jam standar',
                'price' => 200000,
                'unit' => 'per_booking',
                'available_for' => 'all',
            ],
            [
                'code' => 'late_checkout',
                'label' => 'Late Check-out (setelah 11:00)',
                'description' => 'Check-out lebih lambat dari jam standar',
                'price' => 200000,
                'unit' => 'per_booking',
                'available_for' => 'all',
            ],
            [
                'code' => 'floating_breakfast',
                'label' => 'Floating Breakfast',
                'description' => 'Sarapan di kolam renang (khusus unit dengan private pool)',
                'price' => 250000,
                'unit' => 'per_set',
                'available_for' => ['cubic-villa', 'villahoms', 'abaia-villa'],
            ],
            [
                'code' => 'breakfast',
                'label' => 'Sarapan Tambahan',
                'description' => 'Sarapan untuk tamu tambahan',
                'price' => 75000,
                'unit' => 'per_person',
                'available_for' => 'all',
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => ['extras' => $extras],
            'meta' => $this->meta($request),
        ]);
    }

    private function getExtraPrice(string $code, Property $property): int
    {
        return match ($code) {
            'extra_bed' => (int) ($property->extra_bed_rate ?: 150000),
            'early_checkin' => 200000,
            'late_checkout' => 200000,
            'floating_breakfast' => 250000,
            'breakfast' => 75000,
            default => 0,
        };
    }

    private function getExtraLabel(string $code): string
    {
        return match ($code) {
            'extra_bed' => 'Extra Bed',
            'early_checkin' => 'Early Check-in',
            'late_checkout' => 'Late Check-out',
            'floating_breakfast' => 'Floating Breakfast',
            'breakfast' => 'Sarapan',
            default => ucfirst(str_replace('_', ' ', $code)),
        };
    }

    private function buildNightCalculationLabel(array $calcArray): string
    {
        $weekdayNights = $calcArray['breakdown']['weekday_nights'] ?? 0;
        $weekendNights = $calcArray['breakdown']['weekend_nights'] ?? 0;
        $baseRate = $calcArray['breakdown']['rate_breakdown']['base_rate_per_night'] ?? 0;

        $parts = [];
        if ($weekdayNights > 0) {
            $parts[] = 'Rp '.number_format($baseRate, 0, ',', '.')." × {$weekdayNights} malam biasa";
        }
        if ($weekendNights > 0) {
            $parts[] = "{$weekendNights} malam weekend";
        }

        return implode(' + ', $parts) ?: "{$calcArray['nights']} malam";
    }

    private function meta(Request $request): array
    {
        return [
            'request_id' => $request->header('X-Request-Id', uniqid('req_')),
            'timestamp' => now()->toISOString(),
            'api_version' => 'v1',
        ];
    }
}
