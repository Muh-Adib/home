<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;

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
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'datetime',
        'due_date' => 'datetime',
        'verified_at' => 'datetime',
        'gateway_response' => 'array',
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

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
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
            get: fn () => 'Rp ' . number_format($this->amount, 0, ',', '.')
        );
    }

    protected function statusColor(): Attribute
    {
        return Attribute::make(
            get: fn () => match($this->payment_status) {
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
        $lastPayment = self::whereDate('created_at', today())
                          ->latest('id')
                          ->first();
        
        $sequence = $lastPayment ? 
                   intval(substr($lastPayment->payment_number, -3)) + 1 : 1;
        
        return $prefix . $date . sprintf('%03d', $sequence);
    }

    // Helper Methods
    public function canBeVerified(): bool
    {
        return $this->payment_status === 'pending';
    }

    public function verify(User $verifier, string $notes = null): bool
    {
        if (!$this->canBeVerified()) {
            return false;
        }

        $this->update([
            'payment_status' => 'verified',
            'verified_by' => $verifier->id,
            'verified_at' => now(),
            'verification_notes' => $notes,
        ]);

        // Update booking payment status
        $this->booking->updatePaymentStatus();

        return true;
    }

    public function getRouteKeyName(): string
    {
        return 'payment_number';
    }
}
