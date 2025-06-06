# Entity Relationship Diagram (ERD)
## Property Management System Database Design

---

## 1. DATABASE OVERVIEW

### 1.1 Database Schema Information
- **Database Name**: pms_database
- **Database Engine**: PostgreSQL 15+ / MySQL 8.0+
- **Character Set**: UTF8MB4
- **Collation**: utf8mb4_unicode_ci
- **Time Zone**: Asia/Jakarta

### 1.2 Schema Design Principles
- **Normalization**: 3NF (Third Normal Form)
- **Indexing Strategy**: Optimized for query performance
- **Data Integrity**: Foreign key constraints
- **Audit Trail**: Created/updated timestamps
- **Soft Deletes**: Where applicable

---

## 2. CORE ENTITIES

### 2.1 Users Management
```sql
-- Users table (Authentication & Authorization)
users
├── id (PK, BIGINT, AUTO_INCREMENT)
├── name (VARCHAR(255), NOT NULL)
├── email (VARCHAR(255), UNIQUE, NOT NULL)
├── email_verified_at (TIMESTAMP, NULLABLE)
├── password (VARCHAR(255), NOT NULL)
├── phone (VARCHAR(20), NULLABLE)
├── role (ENUM: super_admin, property_owner, property_manager, front_desk, housekeeping, finance, guest)
├── status (ENUM: active, inactive, suspended)
├── last_login_at (TIMESTAMP, NULLABLE)
├── remember_token (VARCHAR(100), NULLABLE)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── deleted_at (TIMESTAMP, NULLABLE)

-- User Profiles (Extended user information)
user_profiles
├── id (PK, BIGINT, AUTO_INCREMENT)
├── user_id (FK -> users.id, UNIQUE)
├── avatar (VARCHAR(500), NULLABLE)
├── address (TEXT, NULLABLE)
├── city (VARCHAR(100), NULLABLE)
├── state (VARCHAR(100), NULLABLE)
├── country (VARCHAR(100), DEFAULT 'Indonesia')
├── postal_code (VARCHAR(10), NULLABLE)
├── birth_date (DATE, NULLABLE)
├── gender (ENUM: male, female, other, NULLABLE)
├── bio (TEXT, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### 2.2 Property Management
```sql
-- Properties (Core property information)
properties
├── id (PK, BIGINT, AUTO_INCREMENT)
├── owner_id (FK -> users.id, NOT NULL)
├── name (VARCHAR(255), NOT NULL)
├── slug (VARCHAR(255), UNIQUE, NOT NULL)
├── description (TEXT, NULLABLE)
├── address (TEXT, NOT NULL)
├── lat (DECIMAL(10,8), NULLABLE)
├── lng (DECIMAL(11,8), NULLABLE)
├── capacity (INT, NOT NULL) -- Standard capacity
├── capacity_max (INT, NOT NULL) -- Maximum with extra beds
├── bedroom_count (INT, NOT NULL)
├── bathroom_count (INT, NOT NULL)
├── base_rate (DECIMAL(12,2), NOT NULL)
├── weekend_premium_percent (INT, DEFAULT 20)
├── cleaning_fee (DECIMAL(10,2), DEFAULT 0)
├── extra_bed_rate (DECIMAL(10,2), DEFAULT 0)
├── status (ENUM: active, inactive, maintenance, DEFAULT 'active')
├── amenities (JSON, NULLABLE) -- Stored as JSON for flexibility
├── house_rules (TEXT, NULLABLE)
├── check_in_time (TIME, DEFAULT '14:00:00')
├── check_out_time (TIME, DEFAULT '11:00:00')
├── min_stay_weekday (INT, DEFAULT 1)
├── min_stay_weekend (INT, DEFAULT 2)
├── min_stay_peak (INT, DEFAULT 3)
├── is_featured (BOOLEAN, DEFAULT FALSE)
├── sort_order (INT, DEFAULT 0)
├── seo_title (VARCHAR(255), NULLABLE)
├── seo_description (TEXT, NULLABLE)
├── seo_keywords (TEXT, NULLABLE)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── deleted_at (TIMESTAMP, NULLABLE)

