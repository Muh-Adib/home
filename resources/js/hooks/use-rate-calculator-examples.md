# useRateCalculator Hook - Dokumentasi & Contoh Penggunaan 🚀

## 📋 OVERVIEW

`useRateCalculator` adalah React hook yang powerful untuk melakukan rate calculation dengan optimisasi performa, caching otomatis, dan error handling yang comprehensive. Hook ini dirancang untuk digunakan di berbagai komponen dengan efisiensi API request yang tinggi.

---

## ✨ FEATURES

- **🚀 Automatic Caching** - TTL-based caching untuk menghindari request berulang
- **⏱️ Debouncing** - Menghindari spam requests saat user mengetik
- **🔄 Auto-calculation** - Kalkulasi otomatis saat parameter berubah
- **💾 Smart Cache Management** - Cache invalidation berdasarkan property
- **🚫 Request Cancellation** - Cancel request otomatis untuk optimasi
- **📊 Loading States** - State management lengkap untuk UX
- **🛡️ Error Handling** - Comprehensive error handling dan validation
- **🎯 TypeScript Support** - Full TypeScript dengan type safety

---

## 🔧 HOOK SIGNATURE

```tsx
const rateCalculator = useRateCalculator(options?: UseRateCalculatorOptions)

// Property-specific variant
const propertyCalculator = usePropertyRateCalculator(propertySlug: string, options?: UseRateCalculatorOptions)
```

### Options Interface:
```tsx
interface UseRateCalculatorOptions {
    debounceMs?: number;         // Default: 500ms
    cacheTimeout?: number;       // Default: 5 minutes
    enableAutoCalculate?: boolean; // Default: true
    onSuccess?: (data: RateCalculationResponse) => void;
    onError?: (error: string) => void;
}
```

---

## 🚀 CONTOH PENGGUNAAN

### 1. **Property Detail Page**

```tsx
import React, { useState, useEffect } from 'react';
import { usePropertyRateCalculator } from '@/hooks/use-rate-calculator';

function PropertyDetailPage({ property }) {
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [guests, setGuests] = useState(2);

    const {
        data,
        loading,
        error,
        isReady,
        formattedTotal,
        formattedPerNight,
        nights,
        hasWeekendPremium,
        hasSeasonalPremium,
        calculateRate,
        reset
    } = usePropertyRateCalculator(property.slug, {
        debounceMs: 800, // Slower untuk property detail
        onSuccess: (data) => {
            console.log('Rate calculated:', data);
        },
        onError: (error) => {
            console.error('Rate calculation failed:', error);
        }
    });

    // Auto-calculate saat parameter berubah
    useEffect(() => {
        if (checkIn && checkOut && guests) {
            calculateRate(checkIn, checkOut, guests);
        } else {
            reset();
        }
    }, [checkIn, checkOut, guests, calculateRate, reset]);

    return (
        <div className="property-detail">
            <div className="booking-form">
                <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                />
                <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn}
                />
                <input
                    type="number"
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value))}
                    min="1"
                    max="20"
                />
            </div>

            <div className="rate-display">
                {loading && <div className="loading">Calculating rate...</div>}
                
                {error && (
                    <div className="error">
                        <p>{error}</p>
                        <button onClick={() => calculateRate(checkIn, checkOut, guests)}>
                            Try Again
                        </button>
                    </div>
                )}

                {isReady && (
                    <div className="rate-breakdown">
                        <div className="total-price">
                            <h3>{formattedTotal}</h3>
                            <p>for {nights} nights</p>
                        </div>
                        
                        <div className="per-night">
                            <p>{formattedPerNight} / night</p>
                        </div>

                        {hasWeekendPremium && (
                            <div className="premium-notice">
                                <p>✨ Weekend premium applied</p>
                            </div>
                        )}

                        {hasSeasonalPremium && (
                            <div className="seasonal-notice">
                                <p>🌟 Special seasonal rates!</p>
                            </div>
                        )}

                        {data?.calculation.daily_breakdown && (
                            <div className="daily-breakdown">
                                <h4>Daily Breakdown:</h4>
                                {Object.entries(data.calculation.daily_breakdown).map(([date, day]) => (
                                    <div key={date} className="day-item">
                                        <span>{day.day_name}</span>
                                        <span>Rp {day.final_rate.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
```

