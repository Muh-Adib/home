<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\HousekeepingSchedule;
use App\Models\Property;
use App\Models\UnitDamage;
use App\Models\User;
use App\Services\HousekeepingPointService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HousekeepingPointSystemTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $maleStaff;

    private User $femaleStaff;

    private Property $property;

    protected function setUp(): void
    {
        parent::setUp();

        // Create users
        $this->admin = User::factory()->create(['role' => 'super_admin']);

        $this->maleStaff = User::factory()->create([
            'role' => 'housekeeping',
            'gender' => 'male',
            'status' => 'active',
        ]);

        $this->femaleStaff = User::factory()->create([
            'role' => 'housekeeping',
            'gender' => 'female',
            'status' => 'active',
        ]);

        $this->property = Property::factory()->create([
            'cleaning_points' => 6.00,
            'status' => 'active',
        ]);
    }

    #[Test]
    public function it_can_generate_routine_schedules_respecting_male_only_night_shifts()
    {
        $this->actingAs($this->admin);

        // 1. Test night shift generation (must be male only)
        $response = $this->post(route('admin.housekeeping-schedules.generate'), [
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(2)->toDateString(),
            'task_name' => 'Jaga Malam Villa',
            'points' => 1.5,
        ]);

        $response->assertRedirect();

        $schedules = HousekeepingSchedule::all();
        $this->assertCount(3, $schedules);

        foreach ($schedules as $schedule) {
            $this->assertEquals($this->maleStaff->id, $schedule->user_id);
            $this->assertEquals('Jaga Malam Villa', $schedule->task_name);
            $this->assertEquals(1.5, $schedule->points);
        }

        // 2. Test standard shift generation (should allow either male/female)
        HousekeepingSchedule::truncate();

        $response2 = $this->post(route('admin.housekeeping-schedules.generate'), [
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'task_name' => 'Laundry Sprei',
            'points' => 1.0,
        ]);

        $response2->assertRedirect();
        $this->assertCount(1, HousekeepingSchedule::all());
    }

    #[Test]
    public function it_can_divide_checkout_cleaning_points_equally_among_cleaners()
    {
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_out' => now()->toDateString(),
            'booking_status' => 'checked_out',
            'is_cleaned' => false,
        ]);

        $this->actingAs($this->maleStaff);

        $response = $this->patch(route('staff.cleaning.mark-cleaned', $booking), [
            'new_keybox_code' => '789',
            'notes' => 'Bersih total',
            'cleaner_ids' => [
                $this->maleStaff->id,
                $this->femaleStaff->id,
            ],
        ]);

        $response->assertRedirect();

        // Total property points = 6.00. Divided by 2 cleaners = 3.00 each.
        $this->assertDatabaseHas('booking_cleaners', [
            'booking_id' => $booking->id,
            'user_id' => $this->maleStaff->id,
            'points' => 3.00,
        ]);

        $this->assertDatabaseHas('booking_cleaners', [
            'booking_id' => $booking->id,
            'user_id' => $this->femaleStaff->id,
            'points' => 3.00,
        ]);
    }

    #[Test]
    public function it_can_divide_unit_damage_resolution_points_equally_based_on_difficulty()
    {
        Storage::fake('public');

        $damage = UnitDamage::create([
            'property_id' => $this->property->id,
            'reported_by' => $this->admin->id,
            'title' => 'Lampu Kamar Mandi Pecah',
            'description' => 'Perlu diganti bohlamnya',
            'status' => 'pending',
            'difficulty' => 'medium', // 5.00 points
        ]);

        $this->actingAs($this->admin);

        $resolvedFile = UploadedFile::fake()->image('completed.jpg');

        $response = $this->patch(route('admin.unit-damages.resolve', $damage), [
            'resolved_notes' => 'Bohlam diganti Philips LED',
            'resolved_photo' => $resolvedFile,
            'worker_ids' => [
                $this->maleStaff->id,
                $this->femaleStaff->id,
            ],
        ]);

        $response->assertRedirect();

        // Medium = 5.00. Divided by 2 = 2.50 points per worker.
        $this->assertDatabaseHas('unit_damage_actions', [
            'unit_damage_id' => $damage->id,
            'user_id' => $this->maleStaff->id,
            'points' => 2.50,
        ]);

        $this->assertDatabaseHas('unit_damage_actions', [
            'unit_damage_id' => $damage->id,
            'user_id' => $this->femaleStaff->id,
            'points' => 2.50,
        ]);
    }

    #[Test]
    public function it_can_divide_custom_task_tier_points_equally()
    {
        $this->actingAs($this->admin);

        // Tier SSS = 30.00 points.
        $response = $this->post(route('admin.custom-tasks.store'), [
            'title' => 'Membersihkan Gudang Induk',
            'tier' => 'sss',
            'user_ids' => [
                $this->maleStaff->id,
                $this->femaleStaff->id,
            ],
        ]);

        $response->assertRedirect();

        // SSS = 100.00. Divided by 2 = 50.00 points per member.
        $this->assertDatabaseHas('custom_task_members', [
            'user_id' => $this->maleStaff->id,
            'points' => 50.00,
        ]);

        $this->assertDatabaseHas('custom_task_members', [
            'user_id' => $this->femaleStaff->id,
            'points' => 50.00,
        ]);
    }

    #[Test]
    public function it_calculates_monthly_sharing_pool_excluding_deficits()
    {
        $month = (int) now()->month;
        $year = (int) now()->year;

        // Clean any potential test entries
        \DB::table('incomes')->truncate();
        \DB::table('property_expenses')->truncate();

        // 1. Property with profit (Eligible)
        $profitableProperty = Property::factory()->create([
            'initial_build_capital' => 10000000,
            'lease_capital' => 5000000,
            'status' => 'active',
        ]);

        // Revenue = 20M, Expenses = 5M. Profit = 15M. Net Turnover (Revenue) = 20M.
        \DB::table('incomes')->insert([
            'property_id' => $profitableProperty->id,
            'amount' => 20000000,
            'source' => 'other',
            'description' => 'Room revenue',
            'income_date' => now()->toDateString(),
            'created_by' => $this->admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('property_expenses')->insert([
            'property_id' => $profitableProperty->id,
            'amount' => 5000000,
            'expense_category' => 'supplies',
            'description' => 'Buying items',
            'expense_date' => now()->toDateString(),
            'status' => 'approved',
            'recorded_by' => $this->admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Property in deficit (Deficit)
        $deficitProperty = Property::factory()->create([
            'initial_build_capital' => 10000000,
            'lease_capital' => 5000000,
            'status' => 'active',
        ]);

        // Revenue = 2M, Expenses = 10M. Profit = -8M (Deficit).
        \DB::table('incomes')->insert([
            'property_id' => $deficitProperty->id,
            'amount' => 2000000,
            'source' => 'other',
            'description' => 'Room revenue',
            'income_date' => now()->toDateString(),
            'created_by' => $this->admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('property_expenses')->insert([
            'property_id' => $deficitProperty->id,
            'amount' => 10000000,
            'expense_category' => 'supplies',
            'description' => 'Repairs cost',
            'expense_date' => now()->toDateString(),
            'status' => 'approved',
            'recorded_by' => $this->admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Award some points to staff
        $this->maleStaff->housekeepingSchedules()->create([
            'date' => now()->toDateString(),
            'task_name' => 'laundry',
            'points' => 10,
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        $pointService = app(HousekeepingPointService::class);
        $poolData = $pointService->getMonthlyPool($month, $year, 2.0);

        // Eligible turnover = 20,000,000. Total pool = 20,000,000 * 0.7% = 140,000.
        // Total points = 10. Point rate = 140,000 / 10 = 14,000 per point.
        $this->assertEquals(20000000.0, $poolData['eligible_turnover']);
        $this->assertEquals(140000.0, $poolData['total_pool']);
        $this->assertEquals(10.0, $poolData['total_points']);
        $this->assertEquals(14000.0, $poolData['point_rate']);

        // Assert points summary
        $pointsSummary = $pointService->getMonthlyPointsDetails($this->maleStaff->id, $month, $year);
        $this->assertEquals(10.0, $pointsSummary['routine']);

        $bonus = $pointService->calculateHousekeepingBonus($this->maleStaff->id, $month, $year, 2.0);
        $this->assertEquals(140000.0, $bonus); // 10 points * 14,000 rate = 140,000
    }
}
