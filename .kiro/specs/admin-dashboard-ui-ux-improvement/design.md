# Design Document: Admin Dashboard UI/UX Improvement

## Overview

Dokumen ini mendeskripsikan desain teknis untuk perbaikan menyeluruh pada `resources/js/layouts/admin-layout.tsx` — satu-satunya file yang dimodifikasi dalam fitur ini. Perubahan mencakup perbaikan state management sidebar, pembersihan orphan NavLinks, konsistensi visual antara mobile dan desktop sidebar, perbaikan aksesibilitas, dan peningkatan desain visual.

Stack: Laravel 13 + Inertia.js v3 + React 19 + Tailwind CSS v4 + shadcn/ui.

---

## Architecture

### Komponen yang Dimodifikasi

Hanya satu file yang berubah: `resources/js/layouts/admin-layout.tsx`

Di dalam file ini terdapat empat unit yang direfactor:

```
AdminLayout (default export)          ← dimodifikasi
├── getAdminNavItems()                ← dimodifikasi (hapus orphan links, fix dashboard href)
├── AdminSidebarNav                   ← dimodifikasi (aria, animasi, spacing)
├── AdminSidebarFooter                ← dimodifikasi (role badge, tooltip avatar)
└── [hapus] AdminSidebarContent       ← dihapus, diganti dengan AdminSidebarNav
```

### Diagram Struktur Layout

```
AdminLayout
├── <header> sticky top-0 z-50
│   ├── [mobile] AppLogoIcon + brand name + hamburger button
│   └── [desktop] PanelLeft toggle button + title
│       └── [right] NotificationBell
├── <div class="flex flex-1">
│   ├── <Sheet> Mobile Sidebar (sidebarOpen)
│   │   ├── SidebarLogoHeader
│   │   ├── AdminSidebarNav (collapsed=false, onNavClick=closeMobile)
│   │   └── AdminSidebarFooter (collapsed=false)
│   ├── <aside> Desktop Sidebar (sidebarCollapsed)
│   │   ├── SidebarLogoHeader
│   │   ├── AdminSidebarNav (collapsed=sidebarCollapsed)
│   │   └── AdminSidebarFooter (collapsed=sidebarCollapsed)
│   └── <AppContent> Main Content
│       ├── <Breadcrumbs> (chevron separator)
│       └── {children}
```

### Keputusan Arsitektur

**Menghapus `AdminSidebarContent`**: Komponen ini adalah duplikasi dari `AdminSidebarNav` tanpa fitur collapsed. Dengan mengganti penggunaannya di Mobile Sidebar dengan `AdminSidebarNav` (collapsed=false), kita menghilangkan divergensi navigasi antara mobile dan desktop.

**Mengekstrak `SidebarLogoHeader`**: Logo header identik antara mobile dan desktop sidebar. Diekstrak sebagai sub-komponen kecil untuk menghindari duplikasi.

**`onNavClick` prop di `AdminSidebarNav`**: Untuk menutup mobile sidebar saat NavLink diklik, `AdminSidebarNav` menerima optional callback `onNavClick` yang dipanggil setiap kali Link diklik. Desktop tidak menggunakan prop ini.

---

## Components and Interfaces

### `AdminLayout` (default export)

```typescript
interface AdminLayoutProps extends PropsWithChildren<{}> {
  breadcrumbs?: BreadcrumbItem[];
  showHeader?: boolean;
  showSidebar?: boolean;
  title?: string;
  subtitle?: string;
}
```

**State:**
- `sidebarOpen: boolean` — mengontrol Sheet mobile sidebar. Default `false`.
- `sidebarCollapsed: boolean` — mengontrol lebar desktop sidebar. Default `false`.

