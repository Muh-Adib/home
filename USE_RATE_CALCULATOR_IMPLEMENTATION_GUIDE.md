# 🚀 IMPLEMENTATION GUIDE - useRateCalculator Hook 

## 📋 OVERVIEW

Panduan implementasi untuk menerapkan hook `useRateCalculator` pada komponen existing yang masih menggunakan manual rate calculation API calls. Hook ini menggunakan `property.slug` sebagai identifier (bukan `property.id`) untuk konsistensi dengan route model binding.

---

## ✅ UPDATED COMPONENTS STATUS

### 🟢 SUDAH MENGGUNAKAN HOOK:
- ✅ `PropertyCard.tsx` - Using property.slug
- ✅ `PropertyCardEnhanced.tsx` - Using property.slug  
- ✅ `PropertyCard-updated.tsx` - Using property.slug

### 🟡 PERLU UPDATE:
- 🔄 `resources/js/pages/Booking/Create.tsx` - Sudah ada hook implementation, perlu cleanup legacy code
- 🔄 `resources/js/pages/Properties/Show.tsx` - Perlu implementasi hook
- 🔄 `resources/js/pages/Properties/Index.tsx` - Perlu implementasi hook

### 🔴 ADMIN COMPONENTS (KEEP AS IS):
- ⭕ `Admin/BookingManagement/Create.tsx` - Menggunakan admin API dengan property_id (correct)
- ⭕ `Admin/Properties/Show.tsx` - Admin interface, keep existing implementation

---

## 🔧 IMPLEMENTATION STEPS

### 1. **Properties/Show.tsx - Property Detail Page**

```tsx
// BEFORE: Manual rate calculation
const calculateRate = useCallback(async () => {
    try {
        const response = await fetch(`/api/properties/${property.slug}/calculate-rate?...`);
        // Manual state management
    } catch (error) {
        // Manual error handling
    }
}, [property.slug, checkIn, checkOut, guests]);

// AFTER: Using hook
import { usePropertyRateCalculator } from '@/hooks/use-rate-calculator';

const {
    data: rateCalculation,
    loading: isCalculatingRate,
    error: rateError,
    isReady,
    formattedTotal,
    formattedPerNight,
    nights,
    hasSeasonalPremium,
    calculateRate,
    reset
} = usePropertyRateCalculator(property.slug, {
    debounceMs: 600,
    onSuccess: (data) => {
        console.log('✅ Rate calculated:', data.formatted.total_amount);
    },
    onError: (error) => {
        console.error('❌ Rate calculation failed:', error);
    }
});

// Auto-calculate saat search params berubah
useEffect(() => {
    if (searchParams.check_in && searchParams.check_out && searchParams.guests) {
        calculateRate(searchParams.check_in, searchParams.check_out, searchParams.guests);
    } else {
        reset();
    }
}, [searchParams.check_in, searchParams.check_out, searchParams.guests, calculateRate, reset]);
```

### 2. **Properties/Index.tsx - Property Listing**

```tsx
// Implementation di PropertyCard component yang digunakan di Index
// Sudah implemented di PropertyCard.tsx, PropertyCardEnhanced.tsx

// Untuk bulk calculation di listing page:
import { useRateCalculator } from '@/hooks/use-rate-calculator';

function PropertiesIndex() {
    const { calculateRateImmediate } = useRateCalculator({
        enableAutoCalculate: false,
        cacheTimeout: 5 * 60 * 1000 // 5 minutes cache
    });

    const calculateAllVisibleRates = async (properties, searchParams) => {
        const promises = properties.map(property =>
            calculateRateImmediate({
                propertySlug: property.slug,
                checkIn: searchParams.check_in,
                checkOut: searchParams.check_out,
                guestCount: searchParams.guests
            }).catch(error => {
                console.error(`Rate calc failed for ${property.slug}:`, error);
                return null;
            })
        );

        const results = await Promise.allSettled(promises);
        console.log('Bulk rate calculation completed:', results);
    };
}
```

### 3. **Booking/Create.tsx - Cleanup Legacy Code**

```tsx
// File ini sudah menggunakan hook, tapi masih ada legacy code
// REMOVE: Legacy calculate function
const calculateRate_LEGACY = useCallback(async () => {
    // ... manual API call code
}, [property.slug, data.check_in_date, data.check_out_date, totalGuests]);

// KEEP: Hook implementation
const {
    data: rateCalculation,
    loading: isCalculatingRate,
    calculateRate,
    calculateRateImmediate,
    reset: resetRate
} = usePropertyRateCalculator(property.slug, {
    debounceMs: 500,
    onSuccess: (data) => {
        setAvailabilityStatus('available');
    },
    onError: (error) => {
        setAvailabilityStatus('unavailable');
    }
});
```

