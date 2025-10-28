<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function middleware_allows_access_for_authorized_role()
    {
        $user = User::factory()->create([
            'role' => 'super_admin',
            'email' => 'admin@example.com',
        ]);

        $response = $this->actingAs($user)
            ->get('/admin/dashboard');

        // Should not return 403
        $response->assertStatus(200);
    }

    /** @test */
    public function middleware_denies_access_for_unauthorized_role()
    {
        $user = User::factory()->create([
            'role' => 'guest',
            'email' => 'guest@example.com',
        ]);

        $response = $this->actingAs($user)
            ->get('/admin/dashboard');

        // Should return 403
        $response->assertStatus(403);
    }

    /** @test */
    public function middleware_redirects_unauthenticated_user()
    {
        $response = $this->get('/admin/dashboard');

        // Should redirect to login
        $response->assertRedirect('/login');
    }

    /** @test */
    public function middleware_allows_multiple_roles()
    {
        $user = User::factory()->create([
            'role' => 'property_manager',
            'email' => 'manager@example.com',
        ]);

        $response = $this->actingAs($user)
            ->get('/admin/dashboard');

        // Should allow access for property_manager
        $response->assertStatus(200);
    }
}