**Handler:**
- `toggleDesktopSidebar()` → hanya mengubah `sidebarCollapsed`, tidak menyentuh `sidebarOpen`
- `openMobileSidebar()` → hanya mengubah `sidebarOpen = true`, tidak menyentuh `sidebarCollapsed`
- `closeMobileSidebar()` → hanya mengubah `sidebarOpen = false`, tidak menyentuh `sidebarCollapsed`

---

### `SidebarLogoHeader` (sub-komponen baru)

```typescript
interface SidebarLogoHeaderProps {
  collapsed?: boolean;
}
```

Merender logo + brand name. Digunakan di dalam Desktop Sidebar dan Mobile Sidebar. Saat `collapsed=true`, hanya tampilkan ikon logo terpusat.

---

### `AdminSidebarNav`

```typescript
interface AdminSidebarNavProps {
  navItems: ReturnType<typeof getAdminNavItems>;
  collapsed?: boolean;
  onNavClick?: () => void; // dipanggil saat Link diklik (untuk menutup mobile sidebar)
}
```

**State internal:**
- `expandedItems: Set<string>` — set dari group title yang sedang di-expand

**Perubahan dari implementasi saat ini:**
- Tambah prop `onNavClick` — dipanggil di setiap `<Link onClick>`
- Tambah `aria-current="page"` pada NavLink aktif
- Ganti animasi expand/collapse dari conditional render menjadi `max-height` transition
- Spacing: `py-2.5` untuk child items, `py-3` untuk group headers
- Ikon di collapsed mode: `h-5 w-5` dengan `p-2.5`

---

### `AdminSidebarFooter`

```typescript
interface AdminSidebarFooterProps {
  collapsed?: boolean;
}
```

**Perubahan dari implementasi saat ini:**
- Tambah role badge dengan warna per role (lihat Visual Design System)
- Saat `collapsed=true`, tampilkan avatar dengan Tooltip berisi nama + role
- Fix typo `bg-transparant` → `bg-transparent`

---

### `getAdminNavItems` (pure function)

```typescript
type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number | null;
  children?: NavItem[];
};

function getAdminNavItems(userRole: User['role']): NavItem[]
```

Tidak ada perubahan signature. Perubahan hanya pada data: hapus orphan links, fix dashboard href, hapus empty groups.

---

## Data Models

### Navigation Item Structure

```typescript
type NavItem = {
  title: string;       // max 2 kata untuk group titles
  href: string;        // harus valid route, tidak boleh orphan
  icon: LucideIcon;
  badge?: string | number | null;
  children?: NavItem[]; // jika ada, item ini adalah group (collapsible)
};
```

### Navigation Data per Role (setelah cleanup)

#### `super_admin`
```
Dashboard                    → /admin/dashboard
Articles                     → /admin/articles
Property Management
  ├── All Properties         → /admin/properties
  ├── Add Property           → /admin/properties/create
  ├── Rate Management        → /admin/rate-management
  ├── Amenities              → /admin/amenities
  └── Extra Service          → /admin/extra-services
Booking Management
  ├── All Bookings           → /admin/bookings
  ├── Daily Operations       → /admin/bookings/daily-operations
  ├── Create Booking         → /admin/bookings/create
  └── Check-in/Out Report    → /admin/bookings/check-in-out
Financial
  ├── Payments               → /admin/payments
  ├── Payment Methods        → /admin/payment-methods
  ├── Reports                → /admin/reports
  ├── Finance                → /admin/finance
  ├── Incomes                → /admin/finance/incomes
  ├── Expenses               → /admin/finance/expenses
  └── Wallets                → /admin/finance/wallets
User Management
  └── All Users              → /admin/users
      [HAPUS: Staff Management → /admin/staff]
Operations
  ├── Inventory Items        → /admin/inventory/items
  ├── Inventory Purchases    → /admin/inventory/purchases
  └── Inventory Usages       → /admin/inventory/usages
      [HAPUS: Cleaning Tasks, Cleaning Staff, Schedules]
System
  ├── General Settings       → /admin/settings/general
  ├── WhatsApp GOWA          → /admin/gowa
  ├── System Logs            → /admin/settings/system/logs
  ├── Legal                  → /admin/legal/
  ├── AI Provider Keys       → /admin/settings/ai-keys
  └── SEO Pages              → /admin/seo-pages
```

