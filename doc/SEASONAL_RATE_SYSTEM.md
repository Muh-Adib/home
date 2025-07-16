# Sistem Seasonal Rate - Property Management System

## 📋 OVERVIEW

Sistem Seasonal Rate adalah fitur advanced untuk mengelola tarif dinamis berdasarkan musim, hari libur, dan periode khusus. Sistem ini memungkinkan property owner untuk mengoptimalkan revenue dengan menyesuaikan tarif secara otomatis berdasarkan demand dan periode tertentu.

## 🏗️ ARSITEKTUR SISTEM

### Database Schema: `property_seasonal_rates`
- id, property_id, name, start_date, end_date
- rate_type (percentage/fixed/multiplier), rate_value
- priority (0-100), min_stay_nights, is_active
- applies_to_weekends_only, applicable_days (JSON)

### Model: PropertySeasonalRate
- Relasi: BelongsTo Property
- Methods: appliesTo(), calculateRate(), getFormattedRateDescription()

## 🎯 TIPE SEASONAL RATE

### 1. Percentage Rate
- Format: rate_value = persentase (50 untuk 50%)
- Perhitungan: base_rate * (1 + rate_value/100)

### 2. Fixed Rate  
- Format: rate_value = nominal tetap per malam
- Perhitungan: rate_value (menggantikan base_rate)

### 3. Multiplier Rate
- Format: rate_value = pengali (1.5 untuk 1.5x)
- Perhitungan: base_rate * rate_value

## 📅 SISTEM PRIORITAS (0-100)
- 100: Peak season (Christmas, New Year)
- 90: Major holidays (Eid)
- 80: School holidays
- 70: Long weekends
- 30: Weekend premiums
- 10: Low season discounts

## 🔄 ALGORITMA PERHITUNGAN
1. Base Rate → Seasonal Rate → Weekend Premium → Holiday Premium
2. Extra Bed → Long Stay Discount → Tax & Fees

## 🛠️ IMPLEMENTASI

### Backend Files Created:
- `database/migrations/2025_01_15_create_property_seasonal_rates_table.php`
- `app/Models/PropertySeasonalRate.php`
- `app/Http/Controllers/Admin/PropertySeasonalRateController.php`
- `database/seeders/PropertySeasonalRateSeeder.php`

### Updated Files:
- `app/Models/Property.php` - Enhanced calculateRate() method
- `app/Http/Controllers/PropertyController.php` - Fixed calculation API
- `routes/web.php` - Added seasonal rate routes
- `resources/js/pages/Properties/Show.tsx` - Seasonal rate indicators
- `resources/js/pages/Booking/Create.tsx` - Enhanced rate breakdown

### API Endpoints:
- GET `/admin/properties/{property}/seasonal-rates` - List rates
- POST `/admin/properties/{property}/seasonal-rates` - Create rate
- PUT `/admin/properties/{property}/seasonal-rates/{rate}` - Update rate
- DELETE `/admin/properties/{property}/seasonal-rates/{rate}` - Delete rate
- POST `/admin/properties/{property}/seasonal-rates/preview` - Preview calculation

## 📊 CONTOH SEASONAL RATES INDONESIA

### Peak Season:
- Christmas & New Year: +100% (20 Des - 5 Jan)
- Eid Al-Fitr: +75% (8-15 Apr)
- Mid-Year Holiday: +50% (15 Jun - 15 Jul)

### Discounts:
- Low Season Weekday: -20% (15 Jan - 15 Mar, Mon-Thu only)
- Extended Stay: -15% (min 7 nights)

## 🚀 DEPLOYMENT

```bash
# Run migration
php artisan migrate

# Seed seasonal rates
php artisan db:seed --class=PropertySeasonalRateSeeder
```

## 📈 BENEFITS

### Revenue Optimization:
- Dynamic pricing berdasarkan demand
- Maksimalkan revenue saat peak season
- Boost occupancy dengan strategic discounts

### Operational Efficiency:
- Automated pricing tanpa manual intervention
- Flexible configuration untuk berbagai scenario
- Centralized management dari admin panel

## 🔮 NEXT STEPS

1. Implement admin interface untuk seasonal rate management
2. Add rate calendar visualization
3. Setup analytics untuk rate effectiveness monitoring
4. Create mobile-optimized rate management
5. Integrate dengan channel manager untuk OTA sync

---

**Status**: ✅ Backend Implementation Complete  
**Next Phase**: Frontend Admin Interface Development 
