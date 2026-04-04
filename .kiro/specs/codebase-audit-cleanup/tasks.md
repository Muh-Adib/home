# Implementation Plan

- [x] 1. Tulis exploration test kondisi bug (sebelum fix)
  - **Property 1: Bug Condition** - Duplikasi Timestamp Migration & Route Duplikat
  - **PENTING**: Test ini HARUS GAGAL pada kode yang belum difix — kegagalan membuktikan bug ada
  - **JANGAN mencoba memperbaiki test atau kode ketika gagal**
  - **TUJUAN**: Temukan counterexample yang membuktikan bug ada
  - Periksa duplikasi timestamp: `isBugCondition_A` — cari dua file di `database/migrations/` dengan timestamp `2025_10_30_000004` yang identik
  - Periksa route duplikat: `isBugCondition_B` — jalankan `php artisan route:list | grep booking-management` dan verifikasi ada entri duplikat untuk operasi yang sama
  - Periksa dead code: `isBugCondition_C` — konfirmasi `BookingImportPreviewController` tidak muncul di route manapun
  - Periksa nama ambigu: `isBugCondition_D` — konfirmasi `BookingServiceSyncService` ada dan `BookingService` juga ada sebagai class terpisah
  - Jalankan pemeriksaan pada kode yang belum difix
  - **HASIL YANG DIHARAPKAN**: Semua kondisi bug terkonfirmasi ada (ini benar — membuktikan bug ada)
  - Dokumentasikan counterexample yang ditemukan (misal: dua file dengan `000004`, dua baris route untuk `bookings.index` dan `booking-management.index`)
  - Tandai task selesai setelah pemeriksaan dijalankan dan kegagalan didokumentasikan
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

- [x] 2. Tulis preservation property tests (SEBELUM mengimplementasikan fix)
  - **Property 2: Preservation** - Semua Route Aktif & Fitur Booking Tetap Berfungsi
  - **PENTING**: Ikuti metodologi observation-first
  - Observasi: `php artisan route:list | grep admin.bookings` menampilkan semua route `admin.bookings.*` pada kode unfixed
  - Observasi: `php artisan route:list | grep admin.booking-management` menampilkan semua route `admin.booking-management.*` pada kode unfixed
  - Observasi: `BookingServiceSyncService::sync()` menghasilkan output tertentu untuk input tertentu pada kode unfixed
  - Tulis property-based test: untuk semua named route yang saat ini digunakan frontend (`admin.bookings.*` dan `admin.booking-management.*`), semua route tersebut SHALL resolve dengan benar
  - Tulis property-based test: untuk semua input booking yang valid, `BookingServiceSyncService::sync()` menghasilkan output yang konsisten
  - Verifikasi test LULUS pada kode unfixed
  - **HASIL YANG DIHARAPKAN**: Test LULUS (mengkonfirmasi baseline perilaku yang harus dipertahankan)
  - Tandai task selesai setelah test ditulis, dijalankan, dan lulus pada kode unfixed
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3. Kelompok A — Fix duplikasi timestamp migration

  - [x] 3.1 Rename file migration yang konflik
    - Rename `database/migrations/2025_10_30_000004_alter_property_expenses_property_id_nullable.php` → `database/migrations/2025_10_30_094033_alter_property_expenses_property_id_nullable.php`
    - Isi file tidak perlu diubah — hanya nama file yang berubah
    - Timestamp `094033` dipilih karena slot kosong (satu detik sebelum `094034` yang sudah ada)
    - File `alter_payment_methods_add_wallet_id` tetap di `000004` karena `000005` adalah migration lanjutannya
    - _Bug_Condition: isBugCondition_A — dua file dengan timestamp `2025_10_30_000004` identik_
    - _Expected_Behavior: setiap file migration memiliki timestamp unik, urutan `migrate:fresh` deterministik_
    - _Preservation: `php artisan migrate` pada database existing tidak error (Requirements 3.4)_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Verifikasi exploration test kondisi bug sekarang lulus
    - **Property 1: Expected Behavior** - Timestamp Migration Unik
    - **PENTING**: Jalankan ulang test yang SAMA dari task 1 — JANGAN tulis test baru
    - Verifikasi tidak ada lagi dua file dengan timestamp `000004` yang identik
    - Jalankan `php artisan migrate:fresh` dan pastikan tidak ada error
    - **HASIL YANG DIHARAPKAN**: Test LULUS (mengkonfirmasi bug timestamp sudah diperbaiki)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verifikasi preservation tests masih lulus
    - **Property 2: Preservation** - Migration Existing Tidak Terpengaruh
    - **PENTING**: Jalankan ulang test yang SAMA dari task 2 — JANGAN tulis test baru
    - **HASIL YANG DIHARAPKAN**: Test LULUS (tidak ada regresi)

