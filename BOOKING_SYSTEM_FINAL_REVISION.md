# 📋 Sistem Booking - Revisi Final

**Tanggal**: 2025-01-17  
**Status**: FINAL REVISION - Based on Latest Feedback  
**Focus**: WhatsApp Optimization & Frontend Keybox Management

---

## 🔧 PERUBAHAN YANG DIPERBAIKI

### 1. 💬 **WHATSAPP MESSAGE (SIMPLIFIED)**

#### **Konsep Baru:**
- ❌ ~~Include checkin instructions in WhatsApp~~
- ✅ **WhatsApp hanya untuk konfirmasi booking**
- ✅ **Checkin instructions diberikan di dashboard user saat payment lunas + waktu checkin**
- ✅ **Fokus WhatsApp pada informasi booking saja**

#### **Alasan Perubahan:**
1. **Security** - Keybox code sensitive, tidak boleh di WhatsApp
2. **Timing** - Instructions diberikan saat tepat waktu checkin
3. **User Experience** - Dashboard lebih terkontrol dan secure
4. **Flexibility** - Instructions bisa update real-time

### 2. 🔑 **KEYBOX MANAGEMENT (FRONTEND-DRIVEN)**

#### **Konsep Baru:**
- ❌ ~~Backend auto-generate keybox code~~
- ✅ **Frontend input keybox code** (staff/admin input manual)
- ✅ **Backend hanya validate & store**
- ✅ **Real-world integration** - staff input code dari keybox fisik

#### **Alasan Perubahan:**
1. **Real Hardware** - Keybox fisik memiliki code yang sudah ada
2. **Staff Control** - Staff yang handle keybox langsung input
3. **Flexibility** - Code bisa disesuaikan dengan hardware fisik
4. **Security** - Manual control lebih secure

---

## 🛠️ IMPLEMENTASI REVISI

### 1. 💬 **SIMPLIFIED WHATSAPP MESSAGE**

```php
// app/Http/Controllers/Admin/BookingManagementController.php

private function generateWhatsAppMessage(Booking $booking): array
{
    $property = $booking->property;
    
    // Check if user is new (created recently)
    $isNewUser = $booking->created_by && 
                 User::find($booking->created_by)?->created_at->gte(now()->subDays(1));

    $message = "*Konfirmasi Booking #{$booking->booking_number}*\n\n";
    $message .= "Halo {$booking->guest_name},\n\n";
    $message .= "Booking Anda telah dikonfirmasi:\n";
    $message .= "📍 *Property*: {$property->name}\n";
    $message .= "📅 *Check-in*: " . \Carbon\Carbon::parse($booking->check_in)->format('d M Y') . "\n";
    $message .= "📅 *Check-out*: " . \Carbon\Carbon::parse($booking->check_out)->format('d M Y') . "\n";
    $message .= "👥 *Jumlah Tamu*: {$booking->guest_count} orang\n";
    $message .= "💰 *Total*: Rp " . number_format($booking->total_amount, 0, ',', '.') . "\n\n";

    // Payment information
    $message .= "*Status Pembayaran:*\n";
    $message .= "• Status: " . ucfirst($booking->payment_status) . "\n";
    
    if ($booking->payment_status !== 'fully_paid') {
        $message .= "• Silakan selesaikan pembayaran untuk konfirmasi booking\n";
        $message .= "• Link pembayaran: " . route('payments.show', $booking->booking_number) . "\n\n";
    } else {
        $message .= "• Pembayaran telah lunas ✅\n";
        $message .= "• Informasi check-in akan tersedia di dashboard Anda\n";
        $message .= "• Dashboard: " . route('dashboard') . "\n\n";
    }

    // Add login info for new users
    if ($isNewUser) {
        $user = User::find($booking->created_by);
        
        $message .= "*Akun Login Anda:*\n";
        $message .= "• Email: {$user->email}\n";
        $message .= "• Login di: " . route('login') . "\n";
        $message .= "_Password telah dikirim via email terpisah_\n\n";
    }

    $message .= "Terima kasih telah memilih properti kami! 🏠\n";
    $message .= "Tim {$property->name}";

    return [
        'phone' => $this->formatPhoneNumber($booking->guest_phone),
        'message' => $message,
        'whatsapp_url' => "https://wa.me/{$this->formatPhoneNumber($booking->guest_phone)}?text=" . urlencode($message),
        'can_send' => !empty($booking->guest_phone),
    ];
}
```

