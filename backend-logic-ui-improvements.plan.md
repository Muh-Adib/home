<!-- 33fcaada-005d-455c-b886-b37806f63df8 84a6b8ba-be22-41ae-9fc8-21ed590cb0b4 -->
# Plan: Backend Logic & UI Improvements

## Fokus: Backend Logic First, UI After

Plan ini mengikuti urutan eksekusi efisien: backend logic dulu agar data stabil, baru kemudian UI disesuaikan.

---

## TAHAP 1: Backend Logic - Item Management

### 1.1 Tambah Edit & Delete Item (InventoryItem)

**File yang akan dimodifikasi:**

- `app/Http/Controllers/Admin/InventoryController.php`
- `app/Models/InventoryItem.php` (cek apakah sudah ada SoftDeletes)
- `routes/web.php` (tambah route edit/update/delete)
- Frontend: `resources/js/pages/Admin/Inventory/Items.tsx`

**Implementasi:**

- Tambah method `edit()`, `update()`, `destroy()` di InventoryController
- Implementasi soft delete (cek apakah model sudah pakai SoftDeletes)
- Tambah konfirmasi modal sebelum delete di frontend
- Validasi: pastikan item tidak digunakan di stock movement/usage sebelum delete
- Authorization: hanya admin/super_admin yang bisa delete

**Validasi Delete:**

- Cek apakah item punya stock movement (purchase/usage)
- Jika ada, tampilkan warning atau prevent delete
- Log deletion untuk audit trail

---

## TAHAP 2: Backend Logic - Booking Management

### 2.1 Rapikan Edit Booking

**File yang akan dimodifikasi:**

- `app/Http/Controllers/Admin/BookingManagementController.php` (method `update()` sudah ada, perlu dirapikan)
- `app/Policies/BookingPolicy.php` (sudah ada method `delete()`)
- Frontend: `resources/js/pages/Admin/Bookings/Edit.tsx`

**Perbaikan:**

- Pastikan semua field bisa di-edit dengan validasi yang benar
- Pastikan sinkronisasi data terkait (invoice, payments, notifications) setelah update
- Tambah logging untuk tracking perubahan booking

### 2.2 Tambah Delete Booking

**File yang akan dimodifikasi:**

- `app/Http/Controllers/Admin/BookingManagementController.php` (tambah method `destroy()`)
- `routes/web.php` (tambah route DELETE)
- Frontend: `resources/js/pages/Admin/Bookings/Show.tsx` (tambah tombol delete dengan modal konfirmasi)

**Implementasi:**

- Hanya super_admin yang bisa delete (sudah ada di BookingPolicy)
- Soft delete menggunakan SoftDeletes (model sudah pakai)
- Pastikan data terkait tetap sinkron:
  - Payments: soft delete atau mark as cancelled
  - Notifications: tetap ada untuk audit
  - Workflow: tetap ada untuk history
- Tambah konfirmasi modal dengan detail booking yang akan dihapus
- Log deletion dengan alasan (optional field)

**Keamanan:**

- Authorization check di controller
- Validasi: booking dengan status tertentu (checked_in, fully_paid) mungkin perlu extra confirmation
- Prevent delete jika ada payment verified (atau handle refund dulu)

---

## TAHAP 3: Backend Logic - Check-in Instruction & Keybox Flow

### 3.1 Analisis Flow Existing

**File yang perlu dicek:**

- `app/Models/Property.php` (method `getCheckinInstructionsForDashboard()`, `getDefaultCheckinInstructionsTemplate()`)
- `app/Models/Booking.php` (field `checkin_instruction`, `keybox_code` - perlu dicek apakah masih digunakan)
- `app/Http/Controllers/Admin/PropertyManagementController.php` (keybox management)

**Flow yang harus diimplementasikan:**

1. **Fallback Logic:**

   - Jika booking punya custom `checkin_instruction` → gunakan itu
   - Jika tidak, ambil dari `property.checkin_instructions` (template)
   - Jika property tidak punya template → gunakan default template

2. **Keybox Logic:**

   - Keybox diambil dari `property.current_keybox_code` (property-level, bukan booking-level)
   - Jika booking sebelumnya sudah ada keybox, tetap gunakan keybox terakhir dari property
   - Keybox code di-replace otomatis di template dengan `{{keybox_code}}`

