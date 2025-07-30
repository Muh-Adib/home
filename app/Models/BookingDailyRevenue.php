<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingDailyRevenue extends Model
{
    use HasFactory;

    protected $table = 'booking_daily_revenue';

    protected $fillable = [
        'booking_id',
        'property_id',
        'tanggal',
        'amount',
    ];
} 