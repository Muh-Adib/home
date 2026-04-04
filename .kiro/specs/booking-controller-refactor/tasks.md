# Implementation Plan: Booking Controller Refactor

## Overview

Refactoring non-breaking untuk menegakkan prinsip thin controller, immutable Value Object, zero duplication, dan async side effects. Urutan task dirancang agar setiap langkah tidak membreak kode yang sudah ada.

## Tasks

- [x] 1. Buat `BookingQueryService` - service baru untuk memusatkan query timeline
  - [x] 1.1 Buat file `app/Services/BookingQueryService.php`
    - Implementasi `getTimelineBookings(string $startDate, string $endDate, ?string $propertyId, ?string $status, User $user): Collection`
    - Implementasi private `buildTimelineQuery()` dengan date-range overlap logic, role-based filter, property filter, status filter
    - Tambahkan `status_color` mapping via `$booking->getStatusColor()` di hasil collection
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ] 1.2 Tulis unit test `BookingQueryServiceTest`
    - Test filter `property_owner` hanya mengembalikan booking milik property owner tersebut
    - Test filter `propertyId` dan `status` diterapkan dengan benar
    - Test date range overlap logic (booking yang span melewati range tetap masuk)
    - _Requirements: 6.3, 6.4_

  - [ ] 1.3 Tulis property test untuk Property 4 (timeline query consistency)
    - Property 4: Timeline query consistency
    - Generate random kombinasi filter (`startDate`, `endDate`, `propertyId`, `status`)
    - Assert `getTimelineBookings()` mengembalikan collection yang sama untuk parameter yang sama
    - Validates: Requirements 6.2, 6.3, 6.4

- [x] 2. Buat `SyncPaymentIncomeJob` - Job baru untuk async payment sync
  - [x] 2.1 Buat file `app/Jobs/SyncPaymentIncomeJob.php`
    - Implementasi `ShouldQueue` dengan `Dispatchable`, `InteractsWithQueue`, `Queueable`, `SerializesModels`
    - Constructor menerima `private int $paymentId`
    - `handle(PaymentIncomeSyncService $syncService): void` - load payment by ID, panggil `syncService->syncOnVerified($payment)`
    - Set `public int $tries = 3` dan `public int $backoff = 60`
    - Log warning jika payment tidak ditemukan, return early tanpa exception
    - _Requirements: 7.3, 7.4_

  - [ ] 2.2 Tulis unit test `SyncPaymentIncomeJobTest`
    - Test `handle()` memanggil `PaymentIncomeSyncService::syncOnVerified()` dengan payment yang benar
    - Test `handle()` tidak melempar exception jika payment tidak ditemukan (log warning saja)
    - _Requirements: 7.3, 7.4_

- [x] 3. Checkpoint - Pastikan semua tests pass sebelum modifikasi file existing
  - Jalankan `php artisan test --filter BookingQueryServiceTest`
  - Jalankan `php artisan test --filter SyncPaymentIncomeJobTest`
  - Pastikan tidak ada error, tanya user jika ada pertanyaan.

- [x] 4. Jadikan `BookingRequest` Value Object immutable
  - [x] 4.1 Hapus mutable properties dan setter dari `BookingRequest`
    - Di `app/Domain/Booking/ValueObjects/BookingRequest.php`: hapus `public array $rateCalculation = []` dan `public int $totalAmount = 0`
    - Hapus method `setRateCalculation(array): void` dan `setTotalAmount(int): void`
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Refactor `BookingService::createBooking()` agar tidak menggunakan setter
    - Di `app/Services/BookingService.php` method `createBooking()`: hapus baris `$request->setRateCalculation(...)` dan `$request->setTotalAmount(...)`
    - Simpan hasil `$rateCalculation` sebagai local variable dan gunakan langsung untuk `insertDailyRevenueWithBreakdown()` dan `bookingRepository->create()`
    - Pastikan `$rateCalculation->totalAmount` tetap digunakan untuk kalkulasi booking amount
    - _Requirements: 4.3, 4.5_

  - [~] 4.3 Tulis property test untuk Property 2 (BookingRequest immutability)
    - Property 2: BookingRequest immutability
    - Assert tidak ada public setter method yang dapat mengubah state setelah konstruksi
    - Assert semua properties adalah `readonly`
    - Validates: Requirements 4.1, 4.2

  - [~] 4.4 Tulis property test untuk Property 3 (BookingRequest round-trip)
    - Property 3: BookingRequest fromArray round-trip
    - Generate random valid booking data arrays
    - Assert `BookingRequest::fromArray($data)->toArray()` mempertahankan semua core fields
    - Validates: Requirements 4.4

