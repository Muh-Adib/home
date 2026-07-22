<?php

namespace App\Models;

use App\Actions\Payment\VerifyPaymentAction;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_number',
        'booking_id',
        'payment_method_id',
        'amount',
        'payment_type',
        'payment_method',
        'payment_date',
        'due_date',
        'reference_number',
        'bank_name',
        'account_number',
        'account_name',
        'payment_status',
        'verification_notes',
        'description',
        'attachment_path',
        'processed_by',
        'verified_by',
        'verified_at',
        'gateway_transaction_id',
        'gateway_response',
        'sender_account_name',
        'sender_account_number',
        'sender_bank_name',
        'ipaymu_session_id',
        'ipaymu_payment_url',
        'ipaymu_expired_at',
        'status',
        'unique_code',
        'expected_amount',
        'matched_mutation_id',
        'matched_at',
        'matched_by',
        'reverification_status',
        'reverified_by',
        'reverified_at',
        'reverification_notes',
        'reverification_action',
    ];

    protected $casts = [
        'amount' => 'integer',
        'payment_date' => 'datetime',
        'due_date' => 'datetime',
        'verified_at' => 'datetime',
        'gateway_response' => 'array',
        'ipaymu_expired_at' => 'datetime',
        'unique_code' => 'integer',
        'expected_amount' => 'integer',
        'matched_mutation_id' => 'integer',
        'matched_at' => 'datetime',
        'matched_by' => 'integer',
        'reverified_at' => 'datetime',
    ];

    protected $appends = [
        'attachment_filename',
        'attachment_full_path',
        'attachment_size',
        'attachment_type',
        'attachment_exists',
    ];

    // Boot method
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($payment) {
            if (empty($payment->payment_number)) {
                $payment->payment_number = self::generatePaymentNumber();
            }
        });

        static::saving(function ($payment) {
            // Sinkronkan status berdasarkan payment_status jika status tidak diubah secara manual
            if ($payment->isDirty('payment_status') && ! $payment->isDirty('status')) {
                if ($payment->payment_status === 'verified') {
                    $payment->status = 'cocok';
                } elseif ($payment->payment_status === 'failed') {
                    $payment->status = 'ditolak';
                } elseif ($payment->payment_status === 'pending') {
                    $payment->status = 'menunggu';
                }
            }

            // Sinkronkan payment_status berdasarkan status jika payment_status tidak diubah secara manual
            if ($payment->isDirty('status') && ! $payment->isDirty('payment_status')) {
                if ($payment->status === 'cocok' || $payment->status === 'completed') {
                    $payment->payment_status = 'verified';
                } elseif ($payment->status === 'ditolak' || $payment->status === 'failed') {
                    $payment->payment_status = 'failed';
                } elseif ($payment->status === 'menunggu') {
                    $payment->payment_status = 'pending';
                }
            }
        });
    }

    // Relationships
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function reverifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reverified_by');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }

    public function income()
    {
        return $this->hasOne(Income::class);
    }

    public function refundRequests(): HasMany
    {
        return $this->hasMany(RefundRequest::class);
    }

    // Accessors for attachment information
    public function getAttachmentFilenameAttribute(): ?string
    {
        if (! $this->attachment_path) {
            return null;
        }

        return basename($this->attachment_path);
    }

    public function getAttachmentFullPathAttribute(): ?string
    {
        if (! $this->attachment_path) {
            return null;
        }

        return asset('storage/'.$this->attachment_path);
    }

    public function getAttachmentSizeAttribute(): ?int
    {
        if (! $this->attachment_path) {
            return null;
        }

        $fullPath = storage_path('app/public/'.$this->attachment_path);

        if (file_exists($fullPath)) {
            return filesize($fullPath);
        }

        return null;
    }

    public function getAttachmentTypeAttribute(): ?string
    {
        if (! $this->attachment_path) {
            return null;
        }

        $extension = pathinfo($this->attachment_path, PATHINFO_EXTENSION);

        return match (strtolower($extension)) {
            'jpg', 'jpeg', 'png', 'gif', 'webp' => 'image',
            'pdf' => 'pdf',
            'doc', 'docx' => 'document',
            'xls', 'xlsx' => 'spreadsheet',
            default => 'file'
        };
    }

    public function getAttachmentExistsAttribute(): bool
    {
        if (! $this->attachment_path) {
            return false;
        }

        return \Storage::disk('public')->exists($this->attachment_path);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('payment_status', 'pending');
    }

    public function scopeVerified($query)
    {
        return $query->where('payment_status', 'verified');
    }

    public function scopeByType($query, $type)
    {
        return $query->where('payment_type', $type);
    }

    // Accessors
    protected function formattedAmount(): Attribute
    {
        return Attribute::make(
            get: fn () => 'Rp '.number_format((int) $this->amount, 0, ',', '.')
        );
    }

    protected function statusColor(): Attribute
    {
        return Attribute::make(
            get: fn () => match ($this->payment_status) {
                'pending' => 'yellow',
                'verified' => 'green',
                'failed' => 'red',
                'cancelled' => 'gray',
                default => 'gray'
            }
        );
    }

    // Static Methods
    public static function generatePaymentNumber(): string
    {
        $prefix = 'PAY';
        $date = now()->format('ymd');

        // For SQLite (tests), avoid lockForUpdate
        if (config('database.default') === 'sqlite') {
            $lastPayment = self::whereDate('created_at', today())
                ->orderBy('id', 'desc')
                ->first();

            $sequence = $lastPayment
                ? intval(substr($lastPayment->payment_number, -3)) + 1
                : 1;

            return $prefix.$date.sprintf('%03d', $sequence);
        }

        return \DB::transaction(function () use ($prefix, $date) {
            $lastPayment = self::whereDate('created_at', today())
                ->lockForUpdate()
                ->orderBy('id', 'desc')
                ->first();

            $sequence = $lastPayment
                ? intval(substr($lastPayment->payment_number, -3)) + 1
                : 1;

            return $prefix.$date.sprintf('%03d', $sequence);
        });
    }

    // Helper Methods
    public function canBeVerified(): bool
    {
        return $this->payment_status === 'pending';
    }

    public function verify(User $verifier, ?string $notes = null): bool
    {
        if (! $this->canBeVerified()) {
            return false;
        }

        return app(VerifyPaymentAction::class)->execute($this, $verifier, $notes);
    }

    public function getRouteKeyName(): string
    {
        return 'payment_number';
    }

    /**
     * Check if payment is via gateway
     */
    public function isGatewayPayment(): bool
    {
        return ! empty($this->gateway_transaction_id) || ! empty($this->ipaymu_session_id);
    }

    /**
     * Check if payment is via iPaymu
     */
    public function isIpaymuPayment(): bool
    {
        return ! empty($this->ipaymu_session_id) ||
            ($this->paymentMethod && $this->paymentMethod->code === 'ipaymu');
    }

    /**
     * Check if payment link is expired
     */
    public function isPaymentLinkExpired(): bool
    {
        if (! $this->ipaymu_expired_at) {
            return false;
        }

        return now()->isAfter($this->ipaymu_expired_at);
    }

    /**
     * Mark payment as paid via gateway
     */
    public function markAsPaidViaGateway(): bool
    {
        if ($this->payment_status === 'verified') {
            return false; // Already verified
        }

        return $this->update([
            'payment_status' => 'verified',
            'verified_at' => now(),
            'verified_by' => null, // Auto verified by gateway
        ]);
    }

    /**
     * Mark payment as failed via gateway
     */
    public function markAsFailedViaGateway(): bool
    {
        return $this->update([
            'payment_status' => 'failed',
        ]);
    }

    /**
     * Scope untuk gateway payments
     */
    public function scopeGatewayPayments($query)
    {
        return $query->whereNotNull('gateway_transaction_id')
            ->orWhereNotNull('ipaymu_session_id');
    }

    /**
     * Scope untuk iPaymu payments
     */
    public function scopeIpaymuPayments($query)
    {
        return $query->whereNotNull('ipaymu_session_id')
            ->orWhereHas('paymentMethod', function ($q) {
                $q->where('code', 'ipaymu');
            });
    }

    /**
     * Get the bank mutation matched with this payment.
     */
    public function matchedMutation(): BelongsTo
    {
        return $this->belongsTo(BankMutation::class, 'matched_mutation_id');
    }

    /**
     * Get the user who matched/verified this payment.
     */
    public function matchedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'matched_by');
    }
}
