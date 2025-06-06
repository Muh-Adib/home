# Data Flow Diagram (DFD)
## Property Management System

---

## 1. OVERVIEW

### 1.1 DFD Purpose
Data Flow Diagram menggambarkan bagaimana data mengalir melalui sistem Property Management System, dari input hingga output, serta proses-proses yang terjadi di antaranya.

### 1.2 DFD Levels
- **Level 0**: Context Diagram - System overview
- **Level 1**: System Level - Major processes
- **Level 2**: Process Detail - Detailed processes
- **Level 3**: Implementation Level - Technical details

---

## 2. LEVEL 0 - CONTEXT DIAGRAM

### 2.1 External Entities
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     GUESTS      │    │   PROPERTY      │    │  SYSTEM ADMIN   │
│                 │    │    OWNERS       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│            PROPERTY MANAGEMENT SYSTEM (PMS)                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     STAFF       │    │   PAYMENT       │    │  OTA CHANNELS   │
│  (Housekeeping, │    │   GATEWAYS      │    │ (Booking.com,   │
│   Front Desk)   │    │                 │    │  Traveloka)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.2 Major Data Flows
- **Guest Data**: Booking requests, personal information, payment data
- **Property Data**: Property details, availability, pricing, media
- **Financial Data**: Payments, expenses, revenue reports
- **Operational Data**: Staff tasks, maintenance requests, inventory

---

## 3. LEVEL 1 - SYSTEM PROCESSES

### 3.1 Main System Processes
```
┌─────────────┐ Booking     ┌─────────────┐ Property   ┌─────────────┐
│   GUESTS    │ Requests    │   BOOKING   │ Data       │  PROPERTY   │
│             ├────────────►│ MANAGEMENT  ├───────────►│ MANAGEMENT  │
└─────────────┘             │             │            │             │
                            └─────────────┘            └─────────────┘
                                    │                          │
                              Booking Data                Property Info
                                    ▼                          ▼
┌─────────────┐ Payment     ┌─────────────┐ Financial  ┌─────────────┐
│   PAYMENT   │ Status      │  FINANCIAL  │ Reports    │  REPORTING  │
│  GATEWAY    ├────────────►│ MANAGEMENT  ├───────────►│ & ANALYTICS │
└─────────────┘             │             │            │             │
                            └─────────────┘            └─────────────┘
                                    │                          │
                              Payment Data               Report Data
                                    ▼                          ▼
┌─────────────┐ Task        ┌─────────────┐ Staff      ┌─────────────┐
│    STAFF    │ Updates     │ OPERATIONS  │ Assign.    │    USERS    │
│             ◄────────────┤ MANAGEMENT  ◄───────────┤ MANAGEMENT  │
└─────────────┘             │             │            │             │
                            └─────────────┘            └─────────────┘
```

### 3.2 Data Stores
```
D1: Users Database
D2: Properties Database  
D3: Bookings Database
D4: Payments Database
D5: Media Files Storage
D6: Financial Records
D7: System Configuration
D8: Audit Logs
```

---

## 4. LEVEL 2 - DETAILED PROCESSES

### 4.1 Booking Management Process
```
┌─────────────┐
│    GUEST    │
│             │
└──────┬──────┘
       │ Booking Request
       │ (Guest Info, Dates, Property)
       ▼
┌─────────────┐     Check        ┌─────────────┐
│    1.1      │   Availability   │     D3      │
│  VALIDATE   ├─────────────────►│  BOOKINGS   │
│  BOOKING    │                  │  DATABASE   │
└──────┬──────┘                  └─────────────┘
       │ Valid Booking
       ▼
┌─────────────┐     Calculate    ┌─────────────┐
│    1.2      │   Extra Beds     │     D2      │
│ CALCULATE   ├─────────────────►│ PROPERTIES  │
│  PRICING    │                  │  DATABASE   │
└──────┬──────┘                  └─────────────┘
       │ Total Amount
       ▼
┌─────────────┐     Create       ┌─────────────┐
│    1.3      │   Booking        │     D3      │
│   CREATE    ├─────────────────►│  BOOKINGS   │
│  BOOKING    │                  │  DATABASE   │
└──────┬──────┘                  └─────────────┘
       │ Booking Created
       ▼
┌─────────────┐
│    STAFF    │
│ VERIFICATION│
└─────────────┘
```