3. **Implementasi:**

   - Buat method di Booking model: `getCheckinInstructions()` yang mengikuti flow di atas
   - Update method di Property: pastikan template replacement bekerja dengan benar
   - Update controller yang menampilkan check-in instruction (Dashboard, MyBookings, dll)

**File yang akan dimodifikasi:**

- `app/Models/Booking.php` (tambah method `getCheckinInstructions()`)
- `app/Models/Property.php` (perbaiki method template replacement jika perlu)
- Controller yang menampilkan check-in instruction

---

## TAHAP 4: Backend Logic - Rate Breakdown Fix

### 4.1 Analisis Error Rate Calculation

**File yang perlu dicek:**

- `app/Services/RateCalculationService.php` (method `calculateRate()`)

**Masalah yang perlu diperbaiki:**

- Error saat kombinasi weekend + seasonal + base rate
- Pastikan prioritas: seasonal > weekend > base rate
- Pastikan logika rate breakdown harian benar

**Analisis Kode Existing:**

Dari kode yang sudah dibaca, logika di `RateCalculationService::calculateRate()` sudah benar:

- Line 76-104: Seasonal rate diterapkan FIRST (priority)
- Line 112-140: Weekend premium hanya diterapkan jika TIDAK ada seasonal rate
- Line 143-156: Holiday premium hanya jika tidak ada seasonal rate

**Kemungkinan Error:**

- Mungkin ada edge case di daily breakdown calculation
- Mungkin ada masalah di frontend saat menampilkan breakdown
- Perlu test dengan berbagai kombinasi tanggal

**Perbaikan:**

- Tambah unit test untuk berbagai kombinasi (weekend + seasonal, weekend saja, seasonal saja, base rate saja)
- Pastikan `daily_breakdown` di response benar
- Pastikan `totalBaseAmount` calculation benar (tidak double count)
- Pastikan `weekendPremium` dan `seasonalPremium` tidak overlap
- Validasi: jika ada seasonal rate, weekend premium = 0 untuk hari tersebut
- Pastikan tampilan rate breakdown di frontend transparan (tampilkan per hari dengan detail premiums)

**File yang akan dimodifikasi:**

- `app/Services/RateCalculationService.php` (perbaiki logika jika ada bug)
- `tests/Unit/RateCalculationServiceTest.php` (tambah test cases)
- Frontend: `resources/js/pages/Booking/Create.tsx` (pastikan rate breakdown ditampilkan dengan benar)

---

## TAHAP 5: UI Improvement - Booking Confirmation Page

### 5.1 Sesuaikan Warna dengan app.css

**File yang akan dimodifikasi:**

- `resources/js/pages/Booking/Confirmation.tsx`
- `resources/css/app.css` (cek warna yang digunakan)

**Perbaikan:**

- Pastikan semua warna mengikuti design system dari app.css
- Gunakan CSS variables atau Tailwind classes yang konsisten
- Pastikan kontras warna untuk accessibility

### 5.2 Flow Password Reset untuk User Baru

**File yang akan dimodifikasi:**

- `resources/js/pages/Booking/Confirmation.tsx`
- `app/Http/Controllers/BookingController.php` (method `confirmation()`)
- `routes/web.php` (route password reset)

**Implementasi:**

- Deteksi user baru (created_at < 24 jam atau flag is_new_user)
- Jika user baru → redirect ke halaman ganti password
- Link reset password harus one-time use & expired setelah digunakan
- Tambah field `password_reset_token` dan `password_reset_expires_at` di User model (jika belum ada)
- Buat route dan controller untuk password reset dengan token validation

**Flow:**

1. User baru membuat booking → auto login
2. Redirect ke confirmation page
3. Deteksi user baru → tampilkan alert + redirect ke change password
4. User harus ganti password sebelum bisa akses dashboard
5. Token reset password expired setelah digunakan atau 24 jam

### 5.3 Tambah Elemen Informasi Penting

**File yang akan dimodifikasi:**

- `resources/js/pages/Booking/Confirmation.tsx`

**Elemen yang harus ditampilkan:**

- Property name (dengan link ke property detail)
- Tanggal check-in & check-out (formatted)
- Harga total (formatted dengan currency)
- Instruksi lanjut (next steps):
  - Jika belum bayar: link ke payment page
  - Jika sudah bayar: informasi check-in time & instructions
  - Link ke dashboard untuk melihat booking detail
