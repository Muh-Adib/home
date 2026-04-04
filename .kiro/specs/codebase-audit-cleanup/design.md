# Codebase Audit Cleanup — Bugfix Design

## Overview

Dokumen ini menjabarkan solusi teknis untuk enam kelompok masalah yang ditemukan dalam audit codebase Homsjogja. Setiap kelompok ditangani dengan pendekatan minimal-invasif: hanya mengubah apa yang perlu diubah, tanpa menyentuh logika bisnis yang sudah berjalan.

Urutan eksekusi mengikuti tingkat kritis: A (migration conflict) → B (route duplikat) → C (dead code) → D (rename service) → E (file residual) → F (dokumentasi).

---

## Glossary

- **Bug_Condition (C)**: Kondisi yang menyebabkan defect — timestamp migration identik, route duplikat, dead code, nama ambigu, file tidak terpakai, dokumentasi salah tempat
- **Property (P)**: Perilaku yang diharapkan setelah fix — setiap migration punya timestamp unik, satu set route canonical, tidak ada dead code, nama service deskriptif, direktori bersih
- **Preservation**: Perilaku yang tidak boleh berubah — semua fitur aktif tetap berjalan, semua route yang digunakan frontend tetap resolve, logika bisnis tidak berubah
- **isBugCondition(X)**: Fungsi pseudocode yang mengidentifikasi apakah input X memenuhi kondisi bug
- **Canonical route**: Set route yang menjadi satu-satunya sumber kebenaran untuk suatu resource
- **Dead code**: Kode yang ada di codebase tapi tidak pernah dipanggil oleh sistem manapun
- **Semantic rename**: Rename class/file beserta semua referensinya secara atomik

---

## Bug Details

### Kelompok A — Duplicate Migration Timestamp

#### Bug Condition

Dua file migration memiliki timestamp `2025_10_30_000004` yang identik. Laravel mengurutkan migration berdasarkan nama file secara leksikografis, sehingga urutan eksekusi antara keduanya tidak deterministik.

```
FUNCTION isBugCondition_A(migrationFiles)
  INPUT: migrationFiles — daftar file di database/migrations/
  OUTPUT: boolean

  duplicates := GROUP migrationFiles BY extractTimestamp(file)
  RETURN ANY group IN duplicates WHERE COUNT(group) > 1
END FUNCTION
```

**File yang konflik:**
- `2025_10_30_000004_alter_payment_methods_add_wallet_id.php`
- `2025_10_30_000004_alter_property_expenses_property_id_nullable.php`

**Analisis slot timestamp yang tersedia:**

| Timestamp | File yang ada |
|-----------|--------------|
| `000004` | KONFLIK (dua file) |
| `000005` | `add_wallet_id_to_payment_methods.php` — sudah terpakai |
| `000006` | `create_inventory_items_table.php` — sudah terpakai |
| `094033` | Kosong — tersedia (satu detik sebelum `094034`) |

**Contoh manifestasi:**
- `migrate:fresh` pada CI/CD: urutan eksekusi bisa berbeda tiap run, menyebabkan foreign key error intermittent
- `migrate:fresh` lokal: bergantung pada urutan filesystem OS, tidak konsisten antar developer

### Kelompok B — Route Duplikat

#### Bug Condition

`BookingManagementController` di-register dua kali di `routes/admin.php` dengan prefix berbeda.

```
FUNCTION isBugCondition_B(routeTable)
  INPUT: routeTable — output dari php artisan route:list
  OUTPUT: boolean

  RETURN EXISTS route1, route2 IN routeTable WHERE
    route1.controller = route2.controller AND
    route1.action = route2.action AND
    route1.name != route2.name
END FUNCTION
```

**Temuan kritis dari analisis frontend:**

Setelah menelusuri seluruh codebase frontend, ditemukan bahwa **kedua set route aktif digunakan**:

| Set Route | Digunakan oleh |
|-----------|---------------|
| `admin.bookings.*` | `app-header.tsx` (navigasi), `CheckInOut.tsx`, `PaymentController.php` (redirect), test files |
| `admin.booking-management.*` | `BookingForm.tsx` (create/edit/store), `Show.tsx` (delete), `Edit.tsx` (breadcrumb), `CalendarTimeline.tsx` |
| `/api/admin/booking-management/*` | `BookingSearchBar.tsx`, `BookingManualInputDialog.tsx`, `useBookingTimeline.ts`, `bookings.service.ts`, `useAdminBookingAvailability.ts` |

