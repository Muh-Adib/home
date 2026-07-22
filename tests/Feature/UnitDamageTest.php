<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\UnitDamage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UnitDamageTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function authorized_roles_can_access_unit_damages_index(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $housekeeping = User::factory()->create(['role' => 'housekeeping']);
        $guest = User::factory()->create(['role' => 'guest']); // Unauthorized role

        $response = $this->actingAs($admin)->get(route('admin.unit-damages.index'));
        $response->assertStatus(200);

        $response = $this->actingAs($housekeeping)->get(route('admin.unit-damages.index'));
        $response->assertStatus(200);

        $response = $this->actingAs($guest)->get(route('admin.unit-damages.index'));
        $response->assertStatus(403);
    }

    #[Test]
    public function user_can_report_unit_damage(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create(['status' => 'active']);

        $response = $this->actingAs($admin)->post(route('admin.unit-damages.store'), [
            'property_id' => $property->id,
            'title' => 'AC Bocor Air',
            'description' => 'Air menetes terus dari unit indoor di kamar master.',
            'difficulty' => 'medium',
        ]);

        $response->assertRedirect(route('admin.unit-damages.index'));
        $this->assertDatabaseHas('unit_damages', [
            'property_id' => $property->id,
            'title' => 'AC Bocor Air',
            'status' => 'pending',
            'reported_by' => $admin->id,
            'difficulty' => 'medium',
        ]);
    }

    #[Test]
    public function admin_can_assign_damage_task_to_staff(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $staff = User::factory()->create(['role' => 'housekeeping']);
        $property = Property::factory()->create(['status' => 'active']);
        $damage = UnitDamage::create([
            'property_id' => $property->id,
            'reported_by' => $admin->id,
            'title' => 'Kerusakan Pintu',
            'description' => 'Gagang pintu longgar.',
            'status' => 'pending',
            'difficulty' => 'medium',
        ]);

        $response = $this->actingAs($admin)->patch(route('admin.unit-damages.assign', $damage), [
            'assigned_to' => (string) $staff->id,
        ]);

        $response->assertRedirect(route('admin.unit-damages.index'));
        $this->assertDatabaseHas('unit_damages', [
            'id' => $damage->id,
            'assigned_to' => $staff->id,
            'status' => 'in_progress',
        ]);
    }

    #[Test]
    public function staff_can_resolve_damage_task(): void
    {
        $staff1 = User::factory()->create(['role' => 'housekeeping']);
        $staff2 = User::factory()->create(['role' => 'housekeeping']);
        $property = Property::factory()->create(['status' => 'active']);
        $damage = UnitDamage::create([
            'property_id' => $property->id,
            'reported_by' => $staff1->id,
            'assigned_to' => $staff1->id,
            'title' => 'Kerusakan AC',
            'description' => 'AC tidak dingin.',
            'status' => 'in_progress',
            'difficulty' => 'medium',
        ]);

        $response = $this->actingAs($staff1)->patch(route('admin.unit-damages.resolve', $damage), [
            'resolved_notes' => 'Pipa AC dibersihkan dan dipasang isolasi baru.',
            'worker_ids' => [$staff1->id, $staff2->id],
        ]);

        $response->assertRedirect(route('admin.unit-damages.index'));
        $this->assertDatabaseHas('unit_damages', [
            'id' => $damage->id,
            'status' => 'resolved',
            'resolved_by' => $staff1->id,
            'resolved_notes' => 'Pipa AC dibersihkan dan dipasang isolasi baru.',
        ]);

        $this->assertDatabaseHas('unit_damage_actions', [
            'unit_damage_id' => $damage->id,
            'user_id' => $staff1->id,
            'action_details' => 'Menyelesaikan perbaikan kerusakan unit: Kerusakan AC',
            'points' => 2.50,
        ]);

        $this->assertDatabaseHas('unit_damage_actions', [
            'unit_damage_id' => $damage->id,
            'user_id' => $staff2->id,
            'action_details' => 'Menyelesaikan perbaikan kerusakan unit: Kerusakan AC',
            'points' => 2.50,
        ]);
    }
}
