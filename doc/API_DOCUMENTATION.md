# API Documentation
## Property Management System

---

## 1. API OVERVIEW

### 1.1 Base Information
- **Base URL**: `https://api.pms.com/v1`
- **Authentication**: Bearer Token (Laravel Sanctum)
- **Content-Type**: `application/json`
- **Rate Limiting**: 100 requests per minute per user

### 1.2 Response Format
```json
{
    "success": true,
    "message": "Operation successful",
    "data": {},
    "meta": {
        "current_page": 1,
        "total": 100,
        "per_page": 15
    }
}
```

### 1.3 Error Response Format
```json
{
    "success": false,
    "message": "Error message",
    "errors": {
        "field_name": ["Error description"]
    }
}
```

---

## 2. AUTHENTICATION

### 2.1 Login
```http
POST /auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": 1,
            "name": "John Doe",
            "email": "user@example.com",
            "role": "property_owner"
        },
        "token": "1|laravel_sanctum_token_here"
    }
}
```

### 2.2 Register
```http
POST /auth/register
Content-Type: application/json

{
    "name": "John Doe",
    "email": "user@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "property_owner"
}
```

### 2.3 Logout
```http
POST /auth/logout
Authorization: Bearer {token}
```

---

## 3. PROPERTIES API

### 3.1 Get Properties List
```http
GET /properties?page=1&per_page=15&status=active&featured=true
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 15, max: 100)
- `status` (string): active, inactive, maintenance
- `featured` (boolean): Filter featured properties
- `search` (string): Search by name or location
- `min_price` (number): Minimum price filter
- `max_price` (number): Maximum price filter
- `capacity` (int): Minimum capacity required
- `amenities[]` (array): Filter by amenity IDs

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "Villa Bali Paradise",
            "slug": "villa-bali-paradise",
            "description": "Beautiful villa with ocean view",
            "address": "Seminyak, Bali",
            "capacity": 8,
            "capacity_max": 12,
            "bedroom_count": 4,
            "bathroom_count": 3,
            "base_rate": 1500000,
            "status": "active",
            "is_featured": true,
            "cover_image": "https://example.com/villa1-cover.jpg",
            "amenities": [
                {
                    "id": 1,
                    "name": "WiFi",
                    "icon": "wifi-icon"
                }
            ],
            "media_count": 15,
            "rating_average": 4.8,
            "reviews_count": 45
        }
    ],
    "meta": {
        "current_page": 1,
        "total": 100,
        "per_page": 15,
        "last_page": 7
    }
}
```

### 3.2 Get Property Detail
```http
GET /properties/{id}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "name": "Villa Bali Paradise",
        "slug": "villa-bali-paradise",
        "description": "Detailed property description...",
        "address": "Jl. Seminyak No. 123, Bali",
        "lat": -8.6705,
        "lng": 115.1614,
        "capacity": 8,
        "capacity_max": 12,
        "bedroom_count": 4,
        "bathroom_count": 3,
        "base_rate": 1500000,
        "weekend_premium_percent": 20,
        "cleaning_fee": 200000,
        "extra_bed_rate": 150000,
        "house_rules": "No smoking, no pets...",
        "check_in_time": "14:00:00",
        "check_out_time": "11:00:00",
        "min_stay_weekday": 1,
        "min_stay_weekend": 2,
        "seo_title": "Villa Bali Paradise - Luxury Stay",
        "media": [
            {
                "id": 1,
                "media_type": "image",
                "file_path": "/storage/properties/1/villa-exterior.jpg",
                "category": "exterior",
                "title": "Villa Exterior",
                "is_cover": true,
                "display_order": 1
            }
        ],
        "amenities": [
            {
                "id": 1,
                "name": "WiFi",
                "icon": "wifi-icon",
                "category": "basic"
            }
        ],
        "owner": {
            "id": 2,
            "name": "Property Owner",
            "email": "owner@example.com"
        }
    }
}
```