Ini berarti **tidak ada set yang bisa dihapus langsung** tanpa menyebabkan broken functionality. Solusi yang benar adalah migrasi bertahap: konsolidasi frontend ke satu set, baru hapus set lama.

### Kelompok C — Dead Code Controller

#### Bug Condition

```
FUNCTION isBugCondition_C(controller, routeTable)
  INPUT: controller — nama class controller
         routeTable — semua route yang terdaftar
  OUTPUT: boolean

  RETURN NOT EXISTS route IN routeTable WHERE
    route.controller = controller
END FUNCTION
```

`BookingImportPreviewController` tidak muncul di `routes/admin.php`, `routes/web.php`, maupun `routes/staff.php`. Fungsionalitas yang sama sudah ada di `BookingManagementController@importPreview` (route `admin.bookings.import.preview`).

### Kelompok D — Nama Service Ambigu

#### Bug Condition

```
FUNCTION isBugCondition_D(serviceName, existingNames)
  INPUT: serviceName — nama class yang dievaluasi
         existingNames — daftar nama class lain di namespace yang sama
  OUTPUT: boolean

  RETURN serviceName CONTAINS prefix(existingNames)
         AND NOT serviceName CLEARLY DESCRIBES its responsibility
END FUNCTION
```

`BookingServiceSyncService` ambigu karena `BookingService` sudah ada sebagai class terpisah. Nama ini bisa dibaca sebagai "service untuk sync BookingService" padahal fungsinya adalah "sync extra services pada booking".

**Referensi yang perlu diupdate:**
- `app/Services/BookingServiceSyncService.php` — file utama
- `app/Http/Controllers/Admin/BookingManagementController.php` — use + constructor + property
- `app/Services/AdminBookingService.php` — use + constructor
- `app/Actions/Booking/CreateBookingAction.php` — use + constructor

### Kelompok E — File Residual

#### Bug Condition

```
FUNCTION isBugCondition_E(file, loadedRouteFiles)
  INPUT: file — path file route
         loadedRouteFiles — file yang di-load di bootstrap/app.php
  OUTPUT: boolean

  RETURN file NOT IN loadedRouteFiles
         AND file.content IS EMPTY OR ONLY_COMMENTS
END FUNCTION
```

`routes/test.php` tidak di-load di `bootstrap/app.php` (hanya `admin.php`, `user.php`, `staff.php` yang di-load).

### Kelompok F — Dokumentasi Salah Tempat

#### Bug Condition

```
FUNCTION isBugCondition_F(file)
  INPUT: file — path file
  OUTPUT: boolean

  RETURN file.extension = '.md'
         AND file.directory IN ['app/', 'resources/js/']
         AND (file.content CONTAINS outdated_info
              OR file.directory VIOLATES convention)
END FUNCTION
```

**File yang terdampak:**
- `app/Http/Controllers/README.md` — menyebut "Admin/BookingController.php duplikat" (salah)
- `app/Http/Controllers/CONTROLLER_AUDIT.md` — audit Januari 2025, sudah tidak relevan
- `app/Models/README.md` — menyebut model-model sebagai "stub belum diimplementasi" (salah)
- `resources/js/pages/README.md` — markdown di dalam folder kode frontend
- `ANALISIS_DAN_REKOMENDASI_INVENTORY_FINANCE_BOOKING.md` — rekomendasi sudah tidak relevan

---

## Expected Behavior

### Preservation Requirements

**Perilaku yang tidak boleh berubah:**
- Admin dapat mengakses `/admin/bookings` dan melihat daftar booking
- Semua operasi booking (verify, reject, cancel, checkin, checkout) tetap berfungsi
- Import/export booking tetap berfungsi
- `BookingForm.tsx` dapat membuat dan mengedit booking
- `CalendarTimeline.tsx` dapat memuat data timeline
- `BookingSearchBar.tsx` dan `BookingManualInputDialog.tsx` tetap berfungsi
- `php artisan migrate` pada database existing tidak error
- Semua fitur yang menggunakan `BookingServiceSyncService` tetap berfungsi identik setelah rename

**Scope:**
Semua input yang tidak memenuhi kondisi bug di atas tidak boleh terpengaruh oleh fix ini.

