<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Property;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class CheckInOutController extends Controller
{
    /**
     * Display check-in/out dashboard for today
     */
    public function index(): Response
    {
        $this->authorize('viewAny', Booking::class);

        $today = now()->toDateString();

        // Get today's check-outs
        $checkOuts = Booking::with(['property', 'primaryGuest'])
            ->whereDate('check_out', $today)
            ->where('booking_status', 'checked_in')
            ->orderBy('property_id')
            ->get()
            ->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'property_name' => $booking->property->name,
                    'location' => $booking->property->location ?? 'selatan',
                    'guest_name' => $booking->primaryGuest->full_name ?? $booking->primaryGuest->guest_name ?? $booking->guest_name ?? '',
                    'guest_phone' => $booking->primaryGuest->phone ?? $booking->primaryGuest->guest_phone ?? $booking->guest_phone ?? '',
                    'is_cleaned' => $booking->is_cleaned,
                ];
            });

        // Get today's check-ins
        $checkIns = Booking::with(['property', 'primaryGuest', 'services', 'dailyRevenues'])
            ->whereDate('check_in', $today)
            ->whereIn('booking_status', ['pending_verification', 'confirmed'])
            ->orderBy('property_id')
            ->get()
            ->map(function ($booking) use ($today) {
                $checkInDate = Carbon::parse($booking->check_in);
                $checkOutDate = Carbon::parse($booking->check_out);
                $nights = $checkInDate->diffInDays($checkOutDate);
                $addons = $this->getCheckInAddons($booking, $today);

                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'property_name' => $booking->property->name,
                    'location' => $booking->property->location ?? 'selatan',
                    'guest_name' => $booking->primaryGuest->full_name ?? $booking->primaryGuest->guest_name ?? $booking->guest_name ?? '',
                    'guest_phone' => $booking->primaryGuest->phone ?? $booking->primaryGuest->guest_phone ?? $booking->guest_phone ?? '',
                    'nights' => $nights,
                    'is_cleaned' => $booking->is_cleaned,
                    'first_day_extra_beds' => $addons['first_day_extra_beds'],
                    'extra_services' => $addons['extra_services'],
                ];
            });

        // Get staying guests (checked in but not checking out today)
        $stayingGuests = Booking::with(['property', 'primaryGuest'])
            ->where('booking_status', 'checked_in')
            ->whereDate('check_out', '!=', $today)
            ->orderBy('property_id')
            ->get()
            ->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'property_name' => $booking->property->name,
                    'location' => $booking->property->location ?? 'selatan',
                    'guest_name' => $booking->primaryGuest->guest_name ?? '',
                    'check_out_date' => $booking->check_out,
                    'is_cleaned' => $booking->is_cleaned,
                ];
            });

        // Get empty units (all active properties that don't have bookings today)
        $bookedPropertyIds = Booking::where(function ($query) use ($today) {
            $query->where('check_in', '<=', $today)
                ->where('check_out', '>', $today)
                ->whereIn('booking_status', ['confirmed', 'checked_in', 'pending_verification']);
        })
            ->pluck('property_id')
            ->unique()
            ->toArray();

        $emptyUnits = Property::where('status', 'active')
            ->whereNotIn('id', $bookedPropertyIds)
            ->orderBy('location')
            ->orderBy('name')
            ->get()
            ->map(function ($property) {
                return [
                    'id' => $property->id,
                    'name' => $property->name,
                    'location' => $property->location ?? 'selatan',
                ];
            });

        return Inertia::render('Admin/Bookings/CheckInOut', [
            'checkOuts' => $checkOuts,
            'checkIns' => $checkIns,
            'stayingGuests' => $stayingGuests,
            'emptyUnits' => $emptyUnits,
            'today' => $today,
        ]);
    }

    /**
     * Generate formatted text for WhatsApp
     */
    public function generateText(): JsonResponse
    {
        $this->authorize('viewAny', Booking::class);

        $today = now();
        $todayDate = $today->toDateString();

        // Indonesian day names
        $dayNames = [
            'Sunday' => 'MINGGU',
            'Monday' => 'SENIN',
            'Tuesday' => 'SELASA',
            'Wednesday' => 'RABU',
            'Thursday' => 'KAMIS',
            'Friday' => 'JUMAT',
            'Saturday' => 'SABTU',
        ];
        $dayName = $dayNames[$today->englishDayOfWeek];

        // Get today's check-outs
        $checkOuts = Booking::with(['property', 'primaryGuest'])
            ->whereDate('check_out', $todayDate)
            ->where('booking_status', 'checked_in')
            ->orderBy('property_id')
            ->get();

        // Get today's check-ins
        $checkIns = Booking::with(['property', 'primaryGuest', 'services', 'dailyRevenues'])
            ->whereDate('check_in', $todayDate)
            ->whereIn('booking_status', ['pending_verification', 'confirmed'])
            ->orderBy('property_id')
            ->get();

        // Get staying guests
        $stayingGuests = Booking::with(['property'])
            ->where('booking_status', 'checked_in')
            ->whereDate('check_out', '!=', $todayDate)
            ->orderBy('property_id')
            ->get();

        // Get empty units
        $bookedPropertyIds = Booking::where(function ($query) use ($todayDate) {
            $query->whereDate('check_in', '<=', $todayDate)
                ->whereDate('check_out', '>', $todayDate)
                ->whereIn('booking_status', ['confirmed', 'checked_in', 'pending_verification']);
        })
            ->pluck('property_id')
            ->unique()
            ->toArray();

        $emptyUnits = Property::where('status', 'active')
            ->whereNotIn('id', $bookedPropertyIds)
            ->orderBy('location')
            ->orderBy('name')
            ->get();

        // Generate text
        $text = "JADWAL HARI INI {$dayName}\n\n";
        $text .= "MOHON UNTUK DIBACA DETAIL JANGAN SAMPAI TIDAK BACA\n\n";

        // CHECK OUT section
        $text .= "CHECK OUT\n";

        $checkOutsSelatan = $checkOuts->filter(fn ($b) => optional($b->property)->location === 'selatan');
        $checkOutsUtara = $checkOuts->filter(fn ($b) => optional($b->property)->location === 'utara');

        $text .= "🏡 SELATAN\n";
        if ($checkOutsSelatan->isEmpty()) {
            $text .= "-\n";
        } else {
            foreach ($checkOutsSelatan->values() as $index => $booking) {
                $name = $booking->primaryGuest?->guest_name ?? $booking->guest_name ?? '-';
                $phone = $booking->primaryGuest?->guest_phone ?? $booking->guest_phone ?? '-';
                $text .= ($index + 1).". {$booking->property?->name} - {$name} - {$phone} - CO\n";
            }
        }
        $text .= "\n";

        $text .= "🏡 UTARA\n";
        if ($checkOutsUtara->isEmpty()) {
            $text .= "-\n";
        } else {
            foreach ($checkOutsUtara->values() as $index => $booking) {
                $name = $booking->primaryGuest?->guest_name ?? $booking->guest_name ?? '-';
                $phone = $booking->primaryGuest?->guest_phone ?? $booking->guest_phone ?? '-';
                $text .= ($index + 1).". {$booking->property?->name} - {$name} - {$phone} - CO\n";
            }
        }
        $text .= "\n";

        // CHECK IN section
        $text .= "CHECK IN\n";

        $checkInsSelatan = $checkIns->filter(fn ($b) => optional($b->property)->location === 'selatan');
        $checkInsUtara = $checkIns->filter(fn ($b) => optional($b->property)->location === 'utara');

        $text .= "🏡 SELATAN\n";
        if ($checkInsSelatan->isEmpty()) {
            $text .= "-\n";
        } else {
            foreach ($checkInsSelatan->values() as $index => $booking) {
                $nights = Carbon::parse($booking->check_in)->diffInDays(Carbon::parse($booking->check_out));
                $name = $booking->primaryGuest?->full_name ?? $booking->primaryGuest?->guest_name ?? $booking->guest_name ?? '-';
                $phone = $booking->primaryGuest?->phone ?? $booking->primaryGuest?->guest_phone ?? $booking->guest_phone ?? '-';
                $addons = $this->getCheckInAddons($booking, $todayDate);

                $addonItems = [];
                if ($addons['first_day_extra_beds'] > 0) {
                    $addonItems[] = "Extrabed H1: {$addons['first_day_extra_beds']}";
                }
                if (! empty($addons['extra_services'])) {
                    $addonItems[] = 'Extra Service: '.implode(', ', $addons['extra_services']);
                }
                $addonStr = ! empty($addonItems) ? ' ['.implode(' | ', $addonItems).']' : '';

                $text .= ($index + 1).". {$booking->property?->name} {$nights} malam - {$name} - {$phone}{$addonStr}\n";
            }
        }
        $text .= "\n";

        $text .= "🏡 UTARA\n";
        if ($checkInsUtara->isEmpty()) {
            $text .= "-\n";
        } else {
            foreach ($checkInsUtara->values() as $index => $booking) {
                $nights = Carbon::parse($booking->check_in)->diffInDays(Carbon::parse($booking->check_out));
                $name = $booking->primaryGuest?->full_name ?? $booking->primaryGuest?->guest_name ?? $booking->guest_name ?? '-';
                $phone = $booking->primaryGuest?->phone ?? $booking->primaryGuest?->guest_phone ?? $booking->guest_phone ?? '-';
                $addons = $this->getCheckInAddons($booking, $todayDate);

                $addonItems = [];
                if ($addons['first_day_extra_beds'] > 0) {
                    $addonItems[] = "Extrabed H1: {$addons['first_day_extra_beds']}";
                }
                if (! empty($addons['extra_services'])) {
                    $addonItems[] = 'Extra Service: '.implode(', ', $addons['extra_services']);
                }
                $addonStr = ! empty($addonItems) ? ' ['.implode(' | ', $addonItems).']' : '';

                $text .= ($index + 1).". {$booking->property?->name} {$nights} malam - {$name} - {$phone}{$addonStr}\n";
            }
        }
        $text .= "\n";

        // UNIT KOSONG section
        $text .= "UNIT KOSONG\n";
        if ($emptyUnits->isEmpty()) {
            $text .= "Semua unit terisi\n";
        } else {
            foreach ($emptyUnits as $index => $property) {
                $text .= ($index + 1).". {$property->name}\n";
            }
        }
        $text .= "\n";

        // TAMU STAY section
        $text .= "TAMU STAY\n";
        if ($stayingGuests->isEmpty()) {
            $text .= "Tidak ada\n";
        } else {
            foreach ($stayingGuests as $index => $booking) {
                $text .= ($index + 1).". {$booking->property->name}\n";
            }
        }
        $text .= "\n";
        $text .= "TAMU STAY WAJIB PANTAU TOKEN\n\n";

        // JADWAL PIKET section
        $text .= "JADWAL PIKET\n";
        $text .= "Laundy\n";
        $text .= "Siang\n";
        $text .= "Malam\n\n";

        // NOTE section
        $text .= "NOTE‼\n";
        $text .= "1. Cek ulang unit kosong hari ini\n";

        return response()->json([
            'success' => true,
            'text' => $text,
        ]);
    }

    /**
     * Extract first day extra bed count and extra services list for a check-in booking.
     */
    protected function getCheckInAddons(Booking $booking, string $targetDateStr): array
    {
        $firstDayRev = BookingDailyRevenue::where('booking_id', $booking->id)
            ->whereDate('tanggal', $targetDateStr)
            ->first();

        $firstDayExtraBeds = $firstDayRev ? (int) $firstDayRev->extra_bed_count : 0;

        if ($firstDayExtraBeds === 0) {
            $ebService = $booking->services ? $booking->services->first(function ($s) {
                return stripos($s->service_name, 'extra bed') !== false
                    || stripos($s->service_name, 'extrabed') !== false
                    || $s->service_type === 'extra_bed';
            }) : null;

            if ($ebService) {
                $firstDayExtraBeds = (int) $ebService->quantity;
            } else {
                $firstDayExtraBeds = (int) ($booking->extra_bed_count ?? 0);
            }
        }

        $extraServices = $booking->services ? $booking->services
            ->filter(function ($s) {
                return stripos($s->service_name, 'extra bed') === false
                    && stripos($s->service_name, 'extrabed') === false
                    && $s->service_type !== 'extra_bed';
            })
            ->map(function ($s) {
                return $s->quantity > 1 ? "{$s->service_name} ({$s->quantity}x)" : $s->service_name;
            })
            ->values()
            ->all() : [];

        return [
            'first_day_extra_beds' => $firstDayExtraBeds,
            'extra_services' => $extraServices,
        ];
    }
}
