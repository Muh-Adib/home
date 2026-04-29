# Requirements Document

## Introduction

Fitur ini mencakup redesign UI/UX menyeluruh pada admin panel yang dibangun dengan Laravel 13 + Inertia.js v3 + React 19 + Tailwind CSS v4. Tujuan utama adalah menghadirkan tampilan yang lebih fresh, bersih, dan efisien untuk meningkatkan produktivitas setiap user role (super_admin, property_owner, property_manager, front_desk, finance, housekeeping).

Perbaikan mencakup enam area: (1) perbaikan state management sidebar agar toggle desktop dan mobile tidak konflik, (2) audit dan perbaikan NavLink agar semua path navigasi sesuai dengan named routes yang ada di `routes/admin.php`, (3) perbaikan navbar header agar menampilkan branding yang konsisten di semua ukuran layar, (4) audit konsistensi penggunaan custom Tailwind class (`brand-primary`, `brand-background`, dll.), (5) desain visual yang lebih modern dan bersih dengan visual hierarchy yang jelas per role, dan (6) konsistensi mobile sidebar dengan desktop.

File utama yang terpengaruh: `resources/js/layouts/admin-layout.tsx`

---

## Glossary

- **AdminLayout**: Komponen React utama di `resources/js/layouts/admin-layout.tsx` yang membungkus semua halaman admin.
- **AdminSidebarNav**: Sub-komponen yang merender daftar navigasi di sidebar desktop.
- **AdminSidebarFooter**: Sub-komponen yang merender user menu, language switcher, dan appearance toggle di bagian bawah sidebar.
- **AdminSidebarContent**: Sub-komponen yang digunakan di dalam mobile Sheet sidebar.
- **Desktop Sidebar**: Sidebar yang tampil di layar `lg` ke atas, collapsible antara lebar `w-64` (expanded) dan `w-16` (collapsed).
- **Mobile Sidebar**: Sidebar yang tampil menggunakan komponen `Sheet` dari shadcn/ui, hanya pada layar di bawah `lg`.
- **sidebarCollapsed**: State boolean yang mengontrol apakah Desktop Sidebar dalam kondisi collapsed (`w-16`) atau expanded (`w-64`).
- **sidebarOpen**: State boolean yang mengontrol apakah Mobile Sidebar (Sheet) terbuka atau tertutup.
- **NavLink**: Elemen navigasi (`<Link>` dari Inertia) yang mengarahkan user ke halaman tertentu.
- **Named Route**: Route Laravel yang memiliki nama (misal `admin.dashboard`) dan dapat di-resolve dengan helper `route()`.
- **Orphan NavLink**: NavLink yang mengarah ke path yang tidak memiliki named route di `routes/admin.php`.
- **brand-primary**: Custom Tailwind CSS color token yang merepresentasikan warna utama brand.
- **brand-background**: Custom Tailwind CSS color token untuk warna latar belakang konten utama.
- **brand-primary-20**: Custom Tailwind CSS color token untuk varian transparan 20% dari `brand-primary`.
- **brand-primary-dark**: Custom Tailwind CSS color token untuk varian gelap dari `brand-primary`.
- **brand-accent**: Custom Tailwind CSS color token untuk warna aksen badge/highlight.
- **Ziggy**: Package `tightenco/ziggy` v2 yang menyediakan helper `route()` di sisi React/TypeScript.
- **Sheet**: Komponen drawer/panel dari shadcn/ui yang digunakan sebagai Mobile Sidebar.
- **TooltipProvider**: Komponen dari shadcn/ui yang membungkus tooltip di sidebar collapsed.

---

## Requirements

### Requirement 1: Perbaikan State Management Sidebar (Toggle Conflict Fix)

**User Story:** Sebagai admin, saya ingin toggle sidebar bekerja dengan benar tanpa konflik antara mobile dan desktop, sehingga saya dapat membuka/menutup sidebar di semua ukuran layar tanpa bug.

#### Acceptance Criteria

