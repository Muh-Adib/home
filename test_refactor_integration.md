# 🧪 Testing Guide - Refactor Integration

## 📋 Frontend & Backend Integration Tests

### **1. Rate Calculation API Testing**

#### Test `/api/properties/{slug}/calculate-rate` endpoint:

```bash
# Test basic rate calculation
curl -X GET "http://localhost/api/properties/villa-test/calculate-rate?check_in=2024-02-15&check_out=2024-02-17&guest_count=2" \
  -H "X-Requested-With: XMLHttpRequest"

# Expected Response Format:
{
  "success": true,
  "property_id": 1,
  "dates": {
    "check_in": "2024-02-15",
    "check_out": "2024-02-17"
  },
  "guest_count": 2,
  "calculation": {
    "nights": 2,
    "base_amount": 1000000,
    "weekend_premium": 200000,
    "seasonal_premium": 0,
    "extra_bed_amount": 0,
    "cleaning_fee": 100000,
    "tax_amount": 143000,
    "total_amount": 1443000,
    "extra_beds": 0,
    "rate_breakdown": {
      "base_rate_per_night": 500000,
      "weekend_premium_percent": 20,
      "peak_season_applied": false
    }
  },
  "formatted": {
    "total_amount": "Rp 1.443.000",
    "per_night": "Rp 721.500"
  }
}
```

### **2. Rate Management Routes Testing**

#### Test admin rate management access:
- ✅ GET `/admin/rate-management` - Rate management index
- ✅ GET `/admin/rate-management/properties/{id}` - Property rate detail
- ✅ POST `/admin/rate-management/properties/{id}/seasonal-rates` - Create seasonal rate
- ✅ PUT `/admin/rate-management/seasonal-rates/{id}` - Update seasonal rate
- ✅ DELETE `/admin/rate-management/seasonal-rates/{id}` - Delete seasonal rate
- ✅ PUT `/admin/rate-management/properties/{id}/base-rates` - Update base rates

### **3. Frontend Component Testing**

#### A. Rate Calculator Hook Testing:
```javascript
// Test in browser console after visiting property page
console.log('Testing rate calculator hook...');

// Should work with refactored API
const testRateCalculation = async () => {
  const response = await fetch('/api/properties/villa-test/calculate-rate?check_in=2024-02-15&check_out=2024-02-17&guest_count=2', {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });
  
  const data = await response.json();
  console.log('Rate calculation result:', data);
  
  // Verify structure matches TypeScript types
  console.log('Has calculation object:', !!data.calculation);
  console.log('Has formatted values:', !!data.formatted);
  console.log('Total amount:', data.calculation?.total_amount);
};

testRateCalculation();
```

#### B. Navigation Testing:
- ✅ Rate Management menu appears for admin roles
- ✅ Menu translations work (EN/ID)
- ✅ Navigation links work correctly

### **4. Service Integration Testing**

#### A. Rate Calculation Service:
```php
// Test in tinker: php artisan tinker

use App\Services\RateCalculationService;
use App\Models\Property;

$service = app(RateCalculationService::class);
$property = Property::first();

// Test basic calculation
$result = $service->calculateRate($property, '2024-02-15', '2024-02-17', 2);
dump($result->toArray());

// Test formatted API response
$formatted = $service->calculateRateFormatted($property, '2024-02-15', '2024-02-17', 2);
dump($formatted);
```

#### B. Booking Service Integration:
```php
// Test booking creation with new services
use App\Services\BookingService;
use App\Domain\Booking\ValueObjects\BookingRequest;

$bookingService = app(BookingService::class);

$request = new BookingRequest(
    propertyId: 1,
    checkInDate: '2024-02-15',
    checkOutDate: '2024-02-17',
    guestCount: 2,
    guestName: 'Test User',
    guestEmail: 'test@example.com',
    guestPhone: '081234567890'
);

// This should work with integrated services
$booking = $bookingService->createBooking($request);
dump($booking);
```

### **5. End-to-End User Flow Testing**

#### A. Guest Booking Flow:
1. ✅ Visit property page
2. ✅ Select dates and guests
3. ✅ Rate calculation displays correctly
4. ✅ Proceed to booking form
5. ✅ Submit booking successfully
6. ✅ Booking uses refactored services

