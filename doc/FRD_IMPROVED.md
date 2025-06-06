# Functional Requirements Document (FRD) - Property Management System

## 1. Pendahuluan

### 1.1 Latar Belakang

Manajemen properti seperti homestay dan villa menghadapi tantangan dalam mengelola pemesanan, harga musiman, keuangan, serta operasional sehari-hari. Sistem yang ada saat ini seringkali terpisah-pisah dan tidak terintegrasi, menyebabkan ineffisiensi dalam operasional dan kesalahan dalam pengambilan keputusan bisnis.

### 1.2 Tujuan Dokumen

Dokumen ini mendefinisikan kebutuhan fungsional dari sistem Property Management System (PMS) yang komprehensif untuk mengelola multiple properti homestay/villa dalam satu platform terintegrasi.

### 1.3 Ruang Lingkup

Aplikasi akan mencakup:
- Manajemen properti multi-unit
- Dynamic pricing dengan revenue management
- Integrasi OTA dengan channel manager
- Manajemen keuangan dan akuntansi
- Operasional staf dan maintenance
- Guest communication dan experience
- Layanan tambahan (ancillary services)
- Manajemen inventaris dan procurement

### 1.4 Definisi Istilah

* **OTA**: Online Travel Agent (Booking.com, Agoda, Traveloka, dll)
* **PMS**: Property Management System
* **ADR**: Average Daily Rate
* **RevPAR**: Revenue Per Available Room
* **Channel Manager**: Sistem untuk sinkronisasi inventory dan rate ke multiple OTA
* **Ancillary Services**: Layanan tambahan seperti extra bed, breakfast, laundry, dll
* **Folio**: Catatan transaksi per guest/booking
* **Walk-in**: Tamu yang datang tanpa reservasi
* **No-show**: Tamu yang tidak datang sesuai reservasi

## 2. Business Model & Revenue Streams

### 2.1 Tipe Properti yang Didukung
- Villa (whole property rental - 2-10 kamar)
- Homestay (whole property rental - 1-5 kamar)
- Apartment/Condo unit (whole unit rental)
- Guest house (whole property rental)

### 2.2 Revenue Streams
1. **Property Rental Revenue**: Pendapatan dari penyewaan property secara utuh
2. **Ancillary Revenue**: Layanan tambahan (extra bed, breakfast, laundry)
3. **Service Fee**: Fee dari guest untuk direct booking
4. **Commission**: Komisi dari affiliate/partnership

### 2.3 Cost Structure
1. **Fixed Costs**: Sewa, listrik, air, internet, staff salary
2. **Variable Costs**: Housekeeping supplies, guest amenities, utilities
3. **Commission Costs**: OTA commission (10-25%)
4. **Marketing Costs**: Advertising, promotion

## 3. Stakeholder & User Roles

| Role | Deskripsi | Access Level |
|------|-----------|--------------|
| **Super Admin** | System administrator dengan akses penuh | Full Access |
| **Property Owner** | Pemilik properti, akses ke properti miliknya | Property Specific |
| **Property Manager** | Mengelola operasional harian multiple properti | Multiple Properties |
| **Front Desk** | Handle check-in/out, guest services | Guest Operations |
| **Housekeeping** | Cleaning dan maintenance staff | Task Management |
| **Finance** | Akuntansi dan keuangan | Financial Data |
| **Guest** | Tamu yang melakukan booking | Booking & Services |

## 4. Core Business Logic & Features

### 4.1 Property Management

#### 4.1.1 Property Setup
- **Property Information**: Nama, alamat, koordinat GPS, tipe properti
- **Property Details**: Jumlah kamar, total kapasitas, bed configuration per kamar
- **Amenities & Facilities**: WiFi, AC, kitchen, pool, parking, dll
- **Photos & Virtual Tour**: Multiple foto dengan kategori per area (kamar, living room, kitchen, dll)
- **Policies**: Check-in/out time, cancellation policy, house rules
- **Pricing Structure**: Base rate per property, seasonal rates, weekend premium

#### 4.1.2 Property Inventory Structure
```
Property (Villa A) -> Whole Property Rental
- Property capacity: 8 guests
- Bedrooms: 4 kamar (2 Master, 2 Standard)
- Living areas: Living room, dining room, kitchen
- Amenities: Pool, parking, etc.
```

