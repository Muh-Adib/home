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
     * proses ini akan membuat booking, menambahkan detail tamu, menambahkan workflow, dan dispatch event.
     * admin dapat membuat booking dari halaman admin.
     * admin tidak dapat membuat booking dari halaman website.
     * guest dapat membuat booking dari halaman website.
     * guest tidak dapat membuat booking dari halaman admin.
     *
     * jika guest membuat booking dari halaman website, maka booking akan dibuat dengan status pending_verification.
     * jika admin membuat booking dari halaman admin, maka booking akan dibuat dengan status verified.
     * jika admin memverifikasi booking, maka booking akan dibuat dengan status pending_payment.
     * jika admin membatalkan booking, maka booking akan dibuat dengan status cancelled.
     * jika admin mengubah status booking, maka booking akan dibuat dengan status pending_verification.
     * jika admin mengubah status booking, maka booking akan dibuat dengan status pending_payment.
     * jika admin mengubah status booking, maka booking akan dibuat dengan status paid.
     * 
     * @param Property $property
     * @param array $data Validated request data
     * @param object|null $user User yang membuat (boleh null untuk guest)
     * @return Booking
     *
     * @throws \Exception
     */
    public function createBooking(Property $property, array $data, $user = null): Booking
    {
        // Cek ketersediaan properti
        if (!$property->isAvailableForDates($data['check_in_date'], $data['check_out_date'])) {
            throw new \Exception('Property is not available for selected dates.');
        }

        // Hitung total tamu
        $totalGuests = $data['guest_count_male'] + $data['guest_count_female'] + $data['guest_count_children'];

        // Validasi minimum stay
        $checkIn  = Carbon::parse($data['check_in_date']);
        $checkOut = Carbon::parse($data['check_out_date']);
        $nights   = $checkIn->diffInDays($checkOut);
        $isWeekend = $checkIn->isWeekend() || $checkOut->isWeekend();
        $minStay  = $isWeekend ? $property->min_stay_weekend : $property->min_stay_weekday;
        if ($nights < $minStay) {
            throw new \Exception("Minimum stay requirement is {$minStay} nights for these dates.");
        }

        // Hitung tarif
        $rateCalculation = $property->calculateRate(
            $data['check_in_date'],
            $data['check_out_date'],
            $totalGuests
        );

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

            //jika booking dibuat oleh admin, maka status booking akan diubah menjadi verified
            if ($user->role === 'superadmin' || $user->role === 'admin') {
                $booking->booking_status = 'verified';
                $booking->save();
                $booking->workflow()->create([
                    'step'         => 'verified',
                    'status'       => 'completed',
                    'processed_at' => now(),
                    'notes'        => 'Booking dibuat oleh admin',
                ]);
            }

            // Workflow awal
            $booking->workflow()->create([
                'step'         => 'submitted',
                'status'       => 'completed',
                'processed_at' => now(),
                'notes'        => 'Booking dibuat melalui service layer',
            ]);

            // Dispatch event
            event(new BookingCreated($booking->load('property'), $user ?? (object)['id'=>0, 'name'=>'Guest']));

            return $booking;
        });
    }
} 