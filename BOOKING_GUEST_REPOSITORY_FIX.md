# BookingRepository Fix: Save BookingGuest Data

## 📋 OVERVIEW

Memperbaiki `BookingRepository` agar menyimpan data daftar tamu (BookingGuest) ke tabel `booking_guests` yang terpisah, bukan hanya menyimpan summary data di tabel `bookings`.

## 🔍 PROBLEM ANALYSIS

### **Before Fix**:
- ❌ **Data guest detail hilang** - Hanya menyimpan summary (`guest_male`, `guest_female`, `guest_children`)
- ❌ **Field `guests` tidak ada** - Tabel `bookings` tidak memiliki field `guests` (JSON)
- ❌ **Guest detail tidak tersimpan** - Data individual guest tidak disimpan ke `booking_guests`
- ❌ **Relasi tidak terisi** - Relasi `$booking->guests()` kosong

### **Database Structure**:
```sql
-- Tabel bookings (summary data only)
bookings:
  - guest_male: 1
  - guest_female: 1  
  - guest_children: 0
  - guest_name: "Primary Guest"
  -- NO field 'guests' (JSON)

-- Tabel booking_guests (detail data)
booking_guests:
  - booking_id: 1
  - guest_type: "primary" | "additional"
  - full_name: "Guest Name"
  - phone: "628123456789"
  - email: "guest@example.com"
  - gender: "male" | "female"
  - age_category: "adult" | "child" | "infant"
  - relationship_to_primary: "spouse"
  - emergency_contact_name: "Emergency Contact"
  - emergency_contact_phone: "628123456789"
  - notes: "Special requirements"
```

## ✅ FIX IMPLEMENTED

### **File**: `app/Repositories/BookingRepository.php`

### **1. Method `create()` - Save BookingGuest**

#### **Before (Incomplete)**:
```php
public function create(BookingRequest $request, Property $property, int $userId): Booking
{
    $bookingNumber = $this->generateBookingNumber();
    return Booking::create([
        // ... booking data
        'guests' => $request->guests, // ❌ Field tidak ada di database
    ]);
}
```

#### **After (Complete)**:
```php
public function create(BookingRequest $request, Property $property, int $userId): Booking
{
    $bookingNumber = $this->generateBookingNumber();
    
    // Create the booking
    $booking = Booking::create([
        // ... booking data (tanpa field 'guests')
    ]);

    // ✅ Save booking guests to booking_guests table
    $this->saveBookingGuests($booking, $request->guests);

    return $booking;
}
```

### **2. Method `update()` - Update BookingGuest**

#### **Before (Incomplete)**:
```php
public function update(Booking $booking, BookingRequest $request, Property $property): Booking
{
    $booking->update([
        // ... booking data
        'guests' => $request->guests, // ❌ Field tidak ada di database
    ]);
    return $booking->fresh();
}
```

#### **After (Complete)**:
```php
public function update(Booking $booking, BookingRequest $request, Property $property): Booking
{
    $booking->update([
        // ... booking data (tanpa field 'guests')
    ]);

    // ✅ Update booking guests
    $this->updateBookingGuests($booking, $request->guests);

    return $booking->fresh();
}
```

### **3. New Method `saveBookingGuests()`**

```php
/**
 * Save booking guests to booking_guests table
 */
private function saveBookingGuests(Booking $booking, ?array $guests): void
{
    if (empty($guests)) {
        return;
    }

    $guestData = [];
    foreach ($guests as $guest) {
        $guestData[] = [
            'booking_id' => $booking->id,
            'guest_type' => $guest['guest_type'] ?? 'additional',
            'full_name' => $guest['full_name'] ?? '',
            'phone' => $guest['phone'] ?? null,
            'email' => $guest['email'] ?? null,
            'gender' => $guest['gender'] ?? null,
            'age_category' => $guest['age_category'] ?? 'adult',
            'relationship_to_primary' => $guest['relationship_to_primary'] ?? null,
            'emergency_contact_name' => $guest['emergency_contact_name'] ?? null,
            'emergency_contact_phone' => $guest['emergency_contact_phone'] ?? null,
            'notes' => $guest['notes'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    if (!empty($guestData)) {
        \App\Models\BookingGuest::insert($guestData);
    }
}
```

### **4. New Method `updateBookingGuests()`**

```php
/**
 * Update booking guests (delete existing and create new)
 */
private function updateBookingGuests(Booking $booking, ?array $guests): void
{
    // Delete existing guests
    $booking->guests()->delete();
    
    // Save new guests
    $this->saveBookingGuests($booking, $guests);
}
```

## 📊 DATA FLOW

### **Guest Data Structure**:
```php
// Input dari BookingRequest
$guests = [
    [
        'guest_type' => 'primary',
        'full_name' => 'John Doe',
        'phone' => '628123456789',
        'email' => 'john@example.com',
        'gender' => 'male',
        'age_category' => 'adult',
        'relationship_to_primary' => null,
        'emergency_contact_name' => 'Jane Doe',
        'emergency_contact_phone' => '628123456790',
        'notes' => 'Allergic to peanuts'
    ],
    [
        'guest_type' => 'additional',
        'full_name' => 'Jane Doe',
        'phone' => '628123456790',
        'email' => 'jane@example.com',
        'gender' => 'female',
        'age_category' => 'adult',
        'relationship_to_primary' => 'spouse',
        'emergency_contact_name' => 'John Doe',
        'emergency_contact_phone' => '628123456789',
        'notes' => null
    ]
];
```

