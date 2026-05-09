# Requirements Document

## Introduction

Redesign UI/UX seluruh halaman guest-facing pada website property/homestay **Homsjogja** (Laravel + Inertia.js v3 + React v19 + Tailwind CSS v4 + Framer Motion). Tujuan utama adalah meningkatkan engagement dan conversion (booking & chat WhatsApp) untuk target user "guest" (wisatawan & keluarga), dengan visual modern, clean, premium, mobile-first, dan tetap mempertahankan brand color existing.

**Halaman yang dicakup:**
1. Landing Page (`/`)
2. Listing Property (`/properties`)
3. Detail Property (`/properties/{slug}`)
4. Artikel (`/articles`)
5. Detail Artikel (`/articles/{slug}`)

**Komponen shared yang dicakup:**
- `GuestLayout` (Navbar + Footer)
- `PropertyCardEnhanced`
- `BookingSidebar`

---

## Glossary

- **Guest_Layout**: Komponen layout wrapper (`resources/js/layouts/guest-layout.tsx`) yang membungkus semua halaman publik, berisi Navbar dan Footer.
- **Navbar**: Header navigasi di dalam `Guest_Layout`.
- **Glassmorphism**: Efek visual kaca — `backdrop-blur` + background semi-transparan + subtle border putih tipis.
- **Sticky_CTA**: Tombol aksi (WhatsApp / Booking) yang tetap terlihat saat user scroll.
- **Property_Card**: Komponen `PropertyCardEnhanced` yang menampilkan ringkasan satu properti.
- **Booking_Sidebar**: Panel samping di halaman detail properti untuk memilih tanggal dan memulai booking.
- **Hero_Section**: Bagian pertama halaman yang terlihat tanpa scroll (above the fold).
- **Brand_Primary**: Warna utama brand existing (CSS variable `--brand-primary`).
- **Brand_Accent**: Warna aksen brand existing (CSS variable `--brand-accent`).
- **WhatsApp_CTA**: Tombol/link yang membuka WhatsApp dengan pesan pre-filled ke nomor utama (`+628112500082`).
- **Framer_Motion**: Library animasi React yang sudah terpasang di project (`framer-motion ^12`).
- **Conversion_Action**: Aksi yang dihitung sebagai konversi — klik "Book Now", klik WhatsApp CTA, atau klik "Lihat Properti".
- **Trust_Signal**: Elemen yang membangun kepercayaan — rating, review, jumlah tamu, verifikasi properti.
- **Scan_Pattern**: Pola membaca F-shape atau Z-shape yang digunakan user untuk memindai konten halaman.
- **Above_The_Fold**: Area halaman yang terlihat tanpa scroll pada viewport standar.
- **Micro_Interaction**: Animasi kecil pada hover, tap, atau state change yang memberikan feedback visual.

---

## Requirements

### Requirement 1: Glassmorphism Navbar dengan Scroll Behavior

**User Story:** Sebagai guest yang mengunjungi website, saya ingin navbar yang terasa premium dan tidak menghalangi konten hero, sehingga pengalaman visual pertama saya terasa modern dan immersive.

#### Acceptance Criteria

1. WHEN halaman pertama kali dimuat dan posisi scroll adalah 0, THE Navbar SHALL menampilkan background transparan dengan `backdrop-blur` aktif dan border bawah tidak terlihat.
2. WHEN user melakukan scroll lebih dari 60px dari atas halaman, THE Navbar SHALL bertransisi ke state "scrolled" dengan background `rgba(255,255,255,0.85)` (light mode) atau `rgba(15,15,15,0.85)` (dark mode), `backdrop-blur-xl`, dan subtle shadow.
3. THE Navbar SHALL menggunakan `position: sticky; top: 0` sehingga selalu terlihat saat scroll.
4. THE Navbar SHALL memiliki container dengan `border-radius: 0` pada mobile dan rounded container (bukan full edge-to-edge) pada desktop dengan padding horizontal yang konsisten.
5. WHEN user berada di halaman non-hero (Properties, Articles, dll), THE Navbar SHALL langsung menampilkan state "scrolled" tanpa efek transparan.
6. THE Navbar SHALL menampilkan transisi scroll menggunakan `Framer_Motion` dengan durasi maksimal 300ms.
7. WHEN viewport width kurang dari 768px, THE Navbar SHALL menampilkan hamburger menu icon.
8. WHEN hamburger menu diklik, THE Navbar SHALL menampilkan mobile menu dengan animasi slide-down menggunakan `Framer_Motion`.
9. THE Navbar SHALL mempertahankan semua link navigasi existing: Properties, Articles, About, dan auth actions.