#### `property_owner`
```
Dashboard                    → /admin/dashboard
Articles                     → /admin/articles
My Properties
  ├── All Properties         → /admin/properties
  ├── Add Property           → /admin/properties/create
  ├── Rate Management        → /admin/rate-management
  └── Extra Service          → /admin/extra-services
My Bookings
  ├── All Bookings           → /admin/bookings
  └── Create Booking         → /admin/bookings/create
Financial
  ├── Payments               → /admin/payments
  ├── Reports                → /admin/reports
  ├── Finance                → /admin/finance
  ├── Incomes                → /admin/finance/incomes
  ├── Expenses               → /admin/finance/expenses
  └── Wallets                → /admin/finance/wallets
```

#### `property_manager`
```
Dashboard                    → /admin/dashboard
Articles                     → /admin/articles
Property Management
  ├── All Properties         → /admin/properties
  ├── Add Property           → /admin/properties/create
  └── Rate Management        → /admin/rate-management
Booking Management
  ├── All Bookings           → /admin/bookings
  ├── Daily Operations       → /admin/bookings/daily-operations
  ├── Create Booking         → /admin/bookings/create
  └── Check-in/Out Report    → /admin/bookings/check-in-out
Financial
  ├── Payments               → /admin/payments
  ├── Payment Methods        → /admin/payment-methods
  ├── Finance                → /admin/finance
  ├── Incomes                → /admin/finance/incomes
  ├── Expenses               → /admin/finance/expenses
  └── Wallets                → /admin/finance/wallets
Operations
  ├── Inventory Items        → /admin/inventory/items
  ├── Inventory Purchases    → /admin/inventory/purchases
  └── Inventory Usages       → /admin/inventory/usages
      [HAPUS: Cleaning Tasks, Cleaning Staff]
```

#### `front_desk`
```
Dashboard                    → /admin/dashboard
Articles                     → /admin/articles
Properties
  ├── All Properties         → /admin/properties
  └── Rate Management        → /admin/rate-management
Booking Management
  ├── All Bookings           → /admin/bookings
  ├── Daily Operations       → /admin/bookings/daily-operations
  ├── Create Booking         → /admin/bookings/create
  └── Check-in/Out Report    → /admin/bookings/check-in-out
Operations
  ├── Inventory Items        → /admin/inventory/items
  ├── Inventory Purchases    → /admin/inventory/purchases
  └── Inventory Usages       → /admin/inventory/usages
      [HAPUS: Guest Services group (semua linknya orphan)]
```

#### `finance`
```
Dashboard                    → /admin/dashboard
Articles                     → /admin/articles
Financial Management
  ├── Payments               → /admin/payments
  ├── Payment Methods        → /admin/payment-methods
  ├── Reports                → /admin/reports
  ├── Finance                → /admin/finance
  ├── Incomes                → /admin/finance/incomes
  ├── Expenses               → /admin/finance/expenses
  └── Wallets                → /admin/finance/wallets
Booking Overview
  └── All Bookings           → /admin/bookings
      [HAPUS: Payment Status → /admin/bookings/payment-status]
```

#### `housekeeping`
```
Dashboard                    → /admin/dashboard
Articles                     → /admin/articles
Operations
  ├── Inventory Items        → /admin/inventory/items
  ├── Inventory Purchases    → /admin/inventory/purchases
  └── Inventory Usages       → /admin/inventory/usages
      [HAPUS: Cleaning Tasks, Cleaning Staff, Schedules]
Booking Overview
  └── All Bookings           → /admin/bookings
      [HAPUS: Room Status → /admin/bookings/room-status]
```

