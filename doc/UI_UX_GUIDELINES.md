# UI/UX Guidelines & Design System
## Property Management System

---

## 1. DESIGN PRINCIPLES

### 1.1 Core Principles
```
User-Centered Design:
- Simple and intuitive interfaces
- Minimal learning curve
- Clear information hierarchy
- Consistent user experience

Business Goals:
- Efficient property management
- Streamlined booking process
- Clear financial tracking
- Mobile-first approach
```

### 1.2 Design Values
- **Simplicity**: Clean, uncluttered interfaces
- **Efficiency**: Quick task completion
- **Reliability**: Consistent and predictable interactions
- **Accessibility**: Inclusive design for all users
- **Performance**: Fast loading and responsive design

---

## 2. COLOR SYSTEM

### 2.1 Primary Colors
```css
/* Primary Brand Colors */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-500: #3b82f6;  /* Main brand color */
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-900: #1e3a8a;

/* Secondary Colors */
--secondary-50: #f8fafc;
--secondary-100: #f1f5f9;
--secondary-500: #64748b;
--secondary-600: #475569;
--secondary-900: #0f172a;
```

### 2.2 Semantic Colors
```css
/* Status Colors */
--success-50: #f0fdf4;
--success-500: #22c55e;
--success-600: #16a34a;

--warning-50: #fffbeb;
--warning-500: #f59e0b;
--warning-600: #d97706;

--error-50: #fef2f2;
--error-500: #ef4444;
--error-600: #dc2626;

--info-50: #f0f9ff;
--info-500: #06b6d4;
--info-600: #0891b2;
```

### 2.3 Neutral Colors
```css
/* Gray Scale */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

---

## 3. TYPOGRAPHY

### 3.1 Font Family
```css
/* Primary Font */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace Font */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### 3.2 Font Scale
```css
/* Headings */
.text-xs { font-size: 0.75rem; line-height: 1rem; }      /* 12px */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }  /* 14px */
.text-base { font-size: 1rem; line-height: 1.5rem; }     /* 16px */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }  /* 18px */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }   /* 20px */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }      /* 24px */
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; } /* 30px */
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }   /* 36px */
```

### 3.3 Font Weights
```css
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

---

## 4. SPACING SYSTEM

### 4.1 Spacing Scale
```css
/* Spacing Units (rem based) */
.space-1 { 0.25rem; }  /* 4px */
.space-2 { 0.5rem; }   /* 8px */
.space-3 { 0.75rem; }  /* 12px */
.space-4 { 1rem; }     /* 16px */
.space-5 { 1.25rem; }  /* 20px */
.space-6 { 1.5rem; }   /* 24px */
.space-8 { 2rem; }     /* 32px */
.space-10 { 2.5rem; }  /* 40px */
.space-12 { 3rem; }    /* 48px */
.space-16 { 4rem; }    /* 64px */
.space-20 { 5rem; }    /* 80px */
```

### 4.2 Layout Guidelines
```css
/* Container Widths */
.container-sm { max-width: 640px; }
.container-md { max-width: 768px; }
.container-lg { max-width: 1024px; }
.container-xl { max-width: 1280px; }
.container-2xl { max-width: 1536px; }

/* Content Spacing */
.content-spacing { margin-bottom: 1.5rem; }
.section-spacing { margin-bottom: 3rem; }
```

---

## 5. COMPONENT LIBRARY

### 5.1 Buttons
```jsx
// Primary Button
<Button variant="primary" size="md">
  Save Property
</Button>

// Secondary Button  
<Button variant="secondary" size="md">
  Cancel
</Button>

// Danger Button
<Button variant="danger" size="md">
  Delete Property
</Button>

// Button Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

```css
/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.15s ease;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-primary {
  background-color: var(--primary-500);
  color: white;
  border-color: var(--primary-500);
}

.btn-primary:hover {
  background-color: var(--primary-600);
  border-color: var(--primary-600);
}

.btn-sm { padding: 0.5rem 0.75rem; font-size: 0.875rem; }
.btn-md { padding: 0.625rem 1rem; font-size: 1rem; }
.btn-lg { padding: 0.75rem 1.25rem; font-size: 1.125rem; }
```

### 5.2 Form Controls
```jsx
// Input Field
<InputField
  label="Property Name"
  type="text"
  placeholder="Enter property name"
  required
  error={errors.name}
/>

// Select Field
<SelectField
  label="Property Status"
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]}
  value={status}
  onChange={setStatus}
/>

// Textarea
<TextareaField
  label="Property Description"
  rows={4}
  placeholder="Describe your property"
/>
```

```css
/* Form Styles */
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--gray-300);
  border-radius: 0.375rem;
  font-size: 1rem;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-error {
  color: var(--error-500);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
```

### 5.3 Cards
```jsx
// Property Card
<Card className="property-card">
  <CardImage src="/property-image.jpg" alt="Villa Paradise" />
  <CardContent>
    <CardTitle>Villa Paradise</CardTitle>
    <CardDescription>Beautiful villa in Seminyak</CardDescription>
    <CardFooter>
      <span className="price">Rp 1,500,000/night</span>
      <Button size="sm">View Details</Button>
    </CardFooter>
  </CardContent>
</Card>
```

