# Admin Booking Availability API Fix

## 📋 Overview

Perbaikan implementasi availability API di halaman Admin Booking Create agar menggunakan mekanisme yang sama dengan halaman customer booking show, memastikan konsistensi data availability dan rate calculation.

## 🔍 Problem Analysis

### **Sebelum (Masalah)**:
- ❌ **Inconsistent API Usage**: Admin booking menggunakan API berbeda dengan customer booking
- ❌ **Different Data Sources**: Admin menggunakan `/admin/api/admin/booking-management/*` sedangkan customer menggunakan `/api/properties/*`
- ❌ **Missing Availability Data**: Data availability tidak ter-load dengan benar
- ❌ **Rate Calculation Issues**: Rate calculation tidak konsisten dengan customer booking

### **Root Cause**:
- Admin booking menggunakan API internal yang berbeda dengan customer booking
- Data availability tidak menggunakan service yang sama
- Rate calculation menggunakan endpoint yang berbeda

## ✅ Fix Implementation

### 1. **Unified API Usage**

#### **Sebelum (Inconsistent)**:
```typescript
// Admin API (different pattern)
const response = await fetch('/admin/api/admin/booking-management/property-date-range', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
});

// Customer API (different pattern)
const response = await fetch('/api/properties/{slug}/availability-and-rates', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
});
```

#### **Sesudah (Unified)**:
```typescript
// Use the same API pattern as customer booking show page
const response = await fetch(`/api/properties/${propertyId}/availability-and-rates?check_in=${startDate}&check_out=${endDate}&guest_count=${totalGuests}`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
});
```

### 2. **Enhanced Availability Loading**

