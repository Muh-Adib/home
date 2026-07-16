<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AdminRoleTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function admin_can_access_dashboard_and_properties()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $response = $this->actingAs($admin)
            ->get('/admin/dashboard');

        $response->assertStatus(200);

        $response2 = $this->actingAs($admin)
            ->get('/admin/properties');

        $response2->assertStatus(200);
    }

    #[Test]
    public function admin_cannot_access_financial_records_and_payments()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        // Attempting to access financial overview/reports should fail
        $response = $this->actingAs($admin)
            ->get('/admin/finance');

        $response->assertStatus(403);

        // Attempting to access payments reconciliation should fail
        $response2 = $this->actingAs($admin)
            ->get('/admin/payments/reconciliation');

        $response2->assertStatus(403);

        // Attempting to access financial report should fail
        $response3 = $this->actingAs($admin)
            ->get('/admin/reports/financial');

        $response3->assertStatus(403);
    }

    #[Test]
    public function admin_cannot_edit_or_delete_super_admin()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        // Trying to view super admin edit page as admin should fail (policy view details check)
        $response = $this->actingAs($admin)
            ->get("/admin/users/{$superAdmin->id}/edit");
        $response->assertStatus(403);

        // Trying to update super admin as admin should fail
        $response2 = $this->actingAs($admin)
            ->patch("/admin/users/{$superAdmin->id}", [
                'name' => 'Hacked Name',
                'email' => $superAdmin->email,
                'role' => 'super_admin',
            ]);
        $response2->assertStatus(403);

        // Trying to delete super admin as admin should fail
        $response3 = $this->actingAs($admin)
            ->delete("/admin/users/{$superAdmin->id}");
        $response3->assertStatus(403);
    }

    #[Test]
    public function admin_cannot_promote_anyone_to_super_admin()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $guest = User::factory()->create([
            'role' => 'guest',
        ]);

        // Trying to promote the guest to super admin as admin should fail
        $response = $this->actingAs($admin)
            ->patch("/admin/users/{$guest->id}", [
                'name' => $guest->name,
                'email' => $guest->email,
                'role' => 'super_admin',
            ]);

        $response->assertStatus(403);
        $this->assertEquals('guest', $guest->fresh()->role);
    }

    #[Test]
    public function super_admin_can_create_content_creator()
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        $response = $this->actingAs($superAdmin)
            ->post('/admin/users', [
                'name' => 'Creator User',
                'email' => 'creator@example.com',
                'phone' => '123456789',
                'role' => 'content_creator',
                'status' => 'active',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
                'address' => 'Creator Street',
                'city' => 'Jakarta',
                'state' => 'DKI Jakarta',
                'country' => 'Indonesia',
                'postal_code' => '12345',
                'birth_date' => '1995-01-01',
                'gender' => 'male',
                'bio' => 'I create content.',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect('/admin/users');

        $this->assertDatabaseHas('users', [
            'email' => 'creator@example.com',
            'role' => 'content_creator',
        ]);
    }
}