#### 4.1.3 Property Availability Management
- **Available**: Property tersedia untuk booking
- **Booked**: Property sudah dibooking untuk periode tertentu
- **Blocked**: Owner block untuk keperluan pribadi
- **Maintenance**: Tidak tersedia, sedang perbaikan
- **Out of Service**: Property tidak beroperasi sementara

### 4.2 Dynamic Pricing & Revenue Management

#### 4.2.1 Property-Based Pricing Factors
1. **Seasonal Pricing**
   - Low Season: Discount 10-20% dari base rate
   - Regular Season: Base rate per property per night
   - High Season: Premium 20-50% dari base rate
   - Peak Season: Premium 50-100% dari base rate
   - Event-based pricing: Harga khusus saat event lokal

2. **Day-of-Week Pricing**
   - Weekday rate: Base rate
   - Weekend premium: Fri-Sat +20-30%
   - Holiday premium: +30-50%

3. **Length of Stay Pricing**
   - Minimum stay requirements: 2-7 nights tergantung season
   - Weekly discount: 7+ nights get 10-15% discount
   - Monthly discount: 30+ nights get 20-30% discount
   - Early bird: Book 30+ days advance get 5-10% discount
   - Last minute deals: Book 1-3 days advance get 5-15% discount

#### 4.2.2 Channel-Based Property Pricing
```
Direct Booking: Base Property Rate
OTA Channel: Base Property Rate + Commission Markup (15-25%)
Corporate: Base Property Rate - Corporate Discount (10-15%)
Walk-in: Base Property Rate + Walk-in Premium (10-20%)
```

#### 4.2.3 Dynamic Pricing Rules per Property
- **Demand-based**: Harga naik jika banyak inquiry untuk tanggal sama
- **Booking Pace**: Harga naik jika booking lebih cepat dari forecast
- **Competitor-based**: Adjustment berdasarkan competitor pricing property sejenis
- **Local Events**: Auto price increase saat ada event di area property

#### 4.2.4 Revenue Optimization per Property
- **RevPAP (Revenue Per Available Property)**: Total revenue ÷ available property nights
- **Occupancy Rate**: Booked nights ÷ available nights
- **ADR (Average Daily Rate)**: Total revenue ÷ booked nights
- **Yield**: Actual rate ÷ rack rate percentage

### 4.3 Booking Management & Reservation

#### 4.3.1 Property Booking Process
1. **Guest selects property & dates**
2. **System shows total price** (property rate × nights + services)
3. **Guest provides guest count** (must not exceed property capacity)
4. **Payment processing** (full payment or deposit)
5. **Booking confirmation** with property access details

#### 4.3.2 Admin Reservation Features
**DP (Down Payment) Management untuk Admin:**
- **Create Reservation with DP**: Admin bisa buat booking dengan DP partial
- **DP Amount Options**:
  - Percentage: 30%, 50%, 70% dari total amount
  - Fixed Amount: Input manual amount DP
  - Minimum DP: Set minimum DP amount per property
- **DP Payment Tracking**: Track status pembayaran DP
- **Remaining Payment Reminder**: Auto reminder untuk pelunasan
- **DP Deadline**: Set deadline untuk pelunasan (default 7 hari sebelum check-in)
- **DP Refund Policy**: Aturan refund DP jika cancel

#### 4.3.3 Booking Status untuk Property Rental
- **Inquiry**: Potential booking, belum confirmed
- **DP Pending**: Waiting for down payment
- **DP Received**: DP sudah dibayar, waiting for full payment
- **Fully Paid**: Pembayaran lengkap, booking confirmed
- **Checked-in**: Guest sudah tiba di property
- **Checked-out**: Guest sudah keluar dari property
- **No-show**: Guest tidak datang
- **Cancelled**: Booking dibatalkan

#### 4.3.4 Property Reservation Rules
- **Guest Capacity**: Tidak boleh melebihi kapasitas property
- **Minimum Stay**: Weekend minimum 2 nights, peak season 3-7 nights
- **Maximum Stay**: 30 hari untuk individual booking
- **Overlapping Prevention**: Sistem cegah double booking property
- **Buffer Time**: Optional cleaning time between bookings (3-6 jam)

### 4.4 Channel Management & OTA Integration