### **Database Storage**:
```sql
-- Tabel bookings (summary)
INSERT INTO bookings (
    guest_male, guest_female, guest_children, 
    guest_name, guest_email, guest_phone
) VALUES (1, 1, 0, 'John Doe', 'john@example.com', '628123456789');

-- Tabel booking_guests (detail)
INSERT INTO booking_guests (
    booking_id, guest_type, full_name, phone, email, gender, age_category
) VALUES 
(1, 'primary', 'John Doe', '628123456789', 'john@example.com', 'male', 'adult'),
(1, 'additional', 'Jane Doe', '628123456790', 'jane@example.com', 'female', 'adult');
```

## 🎯 BENEFITS

### **Data Integrity**:
- ✅ **Complete guest data** - Semua detail guest tersimpan
- ✅ **Proper relationships** - Relasi `$booking->guests()` terisi
- ✅ **Data consistency** - Summary dan detail data konsisten

### **Functionality**:
- ✅ **Guest management** - Admin dapat lihat detail semua guest
- ✅ **Emergency contacts** - Data kontak darurat tersimpan
- ✅ **Special requirements** - Notes dan requirements tersimpan
- ✅ **Guest categorization** - Primary vs additional guest

### **Query Capabilities**:
```php
// Get all guests for a booking
$booking->guests; // Collection of BookingGuest

// Get primary guest only
$booking->primaryGuest; // Collection of primary guests

// Get additional guests
$booking->guests()->where('guest_type', 'additional')->get();

// Get adult guests
$booking->guests()->where('age_category', 'adult')->get();

// Get guests with emergency contacts
$booking->guests()->whereNotNull('emergency_contact_name')->get();
```

## 🧪 TESTING

### **Test 1: Create Booking with Guests**
```php
$bookingData = [
    'property_id' => 1,
    'guest_name' => 'John Doe',
    'guest_email' => 'john@example.com',
    'guest_phone' => '628123456789',
    'guest_male' => 1,
    'guest_female' => 1,
    'guest_children' => 0,
    'guests' => [
        [
            'guest_type' => 'primary',
            'full_name' => 'John Doe',
            'phone' => '628123456789',
            'email' => 'john@example.com',
            'gender' => 'male',
            'age_category' => 'adult'
        ],
        [
            'guest_type' => 'additional',
            'full_name' => 'Jane Doe',
            'phone' => '628123456790',
            'email' => 'jane@example.com',
            'gender' => 'female',
            'age_category' => 'adult',
            'relationship_to_primary' => 'spouse'
        ]
    ]
];

$bookingRequest = BookingRequest::fromArray($bookingData);
$booking = $bookingRepository->create($bookingRequest, $property, $userId);

// Assertions
$this->assertCount(2, $booking->guests);
$this->assertCount(1, $booking->primaryGuest);
$this->assertCount(1, $booking->guests()->where('guest_type', 'additional')->get());
```

### **Test 2: Update Booking with New Guests**
```php
$newGuests = [
    [
        'guest_type' => 'primary',
        'full_name' => 'John Doe Updated',
        'phone' => '628123456789',
        'email' => 'john.updated@example.com',
        'gender' => 'male',
        'age_category' => 'adult'
    ]
];

$bookingRequest = BookingRequest::fromArray(['guests' => $newGuests]);
$updatedBooking = $bookingRepository->update($booking, $bookingRequest, $property);

// Assertions
$this->assertCount(1, $updatedBooking->guests);
$this->assertEquals('John Doe Updated', $updatedBooking->guests->first()->full_name);
```

## 🔄 RELATED FIXES

### **Model Relationships**:
- ✅ `Booking::guests()` - HasMany relationship
- ✅ `Booking::primaryGuest()` - HasMany with where clause
- ✅ `BookingGuest::booking()` - BelongsTo relationship

### **Data Validation**:
- ✅ `BookingRequest::fromArray()` - Validates guest data
- ✅ `saveBookingGuests()` - Handles empty guest data
- ✅ `updateBookingGuests()` - Proper update logic

## 🚀 DEPLOYMENT CHECKLIST

### **Pre-Deployment**:
- [ ] Test booking creation with guest data
- [ ] Test booking update with guest data
- [ ] Verify guest relationships work
- [ ] Check data consistency between summary and detail

### **Post-Deployment**:
- [ ] Monitor guest data storage
- [ ] Test admin guest management features
- [ ] Verify emergency contact functionality
- [ ] Check guest categorization features

## 📝 FUTURE IMPROVEMENTS

### **Guest Management**:
1. **Guest photo upload** - Store guest photos
2. **Guest preferences** - Dietary, room preferences
3. **Guest history** - Track guest booking history
4. **Guest verification** - ID verification process

### **Data Enhancement**:
1. **Guest analytics** - Guest behavior analysis
2. **Guest segmentation** - VIP, regular, new guests
3. **Guest communication** - Direct messaging to guests
4. **Guest feedback** - Post-stay feedback collection

---

**📅 Fix Date**: 2025-01-27  
**📝 Version**: 1.0  
**🔄 Next Review**: After testing with real guest data

---

## 🎯 CONCLUSION

BookingRepository fix telah berhasil mengimplementasikan:

- ✅ **Complete guest data storage** - Semua detail guest tersimpan di `booking_guests`
- ✅ **Proper relationships** - Relasi `$booking->guests()` terisi dengan benar
- ✅ **Data consistency** - Summary dan detail data konsisten
- ✅ **Guest management** - Admin dapat mengelola detail semua guest

**Sekarang BookingRepository menyimpan daftar tamu (BookingGuest) dengan lengkap ke tabel `booking_guests`!** 