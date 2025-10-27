# Responsive Design & Accessibility Notes

## Responsive Design Changes

### 1. **KPI Tiles Layout**
- **Desktop**: 4 columns grid (lg:grid-cols-4)
- **Tablet**: 2 columns grid (sm:grid-cols-2) 
- **Mobile**: 2 columns grid (grid-cols-2) dengan horizontal snap
- **Typography**: Responsive text sizing (text-lg sm:text-2xl lg:text-3xl)
- **Spacing**: Responsive padding (p-4 sm:p-6)

### 2. **Chart Section**
- **Desktop**: Chart takes 2/3 width (xl:col-span-2), controls on right
- **Mobile**: Full width chart, controls stack below
- **Chart Height**: Fixed 320px (h-80) untuk konsistensi
- **Responsive Container**: Menggunakan recharts ResponsiveContainer

### 3. **Header Section**
- **Mobile**: Stack layout (flex-col), compact buttons
- **Desktop**: Horizontal layout (sm:flex-row)
- **Text**: Responsive sizing (text-xl sm:text-2xl md:text-3xl)
- **Buttons**: Full width di mobile (flex-1), auto width di desktop

### 4. **Tabs Navigation**
- **Mobile**: Horizontal scroll dengan overflow-x-auto
- **Desktop**: Grid layout (grid-cols-3)
- **Text**: Responsive sizing (text-sm sm:text-base)

### 5. **Content Cards**
- **Mobile**: Single column dengan compact spacing
- **Desktop**: Multi-column grid (lg:grid-cols-2)
- **Media Grid**: Responsive (grid-cols-2 sm:grid-cols-3 lg:grid-cols-4)

## Accessibility (A11y) Improvements

### 1. **Semantic HTML**
- Proper heading hierarchy (h1, h2, h3)
- Semantic landmarks (main, section, article)
- Proper list structures untuk data

### 2. **Keyboard Navigation**
- All interactive elements focusable
- Tab order logical dan intuitive
- Focus indicators visible (ring-2 ring-primary/20)

### 3. **Screen Reader Support**
- `aria-label` untuk icon buttons
- `role` attributes untuk custom components
- `aria-describedby` untuk form controls
- `aria-live` untuk dynamic content updates

### 4. **High Contrast Support**
- Menggunakan CSS custom properties (--foreground, --background)
- Sufficient color contrast ratios
- Focus indicators dengan high contrast

### 5. **Loading States**
- Skeleton loaders dengan proper aria-labels
- Loading indicators untuk async operations
- Error states dengan clear messaging

### 6. **Form Controls**
- Proper labels untuk all inputs
- Date inputs dengan proper format
- Button states (loading, disabled)

## Performance Optimizations

### 1. **Lazy Loading**
- Images dengan `loading="lazy"`
- Component lazy loading untuk heavy components
- Virtual scrolling untuk long lists

### 2. **Data Fetching**
- React Query untuk caching dan background updates
- Debounced date range changes
- Pagination untuk booking lists

### 3. **Bundle Optimization**
- Tree shaking untuk unused components
- Code splitting untuk chart libraries
- Optimized re-renders dengan proper memoization

## CSS Custom Properties Usage

### Brand Colors (tidak override)
```css
/* Menggunakan existing brand variables */
--brand-primary: hsl(233 68% 42%);
--brand-secondary: hsl(33 45% 58%);
--brand-accent: hsl(45 96% 55%);
```

### Utility Classes
```css
/* Menggunakan Tailwind utilities */
.card-modern {
  @apply rounded-lg border bg-card/50 hover:bg-card/80 transition-colors;
}

.line-clamp-1 {
  @apply overflow-hidden text-ellipsis whitespace-nowrap;
}
```

## Mobile-First Approach

### 1. **Base Styles** (Mobile)
- Compact spacing (p-4, gap-3)
- Single column layouts
- Touch-friendly button sizes (min-h-10)

### 2. **Progressive Enhancement**
- `sm:` breakpoint untuk tablet
- `lg:` breakpoint untuk desktop
- `xl:` breakpoint untuk large screens

### 3. **Touch Interactions**
- Minimum 44px touch targets
- Swipe gestures untuk horizontal scroll
- Pull-to-refresh untuk data updates

## Testing Checklist

### Responsive Testing
- [ ] iPhone SE (375px)
- [ ] iPad (768px) 
- [ ] Desktop (1024px+)
- [ ] Large screens (1440px+)

### Accessibility Testing
- [ ] Screen reader navigation
- [ ] Keyboard-only navigation
- [ ] High contrast mode
- [ ] Zoom up to 200%

### Performance Testing
- [ ] Lighthouse scores
- [ ] Bundle size analysis
- [ ] Runtime performance
- [ ] Memory usage