- [x] 4. Kelompok B — Konsolidasi route duplikat (migrasi frontend)

  - [x] 4.1 Update BookingForm.tsx — migrasi ke route canonical
    - File: `resources/js/pages/Admin/Bookings/BookingForm.tsx`
    - Ganti `admin.booking-management.index` → `admin.bookings.index`
    - Ganti `admin.booking-management.show` → `admin.bookings.show`
    - Ganti `admin.booking-management.store` → `admin.bookings.store`
    - Ganti `admin.booking-management.update` → `admin.bookings.update`
    - Route API `/api/admin/booking-management/*` TIDAK diubah — ini route terpisah yang benar
    - _Bug_Condition: isBugCondition_B — BookingManagementController di-register dua kali dengan prefix berbeda_
    - _Expected_Behavior: satu set route canonical `admin.bookings.*` untuk semua operasi booking_
    - _Preservation: BookingForm.tsx dapat membuat dan mengedit booking (Requirements 3.1, 3.2)_
    - _Requirements: 2.3, 2.4_

  - [x] 4.2 Update Show.tsx, Edit.tsx, Payments/Edit.tsx — migrasi URL
    - File: `resources/js/pages/Admin/Bookings/Show.tsx`
    - File: `resources/js/pages/Admin/Bookings/Edit.tsx`
    - File: `resources/js/pages/Admin/Payments/Edit.tsx`
    - Ganti semua URL `/admin/booking-management/` → `/admin/bookings/`
    - _Requirements: 2.3, 2.4_

  - [x] 4.3 Hapus blok route booking-management dari routes/admin.php
    - Hapus blok route dengan prefix `booking-management` dari `routes/admin.php` setelah semua frontend dimigrasi
    - Pastikan blok route `admin.bookings.*` tetap ada dan tidak tersentuh
    - Route API `/api/admin/booking-management/*` TIDAK dihapus — ini route terpisah yang benar
    - Verifikasi dengan `php artisan route:list | grep booking-management` bahwa tidak ada lagi entri duplikat (kecuali API route)
    - _Requirements: 2.3, 2.4_

  - [x] 4.4 Verifikasi exploration test kondisi bug sekarang lulus
    - **Property 1: Expected Behavior** - Route Canonical Tunggal
    - **PENTING**: Jalankan ulang test yang SAMA dari task 1 — JANGAN tulis test baru
    - Verifikasi `php artisan route:list` tidak menampilkan duplikasi untuk operasi booking
    - **HASIL YANG DIHARAPKAN**: Test LULUS (mengkonfirmasi bug route duplikat sudah diperbaiki)
    - _Requirements: 2.3, 2.4_

  - [x] 4.5 Verifikasi preservation tests masih lulus
    - **Property 2: Preservation** - Semua Route Frontend Tetap Resolve
    - **PENTING**: Jalankan ulang test yang SAMA dari task 2 — JANGAN tulis test baru
    - Verifikasi semua route `admin.bookings.*` yang digunakan frontend masih resolve
    - Verifikasi navigasi di `app-header.tsx`, `CheckInOut.tsx`, dan `PaymentController.php` redirect masih berfungsi
    - **HASIL YANG DIHARAPKAN**: Test LULUS (tidak ada regresi, tidak ada broken link)
    - _Requirements: 3.1, 3.2, 3.3, 3.8_