### 4.2 Property Management Process
```
┌─────────────┐
│ PROPERTY    │
│   OWNER     │
└──────┬──────┘
       │ Property Data
       │ (Details, Media, Amenities)
       ▼
┌─────────────┐     Validate     ┌─────────────┐
│    2.1      │   & Process      │     D2      │
│  PROCESS    ├─────────────────►│ PROPERTIES  │
│ PROPERTY    │                  │  DATABASE   │
└──────┬──────┘                  └─────────────┘
       │ Property Info
       ▼
┌─────────────┐     Store        ┌─────────────┐
│    2.2      │   Media Files    │     D5      │
│   MANAGE    ├─────────────────►│   MEDIA     │
│   MEDIA     │                  │  STORAGE    │
└──────┬──────┘                  └─────────────┘
       │ Media URLs
       ▼
┌─────────────┐     Update       ┌─────────────┐
│    2.3      │   Availability   │     D3      │
│   UPDATE    ├─────────────────►│  BOOKINGS   │
│ CALENDAR    │                  │  DATABASE   │
└──────┬──────┘                  └─────────────┘
       │ Updated Calendar
       ▼
┌─────────────┐
│   PUBLIC    │
│  DISPLAY    │
└─────────────┘
```

### 4.3 Payment Management Process
```
┌─────────────┐
│    GUEST    │
│             │
└──────┬──────┘
       │ Payment Info
       │ (Amount, Method, Reference)
       ▼
┌─────────────┐     Validate     ┌─────────────┐
│    3.1      │   Payment        │     D4      │
│  PROCESS    ├─────────────────►│  PAYMENTS   │
│  PAYMENT    │                  │  DATABASE   │
└──────┬──────┘                  └─────────────┘
       │ Payment Record
       ▼
┌─────────────┐     Update       ┌─────────────┐
│    3.2      │   Booking        │     D3      │
│   UPDATE    ├─────────────────►│  BOOKINGS   │
│  STATUS     │                  │  DATABASE   │
└──────┬──────┘                  └─────────────┘
       │ Status Updated
       ▼
┌─────────────┐     Generate     ┌─────────────┐
│    3.3      │   Receipt        │     D6      │
│  GENERATE   ├─────────────────►│ FINANCIAL   │
│  RECEIPT    │                  │  RECORDS    │
└──────┬──────┘                  └─────────────┘
       │ Receipt
       ▼
┌─────────────┐
│    GUEST    │
│(Confirmation)│
└─────────────┘
```

### 4.4 Financial Reporting Process
```
┌─────────────┐
│  FINANCE    │
│   ADMIN     │
└──────┬──────┘
       │ Report Request
       │ (Period, Property, Type)
       ▼
┌─────────────┐     Query        ┌─────────────┐
│    4.1      │   Booking Data   │     D3      │
│  COLLECT    ├─────────────────►│  BOOKINGS   │
│    DATA     │                  │  DATABASE   │
└──────┬──────┘                  └─────────────┘
       │ Booking Data
       ▼
┌─────────────┐     Query        ┌─────────────┐
│    4.2      │   Payment Data   │     D4      │
│  COLLECT    ├─────────────────►│  PAYMENTS   │
│ PAYMENTS    │                  │  DATABASE   │
└──────┬──────┘                  └─────────────┘
       │ Payment Data
       ▼
┌─────────────┐     Calculate    ┌─────────────┐
│    4.3      │   Metrics        │     D6      │
│ CALCULATE   ├─────────────────►│ FINANCIAL   │
│  METRICS    │                  │  RECORDS    │
└──────┬──────┘                  └─────────────┘
       │ Financial Report
       ▼
┌─────────────┐
│  FINANCE    │
│   ADMIN     │
└─────────────┘
```

---

## 5. LEVEL 3 - IMPLEMENTATION DETAILS

