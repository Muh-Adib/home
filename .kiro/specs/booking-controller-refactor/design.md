# Design Document: Booking Controller Refactor

## Overview

Refactoring arsitektur `BookingManagementController` dan layer terkait pada Homsjogja PMS. Tujuan: menegakkan prinsip "thin controller" (~100–150 baris), menghilangkan dead code, membuat `BookingRequest` benar-benar immutable, menghapus duplikasi query timeline, dan memindahkan payment sync ke async Job.

Refactoring ini **non-breaking** — tidak mengubah behavior yang sudah ada, hanya memindahkan dan merestrukturisasi kode ke layer yang tepat.

---

## Architecture

### Layer Diagram

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  BookingManagementController  (~100–150 baris)          │
│  - Validasi via FormRequest                             │
│  - Otorisasi via Policy                                 │
│  - Panggil service/query service                        │
│  - Return Inertia::render / redirect / JsonResponse     │
└────────────┬────────────────────────┬───────────────────┘
             │                        │
             ▼                        ▼
┌────────────────────┐   ┌────────────────────────────────┐
│  AdminBookingService│   │  BookingQueryService (NEW)     │
│  - createAdminBooking│  │  - getTimelineBookings()       │
│  - updateAdminBooking│  │  - getIndexBookings()          │
│  - availability check│  │  - getCalendarBookings()       │
│  - dispatch Job     │  └────────────────────────────────┘
└────────┬───────────┘
         │
         ▼
┌────────────────────┐   ┌────────────────────────────────┐
│  CreateBookingAction│   │  SyncPaymentIncomeJob (NEW)    │
│  - ensureGuestUser  │   │  - handle(): syncOnVerified()  │
│  - createBooking    │   └────────────────────────────────┘
│  - autoConfirm      │
│  - applyRateOverride│
│  - applyAdminMeta   │
│  - syncServices     │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  BookingService    │
│  - createBooking() │
│  (core domain)     │
└────────────────────┘
```

### Data Flow: store() (Admin Create Booking)

```
Request → CreateBookingRequest (validation)
        → BookingManagementController::store()
            → AdminBookingService::createAdminBooking(validated, file, user)
                → AvailabilityService::checkAvailability()   [injected]
                → [if unavailable] return AdminBookingResult::failure(booked_periods, can_override)
                → CreateBookingAction::execute(data, admin)
                    → EnsureGuestUserAction::execute()
                    → BookingService::createBooking(BookingRequest)
                    → autoConfirm() [if flag set]
                    → applyRateOverride() [if flag set]
                    → applyAdminMetadata() [source, created_by]
                    → serviceSyncService::sync()
                → createPayment() [if payment data present]
                → SyncPaymentIncomeJob::dispatch()->afterCommit()  [if verified]
                → return AdminBookingResult::success(booking, payment)
        → redirect to show
```

---

## Components and Interfaces

### 1. BookingManagementController (slim)

**Dihapus dari controller:**
- Semua inline Eloquent query builder chains (pindah ke `BookingQueryService`)
- Availability check logic di `store()` (pindah ke `AdminBookingService`)
- Overlapping booking query di `store()` (pindah ke `AdminBookingService`)
- Semua `app()` helper calls (ganti dengan `$this->injectedService`)
- Business logic di `update()` (pindah ke `AdminBookingService::updateAdminBooking()`)

**Tetap di controller:**
- Route method signatures
- FormRequest injection & `$request->validated()`
- Policy authorization (`$this->authorize()`)
- Pemanggilan service via injected property
- Return `Inertia::render()` / `redirect()` / `response()->json()`

**Constructor setelah refactor:**
```php
public function __construct(
    private AdminBookingService $adminBookingService,
    private BookingQueryService $bookingQueryService,
    private RateCalculationService $rateCalculationService,
    private AvailabilityService $availabilityService,
) {}
```

### 2. AdminBookingService (bersih)

**Dihapus:**
- `applyAdminMetadata()` — sudah ada di `CreateBookingAction` step 5
- `applyRateOverride()` — sudah ada di `CreateBookingAction::applyRateOverride()`
- `autoConfirmBooking()` — sudah ada di `CreateBookingAction::autoConfirm()`

**Ditambahkan:**
- Availability check + OTA-only detection (dipindah dari controller `store()`)
- `updateAdminBooking()` (dipindah dari controller `update()`)
- Dispatch `SyncPaymentIncomeJob` menggantikan sync call langsung

**Interface publik:**
```php
public function createAdminBooking(array $validated, ?UploadedFile $paymentProof, User $admin): AdminBookingResult
public function updateAdminBooking(Booking $booking, array $validated, ?array $services, User $admin): AdminBookingResult
```

### 3. BookingQueryService (BARU)

**File:** `app/Services/BookingQueryService.php`

Memusatkan semua query booking berulang yang saat ini terduplikasi di `timeline()`, `timelineView()`, `index()`, dan `timelineData()`.

**Interface:**
```php
public function getTimelineBookings(
    string $startDate,
    string $endDate,
    ?int $propertyId,
    ?string $status,
    User $user
): Collection

