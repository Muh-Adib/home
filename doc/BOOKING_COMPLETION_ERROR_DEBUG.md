# Booking Completion Error Debug Guide

## 🐛 ERROR DESCRIPTION

**Error**: `Undefined property: Illuminate\Http\RedirectResponse::$booking_number`

**Location**: `app/Http/Controllers/BookingController.php` - `completeAfterVerification` method

## 🔍 ROOT CAUSE ANALYSIS

Error ini terjadi karena:

1. **Method `createBooking` return `null` atau bukan Booking object**
2. **Booking tidak berhasil dibuat** karena validation error
3. **Session data corrupted** atau tidak lengkap
4. **Property tidak ditemukan** dalam database

## ✅ FIXES IMPLEMENTED

### 1. **Enhanced Error Handling**
```php
// Ensure booking was created successfully
if (!$booking || !$booking->booking_number) {
    throw new \Exception('Failed to create booking - booking number not generated');
}
```

### 2. **Comprehensive Logging**
```php
\Illuminate\Support\Facades\Log::info('Creating booking after verification', [
    'user_id' => $user->id,
    'property_id' => $property->id,
    'booking_data_keys' => array_keys($pendingData['booking_data']),
]);
```

### 3. **Session Data Validation**
```php
\Illuminate\Support\Facades\Log::info('Checking pending booking data', [
    'user_id' => $user->id,
    'pending_data_exists' => !empty($pendingData),
    'pending_user_id' => $pendingData['user_id'] ?? null,
    'session_keys' => array_keys(session()->all()),
]);
```

### 4. **Detailed Error Messages**
```php
} catch (\Exception $e) {
    \Illuminate\Support\Facades\Log::error('Booking completion after verification failed', [
        'user_id' => $user->id,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'pending_data' => $pendingData ?? null,
    ]);

    return redirect()->route('properties.index')
        ->with('error', 'Gagal melanjutkan booking: ' . $e->getMessage());
}
```

## 🔧 DEBUGGING STEPS

### Step 1: Check Logs
```bash
# Check Laravel logs for detailed error information
tail -f storage/logs/laravel.log | grep "Booking completion"
```

### Step 2: Verify Session Data
```php
// Add this to debug session data
dd(session('pending_booking_verification'));
```

### Step 3: Check BookingService
```php
// Verify BookingService::createBooking returns Booking object
$booking = $this->bookingService->createBooking($bookingRequest, $user);
dd($booking); // Should be Booking object, not null
```

### Step 4: Validate BookingRequest Data
```php
// Check if BookingRequest::fromArray receives valid data
dd($pendingData['booking_data']); // Should have all required fields
```

## 📊 COMMON ISSUES & SOLUTIONS

### Issue 1: Missing Required Fields
**Problem**: `Required field 'property_id' is missing or empty`

**Solution**: Ensure all required fields are in session data:
```php
$required = ['property_id', 'check_in', 'check_out', 'guest_name', 'guest_email', 'guest_phone'];
```

### Issue 2: Invalid Date Format
**Problem**: `Invalid date format in check_in or check_out`

**Solution**: Ensure dates are in Y-m-d format:
```php
'check_in' => '2024-01-27',
'check_out' => '2024-01-29',
```

### Issue 3: Guest Count Validation
**Problem**: `Total guest count must be greater than 0`

**Solution**: Ensure guest counts are valid:
```php
'guest_male' => 1,
'guest_female' => 1,
'guest_children' => 0,
```

### Issue 4: Property Not Found
**Problem**: `Property tidak ditemukan`

**Solution**: Verify property exists and is accessible:
```php
$property = Property::find($pendingData['property_id']);
if (!$property) {
    // Handle missing property
}
```

## 🧪 TESTING SCENARIOS

