# Property Show Page Refactoring Guide

## 🚨 Current Issues with Properties/Show.tsx

### 1. **Multiple Conflicting Hooks and State Management**
```typescript
// ❌ PROBLEMS: 
- Multiple hooks: useAvailability + usePropertyRateCalculator (redundant)
- Complex state management with multiple useState declarations
- Manual URL parameter handling with window.location
- Mixed logic between backend calculation and frontend hooks
```

### 2. **Backend-Frontend Conflicts**
```typescript
// ❌ CONFLICTS:
- property.current_rate_calculation (backend) vs usePropertyRateCalculator (frontend)
- calculateDiscountPrice() - fake discount calculation that conflicts with real pricing
- Mixed property calculation in controller vs hook
- Inconsistent error handling between backend and frontend
```

### 3. **Complex UI Logic**
```typescript
// ❌ COMPLEX UI:
- Image gallery logic mixed with business logic
- Amenity categorization done in component
- Manual date formatting and validation
- Too many conditional renders
```

## 🛠️ Recommended Refactoring Solution

### **Phase 1: Cleanup Backend (PropertyController.php)**

#### A. Remove Mixed Rate Calculation Logic
```php
// ❌ REMOVE from PropertyController::show()
try {
    $rateCalculation = $this->availabilityService->calculateRate($property, $checkIn, $checkOut, $guestCount);
    $property->current_rate_calculation = $rateCalculation;
    // ... more manual calculation
} catch (\Exception $e) {
    // Fallback logic
}
```

#### B. Simplified Controller Response
```php
// ✅ CLEAN PropertyController::show()
public function show(Request $request, Property $property): Response
{
    $property->load([
        'owner',
        'amenities' => function ($query) {
            $query->where('property_amenities.is_available', true)
                  ->orderBy('category', 'asc')
                  ->orderBy('name', 'asc');
        },
        'media' => function ($query) {
            $query->orderBy('display_order')->orderBy('created_at', 'desc');
        },
        'seasonalRates' => function ($query) {
            $query->where('is_active', true)
                  ->orderBy('priority', 'desc');
        }
    ]);

    // Get similar properties
    $similarProperties = Property::active()
        ->where('id', '!=', $property->id)
        ->where(function ($query) use ($property) {
            $query->whereBetween('base_rate', [
                $property->base_rate * 0.7,
                $property->base_rate * 1.3
            ])
            ->orWhere('capacity', $property->capacity);
        })
        ->with(['media' => function ($query) {
            $query->orderBy('display_order');
        }])
        ->limit(4)
        ->get();

    return Inertia::render('Properties/Show', [
        'property' => $property,
        'similarProperties' => $similarProperties,
        'searchParams' => [
            'check_in' => $request->get('check_in', ''),
            'check_out' => $request->get('check_out', ''),
            'guests' => (int) $request->get('guests', 2)
        ]
    ]);
}
```

### **Phase 2: Refactor Frontend Component**

#### A. Simplified State Management
```typescript
// ✅ CLEAN State Management
const [currentImageIndex, setCurrentImageIndex] = useState(0);
const [searchDates, setSearchDates] = useState({
    check_in: searchParams.check_in || '',
    check_out: searchParams.check_out || '',
    guests: searchParams.guests || 2
});
```

#### B. Single Source of Truth for Rate Calculation
```typescript
// ✅ ONLY use usePropertyRateCalculator hook
const {
    data: rateCalculation,
    loading: isCalculatingRate,
    error: rateError,
    isReady: rateReady,
    formattedTotal,
    formattedPerNight,
    nights,
    hasSeasonalPremium,
    hasWeekendPremium,
    calculateRate,
    calculateRateImmediate,
    reset: resetRate,
    validateRequest
} = usePropertyRateCalculator(property.slug, {
    debounceMs: 600,
    cacheTimeout: 10 * 60 * 1000
});
```

#### C. Clean Component Structure
```typescript
// ✅ ORGANIZED Component Structure
return (
    <AppLayout>
        <Head title={property.name} />
        
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                
                {/* Breadcrumb & Header */}
                <PropertyHeader property={property} />
                
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    
                    {/* Main Content */}
                    <div className="xl:col-span-2 space-y-8">
                        <PropertyImageGallery images={images} />
                        <PropertyDetailsTabs property={property} />
                        <SimilarProperties properties={similarProperties} />
                    </div>

                    {/* Booking Sidebar */}
                    <div className="space-y-6">
                        <BookingSidebar 
                            property={property}
                            rateCalculation={rateCalculation}
                            isCalculatingRate={isCalculatingRate}
                            searchDates={searchDates}
                            onDateChange={setSearchDates}
                        />
                        <ContactCard />
                    </div>
                </div>
            </div>
        </div>
    </AppLayout>
);
```

### **Phase 3: Extract Reusable Components**

#### A. PropertyImageGallery Component
```typescript
// ✅ components/PropertyImageGallery.tsx
interface PropertyImageGalleryProps {
    images: MediaFile[];
    propertyName: string;
}

export function PropertyImageGallery({ images, propertyName }: PropertyImageGalleryProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const featuredImage = images.find(img => img.is_featured) || images[0];
    
    if (!images.length) {
        return <PropertyPlaceholder />;
    }
    
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <MainImageDisplay 
                    image={images[currentImageIndex] || featuredImage}
                    onNext={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                    onPrev={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                    currentIndex={currentImageIndex}
                    totalImages={images.length}
                />
                <ThumbnailStrip 
                    images={images}
                    currentIndex={currentImageIndex}
                    onSelect={setCurrentImageIndex}
                />
            </CardContent>
        </Card>
    );
}
```

