# 📋 Alur Implementasi iPaymu Payment Gateway

## 🎯 Overview

Dokumen ini menjelaskan alur lengkap implementasi iPaymu Payment Gateway di Property Management System website Homsjogja, mulai dari inisiasi pembayaran hingga verifikasi dan sinkronisasi income.

---

## 🔄 ALUR LENGKAP IMPLEMENTASI IPAYMU

### **Phase 1: Inisiasi Pembayaran (Payment Initiation)**

#### 1.1. Entry Points (Titik Masuk)

**A. Guest/User Initiate Payment**
- **Route**: `POST /bookings/{booking_number}/payment-gateway/initiate`
- **Controller**: `PaymentGatewayController@initiate`
- **Middleware**: `auth` (untuk authenticated users)
- **Frontend**: `resources/js/pages/Payment/Create.tsx`

**B. Admin Generate Payment Link**
- **Route**: `POST /admin/bookings/{booking_number}/payment-gateway/generate-link`
- **Controller**: `PaymentGatewayController@generateLink`
- **Middleware**: `auth`, `role:super_admin,property_manager,finance`
- **Frontend**: `resources/js/pages/Admin/Payments/CreateForBooking.tsx`

#### 1.2. Validasi Request

```php
// Validasi input
- amount: required, numeric, min:1
- type: nullable, in:dp,remaining,full
- payment_method_id: nullable, exists:payment_methods,id
- expiry_hours: nullable, integer, min:1, max:168 (max 7 days)
```

#### 1.3. Payment Gateway Service - Initiate Payment

**File**: `app/Services/PaymentGatewayService.php`

**Proses**:
1. **Get Payment Method**
   - Cari payment method dengan code `ipaymu`
   - Jika ada `payment_method_id` spesifik, gunakan untuk calculate fee
   - Jika bukan iPaymu method, tetap gunakan iPaymu sebagai gateway

2. **Calculate Fee & Total Amount**
   ```php
   $fee = $selectedMethod->calculateFee($amount);
   $totalAmount = $amount + $fee;
   ```

3. **Validasi Amount**
   - Cek apakah total amount (dengan fee) tidak melebihi pending amount
   - `$pendingAmount = $booking->total_amount - $paidAmount`

4. **Prepare Payment Data untuk iPaymu**
   - Product name: "Booking {booking_number} - Down Payment/Remaining Payment"
   - Amount: Total amount dengan fee
   - Reference ID: `{booking_number}-{timestamp}`
   - Customer info: name, phone, email dari booking
   - Payment channel: berdasarkan payment method type
   - Expiry: hours (integer) atau datetime string
   - URLs: return_url, cancel_url, notify_url

5. **Call iPaymu API - Create Payment**
   - **Service**: `IpaymuService@createPayment`
   - **Endpoint**: `POST /api/v2/payment`
   - **Signature**: HMAC-256 dengan format `HTTPMethod:VaNumber:Lowercase(SHA-256(RequestBody)):ApiKey`

6. **Create Payment Record**
   ```php
   Payment::create([
       'payment_method_id' => $selectedMethod->id,
       'payment_number' => Payment::generatePaymentNumber(),
       'amount' => $totalAmount,
       'payment_type' => $type, // 'dp' atau 'remaining'
       'payment_method' => 'e_wallet',
       'payment_status' => 'pending',
       'gateway_transaction_id' => $ipaymuResponse['session_id'],
       'ipaymu_session_id' => $ipaymuResponse['session_id'],
       'ipaymu_payment_url' => $ipaymuResponse['payment_url'],
       'ipaymu_expired_at' => $expiredAt,
       'gateway_response' => [...],
   ]);
   ```

7. **Create Workflow Entry**
   - Step: `payment_pending`
   - Status: `in_progress`

8. **Dispatch Event**
   - `PaymentCreated` event

9. **Return Payment dengan Payment URL**
   - Redirect user ke `ipaymu_payment_url` untuk pembayaran

---

### **Phase 2: User Payment di iPaymu**

User diarahkan ke halaman pembayaran iPaymu:
- Memilih metode pembayaran (Bank Transfer, QRIS, E-Wallet, dll)
- Melakukan pembayaran
- iPaymu memproses pembayaran

