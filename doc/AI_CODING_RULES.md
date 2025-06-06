# AI Coding Rules & Development Guidelines (Optimized)
## Property Management System - Laravel 12.x & React 18+ (Existing Structure)

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES

### 1.1 Primary Goals
```
🎯 BUSINESS OBJECTIVES:
- Build scalable property booking system
- Ensure 99.9% uptime and sub-200ms response times
- Support 10,000+ concurrent users
- Maintain data consistency and security

🏗️ TECHNICAL OBJECTIVES:
- Follow existing codebase structure and patterns
- Maintain consistency dengan established conventions
- Preserve existing component architecture
- Enhance performance dan scalability
```

### 1.2 Performance Targets
```
Backend (Laravel 12.x):
- API response time: < 200ms (95th percentile)
- Database queries: < 50ms average
- Memory usage: < 256MB per request
- Cache hit ratio: > 90%

Frontend (React 18+ + Inertia.js):
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Bundle size: < 500KB (gzipped)
```

---

## 2. EXISTING PROJECT STRUCTURE COMPLIANCE

### 2.1 Established Frontend Architecture
```
CURRENT TECH STACK:
✅ Laravel + Inertia.js + React + TypeScript
✅ Shadcn UI components (lengkap)
✅ Tailwind CSS dengan dark mode
✅ Font: Instrument Sans
✅ Lucide React icons
✅ Class Variance Authority (CVA)

FOLDER STRUCTURE (HARUS DIIKUTI):
resources/js/
├── components/
│   ├── ui/ (Shadcn UI - JANGAN DIUBAH)
│   └── [business-specific components]
├── layouts/
│   ├── app/ (app layouts)
│   ├── auth/ (auth layouts) 
│   └── settings/ (settings layouts)
├── pages/ (Inertia pages)
├── types/ (TypeScript definitions)
├── hooks/ (custom hooks)
└── lib/ (utilities)
```

### 2.2 Component Development Guidelines (Follow Existing Patterns)
```tsx
// IKUTI PATTERN INI: components/ui sudah established
// JANGAN buat ulang components yang sudah ada

// EXISTING UI COMPONENTS (GUNAKAN INI):
// - Button, Input, Label, Card, Alert, Badge
// - Dialog, Dropdown, Select, Checkbox
// - Sidebar, Navigation, Avatar, Skeleton
// - Dan 20+ components lainnya

// CONTOH: Property card component (TAMBAH DI components/)
// components/property-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type Property } from '@/types';

interface PropertyCardProps {
    property: Property;
    onSelect?: (property: Property) => void;
    className?: string;
}

export function PropertyCard({ property, onSelect, className }: PropertyCardProps) {
    return (
        <Card className={cn("cursor-pointer hover:shadow-lg transition-shadow", className)}>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    {property.name}
                    <Badge variant={property.is_available ? "default" : "secondary"}>
                        {property.is_available ? "Available" : "Booked"}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    {property.address}
                </p>
                <div className="flex items-center justify-between">
                    <span className="font-semibold">
                        {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                        }).format(property.base_rate)}/night
                    </span>
                    <Button 
                        onClick={() => onSelect?.(property)}
                        size="sm"
                    >
                        View Details
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
```

### 2.3 TypeScript Types Extensions (Tambah ke types/index.d.ts)
```tsx
// IKUTI PATTERN EXISTING types/index.d.ts
// TAMBAHKAN types untuk Property Management System

// EXTEND EXISTING User interface
export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    role?: 'admin' | 'staff' | 'owner' | 'guest'; // TAMBAH role
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

// TAMBAHKAN interface baru untuk PMS
export interface Property {
    id: number;
    name: string;
    description: string;
    address: string;
    capacity: number;
    capacity_max: number;
    base_rate: number;
    extra_bed_rate: number;
    is_active: boolean;
    is_featured: boolean;
    amenities: Amenity[];
    media: PropertyMedia[];
    created_at: string;
    updated_at: string;
}

export interface Booking {
    id: number;
    booking_number: string;
    property_id: number;
    property: Property;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_count: number;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    check_in: string;
    check_out: string;
    total_amount: number;
    dp_amount: number;
    dp_paid_amount: number;
    booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    payment_status: 'pending' | 'partial' | 'paid' | 'failed';
    special_requests?: string;
    created_at: string;
    updated_at: string;
}

export interface Amenity {
    id: number;
    name: string;
    icon?: string;
    category: string;
}

export interface PropertyMedia {
    id: number;
    property_id: number;
    file_path: string;
    alt_text?: string;
    is_cover: boolean;
    category: 'exterior' | 'interior' | 'amenity' | 'view';
}

// EXTEND SharedData untuk PMS
export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    // TAMBAH PMS specific data
    property_stats?: {
        total_properties: number;
        total_bookings: number;
        total_revenue: number;
        occupancy_rate: number;
    };
    [key: string]: unknown;
}
```

