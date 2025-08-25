# 🎨 Logo Theme Guide

Panduan lengkap untuk menggunakan logo dengan tema light/dark mode di aplikasi Homsjogja.

## 📋 Overview

Logo component sekarang mendukung tema light/dark mode dengan beberapa variant yang berbeda untuk berbagai kebutuhan desain.

## 🎯 Variant yang Tersedia

### 1. **Default Variant** (Recommended)
```tsx
<AppLogoIcon className="w-8 h-8" variant="default" />
```
- **Light Mode**: Primary color
- **Dark Mode**: Primary color
- **Use Case**: Logo utama di header dan sidebar

### 2. **Primary Variant**
```tsx
<AppLogoIcon className="w-8 h-8" variant="primary" />
```
- **Light Mode**: Primary color
- **Dark Mode**: Primary color
- **Use Case**: Logo yang selalu menggunakan primary color

### 3. **Monochrome Variant**
```tsx
<AppLogoIcon className="w-8 h-8" variant="monochrome" />
```
- **Light Mode**: Text color (foreground)
- **Dark Mode**: Text color (foreground)
- **Use Case**: Logo yang mengikuti warna text

## 🎨 Custom Colors

Anda juga bisa menggunakan custom colors dengan menambahkan class Tailwind:

```tsx
// Custom blue
<AppLogoIcon className="w-8 h-8 text-blue-600" />

// Custom green
<AppLogoIcon className="w-8 h-8 text-green-600" />

// Custom red
<AppLogoIcon className="w-8 h-8 text-red-600" />

// White on dark background
<AppLogoIcon className="w-8 h-8 text-white" />
```

## 📱 Implementasi di Dashboard Layout

### Header Logo
```tsx
<AppLogoIcon className="w-8 h-8" variant="primary" />
```

### Sidebar Logo
```tsx
<AppLogoIcon className="w-6 h-6" variant="primary" />
```

### Footer Logo
```tsx
<Crown className="h-6 w-6 text-primary dark:text-primary" />
```

## 🔧 Technical Details

### CSS Variables yang Digunakan
- `text-primary`: Primary brand color
- `text-foreground`: Text color (mengikuti tema)
- `text-muted-foreground`: Secondary text color

### Transition Effects
- Logo memiliki `transition-colors duration-200` untuk smooth color changes
- Perubahan tema akan terlihat smooth tanpa flickering

### SVG Implementation
- Menggunakan `fill="currentColor"` untuk mengikuti warna text
- Mendukung semua CSS color properties
- Responsive dan scalable

## 🎯 Best Practices

### 1. **Konsistensi Brand**
- Gunakan `variant="primary"` untuk logo utama
- Pastikan logo selalu terlihat jelas di kedua tema

### 2. **Accessibility**
- Pastikan contrast ratio yang baik
- Test di kedua tema (light/dark)

### 3. **Performance**
- Logo menggunakan CSS variables untuk optimal performance
- Tidak ada re-render saat tema berubah

### 4. **Responsive Design**
- Logo responsive dengan class Tailwind
- Ukuran yang konsisten di semua device

## 🚀 Contoh Penggunaan

### Basic Usage
```tsx
import AppLogoIcon from '@/components/app-logo-icon';

// Default usage
<AppLogoIcon className="w-8 h-8" />

// With variant
<AppLogoIcon className="w-8 h-8" variant="primary" />

// Custom color
<AppLogoIcon className="w-8 h-8 text-blue-600" />
```

### In Layout Components
```tsx
// Header
<Link href="/" className="flex items-center space-x-2">
    <AppLogoIcon className="w-8 h-8" variant="primary" />
    <span className="text-xl font-bold text-foreground">Homsjogja</span>
</Link>

// Sidebar
<SheetTitle className="flex items-center space-x-2">
    <AppLogoIcon className="w-6 h-6" variant="primary" />
    <span className="text-lg font-bold text-foreground">Homsjogja</span>
</SheetTitle>
```

## 🔄 Theme Switching

Logo akan otomatis mengikuti tema saat user mengubah theme:

1. **Light Mode**: Logo menggunakan primary color
2. **Dark Mode**: Logo tetap menggunakan primary color untuk konsistensi brand
3. **Custom**: Bisa menggunakan custom colors sesuai kebutuhan

## 📊 Testing Checklist

- [ ] Logo terlihat jelas di light mode
- [ ] Logo terlihat jelas di dark mode
- [ ] Transisi tema berjalan smooth
- [ ] Logo responsive di semua device
- [ ] Contrast ratio memenuhi accessibility standards
- [ ] Logo konsisten di semua halaman

## 🎨 Design System Integration

Logo terintegrasi dengan design system yang ada:

- **Primary Color**: `hsl(var(--primary))`
- **Foreground**: `hsl(var(--foreground))`
- **Muted Foreground**: `hsl(var(--muted-foreground))`

Semua warna akan otomatis mengikuti tema yang aktif.

---

**📝 Note**: Logo component sekarang fully responsive terhadap tema dan mendukung berbagai use case. Gunakan variant yang sesuai dengan kebutuhan desain Anda.