---

## Hypothesized Root Cause

### Kelompok A
Dua developer mengerjakan migration berbeda pada tanggal yang sama dan menggunakan counter `000004` secara bersamaan tanpa koordinasi. Tidak ada mekanisme otomatis yang mencegah duplikasi timestamp manual.

### Kelompok B
Route `admin.booking-management.*` kemungkinan dibuat lebih dulu sebagai versi awal, kemudian `admin.bookings.*` dibuat sebagai versi "canonical" yang lebih bersih. Frontend kemudian bermigrasi sebagian ke set baru tapi tidak selesai, meninggalkan kedua set aktif digunakan.

### Kelompok C
`BookingImportPreviewController` dibuat sebagai controller terpisah di awal development, kemudian fungsionalitasnya digabungkan ke `BookingManagementController`, tapi file lama tidak dihapus.

### Kelompok D
Penamaan mengikuti pola `{Domain}{Dependency}SyncService` yang tidak konsisten. `BookingService` sudah ada sebagai nama class, sehingga prefix `Booking` pada `BookingServiceSyncService` menjadi ambigu.

### Kelompok E
`routes/test.php` dibuat untuk keperluan testing sementara dan tidak pernah dihapus setelah tidak dibutuhkan.

### Kelompok F
Dokumentasi dibuat langsung di dalam folder kode sebagai catatan sementara selama development, tidak dipindahkan ke lokasi yang tepat.

---

## Correctness Properties

Property 1: Bug Condition A — Timestamp Migration Unik

_For any_ dua file migration di `database/migrations/`, keduanya SHALL memiliki timestamp yang berbeda sehingga urutan eksekusi `migrate:fresh` bersifat deterministik dan konsisten.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition B — Route Canonical Tunggal

_For any_ operasi pada `BookingManagementController`, setelah migrasi frontend selesai, SHALL hanya ada satu named route yang mengarah ke operasi tersebut, menghilangkan duplikasi di route table.

**Validates: Requirements 2.3, 2.4**

Property 3: Bug Condition C — Tidak Ada Dead Code Controller

_For any_ file controller di `app/Http/Controllers/`, controller tersebut SHALL terdaftar minimal di satu route file yang aktif di-load oleh aplikasi.

**Validates: Requirements 2.5**

Property 4: Bug Condition D — Nama Service Tidak Ambigu

_For any_ class di `app/Services/`, namanya SHALL secara jelas mendeskripsikan tanggung jawabnya tanpa konflik dengan nama class lain di namespace yang sama.

**Validates: Requirements 2.6, 2.7**

Property 5: Preservation — Semua Route Aktif Tetap Resolve

_For any_ named route yang saat ini digunakan oleh frontend (baik `admin.bookings.*` maupun `admin.booking-management.*`), route tersebut SHALL tetap resolve dengan benar selama proses migrasi berlangsung.

**Validates: Requirements 3.1, 3.2, 3.3, 3.8**

Property 6: Preservation — Logika Bisnis Tidak Berubah

_For any_ operasi yang menggunakan `BookingServiceSyncService` (sync extra services), perilaku setelah rename SHALL identik dengan perilaku sebelum rename — hanya nama class yang berubah, bukan logika.

**Validates: Requirements 3.5**

---

## Fix Implementation

### Kelompok A — Rename Migration Timestamp

**File yang diubah:** `database/migrations/2025_10_30_000004_alter_property_expenses_property_id_nullable.php`

**Perubahan:**
1. Rename file ke `2025_10_30_094033_alter_property_expenses_property_id_nullable.php`
   - Timestamp `094033` dipilih karena slot kosong (satu detik sebelum `094034` yang sudah ada)
   - File `alter_payment_methods_add_wallet_id` tetap di `000004` karena sudah ada `000005` yang merupakan migration lanjutannya (`add_wallet_id_to_payment_methods`) — urutan ini semantically benar
   - `alter_property_expenses_property_id_nullable` tidak memiliki dependency ketat dengan `000004`, sehingga aman dipindah ke slot `094033`

2. Isi file tidak perlu diubah — hanya nama file yang berubah

**Verifikasi:** Setelah rename, jalankan `php artisan migrate:fresh` dan pastikan tidak ada error.

### Kelompok B — Konsolidasi Route Duplikat (Migrasi Bertahap)