### 2.4 Page Structure (Follow Existing Pattern)
```tsx
// IKUTI PATTERN: pages/dashboard.tsx
// CONTOH: pages/properties/index.tsx
import AppLayout from '@/layouts/app-layout';
import { Heading } from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { type BreadcrumbItem, type Property } from '@/types';
import { PropertyCard } from '@/components/property-card';

interface PropertiesIndexProps {
    properties: Property[];
}

export default function PropertiesIndex({ properties }: PropertiesIndexProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Properties', href: '/properties' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Heading>Properties Management</Heading>
                    <Button>
                        <Plus className="h-4 w-4" />
                        Add Property
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                        <PropertyCard 
                            key={property.id} 
                            property={property}
                            onSelect={(property) => {
                                // Handle property selection
                                window.location.href = `/properties/${property.id}`;
                            }}
                        />
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
```

---

## 3. LARAVEL BACKEND DEVELOPMENT (Follow Laravel 12.x)

### 3.1 Terminal Commands for File Generation (Updated)
```bash
# IKUTI STRUKTUR LARAVEL 12.x yang sudah established
# Generate models sesuai database yang sudah ada

# Create Property Management models
php artisan make:model Property -mfsr
php artisan make:model Booking -mfsr --uuid
php artisan make:model Payment -mfsr
php artisan make:model PropertyMedia -mf
php artisan make:model Amenity -mfsr
php artisan make:model BookingGuest -mf

# API Controllers dengan Inertia compatibility
php artisan make:controller PropertyController --model=Property
php artisan make:controller BookingController --model=Booking
php artisan make:controller PaymentController --model=Payment
php artisan make:controller Api/PropertyApiController --api --model=Property
php artisan make:controller Api/BookingApiController --api --model=Booking

# Services for business logic
php artisan make:service BookingService
php artisan make:service PropertyService
php artisan make:service PaymentService
php artisan make:service MediaService

# Form Requests
php artisan make:request StorePropertyRequest
php artisan make:request StoreBookingRequest
php artisan make:request UpdateBookingRequest

# Resources for API responses
php artisan make:resource PropertyResource
php artisan make:resource BookingResource
php artisan make:resource BookingCollection

# Jobs dan Events
php artisan make:job ProcessBookingPayment
php artisan make:job SendBookingNotification
php artisan make:event BookingCreated
php artisan make:listener SendBookingConfirmation --event=BookingCreated

# Validation Rules
php artisan make:rule BookingAvailabilityRule
php artisan make:rule PropertyCapacityRule
```

### 3.2 Enhanced Controller Pattern (Inertia Compatible)
```php
// app/Http/Controllers/PropertyController.php
// IKUTI PATTERN: Return Inertia pages

<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Services\PropertyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PropertyController extends Controller
{
    public function __construct(
        private readonly PropertyService $propertyService
    ) {}

    public function index(Request $request): Response
    {
        $properties = $this->propertyService->getProperties(
            $request->only(['search', 'filter', 'sort'])
        );

        return Inertia::render('properties/index', [
            'properties' => $properties,
            'filters' => $request->only(['search', 'filter']),
        ]);
    }

    public function show(Property $property): Response
    {
        $property->load(['media', 'amenities', 'bookings' => function ($query) {
            $query->where('booking_status', '!=', 'cancelled')
                  ->where('check_out', '>', now());
        }]);

        return Inertia::render('properties/show', [
            'property' => $property,
            'availability_calendar' => $this->propertyService->getAvailabilityCalendar($property),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('properties/create', [
            'amenities' => $this->propertyService->getAllAmenities(),
        ]);
    }

    public function store(StorePropertyRequest $request)
    {
        $property = $this->propertyService->createProperty($request->validated());

        return redirect()->route('properties.show', $property)
                        ->with('message', 'Property created successfully');
    }
}
```

