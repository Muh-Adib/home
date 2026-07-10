<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingService;
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
            $bookingService = BookingService::create([
                'booking_id' => $booking->id,
                'service_master_id' => null,
                'service_name' => $serviceData['service_name'],
                'service_type' => $serviceData['service_type'],
                'quantity' => $serviceData['quantity'],
                'unit_price' => $serviceData['unit_price'],
                'discount_amount' => $serviceData['discount_amount'] ?? 0,
                'total_price' => $serviceData['total_price'],
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
                    $bookingService = BookingService::create([
                        'booking_id' => $booking->id,
                        'service_master_id' => $masterId,
                        'service_name' => $serviceData['service_name'],
                        'service_type' => $serviceData['service_type'],
                        'quantity' => $serviceData['quantity'],
                        'unit_price' => $serviceData['unit_price'],
                        'discount_amount' => $serviceData['discount_amount'] ?? 0,
                        'total_price' => $serviceData['total_price'],
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

            // Calculate total quantity in this group
            $totalQty = 0;
            foreach ($groupItems as $item) {
                $totalQty += (int) $item['quantity'];
            }

            // Determine discount limit remaining
            $discountLimitRemaining = 0;
            if ($discountAmount > 0) {
                if ($discountLimit !== null && $discountLimit > 0) {
                    $discountLimitRemaining = min($totalQty, $discountLimit);
                } else {
                    $discountLimitRemaining = $totalQty;
                }
            }

            foreach ($groupItems as $item) {
                $qty = (int) $item['quantity'];

                // How many in this item get the discount?
                $itemDiscountedQty = min($qty, $discountLimitRemaining);
                $discountLimitRemaining -= $itemDiscountedQty;

                // Calculate total price for this item
                $normalQty = $qty - $itemDiscountedQty;
                $itemTotalPrice = ($itemDiscountedQty * ($unitPrice - $discountAmount)) + ($normalQty * $unitPrice);

                // Per-unit discount_amount to save in DB
                $itemDiscountPerUnit = $qty > 0 ? ($itemDiscountedQty * $discountAmount) / $qty : 0;

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