---

### **Phase 3: Callback dari iPaymu (User Redirect)**

#### 3.1. Callback Route

**Route**: `GET /payment-gateway/callback`
- **Controller**: `PaymentGatewayController@callback`
- **Middleware**: Public (tidak perlu auth, karena redirect dari iPaymu)

#### 3.2. Process Callback

**File**: `app/Services/PaymentGatewayService.php@processCallback`

**Proses**:
1. **Extract Session ID**
   - Dari `session_id` atau `sid` di callback data

2. **Find Payment**
   ```php
   $payment = Payment::where('ipaymu_session_id', $sessionId)->first();
   ```

3. **Check Payment Status dari iPaymu**
   - **Service**: `IpaymuService@checkPaymentStatus`
   - **Endpoint**: `POST /api/v2/transaction`
   - **Body**: `{ "transactionId": $sessionId }`
   - **Signature**: HMAC-256 dengan format yang sama

4. **Update Payment Status**
   - Map status dari iPaymu ke sistem
   - Jika status `verified`:
     - Auto verify payment
     - Update booking payment status
     - Sync income
     - Dispatch `PaymentStatusChanged` event

5. **Redirect User**
   - Berdasarkan status payment:
     - `verified`: Success message
     - `pending`: Info message (processing)
     - `failed`: Error message
     - `cancelled`: Info message

---

### **Phase 4: Webhook dari iPaymu (Server-to-Server)**

#### 4.1. Webhook Route

**Route**: `POST /payment-gateway/webhook`
- **Controller**: `PaymentGatewayController@webhook`
- **Middleware**: Public, tanpa CSRF protection (karena dari external server)

#### 4.2. Process Webhook

**File**: `app/Services/PaymentGatewayService.php@processWebhook`

**Proses**:
1. **Handle Webhook via iPaymuService**
   - **Service**: `IpaymuService@handleWebhook`
   - Verify signature webhook
   - Extract webhook data

2. **Find Payment**
   ```php
   Payment::where(function ($query) use ($webhookResponse) {
       $query->where('ipaymu_session_id', $webhookResponse['transaction_id'])
             ->orWhere('gateway_transaction_id', $webhookResponse['transaction_id'])
             ->orWhere('payment_number', $webhookResponse['reference_id']);
   })->first();
   ```

3. **Update Payment dari Webhook**
   - Map status dari iPaymu
   - Update payment status
   - Update transaction ID jika ada
   - Jika status `verified`:
     - Auto verify payment
     - Update booking payment status
     - Sync income
     - Dispatch `PaymentStatusChanged` event

4. **Return Response**
   ```json
   {
       "success": true,
       "message": "Webhook processed successfully",
       "payment_number": "...",
       "status": "verified"
   }
   ```

---

### **Phase 5: Payment Status Update & Income Sync**

#### 5.1. Update Payment Status

**File**: `app/Services/PaymentGatewayService.php`

**Methods**:
- `updatePaymentFromGateway()` - Update dari callback
- `updatePaymentFromWebhook()` - Update dari webhook

**Proses**:
1. Map status dari iPaymu ke sistem:
   - `berhasil`, `paid`, `success` → `verified`
   - `pending`, `waiting` → `pending`
   - `failed`, `gagal`, `expired` → `failed`
   - `canceled`, `cancelled` → `cancelled`

2. Jika status berubah ke `verified`:
   ```php
   $payment->update([
       'payment_status' => 'verified',
       'verified_at' => now(),
       'verified_by' => null, // Auto verified by gateway
   ]);
   ```

3. Update Booking Payment Status:
   ```php
   $payment->booking->updatePaymentStatus();
   // Logic:
   // - Jika total paid >= total_amount → 'fully_paid'
   // - Jika payment_type = 'dp' → 'dp_received'
   ```

4. Sync Income:
   ```php
   $this->incomeSyncService->syncOnVerified($payment);
   ```

5. Dispatch Event:
   ```php
   event(new PaymentStatusChanged($payment, $oldStatus, $newStatus));
   ```

#### 5.2. Income Synchronization

**File**: `app/Services/PaymentIncomeSyncService.php`

**Method**: `syncOnVerified()`