```css
/* Card Styles */
.card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.15s ease;
}

.card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-content {
  padding: 1rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 0.5rem;
}

.card-description {
  color: var(--gray-600);
  margin-bottom: 1rem;
}
```

### 5.4 Navigation
```jsx
// Main Navigation
<Navigation>
  <NavItem href="/dashboard" active>Dashboard</NavItem>
  <NavItem href="/properties">Properties</NavItem>
  <NavItem href="/bookings">Bookings</NavItem>
  <NavItem href="/reports">Reports</NavItem>
</Navigation>

// Breadcrumb
<Breadcrumb>
  <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
  <BreadcrumbItem href="/properties">Properties</BreadcrumbItem>
  <BreadcrumbItem current>Villa Paradise</BreadcrumbItem>
</Breadcrumb>
```

### 5.5 Data Display
```jsx
// Table
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Property</TableHead>
      <TableHead>Guest</TableHead>
      <TableHead>Dates</TableHead>
      <TableHead>Amount</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Villa Paradise</TableCell>
      <TableCell>John Doe</TableCell>
      <TableCell>Feb 15-18, 2024</TableCell>
      <TableCell>Rp 4,500,000</TableCell>
      <TableCell>
        <Badge variant="success">Confirmed</Badge>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>

// Status Badge
<Badge variant="success">Confirmed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Cancelled</Badge>
```

---

## 6. LAYOUT PATTERNS

### 6.1 Dashboard Layout
```jsx
<DashboardLayout>
  <Sidebar>
    <SidebarHeader>
      <Logo />
    </SidebarHeader>
    <SidebarNav>
      <NavItem>Dashboard</NavItem>
      <NavItem>Properties</NavItem>
    </SidebarNav>
  </Sidebar>
  
  <MainContent>
    <Header>
      <Breadcrumb />
      <UserMenu />
    </Header>
    
    <PageContent>
      {children}
    </PageContent>
  </MainContent>
</DashboardLayout>
```

### 6.2 Form Layout
```jsx
<FormLayout>
  <FormHeader>
    <PageTitle>Add New Property</PageTitle>
    <FormActions>
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary">Save Property</Button>
    </FormActions>
  </FormHeader>
  
  <FormBody>
    <FormSection title="Basic Information">
      <InputField label="Property Name" />
      <TextareaField label="Description" />
    </FormSection>
    
    <FormSection title="Location">
      <InputField label="Address" />
      <MapPicker />
    </FormSection>
  </FormBody>
</FormLayout>
```

### 6.3 List Layout
```jsx
<ListLayout>
  <ListHeader>
    <PageTitle>Properties</PageTitle>
    <ListActions>
      <SearchInput placeholder="Search properties..." />
      <FilterButton />
      <Button variant="primary">Add Property</Button>
    </ListActions>
  </ListHeader>
  
  <ListFilters>
    <FilterChip>Status: Active</FilterChip>
    <FilterChip>Location: Bali</FilterChip>
  </ListFilters>
  
  <ListContent>
    <PropertyCard />
    <PropertyCard />
  </ListContent>
  
  <ListPagination>
    <Pagination />
  </ListPagination>
</ListLayout>
```

---

## 7. RESPONSIVE DESIGN

### 7.1 Breakpoints
```css
/* Mobile First Approach */
/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) { ... }

/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) { ... }

/* Large devices (desktops, 992px and up) */
@media (min-width: 992px) { ... }

/* Extra large devices (large desktops, 1200px and up) */
@media (min-width: 1200px) { ... }
```

### 7.2 Mobile Navigation
```jsx
// Mobile Menu
<MobileMenu>
  <MobileMenuToggle />
  <MobileMenuContent>
    <MobileNavItem>Dashboard</MobileNavItem>
    <MobileNavItem>Properties</MobileNavItem>
    <MobileNavItem>Bookings</MobileNavItem>
  </MobileMenuContent>
</MobileMenu>
```

### 7.3 Responsive Tables
```jsx
// Mobile-friendly table
<ResponsiveTable>
  <TableRow>
    <TableCell>
      <div className="table-card">
        <div className="table-card-header">
          <span className="property-name">Villa Paradise</span>
          <Badge variant="success">Active</Badge>
        </div>
        <div className="table-card-body">
          <div className="detail-row">
            <span className="label">Guest:</span>
            <span className="value">John Doe</span>
          </div>
          <div className="detail-row">
            <span className="label">Amount:</span>
            <span className="value">Rp 4,500,000</span>
          </div>
        </div>
      </div>
    </TableCell>
  </TableRow>
</ResponsiveTable>
```

---

## 8. INTERACTION PATTERNS