### 2. **Property Search/Listing Page**

```tsx
import React, { useState } from 'react';
import { useRateCalculator } from '@/hooks/use-rate-calculator';

function PropertyCard({ property }) {
    const [searchParams, setSearchParams] = useState({
        checkIn: '2024-03-15',
        checkOut: '2024-03-18',
        guests: 2
    });

    const {
        formattedTotal,
        isCalculating,
        calculateRateImmediate,
        clearCache
    } = useRateCalculator({
        enableAutoCalculate: false, // Manual calculation for cards
        cacheTimeout: 10 * 60 * 1000 // 10 minutes cache
    });

    const handleCalculateRate = async () => {
        try {
            await calculateRateImmediate({
                propertySlug: property.slug,
                checkIn: searchParams.checkIn,
                checkOut: searchParams.checkOut,
                guestCount: searchParams.guests
            });
        } catch (error) {
            console.error('Failed to calculate rate:', error);
        }
    };

    return (
        <div className="property-card">
            <img src={property.featured_image} alt={property.name} />
            
            <div className="property-info">
                <h3>{property.name}</h3>
                <p>{property.address}</p>
                
                <div className="rate-section">
                    {isCalculating ? (
                        <div className="calculating">Calculating...</div>
                    ) : formattedTotal ? (
                        <div className="rate-display">
                            <span className="total">{formattedTotal}</span>
                            <span className="period">for selected dates</span>
                        </div>
                    ) : (
                        <button onClick={handleCalculateRate}>
                            Calculate Rate
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function PropertyListing({ properties, searchFilters }) {
    const {
        calculateRateImmediate,
        clearAllCache
    } = useRateCalculator({
        enableAutoCalculate: false
    });

    // Bulk calculate rates untuk semua property
    const calculateAllRates = async () => {
        const promises = properties.map(property =>
            calculateRateImmediate({
                propertySlug: property.slug,
                checkIn: searchFilters.checkIn,
                checkOut: searchFilters.checkOut,
                guestCount: searchFilters.guests
            }).catch(error => {
                console.error(`Failed for property ${property.slug}:`, error);
                return null;
            })
        );

        const results = await Promise.allSettled(promises);
        console.log('Bulk calculation results:', results);
    };

    return (
        <div className="property-listing">
            <div className="listing-header">
                <button onClick={calculateAllRates}>
                    Calculate All Rates
                </button>
                <button onClick={clearAllCache}>
                    Clear Cache
                </button>
            </div>

            <div className="properties-grid">
                {properties.map(property => (
                    <PropertyCard key={property.id} property={property} />
                ))}
            </div>
        </div>
    );
}
```

### 3. **Booking Form dengan Real-time Calculation**

