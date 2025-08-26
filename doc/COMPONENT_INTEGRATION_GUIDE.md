# 🔧 Component Integration Guide

Panduan lengkap untuk menggunakan komponen-komponen yang sudah diperbaiki di dashboard layout.

## 📋 Overview

Komponen-komponen berikut telah diperbaiki dan diintegrasikan ke dalam dashboard layout:

- **AppContent**: Container untuk konten utama
- **AppShell**: Wrapper utama untuk layout
- **AppSidebar**: Sidebar navigation (untuk desktop)
- **AppSidebarHeader**: Header untuk sidebar dengan breadcrumbs
- **ErrorBoundary**: Error handling wrapper

## 🎯 Komponen yang Diperbaiki

### 1. **AppContent Component**

#### **Fitur Baru:**
- ✅ **Flexible Layout**: Mendukung header dan sidebar variants
- ✅ **Responsive Padding**: Otomatis menambahkan padding top jika header ditampilkan
- ✅ **Custom Styling**: Mendukung className untuk custom styling

#### **Penggunaan:**
```tsx
import { AppContent } from '@/components/app-content';

// Basic usage
<AppContent>
    {children}
</AppContent>

// With custom styling
<AppContent className="p-6 bg-gray-50">
    {children}
</AppContent>

// Without header padding
<AppContent showHeader={false}>
    {children}
</AppContent>
```

### 2. **AppShell Component**

#### **Fitur Baru:**
- ✅ **Variant Support**: Header dan sidebar variants
- ✅ **Error Boundary**: Built-in error handling
- ✅ **Responsive Design**: Mobile-first approach
- ✅ **Custom Styling**: Mendukung className

#### **Penggunaan:**
```tsx
import { AppShell } from '@/components/app-shell';

// Header variant (default)
<AppShell variant="header">
    {children}
</AppShell>

// Sidebar variant
<AppShell variant="sidebar">
    {children}
</AppShell>

// With custom styling
<AppShell className="bg-gray-50">
    {children}
</AppShell>
```

### 3. **AppSidebar Component**

#### **Fitur Baru:**
- ✅ **Role-based Navigation**: Navigation berdasarkan user role
- ✅ **Mobile Support**: Variant untuk mobile dan desktop
- ✅ **Design System**: Menggunakan CSS variables
- ✅ **Custom Styling**: Mendukung className

#### **Penggunaan:**
```tsx
import { AppSidebar } from '@/components/app-sidebar';

// Desktop variant (default)
<AppSidebar variant="desktop" />

// Mobile variant
<AppSidebar variant="mobile" />

// With custom styling
<AppSidebar className="bg-blue-50" />
```

### 4. **AppSidebarHeader Component**

#### **Fitur Baru:**
- ✅ **Breadcrumbs Support**: Menampilkan breadcrumbs
- ✅ **Trigger Control**: Opsi untuk menampilkan/menyembunyikan trigger
- ✅ **Responsive Design**: Mobile-friendly
- ✅ **Custom Styling**: Mendukung className

#### **Penggunaan:**
```tsx
import { AppSidebarHeader } from '@/components/app-sidebar-header';

// Basic usage
<AppSidebarHeader breadcrumbs={breadcrumbs} />

// Without trigger
<AppSidebarHeader breadcrumbs={breadcrumbs} showTrigger={false} />

// With custom styling
<AppSidebarHeader 
    breadcrumbs={breadcrumbs} 
    className="bg-gray-100" 
/>
```

## 🚀 Implementasi di Dashboard Layout

### **Struktur Layout Baru:**

```tsx
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function DashboardLayout({
    children,
    showHeader = true,
    showSidebar = true,
    breadcrumbs = []
}: DashboardLayoutProps) {
    return (
        <ErrorBoundary>
            <AppShell variant="header">
                {/* Header */}
                {showHeader && (
                    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
                        {/* Header content */}
                    </header>
                )}

                {/* Main Content */}
                <AppContent showHeader={showHeader}>
                    {children}
                </AppContent>

                {/* Footer */}
                <footer className="border-t border-border bg-card">
                    {/* Footer content */}
                </footer>
            </AppShell>
        </ErrorBoundary>
    );
}
```

### **Props yang Tersedia:**

```tsx
interface DashboardLayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;        // Tampilkan/sembunyikan header
    showSidebar?: boolean;       // Tampilkan/sembunyikan sidebar
    breadcrumbs?: Array<{        // Breadcrumbs untuk navigation
        title: string; 
        href?: string 
    }>;
}
```

## 🎨 Design System Integration

### **CSS Variables yang Digunakan:**