#### **New Function**: `loadPropertyAvailabilityAndRates`
```typescript
const loadPropertyAvailabilityAndRates = async (propertyId: number) => {
    try {
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Use the same API pattern as customer booking show page
        const response = await fetch(`/api/properties/${propertyId}/availability-and-rates?check_in=${startDate}&check_out=${endDate}&guest_count=${totalGuests}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Update availability data with comprehensive data from customer API
                setAvailabilityData({
                    success: true,
                    property: {
                        id: data.property_info?.id || propertyId,
                        name: data.property_info?.name || '',
                        base_rate: data.property_info?.base_rate || 0,
                        capacity: data.property_info?.capacity || 0,
                        capacity_max: data.property_info?.capacity_max || 0,
                        cleaning_fee: data.property_info?.cleaning_fee || 0,
                        extra_bed_rate: data.property_info?.extra_bed_rate || 0,
                        weekend_premium_percent: data.property_info?.weekend_premium_percent || 0,
                    },
                    date_range: {
                        start: startDate,
                        end: endDate,
                    },
                    booked_dates: data.booked_dates || [],
                    availability_data: data.rates || {},
                    seasonal_rates: data.seasonal_rates || {},
                });
                setAvailabilityError(null);
            } else {
                setAvailabilityError(data.error || 'Failed to load availability and rates data');
            }
        } else {
            setAvailabilityError('Failed to load availability and rates data');
        }
    } catch (error) {
        console.error('Error loading property availability and rates:', error);
        setAvailabilityError('Network error loading availability and rates data');
    }
};
```

### 3. **Improved Date Range Handling**

#### **Enhanced**: `handleDateRangeChange`
```typescript
const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    setData('check_in_date', startDate);
    setData('check_out_date', endDate);
    
    // Clear previous calculations
    setRateCalculation(null);
    setRateError(null);
    setAvailabilityStatus(null);
    setAvailabilityError(null);
    
    // Check availability and calculate rate if both dates are selected
    if (startDate && endDate && currentProperty) {
        setIsCalculatingRate(true);
        
        // Use the same API pattern as customer booking show page
        const checkAvailabilityAndRate = async () => {
            try {
                // Check availability using customer API
                const availabilityResponse = await fetch(`/api/properties/${currentProperty.id}/availability-and-rates?check_in=${startDate}&check_out=${endDate}&guest_count=${totalGuests}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                });
                
                if (availabilityResponse.ok) {
                    const availabilityData = await availabilityResponse.json();
                    
                    if (availabilityData.success) {
                        // Check if dates are available
                        const isAvailable = !availabilityData.booked_dates || availabilityData.booked_dates.length === 0;
                        setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');
                        
                        if (!isAvailable) {
                            setAvailabilityError('Property tidak tersedia untuk tanggal yang dipilih');
                            setIsCalculatingRate(false);
                            return;
                        }
                        
                        // Calculate rate using the same API
                        const rateResponse = await fetch(`/api/properties/${currentProperty.id}/calculate-rate?check_in=${startDate}&check_out=${endDate}&guest_count=${totalGuests}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json',
                            },
                        });
                        
                        if (rateResponse.ok) {
                            const rateData = await rateResponse.json();
                            
                            if (rateData.success) {
                                const calculation = rateData.calculation || rateData;
                                setRateCalculation({
                                    nights: calculation.nights,
                                    base_amount: calculation.base_amount,
                                    weekend_premium: calculation.weekend_premium || 0,
                                    seasonal_premium: calculation.seasonal_premium || 0,
                                    extra_bed_amount: calculation.extra_bed_amount || 0,
                                    cleaning_fee: calculation.cleaning_fee || 0,
                                    tax_amount: calculation.tax_amount || 0,
                                    total_amount: calculation.total_amount,
                                    extra_beds: calculation.extra_beds || 0,
                                    formatted: {
                                        total_amount: 'Rp ' + calculation.total_amount.toLocaleString('id-ID'),
                                        per_night: 'Rp ' + Math.round(calculation.total_amount / calculation.nights).toLocaleString('id-ID')
                                    }
                                });
                                setRateError(null);
                            } else {
                                setRateError(rateData.message || 'Rate calculation failed');
                            }
                        } else {
                            setRateError('Failed to calculate rate');
                        }
                    } else {
                        setAvailabilityError(availabilityData.message || 'Failed to check availability');
                    }
                } else {
                    setAvailabilityError('Failed to check availability');
                }
            } catch (error) {
                setRateCalculation(null);
                setRateError(error instanceof Error ? error.message : 'Error calculating rate');
            } finally {
                setIsCalculatingRate(false);
            }
        };
        
        // Execute with delay for better UX
        setTimeout(checkAvailabilityAndRate, 300);
    }
}, [currentProperty, setData, totalGuests]);
```

### 4. **Enhanced Guest Count Changes**

#### **Improved**: `handleGenderCountChange`
```typescript
const handleGenderCountChange = (genderType: 'male' | 'female' | 'children', newCount: number) => {
    const countField = genderType === 'children' ? 'guest_children' : 
                      genderType === 'male' ? 'guest_male' : 'guest_female';
    
    setData(countField, newCount);
    
    // Recalculate rate when guest count changes with debounce
    if (data.check_in_date && data.check_out_date && currentProperty) {
        setTimeout(async () => {
            try {
                // Use the same API pattern as customer booking show page
                const response = await fetch(`/api/properties/${currentProperty.id}/calculate-rate?check_in=${data.check_in_date}&check_out=${data.check_out_date}&guest_count=${totalGuests}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                });
                
                if (response.ok) {
                    const rateData = await response.json();
                    
                    if (rateData.success) {
                        const calculation = rateData.calculation || rateData;
                        setRateCalculation({
                            nights: calculation.nights,
                            base_amount: calculation.base_amount,
                            weekend_premium: calculation.weekend_premium || 0,
                            seasonal_premium: calculation.seasonal_premium || 0,
                            extra_bed_amount: calculation.extra_bed_amount || 0,
                            cleaning_fee: calculation.cleaning_fee || 0,
                            tax_amount: calculation.tax_amount || 0,
                            total_amount: calculation.total_amount,
                            extra_beds: calculation.extra_beds || 0,
                            formatted: {
                                total_amount: 'Rp ' + calculation.total_amount.toLocaleString('id-ID'),
                                per_night: 'Rp ' + Math.round(calculation.total_amount / calculation.nights).toLocaleString('id-ID')
                            }
                        });
                        setRateError(null);
                    } else {
                        setRateError(rateData.message || 'Rate calculation failed');
                    }
                } else {
                    setRateError('Failed to calculate rate');
                }
            } catch (error) {
                setRateCalculation(null);
                setRateError(error instanceof Error ? error.message : 'Error calculating rate');
            }
        }, 300);
    }
};
```

### 5. **Initial Data Loading**

#### **New**: `useEffect` for Initial Loading
```typescript
// Load initial availability data if selectedProperty exists
useEffect(() => {
    if (selectedProperty && !availabilityData) {
        loadPropertyAvailabilityAndRates(selectedProperty.id);
    }
}, [selectedProperty]);
```

### 6. **Enhanced DateRange Component**

#### **Improved Props**:
```typescript
<DateRange
    startDate={data.check_in_date}
    endDate={data.check_out_date}
    onDateChange={handleDateRangeChange}
    bookedDates={availabilityData?.booked_dates || []}
    loading={isCalculatingRate || isLoadingAvailability}
    error={rateError}
    minDate={new Date().toISOString().split('T')[0]}
    size="lg"
    showNights={true}
    startLabel="Check-in"
    endLabel="Check-out"
    placeholder={{
        start: "Check-in",
        end: "Check-out"
    }}
    autoTrigger={true}
    triggerDelay={300}
/>
```

## 🔧 API Endpoints Used

### **Customer Booking API (Now Used by Admin)**:
1. **Availability & Rates**: `GET /api/properties/{propertyId}/availability-and-rates`
2. **Rate Calculation**: `GET /api/properties/{propertyId}/calculate-rate`
3. **Availability Check**: `GET /api/properties/{propertyId}/availability`

### **Admin API (Kept for Backward Compatibility)**:
1. **Property Date Range**: `GET /admin/api/admin/booking-management/property-date-range`
2. **Check Availability**: `POST /admin/api/admin/booking-management/check-availability`
3. **Calculate Rate**: `POST /admin/api/admin/booking-management/calculate-rate`

## 📊 Data Flow

### **1. Property Selection**:
```
User selects property → loadPropertyAvailabilityAndRates() → 
Customer API (/api/properties/{id}/availability-and-rates) → 
Update availabilityData state
```

### **2. Date Range Selection**:
```
User selects dates → handleDateRangeChange() → 
Check availability (Customer API) → 
Calculate rate (Customer API) → 
Update rateCalculation state
```

### **3. Guest Count Changes**:
```
User changes guest count → handleGenderCountChange() → 
Recalculate rate (Customer API) → 
Update rateCalculation state
```

## 🎯 Benefits

### **1. Data Consistency**:
- ✅ Same availability data source as customer booking
- ✅ Consistent rate calculation logic
- ✅ Unified business rules

### **2. Better User Experience**:
- ✅ Real-time availability checking
- ✅ Accurate rate calculation
- ✅ Consistent behavior across admin and customer interfaces

### **3. Maintainability**:
- ✅ Single source of truth for availability logic
- ✅ Easier to maintain and update
- ✅ Reduced code duplication

### **4. Reliability**:
- ✅ Proven API endpoints (used by customer booking)
- ✅ Better error handling
- ✅ Consistent data format

## 🧪 Testing

### **Test Scenarios**:
1. **Property Selection**: Verify availability data loads correctly
2. **Date Range Selection**: Verify availability check and rate calculation
3. **Guest Count Changes**: Verify rate recalculation
4. **Error Handling**: Verify proper error messages
5. **Data Consistency**: Verify same data as customer booking

### **Debug Information**:
```typescript
{/* Debug Information */}
{process.env.NODE_ENV === 'development' && availabilityData && (
    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
        <div className="font-semibold">Debug Info:</div>
        <div>Booked Dates: {availabilityData.booked_dates?.length || 0}</div>
        <div>Property ID: {availabilityData.property?.id}</div>
        <div>Date Range: {availabilityData.date_range?.start} - {availabilityData.date_range?.end}</div>
    </div>
)}
```

## 🚀 Deployment Notes

### **Backend Requirements**:
- ✅ Customer API endpoints must be accessible to admin users
- ✅ Proper CORS configuration if needed
- ✅ Authentication/authorization for admin access

### **Frontend Requirements**:
- ✅ All API endpoints working correctly
- ✅ Proper error handling
- ✅ Loading states implemented

---

## 📅 Implementation Status

- ✅ **API Unification**: Implemented unified API usage
- ✅ **Availability Loading**: Enhanced availability data loading
- ✅ **Rate Calculation**: Improved rate calculation consistency
- ✅ **Date Range Handling**: Enhanced date range selection
- ✅ **Guest Count Changes**: Improved guest count handling
- ✅ **Initial Loading**: Added initial data loading
- ✅ **Debug Information**: Added development debug info

**Status**: ✅ **COMPLETED** - Admin booking now uses same availability API as customer booking