### 2. 🔑 **FRONTEND KEYBOX MANAGEMENT**

#### **A. Update Property Model**
```php
// app/Models/Property.php

/**
 * Update keybox code manually (staff input)
 */
public function updateKeyboxCode(string $newCode, $updatedBy = null): bool
{
    // Validate code format (3 digits)
    if (!preg_match('/^\d{3}$/', $newCode)) {
        throw new \InvalidArgumentException('Keybox code must be 3 digits');
    }
    
    return $this->update([
        'current_keybox_code' => $newCode,
        'keybox_updated_at' => now(),
        'keybox_updated_by' => $updatedBy ?? auth()->id(),
    ]);
}

/**
 * Get checkin instructions for dashboard (when payment paid + checkin time)
 */
public function getCheckinInstructionsForDashboard(): array
{
    $instructions = $this->checkin_instructions ?? [];
    
    // Replace placeholders with actual data
    return array_map(function($instruction) {
        if (is_string($instruction)) {
            return str_replace(
                ['{{keybox_code}}', '{{property_name}}', '{{address}}'],
                [$this->current_keybox_code, $this->name, $this->address],
                $instruction
            );
        }
        return $instruction;
    }, $instructions);
}
```

#### **B. Update Cleaning Dashboard Controller**
```php
// app/Http/Controllers/Staff/CleaningDashboardController.php

/**
 * Mark as cleaned and update keybox code (frontend input)
 */
public function markAsCleaned(Request $request, Booking $booking)
{
    $this->authorize('update', $booking);

    $request->validate([
        'new_keybox_code' => 'required|string|regex:/^\d{3}$/',
        'notes' => 'nullable|string|max:500',
    ]);

    DB::beginTransaction();
    try {
        // Mark booking as cleaned
        $booking->update([
            'is_cleaned' => true,
            'cleaned_at' => now(),
            'cleaned_by' => auth()->id(),
            'cleaning_notes' => $request->get('notes'),
        ]);

        // Update keybox code for property (staff input)
        $booking->property->updateKeyboxCode(
            $request->get('new_keybox_code'), 
            auth()->id()
        );

        DB::commit();

        return redirect()->back()->with('success', 
            "Property cleaned successfully! Keybox code updated to: {$request->get('new_keybox_code')}"
        );

    } catch (\Exception $e) {
        DB::rollback();
        \Log::error('Mark as cleaned failed: ' . $e->getMessage());
        
        return redirect()->back()->with('error', 'Failed to mark as cleaned.');
    }
}
```

#### **C. User Dashboard Controller**
```php
// app/Http/Controllers/DashboardController.php

public function index()
{
    $user = auth()->user();
    
    // Get upcoming bookings with checkin instructions (only if payment paid + within checkin window)
    $upcomingBookings = Booking::where('created_by', $user->id)
        ->where('booking_status', 'confirmed')
        ->where('payment_status', 'fully_paid')
        ->where('check_in', '>=', today())
        ->where('check_in', '<=', today()->addDays(7))
        ->with('property')
        ->get()
        ->map(function ($booking) {
            $property = $booking->property;
            $checkInDate = \Carbon\Carbon::parse($booking->check_in);
            $canShowInstructions = false;
            
            // Show instructions only on check-in day or within check-in window
            if ($checkInDate->isToday() && now()->gte($checkInDate->setTimeFromTimeString('12:00'))) {
                $canShowInstructions = true;
            }
            
            return [
                'id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'property' => $property->only(['name', 'address']),
                'check_in' => $booking->check_in,
                'check_out' => $booking->check_out,
                'guest_count' => $booking->guest_count,
                'can_show_instructions' => $canShowInstructions,
                'checkin_instructions' => $canShowInstructions ? $property->getCheckinInstructionsForDashboard() : null,
                'status' => $booking->booking_status,
            ];
        });

    return Inertia::render('Dashboard', [
        'upcomingBookings' => $upcomingBookings,
        'user' => $user,
    ]);
}
```

