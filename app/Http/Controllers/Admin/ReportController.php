<?php

namespace App\Http\Controllers\Admin;

use App\Exports\PropertyPerformanceExport;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDailyRevenue;
use App\Models\Payment;
use App\Models\Property;
use App\Models\UnitDamage;
use App\Models\UnitDamageAction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    /**
     * Display reports dashboard
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if ($user->role === 'front_desk') {
            abort(403, 'Akses ditolak. Resepsionis hanya memiliki hak akses untuk Laporan Okupansi.');
        }
        $period = $request->input('period', 'month');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $propertyId = $request->input('property_id') === 'all' ? null : $request->input('property_id');

        // Set date range
        $startDate = $dateFrom ? Carbon::parse($dateFrom) : $this->getStartDate($period);
        $endDate = $dateTo ? Carbon::parse($dateTo) : $this->getEndDate($period);

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
                'report_type' => $request->input('report_type', 'revenue'),
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
        if ($user->role === 'front_desk') {
            abort(403, 'Akses ditolak. Resepsionis hanya memiliki hak akses untuk Laporan Okupansi.');
        }
        $period = $request->input('period', 'month');
        $propertyId = $request->input('property_id');

        $startDate = $this->getStartDate($period);
        $endDate = $this->getEndDate($period);

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

        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $totalDaysInMonth = $startDate->daysInMonth;

        $today = now()->startOfDay();

        // Calculate remaining nights in this month
        $remainingNights = 0;
        if ($today->between($startDate, $endDate)) {
            $remainingNights = $today->diffInDays($endDate) + 1; // including tonight
        } elseif ($today->lt($startDate)) {
            $remainingNights = $totalDaysInMonth;
        } else {
            $remainingNights = 0;
        }

        $propertiesList = $user->role === 'property_owner'
            ? Property::where('owner_id', $user->id)->active()->get()
            : Property::active()->get();

        $propertyIds = $propertiesList->pluck('id')->toArray();

        // Eager load all confirmed daily revenues for the date range
        $allRevenues = BookingDailyRevenue::whereIn('property_id', $propertyIds)
            ->where('tanggal', '>=', $startDate->toDateString())
            ->where('tanggal', '<=', $endDate->toDateString())
            ->confirmedBookings()
            ->get(['property_id', 'tanggal'])
            ->groupBy('property_id');

        $occupancyReport = [];

        foreach ($propertiesList as $property) {
            $propertyRevenues = $allRevenues->get($property->id) ?? collect();
            $occupiedDates = $propertyRevenues->pluck('tanggal')
                ->map(fn ($d) => $d instanceof Carbon ? $d->toDateString() : Carbon::parse($d)->toDateString())
                ->flip()
                ->toArray();

            $occupiedNights = 0;
            $passedEmptyNights = 0;

            for ($d = 0; $d < $totalDaysInMonth; $d++) {
                $currentNight = $startDate->copy()->addDays($d)->startOfDay();
                $dateStr = $currentNight->toDateString();

                if (isset($occupiedDates[$dateStr])) {
                    $occupiedNights++;
                } elseif ($currentNight->lessThan($today)) {
                    // Empty night in the past is counted as passed empty
                    $passedEmptyNights++;
                }
            }

            // sisa kosong: total malam bulan ini - okupansi - malam kosong yang sudah terlewat
            $vacantNights = max(0, $totalDaysInMonth - $occupiedNights - $passedEmptyNights);

            $occupancyPercentage = $totalDaysInMonth > 0
                ? (int) round(($occupiedNights / $totalDaysInMonth) * 100)
                : 0;

            $potentialMaxOccupiedNights = min($totalDaysInMonth, $occupiedNights + $vacantNights);

            $potentialMaxOccupancyPercentage = $totalDaysInMonth > 0
                ? (int) round(($potentialMaxOccupiedNights / $totalDaysInMonth) * 100)
                : 0;

            $targetStatus = 'Tidak Tercapai';
            if ($occupiedNights >= 25) {
                $targetStatus = 'Tercapai';
            } elseif ($potentialMaxOccupiedNights >= 25) {
                $targetStatus = 'Potensial Tercapai';
            }

            $occupancyReport[] = [
                'property_id' => $property->id,
                'property_name' => $property->name,
                'occupied_nights' => $occupiedNights,
                'vacant_nights' => $vacantNights,
                'occupancy_percentage' => $occupancyPercentage,
                'potential_max_percentage' => $potentialMaxOccupancyPercentage,
                'potential_max_nights' => $potentialMaxOccupiedNights,
                'target_status' => $targetStatus,
            ];
        }

        // Summary Statistics for the whole property portfolio
        $totalUnits = count($occupancyReport);
        $avgOccupancy = $totalUnits > 0 ? (int) round(collect($occupancyReport)->avg('occupancy_percentage')) : 0;
        $totalOccupied = collect($occupancyReport)->sum('occupied_nights');
        $totalVacant = collect($occupancyReport)->sum('vacant_nights');
        $unitsMeetingTarget = collect($occupancyReport)->where('target_status', 'Tercapai')->count();
        $unitsPotentialTarget = collect($occupancyReport)->where('target_status', 'Potensial Tercapai')->count();

        return Inertia::render('Admin/Reports/Occupancy', [
            'occupancyReport' => $occupancyReport,
            'summary' => [
                'total_units' => $totalUnits,
                'average_occupancy' => $avgOccupancy,
                'total_occupied_nights' => $totalOccupied,
                'total_vacant_nights' => $totalVacant,
                'units_meeting_target' => $unitsMeetingTarget,
                'units_potential_target' => $unitsPotentialTarget,
            ],
            'filters' => [
                'month' => $month,
                'year' => $year,
            ],
        ]);
    }

    /**
     * Display property performance reports (daily revenue visualization & detail table)
     */
    public function propertyPerformance(Request $request): Response
    {
        $user = $request->user();
        if ($user->role === 'front_desk') {
            abort(403, 'Akses ditolak. Resepsionis hanya memiliki hak akses untuk Laporan Okupansi.');
        }

        $period = $request->input('period', 'month');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $propertyId = $request->input('property_id') === 'all' ? null : $request->input('property_id');

        // Set date range
        $startDate = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : $this->getStartDate($period)->startOfDay();
        $endDate = $dateTo ? Carbon::parse($dateTo)->endOfDay() : $this->getEndDate($period)->endOfDay();

        // Get properties list for filters (restricted by owner if property_owner)
        $properties = $user->role === 'property_owner'
            ? Property::where('owner_id', $user->id)->active()->get(['id', 'name'])
            : Property::active()->get(['id', 'name']);

        $data = $this->getPropertyPerformanceData($user, $startDate, $endDate, $propertyId);

        return Inertia::render('Admin/Reports/PropertyPerformance', [
            'properties' => $properties,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'property_id' => $propertyId ?: 'all',
                'period' => $period,
            ],
            'data' => $data,
        ]);
    }

    /**
     * Helper to get property performance report data
     */
    private function getPropertyPerformanceData($user, Carbon $startDate, Carbon $endDate, ?int $propertyId): array
    {
        // Get properties list for filters (restricted by owner if property_owner)
        $properties = $user->role === 'property_owner'
            ? Property::where('owner_id', $user->id)->active()->get(['id', 'name', 'color'])
            : Property::active()->get(['id', 'name', 'color']);

        $propertyIds = $properties->pluck('id');

        // If a specific property is filtered, make sure it belongs to the owner
        if ($propertyId && $user->role === 'property_owner') {
            $belongsToOwner = Property::where('id', $propertyId)->where('owner_id', $user->id)->exists();
            if (! $belongsToOwner) {
                abort(403, 'Akses ditolak.');
            }
        }

        // 1. Query Daily Revenue for Chart
        $dailyRevenuesQuery = BookingDailyRevenue::whereBetween('tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->whereIn('property_id', $propertyIds)
            ->confirmedBookings()
            ->with(['property:id,name,color', 'booking.services']);

        if ($propertyId) {
            $dailyRevenuesQuery->where('property_id', $propertyId);
        }

        $dailyRevenues = $dailyRevenuesQuery->get();

        // Initialize chart data with 0s for all dates in the range
        $chartData = [];
        $current = $startDate->copy();
        $daysCount = 0;

        while ($current->lte($endDate)) {
            $dateStr = $current->toDateString();
            $dayLabel = $current->format('d M');
            $chartData[$dateStr] = [
                'date' => $dateStr,
                'day' => $dayLabel,
                'total' => 0,
                'base_amount' => 0,
                'weekend_premium' => 0,
                'seasonal_premium' => 0,
                'extra_bed_amount' => 0,
                'extra_services_amount' => 0,
            ];

            // Initialize each property in chart data with 0
            foreach ($properties as $prop) {
                $chartData[$dateStr][$prop->name] = 0;
            }

            $current->addDay();
            $daysCount++;
        }

        $daysCount = max(1, $daysCount);

        foreach ($dailyRevenues as $rev) {
            $dateStr = $rev->tanggal->toDateString();
            if (isset($chartData[$dateStr])) {
                $propName = $rev->property->name ?? 'Unknown';
                $amount = (float) $rev->amount;

                $extraServicesAmount = 0;
                if ($rev->booking) {
                    $extraServicesAmount = (float) $rev->booking->services
                        ->where('service_type', '!=', 'extra_bed')
                        ->where('status', '!=', 'cancelled')
                        ->filter(function ($srv) use ($rev) {
                            if ($srv->service_date) {
                                return $srv->service_date->toDateString() === $rev->tanggal->toDateString();
                            }

                            return $rev->booking->check_in->toDateString() === $rev->tanggal->toDateString();
                        })
                        ->sum('total_price');
                }

                $totalWithServices = $amount + $extraServicesAmount;

                $chartData[$dateStr][$propName] = ($chartData[$dateStr][$propName] ?? 0) + $totalWithServices;
                $chartData[$dateStr]['total'] += $totalWithServices;
                $chartData[$dateStr]['base_amount'] += (float) $rev->base_amount;
                $chartData[$dateStr]['weekend_premium'] += (float) $rev->weekend_premium;
                $chartData[$dateStr]['seasonal_premium'] += (float) $rev->seasonal_premium;
                $chartData[$dateStr]['extra_bed_amount'] += (float) $rev->extra_bed_amount;
                $chartData[$dateStr]['extra_services_amount'] += $extraServicesAmount;
            }
        }

        $dailyRevenueChart = array_values($chartData);

        // 2. Query Property-wise Performance Summary
        $propertyPerformance = Property::active()
            ->whereIn('id', $propertyIds)
            ->when($propertyId, function ($q) use ($propertyId) {
                $q->where('id', $propertyId);
            })
            ->get()
            ->map(function ($property) use ($startDate, $endDate) {
                $revenues = Income::where('property_id', $property->id)
                    ->whereBetween('income_date', [$startDate->toDateString(), $endDate->toDateString()])
                    ->get();

                $roomRevenue = $revenues->where('source', 'booking')->sum('amount');
                $servicesRevenue = $revenues->where('source', '!=', 'booking')->sum('amount');
                $totalRevenue = $roomRevenue + $servicesRevenue;

                $bookingsCount = Booking::where('property_id', $property->id)
                    ->confirmedBookings()
                    ->where(function ($q) use ($startDate, $endDate) {
                        $q->where('check_in', '<=', $endDate->toDateString())
                            ->where('check_out', '>=', $startDate->toDateString());
                    })
                    ->count();

                $bookedDays = $revenues->count();
                $totalDays = max(1, $startDate->diffInDays($endDate));
                $occupancyRate = ($bookedDays / $totalDays) * 100;

                $adr = $bookedDays > 0 ? $totalRevenue / $bookedDays : 0;
                $revpar = $totalDays > 0 ? $totalRevenue / $totalDays : 0;

                return [
                    'id' => $property->id,
                    'name' => $property->name,
                    'color' => $property->color ?? '#3b82f6',
                    'total_revenue' => (float) $totalRevenue,
                    'total_bookings' => $bookingsCount,
                    'occupancy_rate' => round($occupancyRate, 1),
                    'adr' => round($adr, 2),
                    'revpar' => round($revpar, 2),
                ];
            })
            ->sortByDesc('total_revenue')
            ->values()
            ->toArray();

        // 3. Overall KPI Calculations
        $totalRevenue = collect($propertyPerformance)->sum('total_revenue');
        $totalBookings = collect($propertyPerformance)->sum('total_bookings');
        $averageOccupancy = count($propertyPerformance) > 0 ? collect($propertyPerformance)->avg('occupancy_rate') : 0;

        $totalBookedDays = BookingDailyRevenue::whereIn('property_id', $propertyIds)
            ->whereBetween('tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->confirmedBookings()
            ->when($propertyId, function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            })
            ->count();

        $overallAdr = $totalBookedDays > 0 ? $totalRevenue / $totalBookedDays : 0;
        $totalAvailableNights = $daysCount * count($propertyIds);
        $overallRevpar = $totalAvailableNights > 0 ? $totalRevenue / $totalAvailableNights : 0;

        // 4. Booking Sources breakdown for this period
        $bookingSources = Booking::whereIn('property_id', $propertyIds)
            ->confirmedBookings()
            ->whereBetween('check_in', [$startDate->toDateString(), $endDate->toDateString()])
            ->when($propertyId, function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            })
            ->selectRaw('COALESCE(source, "direct") as source, COUNT(*) as count, SUM(total_amount) as revenue')
            ->groupBy('source')
            ->orderByDesc('count')
            ->get()
            ->map(function ($r) use ($totalBookings) {
                return [
                    'source' => $r->source,
                    'count' => $r->count,
                    'revenue' => (float) $r->revenue,
                    'percentage' => $totalBookings > 0 ? round(($r->count / $totalBookings) * 100, 1) : 0,
                ];
            })
            ->toArray();

        // 5. Query daily breakdown records for date & property details table
        $dailyBreakdownQuery = BookingDailyRevenue::whereBetween('tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->whereIn('property_id', $propertyIds)
            ->confirmedBookings()
            ->with(['property:id,name,color', 'booking.services']);

        if ($propertyId) {
            $dailyBreakdownQuery->where('property_id', $propertyId);
        }

        $dailyBreakdown = $dailyBreakdownQuery->orderBy('tanggal', 'desc')
            ->orderBy('property_id')
            ->get()
            ->map(function ($rev) {
                $extraServicesAmount = 0;
                if ($rev->booking) {
                    $extraServicesAmount = (float) $rev->booking->services
                        ->where('service_type', '!=', 'extra_bed')
                        ->where('status', '!=', 'cancelled')
                        ->filter(function ($srv) use ($rev) {
                            if ($srv->service_date) {
                                return $srv->service_date->toDateString() === $rev->tanggal->toDateString();
                            }

                            return $rev->booking->check_in->toDateString() === $rev->tanggal->toDateString();
                        })
                        ->sum('total_price');
                }

                $roomRevenue = (float) $rev->amount;
                $totalRevenue = $roomRevenue + $extraServicesAmount;

                return [
                    'date' => $rev->tanggal->format('Y-m-d'),
                    'property_name' => $rev->property->name ?? 'Unknown',
                    'property_color' => $rev->property->color ?? '#3b82f6',
                    'booking_id' => $rev->booking_id,
                    'booking_number' => $rev->booking->booking_number ?? 'N/A',
                    'guest_name' => $rev->booking->guest_name ?? 'N/A',
                    'amount' => $totalRevenue,
                    'base_amount' => (float) $rev->base_amount,
                    'weekend_premium' => (float) $rev->weekend_premium,
                    'seasonal_premium' => (float) $rev->seasonal_premium,
                    'extra_bed_amount' => (float) $rev->extra_bed_amount,
                    'extra_services_amount' => $extraServicesAmount,
                    'is_weekend' => $rev->is_weekend,
                    'rate_type' => $rev->rate_type,
                    'rate_name' => $rev->rate_name,
                ];
            })
            ->toArray();

        // 6. Overall Bookings referenced in this period
        $bookingIds = collect($dailyBreakdown)->pluck('booking_id')->unique()->filter()->toArray();
        $overallBookings = Booking::whereIn('id', $bookingIds)
            ->with(['property:id,name', 'services'])
            ->orderBy('check_in', 'desc')
            ->get()
            ->map(function ($b) {
                $extraServices = (float) $b->services
                    ->where('service_type', '!=', 'extra_bed')
                    ->where('status', '!=', 'cancelled')
                    ->sum('total_price');

                $roomCharge = (float) $b->dailyRevenues->sum('amount');
                $totalPaid = $roomCharge + $extraServices;

                return [
                    'booking_number' => $b->booking_number,
                    'property_name' => $b->property->name ?? 'Unknown',
                    'guest_name' => $b->guest_name,
                    'check_in' => $b->check_in->format('Y-m-d'),
                    'check_out' => $b->check_out->format('Y-m-d'),
                    'nights' => $b->nights,
                    'room_charge' => $roomCharge,
                    'extra_services' => $extraServices,
                    'total_amount' => $totalPaid,
                    'booking_status' => $b->booking_status,
                ];
            })
            ->toArray();

        return [
            'properties' => $properties->toArray(),
            'overview' => [
                'totalRevenue' => $totalRevenue,
                'totalBookings' => $totalBookings,
                'occupancyRate' => round($averageOccupancy, 1),
                'adr' => round($overallAdr, 0),
                'revpar' => round($overallRevpar, 0),
            ],
            'dailyRevenueChart' => $dailyRevenueChart,
            'propertyPerformance' => $propertyPerformance,
            'bookingSources' => $bookingSources,
            'dailyBreakdown' => $dailyBreakdown,
            'overallBookings' => $overallBookings,
        ];
    }

    /**
     * Export report data
     */
    public function export(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'front_desk') {
            abort(403, 'Akses ditolak. Resepsionis hanya memiliki hak akses untuk Laporan Okupansi.');
        }
        $format = $request->input('format', 'csv');
        $reportType = $request->input('type', 'revenue');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $propertyId = $request->input('property_id');

        $startDate = $dateFrom ? Carbon::parse($dateFrom) : now()->startOfMonth();
        $endDate = $dateTo ? Carbon::parse($dateTo) : now();

        $ownerId = $user->role === 'property_owner' ? $user->id : null;

        switch ($reportType) {
            case 'property_performance':
                $propId = $propertyId === 'all' ? null : (int) $propertyId;
                $data = $this->getPropertyPerformanceData($user, $startDate, $endDate, $propId);
                $filters = [
                    'date_from' => $startDate->toDateString(),
                    'date_to' => $endDate->toDateString(),
                    'property_id' => $propertyId ?: 'all',
                ];
                $export = new PropertyPerformanceExport($data, $filters);
                $filename = $export->getFilename();

                return Excel::download($export, $filename, \Maatwebsite\Excel\Excel::XLSX, [
                    'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                    'X-Content-Type-Options' => 'nosniff',
                    'Content-Security-Policy' => "default-src 'none'",
                    'X-Download-Options' => 'noopen',
                    'Cache-Control' => 'no-cache, no-store, must-revalidate',
                    'Pragma' => 'no-cache',
                    'Expires' => '0',
                ]);
            case 'revenue':
                $data = $this->getRevenueExportData($startDate, $endDate, $ownerId, $propertyId);
                $filename = 'revenue_report_'.$startDate->format('Ymd').'_'.$endDate->format('Ymd');
                break;
            case 'bookings':
                $data = $this->getBookingsExportData($startDate, $endDate, $ownerId, $propertyId);
                $filename = 'bookings_report_'.$startDate->format('Ymd').'_'.$endDate->format('Ymd');
                break;
            case 'occupancy':
                $data = $this->getOccupancyExportData($startDate, $endDate, $ownerId, $propertyId);
                $filename = 'occupancy_report_'.$startDate->format('Ymd').'_'.$endDate->format('Ymd');
                break;
            case 'daily_breakdown':
                $data = $this->getDailyBreakdownExportData($startDate, $endDate, $ownerId, $propertyId);
                $filename = 'daily_breakdown_'.$startDate->format('Ymd').'_'.$endDate->format('Ymd');
                break;
            default:
                return response()->json(['error' => 'Invalid report type'], 400);
        }

        switch ($format) {
            case 'csv':
            case 'excel':
                return $this->exportToCsv($data, $filename);
            case 'json':
                return response()->json($data);
            default:
                return response()->json(['error' => 'Invalid format'], 400);
        }
    }

    /**
     * Export revenue data for accountants
     */
    private function getRevenueExportData($startDate, $endDate, $ownerId, $propertyId): array
    {
        $query = BookingDailyRevenue::query()
            ->inPeriod($startDate, $endDate)
            ->confirmedBookings()
            ->with(['property:id,name', 'booking:id,booking_number,guest_name']);

        if ($ownerId) {
            $query->forOwner($ownerId);
        }

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        // Group by property and month for summary
        $dailyData = $query->orderBy('tanggal')->get();

        $rows = [
            [
                'Date',
                'Property',
                'Booking Number',
                'Guest Name',
                'Base Amount',
                'Weekend Premium',
                'Seasonal Premium',
                'Extra Bed',
                'Total Amount',
                'Rate Type',
                'Rate Name',
            ],
        ];

        foreach ($dailyData as $record) {
            $rows[] = [
                $record->tanggal->format('Y-m-d'),
                $record->property->name ?? 'Unknown',
                $record->booking->booking_number ?? 'N/A',
                $record->booking->guest_name ?? 'N/A',
                $record->base_amount,
                $record->weekend_premium,
                $record->seasonal_premium,
                $record->extra_bed_amount,
                $record->amount,
                $record->rate_type,
                $record->rate_name ?? '-',
            ];
        }

        // Add summary rows
        $totals = $query->selectRaw('
            SUM(base_amount) as total_base,
            SUM(weekend_premium) as total_weekend,
            SUM(seasonal_premium) as total_seasonal,
            SUM(extra_bed_amount) as total_extra_bed,
            SUM(amount) as grand_total
        ')->first();

        $rows[] = [];
        $rows[] = ['SUMMARY'];
        $rows[] = ['Total Base Amount', '', '', '', $totals->total_base ?? 0];
        $rows[] = ['Total Weekend Premium', '', '', '', $totals->total_weekend ?? 0];
        $rows[] = ['Total Seasonal Premium', '', '', '', $totals->total_seasonal ?? 0];
        $rows[] = ['Total Extra Bed', '', '', '', $totals->total_extra_bed ?? 0];
        $rows[] = ['GRAND TOTAL', '', '', '', '', '', '', '', $totals->grand_total ?? 0];

        return $rows;
    }

    /**
     * Export bookings data
     */
    private function getBookingsExportData($startDate, $endDate, $ownerId, $propertyId): array
    {
        $query = Booking::query()
            ->whereBetween('check_in', [$startDate, $endDate])
            ->with(['property:id,name', 'user:id,name,email'])
            ->orderBy('check_in')
            ->orderBy('property_id');

        if ($ownerId) {
            $query->whereHas('property', fn ($q) => $q->where('owner_id', $ownerId));
        }

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $rows = [
            [
                'No',
                'Booking Number',
                'Property',
                'Guest Name',
                'Guest Email',
                'Guest Phone',
                'Guest Country',
                'Check In',
                'Check Out',
                'Nights',
                'Guest Count',
                'Room Amount',
                'Cleaning Fee',
                'Extra Bed Fee',
                'Total Amount',
                'Booking Status',
                'Payment Status',
                'Booking Source',
                'Special Requests',
                'Created At',
            ],
        ];

        $no = 1;
        $totalAmount = 0;
        $totalBookings = 0;

        foreach ($query->get() as $booking) {
            $totalAmount += $booking->total_amount ?? 0;
            $totalBookings++;

            $rows[] = [
                $no++,
                $booking->booking_number ?? '-',
                $booking->property->name ?? 'Unknown',
                $booking->guest_name ?? '-',
                $booking->guest_email ?? '-',
                $booking->guest_phone ?? '-',
                $booking->guest_country ?? 'Indonesia',
                $booking->check_in ? $booking->check_in->format('Y-m-d') : '-',
                $booking->check_out ? $booking->check_out->format('Y-m-d') : '-',
                $booking->nights ?? 0,
                $booking->guest_count ?? 0,
                $booking->room_amount ?? 0,
                $booking->cleaning_fee ?? 0,
                $booking->extra_bed_amount ?? 0,
                $booking->total_amount ?? 0,
                ucfirst(str_replace('_', ' ', $booking->booking_status ?? 'unknown')),
                ucfirst(str_replace('_', ' ', $booking->payment_status ?? 'unknown')),
                ucfirst(str_replace('_', ' ', $booking->booking_source ?? 'direct')),
                $booking->special_requests ?? '-',
                $booking->created_at ? $booking->created_at->format('Y-m-d H:i:s') : '-',
            ];
        }

        // Add summary rows
        $rows[] = [];
        $rows[] = ['SUMMARY'];
        $rows[] = ['Total Bookings:', $totalBookings];
        $rows[] = ['Total Revenue:', '', '', '', '', '', '', '', '', '', '', '', '', '', $totalAmount];
        $rows[] = ['Report Period:', $startDate->format('Y-m-d'), 'to', $endDate->format('Y-m-d')];
        $rows[] = ['Generated:', now()->format('Y-m-d H:i:s')];

        return $rows;
    }

    /**
     * Export occupancy data
     */
    private function getOccupancyExportData($startDate, $endDate, $ownerId, $propertyId): array
    {
        $propertyQuery = Property::active();

        if ($ownerId) {
            $propertyQuery->where('owner_id', $ownerId);
        }

        if ($propertyId) {
            $propertyQuery->where('id', $propertyId);
        }

        $rows = [
            [
                'Property',
                'Total Days',
                'Booked Days',
                'Occupancy Rate (%)',
                'Total Revenue',
                'Average Daily Rate',
            ],
        ];

        foreach ($propertyQuery->get() as $property) {
            $totalDays = $startDate->diffInDays($endDate);
            $occupancy = $this->calculatePropertyOccupancyRate($property->id, $startDate, $endDate);
            $bookedDays = round(($occupancy / 100) * $totalDays);

            $revenue = BookingDailyRevenue::where('property_id', $property->id)
                ->inPeriod($startDate, $endDate)
                ->confirmedBookings()
                ->sum('amount');

            $avgDailyRate = $bookedDays > 0 ? $revenue / $bookedDays : 0;

            $rows[] = [
                $property->name,
                $totalDays,
                $bookedDays,
                round($occupancy, 2),
                $revenue,
                round($avgDailyRate, 2),
            ];
        }

        return $rows;
    }

    /**
     * Export detailed daily breakdown
     */
    private function getDailyBreakdownExportData($startDate, $endDate, $ownerId, $propertyId): array
    {
        $breakdown = BookingDailyRevenue::getMonthlyBreakdown(
            $startDate->year,
            $propertyId,
            $ownerId
        );

        $rows = [
            [
                'Month',
                'Total Revenue',
                'Base Amount',
                'Weekend Premium',
                'Seasonal Premium',
                'Extra Bed Amount',
                'Days Booked',
                'Weekend Days',
                'Seasonal Days',
            ],
        ];

        foreach ($breakdown as $month) {
            $rows[] = [
                $month['month_name'].' '.$month['year'],
                $month['total'],
                $month['base_amount'],
                $month['weekend_premium'],
                $month['seasonal_premium'],
                $month['extra_bed_amount'],
                $month['days_count'],
                $month['weekend_days'],
                $month['seasonal_days'],
            ];
        }

        return $rows;
    }

    /**
     * Generate CSV response
     */
    private function exportToCsv(array $data, string $filename)
    {
        $callback = function () use ($data) {
            $file = fopen('php://output', 'w');
            // Add BOM for Excel UTF-8 compatibility
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            foreach ($data as $row) {
                fputcsv($file, $row);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'.csv"',
        ]);
    }

    // Private helper methods

    private function getStartDate($period): Carbon
    {
        return match ($period) {
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            'quarter' => now()->startOfQuarter(),
            'year' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };
    }

    private function getEndDate($period): Carbon
    {
        return match ($period) {
            'week' => now()->endOfWeek(),
            'month' => now()->endOfMonth(),
            'quarter' => now()->endOfQuarter(),
            'year' => now()->endOfYear(),
            default => now()->endOfMonth(),
        };
    }

    private function getFinancialOverview($startDate, $endDate, $user = null, $propertyId = null): array
    {
        // Use BookingDailyRevenue for accurate accrual-based revenue
        $revenueQuery = BookingDailyRevenue::query()
            ->inPeriod($startDate, $endDate)
            ->confirmedBookings();

        $bookingQuery = Booking::where('booking_status', '!=', 'cancelled')
            ->whereBetween('created_at', [$startDate, $endDate]);

        // Apply user role filtering
        if ($user && $user->role === 'property_owner') {
            $revenueQuery->forOwner($user->id);
            $bookingQuery->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        // Apply property filter
        if ($propertyId) {
            $revenueQuery->where('property_id', $propertyId);
            $bookingQuery->where('property_id', $propertyId);
        }

        $totalRevenue = $revenueQuery->sum('amount');
        $totalBookings = $bookingQuery->count();
        $averageBookingValue = $totalBookings > 0 ? $totalRevenue / $totalBookings : 0;

        // Get revenue breakdown
        $breakdown = BookingDailyRevenue::getRevenueBreakdown(
            $startDate,
            $endDate,
            $propertyId,
            $user && $user->role === 'property_owner' ? $user->id : null
        );

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
            'breakdown' => $breakdown,
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

        $properties = $query->get();
        $propertyIds = $properties->pluck('id')->toArray();

        // Load cash-basis revenues
        $revenues = Income::whereIn('property_id', $propertyIds)
            ->whereBetween('income_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get(['property_id', 'amount'])
            ->groupBy('property_id')
            ->map(fn ($group) => (float) $group->sum('amount'))
            ->toArray();

        // Load booking counts
        $bookingsCounts = Booking::whereIn('property_id', $propertyIds)
            ->where('booking_status', '!=', 'cancelled')
            ->whereBetween('check_in', [$startDate, $endDate])
            ->get(['property_id'])
            ->groupBy('property_id')
            ->map(fn ($group) => $group->count())
            ->toArray();

        return $properties->map(function ($property) use ($startDate, $endDate, $revenues, $bookingsCounts) {
            $occupancyRate = $this->calculatePropertyOccupancyRate($property->id, $startDate, $endDate);
            $revenue = $revenues[$property->id] ?? 0.0;
            $bookingsCount = $bookingsCounts[$property->id] ?? 0;

            return [
                'id' => $property->id,
                'name' => $property->name,
                'revenue' => $revenue,
                'bookings' => $bookingsCount,
                'occupancyRate' => round($occupancyRate, 1),
            ];
        })
            ->sortByDesc('revenue')
            ->values()
            ->toArray();
    }

    private function getRevenueByMonth($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $months = [];
        $current = $startDate->copy()->startOfMonth();
        $ownerId = $user && $user->role === 'property_owner' ? $user->id : null;

        while ($current->lte($endDate)) {
            $monthStart = $current->copy()->startOfMonth();
            $monthEnd = $current->copy()->endOfMonth();

            // Calculate actual income
            $incomeQuery = Income::whereBetween('income_date', [$monthStart->toDateString(), $monthEnd->toDateString()]);
            if ($propertyId) {
                $incomeQuery->where('property_id', $propertyId);
            }
            if ($ownerId) {
                $incomeQuery->whereHas('property', function ($q) use ($ownerId) {
                    $q->where('owner_id', $ownerId);
                });
            }
            $totalRealRevenue = (float) $incomeQuery->sum('amount');

            // Get estimated breakdown from BookingDailyRevenue
            $breakdown = BookingDailyRevenue::getRevenueBreakdown(
                $monthStart,
                $monthEnd,
                $propertyId,
                $ownerId
            );

            $estimatedTotal = $breakdown['total'];
            $ratio = $estimatedTotal > 0 ? $totalRealRevenue / $estimatedTotal : 0;

            $bookingQuery = Booking::whereBetween('created_at', [$monthStart, $monthEnd]);

            if ($user && $user->role === 'property_owner') {
                $bookingQuery->whereHas('property', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }

            if ($propertyId) {
                $bookingQuery->where('property_id', $propertyId);
            }

            $months[] = [
                'month' => $current->format('M Y'),
                'revenue' => $totalRealRevenue,
                'base_amount' => round($breakdown['base_amount'] * $ratio, 2),
                'weekend_premium' => round($breakdown['weekend_premium'] * $ratio, 2),
                'seasonal_premium' => round($breakdown['seasonal_premium'] * $ratio, 2),
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
        $query = Booking::whereBetween('check_in', [$startDate, $endDate])
            ->where('booking_status', '!=', 'cancelled')
            ->whereNotNull('guest_country')
            ->where('guest_country', '!=', '');

        if ($user && $user->role === 'property_owner') {
            $query->whereHas('property', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $countries = $query->selectRaw('guest_country, COUNT(*) as count')
            ->groupBy('guest_country')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        $total = $countries->sum('count');

        return $countries->map(function ($country) use ($total) {
            return [
                'country' => $country->guest_country,
                'count' => $country->count,
                'percentage' => $total > 0 ? round(($country->count / $total) * 100, 1) : 0,
            ];
        })->toArray();
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
        $startDateStr = $startDate instanceof Carbon ? $startDate->toDateString() : $startDate;
        $endDateStr = $endDate instanceof Carbon ? $endDate->toDateString() : $endDate;

        $totalDays = Carbon::parse($startDateStr)->diffInDays(Carbon::parse($endDateStr));
        if ($totalDays <= 0) {
            return 0;
        }

        $bookedDays = BookingDailyRevenue::where('property_id', $propertyId)
            ->where('tanggal', '>=', $startDateStr)
            ->where('tanggal', '<', $endDateStr)
            ->confirmedBookings()
            ->count();

        return ($bookedDays / $totalDays) * 100;
    }

    // Keep existing methods for backward compatibility
    private function getRevenueAnalysis($startDate, $endDate, $user = null, $propertyId = null): array
    {
        $revenueQuery = BookingDailyRevenue::query()
            ->inPeriod($startDate, $endDate)
            ->confirmedBookings();

        if ($user && $user->role === 'property_owner') {
            $revenueQuery->forOwner($user->id);
        }

        if ($propertyId) {
            $revenueQuery->where('property_id', $propertyId);
        }

        $dailyRevenues = $revenueQuery->with('booking')->get();

        $totalRevenue = 0.0;
        $dpRevenue = 0.0;
        $fullPaymentRevenue = 0.0;
        $remainingPaymentRevenue = 0.0;

        foreach ($dailyRevenues as $rev) {
            $booking = $rev->booking;
            $amount = (float) $rev->amount;
            $totalRevenue += $amount;

            if ($booking) {
                $dpPct = (float) ($booking->dp_percentage ?? 50);
                if ($dpPct >= 100) {
                    $fullPaymentRevenue += $amount;
                } else {
                    $dpPortion = $amount * ($dpPct / 100);
                    $dpRevenue += $dpPortion;
                    $remainingPaymentRevenue += ($amount - $dpPortion);
                }
            } else {
                $fullPaymentRevenue += $amount;
            }
        }

        return [
            'total_revenue' => round($totalRevenue, 2),
            'dp_revenue' => round($dpRevenue, 2),
            'full_payment_revenue' => round($fullPaymentRevenue, 2),
            'remaining_payment_revenue' => round($remainingPaymentRevenue, 2),
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
                if ($days <= 7) {
                    return '0-7 days';
                }
                if ($days <= 30) {
                    return '8-30 days';
                }
                if ($days <= 60) {
                    return '31-60 days';
                }

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

    /**
     * Display staff performance report
     */
    public function staffPerformance(Request $request): Response
    {
        $user = $request->user();

        // Only allow admins, property managers, or finance to view this
        if (! in_array($user->role, ['super_admin', 'property_manager', 'finance'])) {
            abort(403, 'Unauthorized.');
        }

        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        // Set date range (default: current month)
        $startDate = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : now()->startOfMonth()->startOfDay();
        $endDate = $dateTo ? Carbon::parse($dateTo)->endOfDay() : now()->endOfMonth()->endOfDay();

        // Get staff list
        $staff = User::whereIn('role', ['super_admin', 'property_manager', 'front_desk', 'housekeeping'])
            ->orderBy('name')
            ->get(['id', 'name', 'role']);

        $performanceData = [];

        foreach ($staff as $s) {
            // Count Follow ups
            $followUpsCount = Booking::where('followed_up_by', $s->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count();

            // Count Creations/Input
            $createdCount = Booking::where('created_by', $s->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count();

            // Count Closing (DP verified)
            $closedCount = Booking::where('closed_by', $s->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count();

            // Count Check-ins (Hospitality)
            $checkedInCount = Booking::where('checked_in_by', $s->id)
                ->whereBetween('check_in', [$startDate->toDateString(), $endDate->toDateString()])
                ->count();

            // Get total value of closing deals
            $totalDealsValue = Booking::where('closed_by', $s->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->sum('total_amount');

            // Count Resolved unit damages (count of actions performed)
            $resolvedDamagesCount = UnitDamageAction::where('user_id', $s->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count();

            // Sum points earned from damage repair actions
            $damagePoints = (int) UnitDamageAction::where('user_id', $s->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->sum('points');

            // Count Assigned unit damages
            $assignedDamagesCount = UnitDamage::where('assigned_to', $s->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count();

            $performanceData[] = [
                'id' => $s->id,
                'name' => $s->name,
                'role' => $s->role,
                'follow_ups' => $followUpsCount,
                'creations' => $createdCount,
                'closings' => $closedCount,
                'check_ins' => $checkedInCount,
                'deals_value' => (float) $totalDealsValue,
                'resolved_damages' => $resolvedDamagesCount,
                'assigned_damages' => $assignedDamagesCount,
                'damage_points' => $damagePoints,
            ];
        }

        return Inertia::render('Admin/Reports/StaffPerformance', [
            'performanceData' => $performanceData,
            'filters' => [
                'date_from' => $startDate->toDateString(),
                'date_to' => $endDate->toDateString(),
            ],
        ]);
    }
}
