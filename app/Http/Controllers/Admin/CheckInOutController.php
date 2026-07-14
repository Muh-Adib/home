<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
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
            ->where('check_out', $today)
            ->where('booking_status', 'checked_in')
            ->orderBy('property_id')
            ->get()
            ->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'property_name' => $booking->property->name,
                    'location' => $booking->property->location ?? 'selatan',
                    'guest_name' => $booking->primaryGuest->guest_name ?? '',
                    'guest_phone' => $booking->primaryGuest->guest_phone ?? '',
                    'is_cleaned' => $booking->is_cleaned,
                ];
            });

        // Get today's check-ins
        $checkIns = Booking::with(['property', 'primaryGuest'])
            ->where('check_in', $today)
            ->whereIn('booking_status', ['pending_verification', 'confirmed'])
            ->orderBy('property_id')
            ->get()
            ->map(function ($booking) {
                $checkInDate = Carbon::parse($booking->check_in);
                $checkOutDate = Carbon::parse($booking->check_out);
                $nights = $checkInDate->diffInDays($checkOutDate);

                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'property_name' => $booking->property->name,
                    'location' => $booking->property->location ?? 'selatan',
                    'guest_name' => $booking->primaryGuest->guest_name ?? '',
                    'guest_phone' => $booking->primaryGuest->guest_phone ?? '',
                    'nights' => $nights,
                    'is_cleaned' => $booking->is_cleaned,
                ];
            });

        // Get staying guests (checked in but not checking out today)
        $stayingGuests = Booking::with(['property', 'primaryGuest'])
            ->where('booking_status', 'checked_in')
            ->where('check_out', '!=', $today)
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
            ->where('check_out', $todayDate)
            ->where('booking_status', 'checked_in')
            ->orderBy('property_id')
            ->get();

        // Get today's check-ins
        $checkIns = Booking::with(['property', 'primaryGuest'])
            ->where('check_in', $todayDate)
            ->whereIn('booking_status', ['pending_verification', 'confirmed'])
            ->orderBy('property_id')
            ->get();

        // Get staying guests
        $stayingGuests = Booking::with(['property'])
            ->where('booking_status', 'checked_in')
            ->where('check_out', '!=', $todayDate)
            ->orderBy('property_id')
            ->get();

        // Get empty units
        $bookedPropertyIds = Booking::where(function ($query) use ($todayDate) {
            $query->where('check_in', '<=', $todayDate)
                ->where('check_out', '>', $todayDate)
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
                $name = $booking->primaryGuest?->guest_name ?? $booking->guest_name ?? '-';
                $phone = $booking->primaryGuest?->guest_phone ?? $booking->guest_phone ?? '-';
                $text .= ($index + 1).". {$booking->property?->name} {$nights} malam - {$name} - {$phone}\n";
            }
        }
        $text .= "\n";

        $text .= "🏡 UTARA\n";
        if ($checkInsUtara->isEmpty()) {
            $text .= "-\n";
        } else {
            foreach ($checkInsUtara->values() as $index => $booking) {
                $nights = Carbon::parse($booking->check_in)->diffInDays(Carbon::parse($booking->check_out));
                $name = $booking->primaryGuest?->guest_name ?? $booking->guest_name ?? '-';
                $phone = $booking->primaryGuest?->guest_phone ?? $booking->guest_phone ?? '-';
                $text .= ($index + 1).". {$booking->property?->name} {$nights} malam - {$name} - {$phone}\n";
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
}
