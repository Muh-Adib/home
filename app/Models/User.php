<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
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
        'last_login_at',
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
            'property_manager', 
            'front_desk', 
            'housekeeping', 
            'finance'
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
        return $this->role === 'super_admin';
    }

    public function isStaff(): bool
    {
        return in_array($this->role, [
            'super_admin', 
            'property_manager', 
            'front_desk', 
            'housekeeping', 
            'finance'
        ]);
    }

    public function canManageProperty(): bool
    {
        return in_array($this->role, [
            'super_admin', 
            'property_owner', 
            'property_manager'
        ]);
    }

    public function canManageBookings(): bool
    {
        return in_array($this->role, [
            'super_admin', 
            'property_manager', 
            'front_desk'
        ]);
    }

    public function canManagePayments(): bool
    {
        return in_array($this->role, [
            'super_admin', 
            'property_manager', 
            'finance'
        ]);
    }

    public function canViewFinancials(): bool
    {
        return in_array($this->role, [
            'super_admin', 
            'property_owner', 
            'property_manager', 
            'finance'
        ]);
    }

    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }
}