- [x] 5. Bersihkan `AdminBookingService` - hapus dead methods, pindahkan availability check, ganti sync dengan Job
  - [x] 5.1 Hapus dead methods dari `AdminBookingService`
    - Di `app/Services/AdminBookingService.php`: hapus private method `applyAdminMetadata()`
    - Hapus private method `applyRateOverride()`
    - Hapus private method `autoConfirmBooking()`
    - Verifikasi bahwa `CreateBookingAction::execute()` sudah menangani semua tiga fungsi tersebut
    - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2, 8.3_

  - [x] 5.2 Pindahkan availability check dari controller ke `AdminBookingService`
    - Di `AdminBookingService::createAdminBooking()`: tambahkan guest count validation (`> capacity_max`) sebelum availability check
    - Tambahkan `AvailabilityService $availabilityService` ke constructor `AdminBookingService` (inject, bukan `app()`)
    - Pindahkan logic availability check + overlapping booking query + OTA-only detection dari `BookingManagementController::store()` ke `AdminBookingService::createAdminBooking()`
    - Return `AdminBookingResult::failure(['booked_periods' => ..., 'can_override' => ...])` jika tidak tersedia
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 5.3 Ganti sync call `PaymentIncomeSyncService` dengan dispatch `SyncPaymentIncomeJob`
    - Di `AdminBookingService::createPayment()`: hapus `$this->paymentIncomeSyncService->syncOnVerified($payment)` yang synchronous
    - Hapus `PaymentIncomeSyncService` dari constructor `AdminBookingService`
    - Di `createAdminBooking()` setelah `DB::commit()`: tambahkan `SyncPaymentIncomeJob::dispatch($payment->id)->afterCommit()` jika payment verified
    - _Requirements: 7.1, 7.2, 7.5_

  - [~] 5.4 Tulis unit test `AdminBookingServiceTest`
    - Test `createAdminBooking()` memanggil `AvailabilityService` yang di-inject (bukan `app()`)
    - Test `createAdminBooking()` mengembalikan failure result dengan `booked_periods` dan `can_override` jika property tidak tersedia
    - Test `SyncPaymentIncomeJob` di-dispatch (bukan sync call) menggunakan `Queue::fake()`
    - _Requirements: 2.2, 2.4, 7.1, 7.2_

  - [~] 5.5 Tulis property test untuk Property 1 (OTA-only conflict detection)
    - Property 1: OTA-only conflict detection
    - Generate random sets of overlapping bookings dengan random sources
    - Assert `can_override === true` jika dan hanya jika semua overlapping bookings memiliki source OTA
    - Validates: Requirements 2.3, 2.5

  - [~] 5.6 Tulis property test untuk Property 5 (payment sync is async)
    - Property 5: Payment sync is async
    - Assert `SyncPaymentIncomeJob` di-dispatch ke queue (via `Queue::fake()`) untuk setiap booking dengan payment status verified
    - Assert `PaymentIncomeSyncService::syncOnVerified()` TIDAK dipanggil synchronously di dalam DB transaction
    - Validates: Requirements 7.1, 7.2

- [x] 6. Checkpoint - Pastikan semua tests pass setelah perubahan AdminBookingService
  - Jalankan `php artisan test --filter AdminBookingServiceTest`
  - Jalankan `php artisan test --filter AdminBookingManagementTest`
  - Pastikan tidak ada regression, tanya user jika ada pertanyaan.

- [x] 7. Slim down `BookingManagementController`
  - [x] 7.1 Refactor constructor `BookingManagementController`
    - Di `app/Http/Controllers/Admin/BookingManagementController.php`: ganti constructor agar hanya inject `AdminBookingService`, `BookingQueryService`, `RateCalculationService`, `AvailabilityService`
    - Hapus injection: `BookingService`, `GuestCountService`, `BookingDailyRevenueService`, `BookingExtraServiceSyncService`, `RateOverrideLogService`, `PaymentGatewayService`
    - _Requirements: 1.5, 5.1, 5.2_

  - [x] 7.2 Slim down method `store()` di controller
    - Hapus semua inline availability check logic (guest count validation, `AvailabilityService` call, overlapping booking query, OTA detection) - sudah dipindah ke `AdminBookingService` di task 5.2
    - Method `store()` hanya boleh: `$request->validated()`, panggil `$this->adminBookingService->createAdminBooking(...)`, return redirect atau `back()->withErrors()`
    - _Requirements: 1.2, 1.3, 2.1_

  - [x] 7.3 Refactor `timeline()` dan `timelineView()` untuk menggunakan `BookingQueryService`
    - Ganti inline Eloquent query builder chains di `timeline()` dengan `$this->bookingQueryService->getTimelineBookings(...)`
    - Ganti inline Eloquent query builder chains di `timelineView()` dengan `$this->bookingQueryService->getTimelineBookings(...)`
    - Hapus duplikasi query logic antara kedua method tersebut
    - _Requirements: 1.2, 6.1, 6.3, 6.4_

  - [x] 7.4 Ganti semua `app()` helper calls dengan injected dependencies
    - Cari semua `app(AvailabilityService::class)` di `checkAvailability()`, `availabilityAndRates()`, `getPropertyDateRange()`, dan `store()`
    - Ganti dengan `$this->availabilityService`
    - _Requirements: 1.5, 5.1, 5.2, 5.3_

  - [x] 7.5 Tulis/update feature test `BookingManagementControllerTest`
    - Test `store()` hanya memanggil `adminBookingService->createAdminBooking()` dan return redirect
    - Test `store()` tidak mengandung availability check logic sendiri
    - Test `timeline()` dan `timelineView()` mengembalikan data yang konsisten untuk parameter yang sama
    - _Requirements: 1.1, 1.2, 2.1_

- [x] 8. Final checkpoint - Verifikasi semua requirements terpenuhi
  - Jalankan `php artisan test` untuk full test suite
  - Verifikasi smoke check list dari design document
  - Pastikan tidak ada regression, tanya user jika ada pertanyaan.

## Notes

- Tasks bertanda `*` adalah opsional dan dapat dilewati untuk implementasi lebih cepat
- Urutan task dirancang non-breaking: file baru dibuat dulu (task 1-2), baru modifikasi file existing (task 4-7)
- Task 4 (BookingRequest immutability) harus selesai sebelum task 5 dan 7