---

### Requirement 2: Landing Page — Hero Section yang Immersive

**User Story:** Sebagai wisatawan yang baru pertama mengunjungi Homsjogja, saya ingin langsung memahami value proposition dan bisa mulai mencari penginapan tanpa harus scroll, sehingga saya tidak perlu waktu lama untuk memutuskan apakah ini platform yang tepat.

#### Acceptance Criteria

1. THE Hero_Section SHALL menampilkan full-viewport height (`min-h-screen`) dengan slideshow foto properti sebagai background.
2. THE Hero_Section SHALL menampilkan overlay gradient `from-black/60 via-black/40 to-black/70` untuk keterbacaan teks.
3. THE Hero_Section SHALL menampilkan H1 dengan keyword utama "Homestay Jogja" di awal teks, dengan ukuran font minimal `4xl` pada mobile dan `7xl` pada desktop.
4. THE Hero_Section SHALL menampilkan `HeroSearchBar` (date picker + guests) di Above_The_Fold sehingga user bisa langsung mencari tanpa scroll.
5. THE Hero_Section SHALL menampilkan minimal 3 Trust_Signal di bawah search bar: rating, jumlah properti, dan jumlah tamu puas.
6. WHEN halaman dimuat, THE Hero_Section SHALL menjalankan animasi entrance `Framer_Motion` dengan stagger delay antar elemen (badge → H1 → subtitle → search bar → trust signals).
7. THE Hero_Section SHALL menampilkan trust badge di atas H1 dengan glassmorphism style (`bg-white/15 backdrop-blur-md border border-white/30`).
8. WHEN `HeroSearchBar` disubmit, THE Landing_Page SHALL menavigasi ke `/properties` dengan query params `check_in`, `check_out`, dan `guests`.

---

### Requirement 3: Landing Page — Featured Properties Section

**User Story:** Sebagai guest yang baru tiba di landing page, saya ingin melihat pilihan properti terbaik langsung tanpa harus pergi ke halaman listing, sehingga saya bisa langsung tertarik dan mengklik properti yang menarik.

#### Acceptance Criteria

1. THE Featured_Properties_Section SHALL menampilkan maksimal 6 properti unggulan dalam grid responsif: 1 kolom (mobile), 2 kolom (tablet), 3 kolom (desktop).
2. WHEN section masuk viewport, THE Featured_Properties_Section SHALL menjalankan animasi `whileInView` dengan stagger per card menggunakan `Framer_Motion`.
3. THE Featured_Properties_Section SHALL menampilkan section header dengan Badge "Pilihan Terbaik", H2, dan deskripsi.
4. THE Featured_Properties_Section SHALL menampilkan tombol "Jelajahi Semua" yang mengarah ke `/properties`.
5. WHEN tidak ada featured properties, THE Featured_Properties_Section SHALL tidak dirender (conditional rendering).

---

### Requirement 4: Landing Page — Social Proof & Trust Building Sections

**User Story:** Sebagai wisatawan yang belum pernah menggunakan Homsjogja, saya ingin melihat bukti bahwa platform ini terpercaya dan banyak digunakan, sehingga saya merasa aman untuk melakukan booking.

#### Acceptance Criteria

