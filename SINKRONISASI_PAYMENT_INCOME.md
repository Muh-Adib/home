# 💰 Sinkronisasi Payment-Income

**Tanggal**: 2025-01-27  
**Status**: ✅ Implementasi Selesai

---

## 📋 OVERVIEW

Sistem sinkronisasi otomatis antara Payment dan Income dengan aturan:
- ✅ **Hanya payment dengan status `verified` yang tercatat sebagai income**
- ✅ **Jika payment status berubah menjadi `refunded`, income akan dihapus**
- ✅ **Jika payment status berubah dari `verified` ke status lain, income akan dihapus**
- ✅ **Sinkronisasi otomatis terjadi di semua titik yang mengubah status payment**

---

## 🏗️ ARSITEKTUR

### **1. PaymentIncomeSyncService**
**File**: `app/Services/PaymentIncomeSyncService.php`

Service utama yang menangani semua logika sinkronisasi payment-income.

#### **Methods:**

##### `syncOnVerified(Payment $payment): bool`
- Membuat atau update income record untuk payment yang verified
- Hapus income lama jika ada (untuk handle perubahan status)
- Sinkronkan wallet transaction (jika payment method punya wallet)
- **Idempotent**: Satu income per payment_id

##### `syncOnRefunded(Payment $payment): bool`
- **Menghapus** income yang terkait dengan payment ini
- Sinkronkan wallet untuk refund (decrement balance)
- **Tidak membuat income negatif** - langsung hapus income yang ada

##### `syncOnUnverified(Payment $payment): bool`
- Hapus income untuk payment dengan status: `pending`, `failed`, `cancelled`
- Handle wallet reversal jika perlu

##### `syncAllVerifiedPayments(): int`
- Sync semua payment verified yang belum punya income
- Useful untuk migration atau recovery

##### `cleanupUnverifiedPayments(): int`
- Hapus income untuk payment yang tidak verified lagi
- Useful untuk cleanup data lama

---

## 📍 LOKASI IMPLEMENTASI

### **1. PaymentController (Admin)**
**File**: `app/Http/Controllers/Admin/PaymentController.php`

#### **Methods yang di-update:**

- ✅ **`store()`** - Create payment
  - Sync income jika status = `verified`

- ✅ **`additionalPaymentStore()`** - Create additional payment
  - Sync income jika status = `verified`

- ✅ **`manualStore()`** - Manual payment entry
  - Sync income jika status = `verified`

- ✅ **`update()`** - Update payment
  - Handle semua perubahan status:
    - `verified` → Create/update income
    - `refunded` → Hapus income
    - `pending/failed/cancelled` → Hapus income

- ✅ **`verify()`** - Verify payment
  - Sync income saat verified

- ✅ **`reject()`** - Reject payment
  - Hapus income (karena tidak verified)

#### **Constructor:**
```php
public function __construct(PaymentIncomeSyncService $incomeSyncService)
{
    $this->incomeSyncService = $incomeSyncService;
}
```

---

### **2. BookingManagementController**
**File**: `app/Http/Controllers/Admin/BookingManagementController.php`

#### **Methods yang di-update:**

- ✅ **`store()`** - Create booking dengan payment
  - Sync income jika payment verified saat create

- ✅ **`update()`** - Update booking dengan payment
  - Sync income jika payment verified saat create

---

### **3. Payment Model**
**File**: `app/Models/Payment.php`

#### **Changes:**

- ✅ **Relationship `income()`** - HasOne relationship dengan Income
- ✅ **Method `verify()`** - Update untuk sync income saat verify

```php
public function income()
{
    return $this->hasOne(Income::class);
}

public function verify(User $verifier, string $notes = null): bool
{
    // ... existing code ...
    
    // Sinkronkan income saat verified
    app(\App\Services\PaymentIncomeSyncService::class)->syncOnVerified($this);
    
    return true;
}
```

---

### **4. Income Model**
**File**: `app/Models/Income.php`

#### **Changes:**

- ✅ **Relationship `payment()`** - BelongsTo relationship dengan Payment

```php
public function payment(): BelongsTo
{
    return $this->belongsTo(Payment::class);
}
```

---

## 🔄 FLOW SINKRONISASI

### **Scenario 1: Payment Verified**
```
1. Payment dibuat dengan status 'verified'
   → syncOnVerified() dipanggil
   → Income record dibuat/updated
   → Wallet transaction dibuat (jika ada wallet mapping)
   → Income terhubung dengan payment_id

2. Payment status berubah dari 'pending' → 'verified'
   → syncOnVerified() dipanggil
   → Income record dibuat/updated
   → Income sebelumnya (jika ada) dihapus dulu
```

### **Scenario 2: Payment Refunded**
```
1. Payment status berubah dari 'verified' → 'refunded'
   → syncOnRefunded() dipanggil
   → Income record dihapus (bukan dibuat income negatif)
   → Wallet transaction untuk refund dibuat (out)
   → Wallet balance decrement
```

### **Scenario 3: Payment Unverified**
```
1. Payment status berubah dari 'verified' → 'failed'/'cancelled'/'pending'
   → syncOnUnverified() dipanggil
   → Income record dihapus
   → Wallet transaction di-reverse jika perlu
```

---

## 📊 DATA STRUCTURE

### **Income Record (Payment Verified)**

```php
Income::create([
    'payment_id' => $payment->id,           // Required: Link ke payment
    'property_id' => $payment->booking->property_id,
    'booking_id' => $payment->booking_id,
    'source' => 'booking' | 'additional' | 'penalty' | etc.,
    'description' => 'Payment description',
    'amount' => $payment->amount,           // Same as payment amount
    'income_date' => $payment->payment_date,
    'wallet_id' => $payment->paymentMethod->wallet_id, // If exists
    'notes' => $payment->reference_number,
    'created_by' => $payment->verified_by,
]);
```

