# 🔧 **REFACTORING GUIDE - Homsjogja Property Management System website Homsjogja**

## 📋 **MASALAH YANG DIIDENTIFIKASI**

### **1. Code Smell - Duplikasi Fungsi**
```php
// ❌ BAD: Rate calculation di 5+ tempat berbeda
// - AvailabilityService::calculateRate()
// - Property::calculateRate() 
// - BookingController::calculateRate()
// - PropertyController::calculateRate()
// - Frontend hooks (use-property-availability.tsx)

// ✅ GOOD: Centralized RateCalculationService
$rateCalculation = $this->rateCalculationService->calculateRate(
    $property, $checkIn, $checkOut, $guestCount
);
```

### **2. Business Logic Tercampur dengan UI**
```php
// ❌ BAD: Controller terlalu tebal
class BookingController {
    public function store(Request $request) {
        // 50+ lines of validation
        // 30+ lines of business logic
        // 20+ lines of file handling
        // 15+ lines of database operations
    }
}

// ✅ GOOD: Separation of concerns
class BookingControllerRefactored {
    public function store(CreateBookingRequest $request) {
        $bookingRequest = BookingRequestVO::fromArray($request->validated());
        $booking = $this->bookingService->createBooking($bookingRequest, auth()->user());
        return redirect()->route('bookings.confirmation', $booking->booking_number);
    }
}
```

### **3. Tidak Ada Pemisahan Concerns**
```php
// ❌ BAD: Everything in controller
class PaymentController {
    public function store(Request $request) {
        // Validation
        $validated = $request->validate([...]);
        
        // Business logic
        $paidAmount = $booking->payments()->sum('amount');
        $pendingAmount = $booking->total_amount - $paidAmount;
        
        // File handling
        $path = $request->file('proof')->store('payments');
        
        // Database operations
        $payment = Payment::create([...]);
        
        // Event dispatching
        event(new PaymentCreated($payment));
    }
}

// ✅ GOOD: Layered architecture
class PaymentControllerRefactored {
    public function store(CreatePaymentRequest $request) {
        $payment = $this->paymentService->createPayment($request, auth()->user());
        return redirect()->route('payments.success', $payment);
    }
}
```

---

## 🏗️ **SOLUSI ARSITEKTUR - LAYERED ARCHITECTURE**

### **Layer 1: Domain Layer (Core Business Logic)**
```
app/Domain/
├── Booking/
│   ├── ValueObjects/
│   │   ├── RateCalculation.php
│   │   ├── BookingRequest.php
│   │   └── PaymentRequest.php
│   ├── Entities/
│   │   ├── Booking.php
│   │   └── Payment.php
│   └── Services/
│       ├── RateCalculationService.php
│       └── BookingService.php
```

### **Layer 2: Application Layer (Use Cases)**
```
app/Services/
├── BookingServiceRefactored.php
├── PaymentServiceRefactored.php
├── PropertyServiceRefactored.php
└── AvailabilityService.php
```

### **Layer 3: Infrastructure Layer (Data Access)**
```
app/Repositories/
├── BookingRepository.php
├── PaymentRepository.php
├── PropertyRepository.php
└── UserRepository.php
```

### **Layer 4: Presentation Layer (HTTP/UI)**
```
app/Http/
├── Controllers/
│   ├── BookingControllerRefactored.php
│   ├── PaymentControllerRefactored.php
│   └── PropertyControllerRefactored.php
├── Requests/
│   ├── Booking/
│   │   ├── CreateBookingRequest.php
│   │   └── UpdateBookingRequest.php
│   └── Payment/
│       ├── CreatePaymentRequest.php
│       └── VerifyPaymentRequest.php
└── Resources/
    ├── BookingResource.php
    └── PaymentResource.php
```

---

## 🔄 **MIGRATION STRATEGY**

### **Phase 1: Create New Architecture (COMPLETED)**
- ✅ Value Objects
- ✅ Repository Pattern
- ✅ Centralized Services
- ✅ Form Requests
- ✅ Refactored Controllers

### **Phase 2: Gradual Migration**
```php
// Step 1: Use new services alongside old ones
class BookingController extends Controller {
    public function store(CreateBookingRequest $request) {
        // Use new service for new bookings
        if ($request->input('use_new_service')) {
            return $this->newBookingService->createBooking($request);
        }
        
        // Fallback to old service
        return $this->oldBookingService->createBooking($request);
    }
}
```

### **Phase 3: Frontend Migration**
```typescript
// Step 1: Create new hooks
export function useRateCalculation(options: UseRateCalculationOptions) {
    // Centralized rate calculation logic
}

// Step 2: Replace old hooks gradually
// Old: use-property-availability.tsx
// New: use-rate-calculation.tsx
```

### **Phase 4: Complete Migration**
- Remove old services
- Update all controllers
- Update all frontend components
- Remove duplicate code

---

## 📊 **BENEFITS OF REFACTORING**

### **1. Maintainability**
```php
// ❌ OLD: Hard to modify rate calculation
// Need to update 5+ files when business rules change

// ✅ NEW: Single source of truth
class RateCalculationService {
    public function calculateRate(...) {
        // All rate calculation logic here
        // Easy to modify business rules
    }
}
```