1. THE `AdminLayout` SHALL mengelola `sidebarOpen` dan `sidebarCollapsed` sebagai dua state yang sepenuhnya independen — `sidebarOpen` hanya mengontrol Mobile Sidebar (Sheet), dan `sidebarCollapsed` hanya mengontrol Desktop Sidebar.
2. WHEN user mengklik tombol toggle di header pada layar `lg` ke atas, THE `AdminLayout` SHALL mengubah `sidebarCollapsed` tanpa mempengaruhi `sidebarOpen`.
3. WHEN user mengklik tombol menu di header pada layar di bawah `lg`, THE `AdminLayout` SHALL mengubah `sidebarOpen` menjadi `true` tanpa mempengaruhi `sidebarCollapsed`.
4. WHEN Mobile Sidebar (Sheet) ditutup (via `onOpenChange`), THE `AdminLayout` SHALL mengubah `sidebarOpen` menjadi `false` tanpa mempengaruhi `sidebarCollapsed`.
5. WHEN user melakukan resize browser dari mobile ke desktop atau sebaliknya, THE `AdminLayout` SHALL mempertahankan nilai `sidebarCollapsed` dan `sidebarOpen` masing-masing tanpa reset.
6. IF `sidebarCollapsed` bernilai `true`, THEN THE `Desktop Sidebar` SHALL merender dengan lebar `w-16` dan hanya menampilkan ikon tanpa label teks.
7. IF `sidebarCollapsed` bernilai `false`, THEN THE `Desktop Sidebar` SHALL merender dengan lebar `w-64` dan menampilkan ikon beserta label teks.
8. THE `AdminLayout` SHALL menerapkan transisi CSS `transition-all duration-300 ease-in-out` pada perubahan lebar Desktop Sidebar.

---

### Requirement 2: Audit dan Perbaikan NavLink — Hapus Orphan NavLinks

**User Story:** Sebagai admin, saya ingin semua item navigasi di sidebar mengarah ke halaman yang benar-benar ada, sehingga saya tidak mendapatkan error 404 saat mengklik menu navigasi.

#### Acceptance Criteria

1. THE `AdminSidebarNav` SHALL hanya merender NavLink yang path-nya memiliki corresponding named route di `routes/admin.php`.
2. THE `getAdminNavItems` function SHALL menghapus atau mengganti semua Orphan NavLink berikut dari semua role yang menggunakannya:
   - `/admin/staff` (tidak ada route) → dihapus dari group "User Management" role `super_admin`
   - `/admin/cleaning-tasks` (tidak ada route) → dihapus dari group "Operations" role `super_admin`, `property_manager`, `housekeeping`
   - `/admin/cleaning-staff` (tidak ada route) → dihapus dari group "Operations" role `super_admin`, `property_manager`, `housekeeping`
   - `/admin/schedules` (tidak ada route) → dihapus dari group "Operations" role `super_admin`, `housekeeping`
   - `/admin/guests` (tidak ada route) → dihapus dari group "Guest Services" role `front_desk`
   - `/admin/guest-support` (tidak ada route) → dihapus dari group "Guest Services" role `front_desk`
   - `/admin/bookings/payment-status` (tidak ada route) → dihapus dari group "Booking Overview" role `finance`
   - `/admin/bookings/room-status` (tidak ada route) → dihapus dari group "Booking Overview" role `housekeeping`
3. WHEN sebuah group navigasi menjadi kosong setelah penghapusan Orphan NavLink, THE `getAdminNavItems` function SHALL menghapus group tersebut dari daftar navigasi role yang bersangkutan.
4. THE `getAdminNavItems` function SHALL mempertahankan semua NavLink yang path-nya memiliki named route valid, termasuk:
   - `/admin/bookings/daily-operations` → `admin.bookings.daily-operations`
   - `/admin/bookings/check-in-out` → `admin.bookings.check-in-out`
   - `/admin/inventory/items` → `admin.inventory.items.index`
   - `/admin/inventory/purchases` → `admin.inventory.purchases.index`
   - `/admin/inventory/usages` → `admin.inventory.usages.index`
   - `/admin/finance/incomes` → `admin.finance.incomes`
   - `/admin/finance/expenses` → `admin.finance.expenses`
   - `/admin/finance/wallets` → `admin.finance.wallets`
5. THE `AdminSidebarNav` SHALL menampilkan active state (highlight) yang benar pada NavLink yang path-nya cocok dengan URL halaman saat ini menggunakan `currentPath.startsWith(child.href)` atau exact match.
6. WHEN Dashboard NavLink diklik, THE `AdminSidebarNav` SHALL mengarahkan ke `/admin/dashboard` (bukan `/dashboard`) agar konsisten dengan named route `admin.dashboard`.

---

### Requirement 3: Perbaikan Navbar Header — Branding dan Efisiensi

**User Story:** Sebagai admin, saya ingin header navbar menampilkan logo/branding yang jelas di semua ukuran layar, sehingga saya selalu tahu saya berada di admin panel dan navigasi terasa profesional.