**Proses**:
1. Cek apakah income sudah ada untuk payment ini
2. Jika belum ada, create income record:
   ```php
   Income::create([
       'payment_id' => $payment->id,
       'booking_id' => $payment->booking_id,
       'property_id' => $payment->booking->property_id,
       'amount' => $payment->amount,
       'income_date' => $payment->payment_date,
       'income_type' => 'booking_payment',
       'description' => "Payment: {$payment->payment_number}",
   ]);
   ```

3. Update total income di property jika diperlukan

---

## 📊 DIAGRAM ALUR IMPLEMENTASI

```
┌─────────────────┐
│  User/Admin     │
│  Initiate       │
│  Payment        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ PaymentGatewayController│
│ @initiate/@generateLink │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ PaymentGatewayService    │
│ @initiateGatewayPayment │
└────────┬────────────────┘
         │
         ├─► Calculate Fee
         ├─► Prepare Payment Data
         │
         ▼
┌─────────────────────────┐
│ IpaymuService           │
│ @createPayment          │
│                         │
│ - Generate Signature    │
│ - POST /api/v2/payment  │
│ - Get Payment URL       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Create Payment Record   │
│ - status: pending       │
│ - ipaymu_payment_url    │
│ - ipaymu_session_id     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Redirect User ke        │
│ iPaymu Payment Page     │
└────────┬────────────────┘
         │
         │ User melakukan pembayaran
         │
         ▼
    ┌────────┐
    │ iPaymu │
    │ Process│
    └───┬────┘
        │
        ├─────────────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  CALLBACK    │  │   WEBHOOK    │
│  (Redirect)  │  │ (Server-to-  │
│              │  │   Server)    │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
┌─────────────────────────────┐
│ PaymentGatewayController     │
│ @callback / @webhook         │
└────────┬──────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ PaymentGatewayService        │
│ @processCallback /           │
│ @processWebhook              │
└────────┬──────────────────────┘
         │
         ├─► Check Payment Status (callback)
         ├─► Verify Webhook Signature
         │
         ▼
┌─────────────────────────────┐
│ IpaymuService                │
│ @checkPaymentStatus /        │
│ @handleWebhook               │
└────────┬──────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Update Payment Status        │
│ - Map iPaymu status          │
│ - Auto verify if success     │
└────────┬──────────────────────┘
         │
         ├─► Update Booking Payment Status
         ├─► Sync Income
         ├─► Dispatch Events
         │
         ▼
┌─────────────────────────────┐
│ PaymentIncomeSyncService     │
│ @syncOnVerified              │
│ - Create Income Record       │
└──────────────────────────────┘
```

---

## 🔑 KEY COMPONENTS

### 1. Services

**IpaymuService** (`app/Services/IpaymuService.php`)
- `createPayment()` - Create payment request ke iPaymu
- `checkPaymentStatus()` - Check payment status dari iPaymu
- `handleWebhook()` - Handle webhook dari iPaymu
- `generateSignature()` - Generate HMAC-256 signature
- `verifyWebhookSignature()` - Verify webhook signature
- `mapStatus()` - Map iPaymu status ke sistem status

**PaymentGatewayService** (`app/Services/PaymentGatewayService.php`)
- `initiateGatewayPayment()` - Initiate payment gateway
- `processCallback()` - Process callback dari gateway
- `processWebhook()` - Process webhook dari gateway
- `generatePaymentLink()` - Generate payment link untuk admin
- `preparePaymentData()` - Prepare payment data untuk iPaymu
- `updatePaymentFromGateway()` - Update payment dari callback
- `updatePaymentFromWebhook()` - Update payment dari webhook

**PaymentIncomeSyncService** (`app/Services/PaymentIncomeSyncService.php`)
- `syncOnVerified()` - Sync income saat payment verified
- `syncOnRefunded()` - Sync income saat payment refunded
- `syncOnUnverified()` - Sync income saat payment unverified

### 2. Controllers

**PaymentGatewayController** (`app/Http/Controllers/PaymentGatewayController.php`)
- `initiate()` - Initiate payment untuk user
- `callback()` - Handle callback dari iPaymu
- `webhook()` - Handle webhook dari iPaymu
- `generateLink()` - Generate payment link untuk admin