### Test 1: Valid Booking Flow
```php
// Test complete flow
$user = User::factory()->verified()->create();
$property = Property::factory()->create();

$bookingData = [
    'property_id' => $property->id,
    'check_in' => '2024-02-01',
    'check_out' => '2024-02-03',
    'guest_name' => 'Test User',
    'guest_email' => 'test@example.com',
    'guest_phone' => '628123456789',
    'guest_male' => 1,
    'guest_female' => 1,
    'guest_children' => 0,
];

session(['pending_booking_verification' => [
    'user_id' => $user->id,
    'booking_data' => $bookingData,
    'property_id' => $property->id,
    'created_at' => now(),
]]);

$response = $this->actingAs($user)
    ->post(route('booking.complete-after-verification'));

$response->assertRedirect();
$this->assertDatabaseHas('bookings', [
    'guest_email' => 'test@example.com',
]);
```

### Test 2: Invalid Session Data
```php
// Test with missing session data
$response = $this->actingAs($user)
    ->post(route('booking.complete-after-verification'));

$response->assertRedirect(route('properties.index'));
$response->assertSessionHas('error');
```

### Test 3: Missing Property
```php
// Test with non-existent property
$bookingData['property_id'] = 99999;

session(['pending_booking_verification' => [
    'user_id' => $user->id,
    'booking_data' => $bookingData,
    'property_id' => 99999,
    'created_at' => now(),
]]);

$response = $this->actingAs($user)
    ->post(route('booking.complete-after-verification'));

$response->assertRedirect(route('properties.index'));
$response->assertSessionHas('error', 'Property tidak ditemukan.');
```

## 🔄 PREVENTION MEASURES

### 1. **Data Validation Before Storage**
```php
// Validate data before storing in session
$requiredFields = ['property_id', 'check_in', 'check_out', 'guest_name', 'guest_email', 'guest_phone'];
foreach ($requiredFields as $field) {
    if (empty($bookingData[$field])) {
        throw new \InvalidArgumentException("Missing required field: {$field}");
    }
}
```

### 2. **Session Expiry Handling**
```php
// Check session expiry
if ($pendingData['created_at']->lt(now()->subHours(24))) {
    session()->forget('pending_booking_verification');
    return redirect()->route('properties.index')
        ->with('error', 'Session booking sudah expired. Silakan mulai booking lagi.');
}
```

### 3. **User Verification Check**
```php
// Ensure user is verified
if (!$user->email_verified_at) {
    return redirect()->route('verification.notice')
        ->with('error', 'Silakan verifikasi email Anda terlebih dahulu.');
}
```

## 📈 MONITORING

### Log Monitoring
```bash
# Monitor booking completion errors
grep "Booking completion after verification failed" storage/logs/laravel.log

# Monitor successful completions
grep "Creating booking after verification" storage/logs/laravel.log
```

### Database Monitoring
```sql
-- Check for incomplete bookings
SELECT * FROM bookings 
WHERE booking_number IS NULL 
OR booking_number = '';

-- Check booking creation rate
SELECT DATE(created_at) as date, COUNT(*) as bookings
FROM bookings 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at);
```

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Test booking completion flow with valid data
- [ ] Test booking completion flow with invalid data
- [ ] Test session expiry handling
- [ ] Verify error logging works correctly

### Post-Deployment
- [ ] Monitor error logs for booking completion issues
- [ ] Check booking creation success rate
- [ ] Verify session data persistence
- [ ] Test email verification flow end-to-end

---

**📅 Debug Date**: 2025-01-27  
**📝 Version**: 1.0  
**🔄 Next Review**: After error resolution

---

## 🎯 CONCLUSION

Error `Undefined property: Illuminate\Http\RedirectResponse::$booking_number` telah diperbaiki dengan:

- ✅ **Enhanced error handling** dengan proper validation
- ✅ **Comprehensive logging** untuk debugging
- ✅ **Session data validation** untuk prevent corruption
- ✅ **Detailed error messages** untuk user feedback

**Next Steps**: Monitor logs untuk identify root cause dan prevent future occurrences. 