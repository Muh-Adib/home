<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Payment;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Display the dashboard
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Redirect guest users to their own dashboard
        if ($user->role === 'guest') {
            return $this->guestDashboard($user);
        }

        // Get date ranges for comparison
        $today = Carbon::today();
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();
        $thisYear = Carbon::now()->startOfYear();

        // Core KPIs
        $kpis = $this->getKPIs($user);

        // Recent activity
        $recentActivity = $this->getRecentActivity($user);

        // Today's agenda
        $todaysAgenda = $this->getTodaysAgenda($user);

        // Quick stats
        $quickStats = $this->getQuickStats($user);

        // Revenue chart data with breakdown
        $revenueChart = $this->getRevenueChartData($user);

        // Revenue breakdown by source
        $revenueBreakdown = $this->getRevenueBreakdown($user);

        // Booking trends
        $bookingTrends = $this->getBookingTrends($user);

        // Property performance
        $propertyPerformance = $this->getPropertyPerformance($user);

        return Inertia::render('Dashboard', [
            'kpis' => $kpis,
            'recentActivity' => $recentActivity,
            'todaysAgenda' => $todaysAgenda,
            'quickStats' => $quickStats,
            'revenueChart' => $revenueChart,
            'revenueBreakdown' => $revenueBreakdown,
            'bookingTrends' => $bookingTrends,
            'propertyPerformance' => $propertyPerformance,
        ]);
    }

    /**
     * Display the guest dashboard
     */
    public function guestDashboard(User $user): Response
    {
        // Get upcoming bookings with checkin instructions (only if payment paid + within checkin window)
        $upcomingBookings = Booking::where('guest_email', $user->email)
            ->whereIn('booking_status', ['confirmed', 'pending_verification'])
            ->where('check_in', '>=', today())
            ->with(['property'])
            ->orderBy('check_in')
            ->get()
            ->map(function ($booking) {
                $property = $booking->property;
                $checkInDate = \Carbon\Carbon::parse($booking->check_in);
                $canShowInstructions = false;

                // Show instructions only on check-in day or within check-in window (12:00 PM onwards)
                if ($checkInDate->isToday() && now()->gte($checkInDate->setTimeFromTimeString('12:00'))) {
                    $canShowInstructions = true;
                }

                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'property' => $property->only(['name', 'address']),
                    'check_in' => $booking->check_in,
                    'check_out' => $booking->check_out,
                    'guest_count' => $booking->guest_count,
                    'total_amount' => $booking->total_amount,
                    'can_show_instructions' => $canShowInstructions,
                    'checkin_instructions' => $canShowInstructions ? $booking->getCheckinInstructions() : null,
                    'checkin_instructions_formatted' => $canShowInstructions ? $booking->getFormattedCheckinInstructions() : null,
                    'booking_status' => $booking->booking_status,
                    'payment_status' => $booking->payment_status,
                ];
            });

        return Inertia::render('Guest/Dashboard', [
            'upcoming_bookings' => $upcomingBookings,
        ]);
    }

    private function getKPIs($user): array
    {
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();
        $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();

        // Filter by user role for base queries
        $dailyRevenueQuery = BookingDailyRevenue::query()
            ->whereHas('booking', function ($q) {
                $q->whereIn('booking_status', ['confirmed', 'checked_in', 'completed']);
            });

        $bookingQuery = Booking::query();
        $paymentQuery = Payment::query();

        if ($user->role === 'property_owner') {
            $dailyRevenueQuery->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
            $bookingQuery->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
            $paymentQuery->whereHas('booking.property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        // This month's data
        // Revenue: Based on Daily Rates (Accrual)
        $thisMonthRevenue = (clone $dailyRevenueQuery)
            ->whereBetween('tanggal', [$thisMonth, now()])
            ->sum('amount');

        $thisMonthBookings = (clone $bookingQuery)
            ->whereBetween('created_at', [$thisMonth, now()])
            ->count();

        $thisMonthOccupancy = $this->calculateOccupancyRate($user, $thisMonth, now());

        // Last month's data for comparison
        $lastMonthRevenue = (clone $dailyRevenueQuery)
            ->whereBetween('tanggal', [$lastMonth, $lastMonthEnd])
            ->sum('amount');

        $lastMonthBookings = (clone $bookingQuery)
            ->whereBetween('created_at', [$lastMonth, $lastMonthEnd])
            ->count();

        $lastMonthOccupancy = $this->calculateOccupancyRate($user, $lastMonth, $lastMonthEnd);

        // Calculate percentage changes
        $revenueChange = $lastMonthRevenue > 0
            ? (($thisMonthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100
            : 0;

        $bookingsChange = $lastMonthBookings > 0
            ? (($thisMonthBookings - $lastMonthBookings) / $lastMonthBookings) * 100
            : 0;

        $occupancyChange = $lastMonthOccupancy > 0
            ? (($thisMonthOccupancy - $lastMonthOccupancy) / $lastMonthOccupancy) * 100
            : 0;

        // Pending items count
        $pendingVerifications = (clone $bookingQuery)
            ->where('verification_status', 'pending')
            ->count();

        $pendingPayments = (clone $paymentQuery)
            ->where('payment_status', 'pending')
            ->count();

        return [
            'revenue' => [
                'value' => $thisMonthRevenue,
                'change' => round($revenueChange, 1),
                'trend' => $revenueChange >= 0 ? 'up' : 'down',
                'label' => 'Revenue (This Month)',
                'prefix' => 'Rp',
            ],
            'bookings' => [
                'value' => $thisMonthBookings,
                'change' => round($bookingsChange, 1),
                'trend' => $bookingsChange >= 0 ? 'up' : 'down',
                'label' => 'Bookings (This Month)',
            ],
            'occupancy' => [
                'value' => round($thisMonthOccupancy, 1),
                'change' => round($occupancyChange, 1),
                'trend' => $occupancyChange >= 0 ? 'up' : 'down',
                'label' => 'Occupancy Rate',
                'suffix' => '%',
            ],
            'pending_actions' => [
                'value' => $pendingVerifications + $pendingPayments,
                'verifications' => $pendingVerifications,
                'payments' => $pendingPayments,
                'label' => 'Pending Actions',
            ],
        ];
    }

    private function getRecentActivity($user): array
    {
        $activities = collect();

        // Recent bookings
        $bookingQuery = Booking::query();
        if ($user->role === 'property_owner') {
            $bookingQuery->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        $recentBookings = $bookingQuery->with(['property'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'type' => 'booking',
                    'title' => "New booking: {$booking->booking_number}",
                    'description' => "Guest: {$booking->guest_name} - Property: {$booking->property->name}",
                    'time' => $booking->created_at,
                    'status' => $booking->booking_status,
                    'icon' => 'Calendar',
                    'href' => "/admin/bookings/{$booking->booking_number}",
                ];
            });

        // Recent payments
        $paymentQuery = Payment::query();
        if ($user->role === 'property_owner') {
            $paymentQuery->whereHas('booking.property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        $recentPayments = $paymentQuery->with(['booking'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'type' => 'payment',
                    'title' => "Payment received: {$payment->payment_number}",
                    'description' => "Amount: Rp " . number_format($payment->amount) . " - Status: {$payment->payment_status}",
                    'time' => $payment->created_at,
                    'status' => $payment->payment_status,
                    'icon' => 'DollarSign',
                    'href' => "/admin/payments/{$payment->payment_number}",
                ];
            });

        return $recentBookings->concat($recentPayments)
            ->sortByDesc('time')
            ->take(10)
            ->values()
            ->toArray();
    }

    private function getTodaysAgenda($user): array
    {
        $today = Carbon::today();
        $agenda = [];

        // Today's check-ins
        $checkIns = Booking::whereDate('check_in', $today)
            ->when($user->role === 'property_owner', function ($q) use ($user) {
                $q->whereHas('property', function ($pq) use ($user) {
                    $pq->where('owner_id', $user->id);
                });
            })
            ->with(['property'])
            ->get()
            ->map(function ($booking) {
                return [
                    'type' => 'check_in',
                    'title' => "Check-in: {$booking->guest_name}",
                    'description' => "Property: {$booking->property->name}",
                    'time' => $booking->property->check_in_time ?? '14:00',
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'status' => $booking->booking_status,
                ];
            });

        // Today's check-outs
        $checkOuts = Booking::whereDate('check_out', $today)
            ->when($user->role === 'property_owner', function ($q) use ($user) {
                $q->whereHas('property', function ($pq) use ($user) {
                    $pq->where('owner_id', $user->id);
                });
            })
            ->with(['property'])
            ->get()
            ->map(function ($booking) {
                return [
                    'type' => 'check_out',
                    'title' => "Check-out: {$booking->guest_name}",
                    'description' => "Property: {$booking->property->name}",
                    'time' => $booking->property->check_out_time ?? '12:00',
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'status' => $booking->booking_status,
                ];
            });

        // Pending verifications
        $pendingVerifications = Booking::where('verification_status', 'pending')
            ->when($user->role === 'property_owner', function ($q) use ($user) {
                $q->whereHas('property', function ($pq) use ($user) {
                    $pq->where('owner_id', $user->id);
                });
            })
            ->with(['property'])
            ->limit(5)
            ->get()
            ->map(function ($booking) {
                return [
                    'type' => 'verification',
                    'title' => "Verify booking: {$booking->booking_number}",
                    'description' => "Guest: {$booking->guest_name} - Property: {$booking->property->name}",
                    'time' => null,
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'status' => 'pending',
                ];
            });

        return $checkIns->concat($checkOuts)
            ->concat($pendingVerifications)
            ->sortBy('time')
            ->values()
            ->toArray();
    }

    private function getQuickStats($user): array
    {
        $propertyQuery = Property::query();
        if ($user->role === 'property_owner') {
            $propertyQuery->where('owner_id', $user->id);
        }

        $totalProperties = $propertyQuery->count();
        $activeProperties = (clone $propertyQuery)->where('status', 'active')->count();

        // Current guests
        $currentGuests = Booking::where('booking_status', 'checked_in')
            ->when($user->role === 'property_owner', function ($q) use ($user) {
                $q->whereHas('property', function ($pq) use ($user) {
                    $pq->where('owner_id', $user->id);
                });
            })
            ->sum('guest_count');

        // Upcoming arrivals (next 7 days)
        $upcomingArrivals = Booking::whereBetween('check_in', [Carbon::today(), Carbon::today()->addDays(7)])
            ->where('booking_status', 'confirmed')
            ->when($user->role === 'property_owner', function ($q) use ($user) {
                $q->whereHas('property', function ($pq) use ($user) {
                    $pq->where('owner_id', $user->id);
                });
            })
            ->count();

        return [
            'total_properties' => $totalProperties,
            'active_properties' => $activeProperties,
            'current_guests' => $currentGuests,
            'upcoming_arrivals' => $upcomingArrivals,
        ];
    }

    private function getRevenueChartData($user): array
    {
        $months = [];
        $current = Carbon::now()->subMonths(11)->startOfMonth();

        for ($i = 0; $i < 12; $i++) {
            $monthStart = $current->copy()->startOfMonth();
            $monthEnd = $current->copy()->endOfMonth();

            $revenueQuery = BookingDailyRevenue::whereBetween('tanggal', [$monthStart, $monthEnd])
                ->whereHas('booking', function ($q) {
                    $q->whereIn('booking_status', ['confirmed', 'checked_in', 'completed']);
                });

            if ($user->role === 'property_owner') {
                $revenueQuery->whereHas('property', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }

            $revenue = $revenueQuery->sum('amount');

            $months[] = [
                'month' => $current->format('M Y'),
                'revenue' => $revenue,
                'month_short' => $current->format('M'),
            ];

            $current->addMonth();
        }

        return $months;
    }

    private function getBookingTrends($user): array
    {
        $days = [];
        $current = Carbon::now()->subDays(29);

        for ($i = 0; $i < 30; $i++) {
            $bookingQuery = Booking::whereDate('created_at', $current);

            if ($user->role === 'property_owner') {
                $bookingQuery->whereHas('property', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }

            $bookings = $bookingQuery->count();

            $days[] = [
                'date' => $current->format('Y-m-d'),
                'day' => $current->format('M j'),
                'bookings' => $bookings,
            ];

            $current->addDay();
        }

        return $days;
    }

    private function getPropertyPerformance($user): array
    {
        $thisMonth = Carbon::now()->startOfMonth();

        $propertyQuery = Property::query();
        if ($user->role === 'property_owner') {
            $propertyQuery->where('owner_id', $user->id);
        }

        // Get properties with their performance metrics using BookingDailyRevenue
        $properties = $propertyQuery->active()->limit(5)->get();

        return $properties->map(function ($property) use ($thisMonth) {
            // Get this month's revenue from daily breakdown
            $monthlyRevenue = BookingDailyRevenue::where('property_id', $property->id)
                ->whereBetween('tanggal', [$thisMonth, now()])
                ->whereHas('booking', function ($q) {
                    $q->whereIn('booking_status', ['confirmed', 'checked_in', 'completed']);
                })
                ->sum('amount');

            // Get booking count for this month
            $bookingCount = Booking::where('property_id', $property->id)
                ->whereIn('booking_status', ['confirmed', 'checked_in', 'completed'])
                ->whereBetween('created_at', [$thisMonth, now()])
                ->count();

            // Calculate occupancy rate
            $occupancyRate = $this->calculateOccupancyRate(
                auth()->user(),
                $thisMonth,
                now(),
                $property->id
            );

            return [
                'id' => $property->id,
                'name' => $property->name,
                'total_bookings' => $bookingCount,
                'total_revenue' => $monthlyRevenue,
                'occupancy_rate' => round($occupancyRate, 1),
            ];
        })
            ->sortByDesc('total_revenue')
            ->values()
            ->toArray();
    }

    private function calculateOccupancyRate($user, $startDate, $endDate, $propertyId = null): float
    {
        $propertyQuery = Property::query();

        if ($user->role === 'property_owner') {
            $propertyQuery->where('owner_id', $user->id);
        }

        if ($propertyId) {
            $propertyQuery->where('id', $propertyId);
        }

        $properties = $propertyQuery->get();

        if ($properties->isEmpty()) {
            return 0;
        }

        $totalDays = $startDate->diffInDays($endDate) * $properties->count();
        $bookedDays = 0;

        foreach ($properties as $property) {
            $propertyBookedDays = $property->bookings()
                ->where('booking_status', '!=', 'cancelled')
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('check_in', [$startDate, $endDate])
                        ->orWhereBetween('check_out', [$startDate, $endDate])
                        ->orWhere(function ($q2) use ($startDate, $endDate) {
                            $q2->where('check_in', '<=', $startDate)
                                ->where('check_out', '>=', $endDate);
                        });
                })
                ->get()
                ->sum(function ($booking) use ($startDate, $endDate) {
                    $checkIn = Carbon::parse($booking->check_in);
                    $checkOut = Carbon::parse($booking->check_out);

                    $actualStart = $checkIn->max($startDate);
                    $actualEnd = $checkOut->min($endDate);

                    return $actualStart->diffInDays($actualEnd);
                });

            $bookedDays += $propertyBookedDays;
        }

        return $totalDays > 0 ? ($bookedDays / $totalDays) * 100 : 0;
    }

    /**
     * Get revenue breakdown by source (base, weekend premium, seasonal premium)
     */
    private function getRevenueBreakdown($user): array
    {
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();
        $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();

        $ownerId = $user->role === 'property_owner' ? $user->id : null;

        // Get this month's breakdown
        $thisMonthBreakdown = BookingDailyRevenue::getRevenueBreakdown($thisMonth, now(), null, $ownerId);

        // Get last month's breakdown for comparison
        $lastMonthBreakdown = BookingDailyRevenue::getRevenueBreakdown($lastMonth, $lastMonthEnd, null, $ownerId);

        // Calculate percentages for pie chart
        $total = $thisMonthBreakdown['total'] ?: 1; // Avoid division by zero

        return [
            'current_month' => [
                'total' => $thisMonthBreakdown['total'],
                'base_amount' => $thisMonthBreakdown['base_amount'],
                'weekend_premium' => $thisMonthBreakdown['weekend_premium'],
                'seasonal_premium' => $thisMonthBreakdown['seasonal_premium'],
                'extra_bed_amount' => $thisMonthBreakdown['extra_bed_amount'],
                'days_count' => $thisMonthBreakdown['days_count'],
                'weekend_days' => $thisMonthBreakdown['weekend_days'],
                'seasonal_days' => $thisMonthBreakdown['seasonal_days'],
            ],
            'last_month' => [
                'total' => $lastMonthBreakdown['total'],
                'base_amount' => $lastMonthBreakdown['base_amount'],
                'weekend_premium' => $lastMonthBreakdown['weekend_premium'],
                'seasonal_premium' => $lastMonthBreakdown['seasonal_premium'],
            ],
            'percentages' => [
                'base' => round(($thisMonthBreakdown['base_amount'] / $total) * 100, 1),
                'weekend' => round(($thisMonthBreakdown['weekend_premium'] / $total) * 100, 1),
                'seasonal' => round(($thisMonthBreakdown['seasonal_premium'] / $total) * 100, 1),
                'extra_bed' => round(($thisMonthBreakdown['extra_bed_amount'] / $total) * 100, 1),
            ],
            'change' => $lastMonthBreakdown['total'] > 0
                ? round((($thisMonthBreakdown['total'] - $lastMonthBreakdown['total']) / $lastMonthBreakdown['total']) * 100, 1)
                : 0,
        ];
    }
}
