<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'country',
        'role',
        'status',
        'gender',
        'avatar',
        'last_login_at',
        'fingerprint_id',
        'shift_start_time',
        'shift_end_time',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // Relationships
    public function housekeepingSchedules(): HasMany
    {
        return $this->hasMany(HousekeepingSchedule::class);
    }

    public function bookingCleanings(): BelongsToMany
    {
        return $this->belongsToMany(Booking::class, 'booking_cleaners')
            ->withPivot('points')
            ->withTimestamps();
    }

    public function customTasks(): BelongsToMany
    {
        return $this->belongsToMany(CustomTask::class, 'custom_task_members')
            ->withPivot('points')
            ->withTimestamps();
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function ownedProperties(): HasMany
    {
        return $this->hasMany(Property::class, 'owner_id');
    }

    public function createdBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'created_by');
    }

    public function verifiedBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'verified_by');
    }

    public function cancelledBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'cancelled_by');
    }

    public function processedPayments(): HasMany
    {
        return $this->hasMany(Payment::class, 'processed_by');
    }

    public function verifiedPayments(): HasMany
    {
        return $this->hasMany(Payment::class, 'verified_by');
    }

    public function recordedExpenses(): HasMany
    {
        return $this->hasMany(PropertyExpense::class, 'recorded_by');
    }

    public function approvedExpenses(): HasMany
    {
        return $this->hasMany(PropertyExpense::class, 'approved_by');
    }

    public function generatedReports(): HasMany
    {
        return $this->hasMany(FinancialReport::class, 'generated_by');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByRole($query, $role)
    {
        return $query->where('role', $role);
    }

    public function scopeStaff($query)
    {
        return $query->whereIn('role', [
            'super_admin',
            'admin',
            'property_manager',
            'front_desk',
            'housekeeping',
            'finance',
            'content_creator',
        ]);
    }

    public function scopeOwners($query)
    {
        return $query->where('role', 'property_owner');
    }

    // Helper Methods
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles);
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['super_admin', 'admin']);
    }

    public function isStaff(): bool
    {
        return in_array($this->role, [
            'super_admin',
            'admin',
            'property_manager',
            'front_desk',
            'housekeeping',
            'finance',
            'content_creator',
        ]);
    }

    public function canManageProperty(): bool
    {
        return in_array($this->role, [
            'super_admin',
            'admin',
            'property_owner',
            'property_manager',
        ]);
    }

    public function canManageBookings(): bool
    {
        return in_array($this->role, [
            'super_admin',
            'admin',
            'property_manager',
            'front_desk',
        ]);
    }

    public function canManagePayments(): bool
    {
        return in_array($this->role, [
            'super_admin',
            'property_manager',
            'finance',
        ]);
    }

    public function canViewFinancials(): bool
    {
        return in_array($this->role, [
            'super_admin',
            'property_owner',
            'property_manager',
            'finance',
        ]);
    }

    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }
}
