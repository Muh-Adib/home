# Design Document

## Overview

Redesign UI/UX guest-facing pages Homsjogja menggunakan pendekatan glassmorphism + rounded UI yang terinspirasi dari Apple iOS dan Airbnb. Implementasi dilakukan secara incremental — memodifikasi file yang sudah ada tanpa membuat ulang dari nol, mempertahankan semua logika bisnis dan SEO yang sudah ada.

**Stack**: React v19 + Inertia.js v3 + Tailwind CSS v4 + Framer Motion v12

---

## Architecture

### Component Hierarchy

```
GuestLayout (guest-layout.tsx)
├── GlassmorphismNavbar (inline dalam guest-layout.tsx)
│   ├── useScrolled hook (scroll > 60px detection)
│   └── MobileMenu (AnimatePresence slide-down)
├── MobileBottomNav (inline dalam guest-layout.tsx)
└── Footer (inline dalam guest-layout.tsx)

welcome.tsx (Landing Page)
├── HeroSection (existing, enhanced)
│   ├── HeroSlideshow (existing)
│   └── HeroSearchBar (existing)
└── BelowFoldContent (existing, enhanced)

Properties/Index.tsx (Listing Page)
└── PropertyCardEnhanced (existing, enhanced)

Properties/Show.tsx (Detail Page)
├── PropertyGallery (existing)
├── PropertyTabs (existing)
├── BookingSidebar (existing, enhanced + WhatsApp CTA)
└── MobileStickyCtaBar (NEW component)

Articles/Index.tsx (enhanced — brand color fix)
Articles/Show.tsx (enhanced — brand color fix)
```

### New Files to Create

| File | Purpose |
|------|---------|
| `resources/js/components/property/MobileStickyCtaBar.tsx` | Floating CTA bar untuk mobile di halaman detail property |

### Files to Modify

| File | Changes |
|------|---------|
| `resources/js/layouts/guest-layout.tsx` | Glassmorphism navbar + scroll behavior + Framer Motion |
| `resources/js/components/property/BookingSidebar.tsx` | Tambah WhatsApp CTA pre-filled |
| `resources/js/pages/Articles/Index.tsx` | Ganti `blue-600`/`gray-50` → brand color |
| `resources/js/pages/Articles/Show.tsx` | Ganti `blue-600`/`gray-50` → brand color |
| `resources/js/components/ui/property-card-enhanced.tsx` | Ganti `blue-600` → brand color |

---

## Component Designs

### 1. GlassmorphismNavbar

**Lokasi**: `resources/js/layouts/guest-layout.tsx`

**State Management**:
```typescript
const [scrolled, setScrolled] = useState(false);
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

useEffect(() => {
  const handleScroll = () => setScrolled(window.scrollY > 60);
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

**Visual States**:
- `scrolled = false` (hero pages): `bg-transparent backdrop-blur-md border-b border-white/10`
- `scrolled = true` (semua halaman): `bg-white/85 dark:bg-black/85 backdrop-blur-xl shadow-sm border-b border-white/20`
- `variant = 'minimal'` (non-hero pages): langsung gunakan scrolled state

**Framer Motion**:
```typescript
// Navbar background transition
<motion.header
  animate={{
    backgroundColor: scrolled ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0)',
    backdropFilter: 'blur(20px)',
  }}
  transition={{ duration: 0.3, ease: 'easeInOut' }}
>

// Mobile menu
<AnimatePresence>
  {mobileMenuOpen && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
    />
  )}
</AnimatePresence>
```

---

### 2. WhatsApp CTA di BookingSidebar

**Lokasi**: `resources/js/components/property/BookingSidebar.tsx`

**Pre-filled Message Logic**:
```typescript
const buildWhatsAppMessage = (
  propertyName: string,
  checkIn?: string,
  checkOut?: string,
  guests?: number
): string => {
  if (checkIn && checkOut && guests) {
    return encodeURIComponent(
      `Halo, saya tertarik dengan *${propertyName}*.\n` +
      `Check-in: ${checkIn}\nCheck-out: ${checkOut}\nTamu: ${guests} orang.\n` +
      `Apakah masih tersedia?`
    );
  }
  return encodeURIComponent(
    `Halo, saya tertarik dengan *${propertyName}*. Boleh info ketersediaan dan harga?`
  );
};

const waUrl = `https://wa.me/628112500082?text=${buildWhatsAppMessage(
  property.name, checkInDate, checkOutDate, guestCount
)}`;
```

**Button Design**:
```tsx
<Button
  asChild
  variant="outline"
  size="lg"
  className="w-full border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
>
  <a href={waUrl} target="_blank" rel="noopener noreferrer">
    <MessageCircle className="h-4 w-4 mr-2" />
    Chat via WhatsApp
  </a>
