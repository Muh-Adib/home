<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingService;

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
     * @param Booking $booking
     * @param array|null $services
     * @param bool $replaceExisting Whether to delete existing services first
     * @return float Total services amount
     */
    public function sync(Booking $booking, ?array $services, bool $replaceExisting = false): float
    {
        // Jika tidak ada services, return 0
        if (empty($services) || !is_array($services)) {
            return 0.0;
        }
        
        // Hapus existing services jika diminta
        if ($replaceExisting) {
            $booking->services()->delete();
        }
        
        // Create services baru dan hitung total
        $servicesTotal = 0;
        foreach ($services as $serviceData) {
            $bookingService = BookingService::create([
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
        
        return $servicesTotal;
    }

    /**
     * Update booking total amount with services.
     * 
     * @param Booking $booking
     * @param float $servicesTotal
     * @return void
     */
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
        $booking->update([
            'dp_amount' => ($booking->total_amount * $booking->dp_percentage) / 100,
            'remaining_amount' => $booking->total_amount - (($booking->total_amount * $booking->dp_percentage) / 100),
        ]);
    }
}
