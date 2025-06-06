# Functional Requirements Document (FRD)

## 1. Pendahuluan

### 1.1 Latar Belakang

Manajemen properti seperti homestay dan villa menghadapi tantangan dalam mengelola pemesanan, harga musiman, keuangan, serta operasional sehari-hari. Oleh karena itu, dibutuhkan sebuah sistem manajemen properti (Property Management System) yang mampu menangani banyak unit dan properti dalam satu platform terintegrasi.

### 1.2 Tujuan Dokumen

Dokumen ini bertujuan untuk mendeskripsikan kebutuhan fungsional dari sistem aplikasi manajemen multi-homestay/villa yang akan dibangun.

### 1.3 Ruang Lingkup

Aplikasi akan mencakup fitur manajemen properti, dynamic pricing, integrasi OTA, keuangan, operasional staf, komunikasi tamu, layanan tambahan seperti extra bed, dan manajemen inventaris.

### 1.4 Definisi Istilah

* **OTA**: Online Travel Agent
* **PMS**: Property Management System
* **ADR**: Average Daily Rate

## 2. Tujuan Sistem

Sistem ini akan membantu pengguna:

1. Mengelola banyak unit properti dari satu dashboard.
2. Menentukan harga dinamis berdasarkan musim dan sumber pemesanan.
3. Mencatat pemasukan dan pengeluaran per unit.
4. Menyediakan laporan okupansi dan pendapatan.
5. Menyinkronkan harga dan ketersediaan dengan OTA.
6. Mengatur staf untuk kebersihan dan perawatan.
7. Menyediakan layanan tambahan seperti extra bed.
8. Mengelola stok barang kebutuhan operasional unit.

## 3. Peran Pengguna (User Roles)

| Role    | Deskripsi                                                             |
| ------- | --------------------------------------------------------------------- |
| Admin   | Memiliki akses penuh ke seluruh sistem.                               |
| Manajer | Mengakses keuangan, laporan, dan mengelola staf.                      |
| Staf    | Menerima dan menyelesaikan tugas cleaning dan maintenance.            |
| Tamu    | Melakukan pemesanan, memilih layanan tambahan, dan memberikan review. |

## 4. Fitur Sistem

### 4.1 Manajemen Properti

* Tambah/edit/hapus unit properti.
* Data: nama, tipe, lokasi, kapasitas, harga, fasilitas, foto.
* Aktif/nonaktifkan unit.

### 4.2 Dynamic Pricing

* Menentukan harga berdasarkan:

  * Hari Normal
  * Weekend
  * High Season
  * Peak Season
  * Event Lokal
* Pengaturan harga melalui kalender.

### 4.3 Harga Berdasarkan Sumber Booking

* Harga berbeda untuk:

  * Direct Booking
  * OTA (Booking.com, Traveloka, Tiket.com)
* Input harga masing-masing saat setup kalender harga.

### 4.4 Sinkronisasi OTA

* Sinkronisasi harga & ketersediaan melalui channel manager.
* Auto-update bila ada perubahan di sistem.
* Penarikan data reservasi dari OTA.

### 4.5 Pemesanan & Extra Bed

* Form pemesanan langsung oleh tamu.
* Pilihan layanan tambahan: Extra Bed (harga/unit berbeda).
* Total harga otomatis dihitung.
* Notifikasi ke staf saat extra bed dipesan.

### 4.6 Manajemen Keuangan

* Input pemasukan & pengeluaran per unit.
* Kategori:

  * Kas besar (operasional utama)
  * Kas kecil (pengeluaran harian unit)
* Laporan keuangan per unit & agregat.

### 4.7 Laporan & Dashboard

* Laporan pendapatan per unit.
* Okupansi & ADR.
* Biaya operasional & laba bersih.
* Laporan transaksi layanan tambahan.

### 4.8 Manajemen Staf & Operasional

* Jadwal tugas harian staf (cleaning, maintenance).
* Notifikasi otomatis ke staf.
* Form laporan pekerjaan selesai.

### 4.9 Manajemen Inventaris

* Tambah/edit/hapus item inventaris (galon, sabun, kopi, dll).
* Pencatatan jumlah stok awal dan stok masuk.
* Fitur pengambilan stok oleh staf:

  * Staf memilih item yang akan diambil.
  * Menentukan jumlah dan unit tujuan (Unit A, B, C, dll).
  * Sistem mencatat siapa yang mengambil, kapan, dan untuk unit mana.
  * Admin dapat melihat histori pengambilan dan stok sisa.
* Pengingat otomatis saat stok hampir habis.

### 4.10 Komunikasi & Review Tamu

* Komunikasi tamu dengan admin.
* Pengingat check-in/out.
* Form review pasca-menginap.

## 5. Alur Pengguna

### 5.1 Alur Pemesanan (Direct/OTA)

1. Tamu pilih unit & tanggal.
2. Tamu pilih layanan tambahan (jika ada).
3. Sistem hitung harga (termasuk extra bed).
4. Pembayaran dilakukan.
5. Sistem kirim notifikasi ke staf.
6. Sistem catat data untuk laporan.

### 5.2 Alur Tugas Staf

1. Admin atur jadwal tugas.
2. Staf terima notifikasi.
3. Staf lapor tugas selesai melalui sistem.

### 5.3 Alur Inventaris

1. Admin input atau update stok barang.
2. Staf login untuk mengambil barang.
3. Staf memilih barang, jumlah, dan tujuan unit.
4. Sistem catat log pengambilan (siapa, kapan, untuk unit mana).
5. Admin monitor histori dan stok tersisa.

## 6. Integrasi & Teknologi

* **Platform**: Web & Mobile (Android/iOS)
* **Framework**: Laravel 12 + React (Inertia.js)
* **Database**: MySQL/PostgreSQL
* **Notifikasi**: WhatsApp, Email, Push Notification
* **Channel Manager**: Untuk sinkronisasi OTA
* **Cloud**: VPS untuk hosting dan file storage

## 7. Use Case Utama

1. Kelola Properti
2. Atur Harga Dinamis
3. Atur Harga Direct vs OTA
4. Sinkronisasi OTA
5. Proses Pemesanan (dengan/ tanpa extra bed)
6. Input Data Keuangan
7. Generate Laporan
8. Penjadwalan Tugas Staf
9. Komunikasi Tamu
10. Review Tamu
11. Manajemen & Pengambilan Inventaris

## 8. Non-Functional Requirements

* Respon sistem < 2 detik untuk operasi umum.
* Kapasitas minimal 500 unit aktif sekaligus.
* Keamanan login menggunakan OTP atau 2FA.
* Backup harian otomatis.

## 9. Risiko & Pertimbangan

* Kegagalan sinkronisasi dengan OTA.
* Fluktuasi harga musiman perlu validasi manual.
* Pengelolaan data keuangan harus audit-ready.
* Kesalahan dalam pencatatan stok bisa mengganggu operasional.

---

Dokumen ini bersifat dinamis dan akan diperbarui seiring perkembangan kebutuhan dan implementasi sistem.