#### 4.4.1 Property-Level Channel Integration
- **Whole Property Sync**: Sync ketersediaan property (bukan per kamar)
- **Rate Sync**: Sync harga per property per night
- **Capacity Sync**: Sync maximum guest capacity
- **Availability Calendar**: Sync blocked dates dan available dates
- **Booking Import**: Auto-import reservations dari OTA

#### 4.4.2 Property Inventory Management
- **Property Allocation**: Distribute property availability across channels
- **Stop Sales**: Block all channels ketika property fully booked
- **Instant Book**: Enable/disable instant booking per channel
- **Rate Parity**: Maintain consistent pricing across all channels

#### 4.4.3 OTA Commission for Property Rental
```
Villa/Homestay OTA Commission:
Booking.com: 15-18%
Agoda: 18-22%
Traveloka: 15-20%
Airbnb: 3% host fee + 14-16% guest fee
VRBO: 8% host fee + 6-12% guest fee
```

### 4.5 Guest Services & Experience

#### 4.5.1 Pre-Arrival Services
- **Booking Confirmation**: Email/SMS dengan details
- **Pre-check-in**: Online form untuk guest information
- **Arrival Instructions**: Lokasi, parking, contact person
- **Special Requests**: Early check-in, late check-out, room preferences

#### 4.5.2 During Stay Services
- **Digital Check-in/out**: Self-service via mobile app
- **Guest Communication**: In-app messaging, WhatsApp integration
- **Concierge Services**: Recommendations, booking assistance
- **Issue Reporting**: Maintenance requests, complaints
- **Ancillary Services**: Extra bed, breakfast, laundry, transportation

#### 4.5.3 Post-Stay Services
- **Digital Receipt**: Detailed bill via email
- **Feedback Collection**: Rating dan review
- **Loyalty Program**: Points, discounts untuk repeat guests
- **Re-marketing**: Follow-up untuk future bookings

### 4.6 Ancillary Services & Additional Revenue

#### 4.6.1 Property Services
- **Extra Bed**: IDR 100k-200k per night (jika masih dalam kapasitas)
- **Baby Cot**: IDR 50k per night
- **Extra Guest Fee**: IDR 50k-100k per guest per night (jika exceed standard capacity)

#### 4.6.2 Food & Beverage Services
- **Welcome Package**: IDR 100k-200k per property
- **Breakfast Service**: IDR 75k-150k per person per day
- **BBQ Package**: IDR 300k-500k per property
- **Grocery Shopping Service**: IDR 100k + cost of groceries

#### 4.6.3 Property-Specific Services
- **Private Chef**: IDR 500k-1M per day
- **Housekeeping During Stay**: IDR 200k-400k per service
- **Laundry Service**: IDR 20k per kg
- **Airport Transfer**: IDR 300k-800k depend on distance
- **Car Rental**: IDR 400k-800k per day with driver
- **Tour Packages**: Commission 15-25% from tour operators

#### 4.6.4 Service Pricing Logic per Property
```
Base Service Price + Property Location Premium + Season Adjustment + Group Size Multiplier
```

### 4.7 Financial Management & Accounting

#### 4.7.1 Property Rental Revenue Recognition
- **Property Revenue**: Recognized per night stayed
- **Service Revenue**: Recognized when service provided
- **DP (Down Payment)**: Record as advance payment liability
- **Full Payment**: Convert advance payment to revenue upon check-in
- **Refunds**: Processed according to cancellation policy

#### 4.7.2 DP (Down Payment) Financial Flow
```
DP Financial Process:
1. DP Received -> Record as "Advance Payment" (Liability)
2. Full Payment -> Convert to "Property Revenue"
3. Check-in -> Revenue Recognition starts
4. If Cancelled -> Process refund according to policy
```

#### 4.7.3 Cost Allocation per Property
```
Property Level Costs:
- Fixed Costs per Property: Insurance, property tax, basic utilities
- Variable Costs per Booking: Cleaning, utilities usage, supplies
- Marketing Costs: Allocated based on booking volume
- Commission Costs: OTA fees per booking

Property Profitability Calculation:
Revenue - Direct Costs - Allocated Costs - Commission = Net Profit per Property
```

#### 4.7.4 Payment Processing for Property Rental
- **Full Payment Options**: Credit card, bank transfer, e-wallet, cash
- **DP Payment Options**: All payment methods + installment options
- **Auto Payment Reminder**: For remaining payment after DP
- **Refund Processing**: Automated based on cancellation terms
- **Commission Tracking**: Track OTA commission per property booking

