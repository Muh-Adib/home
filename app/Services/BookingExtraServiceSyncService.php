<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingService;
use App\Models\PropertyExpense;
use App\Models\ServiceMaster;

/**
 * Service untuk mengelola booking services (extra services).
 *
 * Bertanggung jawab untuk:
 * - Sync services dari request data
 * - Menghitung total services amount
 * - Update/replace existing services
 */
class BookingExtraServiceSyncService
{
    /**
     * Sync booking services and return total amount.
     *
     * @param  bool  $replaceExisting  Whether to delete existing services first
     * @return float Total services amount
     */
    public function sync(Booking $booking, ?array $services, bool $replaceExisting = false): float
    {
        // Hapus existing services jika diminta
        if ($replaceExisting) {
            $booking->services()->delete();
            PropertyExpense::where('booking_id', $booking->id)->delete();
        }

        // Jika tidak ada services, return 0
        if (empty($services) || ! is_array($services)) {
            return 0.0;
        }

        $servicesTotal = 0;

        // Group services by service_master_id
        $grouped = [];
        $unmatched = [];
        foreach ($services as $svc) {
            $masterId = $svc['service_master_id'] ?? null;
            if ($masterId) {
                $grouped[$masterId][] = $svc;
            } else {
                $unmatched[] = $svc;
            }
        }

        // Process unmatched/custom services as fallback
        foreach ($unmatched as $serviceData) {
            $qty = $serviceData['quantity'] ?? 1;
            $unitPrice = $serviceData['unit_price'] ?? 0;
            $bookingService = BookingService::create([
                'booking_id' => $booking->id,
                'service_master_id' => null,
                'service_name' => $serviceData['service_name'],
                'service_type' => $serviceData['service_type'],
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'discount_amount' => $serviceData['discount_amount'] ?? 0,
                'total_price' => $serviceData['total_price'] ?? ($qty * $unitPrice),
                'vendor_unit_price' => $serviceData['vendor_unit_price'] ?? 0,
                'vendor_total_price' => $serviceData['vendor_total_price'] ?? 0,
                'service_date' => ! empty($serviceData['service_date']) ? $serviceData['service_date'] : null,
            ]);
            $servicesTotal += $bookingService->total_price;
        }

        foreach ($grouped as $masterId => $groupItems) {
            $master = ServiceMaster::find($masterId);
            if (! $master) {
                // If master not found, save as is (fallback)
                foreach ($groupItems as $serviceData) {
                    $qty = $serviceData['quantity'] ?? 1;
                    $unitPrice = $serviceData['unit_price'] ?? 0;
                    $bookingService = BookingService::create([
                        'booking_id' => $booking->id,
                        'service_master_id' => $masterId,
                        'service_name' => $serviceData['service_name'],
                        'service_type' => $serviceData['service_type'],
                        'quantity' => $qty,
                        'unit_price' => $unitPrice,
                        'discount_amount' => $serviceData['discount_amount'] ?? 0,
                        'total_price' => $serviceData['total_price'] ?? ($qty * $unitPrice),
                        'vendor_unit_price' => $serviceData['vendor_unit_price'] ?? 0,
                        'vendor_total_price' => $serviceData['vendor_total_price'] ?? 0,
                        'service_date' => ! empty($serviceData['service_date']) ? $serviceData['service_date'] : null,
                    ]);
                    $servicesTotal += $bookingService->total_price;
                }

                continue;
            }

            $unitPrice = (float) $master->unit_price;
            $vendorUnitPrice = (float) $master->vendor_unit_price;
            $discountAmount = (float) $master->discount_amount;
            $discountLimit = $master->discount_limit;
            $discountFreq = $master->discount_frequency ?? 'all';

            // Sort groupItems by service_date ascending to identify the first night
            usort($groupItems, function ($a, $b) {
                $dateA = $a['service_date'] ?? '';
                $dateB = $b['service_date'] ?? '';
                if ($dateA === $dateB) {
                    return 0;
                }
                if ($dateA === '') {
                    return -1;
                }
                if ($dateB === '') {
                    return 1;
                }

                return strcmp((string) $dateA, (string) $dateB);
            });

            foreach ($groupItems as $index => $item) {
                $qty = (int) $item['quantity'];
                $discountedQty = 0;

                // Check if eligible for discount (all dates, or only the first night)
                $isEligible = ($discountFreq === 'all') || ($discountFreq === 'first_night' && $index === 0);

                if ($isEligible && $discountAmount > 0) {
                    if ($discountLimit !== null && $discountLimit > 0) {
                        $discountedQty = min($qty, $discountLimit);
                    } else {
                        $discountedQty = $qty;
                    }
                }

                // Calculate total price for this item
                $normalQty = $qty - $discountedQty;
                $itemTotalPrice = ($discountedQty * ($unitPrice - $discountAmount)) + ($normalQty * $unitPrice);

                // Per-unit discount_amount to save in DB
                $itemDiscountPerUnit = $qty > 0 ? ($discountedQty * $discountAmount) / $qty : 0;

                $bookingService = BookingService::create([
                    'booking_id' => $booking->id,
                    'service_master_id' => $master->id,
                    'service_name' => $master->name,
                    'service_type' => $master->service_type,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'discount_amount' => $itemDiscountPerUnit,
                    'total_price' => $itemTotalPrice,
                    'vendor_unit_price' => $vendorUnitPrice,
                    'vendor_total_price' => $qty * $vendorUnitPrice,
                    'service_date' => ! empty($item['service_date']) ? $item['service_date'] : null,
                ]);

                $servicesTotal += $bookingService->total_price;
            }
        }

        // Sync expenses for this booking's extra services
        PropertyExpense::where('booking_id', $booking->id)->delete();

        $bookingServices = $booking->services()->where('vendor_total_price', '>', 0)->get();
        foreach ($bookingServices as $bs) {
            PropertyExpense::create([
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'expense_category' => 'other',
                'expense_type' => 'one_time',
                'description' => "Vendor Cost - {$bs->service_name} (Booking #{$booking->booking_number})",
                'amount' => $bs->vendor_total_price,
                'expense_date' => $bs->service_date ? $bs->service_date : $booking->check_in,
                'vendor_name' => $bs->service_name,
                'recorded_by' => auth()->id() ?? $booking->created_by ?? 1,
                'created_by' => auth()->id() ?? $booking->created_by ?? 1,
                'status' => 'approved',
                'notes' => "Generated automatically from Booking #{$booking->booking_number} extra services.",
            ]);
        }

        return $servicesTotal;
    }

    public function updateBookingTotalWithServices(Booking $booking, float $servicesTotal): void
    {
        if ($servicesTotal <= 0) {
            return;
        }

        // Update total amount
        $booking->update([
            'total_amount' => $booking->total_amount + $servicesTotal,
        ]);

        // Recalculate DP and remaining amount
        // Hanya recalculate dp_amount jika dp_percentage > 0 untuk menghindari override DP yang sudah ada
        $dpAmount = ($booking->dp_percentage > 0)
            ? (int) round(($booking->total_amount * $booking->dp_percentage) / 100)
            : $booking->dp_amount;

        $booking->update([
            'dp_amount' => $dpAmount,
            'remaining_amount' => max(0, (int) ($booking->total_amount - $booking->getTotalPaidAmount())),
        ]);
    }
}