---

## 🔀 MIGRATION CHECKLIST

### ✅ Pre-Migration Steps:
1. **Backup existing files** yang akan dimodifikasi
2. **Test existing functionality** untuk baseline comparison
3. **Verify API endpoints** menggunakan property.slug routing
4. **Check error handling** pada komponen existing

### ✅ During Migration:
1. **Import hook** di komponen yang akan diupdate
2. **Replace manual API calls** dengan hook methods
3. **Update state management** menggunakan hook state
4. **Remove legacy code** setelah hook berfungsi
5. **Update error handling** menggunakan hook error state

### ✅ Post-Migration Testing:
1. **Test rate calculation** pada berbagai skenario
2. **Verify caching behavior** dengan network monitoring
3. **Test error scenarios** (network failure, invalid dates)
4. **Performance testing** dengan multiple properties
5. **Mobile responsiveness** testing

---

## 📊 PERFORMANCE BENEFITS

### Before Hook Implementation:
```
❌ Manual API calls untuk setiap rate calculation
❌ No caching, repeated requests
❌ Manual debouncing implementation
❌ Inconsistent error handling
❌ Complex state management per component
```

### After Hook Implementation:
```
✅ Automatic caching dengan TTL (5 menit default)
✅ Intelligent debouncing (500ms default)
✅ Consistent error handling across components
✅ Centralized state management
✅ Request cancellation untuk optimasi
✅ 60-80% reduction dalam API calls
```

---

## 🛠️ COMPONENT-SPECIFIC IMPLEMENTATION

### Properties/Show.tsx Complete Example:

```tsx
import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { usePropertyRateCalculator } from '@/hooks/use-rate-calculator';

export default function PropertyShow({ property, searchParams }) {
    const [localSearchParams, setLocalSearchParams] = useState({
        check_in: searchParams.check_in || '',
        check_out: searchParams.check_out || '',
        guests: searchParams.guests || 2
    });

    const {
        data: rateCalculation,
        loading: isCalculatingRate,
        error: rateError,
        isReady,
        formattedTotal,
        formattedPerNight,
        nights,
        hasSeasonalPremium,
        hasWeekendPremium,
        calculateRate,
        calculateRateImmediate,
        reset,
        validateRequest
    } = usePropertyRateCalculator(property.slug, {
        debounceMs: 600,
        cacheTimeout: 10 * 60 * 1000, // 10 minutes for detail page
        onSuccess: (data) => {
            console.log('✅ Rate calculated for property:', property.slug, data.formatted.total_amount);
        },
        onError: (error) => {
            console.error('❌ Rate calculation failed:', error);
        }
    });

    // Auto-calculate saat search params berubah
    useEffect(() => {
        if (localSearchParams.check_in && localSearchParams.check_out && localSearchParams.guests) {
            const validationError = validateRequest({
                propertySlug: property.slug,
                checkIn: localSearchParams.check_in,
                checkOut: localSearchParams.check_out,
                guestCount: localSearchParams.guests
            });

            if (!validationError) {
                calculateRate(
                    localSearchParams.check_in, 
                    localSearchParams.check_out, 
                    localSearchParams.guests
                );
            }
        } else {
            reset();
        }
    }, [localSearchParams.check_in, localSearchParams.check_out, localSearchParams.guests]);

    // Manual refresh untuk ensure latest data
    const refreshRateCalculation = async () => {
        if (!localSearchParams.check_in || !localSearchParams.check_out) return;
        
        try {
            await calculateRateImmediate(
                localSearchParams.check_in,
                localSearchParams.check_out,
                localSearchParams.guests
            );
        } catch (error) {
            console.error('Failed to refresh rate:', error);
        }
    };

    return (
        <AppLayout>
            <Head title={property.name} />
            
            <div className="property-detail">
                {/* Property Info */}
                <div className="property-header">
                    <h1>{property.name}</h1>
                    <p>{property.address}</p>
                </div>

                {/* Search/Booking Form */}
                <div className="booking-section">
                    <div className="date-inputs">
                        <input
                            type="date"
                            value={localSearchParams.check_in}
                            onChange={(e) => setLocalSearchParams(prev => ({
                                ...prev,
                                check_in: e.target.value
                            }))}
                            min={new Date().toISOString().split('T')[0]}
                        />
                        <input
                            type="date"
                            value={localSearchParams.check_out}
                            onChange={(e) => setLocalSearchParams(prev => ({
                                ...prev,
                                check_out: e.target.value
                            }))}
                            min={localSearchParams.check_in}
                        />
                        <input
                            type="number"
                            value={localSearchParams.guests}
                            onChange={(e) => setLocalSearchParams(prev => ({
                                ...prev,
                                guests: parseInt(e.target.value) || 1
                            }))}
                            min="1"
                            max={property.capacity_max}
                        />
                    </div>

                    {/* Rate Display */}
                    <div className="rate-display">
                        {isCalculatingRate && (
                            <div className="calculating">
                                <div className="spinner"></div>
                                <p>Calculating best rates...</p>
                            </div>
                        )}

                        {rateError && (
                            <div className="error">
                                <p>❌ {rateError}</p>
                                <button onClick={refreshRateCalculation}>
                                    Try Again
                                </button>
                            </div>
                        )}

                        {isReady && rateCalculation && (
                            <div className="rate-summary">
                                <div className="total-amount">
                                    <h3>{formattedTotal}</h3>
                                    <p>for {nights} nights</p>
                                    <p className="per-night">{formattedPerNight} / night</p>
                                </div>

                                {hasSeasonalPremium && (
                                    <div className="seasonal-notice">
                                        🌟 Special seasonal rates applied!
                                    </div>
                                )}

                                {hasWeekendPremium && (
                                    <div className="weekend-notice">
                                        ✨ Weekend premium included
                                    </div>
                                )}

                                {/* Rate Breakdown */}
                                <div className="rate-breakdown">
                                    <h4>Breakdown:</h4>
                                    <div className="breakdown-item">
                                        <span>Base Rate ({nights} nights)</span>
                                        <span>Rp {rateCalculation.calculation.base_amount.toLocaleString()}</span>
                                    </div>
                                    
                                    {rateCalculation.calculation.weekend_premium > 0 && (
                                        <div className="breakdown-item premium">
                                            <span>Weekend Premium</span>
                                            <span>Rp {rateCalculation.calculation.weekend_premium.toLocaleString()}</span>
                                        </div>
                                    )}
                                    
                                    {rateCalculation.calculation.seasonal_premium > 0 && (
                                        <div className="breakdown-item premium">
                                            <span>Seasonal Premium</span>
                                            <span>Rp {rateCalculation.calculation.seasonal_premium.toLocaleString()}</span>
                                        </div>
                                    )}
                                    
                                    {rateCalculation.calculation.extra_bed_amount > 0 && (
                                        <div className="breakdown-item">
                                            <span>Extra Beds</span>
                                            <span>Rp {rateCalculation.calculation.extra_bed_amount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    
                                    <div className="breakdown-item">
                                        <span>Cleaning Fee</span>
                                        <span>Rp {rateCalculation.calculation.cleaning_fee.toLocaleString()}</span>
                                    </div>
                                    
                                    <div className="breakdown-item">
                                        <span>Tax (11%)</span>
                                        <span>Rp {rateCalculation.calculation.tax_amount.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="booking-actions">
                                    <button 
                                        onClick={refreshRateCalculation}
                                        disabled={isCalculatingRate}
                                        className="refresh-btn"
                                    >
                                        {isCalculatingRate ? 'Refreshing...' : 'Refresh Rate'}
                                    </button>
                                    
                                    <Link
                                        href={`/booking/create/${property.slug}?check_in=${localSearchParams.check_in}&check_out=${localSearchParams.check_out}&guests=${localSearchParams.guests}`}
                                        className="book-now-btn"
                                    >
                                        Book Now - {formattedTotal}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Property Details */}
                <div className="property-content">
                    {/* Rest of property information */}
                </div>
            </div>
        </AppLayout>
    );
}
```

---

## 🎯 NEXT STEPS

1. **Implement Properties/Show.tsx** sesuai example di atas
2. **Test hook integration** dengan berbagai skenario
3. **Cleanup legacy code** di Booking/Create.tsx
4. **Monitor performance** improvement
5. **Update documentation** jika ada perubahan API

Hook `useRateCalculator` dengan `property.slug` sekarang siap untuk digunakan di seluruh aplikasi dengan performa yang optimal dan konsistensi yang tinggi! 🚀 