### Role Badge Color Map

```typescript
const ROLE_BADGE_COLORS: Record<User['role'], string> = {
  super_admin:      'bg-amber-500/20 text-amber-200 border-amber-500/30',
  property_owner:   'bg-blue-500/20 text-blue-200 border-blue-500/30',
  property_manager: 'bg-green-500/20 text-green-200 border-green-500/30',
  front_desk:       'bg-purple-500/20 text-purple-200 border-purple-500/30',
  finance:          'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  housekeeping:     'bg-orange-500/20 text-orange-200 border-orange-500/30',
  guest:            'bg-gray-500/20 text-gray-200 border-gray-500/30',
};
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: State Independence

*For any* combination of `sidebarOpen` and `sidebarCollapsed` values, calling the handler that modifies one state SHALL leave the other state unchanged.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: No Orphan NavLinks

*For any* role value passed to `getAdminNavItems`, none of the returned NavLink hrefs SHALL be one of the known orphan paths: `/admin/staff`, `/admin/cleaning-tasks`, `/admin/cleaning-staff`, `/admin/schedules`, `/admin/guests`, `/admin/guest-support`, `/admin/bookings/payment-status`, `/admin/bookings/room-status`.

**Validates: Requirements 2.1, 2.2**

### Property 3: No Empty Groups

*For any* role value passed to `getAdminNavItems`, every group item (item with a `children` array) SHALL have `children.length > 0`.

**Validates: Requirements 2.3**

### Property 4: Active State Correctness

*For any* href string and currentPath string, `isChildActive(href, currentPath)` SHALL return `true` if and only if `currentPath === href` OR `currentPath.startsWith(href + '/')`.

**Validates: Requirements 2.5**

### Property 5: Role Badge Uniqueness

*For any* two distinct role values `r1` and `r2`, `getRoleBadgeColor(r1)` SHALL return a different string from `getRoleBadgeColor(r2)`.

**Validates: Requirements 7.3**

### Property 6: Group Title Length

*For any* role value passed to `getAdminNavItems`, every group item title (item with `children`) SHALL contain at most 2 words (split by whitespace).

**Validates: Requirements 8.4**

### Property 7: Footer Renders User Info

*For any* user object with a non-empty `name` and valid `role`, `AdminSidebarFooter` SHALL render the user's name, role display name, and avatar initials.

**Validates: Requirements 8.2**

---

## Visual Design System

### Tailwind CSS Token Usage

Semua warna menggunakan token `brand-*` atau Tailwind default — tidak ada hardcoded hex atau arbitrary values.

| Element | Class |
|---|---|
| Sidebar background | `bg-brand-primary` |
| Sidebar logo header | `bg-gradient-to-r from-brand-primary to-brand-primary-dark` |
| Sidebar border | `border-brand-primary-20` |
| Nav item hover | `hover:bg-white/15` |
| Nav item active | `bg-white/25` |
| Nav child item hover | `hover:bg-white/10` |
| Nav child item active | `bg-white/20` |
| Nav group border-left | `border-l-2 border-white/20` |
| Footer border | `border-t border-white/20` |
| Tooltip | `bg-brand-primary text-white border-brand-primary-20` |
| Header button hover | `hover:bg-brand-primary-20` |
| Content background | `bg-brand-background` |

### Spacing System

| Element | Padding |
|---|---|
| Group header button | `px-4 py-3` |
| Single nav item | `px-4 py-3` |
| Child nav item | `px-3 py-2.5` |
| Collapsed icon button | `p-2.5` (centered) |
| Sidebar logo header | `px-6 py-5` (expanded), `px-3 py-5` (collapsed) |

### Typography

| Element | Class |
|---|---|
| Group header label | `text-sm font-semibold text-white` |
| Child item label | `text-sm text-white/85` (inactive), `text-sm font-semibold text-white` (active) |
| Single item label | `text-sm font-semibold text-white/90` (inactive), `text-white` (active) |
| Brand name | `text-lg font-bold text-white` |
| Brand subtitle | `text-xs text-white/90 font-medium` |
| Header title | `text-lg font-semibold text-brand-primary` |

### Icon Sizes

| Context | Size |
|---|---|
| Sidebar nav icon (expanded) | `h-5 w-5` |
| Sidebar nav icon (collapsed) | `h-5 w-5` |
| Sidebar child icon | `h-4 w-4` |
| Logo icon (expanded) | `h-6 w-6` |
| Logo icon (collapsed) | `h-5 w-5` |
| Header button icon | `h-5 w-5` |

---

## State Management

### State Diagram

```
sidebarOpen (boolean)
  false ──[hamburger click]──→ true
  true  ──[Sheet onOpenChange=false]──→ false
  true  ──[NavLink click in mobile]──→ false

