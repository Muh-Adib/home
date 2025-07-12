<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Carbon\Carbon;

class CleaningStaffController extends Controller
{
    public function index()
    {
        try {
            // Get properties that need cleaning (checkout today or yesterday)
            $propertiesToClean = Property::with(['bookings' => function ($query) {
                $query->where('booking_status', 'checked_out')
                      ->where('is_cleaned', false)
                      ->where('check_out', '>=', Carbon::now()->subDays(1)->format('Y-m-d'))
                      ->orderBy('check_out', 'desc');
            }])
            ->whereHas('bookings', function ($query) {
                $query->where('booking_status', 'checked_out')
                      ->where('is_cleaned', false)
                      ->where('check_out', '>=', Carbon::now()->subDays(1)->format('Y-m-d'));
            })
            ->get()
            ->map(function ($property) {
                $latestBooking = $property->bookings->first();
                return [
                    'id' => $property->id,
                    'name' => $property->name,
                    'address' => $property->address,
                    'maps_link' => $property->maps_link,
                    'latest_booking' => $latestBooking ? [
                        'id' => $latestBooking->id,
                        'booking_number' => $latestBooking->booking_number,
                        'check_out' => $latestBooking->check_out->format('Y-m-d'),
                        'guest_name' => $latestBooking->guest_name,
                        'is_cleaned' => $latestBooking->is_cleaned,
                        'keybox_code' => $latestBooking->keybox_code,
                    ] : null
                ];
            });

            // Get recently cleaned properties (last 7 days)
            $recentlyCleaned = Property::with(['bookings' => function ($query) {
                $query->where('is_cleaned', true)
                      ->where('cleaned_at', '>=', Carbon::now()->subDays(7))
                      ->orderBy('cleaned_at', 'desc');
            }])
            ->whereHas('bookings', function ($query) {
                $query->where('is_cleaned', true)
                      ->where('cleaned_at', '>=', Carbon::now()->subDays(7));
            })
            ->get()
            ->map(function ($property) {
                $latestCleanedBooking = $property->bookings->first();
                return [
                    'id' => $property->id,
                    'name' => $property->name,
                    'address' => $property->address,
                    'latest_booking' => $latestCleanedBooking ? [
                        'id' => $latestCleanedBooking->id,
                        'booking_number' => $latestCleanedBooking->booking_number,
                        'cleaned_at' => $latestCleanedBooking->cleaned_at->format('Y-m-d H:i'),
                        'keybox_code' => $latestCleanedBooking->keybox_code,
                        'cleaned_by' => $latestCleanedBooking->cleanedBy ? $latestCleanedBooking->cleanedBy->name : 'Unknown',
                    ] : null
                ];
            });

            return Inertia::render('Admin/CleaningStaff/Index', [
                'propertiesToClean' => $propertiesToClean,
                'recentlyCleaned' => $recentlyCleaned,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in CleaningStaffController@index: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Terjadi kesalahan saat memuat data cleaning staff.']);
        }
    }

    public function markAsCleaned(Request $request, $bookingId)
    {
        try {
            $request->validate([
                'keybox_code' => 'required|string|size:3|regex:/^\d{3}$/',
            ], [
                'keybox_code.required' => 'Kode keybox harus diisi',
                'keybox_code.size' => 'Kode keybox harus 3 digit',
                'keybox_code.regex' => 'Kode keybox hanya boleh berisi angka',
            ]);

            $booking = Booking::findOrFail($bookingId);
            
            // Check if booking is already cleaned
            if ($booking->is_cleaned) {
                return back()->withErrors(['error' => 'Booking ini sudah ditandai sebagai dibersihkan.']);
            }

            // Check if booking status is checked_out
            if ($booking->booking_status !== 'checked_out') {
                return back()->withErrors(['error' => 'Hanya booking yang sudah checkout yang dapat ditandai sebagai dibersihkan.']);
            }

            // Update booking
            $booking->update([
                'is_cleaned' => true,
                'cleaned_at' => now(),
                'cleaned_by' => Auth::id(),
                'keybox_code' => $request->keybox_code,
            ]);

            // Log the cleaning activity
            Log::info('Property cleaned', [
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'cleaned_by' => Auth::id(),
                'keybox_code' => $request->keybox_code,
            ]);

            return back()->with('success', 'Properti berhasil ditandai sebagai sudah dibersihkan!');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        } catch (\Exception $e) {
            Log::error('Error marking property as cleaned: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Terjadi kesalahan saat memproses permintaan.']);
        }
    }

    public function generateKeyboxCode($bookingId)
    {
        try {
            $booking = Booking::findOrFail($bookingId);
            
            // Generate random 3-digit code
            $keyboxCode = str_pad(rand(100, 999), 3, '0', STR_PAD_LEFT);
            
            return response()->json([
                'keybox_code' => $keyboxCode,
                'message' => 'Kode keybox berhasil di-generate'
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating keybox code: ' . $e->getMessage());
            return response()->json([
                'error' => 'Terjadi kesalahan saat generate kode keybox'
            ], 500);
        }
    }

    public function getCleaningStats()
    {
        try {
            $today = Carbon::today();
            $yesterday = Carbon::yesterday();

            $stats = [
                'properties_to_clean' => Property::whereHas('bookings', function ($query) use ($today, $yesterday) {
                    $query->where('booking_status', 'checked_out')
                          ->where('is_cleaned', false)
                          ->whereIn('check_out', [$today->format('Y-m-d'), $yesterday->format('Y-m-d')]);
                })->count(),
                
                'cleaned_today' => Property::whereHas('bookings', function ($query) use ($today) {
                    $query->where('is_cleaned', true)
                          ->whereDate('cleaned_at', $today);
                })->count(),
                
                'cleaned_this_week' => Property::whereHas('bookings', function ($query) {
                    $query->where('is_cleaned', true)
                          ->where('cleaned_at', '>=', Carbon::now()->startOfWeek());
                })->count(),
                
                'overdue_cleanings' => Property::whereHas('bookings', function ($query) {
                    $query->where('booking_status', 'checked_out')
                          ->where('is_cleaned', false)
                          ->where('check_out', '<', Carbon::now()->subDays(1)->format('Y-m-d'));
                })->count(),
            ];

            return response()->json($stats);

        } catch (\Exception $e) {
            Log::error('Error getting cleaning stats: ' . $e->getMessage());
            return response()->json(['error' => 'Terjadi kesalahan saat mengambil statistik'], 500);
        }
    }
}