</Button>
```

---

### 3. MobileStickyCtaBar

**Lokasi**: `resources/js/components/property/MobileStickyCtaBar.tsx`

**Visibility Logic**:
- Tampil hanya pada `viewport < 768px`
- Sembunyikan ketika `BookingSidebar` terlihat di viewport (menggunakan `IntersectionObserver`)
- Animasi slide-up saat pertama muncul

**Layout**:
```
┌─────────────────────────────────────────────┐
│ Rp 450.000/malam  │ [WhatsApp] [Book Now]   │
└─────────────────────────────────────────────┘
  pb: env(safe-area-inset-bottom)
```

**Props Interface**:
```typescript
interface MobileStickyCtaBarProps {
  property: Property;
  checkInDate?: string;
  checkOutDate?: string;
  guestCount?: number;
  sidebarRef: React.RefObject<HTMLDivElement>;
  onBookNow: () => void;
}
```

---

### 4. Brand Color Fix — Articles Pages

**Problem**: `Articles/Index.tsx` dan `Articles/Show.tsx` menggunakan hardcoded `blue-600`, `blue-500`, `gray-50`, `gray-900`.

**Replacement Map**:
| Hardcoded | Replacement |
|-----------|-------------|
| `bg-gradient-to-br from-blue-600 to-blue-700` | `bg-gradient-to-br from-brand-primary to-brand-primary/80` |
| `text-blue-600` | `text-brand-primary` |
| `hover:text-blue-600` | `hover:text-brand-primary` |
| `bg-gradient-to-br from-blue-500 to-blue-600` | `bg-gradient-to-br from-brand-primary to-brand-primary/80` |
| `bg-gray-50` | `bg-background` |
| `text-gray-900` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `bg-blue-50 to-blue-100` | `bg-brand-primary/5 to-brand-primary/10` |
| `text-blue-300` | `text-brand-primary/40` |

**PropertyCardEnhanced**:
| Hardcoded | Replacement |
|-----------|-------------|
| `group-hover:text-blue-600` | `group-hover:text-brand-primary` |
| `text-blue-600` (CTA hint & price) | `text-brand-primary` |

---

## Data Flow

### WhatsApp CTA Data Flow

```
Properties/Show.tsx
  ├── state: { checkInDate, checkOutDate, guestCount }
  ├── → BookingSidebar (props)
  │     └── buildWhatsAppMessage() → wa.me URL
  └── → MobileStickyCtaBar (props + sidebarRef)
        └── buildWhatsAppMessage() → wa.me URL
```

### Navbar Scroll State

```
GuestLayout
  ├── useEffect → window.scroll listener
  ├── state: scrolled (boolean)
  ├── prop: variant ('default' | 'minimal')
  └── computed: isTransparent = !scrolled && variant !== 'minimal'
```

---

## Design Tokens

Semua komponen menggunakan CSS variables yang sudah ada:

```css
/* Brand colors — jangan diubah */
--brand-primary        /* warna utama */
--brand-accent         /* warna aksen */
--brand-secondary      /* warna sekunder */

/* Semantic tokens dari shadcn/Tailwind */
--background           /* bg halaman */
--foreground           /* teks utama */
--muted-foreground     /* teks sekunder */
--border               /* border default */
--card                 /* bg card */
```

**Border Radius Convention**:
- `rounded-xl` (12px) — card kecil, badge, input
- `rounded-2xl` (16px) — card properti, panel
- `rounded-3xl` (24px) — modal, sidebar

**Shadow Convention**:
- `shadow-sm` — card default
- `shadow-md` — card hover
- `shadow-xl` — sidebar, modal

---

## Framer Motion Patterns

### Reusable Animation Variants

```typescript
// Digunakan di semua section
export const fadeUpVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// Card hover
export const cardHoverVariant = {
  rest: { y: 0 },
  hover: { y: -4, transition: { duration: 0.25 } },
};
```

### Reduced Motion

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.3 };
```

---

## Mobile Bottom Navigation

**Existing implementation** di `guest-layout.tsx` sudah ada — perlu ditambahkan:
1. `pb-[env(safe-area-inset-bottom)]` untuk iPhone safe area
2. Glassmorphism style: `bg-card/90 backdrop-blur-xl border-t border-border/50`
3. Active state indicator menggunakan current URL

---

## Testing Considerations

Setiap perubahan harus diverifikasi:

1. **Navbar**: scroll behavior di halaman hero vs non-hero
2. **WhatsApp CTA**: URL pre-filled message dengan dan tanpa tanggal
3. **MobileStickyCtaBar**: visibility toggle saat sidebar masuk viewport
4. **Brand colors**: tidak ada `blue-600` tersisa di Articles pages
5. **Reduced motion**: animasi dinonaktifkan saat `prefers-reduced-motion: reduce`
6. **Safe area**: padding bottom di iPhone (gunakan browser DevTools)
