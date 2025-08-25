# 🏗️ Admin Layout Guide

Panduan lengkap untuk menggunakan layout admin yang baru dan terpisah dari guest layout.

## 📋 Overview

Layout admin yang baru dirancang untuk memberikan pengalaman yang konsisten dan profesional untuk semua halaman admin. Layout ini terpisah dari guest layout dan memiliki fitur-fitur khusus untuk admin.

## 🎯 Fitur Utama

### ✅ **Role-Based Navigation**
- Menu dinamis berdasarkan role user (super_admin, property_owner, property_manager, dll)
- Grouping menu yang logis dan mudah dinavigasi
- Expandable sidebar dengan sub-menu

### ✅ **Responsive Design**
- Mobile-first approach
- Sidebar yang dapat di-collapse di mobile
- Header yang sticky dan responsive

### ✅ **Professional UI/UX**
- Design yang konsisten dengan brand Homsjogja
- Color scheme yang profesional (biru sebagai primary color)
- Icon dan typography yang modern

### ✅ **Advanced Features**
- Search functionality
- Notification system
- User profile dropdown
- Breadcrumb navigation
- Error boundary protection

## 🚀 Implementasi

### **1. Import Layout**

```tsx
import AdminLayout from '@/layouts/admin-layout';
```

### **2. Basic Usage**

```tsx
export default function MyAdminPage() {
    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'My Page' }
    ];

    return (
        <AdminLayout 
            breadcrumbs={breadcrumbs}
            title="Page Title"
            subtitle="Page description"
        >
            {/* Page content */}
        </AdminLayout>
    );
}
```

### **3. Props yang Tersedia**

```tsx
interface AdminLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];    // Breadcrumb navigation
    showHeader?: boolean;              // Tampilkan/sembunyikan header (default: true)
    showSidebar?: boolean;             // Tampilkan/sembunyikan sidebar (default: true)
    title?: string;                    // Page title di header
    subtitle?: string;                 // Page subtitle di header
}
```

## 🎨 Design System

### **Color Palette**
```css
/* Primary Colors */
--primary: #3b82f6 (Blue)
--primary-hover: #2563eb
--primary-light: #dbeafe

/* Background Colors */
--bg-main: #f9fafb (Gray-50)
--bg-sidebar: #ffffff (White)
--bg-header: #ffffff (White)

/* Text Colors */
--text-primary: #111827 (Gray-900)
--text-secondary: #6b7280 (Gray-500)
--text-muted: #9ca3af (Gray-400)
```

### **Typography**
```css
/* Headings */
--font-heading: Inter, system-ui, sans-serif
--font-body: Inter, system-ui, sans-serif

/* Sizes */
--text-xs: 0.75rem
--text-sm: 0.875rem
--text-base: 1rem
--text-lg: 1.125rem
--text-xl: 1.25rem
```

## 📱 Responsive Breakpoints

### **Mobile (< 768px)**
- Sidebar tersembunyi, dapat diakses via hamburger menu
- Header compact dengan mobile-optimized controls
- Content full-width dengan padding yang sesuai

### **Tablet (768px - 1024px)**
- Sidebar dapat di-toggle
- Header dengan search dan notifications
- Content dengan responsive grid

### **Desktop (> 1024px)**
- Sidebar selalu visible (320px width)
- Full header functionality
- Optimal content layout

## 🔧 Customization

### **1. Custom Sidebar Items**

```tsx
// Di admin-layout.tsx, edit getAdminNavItems function
const getAdminNavItems = (userRole: User['role']) => {
    const customItems = [
        {
            title: 'Custom Module',
            href: '/admin/custom',
            icon: CustomIcon,
            children: [
                { title: 'Sub Item 1', href: '/admin/custom/item1', icon: SubIcon1 },
                { title: 'Sub Item 2', href: '/admin/custom/item2', icon: SubIcon2 },
            ]
        }
    ];
    
    return [...baseItems, ...customItems];
};
```

### **2. Custom Header Actions**

```tsx
// Tambahkan custom actions di header
<header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
    <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
                {/* Custom content */}
                <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Action
                </Button>
            </div>
            
            {/* Right Section */}
            {/* Existing content */}
        </div>
    </div>
</header>
```

### **3. Custom Sidebar Styling**

```tsx
// Override sidebar styles
<aside className="hidden lg:block w-80 bg-gradient-to-b from-blue-50 to-white border-r border-blue-200">
    {/* Custom sidebar content */}
</aside>
```

## 🧪 Testing

### **1. Component Testing**

```tsx
import { render, screen } from '@testing-library/react';
import AdminLayout from '@/layouts/admin-layout';

test('AdminLayout renders with correct structure', () => {
    render(
        <AdminLayout title="Test Page">
            <div>Test Content</div>
        </AdminLayout>
    );
    
    expect(screen.getByText('Test Page')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
    expect(screen.getByRole('complementary')).toBeInTheDocument(); // Sidebar
});
```