1. THE Stats_Section SHALL menampilkan 4 angka statistik: jumlah properti, jumlah tamu, rating rata-rata, dan ketersediaan support, dengan background `Brand_Primary`.
2. THE Why_Choose_Section SHALL menampilkan minimal 3 keunggulan dengan ikon, judul, dan deskripsi dalam grid 3 kolom.
3. THE Testimonials_Section SHALL menampilkan minimal 3 testimonial tamu dengan nama, lokasi, rating bintang, dan kutipan.
4. THE CTA_Banner_Section SHALL menampilkan tombol utama menuju `/properties` dan tombol sekunder menuju `/register` (untuk guest yang belum login).
5. WHEN user sudah login, THE CTA_Banner_Section SHALL menampilkan hanya satu tombol menuju `/properties`.
6. WHEN setiap section masuk viewport, THE Landing_Page SHALL menjalankan animasi `whileInView` fade-up menggunakan `Framer_Motion`.

---

### Requirement 5: Property Card — Visual & Interaction Redesign

**User Story:** Sebagai guest yang melihat daftar properti, saya ingin setiap card memberikan informasi yang cukup dan terasa premium saat di-hover, sehingga saya bisa dengan cepat memilih properti yang menarik perhatian saya.

#### Acceptance Criteria

1. THE Property_Card SHALL menggunakan `border-radius: 16px` (rounded-2xl) pada container utama.
2. THE Property_Card SHALL menampilkan gambar dengan aspect ratio `4:3` dan efek `scale-105` pada hover dengan transisi smooth 400ms.
3. THE Property_Card SHALL menampilkan badge lokasi, badge featured (jika ada), dan badge diskon di atas gambar.
4. THE Property_Card SHALL menampilkan rating bintang di pojok kiri bawah gambar dengan glassmorphism style.
5. THE Property_Card SHALL menampilkan tombol heart (favorit) yang muncul saat hover di pojok kanan bawah gambar.
6. WHEN Property_Card di-hover, THE Property_Card SHALL menjalankan animasi `y: -4` (lift effect) menggunakan `Framer_Motion`.
7. THE Property_Card SHALL menampilkan harga per malam dengan harga coret (inflated 17%) dan persentase diskon.
8. THE Property_Card SHALL menampilkan stats kamar tidur, kamar mandi, dan kapasitas tamu dalam grid 3 kolom.
9. THE Property_Card SHALL menampilkan maksimal 4 amenity badge di bawah stats.
10. WHEN gambar gagal dimuat, THE Property_Card SHALL menampilkan placeholder dengan ikon `Building2`.

---

### Requirement 6: Halaman Listing Property — Filter & Search UX

**User Story:** Sebagai wisatawan yang mencari penginapan, saya ingin bisa memfilter properti dengan cepat berdasarkan tanggal, jumlah tamu, dan fasilitas, sehingga saya tidak perlu melihat properti yang tidak relevan.

#### Acceptance Criteria

1. THE Properties_Index_Page SHALL menampilkan search bar dengan input teks, date range picker, dan sort selector dalam satu baris pada desktop.
2. THE Properties_Index_Page SHALL menampilkan tombol "Filter" yang membuka panel filter advanced (amenities, guests).
3. WHEN filter panel terbuka, THE Properties_Index_Page SHALL menampilkan filter amenities per kategori dengan checkbox.
4. WHEN tanggal check-in dan check-out dipilih, THE Properties_Index_Page SHALL otomatis menjalankan search.
5. THE Properties_Index_Page SHALL menampilkan jumlah total properti yang ditemukan.
6. THE Properties_Index_Page SHALL menampilkan grid properti: 2 kolom (mobile), 2 kolom (tablet), 3 kolom (desktop), 4 kolom (large desktop).
7. WHEN tidak ada properti yang ditemukan, THE Properties_Index_Page SHALL menampilkan empty state dengan ikon, pesan, dan tombol "Reset Filter".
8. WHEN ada lebih dari satu halaman, THE Properties_Index_Page SHALL menampilkan pagination dengan tombol Previous dan Next.
9. THE Properties_Index_Page SHALL mempertahankan filter state saat user kembali dari halaman detail (menggunakan URL params).

---

### Requirement 7: Halaman Detail Property — Layout & Information Architecture