#### Acceptance Criteria

1. THE `AdminLayout` header SHALL menampilkan logo aplikasi (`AppLogoIcon`) dan nama brand di semua ukuran layar, termasuk mobile.
2. WHEN layar berukuran di bawah `lg` (mobile), THE header SHALL menampilkan logo dan nama brand di sebelah kiri, di samping tombol menu hamburger.
3. WHEN layar berukuran `lg` ke atas (desktop), THE header SHALL menampilkan tombol toggle sidebar (collapse/expand) di sebelah kiri, menggantikan posisi logo karena logo sudah tampil di dalam Desktop Sidebar.
4. THE header SHALL mempertahankan komponen `NotificationBell` di sisi kanan untuk semua ukuran layar.
5. THE header SHALL menggunakan class Tailwind yang konsisten: `sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm`.
6. IF prop `title` diberikan ke `AdminLayout`, THEN THE header SHALL menampilkan `title` di tengah atau setelah logo/toggle button dengan typography `text-lg font-semibold text-brand-primary`.
7. THE header height SHALL konsisten di `h-16` untuk semua ukuran layar.

---

### Requirement 4: Audit Konsistensi Tailwind CSS Custom Classes

**User Story:** Sebagai developer, saya ingin semua custom Tailwind class (`brand-*`) digunakan secara konsisten di seluruh komponen admin layout, sehingga tampilan visual admin panel seragam dan mudah di-maintain.

#### Acceptance Criteria

1. THE `AdminLayout` SHALL menggunakan `bg-brand-primary` secara konsisten untuk background Desktop Sidebar dan Mobile Sidebar (Sheet).
2. THE `AdminLayout` SHALL menggunakan `bg-brand-background` secara konsisten untuk background area konten utama (`AppContent`).
3. THE `AdminSidebarNav` SHALL menggunakan `hover:bg-white/15` dan `bg-white/25` secara konsisten untuk hover state dan active state pada semua NavLink, baik di mode expanded maupun collapsed.
4. THE `AdminSidebarFooter` SHALL menggunakan `border-white/20` secara konsisten untuk border separator antara footer dan nav area.
5. THE `AdminLayout` header SHALL menggunakan `hover:bg-brand-primary-20` secara konsisten untuk hover state pada tombol-tombol di header.
6. THE `AdminSidebarNav` tooltip (saat collapsed) SHALL menggunakan `bg-brand-primary text-white border-brand-primary-20` secara konsisten untuk semua tooltip.
7. WHEN `sidebarCollapsed` bernilai `true`, THE `Desktop Sidebar` header logo area SHALL menggunakan padding `px-3` dan layout `justify-center` agar ikon tetap terpusat.
8. THE `AdminLayout` SHALL tidak menggunakan hardcoded hex color atau arbitrary Tailwind values (misal `bg-[#1a2b3c]`) — semua warna harus menggunakan token `brand-*` atau Tailwind default tokens.

---

### Requirement 5: Perbaikan Mobile Sidebar Content — Konsistensi dengan Desktop

**User Story:** Sebagai admin yang menggunakan perangkat mobile, saya ingin sidebar mobile memiliki tampilan dan navigasi yang setara dengan sidebar desktop, sehingga pengalaman saya konsisten di semua perangkat.

#### Acceptance Criteria

1. THE Mobile Sidebar (Sheet) SHALL menggunakan komponen `AdminSidebarNav` yang sama dengan Desktop Sidebar, bukan komponen `AdminSidebarContent` yang terpisah, untuk memastikan konsistensi navigasi.
2. THE Mobile Sidebar SHALL menampilkan header logo (AppLogoIcon + nama brand) yang identik dengan header logo di Desktop Sidebar.
3. THE Mobile Sidebar SHALL menampilkan `AdminSidebarFooter` di bagian bawah, identik dengan Desktop Sidebar.
4. WHEN user mengklik sebuah NavLink di Mobile Sidebar, THE Mobile Sidebar SHALL menutup secara otomatis (mengubah `sidebarOpen` menjadi `false`).
5. THE Mobile Sidebar SHALL memiliki lebar `w-72` dan menggunakan `bg-brand-primary` sebagai background.
6. THE Mobile Sidebar SHALL selalu merender NavLink dalam mode expanded (tidak collapsed), karena layar mobile tidak mendukung collapsed sidebar.

---

### Requirement 6: Aksesibilitas dan Keyboard Navigation