### 3.3 Service Layer dengan Business Logic
```php
// app/Services/BookingService.php
// IMPLEMENT business rules sesuai requirements

<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Property;
use App\Events\BookingCreated;
use App\Exceptions\BookingUnavailableException;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BookingService
{
    public function createBooking(array $data): Booking
    {
        // Validate property availability
        if (!$this->isPropertyAvailable($data['property_id'], $data['check_in'], $data['check_out'])) {
            throw new BookingUnavailableException('Property not available for selected dates');
        }

        // Calculate pricing
        $pricing = $this->calculateBookingPricing($data);
        $bookingData = array_merge($data, $pricing);

        return DB::transaction(function () use ($bookingData) {
            // Create booking
            $booking = Booking::create($bookingData);
            
            // Generate booking number
            $booking->update([
                'booking_number' => $this->generateBookingNumber($booking)
            ]);

            // Dispatch events
            event(new BookingCreated($booking));

            return $booking->fresh(['property']);
        });
    }

    public function calculateBookingPricing(array $data): array
    {
        $property = Property::findOrFail($data['property_id']);
        $checkIn = Carbon::parse($data['check_in']);
        $checkOut = Carbon::parse($data['check_out']);
        $nights = $checkIn->diffInDays($checkOut);
        $guestCount = $data['guest_count'];

        // Base calculation
        $baseAmount = $property->base_rate * $nights;
        
        // Extra bed calculation
        $extraBeds = max(0, $guestCount - $property->capacity);
        $extraBedAmount = $extraBeds * $property->extra_bed_rate * $nights;
        
        // Service charge (10%)
        $serviceCharge = ($baseAmount + $extraBedAmount) * 0.10;
        
        // Tax (11%)
        $taxAmount = ($baseAmount + $extraBedAmount + $serviceCharge) * 0.11;
        
        $totalAmount = $baseAmount + $extraBedAmount + $serviceCharge + $taxAmount;

        return [
            'base_amount' => $baseAmount,
            'extra_bed_amount' => $extraBedAmount,
            'service_charge' => $serviceCharge,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
            'nights' => $nights,
        ];
    }

    public function isPropertyAvailable(int $propertyId, string $checkIn, string $checkOut): bool
    {
        $conflictingBookings = Booking::where('property_id', $propertyId)
            ->where('booking_status', '!=', 'cancelled')
            ->where(function ($query) use ($checkIn, $checkOut) {
                $query->whereBetween('check_in', [$checkIn, $checkOut])
                      ->orWhereBetween('check_out', [$checkIn, $checkOut])
                      ->orWhere(function ($q) use ($checkIn, $checkOut) {
                          $q->where('check_in', '<=', $checkIn)
                            ->where('check_out', '>=', $checkOut);
                      });
            })
            ->exists();

        return !$conflictingBookings;
    }

    private function generateBookingNumber(Booking $booking): string
    {
        return 'BK' . $booking->created_at->format('Ymd') . str_pad($booking->id, 6, '0', STR_PAD_LEFT);
    }
}
```

---

## 4. REACT COMPONENTS DEVELOPMENT (Follow Existing Structure)