sidebarCollapsed (boolean)
  false ──[desktop toggle click]──→ true
  true  ──[desktop toggle click]──→ false
```

**Invariant**: Perubahan pada `sidebarOpen` tidak pernah menyentuh `sidebarCollapsed`, dan sebaliknya. Kedua state dikelola oleh handler yang terpisah dan tidak saling memanggil.

### Implementation Pattern

```typescript
// BENAR — handler terpisah, tidak ada cross-contamination
const toggleDesktopSidebar = () => setSidebarCollapsed(prev => !prev);
const openMobileSidebar = () => setSidebarOpen(true);
const closeMobileSidebar = () => setSidebarOpen(false);

// SALAH — jangan lakukan ini
const toggleSidebar = () => {
  setSidebarCollapsed(!sidebarCollapsed);
  setSidebarOpen(false); // ← ini adalah bug
};
```

### `expandedItems` State di `AdminSidebarNav`

State `expandedItems: Set<string>` diinisialisasi dengan auto-expand group yang mengandung path aktif saat ini. Saat `collapsed=true`, toggle expand diabaikan (karena collapsed mode tidak menampilkan children). Saat sidebar di-expand kembali, state `expandedItems` tetap dipertahankan.

---

## Animation & Transitions

### Sidebar Width Transition

```tsx
// Desktop sidebar
<aside className={cn(
  "hidden lg:flex lg:flex-col h-[calc(100vh-4rem)] sticky top-16",
  "transition-all duration-300 ease-in-out",
  sidebarCollapsed ? "w-16" : "w-64",
  "bg-brand-primary border-r border-brand-primary-20 shadow-lg"
)}>
```

### Group Expand/Collapse Animation

Ganti conditional render `{condition && <div>...</div>}` dengan animasi `max-height` menggunakan `grid` trick yang kompatibel dengan Tailwind v4:

```tsx
// Menggunakan grid rows untuk animasi smooth tanpa JavaScript height calculation
<div className={cn(
  "grid transition-all duration-200 ease-in-out",
  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
)}>
  <div className="overflow-hidden">
    <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-white/20 pl-3 pb-1">
      {/* children */}
    </div>
  </div>