- [x] 5. Kelompok C — Hapus dead code controller

  - [x] 5.1 Hapus BookingImportPreviewController.php
    - Hapus file `app/Http/Controllers/Admin/BookingImportPreviewController.php`
    - Konfirmasi tidak ada route yang mereferensikan class ini sebelum menghapus
    - Konfirmasi tidak ada file lain yang meng-import class ini
    - Fungsionalitas yang sama sudah tersedia di `BookingManagementController@importPreview` (route `admin.bookings.import.preview`)
    - _Bug_Condition: isBugCondition_C — controller tidak terdaftar di route manapun_
    - _Expected_Behavior: tidak ada controller yang tidak di-route di app/Http/Controllers/_
    - _Preservation: fitur import booking tetap berfungsi via BookingManagementController (Requirements 3.3)_
    - _Requirements: 2.5_

  - [x] 5.2 Verifikasi preservation tests masih lulus
    - **Property 2: Preservation** - Import Booking Tetap Berfungsi
    - **PENTING**: Jalankan ulang test yang SAMA dari task 2 — JANGAN tulis test baru
    - Verifikasi route `admin.bookings.import.preview` masih berfungsi
    - **HASIL YANG DIHARAPKAN**: Test LULUS (tidak ada regresi)
    - _Requirements: 3.3_

- [x] 6. Kelompok D — Rename BookingServiceSyncService → BookingExtraServiceSyncService

  - [x] 6.1 Rename file dan class service
    - Gunakan semantic rename untuk memastikan semua referensi terupdate secara atomik
    - Rename file: `app/Services/BookingServiceSyncService.php` → `app/Services/BookingExtraServiceSyncService.php`
    - Rename class di dalam file: `class BookingServiceSyncService` → `class BookingExtraServiceSyncService`
    - _Bug_Condition: isBugCondition_D — nama service ambigu karena BookingService sudah ada sebagai class terpisah_
    - _Expected_Behavior: nama BookingExtraServiceSyncService secara jelas mendeskripsikan fungsinya (sync extra services pada booking)_
    - _Preservation: semua fitur yang menggunakan service ini tetap berfungsi identik (Requirements 3.5)_
    - _Requirements: 2.6_

  - [x] 6.2 Update semua referensi ke class lama
    - `app/Http/Controllers/Admin/BookingManagementController.php`: update `use` statement, tipe parameter constructor, tipe property
    - `app/Services/AdminBookingService.php`: update `use` statement, tipe parameter constructor
    - `app/Actions/Booking/CreateBookingAction.php`: update `use` statement, tipe parameter constructor
    - _Requirements: 2.7_

  - [x] 6.3 Verifikasi exploration test kondisi bug sekarang lulus
    - **Property 1: Expected Behavior** - Nama Service Tidak Ambigu
    - **PENTING**: Jalankan ulang test yang SAMA dari task 1 — JANGAN tulis test baru
    - Verifikasi `BookingServiceSyncService` tidak lagi ada di codebase
    - Verifikasi `BookingExtraServiceSyncService` ada dan semua referensi terupdate
    - **HASIL YANG DIHARAPKAN**: Test LULUS (mengkonfirmasi bug penamaan sudah diperbaiki)
    - _Requirements: 2.6, 2.7_

  - [x] 6.4 Verifikasi preservation tests masih lulus
    - **Property 2: Preservation** - Logika Bisnis Service Tidak Berubah
    - **PENTING**: Jalankan ulang test yang SAMA dari task 2 — JANGAN tulis test baru
    - Verifikasi `BookingExtraServiceSyncService::sync()` menghasilkan output identik dengan sebelum rename
    - **HASIL YANG DIHARAPKAN**: Test LULUS (tidak ada regresi, hanya nama yang berubah)
    - _Requirements: 3.5_

