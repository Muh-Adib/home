<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PropertyFinancialDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function createProperty(User $owner): Property
    {
        return Property::factory()->create([
            'owner_id' => $owner->id,
            'ownership_model' => 'rented',
            'monthly_rent_cost' => 5_000_000,
            'initial_build_capital' => 100_000_000,
            'lease_capital' => 50_000_000,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Authorization Tests
    // ─────────────────────────────────────────────────────────────────────

    #[Test]
    public function super_admin_can_access_financial_dashboard(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $owner = User::factory()->create(['role' => 'property_owner']);
        $property = $this->createProperty($owner);

        $response = $this->actingAs($admin)
            ->get(route('admin.properties.financial', $property->slug));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Properties/Financial'));
    }

    #[Test]
    public function property_manager_can_access_financial_dashboard(): void
    {
        $manager = User::factory()->create(['role' => 'property_manager']);
        $owner = User::factory()->create(['role' => 'property_owner']);
        $property = $this->createProperty($owner);

        $response = $this->actingAs($manager)
            ->get(route('admin.properties.financial', $property->slug));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Properties/Financial'));
    }

    #[Test]
    public function property_owner_can_access_own_property_financial_dashboard(): void
    {
        $owner = User::factory()->create(['role' => 'property_owner']);
        $property = $this->createProperty($owner);

        $response = $this->actingAs($owner)
            ->get(route('admin.properties.financial', $property->slug));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Properties/Financial'));
    }

    #[Test]
    public function property_owner_cannot_access_other_owners_financial_dashboard(): void
    {
        $ownerA = User::factory()->create(['role' => 'property_owner']);
        $ownerB = User::factory()->create(['role' => 'property_owner']);
        $property = $this->createProperty($ownerA);

        $response = $this->actingAs($ownerB)
            ->get(route('admin.properties.financial', $property->slug));

        $response->assertForbidden();
    }

    #[Test]
    public function front_desk_cannot_access_financial_dashboard(): void
    {
        $frontDesk = User::factory()->create(['role' => 'front_desk']);
        $owner = User::factory()->create(['role' => 'property_owner']);
        $property = $this->createProperty($owner);

        $response = $this->actingAs($frontDesk)
            ->get(route('admin.properties.financial', $property->slug));

        $response->assertForbidden();
    }

    #[Test]
    public function housekeeping_cannot_access_financial_dashboard(): void
    {
        $housekeeping = User::factory()->create(['role' => 'housekeeping']);
        $owner = User::factory()->create(['role' => 'property_owner']);
        $property = $this->createProperty($owner);

        $response = $this->actingAs($housekeeping)
            ->get(route('admin.properties.financial', $property->slug));

        $response->assertForbidden();
    }

    #[Test]
    public function unauthenticated_user_is_redirected(): void
    {
        $owner = User::factory()->create(['role' => 'property_owner']);
        $property = $this->createProperty($owner);

        $this->get(route('admin.properties.financial', $property->slug))
            ->assertRedirect('/login');
    }

    // ─────────────────────────────────────────────────────────────────────
    // Data Structure Tests
    // ─────────────────────────────────────────────────────────────────────

    #[Test]
    public function financial_dashboard_returns_expected_data_structure(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $owner = User::factory()->create(['role' => 'property_owner']);
        $property = $this->createProperty($owner);

        $response = $this->actingAs($admin)
            ->get(route('admin.properties.financial', $property->slug));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Properties/Financial')
                ->has('property')
                ->has('financial')
                ->has('period')
                ->has('financial.kpi')
                ->has('financial.bep')
                ->has('financial.monthly_trend')
                ->has('financial.expense_breakdown')
                ->has('financial.revenue_breakdown')
                ->has('financial.booking_sources')
                ->has('financial.occupancy_summary')
            );
    }

    #[Test]
    public function period_filter_changes_data_correctly(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $owner = User::factory()->create(['role' => 'property_owner']);
        $property = $this->createProperty($owner);

        foreach (['1m', '3m', '6m', '12m', 'ytd', 'all_time'] as $period) {
            $response = $this->actingAs($admin)
                ->get(route('admin.properties.financial', $property->slug)."?period={$period}");

            $response->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->component('Admin/Properties/Financial')
                    ->where('period', $period)
                );
        }
    }

    #[Test]
    public function bep_data_is_correctly_calculated_with_zero_capital(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $owner = User::factory()->create(['role' => 'property_owner']);
        $property = Property::factory()->create([
            'owner_id' => $owner->id,
            'initial_build_capital' => 0,
            'lease_capital' => 0,
        ]);

        $response = $this->actingAs($admin)
            ->get(route('admin.properties.financial', $property->slug));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('financial.bep.total_capital', 0)
                ->where('financial.bep.bep_pct', 0)
            );
    }
}
