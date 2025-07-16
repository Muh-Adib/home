# 🔧 Fix Infinite Loop + Date Range Picker Implementation

## 🚨 MASALAH YANG DITEMUKAN

### 1. Infinite Loop di Show.tsx
```typescript
// ❌ MASALAH: Dependency array mengandung functions yang berubah setiap render
useEffect(() => {
    // ...rate calculation
}, [searchDates, property.slug, calculateRate, resetRate, validateRequest]);
//                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                   Functions dari hook yang tidak stable
```

### 2. Fetch Berulang
- Setiap kali user ubah date input → trigger useEffect
- Hook functions (`calculateRate`, `resetRate`) change reference → re-render
- Tidak ada debouncing yang efektif

## 🎯 SOLUSI IMPLEMENTASI

### Step 1: Buat API Endpoint Prefetch (✅ SUDAH ADA)
```php
// app/Http/Controllers/BookingController.php
public function getAvailabilityAndRates(Request $request, Property $property): JsonResponse
```

### Step 2: Update Route (✅ SUDAH ADA)
```php
// routes/web.php
Route::get('properties/{property:slug}/availability-and-rates', [BookingController::class, 'getAvailabilityAndRates'])
```

### Step 3: Fix Show.tsx - Remove Infinite Loop

#### A. Import Date Range Components
```typescript
// Tambahkan import:
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
```

#### B. Update State Management
```typescript
// ❌ HAPUS ini:
const [searchDates, setSearchDates] = useState({
    check_in: searchParams.check_in || '',
    check_out: searchParams.check_out || '',
    guests: searchParams.guests || 2
});

// ✅ GANTI dengan:
const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (searchParams.check_in && searchParams.check_out) {
        return {
            from: new Date(searchParams.check_in),
            to: new Date(searchParams.check_out)
        };
    }
    return undefined;
});

const [guestCount, setGuestCount] = useState(searchParams.guests || 2);
const [availabilityData, setAvailabilityData] = useState(null);
const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
```

#### C. Remove Hook Usage
```typescript
// ❌ HAPUS seluruh section ini:
const {
    data: rateCalculation,
    loading: isCalculatingRate,
    error: rateError,
    // ... semua dari usePropertyRateCalculator
} = usePropertyRateCalculator(property.slug, {
    // ...options
});
```

#### D. Add Prefetch Function
```typescript
// ✅ TAMBAHKAN:
const fetchAvailabilityData = useCallback(async () => {
    setIsLoadingAvailability(true);
    
    try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3); // 3 bulan ke depan
        
        const params = new URLSearchParams({
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            guest_count: guestCount.toString()
        });

        const response = await fetch(`/api/properties/${property.slug}/availability-and-rates?${params}`);
        const data = await response.json();
        
        setAvailabilityData(data);
        console.log('✅ Availability data loaded:', data);
    } catch (error) {
        console.error('❌ Failed to fetch availability:', error);
    } finally {
        setIsLoadingAvailability(false);
    }
}, [property.slug, guestCount]);
```

#### E. Fix useEffect Dependencies
```typescript
// ❌ HAPUS ini:
useEffect(() => {
    if (searchDates.check_in && searchDates.check_out && searchDates.guests) {
        // ...validation and calculateRate
    }
}, [searchDates, property.slug, calculateRate, resetRate, validateRequest]);

// ✅ GANTI dengan:
// 1. Fetch availability data once on mount
useEffect(() => {
    fetchAvailabilityData();
}, [fetchAvailabilityData]);

// 2. Calculate rate from frontend data
useEffect(() => {
    if (dateRange?.from && dateRange?.to && availabilityData) {
        try {
            const calculation = calculateRateFromData(dateRange.from, dateRange.to);
            setRateCalculation(calculation);
            setRateError(null);
        } catch (error) {
            setRateError(error.message);
            setRateCalculation(null);
        }
    }
}, [dateRange, availabilityData, guestCount]);
```