### 3. 📱 **FRONTEND COMPONENTS**

#### **A. Cleaning Dashboard Component**
```vue
<!-- resources/js/Pages/Staff/CleaningDashboard.vue -->
<template>
    <div>
        <!-- Needs Cleaning List -->
        <div v-for="property in needsCleaning" :key="property.id" 
             class="border rounded-lg p-4 mb-4">
            
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="font-semibold">{{ property.property_name }}</h3>
                    <p class="text-gray-600">{{ property.property_address }}</p>
                    <p class="text-sm">Current Keybox: {{ property.current_keybox_code || 'Not Set' }}</p>
                </div>
                
                <button @click="openCleaningForm(property)" 
                        class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                    Mark as Cleaned
                </button>
            </div>
        </div>

        <!-- Cleaning Form Modal -->
        <Modal :show="showCleaningForm" @close="closeCleaningForm">
            <div class="p-6">
                <h2 class="text-lg font-semibold mb-4">Mark Property as Cleaned</h2>
                
                <form @submit.prevent="submitCleaning">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700">
                            New Keybox Code (3 digits)
                        </label>
                        <input
                            v-model="cleaningForm.new_keybox_code"
                            type="text"
                            maxlength="3"
                            pattern="\d{3}"
                            class="mt-1 block w-full rounded-md border-gray-300"
                            placeholder="123"
                            required
                        />
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700">
                            Cleaning Notes (Optional)
                        </label>
                        <textarea
                            v-model="cleaningForm.notes"
                            class="mt-1 block w-full rounded-md border-gray-300"
                            rows="3"
                            placeholder="Any notes about the cleaning..."
                        ></textarea>
                    </div>

                    <div class="flex justify-end gap-2">
                        <button type="button" @click="closeCleaningForm"
                                class="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit"
                                class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                            Mark as Cleaned
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useForm } from '@inertiajs/vue3'
import Modal from '@/Components/Modal.vue'

const props = defineProps({
    needsCleaning: Array,
    recentlyCleaned: Array,
    stats: Object,
})

const showCleaningForm = ref(false)
const selectedProperty = ref(null)

const cleaningForm = useForm({
    new_keybox_code: '',
    notes: '',
})

const openCleaningForm = (property) => {
    selectedProperty.value = property
    cleaningForm.new_keybox_code = ''
    cleaningForm.notes = ''
    showCleaningForm.value = true
}

const closeCleaningForm = () => {
    showCleaningForm.value = false
    selectedProperty.value = null
    cleaningForm.reset()
}

const submitCleaning = () => {
    cleaningForm.patch(route('staff.cleaning.mark-cleaned', selectedProperty.value.id), {
        onSuccess: () => {
            closeCleaningForm()
        }
    })
}
</script>
```

