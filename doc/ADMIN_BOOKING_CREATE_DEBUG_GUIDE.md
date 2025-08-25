# Admin Booking Create - Debug & Enhanced Versions Guide

## 📋 Overview

Dokumen ini menjelaskan dua versi alternatif dari halaman Admin Booking Create yang telah dibuat untuk mengatasi masalah fungsionalitas dan meningkatkan user experience:

1. **CreateDebug.tsx** - Versi dengan fungsi debug komprehensif
2. **CreateEnhanced.tsx** - Versi dengan UX yang lebih baik dan modern

---

## 🔧 Versi Debug (CreateDebug.tsx)

### 🎯 Tujuan
Versi debug dirancang untuk membantu developer mengidentifikasi dan memperbaiki masalah pada halaman booking creation dengan logging yang komprehensif.

### ✨ Fitur Debug

#### 1. **Debug Panel**
- **Toggle Debug**: Show/Hide debug panel
- **Debug Modes**: Basic, Detailed, Performance
- **Real-time Monitoring**: API calls, state changes, errors, performance metrics

#### 2. **API Call Logging**
```typescript
interface DebugInfo {
    apiCalls: Array<{
        endpoint: string;
        method: string;
        request: any;
        response: any;
        timestamp: Date;
        status: 'success' | 'error' | 'pending';
        duration: number;
    }>;
}
```

#### 3. **State Change Tracking**
```typescript
stateChanges: Array<{
    component: string;
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: Date;
}>;
```

#### 4. **Error Logging**
```typescript
errors: Array<{
    message: string;
    stack?: string;
    timestamp: Date;
    context: any;
}>;
```

#### 5. **Performance Metrics**
```typescript
performance: {
    componentMountTime: number;
    apiCallCount: number;
    averageApiResponseTime: number;
    renderCount: number;
};
```

### 🛠️ Cara Menggunakan Debug Version

#### 1. **Akses Debug Panel**
```typescript
// Toggle debug panel
const [showDebug, setShowDebug] = useState(false);

// Change debug mode
const [debugMode, setDebugMode] = useState<'basic' | 'detailed' | 'performance'>('basic');
```

#### 2. **Monitor API Calls**
```typescript
// Enhanced API call wrapper dengan debug
const debugApiCall = useCallback(async (endpoint: string, options: RequestInit) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    // Log API call start
    logApiCall(endpoint, options.method || 'GET', options.body, null, 'pending', 0);
    
    try {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'X-Debug-Request-ID': requestId,
                // ... other headers
            }
        });
        
        const responseData = await response.json();
        const duration = Date.now() - startTime;
        
        if (response.ok) {
            logApiCall(endpoint, options.method || 'GET', options.body, responseData, 'success', duration);
            return responseData;
        } else {
            logApiCall(endpoint, options.method || 'GET', options.body, responseData, 'error', duration);
            throw new Error(responseData.error || 'API call failed');
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        logApiCall(endpoint, options.method || 'GET', options.body, { error: error.message }, 'error', duration);
        logError(`API call failed: ${endpoint}`, error.stack, { endpoint, options });
        throw error;
    }
}, [logApiCall, logError]);
```

#### 3. **Track State Changes**
```typescript
// Log state changes
const logStateChange = useCallback((component: string, field: string, oldValue: any, newValue: any) => {
    setDebugInfo(prev => ({
        ...prev,
        stateChanges: [...prev.stateChanges, {
            component,
            field,
            oldValue,
            newValue,
            timestamp: new Date()
        }]
    }));
}, []);

// Usage example
const handlePropertyChange = useCallback((propertyId: string) => {
    const oldProperty = currentProperty;
    logStateChange('PropertySelection', 'property_id', oldProperty?.id, propertyId);
    // ... rest of the logic
}, [currentProperty, logStateChange]);
```

#### 4. **Error Handling**
```typescript
// Log errors with context
const logError = useCallback((message: string, stack?: string, context?: any) => {
    setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, {
            message,
            stack,
            timestamp: new Date(),
            context
        }]
    }));
}, []);

// Usage in catch blocks
} catch (error) {
    logError('Rate calculation failed', error.stack, { 
        propertyId: currentProperty.id,
        checkIn: startDate,
        checkOut: endDate 
    });
}
```