```tsx
import React, { useState, useEffect } from 'react';
import { usePropertyRateCalculator } from '@/hooks/use-rate-calculator';

function BookingForm({ propertySlug, onBookingSubmit }) {
    const [formData, setFormData] = useState({
        checkIn: '',
        checkOut: '',
        guestCount: 2,
        guestDetails: {
            adults: 2,
            children: 0
        }
    });

    const {
        data,
        loading,
        error,
        isReady,
        totalAmount,
        formattedTotal,
        nights,
        hasExtraBeds,
        isCalculating,
        calculateRate,
        refreshRate,
        validateRequest
    } = usePropertyRateCalculator(propertySlug, {
        debounceMs: 300, // Fast untuk booking form
        onSuccess: (data) => {
            // Auto-scroll to summary saat calculation selesai
            document.getElementById('booking-summary')?.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });

    // Auto-calculate dengan validation
    useEffect(() => {
        const validationError = validateRequest({
            propertySlug,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            guestCount: formData.guestCount
        });

        if (!validationError) {
            calculateRate(formData.checkIn, formData.checkOut, formData.guestCount);
        }
    }, [formData.checkIn, formData.checkOut, formData.guestCount]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!isReady) {
            alert('Please wait for rate calculation to complete');
            return;
        }

        // Refresh rate sebelum submit untuk memastikan data terbaru
        try {
            const latestRate = await refreshRate(
                formData.checkIn, 
                formData.checkOut, 
                formData.guestCount
            );
            
            await onBookingSubmit({
                ...formData,
                rateCalculation: latestRate
            });
        } catch (error) {
            alert('Failed to get latest rate. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="booking-form">
            <div className="form-section">
                <h3>Booking Details</h3>
                
                <div className="form-group">
                    <label>Check-in Date</label>
                    <input
                        type="date"
                        value={formData.checkIn}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            checkIn: e.target.value
                        }))}
                        min={new Date().toISOString().split('T')[0]}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Check-out Date</label>
                    <input
                        type="date"
                        value={formData.checkOut}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            checkOut: e.target.value
                        }))}
                        min={formData.checkIn}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Number of Guests</label>
                    <input
                        type="number"
                        value={formData.guestCount}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            guestCount: parseInt(e.target.value)
                        }))}
                        min="1"
                        max="20"
                        required
                    />
                </div>
            </div>

            <div id="booking-summary" className="booking-summary">
                <h3>Booking Summary</h3>
                
                {isCalculating && (
                    <div className="calculating-state">
                        <div className="spinner"></div>
                        <p>Calculating best rates...</p>
                    </div>
                )}

                {error && (
                    <div className="error-state">
                        <p>❌ {error}</p>
                        <button 
                            type="button"
                            onClick={() => calculateRate(formData.checkIn, formData.checkOut, formData.guestCount)}
                        >
                            Retry Calculation
                        </button>
                    </div>
                )}

                {isReady && (
                    <div className="rate-summary">
                        <div className="summary-row total">
                            <span>Total Amount</span>
                            <span className="amount">{formattedTotal}</span>
                        </div>
                        
                        <div className="summary-row">
                            <span>{nights} nights</span>
                            <span>{data?.formatted.per_night} / night</span>
                        </div>

                        {data?.calculation.weekend_premium > 0 && (
                            <div className="summary-row premium">
                                <span>Weekend Premium</span>
                                <span>{data.formatted.weekend_premium}</span>
                            </div>
                        )}

                        {data?.calculation.seasonal_premium > 0 && (
                            <div className="summary-row premium">
                                <span>Seasonal Premium</span>
                                <span>{data.formatted.seasonal_premium}</span>
                            </div>
                        )}

                        {hasExtraBeds && (
                            <div className="summary-row">
                                <span>Extra Beds ({data?.calculation.extra_beds})</span>
                                <span>{data?.formatted.extra_bed_amount}</span>
                            </div>
                        )}

                        <div className="summary-row">
                            <span>Cleaning Fee</span>
                            <span>{data?.formatted.cleaning_fee}</span>
                        </div>

                        <div className="summary-row tax">
                            <span>Tax (11%)</span>
                            <span>Rp {data?.calculation.tax_amount.toLocaleString()}</span>
                        </div>

                        {data?.calculation.minimum_stay_discount > 0 && (
                            <div className="summary-row discount">
                                <span>Discount ({nights >= 7 ? 'Weekly' : 'Multi-night'})</span>
                                <span>-Rp {data.calculation.minimum_stay_discount.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={!isReady || isCalculating}
                    className="book-now-btn"
                >
                    {isCalculating ? 'Calculating...' : `Book Now - ${formattedTotal}`}
                </button>
            </div>
        </form>
    );
}
```

### 4. **Admin Dashboard - Bulk Operations**