</div>
```

Teknik ini menggunakan `grid-rows-[0fr]` / `grid-rows-[1fr]` yang di-support Tailwind v4 dan memberikan animasi smooth tanpa perlu menghitung height secara dinamis.

### Icon Scale on Hover

```tsx
<item.icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
```

### ChevronDown Rotation

```tsx
<ChevronDown className={cn(
  "h-4 w-4 transition-transform duration-200",
  isExpanded && "rotate-180"
)} />
```

---

## Accessibility

### Aria Attributes

| Element | Attribute |
|---|---|
| Mobile hamburger button | `aria-label="Open navigation menu"` |
| Desktop toggle button | `aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}` |
| Group header button | `aria-expanded={isExpanded}` |
| Active NavLink | `aria-current="page"` |
| Mobile Sheet | `SheetTitle` dengan `sr-only` sudah ada, pertahankan |

### Keyboard Navigation

- Semua `<button>` dan `<Link>` sudah focusable secara default
- Sheet dari shadcn/ui sudah handle `Escape` key untuk menutup
- `TooltipProvider` dari shadcn/ui sudah handle keyboard focus untuk tooltip
- Group header `<button>` dapat diaktifkan dengan `Enter` dan `Space` (default browser behavior untuk `<button>`)

### Screen Reader

- Collapsed sidebar: setiap nav item memiliki `<Tooltip>` dengan label teks — shadcn/ui Tooltip menggunakan `role="tooltip"` yang dapat dibaca screen reader
- Role badge di footer memberikan konteks role kepada screen reader

---

## Error Handling

### Guest Role Guard

Implementasi saat ini menggunakan `router.visit('/dashboard')` di dalam render function — ini adalah side effect di render yang tidak ideal. Pertahankan behavior ini karena sudah ada dan bekerja, tapi catat sebagai technical debt.

```typescript
// Pertahankan behavior existing
if (isGuest) {
  router.visit('/dashboard');
  return null;
}
```

### Missing Role Fallback

`getAdminNavItems` mengembalikan `[]` untuk role yang tidak dikenal (via `|| []`). Ini sudah benar — sidebar akan kosong tapi tidak crash.

### Invalid `ziggy.location`

`AdminSidebarNav` sudah handle kasus `ziggy.location` yang tidak valid dengan fallback ke string kosong:

```typescript
const currentPath = page.props.ziggy.location
  ? new URL(page.props.ziggy.location).pathname
  : '';