### 📊 Debug Panel Tabs

#### 1. **API Calls Tab**
- Menampilkan semua API calls dengan status (success/error/pending)
- Response time untuk setiap call
- Request dan response data (dalam mode detailed)

#### 2. **State Changes Tab**
- Track semua perubahan state
- Component dan field yang berubah
- Old value vs new value

#### 3. **Errors Tab**
- Semua error yang terjadi
- Stack trace (dalam mode detailed)
- Context informasi

#### 4. **Performance Tab**
- Component mount time
- Total API call count
- Average response time
- Render count

---

## 🎨 Versi Enhanced (CreateEnhanced.tsx)

### 🎯 Tujuan
Versi enhanced dirancang untuk memberikan user experience yang lebih baik dengan interface yang modern dan intuitif.

### ✨ Fitur Enhanced

#### 1. **Progressive Steps**
- **Step 1**: Property Selection
- **Step 2**: Date Selection
- **Step 3**: Guest Details
- **Step 4**: Review & Confirm

#### 2. **Smart Property Selection**
```typescript
// Search functionality
const [searchTerm, setSearchTerm] = useState('');

// Amenity filtering
const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

// Filtered properties
const filteredProperties = useMemo(() => {
    let filtered = properties;
    
    if (searchTerm) {
        filtered = filtered.filter(property => 
            property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            property.address.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    if (selectedAmenities.length > 0) {
        filtered = filtered.filter(property => 
            selectedAmenities.every(amenity => 
                property.amenities?.some(prop => prop.name === amenity)
            )
        );
    }
    
    return filtered;
}, [properties, searchTerm, selectedAmenities]);
```

#### 3. **Visual Progress Indicator**
```typescript
// Progress steps dengan visual feedback
{[
    { id: 'property', label: 'Select Property', icon: Building2 },
    { id: 'dates', label: 'Choose Dates', icon: Calendar },
    { id: 'guests', label: 'Guest Details', icon: Users },
    { id: 'review', label: 'Review & Confirm', icon: CheckCircle }
].map((step, index) => {
    const Icon = step.icon;
    const isActive = activeTab === step.id;
    const isCompleted = ['property', 'dates', 'guests'].indexOf(activeTab) > index;
    
    return (
        <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isActive ? 'bg-blue-600 border-blue-600 text-white' :
                isCompleted ? 'bg-green-600 border-green-600 text-white' :
                'bg-gray-100 border-gray-300 text-gray-500'
            }`}>
                <Icon className="h-5 w-5" />
            </div>
            <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-blue-600' :
                isCompleted ? 'text-green-600' :
                'text-gray-500'
            }`}>
                {step.label}
            </span>
        </div>
    );
})}
```

#### 4. **Enhanced Property Cards**
```typescript
// Property cards dengan visual feedback
<Card 
    key={property.id}
    className={`cursor-pointer transition-all hover:shadow-lg ${
        currentProperty?.id === property.id 
            ? 'ring-2 ring-blue-500 bg-blue-50' 
            : 'hover:bg-gray-50'
    }`}
    onClick={() => handlePropertySelect(property)}
>
    <CardContent className="p-4">
        <div className="aspect-video bg-gray-200 rounded-lg mb-3 overflow-hidden">
            {property.cover_image ? (
                <img 
                    src={property.cover_image} 
                    alt={property.name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-gray-500" />
                </div>
            )}
        </div>
        
        <h4 className="font-semibold text-lg mb-1">{property.name}</h4>
        <p className="text-sm text-gray-600 mb-2 flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            {property.address}
        </p>
        
        <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
                <span className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {property.capacity}-{property.capacity_max}
                </span>
                <span className="flex items-center">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {property.formatted_base_rate}
                </span>
            </div>
            <Badge variant="secondary">
                {property.amenities?.length || 0} amenities
            </Badge>
        </div>
    </CardContent>
</Card>
```

