<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialReport extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'property_id',
        'report_type',
        'period_start',
        'period_end',
        'total_revenue',
        'total_expenses',
        'net_profit',
        'occupancy_rate',
        'average_daily_rate',
        'revenue_per_available_room',
        'booking_count',
        'guest_count',
        'cancellation_rate',
        'report_data',
        'generated_by',
        'generated_at',
        'status',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'total_revenue' => 'decimal:2',
        'total_expenses' => 'decimal:2',
        'net_profit' => 'decimal:2',
        'occupancy_rate' => 'decimal:2',
        'average_daily_rate' => 'decimal:2',
        'revenue_per_available_room' => 'decimal:2',
        'cancellation_rate' => 'decimal:2',
        'report_data' => 'array',
        'generated_at' => 'datetime',
    ];

    /**
     * Get the property that owns the report.
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Get the user who generated the report.
     */
    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    /**
     * Get report type label
     */
    public function getTypeLabel(): string
    {
        return match($this->report_type) {
            'daily' => 'Harian',
            'weekly' => 'Mingguan',
            'monthly' => 'Bulanan',
            'quarterly' => 'Kuartalan',
            'yearly' => 'Tahunan',
            'custom' => 'Kustom',
            default => 'Tidak Diketahui'
        };
    }

    /**
     * Get status label
     */
    public function getStatusLabel(): string
    {
        return match($this->status) {
            'generating' => 'Sedang Dibuat',
            'completed' => 'Selesai',
            'failed' => 'Gagal',
            default => 'Tidak Diketahui'
        };
    }

    /**
     * Get formatted revenue
     */
    public function getFormattedRevenue(): string
    {
        return 'Rp ' . number_format($this->total_revenue, 0, ',', '.');
    }

    /**
     * Get formatted expenses
     */
    public function getFormattedExpenses(): string
    {
        return 'Rp ' . number_format($this->total_expenses, 0, ',', '.');
    }

    /**
     * Get formatted net profit
     */
    public function getFormattedNetProfit(): string
    {
        return 'Rp ' . number_format($this->net_profit, 0, ',', '.');
    }

    /**
     * Get profit margin percentage
     */
    public function getProfitMargin(): float
    {
        if ($this->total_revenue == 0) {
            return 0;
        }
        
        return round(($this->net_profit / $this->total_revenue) * 100, 2);
    }

    /**
     * Check if report is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if report is generating
     */
    public function isGenerating(): bool
    {
        return $this->status === 'generating';
    }

    /**
     * Mark report as completed
     */
    public function markAsCompleted(): bool
    {
        return $this->update([
            'status' => 'completed',
            'generated_at' => now(),
        ]);
    }

    /**
     * Mark report as failed
     */
    public function markAsFailed(): bool
    {
        return $this->update(['status' => 'failed']);
    }

    /**
     * Get period description
     */
    public function getPeriodDescription(): string
    {
        return $this->period_start->format('d M Y') . ' - ' . $this->period_end->format('d M Y');
    }

    /**
     * Scope: Get monthly reports
     */
    public function scopeMonthly($query)
    {
        return $query->where('report_type', 'monthly');
    }

    /**
     * Scope: Get yearly reports
     */
    public function scopeYearly($query)
    {
        return $query->where('report_type', 'yearly');
    }

    /**
     * Scope: Get completed reports
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope: Get reports by period
     */
    public function scopePeriod($query, $startDate, $endDate)
    {
        return $query->where('period_start', '>=', $startDate)
                    ->where('period_end', '<=', $endDate);
    }

    /**
     * Generate financial report data
     */
    public static function generateReport(
        int $propertyId,
        string $reportType,
        string $periodStart,
        string $periodEnd,
        int $userId
    ): self {
        $report = self::create([
            'property_id' => $propertyId,
            'report_type' => $reportType,
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'generated_by' => $userId,
            'status' => 'generating',
        ]);

        // Calculate financial metrics
        $report->calculateMetrics();
        
        return $report;
    }

    /**
     * Calculate financial metrics
     */
    public function calculateMetrics(): void
    {
        // Get bookings in period
        $bookings = \App\Models\Booking::where('property_id', $this->property_id)
            ->whereBetween('check_in', [$this->period_start, $this->period_end])
            ->where('booking_status', '!=', 'cancelled')
            ->get();

        // Get expenses in period
        $expenses = \App\Models\PropertyExpense::where('property_id', $this->property_id)
            ->whereBetween('expense_date', [$this->period_start, $this->period_end])
            ->where('status', 'approved')
            ->get();

        // Calculate metrics
        $totalRevenue = $bookings->sum('total_amount');
        $totalExpenses = $expenses->sum('amount');
        $netProfit = $totalRevenue - $totalExpenses;
        
        $bookingCount = $bookings->count();
        $guestCount = $bookings->sum('guest_count');
        
        // Calculate occupancy rate
        $totalDays = $this->period_start->diffInDays($this->period_end);
        $occupiedDays = $bookings->sum('nights');
        $occupancyRate = $totalDays > 0 ? ($occupiedDays / $totalDays) * 100 : 0;
        
        // Calculate ADR (Average Daily Rate)
        $averageDailyRate = $occupiedDays > 0 ? $totalRevenue / $occupiedDays : 0;
        
        // Calculate RevPAR (Revenue Per Available Room)
        $revPAR = $totalDays > 0 ? $totalRevenue / $totalDays : 0;

        $this->update([
            'total_revenue' => $totalRevenue,
            'total_expenses' => $totalExpenses,
            'net_profit' => $netProfit,
            'occupancy_rate' => $occupancyRate,
            'average_daily_rate' => $averageDailyRate,
            'revenue_per_available_room' => $revPAR,
            'booking_count' => $bookingCount,
            'guest_count' => $guestCount,
            'status' => 'completed',
            'generated_at' => now(),
        ]);
    }
}