public function getIndexBookings(
    array $filters,
    User $user
): Collection
```

### 4. SyncPaymentIncomeJob (BARU)

**File:** `app/Jobs/SyncPaymentIncomeJob.php`

Menggantikan panggilan synchronous `$this->paymentIncomeSyncService->syncOnVerified($payment)` di dalam DB transaction.

**Interface:**
```php
class SyncPaymentIncomeJob implements ShouldQueue
{
    public function __construct(private int $paymentId) {}
    public function handle(PaymentIncomeSyncService $syncService): void
}
```

### 5. BookingRequest Value Object (immutable)

**Dihapus:**
- `public array $rateCalculation = []` → hapus property mutable
- `public int $totalAmount = 0` → hapus property mutable
- `setRateCalculation(array): void` → hapus setter
- `setTotalAmount(int): void` → hapus setter

**Semua property menjadi `readonly`** via constructor promotion. Caller yang butuh rate data mengambilnya langsung dari `RateCalculationService` return value, bukan dari VO.

---

## Data Models

Tidak ada perubahan schema database. Semua perubahan bersifat structural di layer PHP.

### AdminBookingResult (existing, tidak berubah)

```php
class AdminBookingResult {
    public static function success(Booking $booking, ?Payment $payment): self
    public static function failure(array $errors): self
    public function isSuccess(): bool
    public function isFailure(): bool
    public function getBooking(): ?Booking
    public function getErrors(): array
}
```

Untuk kebutuhan Requirement 2.4–2.5, `failure()` perlu mendukung structured conflict data:

```php
// Contoh penggunaan di AdminBookingService
return AdminBookingResult::failure([
    'error' => 'Property is not available for selected dates.',
    'booked_periods' => $availability['booked_periods'] ?? [],
    'can_override' => $blockedByOtaOnly,
]);
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: OTA-only conflict detection

*For any* set of overlapping bookings, `AdminBookingService` SHALL set `can_override = true` in the failure result if and only if every overlapping booking has a source in `['airbnb', 'booking_com', 'ota']`.

**Validates: Requirements 2.3, 2.5**

### Property 2: BookingRequest immutability

*For any* `BookingRequest` instance constructed via `fromArray()`, no public setter method SHALL exist that can mutate its state after construction. All properties SHALL be `readonly`.

**Validates: Requirements 4.1, 4.2**

### Property 3: BookingRequest fromArray round-trip

*For any* valid booking data array, calling `BookingRequest::fromArray($data)->toArray()` SHALL produce an array where all core fields (`property_id`, `check_in`, `check_out`, `guest_name`, `guest_email`, `guest_phone`, `guest_count`, `booking_status`, `payment_status`) match the original input values.

**Validates: Requirements 4.4**

### Property 4: Timeline query consistency

*For any* combination of filter parameters (`startDate`, `endDate`, `propertyId`, `status`, `userId`), `BookingQueryService::getTimelineBookings()` SHALL return the same booking collection regardless of whether it is called from `timeline()` or `timelineView()`.

