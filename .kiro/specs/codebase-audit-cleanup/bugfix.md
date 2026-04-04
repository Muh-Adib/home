# Bugfix Requirements Document

## Introduction

Dokumen ini mendokumentasikan temuan audit codebase aplikasi **Homsjogja** (Property Management System berbasis Laravel 12 + React/Inertia.js). Audit menemukan sejumlah masalah teknis yang bukan fitur baru, melainkan kondisi cacat yang perlu diperbaiki: duplikasi timestamp migration yang berpotensi menyebabkan race condition saat `migrate:fresh`, route duplikat yang mengarah ke controller yang sama, file residual yang tidak terpakai, controller yang tidak di-route, penamaan service yang membingungkan, dan dokumentasi markdown yang salah tempat di dalam folder kode.

Semua masalah dikelompokkan berdasarkan tingkat kritis dan diverifikasi langsung dari kode.

---

## Bug Analysis

### Current Behavior (Defect)

#### Kelompok A — Kritis: Integritas Database

1.1 WHEN perintah `php artisan migrate:fresh` dijalankan THEN sistem mengalami race condition atau error karena dua file migration memiliki timestamp yang identik (`2025_10_30_000004`): `alter_payment_methods_add_wallet_id.php` dan `alter_property_expenses_property_id_nullable.php`, sehingga urutan eksekusi tidak deterministik.

1.2 WHEN Laravel memuat daftar migration dari filesystem THEN sistem tidak dapat menjamin urutan eksekusi yang benar antara kedua migration `000004` karena nama file yang ambigu, berpotensi menyebabkan foreign key constraint error pada tabel `payment_methods` atau `property_expenses`.

#### Kelompok B — Tinggi: Route Duplikat

1.3 WHEN developer atau frontend mengakses fitur booking admin THEN sistem memiliki dua set route yang mengarah ke controller yang sama (`BookingManagementController`): prefix `admin/bookings/*` dengan nama `admin.bookings.*` dan prefix `admin/booking-management/*` dengan nama `admin.booking-management.*`, menyebabkan kebingungan tentang endpoint mana yang canonical dan route table yang membengkak.

1.4 WHEN `php artisan route:list` dijalankan THEN sistem menampilkan entri route duplikat untuk operasi yang sama (index, create, store, show, edit, update) dengan nama berbeda, sehingga developer tidak dapat menentukan nama route yang benar untuk digunakan di frontend.

#### Kelompok C — Sedang: Controller Tidak Di-Route (Dead Code)

1.5 WHEN aplikasi berjalan THEN `app/Http/Controllers/Admin/BookingImportPreviewController.php` tidak terdaftar di route manapun (tidak ada di `routes/admin.php`, `routes/web.php`, maupun `routes/staff.php`), sementara fungsionalitas yang sama sudah tersedia melalui `BookingManagementController@importPreview` di route `admin.bookings.import.preview`.

1.6 WHEN developer baru membaca struktur controller THEN mereka menemukan `BookingImportPreviewController` sebagai controller aktif yang terpisah, padahal controller ini adalah dead code yang tidak pernah dipanggil oleh sistem.

#### Kelompok D — Sedang: Penamaan Service Membingungkan

1.7 WHEN developer membaca daftar service di `app/Services/` THEN nama `BookingServiceSyncService` menyebabkan ambiguitas karena menggabungkan dua konsep: "BookingService" (nama class lain yang sudah ada) dan "SyncService", sehingga tidak jelas apakah ini service untuk sync `BookingService` atau service untuk sync booking-services (extra services pada booking).

1.8 WHEN developer menelusuri dependency injection di `BookingManagementController` THEN mereka menemukan tiga service dengan nama mirip: `BookingService` (guest booking creation), `AdminBookingService` (admin booking creation), dan `BookingServiceSyncService` (sync extra services), tanpa konvensi penamaan yang konsisten.

#### Kelompok E — Rendah: File Residual Tidak Terpakai

1.9 WHEN `bootstrap/app.php` memuat route files THEN file `routes/test.php` tidak di-load (hanya `admin.php`, `user.php`, `staff.php` yang di-load), namun file tersebut tetap ada di direktori `routes/` dengan isi hanya komentar kosong, menjadi noise dalam codebase.

#### Kelompok F — Rendah: Dokumentasi Markdown Salah Tempat

1.10 WHEN developer membuka folder `app/Http/Controllers/` di IDE THEN mereka menemukan file `README.md` dan `CONTROLLER_AUDIT.md` bercampur dengan file PHP controller, melanggar konvensi bahwa folder `app/` hanya berisi kode aplikasi.

1.11 WHEN developer membaca `app/Http/Controllers/README.md` THEN dokumen tersebut menyebut "Admin/BookingController.php duplikat" padahal yang ada adalah `BookingManagementController.php` dengan fungsi berbeda — informasi ini salah dan menyesatkan.

1.12 WHEN developer membaca `app/Models/README.md` THEN dokumen tersebut menyebut `BookingGuest`, `BookingWorkflow`, `BookingService`, dan `FinancialReport` sebagai "stub models belum diimplementasi", padahal semua model tersebut sudah fully implemented.

1.13 WHEN developer membaca `app/Http/Controllers/CONTROLLER_AUDIT.md` THEN dokumen tersebut menampilkan audit lama (Januari 2025) yang tidak mencerminkan kondisi aktual codebase, berpotensi menyesatkan keputusan teknis.

1.14 WHEN developer membaca `ANALISIS_DAN_REKOMENDASI_INVENTORY_FINANCE_BOOKING.md` di root project THEN dokumen tersebut menyebut "migration timestamp salah" padahal file yang dimaksud (`2025_10_30_000009_add_expense_id_to_inventory_usages_table.php`) sudah diperbaiki, sehingga rekomendasi ini sudah tidak relevan.