Karena frontend aktif menggunakan kedua set route, penghapusan langsung akan menyebabkan broken functionality. Solusi yang aman adalah migrasi bertahap:

**Fase 1 (Task ini): Identifikasi dan dokumentasi**
- Tandai `admin.booking-management.*` sebagai "deprecated" dalam komentar di `routes/admin.php`
- Tidak ada perubahan kode pada fase ini — hanya dokumentasi intent

**Fase 2 (Migrasi frontend): Update semua referensi frontend**

File yang perlu diupdate untuk migrasi ke `admin.bookings.*`:

| File | Perubahan |
|------|-----------|
| `resources/js/pages/Admin/Bookings/BookingForm.tsx` | `admin.booking-management.index` → `admin.bookings.index`, `admin.booking-management.show` → `admin.bookings.show`, `admin.booking-management.store` → `admin.bookings.store`, `admin.booking-management.update` → `admin.bookings.update` |
| `resources/js/pages/Admin/Bookings/Show.tsx` | URL `/admin/booking-management/` → `/admin/bookings/` |
| `resources/js/pages/Admin/Bookings/Edit.tsx` | URL `/admin/booking-management/` → `/admin/bookings/` |
| `resources/js/pages/Admin/Payments/Edit.tsx` | URL `/admin/booking-management/` → `/admin/bookings/` |
| `resources/js/pages/Admin/Bookings/CalendarTimeline.tsx` | `admin.booking-management.create` → `admin.bookings.create`, URL `/api/admin/booking-management/timeline` → `/api/admin/booking-management/timeline` (API route tetap, tidak berubah) |

**Catatan penting:** Route API `/api/admin/booking-management/*` (prefix berbeda, bukan bagian dari set duplikat) **tidak diubah** — ini adalah route terpisah yang sudah benar.

**Fase 3 (Cleanup): Hapus set route duplikat**
- Setelah semua frontend dimigrasi ke `admin.bookings.*`, hapus blok route `booking-management` dari `routes/admin.php`
- Verifikasi dengan `php artisan route:list` bahwa tidak ada duplikasi

**Untuk spec ini, implementasi mencakup Fase 1 + Fase 2 + Fase 3.**

### Kelompok C — Hapus Dead Code Controller

**File yang dihapus:** `app/Http/Controllers/Admin/BookingImportPreviewController.php`

**Verifikasi sebelum hapus:**
- Konfirmasi tidak ada route yang mereferensikan class ini (sudah diverifikasi: tidak ada)
- Konfirmasi tidak ada file lain yang meng-import class ini

### Kelompok D — Rename Service

**File yang diubah:**
1. Rename `app/Services/BookingServiceSyncService.php` → `app/Services/BookingExtraServiceSyncService.php`
2. Update nama class di dalam file: `class BookingServiceSyncService` → `class BookingExtraServiceSyncService`
3. Update semua referensi:
   - `app/Http/Controllers/Admin/BookingManagementController.php`: `use` statement + constructor parameter type + property type
   - `app/Services/AdminBookingService.php`: `use` statement + constructor parameter type
   - `app/Actions/Booking/CreateBookingAction.php`: `use` statement + constructor parameter type

### Kelompok E — Hapus File Residual

**File yang dihapus:** `routes/test.php`

**Verifikasi:** Konfirmasi file tidak di-load di `bootstrap/app.php` (sudah diverifikasi: tidak ada).

### Kelompok F — Bersihkan Dokumentasi

**File yang dihapus:**
- `app/Http/Controllers/README.md`
- `app/Http/Controllers/CONTROLLER_AUDIT.md`
- `app/Models/README.md`
- `resources/js/pages/README.md`
- `ANALISIS_DAN_REKOMENDASI_INVENTORY_FINANCE_BOOKING.md`

**File yang dibuat:**
- `docs/CODEBASE_OVERVIEW.md` — dokumentasi akurat tentang struktur codebase, menggantikan semua file di atas dengan informasi yang benar dan terkini

**Konten `docs/CODEBASE_OVERVIEW.md` mencakup:**
- Struktur direktori utama
- Daftar controller aktif dan route-nya
- Daftar service dan tanggung jawabnya
- Daftar model dan status implementasinya (semua sudah fully implemented)
- Konvensi penamaan yang digunakan

---

## Testing Strategy

### Validation Approach