#### 5. **Real-time Rate Calculation**
```typescript
// Enhanced rate calculation dengan visual feedback
{rateCalculation && (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Rate Calculation
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                    {rateCalculation.formatted.total_amount}
                </div>
                <div className="text-sm text-gray-600">
                    for {rateCalculation.nights} nights
                </div>
            </div>
            
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>Base Rate:</span>
                    <span>Rp {rateCalculation.base_amount.toLocaleString()}</span>
                </div>
                {rateCalculation.weekend_premium > 0 && (
                    <div className="flex justify-between text-amber-600">
                        <span>Weekend Premium:</span>
                        <span>+Rp {rateCalculation.weekend_premium.toLocaleString()}</span>
                    </div>
                )}
                {/* ... more breakdown items */}
            </div>
        </CardContent>
    </Card>
)}
```

---

## 🚀 Implementasi

### 1. **Setup Routes**
```php
// routes/web.php
Route::get('/admin/booking-management/create-debug', [BookingManagementController::class, 'createDebug'])
    ->name('admin.booking-management.create-debug');
Route::get('/admin/booking-management/create-enhanced', [BookingManagementController::class, 'createEnhanced'])
    ->name('admin.booking-management.create-enhanced');
```

### 2. **Controller Methods**
```php
// app/Http/Controllers/Admin/BookingManagementController.php

public function createDebug()
{
    $properties = Property::with(['amenities', 'media'])->get();
    
    return Inertia::render('Admin/Bookings/CreateDebug', [
        'properties' => $properties,
    ]);
}

public function createEnhanced()
{
    $properties = Property::with(['amenities', 'media'])->get();
    
    return Inertia::render('Admin/Bookings/CreateEnhanced', [
        'properties' => $properties,
    ]);
}
```

### 3. **Navigation Links**
```typescript
// Add to admin navigation
<Link href={route('admin.booking-management.create-debug')}>
    Create Booking (Debug)
</Link>
<Link href={route('admin.booking-management.create-enhanced')}>
    Create Booking (Enhanced)
</Link>
```

---

## 🔍 Troubleshooting dengan Debug Version

### 1. **API Call Issues**
```typescript
// Check API calls tab untuk melihat:
- Endpoint yang dipanggil
- Request payload
- Response data
- Response time
- Error messages
```

### 2. **State Management Issues**
```typescript
// Check State Changes tab untuk melihat:
- Component mana yang berubah
- Field apa yang berubah
- Old value vs new value
- Timing perubahan
```

### 3. **Performance Issues**
```typescript
// Check Performance tab untuk melihat:
- Component mount time
- API call count
- Average response time
- Render count
```

### 4. **Error Debugging**
```typescript
// Check Errors tab untuk melihat:
- Error messages
- Stack traces
- Context information
- Timestamp errors
```

---

## 📋 Checklist Implementasi

### ✅ Debug Version
- [ ] Debug panel dengan toggle
- [ ] API call logging
- [ ] State change tracking
- [ ] Error logging
- [ ] Performance metrics
- [ ] Debug modes (basic/detailed/performance)

### ✅ Enhanced Version
- [ ] Progressive steps
- [ ] Property search & filtering
- [ ] Visual progress indicator
- [ ] Enhanced property cards
- [ ] Real-time rate calculation
- [ ] Modern UI/UX design

### ✅ Integration
- [ ] Routes setup
- [ ] Controller methods
- [ ] Navigation links
- [ ] Error handling
- [ ] Validation
- [ ] Testing

---

## 🎯 Best Practices

### 1. **Debug Version**
- Gunakan hanya untuk development/testing
- Jangan deploy ke production
- Monitor performance impact
- Clear debug logs secara berkala

### 2. **Enhanced Version**
- Test semua user flows
- Validate responsive design
- Optimize performance
- Monitor user feedback

### 3. **General**
- Follow Laravel 12.x patterns
- Use React 18+ features
- Implement proper error handling
- Add comprehensive testing

---

## 📞 Support

Jika mengalami masalah dengan implementasi:

1. **Debug Issues**: Gunakan debug panel untuk identifikasi masalah
2. **API Issues**: Check network tab dan debug logs
3. **State Issues**: Monitor state changes tab
4. **Performance Issues**: Check performance metrics

---

**📅 Last Updated**: 2025  
**📝 Version**: 1.0  
**👤 Maintained By**: Development Team