### 3.3 Create Property
```http
POST /properties
Authorization: Bearer {token}
Content-Type: application/json

{
    "name": "New Villa",
    "description": "Amazing villa description",
    "address": "Bali, Indonesia",
    "lat": -8.6705,
    "lng": 115.1614,
    "capacity": 6,
    "capacity_max": 8,
    "bedroom_count": 3,
    "bathroom_count": 2,
    "base_rate": 1200000,
    "amenities": [1, 2, 3, 4],
    "house_rules": "Property rules..."
}
```

### 3.4 Update Property
```http
PUT /properties/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
    "name": "Updated Villa Name",
    "base_rate": 1300000
}
```

### 3.5 Delete Property
```http
DELETE /properties/{id}
Authorization: Bearer {token}
```

---

## 4. BOOKINGS API

### 4.1 Get Bookings List
```http
GET /bookings?status=confirmed&property_id=1&check_in_from=2024-01-01
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` (string): pending_verification, confirmed, checked_in, checked_out, cancelled
- `payment_status` (string): dp_pending, dp_received, fully_paid, overdue
- `property_id` (int): Filter by property
- `check_in_from` (date): Filter bookings from date
- `check_in_to` (date): Filter bookings to date
- `guest_email` (string): Filter by guest email

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "booking_number": "BK20240101001",
            "property": {
                "id": 1,
                "name": "Villa Bali Paradise",
                "address": "Seminyak, Bali"
            },
            "guest_name": "John Doe",
            "guest_email": "john@example.com",
            "guest_phone": "+62812345678",
            "guest_count": 4,
            "check_in": "2024-02-15",
            "check_out": "2024-02-18",
            "nights": 3,
            "total_amount": 4500000,
            "dp_amount": 1350000,
            "remaining_amount": 3150000,
            "payment_status": "dp_received",
            "booking_status": "confirmed",
            "created_at": "2024-01-15T10:30:00Z"
        }
    ]
}
```

### 4.2 Create Booking
```http
POST /bookings
Content-Type: application/json

{
    "property_id": 1,
    "guest_name": "John Doe",
    "guest_email": "john@example.com",
    "guest_phone": "+62812345678",
    "guest_count": 4,
    "guest_male": 2,
    "guest_female": 2,
    "guest_children": 0,
    "relationship_type": "keluarga",
    "check_in": "2024-02-15",
    "check_out": "2024-02-18",
    "special_requests": "Late check-in requested",
    "services": [
        {
            "service_type": "breakfast",
            "quantity": 4,
            "notes": "No meat for guest 1"
        }
    ]
}
```

**Response:**
```json
{
    "success": true,
    "message": "Booking created successfully",
    "data": {
        "id": 1,
        "booking_number": "BK20240101001",
        "property_id": 1,
        "guest_name": "John Doe",
        "total_amount": 4500000,
        "extra_bed_amount": 0,
        "service_amount": 300000,
        "dp_amount": 1350000,
        "remaining_amount": 3150000,
        "booking_status": "pending_verification",
        "payment_status": "dp_pending",
        "services": [
            {
                "service_type": "breakfast",
                "service_name": "Breakfast Package",
                "quantity": 4,
                "unit_price": 75000,
                "total_price": 300000
            }
        ]
    }
}
```

### 4.3 Get Booking Detail
```http
GET /bookings/{id}
Authorization: Bearer {token}
```

### 4.4 Update Booking Status
```http
PATCH /bookings/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
    "booking_status": "confirmed",
    "verification_notes": "All details verified"
}
```

### 4.5 Cancel Booking
```http
POST /bookings/{id}/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
    "cancellation_reason": "Guest requested cancellation"
}
```

---

## 5. PAYMENTS API

### 5.1 Get Payments List
```http
GET /payments?booking_id=1&status=verified
Authorization: Bearer {token}
```

### 5.2 Create Payment Record
```http
POST /payments
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
    "booking_id": 1,
    "amount": 1350000,
    "payment_type": "dp",
    "payment_method": "bank_transfer",
    "reference_number": "TXN123456789",
    "bank_name": "BCA",
    "account_name": "John Doe",
    "payment_proof": [file upload]
}
```

### 5.3 Verify Payment
```http
POST /payments/{id}/verify
Authorization: Bearer {token}
Content-Type: application/json