#### **B. User Dashboard Component**
```vue
<!-- resources/js/Pages/Dashboard.vue -->
<template>
    <div>
        <!-- Upcoming Bookings -->
        <div v-for="booking in upcomingBookings" :key="booking.id"
             class="border rounded-lg p-6 mb-4">
            
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-semibold text-lg">{{ booking.property.name }}</h3>
                    <p class="text-gray-600">{{ booking.property.address }}</p>
                    <p class="text-sm">Check-in: {{ formatDate(booking.check_in) }}</p>
                    <p class="text-sm">Guests: {{ booking.guest_count }}</p>
                </div>
                
                <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {{ booking.status }}
                </span>
            </div>

            <!-- Check-in Instructions (only show when appropriate) -->
            <div v-if="booking.can_show_instructions" 
                 class="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                
                <h4 class="font-semibold text-blue-800 mb-3">Check-in Instructions</h4>
                
                <div class="space-y-2 text-blue-700">
                    <p v-if="booking.checkin_instructions.welcome">
                        {{ booking.checkin_instructions.welcome }}
                    </p>
                    <p v-if="booking.checkin_instructions.keybox_location">
                        📍 {{ booking.checkin_instructions.keybox_location }}
                    </p>
                    <p v-if="booking.checkin_instructions.keybox_code" 
                       class="font-mono text-lg font-semibold">
                        🔑 {{ booking.checkin_instructions.keybox_code }}
                    </p>
                    <p v-if="booking.checkin_instructions.checkin_time">
                        ⏰ {{ booking.checkin_instructions.checkin_time }}
                    </p>
                    
                    <div v-if="booking.checkin_instructions.additional_info">
                        <p class="font-medium mt-3">Additional Information:</p>
                        <ul class="list-disc pl-5">
                            <li v-for="info in booking.checkin_instructions.additional_info" 
                                :key="info">{{ info }}</li>
                        </ul>
                    </div>
                    
                    <p v-if="booking.checkin_instructions.emergency_contact" 
                       class="mt-3 font-medium">
                        📞 {{ booking.checkin_instructions.emergency_contact }}
                    </p>
                </div>
            </div>

            <!-- Instruction availability notice -->
            <div v-else-if="isCheckinDay(booking.check_in)" 
                 class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p class="text-yellow-800">
                    ⏳ Check-in instructions will be available starting 12:00 PM on your check-in day
                </p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    upcomingBookings: Array,
    user: Object,
})

const isCheckinDay = (checkInDate) => {
    return new Date(checkInDate).toDateString() === new Date().toDateString()
}

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}
</script>
```

---

## 🎯 **KEUNTUNGAN PERUBAHAN INI**

### ✅ **WhatsApp Optimization**
1. **Security** - Sensitive info tidak di WhatsApp
2. **Focus** - WhatsApp untuk konfirmasi booking saja
3. **Timing** - Instructions tepat waktu
4. **Professional** - Pesan lebih bersih dan to-the-point

### ✅ **Frontend Keybox Management**
1. **Real Hardware** - Staff input code dari keybox fisik
2. **Flexibility** - Code bisa disesuaikan real-time
3. **Control** - Manual validation oleh staff
4. **User Experience** - Staff yang handle langsung

### ✅ **Dashboard-Based Instructions**
1. **Secure** - Instructions hanya muncul saat tepat waktu
2. **Controlled** - Admin bisa update real-time
3. **User-friendly** - Dashboard lebih organized
4. **Traceable** - Log siapa akses kapan

---

## 📋 **IMPLEMENTATION CHECKLIST**

### ✅ **Backend Changes**
- [ ] Update WhatsApp message template (simplified)
- [ ] Modify cleaning controller (frontend keybox input)
- [ ] Add dashboard controller method (checkin instructions)
- [ ] Update property model methods

### ✅ **Frontend Changes**
- [ ] Cleaning dashboard form (keybox input)
- [ ] User dashboard (instructions display)
- [ ] Timing logic (show instructions when appropriate)
- [ ] Form validation (3-digit keybox)

### ✅ **Business Logic**
- [ ] Instructions only show when payment paid + checkin day
- [ ] WhatsApp focus on booking confirmation
- [ ] Staff input keybox manually after cleaning
- [ ] Real-time updates for instructions

---

**Apakah perubahan ini sudah sesuai dengan yang Anda inginkan? Saya bisa langsung implementasi revisi ini.**