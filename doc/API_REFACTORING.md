# API Refactoring Documentation

## Overview

Refactoring API untuk membuat struktur yang terorganisir dengan single entry point dan keamanan yang sesuai untuk frontend dan backend.

## Struktur Baru

### Frontend Structure

```
resources/js/lib/api/
├── client.ts                    # Core API client dengan error handling
├── services/                    # Service layer untuk setiap resource
│   ├── properties.service.ts    # Property-related API calls
│   ├── bookings.service.ts      # Booking-related API calls
│   ├── payments.service.ts      # Payment-related API calls
│   ├── notifications.service.ts # Notification-related API calls
│   └── index.ts                # Service exports
├── index.ts                     # Main API export
└── README.md                    # API documentation
```

### Backend Structure

```
app/Http/Middleware/
└── ApiResponseFormatter.php     # Middleware untuk format API responses
```

## Fitur Utama

### 1. Centralized API Client

- ✅ Single entry point untuk semua API calls
- ✅ Automatic CSRF token management
- ✅ Request/response interceptors
- ✅ Retry logic dengan exponential backoff
- ✅ Timeout handling
- ✅ Comprehensive error handling

### 2. Service Layer

- ✅ Organized by resource (Properties, Bookings, Payments, Notifications)
- ✅ TypeScript type safety
- ✅ Consistent API interface
- ✅ Easy to test and maintain

### 3. Security Features

**Frontend:**
- Automatic CSRF token handling
- Support untuk Bearer token authentication
- Secure headers management
- Error handling yang aman

**Backend:**
- API Response Formatter middleware
- Security headers (X-Content-Type-Options, X-Frame-Options, dll)
- Consistent response format
- Error response standardization

## Penggunaan

### Import API Services

```typescript
// Import specific service
import { propertiesService } from '@/lib/api';

// Import multiple services
import { propertiesService, bookingsService, paymentsService } from '@/lib/api';

// Import API client directly
import { ApiClient } from '@/lib/api';
```

### Contoh Penggunaan

#### Properties Service

```typescript
import { propertiesService } from '@/lib/api';

// Get property by slug
const property = await propertiesService.getById('villa-bali');

// Calculate rate
const rate = await propertiesService.calculateRate('villa-bali', {
    check_in: '2025-02-01',
    check_out: '2025-02-05',
    guest_count: 4,
});

// Get availability
const availability = await propertiesService.getAvailability('villa-bali', {
    start_date: '2025-02-01',
    end_date: '2025-02-28',
    guest_count: 4,
});
```

#### Bookings Service

```typescript
import { bookingsService } from '@/lib/api';

// Create booking
const booking = await bookingsService.create({
    check_in: '2025-02-01',
    check_out: '2025-02-05',
    guest_male: 2,
    guest_female: 2,
    guest_children: 0,
    guest_count: 4,
    guest_name: 'John Doe',
    guest_email: 'john@example.com',
    guest_phone: '+6281234567890',
    guest_country: 'Indonesia',
    guest_gender: 'male',
    relationship_type: 'keluarga',
    dp_percentage: 50,
});

// Check email
const emailCheck = await bookingsService.checkEmail('john@example.com');
```

#### Payments Service

```typescript
import { paymentsService } from '@/lib/api';

// Create payment
const payment = await paymentsService.create({
    booking_id: 1,
    amount: 1000000,
    payment_method_id: 1,
    payment_type: 'dp',
    proof: file, // File object
});

// Verify payment
const verified = await paymentsService.verify(payment.id, {
    notes: 'Payment verified',
});
```

#### Notifications Service

```typescript
import { notificationsService } from '@/lib/api';

// Get unread notifications
const unread = await notificationsService.getUnread();

// Mark as read
await notificationsService.markAsRead(notificationId);

// Get count
const { unread, total } = await notificationsService.getCount();
```

### Error Handling

```typescript
import { ApiClient, ApiError } from '@/lib/api';

try {
    const data = await propertiesService.getById('villa-bali');
} catch (error) {
    if (error instanceof Error && 'status' in error) {
        const apiError = error as ApiError;
        console.error('API Error:', apiError.message);
        console.error('Status:', apiError.status);
        console.error('Errors:', apiError.errors);
        
        // Handle specific errors
        if (apiError.status === 401) {
            // Unauthorized - redirect to login
        } else if (apiError.status === 403) {
            // Forbidden - show access denied
        } else if (apiError.status === 404) {
            // Not found
        } else if (apiError.status === 419) {
            // CSRF token expired - will auto refresh
        } else if (apiError.status >= 500) {
            // Server error - show error message
        }
    }
}
```