### 4.1 Business Components (Tambah ke components/)
```tsx
// components/booking-form.tsx
// IKUTI PATTERN: Gunakan existing UI components

import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Building2, Users, Calculator } from 'lucide-react';
import { type Property, type User } from '@/types';

interface BookingFormData {
    property_id: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_count: number;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    check_in: string;
    check_out: string;
    special_requests?: string;
}

interface BookingFormProps {
    property: Property;
    user?: User;
    onSuccess?: () => void;
}

export function BookingForm({ property, user, onSuccess }: BookingFormProps) {
    const [guestBreakdown, setGuestBreakdown] = useState({
        male: 0,
        female: 0,
        children: 0,
    });

    const form = useForm<BookingFormData>({
        property_id: property.id,
        guest_name: user?.name || '',
        guest_email: user?.email || '',
        guest_phone: '',
        guest_count: 1,
        guest_male: 0,
        guest_female: 0,
        guest_children: 0,
        check_in: '',
        check_out: '',
        special_requests: '',
    });

    // Auto-calculate guest count from breakdown
    const updateGuestBreakdown = (field: keyof typeof guestBreakdown, value: number) => {
        const newBreakdown = { ...guestBreakdown, [field]: value };
        setGuestBreakdown(newBreakdown);
        
        const totalGuests = Object.values(newBreakdown).reduce((sum, count) => sum + count, 0);
        
        form.setData({
            ...form.data,
            [`guest_${field}`]: value,
            guest_count: totalGuests,
        });
    };

    // Capacity validation
    const exceedsCapacity = form.data.guest_count > property.capacity;
    const exceedsMaxCapacity = form.data.guest_count > property.capacity_max;
    const extraBeds = exceedsCapacity ? Math.ceil((form.data.guest_count - property.capacity) / 2) : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (exceedsMaxCapacity) {
            return;
        }

        form.post(route('bookings.store'), {
            onSuccess: () => {
                onSuccess?.();
            },
        });
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Book {property.name}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Guest Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Guest Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="guest_name">Full Name *</Label>
                                <Input
                                    id="guest_name"
                                    value={form.data.guest_name}
                                    onChange={(e) => form.setData('guest_name', e.target.value)}
                                    className={form.errors.guest_name ? 'border-destructive' : ''}
                                />
                                {form.errors.guest_name && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{form.errors.guest_name}</AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="guest_email">Email *</Label>
                                <Input
                                    id="guest_email"
                                    type="email"
                                    value={form.data.guest_email}
                                    onChange={(e) => form.setData('guest_email', e.target.value)}
                                    className={form.errors.guest_email ? 'border-destructive' : ''}
                                />
                                {form.errors.guest_email && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{form.errors.guest_email}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Guest Breakdown */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            <h3 className="text-lg font-semibold">Guest Breakdown</h3>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="guest_male">Male</Label>
                                <Input
                                    id="guest_male"
                                    type="number"
                                    min="0"
                                    value={guestBreakdown.male}
                                    onChange={(e) => updateGuestBreakdown('male', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guest_female">Female</Label>
                                <Input
                                    id="guest_female"
                                    type="number"
                                    min="0"
                                    value={guestBreakdown.female}
                                    onChange={(e) => updateGuestBreakdown('female', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guest_children">Children</Label>
                                <Input
                                    id="guest_children"
                                    type="number"
                                    min="0"
                                    value={guestBreakdown.children}
                                    onChange={(e) => updateGuestBreakdown('children', Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                Total Guests: {form.data.guest_count}
                            </span>
                            {exceedsCapacity && !exceedsMaxCapacity && (
                                <Badge variant="secondary">
                                    <Calculator className="h-3 w-3 mr-1" />
                                    Extra beds needed: {extraBeds}
                                </Badge>
                            )}
                        </div>

                        {exceedsMaxCapacity && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    Maximum capacity exceeded. This property can accommodate up to {property.capacity_max} guests.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => form.reset()}
                            disabled={form.processing}
                        >
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing || exceedsMaxCapacity}
                        >
                            {form.processing ? 'Creating...' : 'Create Booking'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
```

---

## 5. PERFORMANCE OPTIMIZATION (Maintain Existing Performance)

