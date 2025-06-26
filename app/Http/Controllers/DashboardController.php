<?php

namespace App\Http\Controllers;

use App\Models\Booking;
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
        
        // Revenue chart data
        $revenueChart = $this->getRevenueChartData($user);
        
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
            'bookingTrends' => $bookingTrends,
            'propertyPerformance' => $propertyPerformance,
        ]);
    }

    /**
     * Display the guest dashboard
     */
    public function guestDashboard(User $user): Response
    {
        // Get upcoming bookings
        $upcomingBookings = Booking::where('guest_email', $user->email)
            ->where('booking_status', '!=', 'cancelled')
            ->where('check_in', '>=', now())
            ->with(['property'])
            ->orderBy('check_in')
            ->get();

        // Get past bookings
        $pastBookings = Booking::where('guest_email', $user->email)
            ->where('check_out', '<', now())
            ->with(['property'])
            ->orderBy('check_out', 'desc')
            ->limit(10)
            ->get();

        // Get recent payments
        $recentPayments = Payment::whereHas('booking', function ($query) use ($user) {
                $query->where('guest_email', $user->email);
            })
            ->with(['booking.property'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'payment_number' => $payment->payment_number,
                    'amount' => $payment->amount,
                    'payment_status' => $payment->payment_status,
                    'payment_date' => $payment->created_at->toDateString(),
                    'booking' => [
                        'booking_number' => $payment->booking->booking_number,
                        'property' => [
                            'name' => $payment->booking->property->name,
                        ],
                    ],
                ];
            });

        // Calculate stats
        $totalBookings = Booking::where('guest_email', $user->email)->count();
        $upcomingBookingsCount = $upcomingBookings->count();
        $completedBookings = Booking::where('guest_email', $user->email)
            ->where('booking_status', 'completed')
            ->count();
        $totalSpent = Payment::whereHas('booking', function ($query) use ($user) {
                $query->where('guest_email', $user->email);
            })
            ->where('payment_status', 'verified')
            ->sum('amount');

        $stats = [
            'total_bookings' => $totalBookings,
            'upcoming_bookings' => $upcomingBookingsCount,
            'completed_bookings' => $completedBookings,
            'total_spent' => $totalSpent,
        ];

        return Inertia::render('Guest/Dashboard', [
            'upcoming_bookings' => $upcomingBookings,
            'past_bookings' => $pastBookings,
            'recent_payments' => $recentPayments,
            'stats' => $stats,
        ]);
    }

    private function getKPIs($user): array
    {
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();
        $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();

        // Filter by user role
        $bookingQuery = Booking::query();
        $paymentQuery = Payment::query();
        
        if ($user->role === 'property_owner') {
            $bookingQuery->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
            $paymentQuery->whereHas('booking.property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        // This month's data
        $thisMonthRevenue = (clone $paymentQuery)
            ->where('payment_status', 'verified')
            ->whereBetween('verified_at', [$thisMonth, now()])
            ->sum('amount');

        $thisMonthBookings = (clone $bookingQuery)
            ->whereBetween('created_at', [$thisMonth, now()])
            ->count();

        $thisMonthOccupancy = $this->calculateOccupancyRate($user, $thisMonth, now());

        // Last month's data for comparison
        $lastMonthRevenue = (clone $paymentQuery)
            ->where('payment_status', 'verified')
            ->whereBetween('verified_at', [$lastMonth, $lastMonthEnd])
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
                    'href' => "/admin/bookings/{$booking->id}",
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
                    'href' => "/admin/payments/{$payment->id}",
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

            $paymentQuery = Payment::where('payment_status', 'verified')
                ->whereBetween('verified_at', [$monthStart, $monthEnd]);

            if ($user->role === 'property_owner') {
                $paymentQuery->whereHas('booking.property', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }

            $revenue = $paymentQuery->sum('amount');

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
        $propertyQuery = Property::query();
        if ($user->role === 'property_owner') {
            $propertyQuery->where('owner_id', $user->id);
        }

        return $propertyQuery->active()
            ->withCount(['bookings as total_bookings'])
            ->withSum(['bookings as total_revenue'], 'total_amount')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get()
            ->map(function ($property) {
                $occupancyRate = $this->calculateOccupancyRate(
                    auth()->user(), 
                    Carbon::now()->startOfMonth(), 
                    now(),
                    $property->id
                );

                return [
                    'id' => $property->id,
                    'name' => $property->name,
                    'total_bookings' => $property->total_bookings ?? 0,
                    'total_revenue' => $property->total_revenue ?? 0,
                    'occupancy_rate' => round($occupancyRate, 1),
                ];
            })
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
} 