### 3. Models

**Payment** (`app/Models/Payment.php`)
- Fields terkait iPaymu:
  - `ipaymu_session_id` - Session ID dari iPaymu
  - `ipaymu_payment_url` - Payment URL dari iPaymu
  - `ipaymu_expired_at` - Expiry time payment link
  - `gateway_transaction_id` - Transaction ID dari gateway
  - `gateway_response` - Raw response dari gateway

**PaymentMethod** (`app/Models/PaymentMethod.php`)
- `isIpaymu()` - Check jika method adalah iPaymu
- `getIpaymuChannel()` - Get iPaymu payment channel
- `calculateFee()` - Calculate payment fee

### 4. Routes

```php
// Webhook (public, no auth)
POST /payment-gateway/webhook

// User initiate payment
POST /bookings/{booking}/payment-gateway/initiate (auth)

// Callback (public, redirect dari iPaymu)
GET /payment-gateway/callback

// Admin generate link
POST /admin/bookings/{booking}/payment-gateway/generate-link (auth, role)
```

### 5. Configuration

**config/ipaymu.php**
- `va` - Virtual Account number
- `api_key` - API Key untuk signature
- `mode` - sandbox atau production
- `expiry_hours` - Default expiry hours
- `return_url` - Callback URL
- `notify_url` - Webhook URL

---

## ✅ CHECKLIST IMPLEMENTASI

### Core Features
- [x] Payment initiation (user & admin)
- [x] Payment link generation
- [x] Callback handling (redirect dari iPaymu)
- [x] Webhook handling (server-to-server)
- [x] Payment status checking
- [x] Signature generation (HMAC-256)
- [x] Webhook signature verification
- [x] Payment status mapping
- [x] Auto verification saat payment success
- [x] Booking payment status update
- [x] Income synchronization
- [x] Event dispatching
- [x] Workflow tracking
- [x] Error handling & logging

### Database
- [x] Payment table dengan iPaymu fields
- [x] Index pada `ipaymu_session_id`
- [x] Migration untuk iPaymu fields

### Security
- [x] Signature verification untuk webhook
- [x] CSRF protection (kecuali webhook)
- [x] Authorization checks
- [x] Input validation

### Logging
- [x] Request logging
- [x] Response logging
- [x] Error logging
- [x] Webhook logging

---

## 🚨 POTENTIAL ISSUES & RECOMMENDATIONS

### 1. Webhook Security
- ✅ Signature verification sudah diimplementasi
- ⚠️ **Rekomendasi**: Tambahkan IP whitelist untuk webhook (sudah ada di config tapi belum diimplementasi di controller)

### 2. Payment Expiry
- ✅ Expiry time sudah di-handle
- ⚠️ **Rekomendasi**: Tambahkan cron job untuk check expired payments dan update status

### 3. Duplicate Webhook
- ✅ Webhook sudah idempotent (check status sebelum update)
- ⚠️ **Rekomendasi**: Tambahkan webhook ID tracking untuk prevent duplicate processing

### 4. Error Recovery
- ✅ Error handling sudah ada
- ⚠️ **Rekomendasi**: Tambahkan retry mechanism untuk failed webhook

### 5. Payment Status Sync
- ✅ Status checking sudah ada di callback
- ⚠️ **Rekomendasi**: Tambahkan scheduled job untuk sync payment status yang masih pending

---

## 📝 KESIMPULAN

**Status Implementasi**: ✅ **LENGKAP**

Alur implementasi iPaymu sudah lengkap dan mencakup:
1. ✅ Payment initiation (user & admin)
2. ✅ Payment link generation
3. ✅ Callback handling
4. ✅ Webhook handling
5. ✅ Payment status update
6. ✅ Income synchronization
7. ✅ Event dispatching
8. ✅ Error handling & logging

**Rekomendasi Tambahan**:
1. Tambahkan IP whitelist untuk webhook
2. Tambahkan cron job untuk check expired payments
3. Tambahkan scheduled job untuk sync pending payments
4. Tambahkan webhook ID tracking untuk prevent duplicate

---

**Last Updated**: 2025-01-XX  
**Maintained By**: Development Team