### **2. Testability**
```php
// ❌ OLD: Hard to test
class BookingController {
    public function store(Request $request) {
        // 100+ lines of mixed concerns
        // Hard to unit test
    }
}

// ✅ NEW: Easy to test
class BookingServiceRefactored {
    public function createBooking(BookingRequest $request, User $user): Booking {
        // Pure business logic
        // Easy to unit test
    }
}
```

### **3. Reusability**
```php
// ❌ OLD: Duplicated logic
// Rate calculation in 5+ places

// ✅ NEW: Reusable service
$rateCalculation = $this->rateCalculationService->calculateRate(...);
// Can be used in:
// - Booking creation
// - Rate preview
// - Admin interface
// - API endpoints
```

### **4. Scalability**
```php
// ✅ NEW: Easy to add features
class RateCalculationService {
    public function calculateRate(...) {
        // Base calculation
        $baseAmount = $this->calculateBaseAmount(...);
        
        // Easy to add new features
        $seasonalPremium = $this->calculateSeasonalPremium(...);
        $holidayPremium = $this->calculateHolidayPremium(...);
        $specialDiscount = $this->calculateSpecialDiscount(...);
    }
}
```

---

## 🧪 **TESTING STRATEGY**

### **Unit Tests**
```php
class RateCalculationServiceTest extends TestCase {
    public function test_calculate_rate_with_weekend_premium() {
        $service = new RateCalculationService();
        $property = Property::factory()->create([
            'base_rate' => 1000000,
            'weekend_premium_percent' => 25
        ]);
        
        $calculation = $service->calculateRate(
            $property, 
            '2024-01-06', // Saturday
            '2024-01-08', // Monday
            2
        );
        
        $this->assertEquals(250000, $calculation->weekendPremium);
    }
}
```

### **Integration Tests**
```php
class BookingServiceTest extends TestCase {
    public function test_create_booking_with_rate_calculation() {
        $service = new BookingServiceRefactored(
            new BookingRepository(),
            new RateCalculationService(),
            new AvailabilityService()
        );
        
        $booking = $service->createBooking($request, $user);
        
        $this->assertNotNull($booking->total_amount);
        $this->assertGreaterThan(0, $booking->total_amount);
    }
}
```

---

## 🚀 **IMPLEMENTATION ROADMAP**

### **Week 1-2: Core Infrastructure**
- [x] Create Value Objects
- [x] Create Repository Pattern
- [x] Create Centralized Services
- [x] Create Form Requests

### **Week 3-4: Service Migration**
- [ ] Migrate BookingService
- [ ] Migrate PaymentService
- [ ] Migrate PropertyService
- [ ] Update Controllers

### **Week 5-6: Frontend Migration**
- [ ] Create centralized hooks
- [ ] Migrate rate calculation logic
- [ ] Update React components
- [ ] Remove duplicate code

### **Week 7-8: Testing & Cleanup**
- [ ] Write comprehensive tests
- [ ] Remove old services
- [ ] Update documentation
- [ ] Performance optimization

---

## 📈 **PERFORMANCE IMPROVEMENTS**

### **1. Reduced Database Queries**
```php
// ❌ OLD: Multiple queries
$bookings = Booking::where('property_id', $propertyId)->get();
foreach ($bookings as $booking) {
    $booking->property; // N+1 query
    $booking->payments; // N+1 query
}

// ✅ NEW: Optimized queries
$bookings = $this->bookingRepository->findByProperty($propertyId);
// Uses eager loading and optimized queries
```

### **2. Caching Strategy**
```php
// ✅ NEW: Intelligent caching
class RateCalculationService {
    public function calculateRate(...) {
        $cacheKey = "rate:{$propertyId}:{$checkIn}:{$checkOut}:{$guestCount}";
        
        return Cache::remember($cacheKey, 300, function () {
            // Calculate rate
        });
    }
}
```

### **3. Memory Optimization**
```php
// ✅ NEW: Value objects (immutable, memory efficient)
class RateCalculation {
    public function __construct(
        public readonly float $totalAmount,
        public readonly int $nights,
        // ... other readonly properties
    ) {}
}
```

---

## 🎯 **SUCCESS METRICS**

### **Code Quality**
- [ ] Reduce code duplication by 80%
- [ ] Increase test coverage to 90%+
- [ ] Reduce cyclomatic complexity
- [ ] Improve maintainability index

### **Performance**
- [ ] Reduce database queries by 50%
- [ ] Improve response time by 30%
- [ ] Reduce memory usage by 20%

### **Developer Experience**
- [ ] Faster feature development
- [ ] Easier debugging
- [ ] Better code navigation
- [ ] Reduced bug count

---

## 🔧 **NEXT STEPS**

1. **Review the new architecture** with the team
2. **Start with one module** (e.g., Booking) as proof of concept
3. **Gradually migrate** other modules
4. **Write comprehensive tests** for new services
5. **Monitor performance** improvements
6. **Document best practices** for future development

This refactoring approach will transform the codebase from a monolithic, tightly-coupled system into a clean, maintainable, and scalable architecture that follows SOLID principles and modern Laravel best practices. 