**Validates: Requirements 6.2, 6.3, 6.4**

### Property 5: Payment sync is async

*For any* admin booking creation where payment status is `verified`, `SyncPaymentIncomeJob` SHALL be dispatched to the queue (verifiable via `Queue::fake()`) and `PaymentIncomeSyncService::syncOnVerified()` SHALL NOT be called synchronously within the DB transaction.

**Validates: Requirements 7.1, 7.2**

---

## Error Handling

### AdminBookingService::createAdminBooking()

| Kondisi | Behavior |
|---|---|
| Property tidak tersedia | Return `AdminBookingResult::failure(['booked_periods' => ..., 'can_override' => ...])` |
| Guest count melebihi kapasitas | Return `AdminBookingResult::failure(['guest_count' => '...'])` |
| DB transaction gagal | Rollback, return `AdminBookingResult::failure(['error' => '...'])`, log error |
| Payment proof upload gagal | Log warning, fallback ke format original, booking tetap berhasil |

### SyncPaymentIncomeJob

- Jika job gagal: retry sesuai konfigurasi queue default (3x dengan backoff)
- Kegagalan job tidak mempengaruhi hasil booking creation (sudah committed)
- Log error di setiap attempt yang gagal

### BookingQueryService

- Tidak melempar exception untuk filter kosong — return empty collection
- Role-based filtering diterapkan secara konsisten untuk semua query

---

## Testing Strategy

### Unit Tests

Fokus pada behavior spesifik dengan contoh konkret:

- `AdminBookingServiceTest`: verify `createAdminBooking()` memanggil `AvailabilityService` yang di-inject (bukan `app()`), verify `SyncPaymentIncomeJob` di-dispatch (bukan sync call), verify failure result berisi `booked_periods` dan `can_override`
- `BookingQueryServiceTest`: verify filter parameters diterapkan dengan benar, verify role-based filtering untuk `property_owner`
- `SyncPaymentIncomeJobTest`: verify `handle()` memanggil `PaymentIncomeSyncService::syncOnVerified()` dengan payment yang benar
- `BookingManagementControllerTest`: verify `store()` hanya memanggil `adminBookingService->createAdminBooking()` dan return redirect

### Property-Based Tests