Strategi testing mengikuti dua fase: pertama verifikasi kondisi bug ada (exploratory), kemudian verifikasi fix benar dan tidak ada regresi (fix + preservation checking).

### Exploratory Bug Condition Checking

**Goal:** Konfirmasi kondisi bug sebelum fix diimplementasikan.

**Test Plan:** Jalankan pemeriksaan pada kode yang belum difix untuk membuktikan kondisi bug ada.

**Test Cases:**

1. **Migration Conflict Test**: Jalankan `php artisan migrate:fresh` beberapa kali dan catat apakah urutan eksekusi konsisten (akan gagal/tidak konsisten pada unfixed code)
2. **Route Duplicate Test**: Jalankan `php artisan route:list | grep booking` dan hitung entri duplikat (akan menampilkan duplikasi pada unfixed code)
3. **Dead Code Test**: Cari `BookingImportPreviewController` di semua route file (akan tidak ditemukan pada unfixed code)
4. **Ambiguous Name Test**: Cari semua class dengan prefix `BookingService` di `app/Services/` (akan menemukan ambiguitas pada unfixed code)

**Expected Counterexamples:**
- `migrate:fresh` menghasilkan error atau urutan berbeda karena timestamp `000004` duplikat
- `route:list` menampilkan dua baris untuk operasi yang sama dengan nama berbeda

### Fix Checking

**Goal:** Verifikasi bahwa setiap fix menyelesaikan kondisi bug yang ditargetkan.

```
FOR ALL migrationFile IN database/migrations/ DO
  ASSERT extractTimestamp(migrationFile) IS UNIQUE
END FOR

FOR ALL operation IN BookingManagementController DO
  ASSERT COUNT(routes WHERE controller=operation) = 1
END FOR

FOR ALL controller IN app/Http/Controllers/ DO
  ASSERT controller IS REFERENCED IN at_least_one_route_file
END FOR

FOR ALL serviceName IN app/Services/ DO
  ASSERT serviceName DOES NOT CONFLICT WITH other_class_names
END FOR
```

### Preservation Checking

**Goal:** Verifikasi bahwa fix tidak menyebabkan regresi pada perilaku yang sudah benar.

```
FOR ALL route IN currently_used_routes DO
  ASSERT route RESOLVES CORRECTLY after fix
END FOR

FOR ALL call TO BookingExtraServiceSyncService DO
  ASSERT behavior = behavior_before_rename
END FOR
```

**Testing Approach:** Property-based testing direkomendasikan untuk preservation checking route karena dapat men-generate banyak kombinasi route name dan memverifikasi semuanya resolve dengan benar.

**Test Cases:**

1. **Route Resolution Preservation**: Verifikasi semua named route yang digunakan frontend masih resolve setelah konsolidasi
2. **Service Behavior Preservation**: Verifikasi `BookingExtraServiceSyncService::sync()` menghasilkan output identik dengan `BookingServiceSyncService::sync()` untuk input yang sama
3. **Migration Order Preservation**: Verifikasi `migrate:fresh` mengeksekusi migration dalam urutan yang benar dan konsisten setelah rename timestamp

### Unit Tests

- Test bahwa `migrate:fresh` berhasil tanpa error setelah rename timestamp
- Test bahwa semua route `admin.bookings.*` resolve ke controller dan action yang benar
- Test bahwa `BookingExtraServiceSyncService::sync()` menghasilkan output yang benar untuk berbagai input
- Test bahwa `BookingImportPreviewController` tidak lagi ada di filesystem

### Property-Based Tests

- Generate berbagai kombinasi booking data dan verifikasi `BookingExtraServiceSyncService::sync()` menghasilkan total yang benar (sama dengan sebelum rename)
- Generate berbagai named route dan verifikasi tidak ada duplikasi setelah konsolidasi
- Generate berbagai urutan migration dan verifikasi timestamp unik menjamin urutan deterministik

### Integration Tests

- Test full flow: buat booking via `BookingForm.tsx` menggunakan route `admin.bookings.*` setelah migrasi frontend
- Test bahwa `CalendarTimeline.tsx` masih memuat data dengan benar setelah konsolidasi route
- Test bahwa `PaymentController` redirect ke `admin.bookings.show` tetap berfungsi
- Test bahwa import/export booking tetap berfungsi setelah semua perubahan
