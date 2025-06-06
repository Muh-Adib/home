<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Property;
use App\Models\FinancialReport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Display reports dashboard
     */
    public function index(Request $request): Response
    {
        $period = $request->get('period', 'month'); // month, quarter, year
        $startDate = $this->getStartDate($period);
        $endDate = now();

        // Financial Overview
        $financialData = $this->getFinancialOverview($startDate, $endDate);
        
        // Booking Overview
        $bookingData = $this->getBookingOverview($startDate, $endDate);
        
        // Property Performance
        $propertyData = $this->getPropertyPerformance($startDate, $endDate);
        
        // Recent Activity
        $recentActivity = $this->getRecentActivity();

        return Inertia::render('Admin/Reports/Index', [
            'financialData' => $financialData,
            'bookingData' => $bookingData,
            'propertyData' => $propertyData,
            'recentActivity' => $recentActivity,
            'period' => $period,
        ]);
    }

    /**
     * Financial reports
     */
    public function financial(Request $request): Response
    {
        $period = $request->get('period', 'month');
        $propertyId = $request->get('property_id');
        
        $startDate = $this->getStartDate($period);
        $endDate = now();

        // Revenue analysis
        $revenueData = $this->getRevenueAnalysis($startDate, $endDate, $propertyId);
        
        // Payment analysis
        $paymentData = $this->getPaymentAnalysis($startDate, $endDate, $propertyId);
        
        // Monthly trends
        $trends = $this->getFinancialTrends($startDate, $endDate, $propertyId);

        $properties = Property::active()->get(['id', 'name']);

        return Inertia::render('Admin/Reports/Financial', [
            'revenueData' => $revenueData,
            'paymentData' => $paymentData,
            'trends' => $trends,
            'properties' => $properties,
            'filters' => [
                'period' => $period,
                'property_id' => $propertyId,
            ],
        ]);
    }

    /**
     * Occupancy reports
     */
    public function occupancy(Request $request): Response
    {
        $period = $request->get('period', 'month');
        $propertyId = $request->get('property_id');
        
        $startDate = $this->getStartDate($period);
        $endDate = now();

        // Occupancy rates
        $occupancyData = $this->getOccupancyRates($startDate, $endDate, $propertyId);
        
        // Booking patterns
        $bookingPatterns = $this->getBookingPatterns($startDate, $endDate, $propertyId);
        
        // Guest demographics
        $guestDemographics = $this->getGuestDemographics($startDate, $endDate, $propertyId);

        $properties = Property::active()->get(['id', 'name']);

        return Inertia::render('Admin/Reports/Occupancy', [
            'occupancyData' => $occupancyData,
            'bookingPatterns' => $bookingPatterns,
            'guestDemographics' => $guestDemographics,
            'properties' => $properties,
            'filters' => [
                'period' => $period,
                'property_id' => $propertyId,
            ],
        ]);
    }

    /**
     * Property performance reports
     */
    public function propertyPerformance(Request $request): Response
    {
        $period = $request->get('period', 'month');
        $startDate = $this->getStartDate($period);
        $endDate = now();

        $properties = Property::active()
            ->with(['bookings' => function ($q) use ($startDate, $endDate) {
                $q->where('booking_status', '!=', 'cancelled')
                  ->whereBetween('check_in', [$startDate, $endDate]);
            }])
            ->get()
            ->map(function ($property) use ($startDate, $endDate) {
                $bookings = $property->bookings;
                $totalDays = $startDate->diffInDays($endDate);
                $bookedDays = $bookings->sum(function ($booking) {
                    return Carbon::parse($booking->check_in)->diffInDays($booking->check_out);
                });

                return [
                    'id' => $property->id,
                    'name' => $property->name,
                    'total_bookings' => $bookings->count(),
                    'total_revenue' => $bookings->sum('total_amount'),
                    'occupancy_rate' => $totalDays > 0 ? round(($bookedDays / $totalDays) * 100, 2) : 0,
                    'adr' => $bookings->count() > 0 ? $bookings->avg('total_amount') : 0,
                    'revpar' => $totalDays > 0 ? ($bookings->sum('total_amount') / $totalDays) : 0,
                ];
            });

        return Inertia::render('Admin/Reports/PropertyPerformance', [
            'properties' => $properties,
            'period' => $period,
        ]);
    }

    /**
     * Export reports
     */
    public function export(Request $request)
    {
        $type = $request->get('type'); // financial, occupancy, property
        $format = $request->get('format', 'xlsx'); // xlsx, csv, pdf
        $period = $request->get('period', 'month');
        
        // Generate report based on type and export
        // Implementation would depend on export library (e.g., Laravel Excel)
        
        return response()->json(['message' => 'Export functionality to be implemented']);
    }

    // Private helper methods

    private function getStartDate($period): Carbon
    {
        return match($period) {
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            'quarter' => now()->startOfQuarter(),
            'year' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };
    }

    private function getFinancialOverview($startDate, $endDate): array
    {
        $totalRevenue = Payment::where('payment_status', 'verified')
            ->whereBetween('verified_at', [$startDate, $endDate])
            ->sum('amount');

        $pendingPayments = Payment::where('payment_status', 'pending')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('amount');

        $totalBookings = Booking::where('booking_status', '!=', 'cancelled')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        $averageBookingValue = $totalBookings > 0 ? $totalRevenue / $totalBookings : 0;

        return [
            'total_revenue' => $totalRevenue,
            'pending_payments' => $pendingPayments,
            'total_bookings' => $totalBookings,
            'average_booking_value' => $averageBookingValue,
        ];
    }

    private function getBookingOverview($startDate, $endDate): array
    {
        $bookings = Booking::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('booking_status, COUNT(*) as count')
            ->groupBy('booking_status')
            ->get()
            ->pluck('count', 'booking_status')
            ->toArray();

        $checkIns = Booking::whereDate('check_in', today())->count();
        $checkOuts = Booking::whereDate('check_out', today())->count();
        $currentGuests = Booking::where('booking_status', 'checked_in')->count();

        return [
            'status_breakdown' => $bookings,
            'todays_checkins' => $checkIns,
            'todays_checkouts' => $checkOuts,
            'current_guests' => $currentGuests,
        ];
    }

    private function getPropertyPerformance($startDate, $endDate): array
    {
        return Property::active()
            ->withCount([
                'bookings as total_bookings' => function ($q) use ($startDate, $endDate) {
                    $q->where('booking_status', '!=', 'cancelled')
                      ->whereBetween('check_in', [$startDate, $endDate]);
                }
            ])
            ->withSum([
                'bookings as total_revenue' => function ($q) use ($startDate, $endDate) {
                    $q->where('booking_status', '!=', 'cancelled')
                      ->whereBetween('check_in', [$startDate, $endDate]);
                }
            ], 'total_amount')
            ->orderByDesc('total_revenue')
            ->limit(10)
            ->get(['id', 'name', 'total_bookings', 'total_revenue'])
            ->toArray();
    }

    private function getRecentActivity(): array
    {
        $recentBookings = Booking::with(['property'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(function ($booking) {
                return [
                    'type' => 'booking',
                    'title' => "New booking: {$booking->booking_number}",
                    'description' => "Guest: {$booking->guest_name} - Property: {$booking->property->name}",
                    'time' => $booking->created_at,
                    'status' => $booking->booking_status,
                ];
            });

        $recentPayments = Payment::with(['booking'])
            ->where('payment_status', 'verified')
            ->latest('verified_at')
            ->limit(5)
            ->get()
            ->map(function ($payment) {
                return [
                    'type' => 'payment',
                    'title' => "Payment verified: {$payment->payment_number}",
                    'description' => "Amount: Rp " . number_format($payment->amount) . " - Booking: {$payment->booking->booking_number}",
                    'time' => $payment->verified_at,
                    'status' => 'verified',
                ];
            });

        return $recentBookings->concat($recentPayments)
            ->sortByDesc('time')
            ->take(10)
            ->values()
            ->toArray();
    }

    private function getRevenueAnalysis($startDate, $endDate, $propertyId = null): array
    {
        $query = Payment::where('payment_status', 'verified')
            ->whereBetween('verified_at', [$startDate, $endDate]);

        if ($propertyId) {
            $query->whereHas('booking', function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            });
        }

        return [
            'total_revenue' => $query->sum('amount'),
            'dp_revenue' => $query->where('payment_type', 'dp')->sum('amount'),
            'full_payment_revenue' => $query->where('payment_type', 'full_payment')->sum('amount'),
            'remaining_payment_revenue' => $query->where('payment_type', 'remaining_payment')->sum('amount'),
        ];
    }

    private function getPaymentAnalysis($startDate, $endDate, $propertyId = null): array
    {
        $query = Payment::whereBetween('created_at', [$startDate, $endDate]);

        if ($propertyId) {
            $query->whereHas('booking', function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            });
        }

        return [
            'pending' => $query->where('payment_status', 'pending')->count(),
            'verified' => $query->where('payment_status', 'verified')->count(),
            'failed' => $query->where('payment_status', 'failed')->count(),
            'refunded' => $query->where('payment_status', 'refunded')->count(),
        ];
    }

    private function getFinancialTrends($startDate, $endDate, $propertyId = null): array
    {
        // Monthly revenue trends for the period
        $months = [];
        $current = $startDate->copy()->startOfMonth();
        
        while ($current->lte($endDate)) {
            $monthStart = $current->copy()->startOfMonth();
            $monthEnd = $current->copy()->endOfMonth();
            
            $query = Payment::where('payment_status', 'verified')
                ->whereBetween('verified_at', [$monthStart, $monthEnd]);

            if ($propertyId) {
                $query->whereHas('booking', function ($q) use ($propertyId) {
                    $q->where('property_id', $propertyId);
                });
            }

            $months[] = [
                'month' => $current->format('Y-m'),
                'revenue' => $query->sum('amount'),
                'bookings' => Booking::whereBetween('created_at', [$monthStart, $monthEnd])
                    ->when($propertyId, function ($q) use ($propertyId) {
                        $q->where('property_id', $propertyId);
                    })
                    ->count(),
            ];

            $current->addMonth();
        }

        return $months;
    }

    private function getOccupancyRates($startDate, $endDate, $propertyId = null): array
    {
        $query = Property::query();
        
        if ($propertyId) {
            $query->where('id', $propertyId);
        }

        return $query->active()
            ->get()
            ->map(function ($property) use ($startDate, $endDate) {
                $totalDays = $startDate->diffInDays($endDate);
                $bookedDays = $property->bookings()
                    ->where('booking_status', '!=', 'cancelled')
                    ->whereBetween('check_in', [$startDate, $endDate])
                    ->get()
                    ->sum(function ($booking) {
                        return Carbon::parse($booking->check_in)->diffInDays($booking->check_out);
                    });

                return [
                    'property_name' => $property->name,
                    'occupancy_rate' => $totalDays > 0 ? round(($bookedDays / $totalDays) * 100, 2) : 0,
                    'booked_days' => $bookedDays,
                    'total_days' => $totalDays,
                ];
            })
            ->toArray();
    }

    private function getBookingPatterns($startDate, $endDate, $propertyId = null): array
    {
        $query = Booking::where('booking_status', '!=', 'cancelled')
            ->whereBetween('check_in', [$startDate, $endDate]);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        // Day of week patterns
        $dayPatterns = $query->get()
            ->groupBy(function ($booking) {
                return Carbon::parse($booking->check_in)->dayOfWeek;
            })
            ->map(function ($bookings, $day) {
                return [
                    'day' => Carbon::now()->dayOfWeek($day)->format('l'),
                    'count' => $bookings->count(),
                ];
            })
            ->values();

        // Lead time analysis
        $leadTimes = $query->get()
            ->map(function ($booking) {
                return Carbon::parse($booking->created_at)->diffInDays($booking->check_in);
            })
            ->groupBy(function ($days) {
                if ($days <= 7) return '0-7 days';
                if ($days <= 30) return '8-30 days';
                if ($days <= 60) return '31-60 days';
                return '60+ days';
            })
            ->map(function ($group) {
                return $group->count();
            });

        return [
            'day_patterns' => $dayPatterns,
            'lead_times' => $leadTimes,
        ];
    }

    private function getGuestDemographics($startDate, $endDate, $propertyId = null): array
    {
        $query = Booking::where('booking_status', '!=', 'cancelled')
            ->whereBetween('check_in', [$startDate, $endDate]);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $bookings = $query->get();

        // Guest count distribution
        $guestCounts = $bookings->groupBy('guest_count')
            ->map(function ($group) {
                return $group->count();
            })
            ->sortKeys();

        // Gender distribution
        $totalMale = $bookings->sum('guest_male');
        $totalFemale = $bookings->sum('guest_female');
        $totalChildren = $bookings->sum('guest_children');

        return [
            'guest_counts' => $guestCounts,
            'gender_distribution' => [
                'male' => $totalMale,
                'female' => $totalFemale,
                'children' => $totalChildren,
            ],
            'average_party_size' => $bookings->avg('guest_count'),
        ];
    }
} 