Menggunakan [eris/eris](https://github.com/giorgiosironi/eris) atau implementasi manual dengan generator sederhana:

**Property 1 — OTA-only detection:**
```php
// Tag: Feature: booking-controller-refactor, Property 1: OTA-only conflict detection
// Generate random sets of bookings with random sources
// Assert: can_override === (all sources are OTA)
// Min 100 iterations
```

**Property 3 — BookingRequest round-trip:**
```php
// Tag: Feature: booking-controller-refactor, Property 3: BookingRequest fromArray round-trip
// Generate random valid booking data arrays
// Assert: fromArray($data)->toArray() preserves all core fields
// Min 100 iterations
```

**Property 4 — Timeline consistency:**
```php
// Tag: Feature: booking-controller-refactor, Property 4: Timeline query consistency
// Generate random filter combinations
// Assert: getTimelineBookings() returns same result for same params
// Min 100 iterations
```

### Integration Tests

- Verify `BookingManagementController::store()` end-to-end dengan database test (SQLite in-memory)
- Verify `SyncPaymentIncomeJob` dijalankan setelah commit (tidak sebelumnya)

### Smoke Tests / Code Review Checklist

Setelah implementasi, verifikasi:
- [ ] `BookingManagementController` tidak mengandung `app()` calls
- [ ] `BookingManagementController` tidak mengandung raw Eloquent query chains
- [ ] `AdminBookingService` tidak mengandung `applyAdminMetadata()`, `applyRateOverride()`, `autoConfirmBooking()` sebagai method terpisah
- [ ] `BookingRequest` tidak memiliki `setRateCalculation()`, `setTotalAmount()`, atau public mutable properties
- [ ] `SyncPaymentIncomeJob` di-dispatch dengan `afterCommit()`, bukan dipanggil sync
- [ ] `timeline()` dan `timelineView()` keduanya memanggil `BookingQueryService`


---

## Low-Level Design

### BookingManagementController — Method Signatures (setelah refactor)

```php
class BookingManagementController extends Controller
{
    public function __construct(
        private AdminBookingService $adminBookingService,
        private BookingQueryService $bookingQueryService,
        private RateCalculationService $rateCalculationService,
        private AvailabilityService $availabilityService,
    ) {}

    public function index(Request $request): Response
    public function calendar(Request $request): Response
    public function create(Request $request): Response
    public function store(CreateBookingRequest $request): RedirectResponse
    public function show(Booking $booking): Response
    public function edit(Booking $booking): Response
    public function update(UpdateBookingRequest $request, Booking $booking): RedirectResponse
    public function updateStatus(UpdateBookingStatusRequest $request, Booking $booking): RedirectResponse
    public function timeline(Request $request): JsonResponse
    public function timelineView(Request $request): Response
    public function timelineData(Request $request): JsonResponse
    public function search(Request $request): JsonResponse
    public function checkAvailability(CheckAvailabilityRequest $request): JsonResponse
    public function calculateRate(CalculateRateRequest $request): JsonResponse
    public function availabilityAndRates(CalculateRateRequest $request): JsonResponse
    public function getPropertyDateRange(GetPropertyDateRangeRequest $request): JsonResponse
}
```

**Pseudocode store() setelah refactor:**
```php
public function store(CreateBookingRequest $request): RedirectResponse
{
    $result = $this->adminBookingService->createAdminBooking(
        $request->validated(),
        $request->file('payment_proof'),
        $request->user()
    );

    if ($result->isFailure()) {
        return back()->withErrors($result->getErrors());
    }

    return redirect()
        ->route('admin.booking-management.show', $result->getBooking())
        ->with('success', 'Booking created successfully.');
}
```

**Pseudocode timeline() setelah refactor:**
```php
public function timeline(Request $request): JsonResponse
{
    $bookings = $this->bookingQueryService->getTimelineBookings(
        startDate: $request->get('start_date', now()->startOfMonth()->toDateString()),
        endDate: $request->get('end_date', now()->addMonths(2)->endOfMonth()->toDateString()),
        propertyId: $request->get('property_id'),
        status: $request->get('status'),
        user: $request->user()
    );

    return response()->json(['bookings' => $bookings, 'date_range' => [...]]);
}
```

---

### AdminBookingService — Perubahan Kritis

**Dihapus (dead methods):**
```
- applyAdminMetadata()   → sudah ada di CreateBookingAction step 5
- applyRateOverride()    → sudah ada di CreateBookingAction::applyRateOverride()
- autoConfirmBooking()   → sudah ada di CreateBookingAction::autoConfirm()
```

**Constructor setelah refactor:**
```php
public function __construct(
    private GuestCountService $guestCountService,
    private BookingExtraServiceSyncService $serviceSyncService,
    private RateOverrideLogService $rateOverrideLogService,
    private RateCalculationService $rateCalculationService,
    private BookingDailyRevenueService $dailyRevenueService,
    private AvailabilityService $availabilityService,       // ← dipindah dari controller
    private CreateBookingAction $createBookingAction,
    private ImageService $imageService,
) {}
// BookingService dan PaymentIncomeSyncService dihapus dari constructor
// (BookingService sudah di-inject ke CreateBookingAction)
// (PaymentIncomeSyncService digantikan oleh SyncPaymentIncomeJob)
```

**Pseudocode createAdminBooking() setelah refactor:**
```php
public function createAdminBooking(array $validated, ?UploadedFile $paymentProof, User $admin): AdminBookingResult
{
    $property = Property::findOrFail($validated['property_id']);
    $guestCount = $this->guestCountService->calculateFromRequest($property, $validated);

    // Availability check (dipindah dari controller)
    if ($guestCount > $property->capacity_max) {
        return AdminBookingResult::failure(['guest_count' => "Total guests ({$guestCount}) exceeds capacity."]);
    }

    $forceOverride = (bool) ($validated['force_ota_override'] ?? false);
    $availability = $this->availabilityService->checkAvailability(
        $property, $validated['check_in_date'], $validated['check_out_date'],
        $guestCount, null, $forceOverride
    );

    if (!$availability['available']) {
        $overlapping = Booking::where('property_id', $property->id)
            ->whereIn('booking_status', ['pending_verification', 'confirmed', 'checked_in', 'checked_out'])
            ->where('check_in', '<', $validated['check_out_date'])
            ->where('check_out', '>', $validated['check_in_date'])
            ->get(['id', 'source']);

        $blockedByOtaOnly = $overlapping->every(fn($b) => in_array($b->source, ['airbnb', 'booking_com', 'ota']));

        return AdminBookingResult::failure([
            'error' => 'Property is not available for selected dates.',
            'booked_periods' => $availability['booked_periods'] ?? [],
            'can_override' => $blockedByOtaOnly,
        ]);
    }

    try {
        DB::beginTransaction();

        $bookingData = $this->prepareBookingData($validated, $guestCount);
        $booking = $this->createBookingAction->execute($bookingData, $admin);
        // ↑ CreateBookingAction handles: applyAdminMetadata, autoConfirm, applyRateOverride, syncServices

        $payment = null;
        if (!empty($validated['payment_method_id']) && !empty($validated['payment_amount'])) {
            $payment = $this->createPayment($booking, $validated, $paymentProof, $admin);
        }

        DB::commit();

        // Dispatch async AFTER commit (tidak sync di dalam transaction)
        if ($payment && $payment->payment_status === 'verified') {
            SyncPaymentIncomeJob::dispatch($payment->id)->afterCommit();
        }

        return AdminBookingResult::success($booking, $payment);

    } catch (\Throwable $e) {
        DB::rollBack();
        Log::error('Admin booking creation failed', ['error' => $e->getMessage()]);
        return AdminBookingResult::failure(['error' => 'Failed to create booking: ' . $e->getMessage()]);
    }
}
```

**Pseudocode updateAdminBooking() (dipindah dari controller update()):**
```php
public function updateAdminBooking(Booking $booking, array $validated, ?array $services, User $admin): AdminBookingResult
{
    // Semua logic dari controller update() dipindah ke sini:
    // - guestCountService->calculateFromRequest()
    // - rateCalculationService->calculateRate() jika dates/guests berubah
    // - rateOverrideLogService->generateLog() jika rate_override
    // - dailyRevenueService->syncFromRateBreakdown()
    // - serviceSyncService->sync()
    // - booking->update($updateData)
    // - workflow()->create()
    // - event(new BookingStatusChanged())
}
```

---

### BookingQueryService — Struktur Class Baru

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class BookingQueryService
{
    /**
     * Query booking untuk timeline (dipakai oleh timeline() dan timelineView())
     */
    public function getTimelineBookings(
        string $startDate,
        string $endDate,
        ?string $propertyId,
        ?string $status,
        User $user
    ): Collection {
        return $this->buildTimelineQuery($startDate, $endDate, $propertyId, $status, $user)
            ->orderBy('check_in')
            ->get()
            ->map(fn($b) => tap($b, fn($b) => $b->status_color = $b->getStatusColor()));
    }

    /**
     * Query booking untuk index listing dengan pagination/filter
     */
    public function getIndexBookings(array $filters, User $user): Collection { ... }

    /**
     * Shared query builder untuk timeline overlap logic
     */
    private function buildTimelineQuery(
        string $startDate,
        string $endDate,
        ?string $propertyId,
        ?string $status,
        User $user
    ): Builder {
        $query = Booking::query()
            ->with(['property'])
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('check_in', [$startDate, $endDate])
                    ->orWhereBetween('check_out', [$startDate, $endDate])
                    ->orWhere(fn($q) => $q->where('check_in', '<=', $startDate)->where('check_out', '>=', $endDate));
            });

        if ($user->role === 'property_owner') {
            $query->whereHas('property', fn($q) => $q->where('owner_id', $user->id));
        }

        if ($propertyId && $propertyId !== 'all') {
            $query->where('property_id', $propertyId);
        }

        if ($status && $status !== 'all') {
            $query->where('booking_status', $status);
        }

        return $query;
    }
}
```

---

### SyncPaymentIncomeJob — Struktur Class Baru

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Payment;
use App\Services\PaymentIncomeSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncPaymentIncomeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60; // seconds

    public function __construct(private int $paymentId) {}

    public function handle(PaymentIncomeSyncService $syncService): void
    {
        $payment = Payment::find($this->paymentId);

        if (!$payment) {
            Log::warning('SyncPaymentIncomeJob: payment not found', ['payment_id' => $this->paymentId]);
            return;
        }

        $syncService->syncOnVerified($payment);
    }
}
```