- Booking number (dengan copy button)
- Status booking & payment status (dengan badge/indicator)

---

## TAHAP 6: UI Improvement - Property Detail Page

### 6.1 Perbaiki Layout (Desktop & Mobile)

**File yang akan dimodifikasi:**

- `resources/js/pages/Property/Show.tsx`

**Perbaikan:**

- Pastikan tidak ada elemen keluar container
- Gunakan grid/flex responsif (Tailwind CSS)
- Rapikan padding dan spacing (gunakan spacing scale yang konsisten)
- Test di berbagai breakpoint (mobile, tablet, desktop)
- Pastikan gambar/video tidak overflow container

### 6.2 Tambah Kolom Video Embed TikTok

**File yang akan dimodifikasi:**

- `app/Models/Property.php` (tambah field `tiktok_video_url` jika belum ada)
- `database/migrations/` (migration untuk tambah kolom)
- `app/Http/Controllers/PropertyController.php` (include field di response)
- `resources/js/pages/Property/Show.tsx` (tampilkan video embed)

**Implementasi:**

- Tambah field `tiktok_video_url` di properties table
- Validasi input: hanya menerima URL TikTok (format: https://www.tiktok.com/@username/video/...)
- Gunakan iframe responsif untuk embed TikTok video
- Pastikan video responsive (aspect ratio 9:16 untuk TikTok)
- Tambah fallback jika video tidak bisa dimuat

**Validasi URL TikTok:**

- Regex pattern untuk validasi format TikTok URL
- Extract video ID dari URL jika perlu
- Handle berbagai format TikTok URL (mobile, desktop, shortened)

---

## TAHAP 7: UI Improvement - Halaman Admin

### 7.1 Rapikan Tampilan Admin

**File yang akan dimodifikasi:**

- `resources/js/pages/Admin/Bookings/Index.tsx`
- `resources/js/pages/Admin/Bookings/Show.tsx`
- `resources/js/pages/Admin/Bookings/Edit.tsx`
- `resources/js/pages/Admin/Inventory/Items.tsx`
- File admin lainnya yang punya tombol "Back"

**Perbaikan:**

- Tombol "Back" yang offside dikoreksi ke dalam container
- Samakan gaya tombol di semua halaman admin (gunakan komponen Button yang konsisten)
- Pastikan spacing dan alignment konsisten
- Gunakan layout wrapper yang sama untuk semua halaman admin

**Konsistensi:**

- Semua tombol menggunakan komponen Button dari Shadcn UI
- Semua halaman admin menggunakan layout yang sama
- Spacing menggunakan Tailwind spacing scale
- Warna mengikuti design system

---

## Urutan Eksekusi

1. **Tahap 1**: Item edit/delete (backend logic)
2. **Tahap 2**: Booking edit/delete (backend logic)
3. **Tahap 3**: Check-in instruction & keybox flow (backend logic)
4. **Tahap 4**: Rate breakdown fix (backend logic)
5. **Tahap 5**: Booking confirmation page (UI)
6. **Tahap 6**: Property detail page (UI)
7. **Tahap 7**: Halaman admin (UI)

---

## Testing Checklist

### Backend Testing

- [ ] Unit test untuk InventoryItem edit/delete
- [ ] Unit test untuk Booking edit/delete
- [ ] Unit test untuk check-in instruction flow
- [ ] Unit test untuk rate calculation (various combinations)
- [ ] Integration test untuk booking workflow

### Frontend Testing

- [ ] Test booking confirmation page di berbagai browser
- [ ] Test property detail page responsive di berbagai device
- [ ] Test admin pages layout consistency
- [ ] Test password reset flow untuk user baru

### Security Testing

- [ ] Test authorization untuk delete booking (hanya super_admin)
- [ ] Test authorization untuk delete item (hanya admin)
- [ ] Test password reset token expiration
- [ ] Test XSS prevention di TikTok URL input

---

## Notes

- Semua perubahan backend harus di-test sebelum UI diimplementasikan
- Pastikan tidak ada breaking changes di API yang digunakan frontend
- Gunakan migration untuk perubahan database schema
- Update documentation jika ada perubahan flow yang signifikan