### 8.1 Loading States
```jsx
// Loading Button
<Button loading disabled>
  <Spinner className="mr-2" />
  Saving...
</Button>

// Skeleton Loading
<SkeletonCard>
  <SkeletonLine height="20px" width="60%" />
  <SkeletonLine height="16px" width="80%" />
  <SkeletonLine height="16px" width="40%" />
</SkeletonCard>

// Loading Overlay
<LoadingOverlay>
  <Spinner size="lg" />
  <p>Loading properties...</p>
</LoadingOverlay>
```

### 8.2 Error States
```jsx
// Form Error
<FormField error="Property name is required">
  <InputField />
</FormField>

// Page Error
<ErrorBoundary>
  <ErrorMessage
    title="Something went wrong"
    description="We couldn't load the properties. Please try again."
    action={<Button onClick={retry}>Try Again</Button>}
  />
</ErrorBoundary>

// Inline Error
<Alert variant="error">
  <AlertIcon />
  <AlertTitle>Booking Failed</AlertTitle>
  <AlertDescription>
    The selected dates are no longer available.
  </AlertDescription>
</Alert>
```

### 8.3 Success Feedback
```jsx
// Toast Notification
<Toast variant="success">
  <CheckIcon />
  Property saved successfully!
</Toast>

// Success State
<SuccessState
  icon={<CheckCircleIcon />}
  title="Booking Confirmed"
  description="Your booking has been confirmed. You will receive an email shortly."
  action={<Button>View Booking</Button>}
/>
```

---

## 9. ACCESSIBILITY GUIDELINES

### 9.1 Keyboard Navigation
```jsx
// Focus Management
<FocusTrap>
  <Modal>
    <ModalHeader>
      <ModalTitle>Add Property</ModalTitle>
      <ModalClose aria-label="Close modal" />
    </ModalHeader>
    <ModalBody>
      <InputField autoFocus />
    </ModalBody>
  </Modal>
</FocusTrap>
```

### 9.2 Screen Reader Support
```jsx
// ARIA Labels
<Button aria-label="Delete property Villa Paradise">
  <TrashIcon aria-hidden="true" />
</Button>

// Live Regions
<div aria-live="polite" aria-atomic="true">
  {successMessage}
</div>

// Descriptive Text
<InputField
  label="Property Name"
  aria-describedby="name-help"
/>
<div id="name-help" className="form-help">
  Enter a unique name for your property
</div>
```

### 9.3 Color Contrast
```css
/* Ensure WCAG AA compliance */
/* Normal text: 4.5:1 contrast ratio */
/* Large text: 3:1 contrast ratio */

.text-primary { color: var(--primary-700); } /* High contrast */
.text-secondary { color: var(--gray-600); } /* Medium contrast */
.text-muted { color: var(--gray-500); } /* Low contrast, use sparingly */
```

---

## 10. PERFORMANCE GUIDELINES

### 10.1 Image Optimization
```jsx
// Responsive Images
<Picture>
  <source
    media="(max-width: 768px)"
    srcSet="/property-small.webp 1x, /property-small@2x.webp 2x"
    type="image/webp"
  />
  <img
    src="/property-medium.jpg"
    alt="Villa Paradise exterior view"
    loading="lazy"
    width="400"
    height="300"
  />
</Picture>

// Image Placeholder
<ImageWithPlaceholder
  src="/property-image.jpg"
  placeholder="/property-placeholder.jpg"
  alt="Property image"
/>
```

### 10.2 Code Splitting
```jsx
// Lazy Loading Components
const PropertyDetail = lazy(() => import('./PropertyDetail'));
const BookingForm = lazy(() => import('./BookingForm'));

// Route-based Splitting
<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/properties/:id" element={<PropertyDetail />} />
    <Route path="/bookings/new" element={<BookingForm />} />
  </Routes>
</Suspense>
```

---

## 11. ANIMATION & TRANSITIONS

### 11.1 Micro-interactions
```css
/* Smooth Transitions */
.transition-smooth {
  transition: all 0.15s ease-in-out;
}

.transition-slow {
  transition: all 0.3s ease-in-out;
}

/* Hover Effects */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* Focus States */
.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}
```

### 11.2 Page Transitions
```jsx
// Route Transitions
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

---

## 12. CONTENT GUIDELINES

### 12.1 Writing Style
- **Clear and Concise**: Use simple, direct language
- **Action-Oriented**: Use active voice and action verbs
- **Consistent Terminology**: Maintain consistent naming throughout
- **User-Focused**: Write from the user's perspective

### 12.2 Error Messages
```
❌ Bad: "Error 422: Validation failed"
✅ Good: "Please check the required fields and try again"

❌ Bad: "Invalid input"
✅ Good: "Please enter a valid email address"

❌ Bad: "System error occurred"
✅ Good: "We're having trouble saving your changes. Please try again"
```

### 12.3 Button Labels
```
❌ Bad: "Submit", "OK", "Click Here"
✅ Good: "Save Property", "Confirm Booking", "Upload Photos"
```

---

**UI/UX Guidelines Version**: 1.0  
**Design System**: Property Management System  
**Last Updated**: 2025  
**Framework**: React + Tailwind CSS 