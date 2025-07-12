# Properties/Show.tsx - Masalah dan Solusi

## 🚨 MASALAH UTAMA

### 1. **Konflik Backend-Frontend**
File Properties/Show.tsx saat ini memiliki 861 baris dengan masalah:

- **Double Rate Calculation**: Backend menghitung rate di PropertyController + Frontend pakai usePropertyRateCalculator hook
- **State Management Berantakan**: Multiple useState, complex URL handling
- **Mixed Logic**: Business logic tercampur dengan UI logic
- **Redundant Hooks**: useAvailability + usePropertyRateCalculator yang redundant

### 2. **Performance Issues**
- Manual URL manipulation dengan window.location
- Complex image gallery logic dalam main component
- Amenity categorization dilakukan di component level
- No proper error boundaries

## ✅ SOLUSI YANG DIREKOMENDASIKAN

### **A. Bersihkan Backend (PropertyController.php)**

Remove manual rate calculation dan fokus pada data loading:

```php
// ✅ PropertyController::show() yang bersih
public function show(Request $request, Property $property): Response
{
    $property->load([
        'owner',
        'amenities' => function ($query) {
            $query->where('property_amenities.is_available', true)
                  ->orderBy('category')->orderBy('name');
        },
        'media' => function ($query) {
            $query->orderBy('display_order');
        },
        'seasonalRates' => function ($query) {
            $query->where('is_active', true)->orderBy('priority', 'desc');
        }
    ]);

    $similarProperties = Property::active()
        ->where('id', '!=', $property->id)
        ->with(['media'])->limit(4)->get();

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

### **B. Refactor Frontend dengan Component Extraction**

**1. Main Component (300 lines max)**
```typescript
export default function PropertyShow({ property, similarProperties, searchParams }) {
    const [searchDates, setSearchDates] = useState({
        check_in: searchParams.check_in || '',
        check_out: searchParams.check_out || '',
        guests: searchParams.guests || 2
    });

    // HANYA gunakan usePropertyRateCalculator
    const rateCalculator = usePropertyRateCalculator(property.slug);

    return (
        <AppLayout>
            <PropertyHeader property={property} />
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <PropertyImageGallery images={property.media} />
                    <PropertyDetailsTabs property={property} />
                    <SimilarProperties properties={similarProperties} />
                </div>

                <BookingSidebar 
                    property={property}
                    searchDates={searchDates}
                    onDateChange={setSearchDates}
                    rateCalculator={rateCalculator}
                />
            </div>
        </AppLayout>
    );
}
```

**2. Extract Components:**

- **PropertyImageGallery.tsx** (150 lines)
- **BookingSidebar.tsx** (200 lines) 
- **PropertyDetailsTabs.tsx** (250 lines)
- **PropertyHeader.tsx** (100 lines)

### **C. Manfaat Setelah Refactoring**

**Performance:**
- ✅ 60-80% reduction dalam API calls (usePropertyRateCalculator caching)
- ✅ Debouncing untuk prevent spam requests
- ✅ Clean state management

**Maintainability:**
- ✅ Reusable components
- ✅ Single source of truth untuk rate calculation
- ✅ Clear separation of concerns
- ✅ Proper TypeScript interfaces

**User Experience:**
- ✅ Real-time rate calculations
- ✅ Better loading states
- ✅ Graceful error handling
- ✅ Responsive design improvements

## 🛠️ LANGKAH IMPLEMENTASI

### **Phase 1: Backend Cleanup**
1. Remove manual rate calculation dari PropertyController::show()
2. Simplify data loading
3. Test API endpoints

### **Phase 2: Component Extraction**
1. Extract PropertyImageGallery component
2. Extract BookingSidebar component
3. Extract PropertyDetailsTabs component
4. Update main Properties/Show.tsx

### **Phase 3: Testing & Optimization**
1. Test rate calculation accuracy
2. Test responsive design
3. Performance testing
4. Error handling testing

## 📋 File Yang Perlu Dibuat

1. **components/PropertyImageGallery.tsx**
2. **components/BookingSidebar.tsx**
3. **components/PropertyDetailsTabs.tsx**
4. **components/PropertyHeader.tsx**
5. **utils/propertyHelpers.ts**

## 🎯 Expected Results

**Before:** 861 lines, complex mixed logic, poor performance
**After:** Clean, modular, performant, maintainable

Dengan refactoring ini, Properties/Show.tsx akan menjadi:
- ✅ Lebih cepat (intelligent caching)
- ✅ Lebih maintainable (modular components)
- ✅ Lebih user-friendly (better UX)
- ✅ Type-safe dan error-resistant 