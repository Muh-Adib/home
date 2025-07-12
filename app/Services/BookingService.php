<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Property;
use App\Models\BookingWorkflow;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Events\BookingCreated;

class BookingService
{
    /**
     * Buat booking baru dengan seluruh proses bisnis.
     * 
     * Method ini akan:
     * - Membuat booking dengan data yang tervalidasi
     * - Menghitung rate dan biaya berdasarkan property dan tanggal
     * - Membuat atau mengaitkan user/guest otomatis
     * - Menambahkan workflow tracking
     * - Dispatch event untuk notifikasi
     * 
     * @param Property $property Property yang akan dipesan
     * @param array $data Data booking yang sudah tervalidasi
     * @param object|null $user User yang membuat booking (null untuk guest)
     * @return Booking
     *
     * @throws \Exception
     */
    public function createBooking(Property $property, array $data, $user = null): Booking
    {
        // Log booking creation attempt
        \Illuminate\Support\Facades\Log::info('BookingService::createBooking started', [
            'property_id' => $property->id,
            'check_in_date' => $data['check_in_date'],
            'check_out_date' => $data['check_out_date'],
            'user_id' => $user ? $user->id : null
        ]);

        // Validate and parse dates
        try {
            $checkIn  = Carbon::parse($data['check_in_date']);
            $checkOut = Carbon::parse($data['check_out_date']);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Invalid date format in createBooking', [
                'check_in_date' => $data['check_in_date'],
                'check_out_date' => $data['check_out_date'],
                'error' => $e->getMessage()
            ]);
            throw new \Exception('Invalid date format provided. Please use valid dates.');
        }

        // Hitung total tamu
        $totalGuests = $data['guest_count_male'] + $data['guest_count_female'] + $data['guest_count_children'];

        // Validasi kapasitas
        if ($totalGuests > $property->capacity_max) {
            throw new \Exception("Guest count ({$totalGuests}) exceeds property maximum capacity ({$property->capacity_max}).");
        }

        if ($totalGuests < 1) {
            throw new \Exception("At least one guest is required.");
        }

        // Validasi minimum stay
        $nights   = $checkIn->diffInDays($checkOut);
        $isWeekend = $checkIn->isWeekend() || $checkOut->isWeekend();
        $minStay  = $isWeekend ? $property->min_stay_weekend : $property->min_stay_weekday;
        if ($nights < $minStay) {
            throw new \Exception("Minimum stay requirement is {$minStay} nights for these dates.");
        }

        // Hitung tarif
        try {
            $rateCalculation = $property->calculateRate(
                $data['check_in_date'],
                $data['check_out_date'],
                $totalGuests
            );
            \Illuminate\Support\Facades\Log::info('Rate calculation successful', [
                'property_id' => $property->id,
                'total_amount' => $rateCalculation['total_amount']
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Rate calculation failed in createBooking', [
                'property_id' => $property->id,
                'error' => $e->getMessage()
            ]);
            throw new \Exception('Failed to calculate rate: ' . $e->getMessage());
        }

        // Simpan booking di dalam transaksi
        return DB::transaction(function () use ($property, $data, $totalGuests, $nights, $rateCalculation, $user) {
            // Generate nomor booking unik
            $bookingNumber = 'BK' . date('Ymd') . str_pad(Booking::count() + 1, 4, '0', STR_PAD_LEFT);

            /** @var Booking $booking */
            $booking = $property->bookings()->create([
                'booking_number'     => $bookingNumber,
                'guest_name'         => $data['guest_name'],
                'guest_email'        => $data['guest_email'],
                'guest_phone'        => $data['guest_phone'],
                'guest_country'      => $data['guest_country'],
                'guest_id_number'    => $data['guest_id_number'] ?? null,
                'guest_gender'       => $data['guest_gender'],
                'guest_count'        => $totalGuests,
                'guest_male'         => $data['guest_count_male'],
                'guest_female'       => $data['guest_count_female'],
                'guest_children'     => $data['guest_count_children'],
                'relationship_type'  => $data['relationship_type'],
                'check_in'           => $data['check_in_date'],
                'check_in_time'      => $data['check_in_time'],
                'check_out'          => $data['check_out_date'],
                'nights'             => $nights,
                'base_amount'        => $rateCalculation['base_amount'],
                'extra_bed_amount'   => $rateCalculation['extra_bed_amount'],
                'service_amount'     => 0,
                'tax_amount'         => $rateCalculation['tax_amount'],
                'total_amount'       => $rateCalculation['total_amount'],
                'dp_percentage'      => $data['dp_percentage'],
                'dp_amount'          => $rateCalculation['total_amount'] * $data['dp_percentage'] / 100,
                'remaining_amount'   => $rateCalculation['total_amount'] * (100 - $data['dp_percentage']) / 100,
                'booking_status'     => 'pending_verification',
                'payment_status'     => 'dp_pending',
                'verification_status'=> 'pending',
                'special_requests'   => $data['special_requests'] ?? null,
            ]);

            // Tambahkan detail tamu tambahan
            if (!empty($data['guests']) && is_array($data['guests'])) {
                foreach ($data['guests'] as $index => $guestDetail) {
                    if (!empty($guestDetail['name'])) {
                        $booking->guests()->create([
                            'full_name'              => $guestDetail['name'],
                            'gender'                 => $guestDetail['gender'],
                            'age_category'           => $guestDetail['age_category'],
                            'relationship_to_primary'=> $guestDetail['relationship_to_primary'],
                            'phone'                  => $guestDetail['phone'] ?? null,
                            'email'                  => $guestDetail['email'] ?? null,
                            'notes'                  => $guestDetail['notes'] ?? null,
                            'guest_type'             => $index === 0 ? 'primary' : 'additional',
                        ]);
                    }
                }
            }

            //jika booking dibuat oleh admin, maka status booking akan diubah menjadi confirmed
            if ($user && isset($user->role) && ($user->role === 'superadmin' || $user->role === 'admin')) {
                $booking->booking_status = 'confirmed';
                $booking->save();
                $booking->workflow()->create([
                    'step'         => 'approved',
                    'status'       => 'in_progress',
                    'processed_at' => now(),
                    'notes'        => 'Booking dibuat oleh admin',
                ]);
            }

            // Workflow awal
            $booking->workflow()->create([
                'step'         => 'submitted',
                'status'       => 'pending',
                'processed_at' => now(),
                'notes'        => 'Booking dibuat melalui service layer',
            ]);

            // Dispatch event
            if ($user && $user instanceof \App\Models\User) {
                event(new BookingCreated($booking->load('property'), $user));
            } else {
                // For guest bookings, create a dummy User object for notifications
                $guestUser = new \App\Models\User();
                $guestUser->id = 0;
                $guestUser->name = 'Guest';
                $guestUser->email = $booking->guest_email;
                $guestUser->role = 'guest';
                
                event(new BookingCreated($booking->load('property'), $guestUser));
            }

            return $booking;
        });
    }

    /**
     * Calculate rate for booking
     * 
     * @param Property $property
     * @param \Carbon\Carbon $checkIn
     * @param \Carbon\Carbon $checkOut
     * @param int $guestCount
     * @return array
     */
    public function calculateRate(Property $property, $checkIn, $checkOut, int $guestCount): array
    {
        $nights = $checkIn->diffInDays($checkOut);
        
        // Base calculation using property's calculateRate method
        return $property->calculateRate(
            $checkIn->format('Y-m-d'),
            $checkOut->format('Y-m-d'),
            $guestCount
        );
    }

    /**
     * Create or get user for guest booking
     * 
     * @param array $guestData
     * @return \App\Models\User|null
     */
    protected function createOrGetGuest(array $guestData): ?\App\Models\User
    {
        // For manual booking, we don't create user accounts
        // Guest data is stored directly in booking table
        return null;
    }

    /**
     * Validate booking dates
     * 
     * @param Property $property
     * @param string $checkIn
     * @param string $checkOut
     * @return bool
     */
    public function validateBookingDates(Property $property, string $checkIn, string $checkOut): bool
    {
        return $property->isAvailableForDates($checkIn, $checkOut);
    }
} 