**Dispatch pattern di AdminBookingService:**
```php
// SETELAH DB::commit() — bukan di dalam transaction
SyncPaymentIncomeJob::dispatch($payment->id)->afterCommit();
```

---

### BookingRequest — Perubahan Immutability

**Sebelum:**
```php
class BookingRequest
{
    public array $rateCalculation = [];   // ← mutable
    public int $totalAmount = 0;          // ← mutable

    public function setRateCalculation(array $rateCalculation): void { ... }  // ← setter
    public function setTotalAmount(int $totalAmount): void { ... }             // ← setter
}
```

**Sesudah:**
```php
class BookingRequest
{
    // Tidak ada public mutable properties
    // Tidak ada setter methods
    // Semua properties sudah readonly via constructor promotion

    public function __construct(
        public readonly int $propertyId,
        public readonly string $checkInDate,
        // ... semua readonly, tidak ada yang mutable
    ) {}

    // fromArray() tetap sebagai single construction point
    public static function fromArray(array $data): self { ... }
}
```

**Caller yang sebelumnya menggunakan setter:**
```php
// SEBELUM (di BookingService atau caller lain):
$bookingRequest->setRateCalculation($rateCalc->toArray());
$bookingRequest->setTotalAmount($rateCalc->totalAmount);

// SESUDAH: ambil langsung dari RateCalculationService return value
$rateCalc = $this->rateCalculationService->calculateRate($property, $checkIn, $checkOut, $guestCount);
$totalAmount = $rateCalc->totalAmount;
// Tidak perlu set ke BookingRequest — BookingService menggunakan RateCalculation VO langsung
```