**User Story:** Sebagai wisatawan yang tertarik dengan sebuah properti, saya ingin melihat semua informasi penting (foto, fasilitas, lokasi, harga) dalam satu halaman yang mudah dipindai, sehingga saya bisa membuat keputusan booking dengan cepat.

#### Acceptance Criteria

1. THE Property_Show_Page SHALL menampilkan galeri foto di bagian atas dengan navigasi thumbnail atau swipe pada mobile.
2. THE Property_Show_Page SHALL menggunakan layout 2-kolom pada desktop: konten utama (2/3) dan `Booking_Sidebar` (1/3).
3. THE Property_Show_Page SHALL menggunakan layout 1-kolom pada mobile dengan `Booking_Sidebar` di bawah konten.
4. THE Property_Show_Page SHALL menampilkan nama properti, lokasi, rating, dan kapasitas di atas galeri foto.
5. THE Property_Show_Page SHALL menampilkan tabs untuk: Overview, Fasilitas, Lokasi, dan Kebijakan.
6. THE Property_Show_Page SHALL menampilkan properti serupa di bagian bawah halaman.
7. WHEN viewport mobile, THE Property_Show_Page SHALL menampilkan Sticky_CTA bar di bagian bawah layar dengan tombol "Chat WhatsApp" dan harga per malam.

---

### Requirement 8: Booking Sidebar — WhatsApp CTA sebagai Primary Action

**User Story:** Sebagai wisatawan yang sudah memilih tanggal dan ingin memesan, saya ingin ada opsi untuk langsung chat via WhatsApp selain booking online, sehingga saya bisa bertanya dulu sebelum memutuskan.

#### Acceptance Criteria

1. THE Booking_Sidebar SHALL menampilkan tombol "Chat via WhatsApp" sebagai secondary CTA di bawah tombol "Book Now".
2. WHEN tombol "Chat via WhatsApp" diklik, THE Booking_Sidebar SHALL membuka WhatsApp dengan URL `https://wa.me/628112500082` dan pesan pre-filled yang berisi nama properti, tanggal check-in, check-out, dan jumlah tamu.
3. THE WhatsApp_CTA SHALL menggunakan warna hijau WhatsApp (`#25D366`) dengan ikon WhatsApp.
4. WHEN tanggal belum dipilih, THE WhatsApp_CTA pesan pre-filled SHALL hanya berisi nama properti dan pertanyaan umum.
5. THE Booking_Sidebar SHALL menampilkan harga per malam di header sidebar sebelum tanggal dipilih.
6. THE Booking_Sidebar SHALL menampilkan breakdown harga (harga/malam × jumlah malam + diskon) setelah tanggal dipilih.
7. WHEN properti tidak tersedia pada tanggal yang dipilih, THE Booking_Sidebar SHALL menampilkan pesan error yang jelas dan saran untuk memilih tanggal lain.

---

### Requirement 9: Mobile Sticky CTA — Floating Action Bar

**User Story:** Sebagai wisatawan yang browsing di smartphone, saya ingin tombol booking dan WhatsApp selalu terlihat tanpa harus scroll ke atas atau ke bawah, sehingga saya bisa langsung mengambil aksi kapan saja.

#### Acceptance Criteria

1. WHILE viewport width kurang dari 768px DAN user berada di halaman detail properti, THE Sticky_CTA SHALL ditampilkan sebagai bar fixed di bagian bawah layar.
2. THE Sticky_CTA SHALL menampilkan harga per malam di sisi kiri dan dua tombol (WhatsApp + Book Now) di sisi kanan.
3. THE Sticky_CTA SHALL menggunakan `z-index` yang lebih tinggi dari konten halaman namun tidak menghalangi mobile bottom navigation.
4. THE Sticky_CTA SHALL memiliki padding bottom yang menyesuaikan safe area pada iPhone (menggunakan `env(safe-area-inset-bottom)`).
5. WHEN Booking_Sidebar terlihat di viewport (user scroll ke area sidebar), THE Sticky_CTA SHALL disembunyikan untuk menghindari duplikasi.
6. THE Sticky_CTA SHALL menggunakan animasi slide-up saat pertama kali muncul menggunakan `Framer_Motion`.

