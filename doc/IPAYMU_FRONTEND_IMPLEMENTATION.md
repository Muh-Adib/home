# 📱 Implementasi Frontend iPaymu Payment Gateway

## 🎯 Overview

Dokumen ini menjelaskan implementasi frontend untuk integrasi iPaymu Payment Gateway di Property Management System, termasuk komponen React, form handling, dan user flow.

---

## 📂 FILE-FILE FRONTEND IPAYMU

### 1. **Payment Create Page (Guest/User)**
**File**: `resources/js/pages/Payment/Create.tsx`

**Fungsi**: Halaman untuk user/guest melakukan pembayaran via iPaymu

**Fitur**:
- ✅ Filter payment methods hanya iPaymu
- ✅ Auto-select first iPaymu method
- ✅ Display fee calculation
- ✅ Expiry hours setting
- ✅ Submit ke payment gateway initiate endpoint
- ✅ Redirect handling (dilakukan oleh backend)

**Key Components**:
```tsx
// Filter iPaymu methods
const ipaymuMethods = paymentMethods.filter(m => m.is_ipaymu || m.code === 'ipaymu');

// Auto select first method
useEffect(() => {
    if (ipaymuMethods.length > 0 && !selectedMethod) {
        const firstMethod = ipaymuMethods[0];
        setSelectedMethod(firstMethod);
        setData('payment_method_id', firstMethod.id.toString());
    }
}, [ipaymuMethods]);

// Submit ke payment gateway
post(`/bookings/${booking.booking_number}/payment-gateway/initiate`, {
    onSuccess: () => {
        // Redirect akan dilakukan oleh backend ke iPaymu
    },
    onError: (errors) => {
        // Handle errors
    }
});
```

**UI Features**:
- Payment summary card (total, paid, pending)
- Payment method selection dengan radio group
- Fee information display
- Expiry hours input (1-168 hours)
- Total payment calculation dengan fee
- Info alert tentang redirect ke iPaymu
- Loading state saat submit

---

### 2. **Admin Payment Create Page**
**File**: `resources/js/pages/Admin/Payments/CreateForBooking.tsx`

**Fungsi**: Halaman untuk admin membuat payment link via iPaymu atau manual payment

**Fitur**:
- ✅ Payment method type selection (iPaymu vs Manual)
- ✅ iPaymu payment channel selection
- ✅ Expiry hours setting untuk payment link
- ✅ Submit ke admin payment create endpoint
- ✅ Support untuk generate payment link

