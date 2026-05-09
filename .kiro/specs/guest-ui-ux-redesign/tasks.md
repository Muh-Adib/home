# Implementation Tasks

## Task Overview

Implementasi redesign UI/UX guest-facing pages Homsjogja secara incremental. Setiap task bersifat independen dan dapat dieksekusi satu per satu tanpa membreak halaman lain.

---

- [x] 1. Glassmorphism Navbar dengan Scroll Behavior
  - [x] 1.1 Tambahkan `scrolled` state dan `useEffect` scroll listener di `guest-layout.tsx`
  - [x] 1.2 Ganti `<header>` statis menjadi `<motion.header>` dengan animasi background transition (transparent → solid) menggunakan Framer Motion `animate` prop
  - [x] 1.3 Implementasikan logika `isTransparent`: transparan saat `!scrolled && variant !== 'minimal'`, solid saat `scrolled || variant === 'minimal'`
  - [x] 1.4 Tambahkan hamburger button dan `mobileMenuOpen` state untuk mobile
  - [x] 1.5 Implementasikan mobile menu dropdown dengan `AnimatePresence` + slide-down animation (`height: 0 → auto`)
  - [x] 1.6 Update mobile bottom nav: tambahkan `pb-[env(safe-area-inset-bottom)]` dan glassmorphism style (`bg-card/90 backdrop-blur-xl`)
  - [x] 1.7 Tulis PHPUnit feature test untuk memverifikasi navbar render dengan variant 'default' dan 'minimal'

- [x] 2. WhatsApp CTA di BookingSidebar
  - [x] 2.1 Buat helper function `buildWhatsAppMessage(propertyName, checkIn?, checkOut?, guests?)` di dalam `BookingSidebar.tsx` yang menghasilkan URL `https://wa.me/628112500082?text=...` dengan pesan pre-filled
  - [x] 2.2 Tambahkan tombol "Chat via WhatsApp" (warna `#25D366`, ikon `MessageCircle`) sebagai secondary CTA di bawah tombol "Book Now" di `BookingSidebar.tsx`
  - [x] 2.3 Pastikan pesan pre-filled berisi nama properti + tanggal + jumlah tamu saat tanggal sudah dipilih, atau hanya nama properti + pertanyaan umum saat tanggal belum dipilih
  - [x] 2.4 Tulis PHPUnit unit test untuk `buildWhatsAppMessage` — verifikasi output URL dengan dan tanpa tanggal

- [x] 3. MobileStickyCtaBar — Floating Action Bar
  - [x] 3.1 Buat komponen baru `resources/js/components/property/MobileStickyCtaBar.tsx` dengan layout: harga per malam di kiri, tombol WhatsApp + Book Now di kanan
  - [x] 3.2 Implementasikan `IntersectionObserver` untuk menyembunyikan bar saat `BookingSidebar` masuk viewport (gunakan `sidebarRef` yang di-pass sebagai prop)
  - [x] 3.3 Tambahkan animasi slide-up saat pertama muncul menggunakan Framer Motion (`initial={{ y: 100 }}`, `animate={{ y: 0 }}`)
  - [x] 3.4 Tambahkan `pb-[env(safe-area-inset-bottom)]` dan `z-40` pada container
  - [x] 3.5 Integrasikan `MobileStickyCtaBar` ke `Properties/Show.tsx` — tambahkan `sidebarRef` pada `BookingSidebar` wrapper div dan pass ke `MobileStickyCtaBar`
  - [x] 3.6 Tulis PHPUnit feature test untuk memverifikasi `Properties/Show.tsx` merender komponen yang diperlukan

- [x] 4. Brand Color Fix — Articles/Index.tsx
  - [x] 4.1 Ganti hero section gradient dari `from-blue-600 to-blue-700` menjadi `from-brand-primary to-brand-primary/80` di `Articles/Index.tsx`
  - [x] 4.2 Ganti semua `text-blue-600` → `text-brand-primary`, `bg-blue-50` → `bg-brand-primary/5`, `bg-blue-100` → `bg-brand-primary/10` di `Articles/Index.tsx`
  - [x] 4.3 Ganti `bg-gray-50` → `bg-background`, `text-gray-900` → `text-foreground`, `text-gray-600` → `text-muted-foreground` di `Articles/Index.tsx`
  - [x] 4.4 Tambahkan hover effect Framer Motion pada Article Card: `whileHover={{ y: -4 }}` dan image scale effect
  - [x] 4.5 Tulis PHPUnit feature test untuk memverifikasi Articles/Index render tanpa error

- [x] 5. Brand Color Fix — Articles/Show.tsx
  - [x] 5.1 Ganti CTA card gradient dari `from-blue-500 to-blue-600` menjadi `from-brand-primary to-brand-primary/80` di `Articles/Show.tsx`
  - [x] 5.2 Ganti semua `text-blue-600` → `text-brand-primary`, `hover:text-blue-600` → `hover:text-brand-primary` di `Articles/Show.tsx`
  - [x] 5.3 Ganti `bg-gray-50` → `bg-background`, `text-gray-900` → `text-foreground`, `text-gray-600` → `text-muted-foreground` di `Articles/Show.tsx`
  - [x] 5.4 Implementasikan Web Share API pada tombol Share: `navigator.share()` dengan fallback `navigator.clipboard.writeText(window.location.href)`
  - [x] 5.5 Tulis PHPUnit feature test untuk memverifikasi Articles/Show render tanpa error

- [x] 6. Brand Color Fix — PropertyCardEnhanced
  - [x] 6.1 Ganti `group-hover:text-blue-600` → `group-hover:text-brand-primary` pada nama properti di `property-card-enhanced.tsx`
  - [x] 6.2 Ganti `text-blue-600` → `text-brand-primary` pada CTA hint "Lihat →" dan elemen lain di `property-card-enhanced.tsx`
  - [x] 6.3 Tulis PHPUnit feature test untuk memverifikasi PropertyCardEnhanced render dengan data properti

- [x] 7. Run All Tests & Verify
  - [x] 7.1 Jalankan `php artisan test --compact` untuk memastikan semua test lama masih passing
  - [x] 7.2 Jalankan `vendor/bin/pint --dirty --format agent` untuk memformat semua PHP file yang dimodifikasi

- [ ] 8. Push to github
  - [ ] 8.1 push to git hub
  - [ ] 8.2 shutdown pc