---

### Requirement 10: Halaman Artikel — Redesign Visual

**User Story:** Sebagai wisatawan yang mencari inspirasi perjalanan, saya ingin halaman artikel terasa seperti travel magazine yang premium, sehingga saya betah membaca dan lebih percaya pada konten yang disajikan.

#### Acceptance Criteria

1. THE Articles_Index_Page SHALL menampilkan hero section dengan gradient brand color (bukan hardcoded `blue-600`), H1, deskripsi, dan search bar.
2. THE Articles_Index_Page SHALL menampilkan grid artikel: 1 kolom (mobile), 2 kolom (tablet), 3 kolom (desktop).
3. THE Article_Card SHALL menampilkan featured image dengan aspect ratio `16:9`, judul, excerpt, tanggal, dan view count.
4. WHEN Article_Card di-hover, THE Article_Card SHALL menampilkan efek scale pada gambar dan perubahan warna judul ke `Brand_Primary`.
5. THE Articles_Index_Page SHALL menggunakan brand color yang konsisten (bukan `blue-600` hardcoded) untuk semua elemen UI.
6. THE Articles_Index_Page SHALL menampilkan empty state yang konsisten dengan halaman lain saat tidak ada artikel.

---

### Requirement 11: Halaman Detail Artikel — Reading Experience & Conversion

**User Story:** Sebagai pembaca artikel, saya ingin pengalaman membaca yang nyaman dan ada CTA yang relevan untuk melihat properti, sehingga setelah membaca saya termotivasi untuk langsung mencari penginapan.

#### Acceptance Criteria

1. THE Article_Show_Page SHALL menampilkan hero section dengan featured image full-width, overlay gradient, dan metadata artikel (penulis, tanggal, views).
2. THE Article_Show_Page SHALL menggunakan layout 2-kolom pada desktop: konten artikel (2/3) dan sidebar (1/3).
3. THE Article_Show_Page SHALL menampilkan sidebar dengan: daftar properti terkait (jika ada) dan CTA card "Cari Penginapan di Jogja".
4. THE Article_Show_Page SHALL menggunakan brand color yang konsisten (bukan `blue-600` hardcoded) untuk semua elemen UI.
5. THE CTA_Card_Artikel SHALL menggunakan `Brand_Primary` sebagai background gradient (bukan `blue-500` hardcoded).
6. THE Article_Show_Page SHALL menampilkan artikel terkait di bagian bawah konten utama.
7. WHEN user klik tombol Share, THE Article_Show_Page SHALL membuka Web Share API (jika tersedia) atau fallback ke copy URL.

---

### Requirement 12: Footer — Konsistensi & Completeness

**User Story:** Sebagai guest yang sudah selesai menjelajahi halaman, saya ingin footer yang informatif dan mudah dinavigasi, sehingga saya bisa menemukan informasi kontak atau halaman lain dengan cepat.

#### Acceptance Criteria

1. THE Footer SHALL menampilkan 4 kolom: Company Info, Quick Links, Legal, dan Contact.
2. THE Footer SHALL menampilkan nomor WhatsApp yang bisa diklik langsung (`tel:` dan `wa.me` link).
3. THE Footer SHALL menggunakan `Brand_Primary` sebagai warna teks heading kolom.
4. THE Footer SHALL menampilkan copyright notice di bagian bawah.
5. THE Footer SHALL responsif: 1 kolom pada mobile, 2 kolom pada tablet, 4 kolom pada desktop.
6. THE Footer SHALL mempertahankan semua link existing: About, Properties, Articles, Support, FAQ, dan semua halaman Legal.

---

### Requirement 13: Animasi & Micro Interaction — Framer Motion

**User Story:** Sebagai guest yang menggunakan website, saya ingin interaksi yang terasa responsif dan halus, sehingga website terasa premium dan modern tanpa terasa lambat.

#### Acceptance Criteria