**Key Components**:
```tsx
// Payment method type state
const [paymentMethodType, setPaymentMethodType] = useState<'ipaymu' | 'manual'>('ipaymu');
const [selectedIpaymuMethod, setSelectedIpaymuMethod] = useState<PaymentMethod | null>(null);

// Form data
const { data, setData, post, processing, errors } = useForm({
    payment_method_type: 'ipaymu' as 'ipaymu' | 'manual',
    payment_method_id: '',
    amount: '',
    payment_type: 'dp' as 'dp' | 'remaining' | 'full' | 'refund' | 'penalty',
    expiry_hours: 24,
    // ... other fields
});

// Submit handler
const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/admin/payments/booking/${booking.booking_number}/create`);
};
```

**UI Features**:
- Radio group untuk pilih payment method type (iPaymu / Manual)
- Conditional rendering berdasarkan payment method type
- iPaymu channel selection dropdown
- Expiry hours input
- Info alert tentang payment link generation
- Different submit button text untuk iPaymu vs Manual

**Conditional Rendering**:
```tsx
{paymentMethodType === 'ipaymu' && (
    <>
        {/* iPaymu Payment Method Selection */}
        <Select
            value={selectedIpaymuMethod?.id.toString() || ''}
            onValueChange={(value) => {
                const method = paymentMethods.find(m => m.id.toString() === value);
                setSelectedIpaymuMethod(method || null);
                setData('payment_method_id', value);
            }}
        >
            <SelectContent>
                {paymentMethods.filter(m => m.code === 'ipaymu' || m.type === 'e_wallet').map((method) => (
                    <SelectItem key={method.id} value={method.id.toString()}>
                        {method.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
        
        {/* Expiry Hours */}
        <Input
            type="number"
            min={1}
            max={168}
            value={expiryHours}
            onChange={(e) => {
                const hours = parseInt(e.target.value) || 24;
                setExpiryHours(hours);
                setData('expiry_hours', hours);
            }}
        />
    </>
)}
```

---

## 🔄 USER FLOW FRONTEND

### **Flow 1: Guest/User Payment**

```
1. User mengakses halaman payment
   └─> GET /payments/{booking_number}/create
   └─> Render: Payment/Create.tsx

2. User melihat payment summary
   └─> Total amount, paid amount, pending amount
   └─> Booking details sidebar

3. User memilih payment method (iPaymu)
   └─> Auto-select first iPaymu method
   └─> Display fee calculation
   └─> Set expiry hours (default: 24 hours)

4. User klik "Lanjutkan ke Pembayaran"
   └─> POST /bookings/{booking_number}/payment-gateway/initiate
   └─> Data: { amount, type, payment_method_id, expiry_hours }

5. Backend response
   └─> Redirect ke iPaymu payment URL (dilakukan oleh backend)
   └─> User diarahkan ke halaman pembayaran iPaymu

6. User melakukan pembayaran di iPaymu
   └─> Pilih metode pembayaran (Bank Transfer, QRIS, E-Wallet)
   └─> Complete payment

7. iPaymu redirect kembali
   └─> GET /payment-gateway/callback?session_id=...
   └─> Backend process callback
   └─> Redirect user dengan status message
```

### **Flow 2: Admin Generate Payment Link**

```
1. Admin mengakses create payment page
   └─> GET /admin/payments/booking/{booking_number}/create
   └─> Render: Admin/Payments/CreateForBooking.tsx

2. Admin memilih payment method type
   └─> Select "iPaymu Payment Gateway"
   └─> UI berubah menampilkan iPaymu options

3. Admin pilih channel pembayaran (opsional)
   └─> Select dari dropdown iPaymu methods
   └─> Set expiry hours

4. Admin set payment details
   └─> Payment type (DP, Remaining, Full)
   └─> Amount
   └─> Other optional fields

5. Admin klik "Generate Payment Link"
   └─> POST /admin/payments/booking/{booking_number}/create
   └─> Data: { payment_method_type: 'ipaymu', ... }

6. Backend response
   └─> Payment link generated
   └─> Display payment URL dan expired_at
   └─> Admin bisa copy link atau send ke guest
```

---

## 🎨 UI COMPONENTS & FEATURES

### **1. Payment Method Selection**

**Component**: Radio Group dengan custom styling

**Features**:
- Visual selection dengan border highlight
- Icon untuk setiap payment method
- Fee information display
- Total with fee calculation

**Code**:
```tsx
<RadioGroup 
    value={selectedMethod?.id.toString()} 
    onValueChange={(value) => {
        const method = ipaymuMethods.find(m => m.id.toString() === value);
        if (method) handleMethodSelect(method);
    }}
    className="space-y-3"
>
    {ipaymuMethods.map((method) => (
        <div
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedMethod?.id === method.id
                    ? 'border-brand-primary bg-brand-primary-20 ring-2'
                    : 'border-border hover:border-brand-primary/50'
            }`}
        >
            {/* Method display with icon, name, description */}
            {/* Fee information */}
        </div>
    ))}
</RadioGroup>
```

### **2. Fee Calculation Display**

**Component**: Alert dengan breakdown fee

**Features**:
- Show base amount
- Show fee amount (percentage or fixed)
- Show total with fee
- Color coding (orange for fee, primary for total)

**Code**:
```tsx
<Alert className="bg-blue-50 border-blue-200">
    <AlertDescription>
        <div className="space-y-1">
            <div className="flex justify-between">
                <span>Jumlah Tagihan:</span>
                <span>{formatCurrency(pendingAmount)}</span>
            </div>
            {selectedMethod.fee_amount > 0 && (
                <>
                    <div className="flex justify-between">
                        <span>Biaya Transaksi:</span>
                        <span className="text-orange-600">
                            {formatCurrency(selectedMethod.fee_amount)}
                        </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                        <span>Total Pembayaran:</span>
                        <span className="text-brand-primary">
                            {formatCurrency(selectedMethod.total_with_fee)}
                        </span>
                    </div>
                </>
            )}
        </div>
    </AlertDescription>
</Alert>
```

### **3. Expiry Hours Input**

**Component**: Number input dengan helper text

**Features**:
- Min: 1 hour, Max: 168 hours (7 days)
- Display in hours and days
- Real-time calculation

**Code**:
```tsx
<Input
    type="number"
    min={1}
    max={168}
    value={expiryHours}
    onChange={(e) => {
        const hours = parseInt(e.target.value) || defaultExpiryHours;
        setExpiryHours(hours);
        setData('expiry_hours', hours);
    }}
/>
<div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Clock className="h-4 w-4" />
    <span>
        Link pembayaran akan berlaku selama {expiryHours} jam ({expiryHours / 24} hari)
    </span>
</div>
```

### **4. Payment Method Type Toggle**

**Component**: Radio Group dengan 2 options (iPaymu / Manual)

**Features**:
- Visual distinction dengan icons
- Conditional form fields
- Different submit behavior

**Code**:
```tsx
<RadioGroup 
    value={paymentMethodType} 
    onValueChange={(value: 'ipaymu' | 'manual') => {
        setPaymentMethodType(value);
        setData('payment_method_type', value);
        if (value === 'ipaymu') {
            setData('payment_status', 'pending');
        }
    }}
    className="grid grid-cols-2 gap-4"
>
    <div className="border rounded-lg p-4 cursor-pointer">
        <RadioGroupItem value="ipaymu" />
        <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-green-600" />
            <div>
                <div className="font-semibold">iPaymu Payment Gateway</div>
                <div className="text-sm text-muted-foreground">
                    Bank Transfer, E-Wallet, QRIS
                </div>
            </div>
        </div>
    </div>
    
    <div className="border rounded-lg p-4 cursor-pointer">
        <RadioGroupItem value="manual" />
        <div className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-blue-600" />
            <div>
                <div className="font-semibold">Manual Transfer</div>
                <div className="text-sm text-muted-foreground">
                    Upload bukti transfer
                </div>
            </div>
        </div>
    </div>
</RadioGroup>
```

---

## 📊 DATA FLOW

### **Props dari Backend**

**Payment/Create.tsx**:
```typescript
interface PaymentCreateProps {
    booking: Booking;
    paymentMethods: PaymentMethod[]; // Filtered untuk iPaymu
    pendingAmount: number;
    paidAmount: number;
    paymentType: string;
    nights: number;
    defaultExpiryHours: number;
}
```

**Admin/Payments/CreateForBooking.tsx**:
```typescript
interface CreateForBookingProps {
    booking: Booking;
    paymentMethods: PaymentMethod[]; // All methods
    users: User[];
}
```

### **Form Data yang Dikirim**

**User Payment Initiate**:
```typescript
{
    amount: number;              // Base amount (sebelum fee)
    type: 'dp' | 'remaining';   // Payment type
    payment_method_id: string;  // iPaymu method ID
    expiry_hours: number;       // Expiry hours (1-168)
}
```

**Admin Generate Link**:
```typescript
{
    payment_method_type: 'ipaymu' | 'manual';
    payment_method_id: string;   // iPaymu method ID (optional)
    amount: string;
    payment_type: 'dp' | 'remaining' | 'full' | 'refund' | 'penalty';
    expiry_hours: number;       // Expiry hours
    // ... other fields
}
```

---

## ✅ CHECKLIST IMPLEMENTASI FRONTEND

### **Payment Create Page (User)**
- [x] Filter payment methods untuk iPaymu
- [x] Auto-select first iPaymu method
- [x] Display payment summary
- [x] Fee calculation display
- [x] Expiry hours input
- [x] Form validation
- [x] Submit ke payment gateway initiate
- [x] Loading state
- [x] Error handling
- [x] Info alert tentang redirect

### **Admin Payment Create Page**
- [x] Payment method type selection (iPaymu/Manual)
- [x] Conditional rendering berdasarkan type
- [x] iPaymu channel selection
- [x] Expiry hours input
- [x] Form validation
- [x] Submit handler
- [x] Different UI untuk iPaymu vs Manual
- [x] Loading state dengan different text

### **UI/UX Features**
- [x] Responsive design
- [x] Modern card-based layout
- [x] Icon support untuk payment methods
- [x] Color coding untuk status
- [x] Currency formatting (IDR)
- [x] Loading indicators
- [x] Error messages
- [x] Success/Info alerts

---

## 🚨 POTENTIAL ISSUES & RECOMMENDATIONS

### **1. Redirect Handling**
**Current**: Backend melakukan redirect ke iPaymu
**Issue**: User tidak melihat loading state saat redirect
**Recommendation**: 
- Tambahkan loading overlay sebelum redirect
- Atau handle redirect di frontend dengan window.location

### **2. Payment Status Display**
**Current**: Tidak ada real-time status update
**Recommendation**: 
- Tambahkan polling untuk check payment status
- Atau gunakan WebSocket untuk real-time update

### **3. Payment Link Display (Admin)**
**Current**: Payment link tidak langsung ditampilkan setelah generate
**Recommendation**: 
- Tampilkan payment URL dan expired_at setelah generate
- Tambahkan copy button untuk payment URL
- Tambahkan QR code untuk payment URL

### **4. Error Handling**
**Current**: Basic error handling dengan alert
**Recommendation**: 
- Gunakan toast notifications untuk better UX
- Tampilkan specific error messages
- Add retry mechanism untuk failed requests

### **5. Payment Method Filtering**
**Current**: Filter di frontend
**Recommendation**: 
- Filter di backend untuk better security
- Atau validate di backend juga

---

## 📝 KESIMPULAN

**Status Implementasi Frontend**: ✅ **LENGKAP**

Implementasi frontend iPaymu sudah lengkap dengan:
1. ✅ User payment page dengan iPaymu integration
2. ✅ Admin payment create page dengan iPaymu option
3. ✅ Payment method selection UI
4. ✅ Fee calculation display
5. ✅ Expiry hours setting
6. ✅ Form validation
7. ✅ Error handling
8. ✅ Loading states
9. ✅ Responsive design

**Rekomendasi Perbaikan**:
1. Tambahkan loading overlay sebelum redirect ke iPaymu
2. Tampilkan payment URL setelah generate (admin)
3. Tambahkan copy button untuk payment URL
4. Improve error handling dengan toast notifications
5. Tambahkan real-time payment status update

---

**Last Updated**: 2025-01-XX  
**Maintained By**: Development Team







