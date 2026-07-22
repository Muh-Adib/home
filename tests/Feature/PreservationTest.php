<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Services\BookingExtraServiceSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Preservation Property Tests — Task 2 (Bugfix: codebase-audit-cleanup)
 *
 * Tujuan: Mendokumentasikan baseline perilaku SEBELUM fix diimplementasikan.
 * Test ini HARUS LULUS pada kode unfixed — mereka menetapkan baseline yang harus dipertahankan.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 3.8
 */
class PreservationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ]);
    }

    // =========================================================================
    // Property 5: Preservation — Semua Route admin.bookings.* Tetap Resolve
    // Validates: Requirements 3.1, 3.2, 3.3, 3.8
    // =========================================================================

    /**
     * For all named routes currently used by frontend (admin.bookings.*),
     * all SHALL resolve correctly (non-404).
     *
     * Observasi: Routes admin.bookings.* ditemukan via `php artisan route:list --name=admin.bookings`
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.8**
     */
    public function test_all_admin_bookings_named_routes_are_registered(): void
    {
        // Routes yang diobservasi dari `php artisan route:list --name=admin.bookings`
        $expectedRoutes = [
            'admin.bookings.index',
            'admin.bookings.store',
            'admin.bookings.create',
            'admin.bookings.show',
            'admin.bookings.edit',
            'admin.bookings.update',
            'admin.bookings.cancel',
            'admin.bookings.verify',
            'admin.bookings.reject',
            'admin.bookings.checkin',
            'admin.bookings.checkout',
            'admin.bookings.export',
            'admin.bookings.import.preview',
            'admin.bookings.import.confirmed',
            'admin.bookings.check-in-out',
            'admin.bookings.check-in-out.generate-text',
            'admin.bookings.send-payment-link',
            'admin.bookings.whatsapp',
            'admin.bookings.daily-operations',
        ];

        foreach ($expectedRoutes as $routeName) {
            $this->assertTrue(
                Route::has($routeName),
                "Route '{$routeName}' harus terdaftar (admin.bookings.* preservation)"
            );
        }
    }

    /**
     * For all admin.bookings.* index/list routes, they SHALL return non-404 when accessed by admin.
     *
     * **Validates: Requirements 3.1, 3.8**
     */
    public function test_admin_bookings_index_resolves_non_404(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('admin.bookings.index'));

        $this->assertNotEquals(404, $response->getStatusCode(),
            'Route admin.bookings.index harus resolve (non-404)'
        );
    }

    /**
     * For all admin.bookings.* create routes, they SHALL return non-404 when accessed by admin.
     *
     * **Validates: Requirements 3.1, 3.8**
     */
    public function test_admin_bookings_create_resolves_non_404(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('admin.bookings.create'));

        $this->assertNotEquals(404, $response->getStatusCode(),
            'Route admin.bookings.create harus resolve (non-404)'
        );
    }

    /**
     * For all admin.bookings.* check-in-out routes, they SHALL return non-404 when accessed by admin.
     *
     * **Validates: Requirements 3.1, 3.8**
     */
    public function test_admin_bookings_check_in_out_resolves_non_404(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('admin.bookings.check-in-out'));

        $this->assertNotEquals(404, $response->getStatusCode(),
            'Route admin.bookings.check-in-out harus resolve (non-404)'
        );
    }

    // =========================================================================
    // Property 6: Preservation — BookingExtraServiceSyncService::sync() Konsisten
    // Validates: Requirements 3.5
    // =========================================================================

    /**
     * BookingExtraServiceSyncService class SHALL exist and be callable.
     *
     * **Validates: Requirements 3.5**
     */
    public function test_booking_service_sync_service_class_exists(): void
    {
        $this->assertTrue(
            class_exists(BookingExtraServiceSyncService::class),
            'Class BookingExtraServiceSyncService harus ada'
        );
    }

    /**
     * BookingExtraServiceSyncService SHALL have a sync() method.
     *
     * **Validates: Requirements 3.5**
     */
    public function test_booking_service_sync_service_has_sync_method(): void
    {
        $this->assertTrue(
            method_exists(BookingExtraServiceSyncService::class, 'sync'),
            'BookingExtraServiceSyncService harus memiliki method sync()'
        );
    }

    /**
     * For all valid booking inputs with empty services,
     * BookingExtraServiceSyncService::sync() SHALL return 0.0 consistently.
     *
     * **Validates: Requirements 3.5**
     */
    public function test_sync_returns_zero_for_empty_services(): void
    {
        $property = Property::factory()->create();
        $booking = Booking::factory()->create(['property_id' => $property->id]);
        $service = new BookingExtraServiceSyncService;

        // Property: untuk semua input services kosong/null, sync() harus return 0.0
        $inputs = [null, [], ''];

        foreach ($inputs as $input) {
            $result = $service->sync($booking, is_string($input) ? null : $input);
            $this->assertEquals(0.0, $result,
                'sync() harus return 0.0 untuk input services kosong/null (input: '.json_encode($input).')'
            );
        }
    }

    /**
     * For all valid booking inputs with valid services array,
     * BookingExtraServiceSyncService::sync() SHALL produce consistent output (sum of total_price).
     *
     * **Validates: Requirements 3.5**
     */
    public function test_sync_produces_consistent_output_for_valid_services(): void
    {
        $property = Property::factory()->create();
        $booking = Booking::factory()->create(['property_id' => $property->id]);
        $service = new BookingExtraServiceSyncService;

        // Berbagai kombinasi input services yang valid
        $testCases = [
            // Single service
            [
                'services' => [
                    [
                        'service_name' => 'Extra Bed',
                        'service_type' => 'extra_bed',
                        'quantity' => 1,
                        'unit_price' => 100000,
                        'total_price' => 100000,
                        'service_master_id' => null,
                    ],
                ],
                'expected_total' => 100000.0,
            ],
            // Multiple services
            [
                'services' => [
                    [
                        'service_name' => 'Extra Bed',
                        'service_type' => 'extra_bed',
                        'quantity' => 2,
                        'unit_price' => 100000,
                        'total_price' => 200000,
                        'service_master_id' => null,
                    ],
                    [
                        'service_name' => 'Breakfast',
                        'service_type' => 'meal',
                        'quantity' => 3,
                        'unit_price' => 50000,
                        'total_price' => 150000,
                        'service_master_id' => null,
                    ],
                ],
                'expected_total' => 350000.0,
            ],
        ];

        foreach ($testCases as $case) {
            // Buat booking baru untuk setiap test case agar tidak ada side effect
            $freshBooking = Booking::factory()->create(['property_id' => $property->id]);
            $result = $service->sync($freshBooking, $case['services']);

            $this->assertEquals(
                $case['expected_total'],
                $result,
                'sync() harus menghasilkan total yang konsisten: '.json_encode($case['services'])
            );
        }
    }

    /**
     * For any valid booking input, calling sync() multiple times with replaceExisting=true
     * SHALL produce the same result (idempotent behavior).
     *
     * **Validates: Requirements 3.5**
     */
    public function test_sync_is_idempotent_with_replace_existing(): void
    {
        $property = Property::factory()->create();
        $booking = Booking::factory()->create(['property_id' => $property->id]);
        $service = new BookingExtraServiceSyncService;

        $services = [
            [
                'service_name' => 'Extra Bed',
                'service_type' => 'extra_bed',
                'quantity' => 1,
                'unit_price' => 100000,
                'total_price' => 100000,
                'service_master_id' => null,
            ],
        ];

        // Panggil sync() dua kali dengan replaceExisting=true — harus menghasilkan total yang sama
        $result1 = $service->sync($booking, $services, replaceExisting: true);
        $result2 = $service->sync($booking, $services, replaceExisting: true);

        $this->assertEquals($result1, $result2,
            'sync() dengan replaceExisting=true harus menghasilkan output yang konsisten (idempotent)'
        );
        $this->assertEquals(100000.0, $result2,
            'sync() harus menghasilkan total yang benar setelah replace'
        );
    }
}