-- Property Media (Images, Videos, Virtual Tours)
property_media
├── id (PK, BIGINT, AUTO_INCREMENT)
├── property_id (FK -> properties.id, NOT NULL)
├── media_type (ENUM: image, video, virtual_tour, NOT NULL)
├── file_path (VARCHAR(500), NOT NULL)
├── file_name (VARCHAR(255), NOT NULL)
├── file_size (BIGINT, NOT NULL)
├── mime_type (VARCHAR(100), NOT NULL)
├── category (ENUM: exterior, living_room, bedroom, kitchen, bathroom, amenities, tour, DEFAULT 'exterior')
├── title (VARCHAR(255), NULLABLE)
├── alt_text (VARCHAR(255), NULLABLE)
├── description (TEXT, NULLABLE)
├── display_order (INT, DEFAULT 0)
├── is_featured (BOOLEAN, DEFAULT FALSE)
├── is_cover (BOOLEAN, DEFAULT FALSE)
├── dimensions (VARCHAR(20), NULLABLE) -- e.g., "1920x1080"
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Amenities Master Data
amenities
├── id (PK, BIGINT, AUTO_INCREMENT)
├── name (VARCHAR(100), UNIQUE, NOT NULL)
├── icon (VARCHAR(100), NOT NULL) -- Icon class or SVG path
├── category (ENUM: basic, kitchen, bathroom, entertainment, outdoor, safety, DEFAULT 'basic')
├── description (TEXT, NULLABLE)
├── is_active (BOOLEAN, DEFAULT TRUE)
├── sort_order (INT, DEFAULT 0)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Property Amenities Junction Table
property_amenities
├── id (PK, BIGINT, AUTO_INCREMENT)
├── property_id (FK -> properties.id, NOT NULL)
├── amenity_id (FK -> amenities.id, NOT NULL)
├── is_available (BOOLEAN, DEFAULT TRUE)
├── notes (TEXT, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### 2.3 Booking Management
```sql
-- Bookings (Core booking information)
bookings
├── id (PK, BIGINT, AUTO_INCREMENT)
├── booking_number (VARCHAR(50), UNIQUE, NOT NULL) -- Generated booking number
├── property_id (FK -> properties.id, NOT NULL)
├── guest_name (VARCHAR(255), NOT NULL)
├── guest_email (VARCHAR(255), NOT NULL)
├── guest_phone (VARCHAR(20), NOT NULL)
├── guest_id_number (VARCHAR(50), NULLABLE) -- ID/Passport number
├── guest_count (INT, NOT NULL)
├── guest_male (INT, DEFAULT 0)
├── guest_female (INT, DEFAULT 0)
├── guest_children (INT, DEFAULT 0)
├── relationship_type (ENUM: keluarga, teman, kolega, pasangan, campuran, NOT NULL)
├── check_in (DATE, NOT NULL)
├── check_out (DATE, NOT NULL)
├── nights (INT, GENERATED ALWAYS AS (DATEDIFF(check_out, check_in)) STORED)
├── base_amount (DECIMAL(12,2), NOT NULL) -- Property base cost
├── extra_bed_amount (DECIMAL(12,2), DEFAULT 0) -- Extra bed charges
├── service_amount (DECIMAL(12,2), DEFAULT 0) -- Additional services
├── total_amount (DECIMAL(12,2), NOT NULL) -- Total booking amount
├── dp_percentage (INT, DEFAULT 0) -- Down payment percentage
├── dp_amount (DECIMAL(12,2), DEFAULT 0) -- Down payment amount
├── dp_paid_amount (DECIMAL(12,2), DEFAULT 0) -- Actually paid DP
├── remaining_amount (DECIMAL(12,2), GENERATED ALWAYS AS (total_amount - dp_paid_amount) STORED)
├── payment_status (ENUM: dp_pending, dp_received, fully_paid, overdue, refunded, DEFAULT 'dp_pending')
├── booking_status (ENUM: pending_verification, confirmed, checked_in, checked_out, cancelled, no_show, DEFAULT 'pending_verification')
├── verification_status (ENUM: pending, approved, rejected, DEFAULT 'pending')
├── dp_deadline (DATETIME, NULLABLE)
├── special_requests (TEXT, NULLABLE)
├── internal_notes (TEXT, NULLABLE)
├── cancellation_reason (TEXT, NULLABLE)
├── cancelled_at (TIMESTAMP, NULLABLE)
├── cancelled_by (FK -> users.id, NULLABLE)
├── verified_by (FK -> users.id, NULLABLE)
├── verified_at (TIMESTAMP, NULLABLE)
├── created_by (FK -> users.id, NULLABLE) -- Admin who created booking
├── source (ENUM: direct, phone, walk_in, ota, DEFAULT 'direct')
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── deleted_at (TIMESTAMP, NULLABLE)

-- Booking Guest Details (Individual guest information)
booking_guests
├── id (PK, BIGINT, AUTO_INCREMENT)
├── booking_id (FK -> bookings.id, NOT NULL)
├── guest_name (VARCHAR(255), NOT NULL)
├── guest_type (ENUM: male, female, child, NOT NULL)
├── guest_age (INT, NULLABLE)
├── id_number (VARCHAR(50), NULLABLE)
├── is_primary (BOOLEAN, DEFAULT FALSE) -- Primary guest flag
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Booking Services (Extra services and extra beds)
booking_services
├── id (PK, BIGINT, AUTO_INCREMENT)
├── booking_id (FK -> bookings.id, NOT NULL)
├── service_type (ENUM: extra_bed, breakfast, airport_transfer, bbq_package, private_chef, laundry, tour_package, other, NOT NULL)
├── service_name (VARCHAR(255), NOT NULL)
├── quantity (INT, DEFAULT 1)
├── unit_price (DECIMAL(10,2), NOT NULL)
├── total_price (DECIMAL(10,2), GENERATED ALWAYS AS (quantity * unit_price) STORED)
├── is_auto_calculated (BOOLEAN, DEFAULT FALSE) -- For auto extra bed calculation
├── service_date (DATE, NULLABLE) -- When service is provided
├── notes (TEXT, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Booking Workflow (Tracking booking process steps)
booking_workflow
├── id (PK, BIGINT, AUTO_INCREMENT)
├── booking_id (FK -> bookings.id, NOT NULL)
├── step (ENUM: submitted, staff_review, approved, rejected, payment_pending, dp_received, payment_verified, confirmed, checked_in, checked_out, completed, NOT NULL)
├── status (ENUM: pending, in_progress, completed, skipped, failed, DEFAULT 'pending')
├── processed_by (FK -> users.id, NULLABLE)
├── processed_at (TIMESTAMP, NULLABLE)
├── notes (TEXT, NULLABLE)
├── metadata (JSON, NULLABLE) -- Additional step data
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### 2.4 Payment Management
```sql
-- Payments (Payment transactions)
payments
├── id (PK, BIGINT, AUTO_INCREMENT)
├── payment_number (VARCHAR(50), UNIQUE, NOT NULL) -- Generated payment number
├── booking_id (FK -> bookings.id, NOT NULL)
├── amount (DECIMAL(12,2), NOT NULL)
├── payment_type (ENUM: dp, remaining, full, refund, penalty, NOT NULL)
├── payment_method (ENUM: cash, bank_transfer, credit_card, e_wallet, other, NOT NULL)
├── payment_date (DATETIME, NOT NULL)
├── due_date (DATETIME, NULLABLE)
├── reference_number (VARCHAR(100), NULLABLE) -- Bank reference, etc.
├── bank_name (VARCHAR(100), NULLABLE)
├── account_number (VARCHAR(50), NULLABLE)
├── account_name (VARCHAR(255), NULLABLE)
├── payment_status (ENUM: pending, verified, failed, cancelled, DEFAULT 'pending')
├── verification_notes (TEXT, NULLABLE)
├── attachment_path (VARCHAR(500), NULLABLE) -- Payment proof
├── processed_by (FK -> users.id, NULLABLE)
├── verified_by (FK -> users.id, NULLABLE)
├── verified_at (TIMESTAMP, NULLABLE)
├── gateway_transaction_id (VARCHAR(255), NULLABLE) -- For payment gateway
├── gateway_response (JSON, NULLABLE) -- Gateway response data
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Payment Methods Configuration
payment_methods
├── id (PK, BIGINT, AUTO_INCREMENT)
├── name (VARCHAR(100), NOT NULL)
├── type (ENUM: bank_transfer, e_wallet, credit_card, cash, NOT NULL)
├── provider (VARCHAR(100), NULLABLE) -- BCA, Mandiri, OVO, etc.
├── account_number (VARCHAR(100), NULLABLE)
├── account_name (VARCHAR(255), NULLABLE)
├── instructions (TEXT, NULLABLE)
├── is_active (BOOLEAN, DEFAULT TRUE)
├── sort_order (INT, DEFAULT 0)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### 2.5 Financial Management
```sql
-- Property Expenses (Property-level expenses)
property_expenses
├── id (PK, BIGINT, AUTO_INCREMENT)
├── property_id (FK -> properties.id, NOT NULL)
├── expense_category (ENUM: utilities, maintenance, supplies, marketing, insurance, tax, staff, other, NOT NULL)
├── description (VARCHAR(255), NOT NULL)
├── amount (DECIMAL(12,2), NOT NULL)
├── expense_date (DATE, NOT NULL)
├── vendor (VARCHAR(255), NULLABLE)
├── receipt_path (VARCHAR(500), NULLABLE)
├── is_recurring (BOOLEAN, DEFAULT FALSE)
├── recurring_frequency (ENUM: daily, weekly, monthly, yearly, NULLABLE)
├── notes (TEXT, NULLABLE)
├── recorded_by (FK -> users.id, NOT NULL)
├── approved_by (FK -> users.id, NULLABLE)
├── approved_at (TIMESTAMP, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Financial Reports Cache
financial_reports
├── id (PK, BIGINT, AUTO_INCREMENT)
├── property_id (FK -> properties.id, NULLABLE) -- NULL for consolidated reports
├── report_type (ENUM: daily, weekly, monthly, yearly, custom, NOT NULL)
├── report_period (VARCHAR(50), NOT NULL) -- e.g., "2024-01", "2024-Q1"
├── start_date (DATE, NOT NULL)
├── end_date (DATE, NOT NULL)
├── total_revenue (DECIMAL(15,2), DEFAULT 0)
├── total_expenses (DECIMAL(15,2), DEFAULT 0)
├── net_profit (DECIMAL(15,2), GENERATED ALWAYS AS (total_revenue - total_expenses) STORED)
├── occupancy_rate (DECIMAL(5,2), DEFAULT 0) -- Percentage
├── adr (DECIMAL(12,2), DEFAULT 0) -- Average Daily Rate
├── revpar (DECIMAL(12,2), DEFAULT 0) -- Revenue Per Available Room
├── booking_count (INT, DEFAULT 0)
├── guest_count (INT, DEFAULT 0)
├── report_data (JSON, NULLABLE) -- Detailed breakdown
├── generated_at (TIMESTAMP, NOT NULL)
├── generated_by (FK -> users.id, NOT NULL)
└── created_at (TIMESTAMP)
```

---

## 3. RELATIONSHIP MAPPING

### 3.1 Primary Relationships
```
Users (1) -----> (M) Properties [owner_id]
Properties (1) -> (M) PropertyMedia [property_id]
Properties (1) -> (M) PropertyAmenities [property_id]
Amenities (1) --> (M) PropertyAmenities [amenity_id]

Properties (1) -> (M) Bookings [property_id]
Bookings (1) ----> (M) BookingGuests [booking_id]
Bookings (1) ----> (M) BookingServices [booking_id]
Bookings (1) ----> (M) BookingWorkflow [booking_id]
Bookings (1) ----> (M) Payments [booking_id]

Users (1) --------> (M) Bookings [created_by, verified_by, cancelled_by]
Users (1) --------> (M) Payments [processed_by, verified_by]
Users (1) --------> (M) BookingWorkflow [processed_by]

Properties (1) -> (M) PropertyExpenses [property_id]
Properties (1) -> (M) FinancialReports [property_id]
```

### 3.2 Junction Tables
```
property_amenities: properties (M) <--> (M) amenities
booking_guests: bookings (1) <--> (M) guest_details
booking_services: bookings (1) <--> (M) service_details
```

---

## 4. INDEXING STRATEGY

### 4.1 Primary Indexes
```sql
-- Performance-critical indexes
CREATE INDEX idx_properties_owner_status ON properties(owner_id, status);
CREATE INDEX idx_properties_location ON properties(lat, lng);
CREATE INDEX idx_properties_featured ON properties(is_featured, status);

CREATE INDEX idx_bookings_property_dates ON bookings(property_id, check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(booking_status, payment_status);
CREATE INDEX idx_bookings_guest_email ON bookings(guest_email);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);

CREATE INDEX idx_payments_booking ON payments(booking_id, payment_status);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_method ON payments(payment_method, payment_status);

CREATE INDEX idx_property_media_property_type ON property_media(property_id, media_type);
CREATE INDEX idx_property_media_featured ON property_media(property_id, is_featured);
```

### 4.2 Composite Indexes
```sql
-- Complex query optimization
CREATE INDEX idx_bookings_availability_check ON bookings(property_id, check_in, check_out, booking_status);
CREATE INDEX idx_financial_reporting ON bookings(property_id, check_in, payment_status, booking_status);
CREATE INDEX idx_workflow_tracking ON booking_workflow(booking_id, step, status);
```

---

## 5. DATA CONSTRAINTS

### 5.1 Business Rules Constraints
```sql
-- Ensure guest count doesn't exceed property capacity
ALTER TABLE bookings ADD CONSTRAINT chk_guest_capacity 
CHECK (guest_count <= (SELECT capacity_max FROM properties WHERE id = property_id));

-- Ensure check-out is after check-in
ALTER TABLE bookings ADD CONSTRAINT chk_valid_dates 
CHECK (check_out > check_in);

-- Ensure DP amount doesn't exceed total amount
ALTER TABLE bookings ADD CONSTRAINT chk_dp_amount 
CHECK (dp_amount <= total_amount);

-- Ensure guest breakdown equals total count
ALTER TABLE bookings ADD CONSTRAINT chk_guest_breakdown 
CHECK (guest_male + guest_female + guest_children = guest_count);
```

### 5.2 Data Integrity Constraints
```sql
-- Foreign key constraints with proper cascading
ALTER TABLE property_media ADD CONSTRAINT fk_property_media_property 
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

ALTER TABLE bookings ADD CONSTRAINT fk_bookings_property 
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT;

ALTER TABLE payments ADD CONSTRAINT fk_payments_booking 
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT;
```

---

## 6. GENERATED COLUMNS

### 6.1 Calculated Fields
```sql
-- Auto-calculated fields for performance
nights INT GENERATED ALWAYS AS (DATEDIFF(check_out, check_in)) STORED
remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - dp_paid_amount) STORED
total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
net_profit DECIMAL(15,2) GENERATED ALWAYS AS (total_revenue - total_expenses) STORED
```

---

## 7. TRIGGERS AND PROCEDURES

### 7.1 Audit Triggers
```sql
-- Auto-update timestamps
CREATE TRIGGER update_properties_timestamp 
BEFORE UPDATE ON properties 
FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP;

-- Booking workflow automation
CREATE TRIGGER create_booking_workflow 
AFTER INSERT ON bookings 
FOR EACH ROW 
INSERT INTO booking_workflow (booking_id, step, status) 
VALUES (NEW.id, 'submitted', 'completed');
```

### 7.2 Business Logic Procedures
```sql
-- Calculate extra bed requirements
DELIMITER //
CREATE PROCEDURE calculate_extra_beds(
    IN p_guest_count INT,
    IN p_property_id BIGINT,
    OUT p_extra_beds_needed INT,
    OUT p_extra_bed_cost DECIMAL(10,2)
)
BEGIN
    DECLARE standard_capacity INT;
    DECLARE extra_bed_rate DECIMAL(10,2);
    
    SELECT capacity, extra_bed_rate INTO standard_capacity, extra_bed_rate
    FROM properties WHERE id = p_property_id;
    
    IF p_guest_count > standard_capacity THEN
        SET p_extra_beds_needed = CEIL((p_guest_count - standard_capacity) / 2);
        SET p_extra_bed_cost = p_extra_beds_needed * extra_bed_rate;
    ELSE
        SET p_extra_beds_needed = 0;
        SET p_extra_bed_cost = 0;
    END IF;
END //
DELIMITER ;
```

---

## 8. DATA MIGRATION STRATEGY

### 8.1 Migration Order
1. **Core Tables**: users, user_profiles
2. **Master Data**: amenities, payment_methods
3. **Property Data**: properties, property_media, property_amenities
4. **Booking Data**: bookings, booking_guests, booking_services
5. **Financial Data**: payments, property_expenses
6. **Reporting Data**: booking_workflow, financial_reports

### 8.2 Data Seeding
```sql
-- Essential seed data
INSERT INTO amenities (name, icon, category) VALUES
('WiFi', 'wifi-icon', 'basic'),
('AC', 'ac-icon', 'basic'),
('Kitchen', 'kitchen-icon', 'kitchen'),
('Pool', 'pool-icon', 'outdoor');

INSERT INTO payment_methods (name, type, is_active) VALUES
('Bank Transfer', 'bank_transfer', TRUE),
('E-Wallet', 'e_wallet', TRUE),
('Cash', 'cash', TRUE);
```

---

**ERD Version**: 1.0  
**Database Schema Version**: 1.0  
**Last Updated**: 2025 
**Total Tables**: 15  
**Total Relationships**: 25+ 