### 5.1 Laravel Optimization (Keep Current Performance)
```php
// app/Services/CacheService.php
// TAMBAHKAN caching service untuk PMS

class CacheService
{
    private const CACHE_TAGS = [
        'properties' => ['properties'],
        'bookings' => ['bookings'],
        'availability' => ['properties', 'bookings'],
    ];

    public function remember(string $key, int $ttl, callable $callback, array $tags = []): mixed
    {
        if (empty($tags)) {
            return Cache::remember($key, $ttl, $callback);
        }
        return Cache::tags($tags)->remember($key, $ttl, $callback);
    }

    public function invalidateByTags(array $tags): void
    {
        Cache::tags($tags)->flush();
    }

    public function warmupPropertyAvailability(Property $property): void
    {
        // Warm up availability for next 90 days
        $startDate = now();
        $endDate = now()->addDays(90);
        
        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $this->remember(
                "property_availability_{$property->id}_{$date->format('Y-m-d')}",
                3600,
                fn() => $this->isPropertyAvailableOn($property, $date),
                self::CACHE_TAGS['availability']
            );
        }
    }
}
```

### 5.2 React Optimization (Follow Existing Patterns)
```tsx
// hooks/use-optimized-search.ts
// CUSTOM hook untuk optimized search

import { useState, useMemo, useCallback } from 'react';
import { debounce } from 'lodash';

export function useOptimizedSearch<T>(
    items: T[],
    searchField: keyof T,
    delay = 300
) {
    const [searchQuery, setSearchQuery] = useState('');
    
    const debouncedSearch = useMemo(
        () => debounce((query: string) => setSearchQuery(query), delay),
        [delay]
    );

    const filteredItems = useMemo(() => {
        if (!searchQuery) return items;
        
        return items.filter(item => 
            String(item[searchField])
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
        );
    }, [items, searchField, searchQuery]);

    const handleSearch = useCallback((query: string) => {
        debouncedSearch(query);
    }, [debouncedSearch]);

    return {
        filteredItems,
        handleSearch,
        searchQuery,
    };
}
```

---

## 6. TESTING STANDARDS (Follow Laravel/React Best Practices)

### 6.1 Laravel Testing (Use Pest)
```php
// tests/Feature/BookingFlowTest.php

test('can create booking with guest breakdown')
    ->expect(function () {
        $property = Property::factory()->create(['capacity' => 4, 'capacity_max' => 8]);
        $user = User::factory()->create();
        
        $bookingData = [
            'property_id' => $property->id,
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '+628123456789',
            'guest_count' => 6,
            'guest_male' => 3,
            'guest_female' => 2,
            'guest_children' => 1,
            'check_in' => now()->addDays(7)->format('Y-m-d'),
            'check_out' => now()->addDays(10)->format('Y-m-d'),
        ];

        return $this->actingAs($user)
                   ->post(route('bookings.store'), $bookingData);
    })
    ->assertRedirect()
    ->and(fn() => Booking::where('guest_email', 'john@example.com')->exists())
    ->toBeTrue();

test('calculates extra bed pricing correctly')
    ->expect(function () {
        $property = Property::factory()->create([
            'capacity' => 4,
            'base_rate' => 500000,
            'extra_bed_rate' => 150000,
        ]);

        $service = app(BookingService::class);
        $pricing = $service->calculateBookingPricing([
            'property_id' => $property->id,
            'guest_count' => 6, // 2 extra guests = 1 extra bed
            'check_in' => '2025-01-01',
            'check_out' => '2025-01-03', // 2 nights
        ]);

        return $pricing;
    })
    ->toMatchArray([
        'base_amount' => 1000000, // 500k * 2 nights
        'extra_bed_amount' => 300000, // 150k * 2 nights
        'nights' => 2,
    ]);
```