```css
/* Background Colors */
--background: hsl(var(--background))
--card: hsl(var(--card))
--muted: hsl(var(--muted))

/* Text Colors */
--foreground: hsl(var(--foreground))
--muted-foreground: hsl(var(--muted-foreground))
--primary: hsl(var(--primary))

/* Border Colors */
--border: hsl(var(--border))
```

### **Theme Support:**

Semua komponen mendukung:
- ✅ **Light Mode**: Default theme
- ✅ **Dark Mode**: Automatic dark mode support
- ✅ **Custom Themes**: Menggunakan CSS variables

## 📱 Mobile Responsiveness

### **Breakpoint Strategy:**

```tsx
// Mobile First Approach
className="w-full md:w-64"           // Full width on mobile, 256px on desktop
className="hidden md:block"          // Hidden on mobile, visible on desktop
className="block md:hidden"          // Visible on mobile, hidden on desktop
```

### **Touch Targets:**

```tsx
// Minimum 44px touch target for mobile
className="min-h-[44px] min-w-[44px]"
```

## 🔧 Customization

### **1. Custom Styling**

```tsx
// AppContent dengan custom styling
<AppContent className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8">
    {children}
</AppContent>

// AppShell dengan custom background
<AppShell className="bg-gray-50">
    {children}
</AppShell>

// AppSidebar dengan custom theme
<AppSidebar className="bg-blue-900 text-white" />
```

### **2. Custom Navigation**

```tsx
// Custom breadcrumbs
const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Properties', href: '/properties' },
    { title: 'Property Detail' } // No href for current page
];

<AppSidebarHeader breadcrumbs={breadcrumbs} />
```

### **3. Conditional Rendering**

```tsx
// Conditional header
{showHeader && (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        {/* Header content */}
    </header>
)}

// Conditional sidebar
{showSidebar && (
    <AppSidebar variant="mobile" />
)}
```

## 🧪 Testing

### **1. Component Testing**

```tsx
// Test AppContent
test('AppContent renders with correct classes', () => {
    render(<AppContent showHeader={true} />);
    expect(screen.getByRole('main')).toHaveClass('pt-16');
});

// Test AppShell
test('AppShell renders with error boundary', () => {
    render(<AppShell>{children}</AppShell>);
    expect(screen.getByRole('main')).toBeInTheDocument();
});
```

### **2. Integration Testing**

```tsx
// Test dashboard layout integration
test('DashboardLayout renders all components', () => {
    render(
        <DashboardLayout showHeader={true} showSidebar={true}>
            <div>Test Content</div>
        </DashboardLayout>
    );
    
    expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
    expect(screen.getByRole('main')).toBeInTheDocument();   // Content
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer
});
```

## 🚀 Best Practices

### **1. Performance**

- ✅ **Lazy Loading**: Komponen di-load saat dibutuhkan
- ✅ **Memoization**: React.memo untuk komponen yang sering re-render
- ✅ **Code Splitting**: Dynamic imports untuk komponen besar

### **2. Accessibility**

- ✅ **ARIA Labels**: Proper accessibility labels
- ✅ **Keyboard Navigation**: Full keyboard support
- ✅ **Screen Reader**: Compatible dengan screen readers
- ✅ **Focus Management**: Proper focus handling

### **3. Error Handling**

- ✅ **Error Boundaries**: Catch dan handle errors gracefully
- ✅ **Fallback UI**: Fallback components untuk error states
- ✅ **Error Logging**: Proper error logging untuk debugging

### **4. SEO**

- ✅ **Semantic HTML**: Proper HTML structure
- ✅ **Meta Tags**: Dynamic meta tags
- ✅ **Structured Data**: JSON-LD untuk search engines

## 📊 Monitoring

### **1. Performance Metrics**

```tsx
// Track component render time
const startTime = performance.now();
// Component render
const endTime = performance.now();
console.log(`Component render time: ${endTime - startTime}ms`);
```

### **2. Error Tracking**

```tsx
// Error boundary dengan error tracking
<ErrorBoundary
    onError={(error, errorInfo) => {
        console.error('Component Error:', error, errorInfo);
        // Send to error tracking service
    }}
>
    {children}
</ErrorBoundary>
```

---

## 📝 Notes

- Semua komponen menggunakan design system yang konsisten
- Mobile-first approach untuk responsive design
- Error boundaries untuk graceful error handling
- TypeScript support untuk type safety
- Accessibility compliance untuk inclusive design

**🎯 Goal**: Komponen yang modular, reusable, dan maintainable dengan design system yang konsisten.