### 5.1 Booking Validation Process
```
Input: Booking Request Data
├── Property ID
├── Check-in Date
├── Check-out Date
├── Guest Count
├── Guest Details
└── Special Requests

Process Steps:
1. Validate Property Exists
   ├── Query Properties Database
   └── Check Property Status (Active)

2. Check Availability
   ├── Query Existing Bookings
   ├── Check Date Conflicts
   └── Validate Capacity

3. Calculate Pricing
   ├── Get Base Rate
   ├── Apply Seasonal Pricing
   ├── Calculate Extra Beds
   └── Add Service Charges

4. Create Booking Record
   ├── Generate Booking Number
   ├── Store Guest Information
   ├── Save Booking Details
   └── Create Workflow Entry

Output: Booking Confirmation or Error
```

### 5.2 Payment Processing Flow
```
Input: Payment Data
├── Booking ID
├── Payment Amount
├── Payment Method
├── Reference Number
└── Payment Proof

Process Steps:
1. Validate Payment
   ├── Check Booking Exists
   ├── Verify Amount
   └── Validate Payment Method

2. Process Payment
   ├── Update Payment Status
   ├── Record Transaction
   └── Generate Receipt

3. Update Booking Status
   ├── Calculate Remaining Amount
   ├── Update Payment Status
   └── Trigger Notifications

4. Generate Confirmation
   ├── Create Receipt
   ├── Send Email Confirmation
   └── Update Dashboard

Output: Payment Confirmation
```

### 5.3 Property Search Algorithm
```
Input: Search Criteria
├── Check-in Date
├── Check-out Date
├── Guest Count
├── Location
├── Amenities
├── Price Range
└── Sort Preferences

Process Steps:
1. Filter by Availability
   ├── Query Available Properties
   ├── Check Date Conflicts
   └── Validate Capacity

2. Apply Search Filters
   ├── Location Filter
   ├── Amenity Filter
   ├── Price Range Filter
   └── Rating Filter

3. Calculate Dynamic Pricing
   ├── Base Rate Calculation
   ├── Seasonal Adjustments
   ├── Weekend Premium
   └── Length of Stay Discount

4. Sort Results
   ├── By Price (Low to High/High to Low)
   ├── By Rating
   ├── By Distance
   └── By Popularity

Output: Sorted Property List
```

---

## 6. DATA FLOW PATTERNS

### 6.1 Real-time Data Flows
```
Booking Creation:
Guest → Form Validation → Database → Notification → Staff

Payment Processing:
Guest → Payment Gateway → Verification → Database → Confirmation

Availability Updates:
Booking Change → Calendar Update → OTA Sync → Public Display
```

### 6.2 Batch Data Flows
```
Daily Reports:
Database → Report Generator → PDF/Excel → Email → Storage

Backup Process:
Database → Backup Service → Cloud Storage → Verification

OTA Synchronization:
Database → Channel Manager → OTA APIs → Confirmation Log
```

### 6.3 Event-Driven Flows
```
Booking Approval:
Staff Action → Status Update → Email Trigger → Guest Notification

Payment Deadline:
Schedule Check → Due Date Alert → Email/SMS → Admin Dashboard

Property Status Change:
Owner Update → Availability Update → OTA Sync → Guest Notification
```

---

## 7. ERROR HANDLING FLOWS

### 7.1 Validation Errors
```
Invalid Input → Validation Engine → Error Message → User Interface
```

### 7.2 System Errors
```
System Failure → Error Logger → Admin Alert → Error Recovery
```

### 7.3 Integration Errors
```
API Failure → Retry Logic → Fallback Process → Manual Intervention
```

---

## 8. SECURITY DATA FLOWS

### 8.1 Authentication Flow
```
User Login → Credential Validation → Session Creation → Access Control
```

### 8.2 Authorization Flow
```
User Action → Permission Check → Role Validation → Action Execution
```

### 8.3 Data Protection Flow
```
Sensitive Data → Encryption → Secure Storage → Audit Trail
```

---

## 9. PERFORMANCE OPTIMIZATION

### 9.1 Caching Strategy
```
Frequent Data → Cache Check → Cache Miss → Database → Cache Update
```

### 9.2 Load Balancing
```
User Request → Load Balancer → Available Server → Response
```

---

**DFD Version**: 1.0  
**Last Updated**: 2025
**Complexity Level**: 3 Levels  
**Total Processes**: 15+  
**Data Stores**: 8 