<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RawAttendance extends Model
{
    protected $fillable = [
        'user_id',
        'fingerprint_id',
        'date',
        'check_in',
        'check_out',
        'raw_payload',
        'imported_by',
    ];

    protected $casts = [
        'date' => 'date',
        'raw_payload' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function importer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }
}