- [x] 7. Kelompok E — Hapus routes/test.php

  - [x] 7.1 Hapus file route residual
    - Hapus file `routes/test.php`
    - Konfirmasi file tidak di-load di `bootstrap/app.php` sebelum menghapus (sudah diverifikasi: tidak ada)
    - _Bug_Condition: isBugCondition_E — file route tidak di-load oleh aplikasi dan hanya berisi komentar kosong_
    - _Expected_Behavior: direktori routes/ hanya berisi file route yang aktif di-load_
    - _Preservation: aplikasi tetap memuat semua route aktif tanpa perubahan (Requirements 3.6)_
    - _Requirements: 2.8_

  - [x] 7.2 Verifikasi preservation tests masih lulus
    - **Property 2: Preservation** - Semua Route Aktif Tetap Berfungsi
    - **PENTING**: Jalankan ulang test yang SAMA dari task 2 — JANGAN tulis test baru
    - **HASIL YANG DIHARAPKAN**: Test LULUS (tidak ada regresi)
    - _Requirements: 3.6_

- [x] 8. Kelompok F — Bersihkan dokumentasi markdown salah tempat

  - [x] 8.1 Hapus file markdown dari folder kode
    - Hapus `app/Http/Controllers/README.md` (menyebut "Admin/BookingController.php duplikat" — informasi salah)
    - Hapus `app/Http/Controllers/CONTROLLER_AUDIT.md` (audit Januari 2025, sudah tidak relevan)
    - Hapus `app/Models/README.md` (menyebut model-model sebagai "stub belum diimplementasi" — informasi salah)
    - Hapus `resources/js/pages/README.md` (markdown di dalam folder kode frontend)
    - Hapus `ANALISIS_DAN_REKOMENDASI_INVENTORY_FINANCE_BOOKING.md` (rekomendasi sudah tidak relevan)
    - _Bug_Condition: isBugCondition_F — file .md di dalam folder app/ dan resources/js/ dengan informasi yang salah atau sudah tidak relevan_
    - _Expected_Behavior: folder app/ dan resources/js/ hanya berisi file kode; dokumentasi ada di docs/_
    - _Requirements: 2.9, 2.10, 2.11, 2.12, 2.13_

  - [x] 8.2 Buat docs/CODEBASE_OVERVIEW.md dengan dokumentasi akurat
    - Buat direktori `docs/` jika belum ada
    - Buat `docs/CODEBASE_OVERVIEW.md` dengan konten yang akurat dan terkini:
      - Struktur direktori utama
      - Daftar controller aktif dan route-nya (dengan koreksi: `BookingManagementController`, bukan `BookingController`)
      - Daftar service dan tanggung jawabnya (termasuk `BookingExtraServiceSyncService` setelah rename)
      - Daftar model dan status implementasinya (semua sudah fully implemented)
      - Konvensi penamaan yang digunakan
    - _Requirements: 2.12_

- [x] 9. Checkpoint — Pastikan semua test lulus
  - Jalankan ulang semua exploration test dari task 1 — semua harus LULUS setelah fix
  - Jalankan ulang semua preservation test dari task 2 — semua harus LULUS (tidak ada regresi)
  - Jalankan `php artisan migrate:fresh` dan pastikan tidak ada error
  - Jalankan `php artisan route:list | grep booking` dan pastikan tidak ada duplikasi (kecuali API route yang memang terpisah)
  - Konfirmasi tidak ada file yang seharusnya dihapus masih ada di filesystem
  - Konfirmasi semua referensi ke `BookingServiceSyncService` sudah diganti dengan `BookingExtraServiceSyncService`
  - Tanyakan kepada user jika ada pertanyaan yang muncul
