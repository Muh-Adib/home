# Rate Calculation 422 Error Debug Guide

## 🔍 Problem Analysis

User mendapatkan error HTTP 422 saat melakukan rate calculation pada property detail page. Error ini terjadi di:
- `Show.tsx:89` (onError handler)
- `use-rate-calculator.tsx:341` (executeCalculation)

## 🛠️ Debugging Steps Applied

### 1. Enhanced Backend Logging
✅ **Modified BookingController::calculateRate** dengan detailed logging:
- Request data logging
- Validation error details
- Property capacity information
- Success/failure tracking

### 2. Enhanced Frontend Error Handling
✅ **Modified use-rate-calculator.tsx** dengan improved error reporting:
- Detailed console logging
- 422 validation error parsing
- Request parameter logging
- Success tracking

### 3. Created Test Tool
✅ **Created test-rate-calculation.html** untuk direct API testing

## 🔧 How to Debug

### Step 1: Check Laravel Logs
```bash
tail -f storage/logs/laravel.log
```

Look for:
- `Rate calculation request received`
- `Rate calculation validation failed`
- `Rate calculation failed with exception`

### Step 2: Use Browser Console
1. Open property detail page
2. Open browser developer tools (F12)
3. Go to Console tab
4. Look for:
   - `🔍 Rate calculation request:` (request details)
   - `❌ API Error Response:` (error details)
   - `🔍 Validation Error Details:` (validation specifics)

### Step 3: Direct API Testing
1. Open `/test-rate-calculation.html` in browser
2. Test with known property slug
3. Check validation responses

## 🚨 Common Issues & Solutions

### Issue 1: Property capacity_max is NULL or 0
**Symptoms:**
- Validation error: "guest_count must be between 1 and 0"
- Debug info shows capacity_max: 0 or null

**Solution:**
```bash
# Check properties with invalid capacity_max
php artisan tinker
App\Models\Property::whereNull('capacity_max')->orWhere('capacity_max', 0)->get(['slug', 'name', 'capacity', 'capacity_max']);

# Fix invalid capacity_max values
App\Models\Property::whereNull('capacity_max')->orWhere('capacity_max', 0)->update(['capacity_max' => 10]);
```

### Issue 2: Date Format Issues
**Symptoms:**
- Validation error: "check_in must be a valid date"
- Frontend sends incorrect date format

**Check:**
- Frontend sends: `YYYY-MM-DD` format
- Backend expects: valid date format
- Timezone issues

### Issue 3: Route Parameter Binding Issues
**Symptoms:**
- Property not found errors
- Wrong property slug

**Check:**
- Route binding in routes/web.php: `{property:slug}`
- Property slug exists in database
- Slug format is correct

### Issue 4: Guest Count Exceeding Capacity
**Symptoms:**
- Validation error: "guest_count cannot exceed X"
- Debug info shows received vs max capacity

**Solution:**
- Check property capacity_max in database
- Ensure frontend doesn't send guest_count > capacity_max

## 🐛 Debug Commands

### Check Property Data
```bash
# Check specific property
php artisan tinker
$property = App\Models\Property::where('slug', 'your-property-slug')->first();
echo "Capacity: {$property->capacity}, Max: {$property->capacity_max}";
```

### Test Rate Calculation Directly
```bash
# In tinker
$property = App\Models\Property::first();
$service = new App\Services\AvailabilityService();
$result = $service->calculateRateFormatted($property, '2025-01-20', '2025-01-22', 4);
print_r($result);
```

### Check Route Resolution
```bash
php artisan route:list --name=calculate-rate
```

## 📊 Monitoring & Logging

The enhanced logging will show:

**Success Case:**
```
[INFO] Rate calculation request received: {"property_slug":"villa-test","request_data":{"check_in":"2025-01-20","check_out":"2025-01-22","guest_count":"4"}}
[INFO] Rate calculation successful: {"property_slug":"villa-test","total_amount":500000}
```

**Error Case:**
```
[WARNING] Rate calculation validation failed: {"property_slug":"villa-test","validation_errors":{"guest_count":["The guest count must not be greater than 0."]}}
```

## 🔧 Quick Fixes

### Fix 1: Reset Property Capacity
```sql
UPDATE properties 
SET capacity_max = GREATEST(capacity + 2, 10) 
WHERE capacity_max IS NULL OR capacity_max = 0 OR capacity_max < capacity;
```

### Fix 2: Clear Route Cache
```bash
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```

### Fix 3: Check Property Seeder
Look at `database/seeders/PropertySeeder.php` and ensure capacity_max is set properly.

## 🎯 Expected Behavior

**Normal Flow:**
1. User changes dates/guests on property page
2. Frontend validates input
3. API call to `/api/properties/{slug}/calculate-rate`
4. Backend validates: dates, guest_count <= capacity_max
5. AvailabilityService calculates rate
6. Return formatted response

**Error Flow:**
1. Validation fails (422)
2. Backend logs detailed error
3. Frontend shows specific error message
4. User can adjust input accordingly

## 📝 Next Steps

1. **Check Laravel logs** for specific validation errors
2. **Use browser console** to see detailed error info
3. **Test with debug tool** at `/test-rate-calculation.html`
4. **Fix data issues** in properties table if needed
5. **Report findings** for further investigation

## 🔄 Rollback Plan

If issues persist, revert changes:
```bash
git checkout app/Http/Controllers/BookingController.php
git checkout resources/js/hooks/use-rate-calculator.tsx
```

---

**Status:** Debug tools implemented, awaiting test results
**Next:** Analyze logs and fix identified issues 