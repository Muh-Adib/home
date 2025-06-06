# 🗄️ Property Management System - Models Documentation

**Laravel 12.x Eloquent Models**  
**Terakhir Update**: Januari 2025  
**Status Progress**: 🚧 **80% Complete** - Core Models Ready, Minor Enhancements Needed

---

## 📊 **Progress Overview**

| Model | Status | Completion | Relations | Issues | Priority |
|-------|--------|------------|-----------|--------|----------|
| Property | ✅ **COMPLETE** | 95% | 5 relations | Minor optimization | ⭐⭐⭐ |
| Booking | ✅ **COMPLETE** | 90% | 6 relations | Add validation | ⭐⭐⭐ |
| Payment | ✅ **COMPLETE** | 85% | 3 relations | Add audit trail | ⭐⭐ |
| User | ✅ **COMPLETE** | 90% | 4 relations | Add permissions | ⭐⭐ |
| UserProfile | ✅ **COMPLETE** | 95% | 1 relation | Complete | ⭐ |
| Amenity | ✅ **COMPLETE** | 95% | 1 relation | Complete | ⭐ |
| PropertyMedia | ✅ **COMPLETE** | 85% | 1 relation | Add processing | ⭐⭐ |
| PaymentMethod | ✅ **COMPLETE** | 95% | 1 relation | Complete | ⭐ |
| Stub Models | ⚠️ **INCOMPLETE** | 10% | 0 relations | Need implementation | ⭐⭐⭐ |

---

## 🏗️ **Database Architecture**

```
Models Relationship Map:
┌─────────────────────────────────────────────────────────────────┐
│                     PROPERTY MANAGEMENT SYSTEM                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    1:N     ┌─────────────┐    1:N     ┌──────┐│
│  │    User     │◄──────────►│  Property   │◄──────────►│Media ││
│  │             │            │             │            │      ││
│  └─────┬───────┘            └──────┬──────┘            └──────┘│
│        │1:1                        │N:M                       │
│        ▼                           ▼                          │
│  ┌─────────────┐            ┌─────────────┐                   │
│  │UserProfile  │            │  Amenity    │                   │
│  │             │            │             │                   │
│  └─────────────┘            └─────────────┘                   │
│                                                               │
│  ┌─────────────┐    1:N     ┌─────────────┐    1:N     ┌──────┐│
│  │   Booking   │◄──────────►│   Payment   │◄──────────►│Method││
│  │             │            │             │            │      ││
│  └─────┬───────┘            └─────────────┘            └──────┘│
│        │1:N                                                   │
│        ▼                                                      │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐      │
│  │BookingGuest │   │BookingService│   │BookingWorkflow  │      │
│  │   (stub)    │   │   (stub)    │   │     (stub)      │      │
│  └─────────────┘   └─────────────┘   └─────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📖 **Core Models Documentation**

### 1. 🏠 **Property.php** - Core Property Management

**Status**: ✅ **Production Ready** (95% Complete)  
**Lines**: 245 | **Methods**: 15 | **Relations**: 5

#### **Model Features**
- 🏡 **Property Types**: Villa, Homestay specialization
- 👥 **Flexible Capacity**: Base + extra bed calculation
- 💰 **Dynamic Pricing**: Base/weekend/holiday rates
- 📍 **Location Services**: GPS coordinates, Google Maps integration
- 🖼️ **Media Management**: Multiple image/video support
- 📊 **Analytics Ready**: Occupancy, revenue tracking

**Remaining Tasks**:
- [ ] Add property rating/review aggregation
- [ ] Implement advanced search scopes

---

### 2. 📅 **Booking.php** - Comprehensive Booking Management

**Status**: ✅ **Production Ready** (90% Complete)  
**Lines**: 337 | **Methods**: 20 | **Relations**: 6

#### **Model Features**
- 📝 **Guest Information**: Complete contact details
- 👥 **Guest Breakdown**: Male, female, children count
- 🛏️ **Extra Bed System**: Auto-calculation based on capacity
- 💳 **Payment Integration**: Multiple payment tracking
- 🔄 **Workflow Management**: Status tracking with timestamps
- 📅 **Calendar Integration**: Full calendar support

**Remaining Tasks**:
- [ ] Add booking modification history
- [ ] Implement guest communication log

---

## ⚠️ **Stub Models (Need Implementation)**

### **Critical Models to Implement**

#### 1. **BookingGuest.php** - Guest Details Management
```php
// Required Schema:
- id, booking_id, guest_type, full_name, id_number
- phone, email, gender, age_category
- relationship_to_primary, created_at, updated_at
```

#### 2. **BookingService.php** - Additional Services
```php
// Required Schema:
- id, booking_id, service_name, service_type
- quantity, unit_price, total_price, notes
- created_at, updated_at
```

#### 3. **BookingWorkflow.php** - Status Change Tracking
```php
// Required Schema:
- id, booking_id, from_status, to_status
- changed_by, changed_at, notes
- created_at, updated_at
```

#### 4. **PropertyExpense.php** - Property Cost Tracking
```php
// Required Schema:
- id, property_id, expense_type, description
- amount, expense_date, receipt_file, vendor
- notes, created_at, updated_at
```

#### 5. **FinancialReport.php** - Automated Reporting
```php
// Required Schema:
- id, report_type, period_start, period_end
- total_revenue, total_expenses, net_profit
- occupancy_rate, booking_count, generated_at
- created_at, updated_at
```

---

## 🚨 **Critical Implementation Tasks**

### **Priority 1: Stub Models Implementation**
```bash
# Generate missing models with full implementation
php artisan make:model BookingGuest -m
php artisan make:model BookingService -m  
php artisan make:model BookingWorkflow -m
php artisan make:model PropertyExpense -m
php artisan make:model FinancialReport -m
```

### **Priority 2: Model Enhancement**
1. **Add Model Policies**
   ```bash
   php artisan make:policy PropertyPolicy --model=Property
   php artisan make:policy BookingPolicy --model=Booking
   php artisan make:policy PaymentPolicy --model=Payment
   ```

### **Priority 3: Performance Optimization**
1. **Database Indexing**
   ```php
   // Add indexes to migrations:
   $table->index(['property_id', 'check_in_date']); // Bookings
   $table->index(['status', 'created_at']);         // Performance queries  
   $table->index(['booking_id', 'status']);         // Payments
   ```

---

## 📞 **Support & Documentation**

### **References**
- 📚 **Database ERD**: `/doc/DATABASE_ERD.md`
- 🔧 **API Documentation**: `/doc/API_DOCUMENTATION.md`
- 🏗️ **System Requirements**: `/doc/SYSTEM_REQUIREMENTS.md`

### **Development Commands**
```bash
# Model generation
php artisan make:model ModelName -mfr  # Model + Migration + Factory + Resource

# Testing
php artisan test --filter=ModelTest    # Run model tests
php artisan test --coverage           # Coverage report

# Database
php artisan migrate:refresh --seed     # Reset with sample data
```

---

**🎯 Status**: Core models production ready, stub models need immediate implementation  
**📅 Next Milestone**: Complete model ecosystem with full business logic  
**👨‍💻 Maintained by**: Development Team

**⚠️ URGENT**: Implement stub models untuk complete system functionality. 