---

### File Baru yang Perlu Dibuat

| File | Keterangan |
|---|---|
| `app/Services/BookingQueryService.php` | Service baru untuk dedup timeline query |
| `app/Jobs/SyncPaymentIncomeJob.php` | Job baru untuk async payment sync |

### File yang Dimodifikasi

| File | Perubahan |
|---|---|
| `app/Http/Controllers/Admin/BookingManagementController.php` | Slim down: hapus inline queries, hapus app() calls, hapus business logic update() |
| `app/Services/AdminBookingService.php` | Hapus dead methods, tambah availability check, tambah updateAdminBooking(), ganti sync call dengan Job dispatch |
| `app/Domain/Booking/ValueObjects/BookingRequest.php` | Hapus mutable properties dan setter methods |

### File yang Tidak Berubah

| File | Alasan |
|---|---|
| `app/Actions/Booking/CreateBookingAction.php` | Sudah benar — autoConfirm, applyRateOverride, applyAdminMetadata sudah ada di sini |
| `app/Http/Requests/Admin/CreateBookingRequest.php` | Validasi sudah di FormRequest |
| `app/Services/AvailabilityService.php` | Tidak berubah, hanya dipindah injection-nya |
| `app/Services/PaymentIncomeSyncService.php` | Tidak berubah, hanya dipanggil dari Job |
| Semua route files | Tidak ada perubahan route |
| Semua frontend files | Tidak ada perubahan API contract |