```tsx
import React, { useState } from 'react';
import { useRateCalculator } from '@/hooks/use-rate-calculator';

function AdminRateManager() {
    const [selectedProperties, setSelectedProperties] = useState([]);
    const [testDates, setTestDates] = useState({
        checkIn: '2024-04-01',
        checkOut: '2024-04-03'
    });

    const {
        calculateRateImmediate,
        clearPropertyCache,
        clearAllCache
    } = useRateCalculator({
        enableAutoCalculate: false,
        cacheTimeout: 1 * 60 * 1000 // 1 minute cache untuk admin
    });

    const testAllPropertyRates = async () => {
        const results = [];
        
        for (const propertySlug of selectedProperties) {
            try {
                const result = await calculateRateImmediate({
                    propertySlug,
                    checkIn: testDates.checkIn,
                    checkOut: testDates.checkOut,
                    guestCount: 2
                });
                
                results.push({
                    propertySlug,
                    success: true,
                    data: result
                });
            } catch (error) {
                results.push({
                    propertySlug,
                    success: false,
                    error: error.message
                });
            }
        }

        console.table(results);
        return results;
    };

    const clearCacheForSelected = () => {
        selectedProperties.forEach(propertySlug => {
            clearPropertyCache(propertySlug);
        });
        alert(`Cache cleared for ${selectedProperties.length} properties`);
    };

    return (
        <div className="admin-rate-manager">
            <h2>Rate Testing & Cache Management</h2>
            
            <div className="controls">
                <div className="date-inputs">
                    <input
                        type="date"
                        value={testDates.checkIn}
                        onChange={(e) => setTestDates(prev => ({
                            ...prev,
                            checkIn: e.target.value
                        }))}
                    />
                    <input
                        type="date"
                        value={testDates.checkOut}
                        onChange={(e) => setTestDates(prev => ({
                            ...prev,
                            checkOut: e.target.value
                        }))}
                    />
                </div>

                <div className="actions">
                    <button onClick={testAllPropertyRates}>
                        Test Selected Properties
                    </button>
                    <button onClick={clearCacheForSelected}>
                        Clear Selected Cache
                    </button>
                    <button onClick={clearAllCache}>
                        Clear All Cache
                    </button>
                </div>
            </div>

            {/* Property selection UI */}
            <div className="property-selection">
                {/* Implementation details... */}
            </div>
        </div>
    );
}
```

---

## 📊 PERFORMANCE OPTIMIZATIONS

### 1. **Cache Strategy**
```tsx
// Cache dengan different TTL berdasarkan use case
const quickSearchCache = useRateCalculator({
    cacheTimeout: 2 * 60 * 1000  // 2 menit untuk search
});

const detailPageCache = useRateCalculator({
    cacheTimeout: 10 * 60 * 1000  // 10 menit untuk detail page
});

const adminCache = useRateCalculator({
    cacheTimeout: 30 * 1000  // 30 detik untuk admin (always fresh)
});
```

### 2. **Debouncing Configuration**
```tsx
// Fast untuk booking forms
const bookingCalculator = useRateCalculator({
    debounceMs: 200
});

// Slower untuk search filters
const searchCalculator = useRateCalculator({
    debounceMs: 800
});

// Immediate untuk buttons
const buttonCalculator = useRateCalculator({
    enableAutoCalculate: false  // Manual trigger only
});
```

### 3. **Bulk Operations**
```tsx
// Parallel requests untuk multiple properties
const calculateMultipleProperties = async (properties, dates) => {
    const promises = properties.map(property =>
        calculateRateImmediate({
            propertySlug: property.slug,
            ...dates
        }).catch(error => ({ error, propertySlug: property.slug }))
    );

    const results = await Promise.allSettled(promises);
    return results;
};
```

---

## 🛠️ ADVANCED USAGE

### Custom Cache Management
```tsx
const { clearPropertyCache, clearAllCache } = useRateCalculator();

// Clear cache saat property data berubah
useEffect(() => {
    if (propertyUpdated) {
        clearPropertyCache(propertySlug);
    }
}, [propertyUpdated]);

// Clear semua cache saat user logout
const handleLogout = () => {
    clearAllCache();
    // ... logout logic
};
```

### Error Handling dengan Retry
```tsx
const { calculateRateImmediate, error } = useRateCalculator({
    onError: (error) => {
        // Log error untuk monitoring
        console.error('Rate calculation failed:', error);
        
        // Show user-friendly message
        if (error.includes('not available')) {
            showNotification('Property not available for selected dates');
        } else {
            showNotification('Unable to calculate rate. Please try again.');
        }
    }
});

const retryCalculation = async (request, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await calculateRateImmediate(request);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
    }
};
```

---

## 🎯 BEST PRACTICES

1. **Use Property-Specific Hook** untuk single property pages
2. **Disable Auto-Calculate** untuk button-triggered calculations
3. **Implement Retry Logic** untuk network failures
4. **Clear Cache** saat property data berubah
5. **Use Appropriate TTL** berdasarkan use case
6. **Handle Loading States** untuk better UX
7. **Validate Input** sebelum calculation
8. **Monitor Performance** dengan onSuccess/onError callbacks

Hook ini memberikan foundation yang solid untuk semua kebutuhan rate calculation dalam aplikasi property management! 🚀