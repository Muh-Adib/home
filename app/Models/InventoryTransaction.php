<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id', 'property_id', 'stock_id', 'transaction_number', 'transaction_type',
        'quantity', 'quantity_before', 'quantity_after', 'unit_cost', 'total_cost',
        'reason', 'notes', 'reference_number', 'from_property_id', 'from_location',
        'to_property_id', 'to_location', 'booking_id', 'cleaning_task_id',
        'created_by', 'approved_by', 'approved_at', 'status', 'expiry_date', 'serial_number', 'photos'
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'approved_at' => 'datetime',
        'expiry_date' => 'date',
        'photos' => 'array',
    ];

    const TRANSACTION_TYPES = [
        'stock_in' => 'Stock In',
        'stock_out' => 'Stock Out',
        'transfer' => 'Transfer',
        'adjustment' => 'Adjustment',
        'usage' => 'Usage',
        'maintenance' => 'Maintenance',
        'disposal' => 'Disposal',
    ];

    public function item(): BelongsTo { return $this->belongsTo(InventoryItem::class); }
    public function property(): BelongsTo { return $this->belongsTo(Property::class); }
    public function stock(): BelongsTo { return $this->belongsTo(InventoryStock::class); }
    public function booking(): BelongsTo { return $this->belongsTo(Booking::class); }
    public function cleaningTask(): BelongsTo { return $this->belongsTo(CleaningTask::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }

    public function scopeByType($query, $type) { return $query->where('transaction_type', $type); }
    public function scopeByProperty($query, $propertyId) { return $query->where('property_id', $propertyId); }

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($transaction) {
            if (empty($transaction->transaction_number)) {
                $transaction->transaction_number = static::generateTransactionNumber();
            }
        });
    }

    public static function generateTransactionNumber(): string
    {
        $date = now()->format('ymd');
        $lastTransaction = static::whereDate('created_at', now())->orderBy('id', 'desc')->first();
        $sequence = $lastTransaction ? (int) substr($lastTransaction->transaction_number, -3) + 1 : 1;
        return 'TXN-' . $date . '-' . str_pad($sequence, 3, '0', STR_PAD_LEFT);
    }
}
