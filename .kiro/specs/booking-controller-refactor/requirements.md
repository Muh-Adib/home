# Requirements Document

## Introduction

Refactoring arsitektur `BookingManagementController` dan layer terkait pada aplikasi Homsjogja Property Management System (Laravel 12 + React/Inertia.js). Tujuan utama adalah menegakkan panduan arsitektur yang sudah ditetapkan: controller sebagai "traffic cop" (~100 baris), business logic di Service/Action, side effects via Job, Value Object immutable, zero duplication, dan constructor injection.

Refactoring ini bersifat **non-breaking** — tidak mengubah behavior yang sudah ada, hanya memindahkan dan merestrukturisasi kode ke layer yang tepat.

---

## Glossary

- **BookingManagementController**: Controller admin untuk operasi booking (`app/Http/Controllers/Admin/BookingManagementController.php`)
- **AdminBookingService**: Service layer untuk business logic booking admin (`app/Services/AdminBookingService.php`)
- **CreateBookingAction**: Action untuk membuat booking dari flow guest maupun admin (`app/Actions/Booking/CreateBookingAction.php`)
- **BookingRequest**: Value Object yang merepresentasikan data permintaan booking (`app/Domain/Booking/ValueObjects/BookingRequest.php`)
- **AvailabilityService**: Service untuk pengecekan ketersediaan properti (`app/Services/AvailabilityService.php`)
- **BookingQueryService**: Service baru yang akan dibuat untuk memusatkan query booking berulang
- **SyncPaymentIncomeJob**: Job baru yang akan dibuat untuk menjalankan payment income sync secara async
- **Thin_Controller**: Controller yang hanya berisi validasi, otorisasi, pemanggilan service, dan return response — tidak mengandung business logic
- **Value_Object**: Objek immutable yang merepresentasikan konsep domain; tidak boleh memiliki setter atau mutable state

---

## Requirements

### Requirement 1: Slim Down BookingManagementController

**User Story:** Sebagai developer, saya ingin `BookingManagementController` mengikuti prinsip "thin controller" sehingga controller mudah dibaca, diuji, dan dipelihara.

#### Acceptance Criteria

1. THE `BookingManagementController` SHALL NOT exceed 300 lines of code after refactoring (target akhir ~100 baris per panduan, dengan toleransi untuk jumlah method yang banyak).
2. THE `BookingManagementController` SHALL NOT contain raw Eloquent query logic (query builder chains) di luar pemanggilan scope atau relasi sederhana.
3. THE `BookingManagementController` SHALL NOT contain business rule calculations (rate calculation, availability check logic, guest count logic) secara inline.
4. WHEN a controller method needs to query bookings with filters, THE `BookingManagementController` SHALL delegate to a dedicated query service or scope.
5. THE `BookingManagementController` SHALL only call injected dependencies via constructor injection, tidak menggunakan `app()` helper secara manual.

---

### Requirement 2: Pindahkan Business Logic store() ke AdminBookingService

**User Story:** Sebagai developer, saya ingin semua business logic pada method `store()` berada di `AdminBookingService` sehingga controller tidak mengetahui detail implementasi availability check dan OTA override.

#### Acceptance Criteria

1. WHEN an admin submits a new booking, THE `BookingManagementController` `store()` method SHALL only validate the request, call `AdminBookingService::createAdminBooking()`, and return a redirect response.
2. THE `AdminBookingService` SHALL perform the availability check using the injected `AvailabilityService` instance.
3. THE `AdminBookingService` SHALL perform the overlapping booking query to determine if the conflict is OTA-only.
4. THE `AdminBookingService` SHALL return a structured result object that includes availability conflict details (booked periods, can_override flag) when the property is not available.
5. IF the property is not available for the requested dates, THEN THE `AdminBookingService` SHALL return a failure result containing `booked_periods` and `can_override` flag without throwing an exception.
6. THE `AdminBookingService` SHALL accept a `force_ota_override` flag as part of the booking data to bypass OTA-only conflicts.

---

### Requirement 3: Eliminasi Dead Methods di AdminBookingService

**User Story:** Sebagai developer, saya ingin tidak ada dead code di `AdminBookingService` sehingga codebase bersih dan tidak membingungkan.

#### Acceptance Criteria

1. THE `AdminBookingService` SHALL NOT contain methods that are never called from `createAdminBooking()` or any other public entry point.
2. WHEN `applyAdminMetadata()` logic is needed, THE `CreateBookingAction` SHALL handle it (sudah ada di step 5 action tersebut) dan method duplikat di `AdminBookingService` SHALL be removed.
3. WHEN `autoConfirmBooking()` logic is needed, THE `CreateBookingAction` SHALL handle it (sudah ada sebagai `autoConfirm()`) dan method duplikat di `AdminBookingService` SHALL be removed.
4. THE `AdminBookingService` `createAdminBooking()` method SHALL explicitly pass `auto_confirm`, `rate_override`, `source`, dan metadata fields ke `CreateBookingAction::execute()` sehingga action dapat menanganinya.

---

### Requirement 4: Jadikan BookingRequest Value Object Immutable

