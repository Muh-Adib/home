# Booking Timeline Components

## 📋 OVERVIEW

Komponen UI booking timeline yang modular dan responsif untuk menampilkan booking dalam format timeline horizontal. Dibuat dengan React TypeScript, Tailwind CSS, dan mengikuti pedoman penamaan project.

## 🏗️ ARCHITECTURE

### **Struktur Komponen (Modular)**:
```
resources/js/components/booking/
├── index.ts                    # Export semua komponen
├── BookingTimeline.tsx         # Komponen utama
├── BookingTimelineHeader.tsx   # Header tanggal horizontal
├── BookingTimelineRow.tsx      # Row per property
├── BookingItem.tsx            # Card booking individual
└── BookingDetailModal.tsx     # Modal detail booking
```

### **Utilitas**:
```
resources/js/utils/date.ts      # Fungsi utilitas tanggal
```

## 🧩 KOMPONEN DETAIL

### **1. BookingTimeline (Komponen Utama)**

#### **Props**:
```typescript
interface BookingTimelineProps {
    properties: Property[];           // Daftar property
    bookings: Booking[];              // Daftar booking
    startDate?: Date;                 // Tanggal mulai timeline
    days?: number;                    // Jumlah hari (default: 14)
    cellWidth?: number;               // Lebar cell (default: 120px)
    canVerify?: boolean;              // Permission verify
    canCancel?: boolean;              // Permission cancel
    canCheckIn?: boolean;             // Permission check-in
    onRefresh?: () => void;           // Callback refresh
}
```

#### **Fitur**:
- ✅ **Timeline horizontal** dengan scroll
- ✅ **Navigasi tanggal** (prev/next/today)
- ✅ **Filtering** berdasarkan property dan status
- ✅ **Modal detail** booking dengan aksi
- ✅ **Responsive design** dengan overflow handling
- ✅ **Performance optimized** dengan useMemo

### **2. BookingTimelineHeader**

#### **Props**:
```typescript
interface BookingTimelineHeaderProps {
    dates: Date[];                    // Array tanggal
    cellWidth?: number;               // Lebar cell
}
```

#### **Fitur**:
- ✅ **Sticky header** dengan shadow
- ✅ **Weekend highlighting** (orange background)
- ✅ **Today indicator** (blue highlight)
- ✅ **Day names** dalam bahasa Indonesia
- ✅ **Date formatting** konsisten

### **3. BookingTimelineRow**

#### **Props**:
```typescript
interface BookingTimelineRowProps {
    property: Property;               // Data property
    bookings: Booking[];              // Booking untuk property ini
    timelineDates: Date[];            // Array tanggal timeline
    cellWidth?: number;               // Lebar cell
    onBookingClick: (booking: Booking) => void;
}
```

#### **Fitur**:
- ✅ **Property info** dengan gambar dan detail
- ✅ **Booking positioning** absolut berdasarkan tanggal
- ✅ **Weekend background** untuk cell
- ✅ **Hover effects** pada row
- ✅ **Image handling** dengan fallback

### **4. BookingItem**

#### **Props**:
```typescript
interface BookingItemProps {
    booking: Booking;                 // Data booking
    onClick: (booking: Booking) => void;
    cellWidth?: number;               // Lebar cell
}
```

#### **Fitur**:
- ✅ **Status-based colors** (pending, confirmed, checked-in, dll)
- ✅ **Hover effects** dengan scale dan shadow
- ✅ **Compact information** (guest, amount, nights)
- ✅ **Accessibility** dengan screen reader support
- ✅ **Responsive text** dengan truncation

### **5. BookingDetailModal**

#### **Props**:
```typescript
interface BookingDetailModalProps {
    booking: Booking | null;          // Data booking
    isOpen: boolean;                  // Modal state
    onClose: () => void;              // Close handler
    canVerify?: boolean;              // Permission verify
    canCancel?: boolean;              // Permission cancel
    canCheckIn?: boolean;             // Permission check-in
}
```

#### **Fitur**:
- ✅ **Complete booking info** (guest, dates, amount, status)
- ✅ **Action buttons** (verify, reject, cancel, check-in/out)
- ✅ **Permission-based** button visibility
- ✅ **Payment status** display
- ✅ **Special requests** section
- ✅ **Responsive layout** dengan grid

## 🛠️ UTILITAS TANGGAL

### **Fungsi Utama**:

#### **`generateTimelineDates(days, startFrom?)`**
```typescript
// Generate array tanggal untuk timeline
const dates = generateTimelineDates(14, new Date());
// Returns: Array of 14 dates starting from today
```

#### **`calculateBookingPosition(booking, timelineDates, cellWidth)`**
```typescript
// Hitung posisi dan lebar booking di timeline
const position = calculateBookingPosition(booking, dates, 120);
// Returns: { left: number, width: number, visible: boolean }
```

#### **`isBookingInRange(booking, startDate, endDate)`**
```typescript
// Cek apakah booking overlap dengan range
const inRange = isBookingInRange(booking, start, end);
// Returns: boolean
```

