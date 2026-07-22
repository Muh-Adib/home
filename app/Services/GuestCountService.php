<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Property;

/**
 * Service untuk menghitung jumlah tamu berdasarkan aturan bisnis property.
 *
 * Business Logic:
 * - Jika property memiliki kapasitas yang dapat diperluas (capacity < capacity_max),
 *   maka anak-anak dihitung sebagai 0.5 tamu (floor(children / 2))
 * - Jika tidak, semua tamu dihitung penuh (male + female + children)
 */
class GuestCountService
{
    /**
     * Calculate guest count based on property capacity rules.
     */
    public function calculate(Property $property, int $guestMale, int $guestFemale, int $guestChildren): int
    {
        // Property dengan kapasitas yang dapat diperluas: anak-anak dihitung setengah
        if ($property->capacity < $property->capacity_max) {
            return $guestMale + $guestFemale + (int) floor($guestChildren / 2);
        }

        // Property dengan kapasitas tetap: semua tamu dihitung penuh
        return $guestMale + $guestFemale + $guestChildren;
    }

    /**
     * Calculate guest count from validated request data.
     */
    public function calculateFromRequest(Property $property, array $validated): int
    {
        return $this->calculate(
            $property,
            (int) ($validated['guest_male'] ?? 0),
            (int) ($validated['guest_female'] ?? 0),
            (int) ($validated['guest_children'] ?? 0)
        );
    }
}