### **2. Integration Testing**

```tsx
test('AdminLayout integrates with role-based navigation', () => {
    // Mock user with specific role
    const mockUser = { role: 'super_admin' };
    
    render(
        <AdminLayout>
            <div>Content</div>
        </AdminLayout>
    );
    
    // Verify navigation items for super_admin role
    expect(screen.getByText('Property Management')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
});
```

## 🚨 Troubleshooting

### **Common Issues**

#### 1. **Sidebar Tidak Muncul**
```tsx
// Pastikan showSidebar={true} atau tidak di-set
<AdminLayout showSidebar={true}>
    {children}
</AdminLayout>
```

#### 2. **Header Tidak Muncul**
```tsx
// Pastikan showHeader={true} atau tidak di-set
<AdminLayout showHeader={true}>
    {children}
</AdminLayout>
```

#### 3. **Navigation Items Tidak Sesuai Role**
```tsx
// Periksa role user di auth context
// Pastikan getAdminNavItems function mengembalikan items yang benar
```

#### 4. **Styling Tidak Konsisten**
```tsx
// Pastikan menggunakan CSS variables yang sudah didefinisikan
// Gunakan Tailwind classes yang konsisten
```

### **Performance Optimization**

#### 1. **Lazy Loading Sidebar**
```tsx
// Implement lazy loading untuk sidebar content
const AdminSidebarContent = React.lazy(() => import('./AdminSidebarContent'));

<Suspense fallback={<div>Loading...</div>}>
    <AdminSidebarContent navItems={navItems} />
</Suspense>
```

#### 2. **Memoization**
```tsx
// Memoize navigation items untuk performance
const navItems = useMemo(() => getAdminNavItems(auth.user.role), [auth.user.role]);
```

## 📚 Best Practices

### **1. Consistent Usage**
- Gunakan AdminLayout untuk semua halaman admin
- Jangan campur dengan GuestLayout atau layout lainnya
- Pastikan breadcrumbs selalu di-set dengan benar

### **2. Performance**
- Gunakan React.memo untuk komponen yang sering re-render
- Implement lazy loading untuk fitur yang tidak critical
- Optimize bundle size dengan code splitting

### **3. Accessibility**
- Pastikan semua interactive elements memiliki proper ARIA labels
- Implement keyboard navigation yang lengkap
- Test dengan screen readers

### **4. SEO**
- Gunakan semantic HTML structure
- Implement proper meta tags
- Ensure proper heading hierarchy

## 🔄 Migration Guide

### **Dari AppLayout ke AdminLayout**

#### **Before (Old)**
```tsx
import AppLayout from '@/layouts/app-layout';

export default function MyPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div>Content</div>
        </AppLayout>
    );
}
```

#### **After (New)**
```tsx
import AdminLayout from '@/layouts/admin-layout';

export default function MyPage() {
    return (
        <AdminLayout 
            breadcrumbs={breadcrumbs}
            title="Page Title"
            subtitle="Page description"
        >
            <div>Content</div>
        </AdminLayout>
    );
}
```

### **Dari DashboardLayout ke GuestLayout**

#### **Before (Old)**
```tsx
import DashboardLayout from '@/layouts/dashboard-layout';

export default function GuestPage() {
    return (
        <DashboardLayout>
            <div>Content</div>
        </DashboardLayout>
    );
}
```

#### **After (New)**
```tsx
import GuestLayout from '@/layouts/guest-layout';

export default function GuestPage() {
    return (
        <GuestLayout title="Page Title" subtitle="Page description">
            <div>Content</div>
        </GuestLayout>
    );
}
```

## 📊 Monitoring & Analytics

### **1. Performance Metrics**
```tsx
// Track layout render time
useEffect(() => {
    const startTime = performance.now();
    
    return () => {
        const endTime = performance.now();
        console.log(`AdminLayout render time: ${endTime - startTime}ms`);
    };
}, []);
```

### **2. User Interaction Tracking**
```tsx
// Track sidebar usage
const handleSidebarToggle = () => {
    analytics.track('sidebar_toggle', {
        action: 'toggle',
        timestamp: new Date().toISOString()
    });
    setSidebarOpen(!sidebarOpen);
};
```

---

## 📝 Notes

- Layout admin terpisah dari guest layout untuk konsistensi
- Role-based navigation memastikan user hanya melihat menu yang relevan
- Responsive design memastikan pengalaman yang optimal di semua device
- Error boundary protection memastikan aplikasi tetap stabil

**🎯 Goal**: Layout admin yang konsisten, profesional, dan mudah digunakan untuk semua role admin.