```

Pertahankan pattern ini.

---

## Testing Strategy

Fitur ini adalah UI/UX improvement pada komponen React. PBT (Property-Based Testing) **tidak sepenuhnya applicable** untuk semua aspek — sebagian besar adalah UI rendering checks. Namun, beberapa pure functions (`getAdminNavItems`, `isChildActive`, `getRoleBadgeColor`) sangat cocok untuk property-based testing.

### Unit Tests (Vitest + React Testing Library)

Fokus pada pure functions dan komponen behavior:

1. **`getAdminNavItems` — orphan link removal**
   - Untuk setiap role, tidak ada orphan href dalam output
   - Untuk setiap role, tidak ada group dengan children kosong
   - Dashboard href adalah `/admin/dashboard` untuk semua role

2. **`isChildActive` — active state logic**
   - Exact match: `isChildActive('/admin/bookings', '/admin/bookings')` → `true`
   - Prefix match: `isChildActive('/admin/bookings', '/admin/bookings/123')` → `true`
   - No false positive: `isChildActive('/admin/booking', '/admin/bookings')` → `false`

3. **`getRoleBadgeColor` — role badge uniqueness**
   - Setiap role mengembalikan string yang berbeda

4. **`AdminSidebarFooter` — user info rendering**
   - Render nama user, role display name, dan initials avatar

5. **State independence**
   - Memanggil `toggleDesktopSidebar` tidak mengubah `sidebarOpen`
   - Memanggil `openMobileSidebar` tidak mengubah `sidebarCollapsed`

### Property-Based Tests (fast-check)

Gunakan library `fast-check` (sudah umum di ekosistem TypeScript) untuk property tests:

**Property 1: State Independence**
```typescript
// Tag: Feature: admin-dashboard-ui-ux-improvement, Property 1: State Independence
// fc.boolean() × fc.boolean() → toggle satu, verifikasi yang lain tidak berubah
```

**Property 2: No Orphan NavLinks**
```typescript
// Tag: Feature: admin-dashboard-ui-ux-improvement, Property 2: No Orphan NavLinks
// fc.constantFrom(...roles) → getAdminNavItems(role) → semua href bukan orphan
```

**Property 3: No Empty Groups**
```typescript
// Tag: Feature: admin-dashboard-ui-ux-improvement, Property 3: No Empty Groups
// fc.constantFrom(...roles) → getAdminNavItems(role) → semua group.children.length > 0
```

**Property 4: Active State Correctness**
```typescript
// Tag: Feature: admin-dashboard-ui-ux-improvement, Property 4: Active State Correctness
// fc.string() × fc.string() → isChildActive(href, path) ↔ (path === href || path.startsWith(href + '/'))
```

**Property 5: Role Badge Uniqueness**
```typescript
// Tag: Feature: admin-dashboard-ui-ux-improvement, Property 5: Role Badge Uniqueness
// fc.uniqueArray(fc.constantFrom(...roles), {minLength: 2}) → getRoleBadgeColor(r1) !== getRoleBadgeColor(r2)
```

**Property 6: Group Title Length**
```typescript
// Tag: Feature: admin-dashboard-ui-ux-improvement, Property 6: Group Title Length
// fc.constantFrom(...roles) → getAdminNavItems(role) → semua group title ≤ 2 kata
```

**Property 7: Footer Renders User Info**
```typescript
// Tag: Feature: admin-dashboard-ui-ux-improvement, Property 7: Footer Renders User Info
// fc.record({name: fc.string({minLength:1}), role: fc.constantFrom(...roles)}) → footer renders name + role + initials
```

Setiap property test dikonfigurasi minimum 100 iterasi.

### Integration Tests

- Render `AdminLayout` dengan berbagai role dan verifikasi tidak ada crash
- Verifikasi Mobile Sidebar menutup saat NavLink diklik
- Verifikasi breadcrumb menggunakan chevron separator

---

## Implementation Notes

### Hal-hal Penting Saat Implementasi

1. **Jangan ubah file lain** — semua perubahan hanya di `admin-layout.tsx`. Tidak ada perubahan pada routes, controllers, atau komponen lain.

2. **Pertahankan `TooltipProvider` wrapping** — `AdminSidebarNav` dan `AdminSidebarFooter` di desktop sidebar sudah dibungkus `TooltipProvider`. Mobile sidebar tidak perlu `TooltipProvider` karena tidak ada collapsed mode.

3. **`AdminSidebarContent` dihapus** — komponen ini tidak lagi digunakan. Hapus definisinya dari file.

4. **Fix typo `bg-transparant`** — di `AdminSidebarFooter`, ada typo `bg-transparant` yang harus diperbaiki menjadi `bg-transparent`.

5. **Dashboard href** — ubah dari `/dashboard` menjadi `/admin/dashboard` di `baseItems`. Ini adalah perubahan kecil tapi penting agar konsisten dengan named route `admin.dashboard`.

6. **Grid animation compatibility** — Tailwind v4 mendukung arbitrary values untuk `grid-rows`. Gunakan `grid-rows-[1fr]` dan `grid-rows-[0fr]` untuk animasi expand/collapse. Ini lebih reliable daripada `max-height` dengan nilai arbitrary.

7. **`onNavClick` di mobile** — saat `AdminSidebarNav` digunakan di dalam Sheet, pass `onNavClick={() => setSidebarOpen(false)}`. Ini memastikan sidebar menutup saat user memilih menu.

8. **Urutan import** — pertahankan urutan import yang ada. Hapus import yang tidak lagi digunakan setelah `AdminSidebarContent` dihapus (misalnya `Sparkles`, `Calendar` jika tidak ada di nav items lagi — cek ulang setelah cleanup).

9. **`aria-current` pada NavLink** — tambahkan `aria-current={isChildActive(item.href) ? "page" : undefined}` pada setiap `<Link>` di nav. Gunakan `undefined` (bukan `false`) agar atribut tidak dirender saat tidak aktif.

10. **Role badge di footer** — tambahkan di bawah nama user, sebelum atau sesudah role display name. Saat `collapsed=true`, badge tidak ditampilkan (hanya avatar + tooltip).