### 4.8 Operations & Property Management

#### 4.8.1 Property Maintenance Operations
- **Pre-Arrival Preparation**: Complete property cleaning and setup
- **Property Inspection**: Check all rooms, facilities, amenities
- **Issue Resolution**: Handle any problems before guest arrival
- **Inventory Check**: Ensure all amenities and supplies available
- **Access Management**: Prepare keys, access codes, property manual

#### 4.8.2 Guest Service for Property Rental
- **Property Handover**: Complete orientation about property facilities
- **24/7 Support**: Emergency contact for property issues
- **Concierge Service**: Local recommendations, booking assistance
- **Maintenance Response**: Immediate response for property issues
- **Check-out Process**: Property inspection and key return

#### 4.8.3 Staff Scheduling for Property Operations
- **Property Coordinator**: Assigned per property or area
- **Cleaning Team**: Schedule based on check-out/check-in
- **Maintenance Team**: On-call for property issues
- **Guest Relations**: Handle communication and requests
- **Emergency Response**: 24/7 availability for urgent issues

### 4.9 Inventory & Property Supply Management

#### 4.9.1 Property-Level Inventory Categories
1. **Guest Amenities per Property**: Toiletries set, towels, linens per room
2. **Kitchen Supplies**: Cooking utensils, plates, glasses, cutlery
3. **Cleaning Supplies**: Per property cleaning materials
4. **Maintenance Supplies**: Basic tools, light bulbs, batteries
5. **Welcome Amenities**: Welcome drinks, snacks, property information

#### 4.9.2 Property Inventory Logic
```
Property Supply Management:
- Standard Inventory per Property Type
- Seasonal Adjustment for Peak Periods
- Guest Count-based Supply Calculation
- Replacement Schedule for Amenities
- Quality Control for Guest-facing Items
```

#### 4.9.3 Property Consumption Tracking
- **Usage per Property Night**: Average consumption per booking
- **Property-specific Patterns**: Different usage per property type
- **Guest Count Impact**: Higher consumption for larger groups
- **Seasonal Variations**: Adjust for peak/low season usage

### 4.10 Reporting & Analytics

#### 4.10.1 Property Performance Reports
- **Property Occupancy Report**: Occupancy rate per property
- **Revenue per Property**: Daily, weekly, monthly breakdown
- **ADR per Property**: Average daily rate analysis
- **Guest Satisfaction per Property**: Rating and feedback analysis

#### 4.10.2 Financial Reports
- **Property P&L**: Revenue, costs, profit per individual property
- **DP Tracking Report**: Down payment status and collection
- **Cash Flow per Property**: Actual vs projected cash flow
- **Commission Analysis**: OTA fees impact per property
- **ROI per Property**: Return on investment analysis

#### 4.10.3 Business Intelligence for Property Portfolio
- **Portfolio Performance**: Overall property portfolio analysis
- **Property Comparison**: Performance comparison between properties
- **Market Analysis**: Property performance vs local market
- **Guest Segmentation**: Guest preferences per property type
- **Channel Performance**: Revenue and profitability per channel per property

## 5. Technical Architecture & Integration

### 5.1 System Architecture
```
Frontend: React + Inertia.js
Backend: Laravel 12+
Database: PostgreSQL (Primary), Redis (Cache)
Queue: Redis + Laravel Horizon
Storage: local storage
Search: Elasticsearch (optional)
```

### 5.2 Integration Requirements
- **Channel Manager**: custom integration
- **Payment Gateway**: Midtrans
- **Communication**: WhatsApp Business API, Telegram Bot
- **Email Service**: Laravel
- **Accounting**: Integration dengan software akuntansi (optional)

### 5.3 Mobile Application
- **Staff App**: Task management, reporting
- **Guest App**: Booking, check-in, services, communication
- **Owner App**: Dashboard, reports, approvals

## 6. Business Rules & Constraints

### 6.1 Booking Rules
1. **Advance Booking**: Maximum 365 days in advance
2. **Minimum Stay**: Configurable per property and season
3. **Maximum Stay**: 30 days for individual bookings
4. **Group Booking**: Special handling for 5+ rooms
5. **Block Dates**: Owner can block dates for personal use