1. THE Guest_Layout SHALL menggunakan `Framer_Motion` `AnimatePresence` untuk page transition antar halaman.
2. WHEN elemen masuk viewport, THE Page SHALL menjalankan animasi `whileInView` dengan `initial={{ opacity: 0, y: 24 }}` dan `animate={{ opacity: 1, y: 0 }}` dengan `viewport={{ once: true }}`.
3. WHEN button di-hover, THE Button SHALL menjalankan `whileHover={{ scale: 1.02 }}` dengan durasi maksimal 200ms.
4. WHEN card di-hover, THE Card SHALL menjalankan `whileHover={{ y: -4 }}` dengan durasi maksimal 250ms.
5. THE Page SHALL menggunakan `staggerChildren` dengan delay maksimal 0.1s per elemen untuk animasi list/grid.
6. IF animasi menyebabkan layout shift atau performa buruk (FPS < 30), THEN THE Page SHALL menonaktifkan animasi tersebut dan menggunakan CSS transition sebagai fallback.
7. THE Page SHALL menghormati `prefers-reduced-motion` media query — WHEN user mengaktifkan reduced motion, THE Page SHALL menonaktifkan semua animasi `Framer_Motion`.

---

### Requirement 14: Mobile-First & Performance

**User Story:** Sebagai wisatawan yang menggunakan smartphone untuk mencari penginapan, saya ingin website yang cepat dimuat dan mudah dioperasikan dengan jempol, sehingga saya tidak frustrasi dan langsung meninggalkan halaman.

#### Acceptance Criteria

1. THE Guest_Layout SHALL menggunakan mobile bottom navigation bar yang fixed di bawah layar pada viewport < 768px.
2. THE Mobile_Bottom_Nav SHALL menampilkan maksimal 4 item navigasi dengan ikon dan label singkat.
3. THE Mobile_Bottom_Nav SHALL memiliki padding bottom yang menyesuaikan safe area iPhone.
4. THE Page SHALL menggunakan `loading="lazy"` untuk semua gambar yang tidak berada di Above_The_Fold.
5. THE Property_Card SHALL menggunakan `loading="eager"` dan `fetchPriority="high"` untuk 2 card pertama di halaman listing.
6. THE Page SHALL menggunakan komponen yang sudah ada (`PropertyCardEnhanced`, `DateRange`, dll) dan tidak menduplikasi logika.
7. WHEN koneksi lambat, THE Property_Card SHALL menampilkan skeleton loader sebelum gambar dimuat.
8. THE Guest_Layout SHALL memiliki `pb-16 md:pb-0` pada main content untuk menghindari konten tertutup mobile bottom nav.

---

### Requirement 15: Brand Consistency & Design Tokens

**User Story:** Sebagai tim Homsjogja, saya ingin semua halaman menggunakan warna dan style yang konsisten, sehingga brand identity terjaga dan tidak ada halaman yang terlihat "out of place".

#### Acceptance Criteria

1. THE Page SHALL menggunakan CSS variables `--brand-primary`, `--brand-accent`, `--brand-secondary` untuk semua warna brand, bukan hardcoded hex atau Tailwind color class seperti `blue-600`.
2. THE Page SHALL menggunakan `border-radius` yang konsisten: `rounded-xl` (12px) untuk card kecil, `rounded-2xl` (16px) untuk card besar, `rounded-3xl` (24px) untuk modal/panel.
3. THE Page SHALL menggunakan shadow yang konsisten: `shadow-sm` untuk card default, `shadow-md` untuk card hover, `shadow-xl` untuk modal/sidebar.
4. THE Page SHALL menggunakan typography scale yang konsisten: `text-sm` untuk metadata, `text-base` untuk body, `text-xl`/`text-2xl` untuk subheading, `text-3xl`/`text-4xl`/`text-5xl` untuk heading.
5. IF halaman menggunakan warna hardcoded yang tidak sesuai brand (contoh: `blue-600`, `blue-500`, `gray-50` sebagai background utama), THEN THE Page SHALL diganti dengan CSS variable atau Tailwind class yang sesuai brand.
6. THE Page SHALL menggunakan `bg-background` dan `text-foreground` dari Tailwind/shadcn untuk mendukung dark mode.
