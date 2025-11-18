# API Client Documentation

## Overview

API Client adalah single entry point untuk semua API calls di aplikasi. Ini menyediakan:
- ✅ Centralized error handling
- ✅ Automatic CSRF token management
- ✅ Request/response interceptors
- ✅ Retry logic dengan exponential backoff
- ✅ TypeScript type safety
- ✅ Security headers

## Struktur

```
resources/js/lib/api/
├── client.ts              # Core API client dengan error handling
├── services/              # Service layer untuk setiap resource
│   ├── properties.service.ts
│   ├── bookings.service.ts
│   ├── payments.service.ts
│   ├── notifications.service.ts
│   └── index.ts
└── index.ts              # Main export
```

## Penggunaan

### 1. Import API Client atau Services

```typescript
// Option 1: Import specific service
import { propertiesService } from '@/lib/api';

// Option 2: Import API client directly
import { ApiClient } from '@/lib/api';

// Option 3: Import all services
import { propertiesService, bookingsService, paymentsService } from '@/lib/api';
```

### 2. Menggunakan Service Layer (Recommended)

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

### 3. Menggunakan API Client Langsung

```typescript
import { ApiClient } from '@/lib/api';

// GET request
const data = await ApiClient.get('/api/properties');

// POST request
const result = await ApiClient.post('/api/bookings', {
    property_id: 1,
    check_in: '2025-02-01',
    check_out: '2025-02-05',
});

// PUT request
const updated = await ApiClient.put('/api/properties/1', {
    name: 'Updated Name',
});

// DELETE request
await ApiClient.delete('/api/properties/1');

// File upload
const uploaded = await ApiClient.upload('/api/media/upload', file);
```

### 4. Error Handling

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
    }
}
```

## Service Methods

### PropertiesService

- `getAll(params?)` - Get all properties
- `getById(idOrSlug)` - Get property by ID or slug
- `calculateRate(propertySlug, params)` - Calculate booking rate
- `getAvailability(propertySlug, params)` - Get availability
- `getAvailabilityAndRates(propertySlug, params)` - Get availability and rates
- `getMapCoordinates()` - Get map coordinates
- `search(params)` - Search properties
- `create(data)` - Create property (admin)
- `update(idOrSlug, data)` - Update property (admin)
- `delete(idOrSlug)` - Delete property (admin)

### BookingsService

- `getAll(params?)` - Get all bookings
- `getById(idOrNumber)` - Get booking by ID or booking number
- `create(data)` - Create booking
- `update(idOrNumber, data)` - Update booking
- `cancel(idOrNumber, reason?)` - Cancel booking
- `checkEmail(email)` - Check if email exists
- `checkAvailability(data)` - Check availability (admin)
- `calculateRate(data)` - Calculate rate (admin)
- `getAvailabilityAndRates(data)` - Get availability and rates (admin)
- `getPropertyDateRange(propertyId, startDate, endDate)` - Get property date range (admin)
- `getTimeline(params)` - Get timeline (admin)

### PaymentsService

- `getAll(params?)` - Get all payments
- `getById(idOrNumber)` - Get payment by ID or payment number
- `create(data)` - Create payment
- `verify(idOrNumber, data?)` - Verify payment
- `reject(idOrNumber, reason?)` - Reject payment

### NotificationsService

- `getAll()` - Get all notifications
- `getUnread()` - Get unread notifications
- `getRecent(limit?)` - Get recent notifications
- `getCount()` - Get notification count
- `markAsRead(id)` - Mark notification as read
- `markAllAsRead()` - Mark all as read
- `delete(id)` - Delete notification
- `clearRead()` - Clear read notifications

## Configuration

Konfigurasi API ada di `resources/js/config/api.ts`:

```typescript
export const API_CONFIG = {
    BASE_URL: '', // Empty untuk relative URLs
    TIMEOUT: 30000, // 30 seconds
    RETRY: {
        attempts: 3,
        delay: 1000, // 1 second
    },
};
```

## Security Features

1. **CSRF Protection**: Automatic CSRF token handling dengan refresh on 419
2. **Auth Token**: Support untuk Bearer token authentication
3. **Security Headers**: Automatic security headers dari backend
4. **Error Handling**: Comprehensive error handling dengan retry logic
5. **Type Safety**: Full TypeScript support dengan type definitions

## Best Practices

1. **Gunakan Service Layer**: Selalu gunakan service layer daripada API client langsung
2. **Error Handling**: Selalu wrap API calls dengan try-catch
3. **Type Safety**: Gunakan TypeScript types yang sudah disediakan
4. **Loading States**: Handle loading states dengan proper state management
5. **Caching**: Consider caching untuk data yang tidak sering berubah

## Migration dari fetch()

### Before:
```typescript
const response = await fetch(`/api/properties/${slug}/calculate-rate?${params}`);
const result = await response.json();
```

### After:
```typescript
const result = await propertiesService.calculateRate(slug, {
    check_in: '2025-02-01',
    check_out: '2025-02-05',
    guest_count: 4,
});
```

## Troubleshooting

### CSRF Token Errors (419)
- API client akan otomatis refresh CSRF token
- Jika masih error, check apakah meta tag CSRF ada di HTML

### Timeout Errors
- Increase timeout di `API_CONFIG.TIMEOUT`
- Check network connection

### Authentication Errors (401)
- Check apakah user sudah login
- Verify auth token di localStorage/sessionStorage

### Network Errors
- API client akan retry otomatis dengan exponential backoff
- Check network connection dan server status



