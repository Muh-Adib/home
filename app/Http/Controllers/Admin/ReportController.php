<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Property;
use App\Models\FinancialReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Display reports dashboard
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $period = $request->get('period', 'month');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        $propertyId = $request->get('property_id') === 'all' ? null : $request->get('property_id');
        
        // Set date range
        $startDate = $dateFrom ? Carbon::parse($dateFrom) : $this->getStartDate($period);
        $endDate = $dateTo ? Carbon::parse($dateTo) : now();
        
        // Get previous period for comparison
        $diffDays = $startDate->diffInDays($endDate);
        $prevStartDate = $startDate->copy()->subDays($diffDays);
        $prevEndDate = $startDate->copy()->subDay();

        // Financial Overview
        $financialData = $this->getFinancialOverview($startDate, $endDate, $user, $propertyId);
        $prevFinancialData = $this->getFinancialOverview($prevStartDate, $prevEndDate, $user, $propertyId);
        
        // Booking Overview
        $bookingData = $this->getBookingOverview($startDate, $endDate, $user, $propertyId);
        $prevBookingData = $this->getBookingOverview($prevStartDate, $prevEndDate, $user, $propertyId);
        
        // Property Performance
        $propertyData = $this->getPropertyPerformance($startDate, $endDate, $user, $propertyId);
        
        // Revenue trends
        $revenueByMonth = $this->getRevenueByMonth($startDate, $endDate, $user, $propertyId);
        
        // Payment methods analysis
        $paymentMethods = $this->getPaymentMethodsAnalysis($startDate, $endDate, $user, $propertyId);

        // Calculate growth percentages
        $revenueGrowth = $prevFinancialData['total_revenue'] > 0 
            ? round((($financialData['total_revenue'] - $prevFinancialData['total_revenue']) / $prevFinancialData['total_revenue']) * 100, 1)
            : 0;
            
        $bookingsGrowth = $prevBookingData['total_bookings'] > 0 
            ? round((($bookingData['total_bookings'] - $prevBookingData['total_bookings']) / $prevBookingData['total_bookings']) * 100, 1)
            : 0;

        $occupancyRate = $this->calculateOccupancyRate($startDate, $endDate, $user, $propertyId);
        $prevOccupancyRate = $this->calculateOccupancyRate($prevStartDate, $prevEndDate, $user, $propertyId);
        $occupancyGrowth = $prevOccupancyRate > 0 
            ? round((($occupancyRate - $prevOccupancyRate) / $prevOccupancyRate) * 100, 1)
            : 0;

        // Properties for filter
        $properties = $user->role === 'property_owner' 
            ? Property::where('owner_id', $user->id)->active()->get(['id', 'name'])
            : Property::active()->get(['id', 'name']);

        return Inertia::render('Admin/Reports/Index', [
            'data' => [
                'overview' => [
                    'totalRevenue' => $financialData['total_revenue'],
                    'totalBookings' => $bookingData['total_bookings'],
                    'averageBookingValue' => $financialData['average_booking_value'],
                    'occupancyRate' => round($occupancyRate, 1),
                    'revenueGrowth' => $revenueGrowth,
                    'bookingsGrowth' => $bookingsGrowth,
                    'occupancyGrowth' => $occupancyGrowth,
                ],
                'revenueByMonth' => $revenueByMonth,
                'topProperties' => $propertyData,
                'bookingsByStatus' => $this->formatBookingsByStatus($bookingData['status_breakdown']),
                'paymentMethods' => $paymentMethods,
                'guestCountries' => $this->getGuestCountriesAnalysis($startDate, $endDate, $user, $propertyId),
            ],
            'properties' => $properties,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'property_id' => $propertyId,
                'report_type' => $request->get('report_type', 'revenue'),
                'period' => $period,
            ],
        ]);
    }

    /**
     * Financial reports
     */
    public function financial(Request $request): Response
    {
        $user = $request->user();
        $period = $request->get('period', 'month');
        $propertyId = $request->get('property_id');
        
        $startDate = $this->getStartDate($period);
        $endDate = now();

        // Revenue analysis
        $revenueData = $this->getRevenueAnalysis($startDate, $endDate, $user, $propertyId);
        
        // Payment analysis
        $paymentData = $this->getPaymentAnalysis($startDate, $endDate, $user, $propertyId);
        
        // Monthly trends
        $trends = $this->getFinancialTrends($startDate, $endDate, $user, $propertyId);

        $properties = $user->role === 'property_owner' 
            ? Property::where('owner_id', $user->id)->active()->get(['id', 'name'])
            : Property::active()->get(['id', 'name']);

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
        $user = $request->user();
        $period = $request->get('period', 'month');
        $propertyId = $request->get('property_id');
        
        $startDate = $this->getStartDate($period);
        $endDate = now();

        // Occupancy rates
        $occupancyData = $this->getOccupancyRates($startDate, $endDate, $user, $propertyId);
        
        // Booking patterns
        $bookingPatterns = $this->getBookingPatterns($startDate, $endDate, $user, $propertyId);
        
        // Guest demographics
        $guestDemographics = $this->getGuestDemographics($startDate, $endDate, $user, $propertyId);

        $properties = $user->role === 'property_owner' 
            ? Property::where('owner_id', $user->id)->active()->get(['id', 'name'])
            : Property::active()->get(['id', 'name']);

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
     * Export report data
     */
    public function export(Request $request)
    {
        // Implementation for exporting reports
        // Can be CSV, PDF, Excel format
        return response()->json(['message' => 'Export functionality coming soon']);
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

    private function getFinancialOverview($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $paymentQuery = Payment::where('payment_status', 'verified')
            ->whereBetween('verified_at', [$startDate, $endDate]);

        $bookingQuery = Booking::where('booking_status', '!=', 'cancelled')
            ->whereBetween('created_at', [$startDate, $endDate]);

        // Apply user role filtering
        if ($user && $user->role === 'property_owner') {
            $paymentQuery->whereHas('booking.property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
            $bookingQuery->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        // Apply property filter
        if ($propertyId) {
            $paymentQuery->whereHas('booking', function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            });
            $bookingQuery->where('property_id', $propertyId);
        }

        $totalRevenue = $paymentQuery->sum('amount');
        $totalBookings = $bookingQuery->count();
        $averageBookingValue = $totalBookings > 0 ? $totalRevenue / $totalBookings : 0;

        $pendingPayments = Payment::where('payment_status', 'pending')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->when($user && $user->role === 'property_owner', function ($q) use ($user) {
                $q->whereHas('booking.property', function ($pq) use ($user) {
                    $pq->where('owner_id', $user->id);
                });
            })
            ->when($propertyId, function ($q) use ($propertyId) {
                $q->whereHas('booking', function ($bq) use ($propertyId) {
                    $bq->where('property_id', $propertyId);
                });
            })
            ->sum('amount');

        return [
            'total_revenue' => $totalRevenue,
            'pending_payments' => $pendingPayments,
            'total_bookings' => $totalBookings,
            'average_booking_value' => $averageBookingValue,
        ];
    }

    private function getBookingOverview($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $bookingQuery = Booking::whereBetween('created_at', [$startDate, $endDate]);

        if ($user && $user->role === 'property_owner') {
            $bookingQuery->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        if ($propertyId) {
            $bookingQuery->where('property_id', $propertyId);
        }

        $bookings = $bookingQuery->selectRaw('booking_status, COUNT(*) as count')
            ->groupBy('booking_status')
            ->get()
            ->pluck('count', 'booking_status')
            ->toArray();

        $totalBookings = array_sum($bookings);
        
        $checkIns = Booking::whereDate('check_in', today())
            ->when($user && $user->role === 'property_owner', function ($q) use ($user) {
                $q->whereHas('property', function ($pq) use ($user) {
                    $pq->where('owner_id', $user->id);
                });
            })
            ->when($propertyId, function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            })
            ->count();
            
        $checkOuts = Booking::whereDate('check_out', today())
            ->when($user && $user->role === 'property_owner', function ($q) use ($user) {
                $q->whereHas('property', function ($pq) use ($user) {
                    $pq->where('owner_id', $user->id);
                });
            })
            ->when($propertyId, function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            })
            ->count();
            
        $currentGuests = Booking::where('booking_status', 'checked_in')
            ->when($user && $user->role === 'property_owner', function ($q) use ($user) {
                $q->whereHas('property', function ($pq) use ($user) {
                    $pq->where('owner_id', $user->id);
                });
            })
            ->when($propertyId, function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            })
            ->count();

        return [
            'status_breakdown' => $bookings,
            'total_bookings' => $totalBookings,
            'todays_checkins' => $checkIns,
            'todays_checkouts' => $checkOuts,
            'current_guests' => $currentGuests,
        ];
    }

    private function getPropertyPerformance($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $query = Property::active();

        if ($user && $user->role === 'property_owner') {
            $query->where('owner_id', $user->id);
        }

        if ($propertyId) {
            $query->where('id', $propertyId);
        }

        return $query->withCount([
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
            ->get()
            ->map(function ($property) use ($startDate, $endDate) {
                $occupancyRate = $this->calculatePropertyOccupancyRate($property->id, $startDate, $endDate);
                return [
                    'id' => $property->id,
                    'name' => $property->name,
                    'revenue' => $property->total_revenue ?? 0,
                    'bookings' => $property->total_bookings ?? 0,
                    'occupancyRate' => round($occupancyRate, 1),
                ];
            })
            ->toArray();
    }

    private function getRevenueByMonth($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $months = [];
        $current = $startDate->copy()->startOfMonth();
        
        while ($current->lte($endDate)) {
            $monthStart = $current->copy()->startOfMonth();
            $monthEnd = $current->copy()->endOfMonth();
            
            $paymentQuery = Payment::where('payment_status', 'verified')
                ->whereBetween('verified_at', [$monthStart, $monthEnd]);

            $bookingQuery = Booking::whereBetween('created_at', [$monthStart, $monthEnd]);

            if ($user && $user->role === 'property_owner') {
                $paymentQuery->whereHas('booking.property', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
                $bookingQuery->whereHas('property', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }

            if ($propertyId) {
                $paymentQuery->whereHas('booking', function ($q) use ($propertyId) {
                    $q->where('property_id', $propertyId);
                });
                $bookingQuery->where('property_id', $propertyId);
            }

            $months[] = [
                'month' => $current->format('M Y'),
                'revenue' => $paymentQuery->sum('amount'),
                'bookings' => $bookingQuery->count(),
            ];

            $current->addMonth();
        }

        return $months;
    }

    private function getPaymentMethodsAnalysis($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $query = Payment::where('payment_status', 'verified')
            ->whereBetween('verified_at', [$startDate, $endDate]);

        if ($user && $user->role === 'property_owner') {
            $query->whereHas('booking.property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        if ($propertyId) {
            $query->whereHas('booking', function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            });
        }

        // Use payment_method_id to join with payment_methods table
        $payments = $query->leftJoin('payment_methods', 'payments.payment_method_id', '=', 'payment_methods.id')
            ->selectRaw('
                COALESCE(payment_methods.name, UPPER(REPLACE(payments.payment_method, "_", " "))) as method,
                COUNT(*) as count, 
                SUM(payments.amount) as amount
            ')
            ->groupBy('payment_methods.name', 'payments.payment_method')
            ->get();

        $totalAmount = $payments->sum('amount');
        
        return $payments->map(function ($payment) use ($totalAmount) {
            return [
                'method' => $payment->method,
                'count' => $payment->count,
                'amount' => $payment->amount,
                'percentage' => $totalAmount > 0 ? round(($payment->amount / $totalAmount) * 100, 1) : 0,
            ];
        })->toArray();
    }

    private function getGuestCountriesAnalysis($startDate, $endDate, $user = null, $propertyId = null): array
    {
        // Placeholder - implement based on guest data structure
        return [
            ['country' => 'Indonesia', 'count' => 45, 'percentage' => 65.2],
            ['country' => 'Malaysia', 'count' => 12, 'percentage' => 17.4],
            ['country' => 'Singapore', 'count' => 8, 'percentage' => 11.6],
            ['country' => 'Others', 'count' => 4, 'percentage' => 5.8],
        ];
    }

    private function formatBookingsByStatus($statusBreakdown): array
    {
        $total = array_sum($statusBreakdown);
        
        return collect($statusBreakdown)->map(function ($count, $status) use ($total) {
            return [
                'status' => $status,
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
            ];
        })->values()->toArray();
    }

    private function calculateOccupancyRate($startDate, $endDate, $user = null, $propertyId = null): float
    {
        $propertyQuery = Property::active();
        
        if ($user && $user->role === 'property_owner') {
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

    private function calculatePropertyOccupancyRate($propertyId, $startDate, $endDate): float
    {
        $totalDays = $startDate->diffInDays($endDate);
        
        $bookedDays = Booking::where('property_id', $propertyId)
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
                
                return max(0, $actualStart->diffInDays($actualEnd));
            });

        return $totalDays > 0 ? ($bookedDays / $totalDays) * 100 : 0;
    }

    // Keep existing methods for backward compatibility
    private function getRevenueAnalysis($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $query = Payment::where('payment_status', 'verified')
            ->whereBetween('verified_at', [$startDate, $endDate]);

        if ($user && $user->role === 'property_owner') {
            $query->whereHas('booking.property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        if ($propertyId) {
            $query->whereHas('booking', function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            });
        }

        return [
            'total_revenue' => $query->sum('amount'),
            'dp_revenue' => (clone $query)->where('payment_type', 'dp')->sum('amount'),
            'full_payment_revenue' => (clone $query)->where('payment_type', 'full_payment')->sum('amount'),
            'remaining_payment_revenue' => (clone $query)->where('payment_type', 'remaining_payment')->sum('amount'),
        ];
    }

    private function getPaymentAnalysis($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $query = Payment::whereBetween('created_at', [$startDate, $endDate]);

        if ($user && $user->role === 'property_owner') {
            $query->whereHas('booking.property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        if ($propertyId) {
            $query->whereHas('booking', function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            });
        }

        return [
            'pending' => (clone $query)->where('payment_status', 'pending')->count(),
            'verified' => (clone $query)->where('payment_status', 'verified')->count(),
            'failed' => (clone $query)->where('payment_status', 'failed')->count(),
            'refunded' => (clone $query)->where('payment_status', 'refunded')->count(),
        ];
    }

    private function getFinancialTrends($startDate, $endDate, $user = null, $propertyId = null): array
    {
        return $this->getRevenueByMonth($startDate, $endDate, $user, $propertyId);
    }

    private function getOccupancyRates($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $query = Property::query();
        
        if ($user && $user->role === 'property_owner') {
            $query->where('owner_id', $user->id);
        }

        if ($propertyId) {
            $query->where('id', $propertyId);
        }

        return $query->active()
            ->get()
            ->map(function ($property) use ($startDate, $endDate) {
                $occupancyRate = $this->calculatePropertyOccupancyRate($property->id, $startDate, $endDate);
                $totalDays = $startDate->diffInDays($endDate);
                $bookedDays = round(($occupancyRate / 100) * $totalDays);

                return [
                    'property_name' => $property->name,
                    'occupancy_rate' => round($occupancyRate, 2),
                    'booked_days' => $bookedDays,
                    'total_days' => $totalDays,
                ];
            })
            ->toArray();
    }

    private function getBookingPatterns($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $query = Booking::where('booking_status', '!=', 'cancelled')
            ->whereBetween('check_in', [$startDate, $endDate]);

        if ($user && $user->role === 'property_owner') {
            $query->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

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

    private function getGuestDemographics($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $query = Booking::where('booking_status', '!=', 'cancelled')
            ->whereBetween('check_in', [$startDate, $endDate]);

        if ($user && $user->role === 'property_owner') {
            $query->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

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