#### B. BookingSidebar Component
```typescript
// ✅ components/BookingSidebar.tsx
interface BookingSidebarProps {
    property: Property;
    rateCalculation: RateCalculationResponse | null;
    isCalculatingRate: boolean;
    searchDates: SearchDates;
    onDateChange: (dates: SearchDates) => void;
}

export function BookingSidebar({ 
    property, 
    rateCalculation, 
    isCalculatingRate, 
    searchDates, 
    onDateChange 
}: BookingSidebarProps) {
    return (
        <Card className="sticky top-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Book Your Stay
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <DateGuestInputs 
                    searchDates={searchDates}
                    onDateChange={onDateChange}
                    maxGuests={property.capacity_max}
                />
                
                <Separator />
                
                <RateCalculationDisplay 
                    rateCalculation={rateCalculation}
                    isCalculatingRate={isCalculatingRate}
                    property={property}
                />
                
                <BookingActions 
                    property={property}
                    searchDates={searchDates}
                    rateReady={!!rateCalculation}
                    isCalculatingRate={isCalculatingRate}
                />
            </CardContent>
        </Card>
    );
}
```

#### C. PropertyDetailsTabs Component
```typescript
// ✅ components/PropertyDetailsTabs.tsx
export function PropertyDetailsTabs({ property }: { property: Property }) {
    const amenitiesByCategory = groupAmenitiesByCategory(property.amenities);
    
    return (
        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="amenities">Amenities ({property.amenities?.length || 0})</TabsTrigger>
                <TabsTrigger value="policies">Policies</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
                <PropertyOverview property={property} />
            </TabsContent>
            
            <TabsContent value="amenities">
                <PropertyAmenities amenitiesByCategory={amenitiesByCategory} />
            </TabsContent>
            
            <TabsContent value="policies">
                <PropertyPolicies property={property} />
            </TabsContent>
            
            <TabsContent value="location">
                <PropertyLocation property={property} />
            </TabsContent>
        </Tabs>
    );
}
```

## 🎯 Benefits of This Refactoring

### **1. Clear Separation of Concerns**
- **Backend**: Only handles data fetching and relationships
- **Frontend**: Handles UI state and rate calculations via hook
- **Components**: Single responsibility principle

### **2. Improved Performance**
- **Caching**: usePropertyRateCalculator provides intelligent caching
- **Debouncing**: Prevents spam API requests
- **Lazy Loading**: Components load only when needed

### **3. Better Maintainability**
- **Reusable Components**: ImageGallery, BookingSidebar can be used elsewhere
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Consistent error states across all components

### **4. Enhanced User Experience**
- **Real-time Calculations**: Dynamic pricing updates
- **Loading States**: Clear feedback during calculations
- **Error Recovery**: Graceful error handling with retry options

## 📋 Implementation Checklist

### **Phase 1: Backend Cleanup**
- [ ] Remove manual rate calculation from PropertyController::show()
- [ ] Simplify property data loading
- [ ] Clean up unused imports and dependencies
- [ ] Update property relationships loading

### **Phase 2: Frontend Refactoring**
- [ ] Remove conflicting hooks (useAvailability if redundant)
- [ ] Simplify state management
- [ ] Extract reusable components
- [ ] Implement proper TypeScript interfaces

### **Phase 3: Component Extraction**
- [ ] Create PropertyImageGallery component
- [ ] Create BookingSidebar component  
- [ ] Create PropertyDetailsTabs component
- [ ] Create utility functions for data transformation

### **Phase 4: Testing & Optimization**
- [ ] Test rate calculation accuracy
- [ ] Test component reusability
- [ ] Verify performance improvements
- [ ] Update documentation

## 🔧 Utility Functions Needed

### **1. Data Transformation Utilities**
```typescript
// utils/propertyHelpers.ts
export function groupAmenitiesByCategory(amenities: Amenity[]) {
    return amenities.reduce((acc, amenity) => {
        const category = amenity.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(amenity);
        return acc;
    }, {} as Record<string, Amenity[]>);
}

export function formatCheckInTime(time: string): string {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

export function getFeaturedImage(images: MediaFile[]): MediaFile | null {
    return images.find(img => img.is_featured) || images[0] || null;
}
```

### **2. URL Management Utilities**
```typescript
// utils/urlHelpers.ts
export function updateSearchParams(searchDates: SearchDates) {
    const url = new URL(window.location.href);
    url.searchParams.set('check_in', searchDates.check_in);
    url.searchParams.set('check_out', searchDates.check_out);
    url.searchParams.set('guests', searchDates.guests.toString());
    window.history.replaceState({}, '', url.toString());
}
```

## 🚀 Expected Results

### **Before Refactoring:**
- ❌ 861 lines of complex, mixed logic
- ❌ Multiple conflicting hooks
- ❌ Backend-frontend calculation conflicts
- ❌ Poor component reusability
- ❌ Complex state management

### **After Refactoring:**
- ✅ ~300 lines in main component
- ✅ Single source of truth for rate calculation
- ✅ Reusable components (~150 lines each)
- ✅ Clean separation of concerns
- ✅ Improved performance and maintainability
- ✅ Better user experience with proper loading states
- ✅ Type-safe implementation

## 📝 Notes

1. **usePropertyRateCalculator** is already implemented and tested - use this as the primary rate calculation method
2. **Backend should focus on data relationships** - remove calculation logic
3. **Component extraction** will make the code more testable and reusable
4. **TypeScript interfaces** should be updated to reflect the new component structure
5. **Error boundaries** should be implemented for better error handling

This refactoring will transform the chaotic Properties/Show.tsx into a clean, maintainable, and performant component while leveraging the excellent usePropertyRateCalculator hook that was already implemented. 