---

### Expected Behavior (Correct)

#### Kelompok A — Kritis: Integritas Database

2.1 WHEN perintah `php artisan migrate:fresh` dijalankan THEN sistem SHALL mengeksekusi semua migration dalam urutan yang deterministik dan konsisten, tanpa race condition, karena setiap file migration memiliki timestamp yang unik.

2.2 WHEN Laravel memuat daftar migration THEN sistem SHALL mengurutkan migration secara deterministik berdasarkan nama file, dengan `alter_payment_methods_add_wallet_id` mendapat timestamp `000004` dan `alter_property_expenses_property_id_nullable` mendapat timestamp `000005` (atau urutan lain yang tidak konflik dengan file `000005` yang sudah ada).

#### Kelompok B — Tinggi: Route Duplikat

2.3 WHEN developer mengakses fitur booking admin THEN sistem SHALL memiliki satu set route canonical untuk `BookingManagementController` dengan prefix dan nama yang konsisten, menghilangkan duplikasi antara `admin.bookings.*` dan `admin.booking-management.*`.

2.4 WHEN `php artisan route:list` dijalankan THEN sistem SHALL menampilkan setiap operasi booking admin tepat satu kali, tanpa entri duplikat untuk operasi yang sama.

#### Kelompok C — Sedang: Controller Tidak Di-Route

2.5 WHEN developer menelusuri struktur controller THEN sistem SHALL tidak memiliki controller yang tidak di-route; `BookingImportPreviewController.php` SHALL dihapus karena fungsionalitasnya sudah tersedia di `BookingManagementController`.

#### Kelompok D — Sedang: Penamaan Service

2.6 WHEN developer membaca daftar service di `app/Services/` THEN nama `BookingServiceSyncService` SHALL diganti menjadi nama yang deskriptif dan tidak ambigu, seperti `BookingExtraServiceSyncService` atau `ExtraServiceSyncService`, yang secara jelas menggambarkan fungsinya (sync extra services pada booking).

2.7 WHEN developer menelusuri dependency injection THEN semua referensi ke `BookingServiceSyncService` (di `BookingManagementController` dan tempat lain) SHALL diperbarui mengikuti nama baru.

#### Kelompok E — Rendah: File Residual

2.8 WHEN developer melihat direktori `routes/` THEN sistem SHALL tidak memiliki file route yang tidak di-load oleh aplikasi; `routes/test.php` SHALL dihapus.

#### Kelompok F — Rendah: Dokumentasi Markdown

2.9 WHEN developer membuka folder `app/Http/Controllers/` THEN folder tersebut SHALL hanya berisi file PHP; semua file markdown (`README.md`, `CONTROLLER_AUDIT.md`) SHALL dipindahkan ke direktori `docs/` di root project atau dihapus jika sudah tidak relevan.

2.10 WHEN developer membuka folder `app/Models/` THEN folder tersebut SHALL hanya berisi file PHP; `README.md` SHALL dipindahkan ke `docs/` atau dihapus.

2.11 WHEN developer membuka folder `resources/js/pages/` THEN folder tersebut SHALL hanya berisi file TypeScript/TSX; `README.md` SHALL dipindahkan ke `docs/` atau dihapus.

2.12 WHEN developer membaca dokumentasi di `docs/` THEN semua dokumen SHALL mencerminkan kondisi aktual codebase, termasuk koreksi referensi yang salah tentang `BookingController` vs `BookingManagementController` dan status implementasi models.

2.13 WHEN developer membaca `ANALISIS_DAN_REKOMENDASI_INVENTORY_FINANCE_BOOKING.md` THEN dokumen tersebut SHALL diperbarui atau dihapus untuk menghilangkan rekomendasi yang sudah tidak relevan.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN admin mengakses halaman daftar booking (`/admin/bookings`) THEN sistem SHALL CONTINUE TO menampilkan daftar booking dengan filter dan pagination yang berfungsi normal.

3.2 WHEN admin melakukan operasi booking (verify, reject, cancel, checkin, checkout) THEN sistem SHALL CONTINUE TO memproses operasi tersebut dengan benar dan mengirim notifikasi yang sesuai.

3.3 WHEN admin mengakses fitur import booking (preview dan confirmed) THEN sistem SHALL CONTINUE TO memproses file Excel dan menampilkan preview perubahan dengan benar.

3.4 WHEN `php artisan migrate` dijalankan pada database yang sudah ada (bukan fresh) THEN sistem SHALL CONTINUE TO berjalan normal tanpa error, karena migration yang sudah dieksekusi tidak dijalankan ulang.

3.5 WHEN semua fitur yang menggunakan `BookingServiceSyncService` dijalankan (sync extra services pada booking) THEN sistem SHALL CONTINUE TO berfungsi identik setelah rename, karena hanya nama class dan referensinya yang berubah, bukan logika bisnis.

3.6 WHEN aplikasi di-deploy ke production THEN sistem SHALL CONTINUE TO memuat semua route yang aktif (`admin.php`, `user.php`, `staff.php`) tanpa perubahan perilaku, karena `routes/test.php` memang tidak pernah di-load.

3.7 WHEN policies digunakan di controller yang sudah mengimplementasikannya (`BookingManagementController`, `PropertyManagementController`, `PaymentController`, `ExtraServiceController`, dll.) THEN sistem SHALL CONTINUE TO meng-enforce authorization dengan benar tanpa perubahan.

3.8 WHEN frontend menggunakan named routes untuk navigasi THEN sistem SHALL CONTINUE TO me-resolve semua named route yang saat ini digunakan, sehingga tidak ada broken link setelah konsolidasi route duplikat.