{
    "verification_notes": "Payment verified successfully"
}
```

---

## 6. PROPERTY AVAILABILITY API

### 6.1 Check Availability
```http
GET /properties/{id}/availability?check_in=2024-02-15&check_out=2024-02-18&guest_count=4
```

**Response:**
```json
{
    "success": true,
    "data": {
        "available": true,
        "property_id": 1,
        "check_in": "2024-02-15",
        "check_out": "2024-02-18",
        "nights": 3,
        "guest_count": 4,
        "pricing": {
            "base_rate": 1500000,
            "total_base_amount": 4500000,
            "weekend_premium": 300000,
            "extra_bed_needed": 0,
            "extra_bed_cost": 0,
            "cleaning_fee": 200000,
            "total_amount": 5000000
        },
        "extra_beds_calculation": {
            "standard_capacity": 8,
            "requested_guests": 4,
            "extra_beds_needed": 0,
            "extra_bed_rate": 150000
        }
    }
}
```

### 6.2 Get Property Calendar
```http
GET /properties/{id}/calendar?year=2024&month=2
Authorization: Bearer {token}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "property_id": 1,
        "year": 2024,
        "month": 2,
        "calendar": [
            {
                "date": "2024-02-01",
                "status": "available",
                "rate": 1500000,
                "is_weekend": false,
                "booking_id": null
            },
            {
                "date": "2024-02-15",
                "status": "booked",
                "rate": 1500000,
                "is_weekend": false,
                "booking_id": 1,
                "booking_number": "BK20240101001"
            }
        ]
    }
}
```

---

## 7. MEDIA MANAGEMENT API

### 7.1 Upload Property Media
```http
POST /properties/{id}/media
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
    "media_type": "image",
    "category": "exterior",
    "title": "Villa Front View",
    "alt_text": "Beautiful villa exterior",
    "files[]": [file uploads]
}
```

### 7.2 Update Media Order
```http
PUT /properties/{id}/media/reorder
Authorization: Bearer {token}
Content-Type: application/json

{
    "media_ids": [1, 3, 2, 4, 5]
}
```

### 7.3 Delete Media
```http
DELETE /media/{id}
Authorization: Bearer {token}
```

---

## 8. REPORTS API

### 8.1 Financial Report
```http
GET /reports/financial?property_id=1&start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer {token}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "property_id": 1,
        "period": {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        },
        "summary": {
            "total_revenue": 15000000,
            "total_expenses": 3000000,
            "net_profit": 12000000,
            "occupancy_rate": 75.5,
            "adr": 1650000,
            "revpar": 1246575
        },
        "bookings": {
            "total_bookings": 12,
            "confirmed_bookings": 10,
            "cancelled_bookings": 2,
            "total_nights": 45,
            "total_guests": 38
        },
        "payments": {
            "dp_received": 4500000,
            "full_payments": 10500000,
            "pending_payments": 1000000
        }
    }
}
```

### 8.2 Occupancy Report
```http
GET /reports/occupancy?property_id=1&year=2024
Authorization: Bearer {token}
```

---

## 9. WEBHOOKS

### 9.1 Payment Gateway Webhook
```http
POST /webhooks/payment
Content-Type: application/json
X-Signature: webhook_signature

{
    "event": "payment.success",
    "transaction_id": "TXN123456",
    "booking_id": 1,
    "amount": 1350000,
    "status": "paid",
    "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 10. ERROR CODES

| Code | Status | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., double booking) |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

**API Version**: 1.0  
**Last Updated**: 2025 
**Status**: In Development  
**Authentication**: Required for most endpoints 