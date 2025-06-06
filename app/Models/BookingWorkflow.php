<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingWorkflow extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'booking_id',
        'from_status',
        'to_status',
        'changed_by',
        'changed_at',
        'notes',
        'step',
        'status',
        'processed_by',
        'processed_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'changed_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    /**
     * Get the booking that owns the workflow.
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Get the user who made the change.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    /**
     * Get the user who processed the step.
     */
    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /**
     * Get human readable status label
     */
    public function getStatusLabel(): string
    {
        return match($this->to_status) {
            'pending' => 'Menunggu Verifikasi',
            'verified' => 'Terverifikasi',
            'confirmed' => 'Dikonfirmasi',
            'checked_in' => 'Check-in',
            'checked_out' => 'Check-out',
            'cancelled' => 'Dibatalkan',
            'rejected' => 'Ditolak',
            default => 'Status Tidak Diketahui'
        };
    }

    /**
     * Get workflow step label
     */
    public function getStepLabel(): string
    {
        return match($this->step) {
            'booking_created' => 'Booking Dibuat',
            'verification' => 'Verifikasi',
            'payment_received' => 'Pembayaran Diterima',
            'payment_verified' => 'Pembayaran Diverifikasi',
            'payment_rejected' => 'Pembayaran Ditolak',
            'check_in' => 'Check-in',
            'check_out' => 'Check-out',
            'cancellation' => 'Pembatalan',
            default => 'Langkah Tidak Diketahui'
        };
    }

    /**
     * Check if workflow step is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if workflow step is failed
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Check if workflow step is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Get formatted change description
     */
    public function getChangeDescription(): string
    {
        if ($this->from_status && $this->to_status) {
            return "Status berubah dari '{$this->from_status}' ke '{$this->to_status}'";
        }
        
        return $this->getStepLabel();
    }

    /**
     * Scope: Get completed workflows
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope: Get failed workflows
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope: Get pending workflows
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Get workflows by step
     */
    public function scopeByStep($query, $step)
    {
        return $query->where('step', $step);
    }

    /**
     * Create workflow entry for booking status change
     */
    public static function createStatusChange(
        int $bookingId, 
        string $fromStatus, 
        string $toStatus, 
        int $userId, 
        string $notes = null
    ): self {
        return self::create([
            'booking_id' => $bookingId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'changed_by' => $userId,
            'changed_at' => now(),
            'notes' => $notes,
            'step' => 'status_change',
            'status' => 'completed',
            'processed_by' => $userId,
            'processed_at' => now(),
        ]);
    }

    /**
     * Create workflow entry for process step
     */
    public static function createProcessStep(
        int $bookingId,
        string $step,
        string $status,
        int $userId,
        string $notes = null
    ): self {
        return self::create([
            'booking_id' => $bookingId,
            'step' => $step,
            'status' => $status,
            'processed_by' => $userId,
            'processed_at' => now(),
            'notes' => $notes,
        ]);
    }
}