#### **`getBookingStatusColor(status)`**
```typescript
// Dapatkan warna berdasarkan status
const color = getBookingStatusColor('confirmed');
// Returns: 'bg-green-500 hover:bg-green-600'
```

## 🎨 DESIGN SYSTEM

### **Color Scheme**:
- **Pending**: Yellow (`bg-yellow-500`)
- **Confirmed**: Green (`bg-green-500`)
- **Checked In**: Blue (`bg-blue-500`)
- **Checked Out**: Gray (`bg-gray-500`)
- **Cancelled**: Red (`bg-red-500`)
- **No Show**: Dark Red (`bg-red-700`)

### **Spacing & Layout**:
- **Cell Width**: 120px (configurable)
- **Row Height**: 100px
- **Property Column**: 256px (fixed)
- **Timeline Padding**: 1px (booking items)

### **Typography**:
- **Property Name**: `font-semibold text-gray-900`
- **Guest Name**: `text-xs font-semibold`
- **Status Text**: `text-xs font-medium`
- **Date Text**: `text-sm font-semibold`

## 📱 RESPONSIVE DESIGN

### **Breakpoints**:
- **Mobile**: Single column, horizontal scroll
- **Tablet**: Optimized spacing, touch-friendly
- **Desktop**: Full timeline view dengan hover effects

### **Scroll Behavior**:
- **Horizontal scroll** untuk timeline
- **Sticky header** tetap terlihat
- **Smooth scrolling** dengan CSS

## ⚡ PERFORMANCE OPTIMIZATION

### **React Optimizations**:
- **useMemo** untuk timeline dates dan grouped bookings
- **useCallback** untuk event handlers
- **Lazy rendering** untuk booking items
- **Conditional rendering** untuk modal

### **CSS Optimizations**:
- **CSS Grid/Flexbox** untuk layout
- **Transform** untuk animations
- **Will-change** untuk hover effects
- **Containment** untuk scroll performance

## 🔧 USAGE EXAMPLE

### **Basic Usage**:
```tsx
import { BookingTimeline } from '@/components/booking';

function MyPage() {
    return (
        <BookingTimeline
            properties={properties}
            bookings={bookings}
            days={14}
            canVerify={true}
            canCancel={true}
            canCheckIn={true}
        />
    );
}
```

### **With Filters**:
```tsx
<BookingTimeline
    properties={filteredProperties}
    bookings={filteredBookings}
    days={parseInt(selectedDays)}
    canVerify={canVerify}
    canCancel={canCancel}
    canCheckIn={canCheckIn}
    onRefresh={handleRefresh}
/>
```

## 🧪 TESTING SCENARIOS

### **1. Timeline Navigation**:
- ✅ Navigate prev/next
- ✅ Go to today
- ✅ Date range display
- ✅ Weekend highlighting

### **2. Booking Interactions**:
- ✅ Click booking item
- ✅ Modal opens with details
- ✅ Action buttons work
- ✅ Permission-based visibility

### **3. Responsive Behavior**:
- ✅ Mobile horizontal scroll
- ✅ Tablet layout
- ✅ Desktop full view
- ✅ Touch interactions

### **4. Data Handling**:
- ✅ Empty state
- ✅ Loading state
- ✅ Error handling
- ✅ Large dataset performance

## 🚀 DEPLOYMENT CHECKLIST

### **Pre-Deployment**:
- [ ] Test semua komponen di berbagai ukuran layar
- [ ] Verify performance dengan data besar
- [ ] Check accessibility (screen reader, keyboard)
- [ ] Test semua action buttons
- [ ] Verify date calculations

### **Post-Deployment**:
- [ ] Monitor performance metrics
- [ ] Check user feedback
- [ ] Verify mobile experience
- [ ] Test dengan data real

## 📝 FUTURE ENHANCEMENTS

### **1. Advanced Features**:
- **Drag & drop** booking reschedule
- **Bulk operations** multiple bookings
- **Export timeline** to PDF/image
- **Real-time updates** dengan WebSocket

### **2. UI Improvements**:
- **Custom themes** untuk different properties
- **Animation effects** untuk transitions
- **Keyboard shortcuts** untuk navigation
- **Advanced tooltips** dengan charts

### **3. Performance**:
- **Virtual scrolling** untuk large datasets
- **Lazy loading** untuk images
- **Caching** untuk timeline data
- **Web Workers** untuk calculations

---

**📅 Created**: 2025-01-27  
**📝 Version**: 1.0  
**🔄 Next Review**: After user testing

---

## 🎯 CONCLUSION

Booking Timeline Components telah berhasil diimplementasikan dengan:

- ✅ **Modular architecture** - Komponen terpisah dan reusable
- ✅ **TypeScript support** - Type safety dan IntelliSense
- ✅ **Responsive design** - Works on all devices
- ✅ **Performance optimized** - Efficient rendering dan calculations
- ✅ **Accessibility** - Screen reader dan keyboard support
- ✅ **Consistent styling** - Mengikuti design system project

**Timeline booking sekarang dapat menampilkan data booking dengan visual yang informatif dan interaktif!** 