## Migration Guide

### Before (Old Way)

```typescript
// Direct fetch calls
const response = await fetch(`/api/properties/${slug}/calculate-rate?${params}`);
const result = await response.json();
```

### After (New Way)

```typescript
// Using service layer
const result = await propertiesService.calculateRate(slug, {
    check_in: '2025-02-01',
    check_out: '2025-02-05',
    guest_count: 4,
});
```

### Migration Steps

1. **Identify all fetch() calls** in your components
2. **Replace with service methods** from appropriate service
3. **Update error handling** to use ApiError type
4. **Test thoroughly** to ensure functionality

## Configuration

### API Config (`resources/js/config/api.ts`)

```typescript
export const API_CONFIG = {
    BASE_URL: '', // Empty untuk relative URLs (same-origin)
    TIMEOUT: 30000, // 30 seconds
    RETRY: {
        attempts: 3,
        delay: 1000, // 1 second
    },
};
```

### Backend Middleware

Middleware `ApiResponseFormatter` sudah terdaftar di `bootstrap/app.php` untuk format semua API responses.

## Security Features

### Frontend Security

1. **CSRF Protection**: Automatic CSRF token handling dengan refresh on 419
2. **Auth Token**: Support untuk Bearer token authentication
3. **Secure Headers**: Automatic security headers dari backend
4. **Error Handling**: Comprehensive error handling dengan retry logic

### Backend Security

1. **Response Formatting**: Consistent response format
2. **Security Headers**: 
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Referrer-Policy: strict-origin-when-cross-origin
3. **Error Standardization**: Consistent error response format

## Best Practices

1. **Always use Service Layer**: Jangan gunakan ApiClient langsung kecuali untuk custom endpoints
2. **Error Handling**: Selalu wrap API calls dengan try-catch
3. **Type Safety**: Gunakan TypeScript types yang sudah disediakan
4. **Loading States**: Handle loading states dengan proper state management
5. **Caching**: Consider caching untuk data yang tidak sering berubah

## Troubleshooting

### CSRF Token Errors (419)

- API client akan otomatis refresh CSRF token
- Jika masih error, check apakah meta tag CSRF ada di HTML:
  ```html
  <meta name="csrf-token" content="{{ csrf_token() }}">
  ```

### Timeout Errors

- Increase timeout di `API_CONFIG.TIMEOUT`
- Check network connection
- Check server response time

### Authentication Errors (401)

- Check apakah user sudah login
- Verify auth token di localStorage/sessionStorage
- Check middleware authentication di backend

### Network Errors

- API client akan retry otomatis dengan exponential backoff
- Check network connection dan server status
- Check CORS configuration jika menggunakan cross-origin

## Testing

### Unit Tests

```typescript
import { propertiesService } from '@/lib/api';

describe('PropertiesService', () => {
    it('should get property by slug', async () => {
        const property = await propertiesService.getById('villa-bali');
        expect(property).toBeDefined();
        expect(property.slug).toBe('villa-bali');
    });
});
```

### Integration Tests

Test API calls dengan mock server atau test database.

## Next Steps

1. ✅ API Client terpusat - **COMPLETED**
2. ✅ Service layer untuk setiap resource - **COMPLETED**
3. ✅ TypeScript types - **COMPLETED**
4. ✅ Backend middleware - **COMPLETED**
5. ⏳ Update semua komponen untuk menggunakan API client baru - **IN PROGRESS**
6. ⏳ Add unit tests untuk services
7. ⏳ Add integration tests
8. ⏳ Performance optimization

## Files Changed

### New Files

- `resources/js/lib/api/client.ts`
- `resources/js/lib/api/services/properties.service.ts`
- `resources/js/lib/api/services/bookings.service.ts`
- `resources/js/lib/api/services/payments.service.ts`
- `resources/js/lib/api/services/notifications.service.ts`
- `resources/js/lib/api/services/index.ts`
- `resources/js/lib/api/index.ts`
- `resources/js/lib/api/README.md`
- `app/Http/Middleware/ApiResponseFormatter.php`
- `doc/API_REFACTORING.md`

### Modified Files

- `resources/js/config/api.ts` - Updated BASE_URL
- `resources/js/pages/Booking/Create.tsx` - Updated to use propertiesService
- `bootstrap/app.php` - Added ApiResponseFormatter middleware

## Support

Untuk pertanyaan atau issues, silakan check:
- `resources/js/lib/api/README.md` - API documentation
- `doc/API_DOCUMENTATION.md` - Backend API documentation
- `doc/AI_CODING_RULES.md` - Coding standards