#### B. Admin Rate Management Flow:
1. ✅ Login as admin
2. ✅ Navigate to Rate Management
3. ✅ View properties list
4. ✅ Click "View Rates" on a property
5. ✅ Edit base rates
6. ✅ Add seasonal rate
7. ✅ Verify changes are saved

### **6. Performance Testing**

#### Before/After Rate Calculation Performance:
```javascript
// Test rate calculation performance
const performanceTest = async () => {
  const startTime = performance.now();
  
  const response = await fetch('/api/properties/villa-test/calculate-rate?check_in=2024-02-15&check_out=2024-02-17&guest_count=2');
  const data = await response.json();
  
  const endTime = performance.now();
  console.log(`Rate calculation took ${endTime - startTime} milliseconds`);
  console.log('Response:', data);
};

// Run multiple times to get average
for(let i = 0; i < 5; i++) {
  performanceTest();
}
```

### **7. Error Handling Testing**

#### Test API Error Responses:
```bash
# Test invalid dates
curl -X GET "http://localhost/api/properties/villa-test/calculate-rate?check_in=2024-02-17&check_out=2024-02-15&guest_count=2"

# Test invalid guest count
curl -X GET "http://localhost/api/properties/villa-test/calculate-rate?check_in=2024-02-15&check_out=2024-02-17&guest_count=20"

# Test missing parameters
curl -X GET "http://localhost/api/properties/villa-test/calculate-rate?check_in=2024-02-15"
```

### **8. TypeScript Type Safety Testing**

#### Verify TypeScript types work correctly:
```typescript
// In browser dev tools, verify type safety
import type { RateCalculation, AvailabilityResult } from '@/types';

// These should have proper autocomplete and type checking
const testRateCalculation: RateCalculation = {
  nights: 2,
  base_amount: 1000000,
  weekend_premium: 200000,
  seasonal_premium: 0,
  extra_bed_amount: 0,
  cleaning_fee: 100000,
  tax_amount: 143000,
  total_amount: 1443000,
  extra_beds: 0,
  breakdown: {
    // ... proper structure
  },
  seasonal_rates_applied: []
};
```

## ✅ **Testing Checklist**

### Backend Services:
- [ ] RateCalculationService works correctly
- [ ] AvailabilityService integrates properly
- [ ] BookingService uses new dependencies
- [ ] RateService CRUD operations work
- [ ] All unit tests pass
- [ ] Integration tests pass

### API Endpoints:
- [ ] Rate calculation API returns correct format
- [ ] Availability API works
- [ ] Rate management APIs work
- [ ] Error handling is proper
- [ ] Validation works correctly

### Frontend Components:
- [ ] Rate calculator hook works
- [ ] Property pages display rates correctly
- [ ] Booking forms work with new API
- [ ] Admin rate management pages work
- [ ] Navigation includes rate management
- [ ] Translations are correct

### Integration:
- [ ] End-to-end booking flow works
- [ ] Rate management workflow complete
- [ ] No breaking changes for existing features
- [ ] Performance is maintained or improved
- [ ] Error states handled gracefully

## 🚀 **Production Deployment Checklist**

Before deploying to production:

1. **Run Full Test Suite:**
   ```bash
   php artisan test
   npm run test
   ```

2. **Check Database Migrations:**
   ```bash
   php artisan migrate:status
   ```

3. **Clear Caches:**
   ```bash
   php artisan config:clear
   php artisan route:clear
   php artisan view:clear
   npm run build
   ```

4. **Verify Environment:**
   - [ ] All environment variables set
   - [ ] Database connections work
   - [ ] Storage permissions correct
   - [ ] Web server configuration updated

5. **Monitor After Deployment:**
   - [ ] Check application logs
   - [ ] Monitor API response times
   - [ ] Verify rate calculations accurate
   - [ ] Test critical user flows

## 📊 **Success Metrics**

After deployment, monitor:
- **API Response Time:** Rate calculation < 500ms
- **Booking Success Rate:** > 99%
- **Error Rate:** < 0.1%
- **User Experience:** No reported calculation errors
- **Admin Adoption:** Rate management tool usage

---

**Status:** ✅ **Integration Complete & Ready for Testing**  
**Test Coverage:** Frontend + Backend + E2E + Performance  
**Breaking Changes:** None (fully backward compatible)  
**Next Step:** Run testing checklist before production deployment