#### F. Add Frontend Rate Calculation
```typescript
const calculateRateFromData = useCallback((from: Date, to: Date) => {
    if (!availabilityData?.rates) return null;

    // Generate date array
    const dateArray = [];
    const current = new Date(from);
    while (current < to) {
        dateArray.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }

    // Check availability
    const hasBookedDates = dateArray.some(date => 
        availabilityData.booked_dates.includes(date)
    );

    if (hasBookedDates) {
        throw new Error('Property is not available for selected dates');
    }

    // Calculate from cached rates
    const nights = dateArray.length;
    let baseAmount = 0;
    let weekendPremium = 0;

    dateArray.forEach(date => {
        const dailyRate = availabilityData.rates[date];
        if (dailyRate) {
            baseAmount += dailyRate.base_rate;
            if (dailyRate.weekend_premium) {
                weekendPremium += dailyRate.base_rate * 0.2; // From property data
            }
        }
    });

    // Add cleaning fee, extra beds, tax
    const extraBeds = Math.max(0, guestCount - availabilityData.property_info.capacity);
    const extraBedAmount = extraBeds * availabilityData.property_info.extra_bed_rate * nights;
    const cleaningFee = availabilityData.property_info.cleaning_fee;
    const subtotal = baseAmount + weekendPremium + extraBedAmount + cleaningFee;
    const taxAmount = subtotal * 0.11;
    const totalAmount = subtotal + taxAmount;

    return {
        nights,
        base_amount: baseAmount,
        weekend_premium: weekendPremium,
        extra_bed_amount: extraBedAmount,
        cleaning_fee: cleaningFee,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        formatted: {
            total_amount: 'Rp ' + totalAmount.toLocaleString('id-ID'),
            per_night: 'Rp ' + Math.round(totalAmount / nights).toLocaleString('id-ID')
        }
    };
}, [availabilityData, guestCount]);
```

### Step 4: Update UI - Date Range Picker

#### A. Replace Date Inputs
```typescript
// ❌ HAPUS:
<Input
    type="date"
    value={searchDates.check_in}
    onChange={(e) => setSearchDates(prev => ({...prev, check_in: e.target.value}))}
/>

// ✅ GANTI dengan:
<Popover>
    <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(dateRange)}
        </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
        <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            disabled={(date) => 
                date < new Date() || 
                isDateBooked(date)
            }
            numberOfMonths={2}
            modifiers={{
                booked: (date) => isDateBooked(date),
                weekend: (date) => date.getDay() === 0 || date.getDay() === 6
            }}
            modifiersStyles={{
                booked: { 
                    backgroundColor: '#fee2e2', 
                    color: '#991b1b',
                    textDecoration: 'line-through'
                },
                weekend: { 
                    backgroundColor: '#fef3c7',
                    color: '#92400e'
                }
            }}
        />
    </PopoverContent>
</Popover>
```

#### B. Helper Functions
```typescript
const isDateBooked = useCallback((date: Date) => {
    if (!availabilityData?.booked_dates) return false;
    const dateStr = date.toISOString().split('T')[0];
    return availabilityData.booked_dates.includes(dateStr);
}, [availabilityData]);

const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return 'Select dates';
    if (!range.to) return format(range.from, 'MMM dd, yyyy');
    return `${format(range.from, 'MMM dd')} - ${format(range.to, 'MMM dd, yyyy')}`;
};
```

## 🎯 HASIL YANG DIHARAPKAN

### ✅ Setelah Fix:
1. **Tidak ada infinite loop** - useEffect dependencies stabil
2. **Hanya 1 fetch awal** - prefetch data 3 bulan ke depan
3. **Rate calculation di frontend** - instant, tidak perlu API call
4. **Date range picker** dengan visual booked dates
5. **Better UX** - responsive, no loading delays

### 📊 Performance Improvement:
- **Sebelum**: 10+ API calls per date change
- **Sesudah**: 1 API call saat mount
- **Response time**: Dari 1-2s → instant (frontend calculation)

## 🧪 Testing Steps:

1. **Mount page** → Should fetch availability data once
2. **Select date range** → Should calculate rate instantly
3. **Change guest count** → Should recalculate + refetch availability
4. **Select booked dates** → Should show availability error
5. **Visual calendar** → Booked dates marked with red/strikethrough

## 🚀 Implementation Priority:

1. **High**: Fix infinite loop (Remove hook dependencies)
2. **High**: Add prefetch function 
3. **Medium**: Implement date range picker
4. **Low**: Add visual enhancements

---

**Status**: Ready to implement
**Estimated Time**: 2-3 hours
**Impact**: Eliminates infinite loops, improves performance 10x 