### 6.2 React Testing (Use Vitest + Testing Library)
```tsx
// components/__tests__/booking-form.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingForm } from '../booking-form';

const mockProperty = {
    id: 1,
    name: 'Villa Paradise',
    capacity: 4,
    capacity_max: 8,
    base_rate: 500000,
    extra_bed_rate: 150000,
};

describe('BookingForm', () => {
    it('calculates guest breakdown correctly', async () => {
        const user = userEvent.setup();
        render(<BookingForm property={mockProperty} />);
        
        await user.type(screen.getByLabelText(/male/i), '2');
        await user.type(screen.getByLabelText(/female/i), '1');
        await user.type(screen.getByLabelText(/children/i), '1');
        
        expect(screen.getByText(/total guests: 4/i)).toBeInTheDocument();
    });

    it('shows extra bed notification when capacity exceeded', async () => {
        const user = userEvent.setup();
        render(<BookingForm property={mockProperty} />);
        
        await user.type(screen.getByLabelText(/male/i), '4');
        await user.type(screen.getByLabelText(/female/i), '2');
        
        expect(screen.getByText(/extra beds needed/i)).toBeInTheDocument();
    });

    it('prevents submission when max capacity exceeded', async () => {
        const user = userEvent.setup();
        render(<BookingForm property={mockProperty} />);
        
        await user.type(screen.getByLabelText(/male/i), '6');
        await user.type(screen.getByLabelText(/female/i), '4');
        
        const submitButton = screen.getByRole('button', { name: /create booking/i });
        expect(submitButton).toBeDisabled();
    });
});
```

---

## 7. SECURITY & BEST PRACTICES (Maintain Existing Security)

### 7.1 Laravel Security (Follow Current Patterns)
```php
// app/Http/Middleware/BookingAuthorizationMiddleware.php
// TAMBAHKAN middleware untuk booking authorization

class BookingAuthorizationMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $booking = $request->route('booking');
        $user = $request->user();
        
        // Check if user can access this booking
        if (!$this->canAccessBooking($user, $booking)) {
            abort(403, 'Unauthorized access to booking');
        }
        
        return $next($request);
    }
    
    private function canAccessBooking(User $user, Booking $booking): bool
    {
        // Owner can access their property bookings
        if ($booking->property->owner_id === $user->id) {
            return true;
        }
        
        // Guest can access their own booking
        if ($booking->guest_email === $user->email) {
            return true;
        }
        
        // Admin/Staff can access all bookings
        if (in_array($user->role, ['admin', 'staff'])) {
            return true;
        }
        
        return false;
    }
}
```

---

## 8. CODE REVIEW CHECKLIST (Updated for Existing Structure)

### 8.1 Structure Compliance Checklist
- [ ] Mengikuti folder structure yang sudah ada
- [ ] Menggunakan existing Shadcn UI components
- [ ] TypeScript types ditambahkan ke types/index.d.ts
- [ ] Pages menggunakan existing layout patterns
- [ ] Components menggunakan cn() utility function
- [ ] Inertia.js patterns diikuti dengan benar

### 8.2 Laravel Checklist (Enhanced)
- [ ] Models menggunakan proper relationships
- [ ] Controllers return Inertia responses untuk web
- [ ] API controllers untuk AJAX requests
- [ ] Service layer untuk business logic
- [ ] Form requests untuk validation
- [ ] Events dan listeners untuk async tasks
- [ ] Cache invalidation strategies

### 8.3 React Checklist (Enhanced)
- [ ] Components menggunakan existing UI library
- [ ] TypeScript interfaces properly defined
- [ ] Props destructuring dengan proper types
- [ ] Performance optimization (memo, useMemo, useCallback)
- [ ] Error boundaries implemented
- [ ] Accessibility attributes present
- [ ] Responsive design using Tailwind classes

---

**🎯 CRITICAL GUIDELINES:**

1. **JANGAN UBAH** struktur folder yang sudah ada
2. **GUNAKAN** Shadcn UI components yang sudah tersedia
3. **IKUTI** TypeScript patterns yang established
4. **MAINTAIN** existing performance dan security standards
5. **EXTEND** existing functionality, jangan rebuild
6. **TEST** menggunakan tools yang sudah disetup

**📚 REFERENSI DOKUMENTASI:**
- [Laravel 12.x Frontend Documentation](https://laravel.com/docs/12.x/frontend)
- Existing codebase structure di resources/
- Established component patterns
- Current TypeScript definitions

---

**AI Rules Version**: 2.1 (Structure-Compliant)  
**Focus**: Follow Existing Architecture  
**Last Updated**: 2025  
**Compliance**: Existing Project Structure 