**User Story:** Sebagai admin, saya ingin dapat menavigasi admin panel menggunakan keyboard, sehingga aksesibilitas panel terjamin.

#### Acceptance Criteria

1. THE tombol toggle sidebar di header SHALL dapat difokus dan diaktifkan menggunakan tombol `Enter` atau `Space` pada keyboard.
2. THE Mobile Sidebar (Sheet) SHALL dapat ditutup menggunakan tombol `Escape` pada keyboard.
3. THE setiap NavLink di `AdminSidebarNav` SHALL memiliki atribut `aria-current="page"` ketika NavLink tersebut aktif (path cocok dengan URL saat ini).
4. THE `AdminSidebarNav` dalam mode collapsed SHALL menampilkan `Tooltip` yang dapat diakses oleh screen reader untuk setiap item navigasi.
5. THE tombol-tombol di header (menu hamburger, sidebar toggle) SHALL memiliki atribut `aria-label` yang deskriptif.

---

### Requirement 7: Desain Visual Fresh dan Bersih — Modern Admin Aesthetic

**User Story:** Sebagai admin, saya ingin tampilan admin panel yang lebih modern, bersih, dan menyenangkan digunakan, sehingga saya dapat bekerja lebih efisien dan nyaman setiap hari.

#### Acceptance Criteria

1. THE sidebar SHALL menggunakan desain dengan visual hierarchy yang jelas — group header lebih subtle, active item lebih menonjol dengan highlight yang bersih (bukan hanya opacity overlay).
2. THE sidebar navigation items SHALL menggunakan spacing yang konsisten (`py-2.5` untuk items, `py-3` untuk group headers) agar mudah di-scan secara visual.
3. THE sidebar SHALL menampilkan role badge di footer area untuk membantu user mengidentifikasi role mereka dengan cepat — menggunakan warna yang berbeda per role (super_admin: amber, property_owner: blue, property_manager: green, front_desk: purple, finance: emerald, housekeeping: orange).
4. THE header navbar SHALL menggunakan desain yang lebih bersih dengan pemisahan visual yang jelas antara branding area (kiri) dan action area (kanan).
5. THE main content area SHALL menggunakan `bg-muted/30` atau `bg-slate-50` sebagai background untuk memberikan kontras yang lembut terhadap card/panel konten.
6. THE breadcrumb navigation SHALL menggunakan separator yang lebih modern (chevron icon) menggantikan karakter `/`.
7. THE sidebar group expand/collapse animation SHALL menggunakan smooth transition dengan `overflow-hidden` dan `max-height` animation agar tidak terasa abrupt.
8. WHEN sidebar dalam kondisi collapsed, THE icon-only mode SHALL menggunakan ukuran ikon yang sedikit lebih besar (`h-5 w-5`) dengan padding yang lebih nyaman (`p-2.5`) agar mudah diklik.

---

### Requirement 8: Role-Aware Navigation — Tampilan Navigasi Sesuai Konteks Role

**User Story:** Sebagai user dengan role tertentu, saya ingin navigasi yang ditampilkan hanya relevan dengan pekerjaan saya, sehingga saya tidak bingung dengan menu yang tidak saya butuhkan.

#### Acceptance Criteria

1. THE `getAdminNavItems` function SHALL mengembalikan navigation items yang sudah difilter dan dioptimalkan per role — tidak ada menu yang tidak relevan untuk role tersebut.
2. THE sidebar footer SHALL menampilkan nama user, role display name, dan avatar/initials dengan layout yang rapi dan tidak terpotong.
3. WHEN sidebar collapsed, THE user avatar SHALL tetap tampil di footer dengan tooltip yang menampilkan nama dan role user.
4. THE navigation group titles SHALL menggunakan label yang singkat dan deskriptif — maksimal 2 kata untuk group title agar tidak overflow saat sidebar expanded.
5. THE `super_admin` role SHALL melihat semua menu yang tersedia, diorganisir dalam group yang logis dan tidak terlalu panjang (maksimal 6 item per group).
6. THE `front_desk` role SHALL melihat navigasi yang fokus pada operasional harian: Bookings, Properties (view only), dan Inventory.
7. THE `finance` role SHALL melihat navigasi yang fokus pada financial: Payments, Finance, Reports, dan Booking Overview (read-only).
8. THE `housekeeping` role SHALL melihat navigasi yang fokus pada operasional kebersihan: Inventory dan Booking Overview (untuk cek status kamar).