**User Story:** Sebagai developer, saya ingin `BookingRequest` benar-benar immutable sehingga tidak ada bagian kode yang dapat mengubah state-nya setelah konstruksi.

#### Acceptance Criteria

1. THE `BookingRequest` Value_Object SHALL NOT expose any public setter methods (`setRateCalculation()`, `setTotalAmount()`, dll).
2. THE `BookingRequest` Value_Object SHALL NOT have public mutable properties (`public array $rateCalculation`, `public int $totalAmount`).
3. WHEN rate calculation data needs to be associated with a booking request, THE calling code SHALL create a new `BookingRequest` instance or pass rate data as a separate parameter to the relevant service method.
4. THE `BookingRequest` `fromArray()` factory method SHALL remain the single construction point, accepting all required data including optional rate data at construction time.
5. IF code currently reads `$bookingRequest->rateCalculation` or `$bookingRequest->totalAmount`, THEN THE refactored code SHALL obtain these values from the `RateCalculation` Value Object returned by `RateCalculationService` directly.

---

### Requirement 5: Ganti Manual app() Calls dengan Constructor Injection

**User Story:** Sebagai developer, saya ingin semua dependency di-inject melalui constructor sehingga dependency graph eksplisit, testable, dan konsisten.

#### Acceptance Criteria

1. THE `BookingManagementController` SHALL NOT call `app(AvailabilityService::class)` or any other `app()` helper for service resolution.
2. THE `BookingManagementController` SHALL resolve `AvailabilityService` exclusively through the constructor-injected `$this->availabilityService` property.
3. WHEN `getPropertyDateRange()`, `checkAvailability()`, dan `availabilityAndRates()` methods need `AvailabilityService`, THE methods SHALL use `$this->availabilityService` (already injected in constructor).
4. THE `AdminBookingService` SHALL NOT call `app()` for any dependency resolution.
5. WHERE a service requires `AvailabilityService`, THE service SHALL declare it as a constructor parameter.

---

### Requirement 6: Eliminasi Duplikasi Query di timeline() dan timelineView()

**User Story:** Sebagai developer, saya ingin tidak ada duplikasi query logic antara `timeline()` dan `timelineView()` sehingga perubahan filter atau query hanya perlu dilakukan di satu tempat.

#### Acceptance Criteria

1. THE `BookingManagementController` SHALL NOT contain duplicate Eloquent query builder chains for fetching timeline bookings.
2. THE `BookingQueryService` (atau equivalent private method/scope) SHALL encapsulate the shared booking query logic untuk timeline: date range overlap filter, property owner filter, property filter, dan status filter.
3. WHEN `timeline()` needs booking data, THE method SHALL call the shared query builder.
4. WHEN `timelineView()` needs booking data, THE method SHALL call the same shared query builder.
5. THE shared query logic SHALL support parameters: `startDate`, `endDate`, `propertyId`, `status`, dan `userId` (untuk role-based filtering).

---

### Requirement 7: Pindahkan Payment Income Sync ke Queued Job

**User Story:** Sebagai developer, saya ingin payment income sync dijalankan secara asynchronous via Job sehingga tidak memblokir response user dan tidak berisiko membatalkan DB transaction jika sync gagal.

#### Acceptance Criteria

1. THE `AdminBookingService` SHALL NOT call `PaymentIncomeSyncService::syncOnVerified()` synchronously inside a DB transaction.
2. WHEN a payment with status `verified` is created, THE `AdminBookingService` SHALL dispatch `SyncPaymentIncomeJob` after the DB transaction commits.
3. THE `SyncPaymentIncomeJob` SHALL accept a `Payment` model instance (atau payment ID) dan memanggil `PaymentIncomeSyncService::syncOnVerified()`.
4. IF `SyncPaymentIncomeJob` fails, THE job SHALL be retried according to the application's queue retry configuration without affecting the booking creation result.
5. THE `SyncPaymentIncomeJob` SHALL be dispatched using `dispatch()->afterCommit()` atau equivalent pattern untuk memastikan job hanya berjalan setelah transaksi berhasil commit.

---

### Requirement 8: Konsistensi Arsitektur — Zero Duplication

**User Story:** Sebagai developer, saya ingin tidak ada logika yang sama ditulis lebih dari satu kali di antara `BookingManagementController`, `AdminBookingService`, dan `CreateBookingAction`.

#### Acceptance Criteria

1. THE `autoConfirm` logic SHALL exist in exactly one place: `CreateBookingAction`.
2. THE `applyRateOverride` logic SHALL exist in exactly one place: `CreateBookingAction`.
3. THE `applyAdminMetadata` (set `created_by`, `source`) logic SHALL exist in exactly one place: `CreateBookingAction`.
4. WHEN `AdminBookingService` needs auto-confirm, rate override, or metadata behavior, THE service SHALL pass the relevant flags/data to `CreateBookingAction::execute()` rather than implementing the logic itself.
5. THE `BookingManagementController` `update()` method business logic (rate recalculation, service sync, DP recalculation) SHALL be extracted to `AdminBookingService::updateAdminBooking()`.