### 6.2 Pricing Rules
1. **Rate Parity**: Maintain rate parity across channels (with commission adjustment)
2. **Minimum Rate**: Cannot sell below cost + minimum margin
3. **Maximum Rate**: Market-based ceiling to maintain competitiveness
4. **Promotion Rules**: Discount limitations and approval workflows

### 6.3 Financial Rules
1. **Payment Terms**: 
   - Direct booking: Full payment or 50% deposit
   - OTA booking: Payment handled by OTA
   - Corporate: Net 30 payment terms
2. **Refund Rules**: Follow cancellation policy strictly
3. **Commission Handling**: Deduct OTA commission from revenue recognition

### 6.4 Operational Rules
1. **Check-in Time**: Standard 3:00 PM (configurable)
2. **Check-out Time**: Standard 12:00 PM (configurable)
3. **Grace Period**: 30 minutes grace period for late check-out
4. **Housekeeping SLA**: Rooms must be ready within 2 hours of check-out

## 7. Performance & Scalability Requirements

### 7.1 Performance Targets
- **Response Time**: < 2 seconds for 95% of requests
- **Availability**: 99.5% uptime (excluding planned maintenance)
- **Concurrent Users**: Support 500+ concurrent users
- **Database Performance**: < 100ms for standard queries

### 7.2 Scalability Requirements
- **Property Capacity**: Support 1000+ properties
- **Room Capacity**: Support 10,000+ rooms
- **Booking Volume**: Handle 10,000+ bookings per month
- **Data Retention**: 7 years of historical data

## 8. Security & Compliance

### 8.1 Data Security
- **Encryption**: TLS 1.3 for data in transit, AES-256 for data at rest
- **Authentication**: Multi-factor authentication for admin users
- **Authorization**: Role-based access control
- **Audit Trail**: Complete audit log for all financial transactions

### 8.2 Privacy Compliance
- **GDPR Compliance**: Right to be forgotten, data portability
- **PCI DSS**: For payment card data handling
- **Local Regulations**: Comply with Indonesian data protection laws

### 8.3 Backup & Recovery
- **Database Backup**: Daily automated backups with 30-day retention
- **File Backup**: Daily backup of uploaded files
- **Disaster Recovery**: RTO: 4 hours, RPO: 1 hour
- **Testing**: Monthly backup restore testing

## 9. Implementation Phases

### Phase 1: Core PMS (3-4 months)
- Property management
- Basic booking management  
- User management
- Basic reporting

### Phase 2: Advanced Features (2-3 months)
- Dynamic pricing
- Channel manager integration
- Financial management
- Mobile apps

### Phase 3: Enhancement (2-3 months)
- Advanced analytics
- Guest app features
- Inventory management
- API integrations

### Phase 4: Optimization (Ongoing)
- Performance optimization
- Advanced reporting
- AI-powered features
- Market expansion features

## 10. Success Metrics & KPIs

### 10.1 Business Metrics
- **Revenue Growth**: 20%+ YoY revenue increase
- **Occupancy Rate**: Target 75%+ average occupancy
- **ADR Growth**: 10%+ YoY ADR increase
- **Guest Satisfaction**: 4.5+ average rating

### 10.2 Operational Metrics
- **Booking Conversion**: 15%+ from inquiry to booking
- **Direct Booking Ratio**: 40%+ direct bookings
- **Staff Productivity**: 20%+ improvement in task completion
- **Cost Reduction**: 10%+ reduction in operational costs

### 10.3 Technical Metrics
- **System Uptime**: 99.5%+
- **Response Time**: <2 seconds average
- **Data Accuracy**: 99.9%+ financial data accuracy
- **User Adoption**: 90%+ active user rate

---

## Appendix A: Glossary of Terms

**ADR (Average Daily Rate)**: Total room revenue divided by number of rooms sold

**RevPAR (Revenue Per Available Room)**: Total room revenue divided by total available rooms

**Occupancy Rate**: Percentage of available rooms that are occupied

**Yield Management**: Revenue optimization strategy through pricing and inventory control

**Channel Manager**: Software that connects PMS to multiple booking channels

**OTA (Online Travel Agent)**: Third-party booking websites like Booking.com

**PMS (Property Management System)**: Software for managing hotel/homestay operations

---

**Dokumen ini akan terus diperbarui seiring dengan perkembangan kebutuhan bisnis dan feedback dari stakeholders.** 