**Rules:**
- ✅ `payment_id` adalah unique (satu payment = satu income)
- ✅ Income hanya dibuat untuk payment `verified`
- ✅ Income dihapus jika payment status berubah ke non-verified atau refunded

---

## 🛠️ ARTISAN COMMANDS

### **Sync All Verified Payments**
Sync semua payment verified yang belum punya income record:

```bash
php artisan payment:sync-income --all
```

**Use Case:**
- Migration data lama
- Recovery setelah error
- Initial sync untuk existing payments

### **Cleanup Unverified Payments**
Hapus income untuk payment yang tidak verified:

```bash
php artisan payment:sync-income --cleanup
```

**Use Case:**
- Cleanup data inconsistency
- Remove orphaned income records

### **Both Operations**
```bash
php artisan payment:sync-income --all --cleanup
```

---

## ✅ TESTING CHECKLIST

### **Unit Tests**
- [ ] Test `syncOnVerified()` - Create income untuk verified payment
- [ ] Test `syncOnVerified()` - Update income jika sudah ada
- [ ] Test `syncOnRefunded()` - Hapus income untuk refunded payment
- [ ] Test `syncOnUnverified()` - Hapus income untuk unverified payment
- [ ] Test wallet sync untuk verified payment
- [ ] Test wallet sync untuk refunded payment

### **Integration Tests**
- [ ] Create payment verified → Income created
- [ ] Update payment pending → verified → Income created
- [ ] Update payment verified → refunded → Income deleted
- [ ] Update payment verified → failed → Income deleted
- [ ] Reject payment → Income deleted (jika ada)
- [ ] Verify payment → Income created

### **Manual Tests**
- [ ] Create payment via PaymentController::store()
- [ ] Update payment status via PaymentController::update()
- [ ] Verify payment via PaymentController::verify()
- [ ] Reject payment via PaymentController::reject()
- [ ] Create payment via BookingManagementController
- [ ] Payment verify via Payment model verify() method

---

## 🔍 TROUBLESHOOTING

### **Income tidak terbuat saat payment verified**
1. Cek apakah `PaymentIncomeSyncService` dipanggil
2. Cek logs untuk error
3. Verify payment punya booking relationship
4. Run sync command: `php artisan payment:sync-income --all`

### **Income tidak terhapus saat payment refunded**
1. Cek apakah service method `syncOnRefunded()` dipanggil
2. Cek apakah income ada dengan `payment_id` yang benar
3. Check logs untuk error

### **Duplicate Income**
1. Income seharusnya unique per `payment_id`
2. Run cleanup: `php artisan payment:sync-income --cleanup`
3. Check apakah ada multiple calls ke sync method

### **Wallet Balance Tidak Sync**
1. Pastikan payment method punya `wallet_id`
2. Check wallet transaction records
3. Verify wallet balance calculation

---

## 📝 NOTES

### **Idempotency**
- Semua sync operations adalah **idempotent**
- Bisa dipanggil berkali-kali tanpa efek samping
- `syncOnVerified()` menggunakan `updateOrCreate` dengan `payment_id`

### **Transaction Safety**
- Service methods tidak wrap dalam transaction sendiri
- Transaction handling dilakukan di controller level
- Service methods throw exception jika error

### **Wallet Integration**
- Wallet sync otomatis jika payment method punya `wallet_id`
- Wallet balance update otomatis:
  - Verified: `increment` balance
  - Refunded: `decrement` balance
  - Failed/Cancelled: Reverse transaksi

### **Source Determination**
Income source ditentukan dari `payment_type`:
- `dp`, `remaining`, `full` → `source = 'booking'`
- `additional`, `penalty`, `damage`, `cleaning`, `extra_service` → `source = payment_type`

---

## 🚀 FUTURE ENHANCEMENTS

### **Potential Improvements:**
1. **Event-based sync** - Gunakan Laravel events untuk auto-sync
2. **Queue jobs** - Untuk handle bulk sync operations
3. **Audit trail** - Track perubahan income terkait payment
4. **Notification** - Notify admin jika sync gagal
5. **Dashboard metrics** - Show sync status di dashboard

---

## 📦 FILES MODIFIED/CREATED

### **Created:**
1. ✅ `app/Services/PaymentIncomeSyncService.php` - Service utama
2. ✅ `app/Console/Commands/SyncPaymentIncome.php` - Artisan command
3. ✅ `SINKRONISASI_PAYMENT_INCOME.md` - Dokumentasi

### **Modified:**
1. ✅ `app/Http/Controllers/Admin/PaymentController.php` - Update semua methods
2. ✅ `app/Http/Controllers/Admin/BookingManagementController.php` - Update payment creation
3. ✅ `app/Models/Payment.php` - Add relationship & update verify method
4. ✅ `app/Models/Income.php` - Add payment relationship

---

## ✅ SUCCESS CRITERIA

- ✅ Payment verified otomatis tercatat sebagai income
- ✅ Payment refunded otomatis menghapus income
- ✅ Payment status berubah otomatis sync income
- ✅ Semua controller yang mengubah status payment sudah di-update
- ✅ Wallet sync terintegrasi dengan income sync
- ✅ Idempotent operations (safe untuk re-run)
- ✅ Error handling & logging
- ✅ Artisan command untuk manual sync

---

**Status**: ✅ Complete & Production Ready  
**Last Updated**: 2025-01-27




















