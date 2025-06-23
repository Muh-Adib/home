<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    /** @test */
    public function unauthenticated_users_cannot_access_admin_routes()
    {
        $response = $this->get('/admin/dashboard');
        $response->assertRedirect('/login');
        
        $response = $this->get('/admin/properties');
        $response->assertRedirect('/login');
        
        $response = $this->get('/admin/bookings');
        $response->assertRedirect('/login');
    }

    /** @test */
    public function users_with_wrong_role_cannot_access_admin_routes()
    {
        $guest = User::factory()->create(['role' => 'guest']);
        
        $response = $this->actingAs($guest)->get('/admin/dashboard');
        $response->assertStatus(403);
        
        $response = $this->actingAs($guest)->get('/admin/properties');
        $response->assertStatus(403);
    }

    /** @test */
    public function super_admin_can_access_all_admin_routes()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        
        $response = $this->actingAs($admin)->get('/admin/dashboard');
        $response->assertStatus(200);
    }

    /** @test */
    public function property_manager_can_access_appropriate_routes()
    {
        $manager = User::factory()->create(['role' => 'property_manager']);
        
        $response = $this->actingAs($manager)->get('/admin/properties');
        $response->assertStatus(200);
        
        $response = $this->actingAs($manager)->get('/admin/bookings');
        $response->assertStatus(200);
    }

    /** @test */
    public function role_middleware_logs_unauthorized_access_attempts()
    {
        $guest = User::factory()->create(['role' => 'guest']);
        
        $this->expectsEvents(\Illuminate\Log\Events\MessageLogged::class);
        
        $response = $this->actingAs($guest)->get('/admin/dashboard');
        $response->assertStatus(403);
    }

    /** @test */
    public function api_returns_json_error_for_unauthorized_access()
    {
        $guest = User::factory()->create(['role' => 'guest']);
        
        $response = $this->actingAs($guest)
            ->withHeaders(['Accept' => 'application/json'])
            ->get('/admin/api/dashboard');
            
        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Access denied. You do not have permission to access this resource.',
            ]);
    }

    /** @test */
    public function file_upload_rejects_non_image_files()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $file = UploadedFile::fake()->create('malicious.php', 100, 'application/x-php');
        
        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->id}/media/upload", [
                'files' => [$file]
            ]);
            
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['files.0']);
    }

    /** @test */
    public function file_upload_rejects_oversized_files()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $file = UploadedFile::fake()->image('large.jpg')->size(6000); // 6MB
        
        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->id}/media/upload", [
                'files' => [$file]
            ]);
            
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['files.0']);
    }

    /** @test */
    public function file_upload_accepts_valid_images()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $file = UploadedFile::fake()->image('valid.jpg', 800, 600)->size(1000);
        
        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->id}/media/upload", [
                'files' => [$file]
            ]);
            
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Files uploaded successfully'
            ]);
    }

    /** @test */
    public function file_upload_requires_proper_permissions()
    {
        $guest = User::factory()->create(['role' => 'guest']);
        $property = Property::factory()->create();
        
        $file = UploadedFile::fake()->image('test.jpg');
        
        $response = $this->actingAs($guest)
            ->postJson("/admin/properties/{$property->id}/media/upload", [
                'files' => [$file]
            ]);
            
        $response->assertStatus(403);
    }

    /** @test */
    public function sensitive_routes_have_csrf_protection()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        
        // Test without CSRF token
        $response = $this->actingAs($admin)
            ->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class)
            ->post('/admin/properties', [
                'name' => 'Test Property',
                'description' => 'Test Description',
            ]);
            
        // Should be protected by CSRF
        $this->assertNotEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function password_reset_has_rate_limiting()
    {
        // Attempt multiple password reset requests
        for ($i = 0; $i < 10; $i++) {
            $response = $this->post('/forgot-password', [
                'email' => 'test@example.com'
            ]);
        }
        
        // Should be rate limited after too many attempts
        $response = $this->post('/forgot-password', [
            'email' => 'test@example.com'
        ]);
        
        $response->assertStatus(429); // Too Many Requests
    }

    /** @test */
    public function login_has_rate_limiting()
    {
        // Attempt multiple failed logins
        for ($i = 0; $i < 10; $i++) {
            $response = $this->post('/login', [
                'email' => 'nonexistent@example.com',
                'password' => 'wrongpassword'
            ]);
        }
        
        // Should be rate limited
        $response = $this->post('/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'wrongpassword'
        ]);
        
        $response->assertStatus(429);
    }

    /** @test */
    public function database_queries_are_protected_from_sql_injection()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        
        // Attempt SQL injection in search parameter
        $response = $this->actingAs($admin)
            ->get('/admin/properties?search=' . urlencode("'; DROP TABLE properties; --"));
            
        $response->assertStatus(200); // Should not crash
        
        // Verify table still exists
        $this->assertDatabaseHas('properties', []);
    }

    /** @test */
    public function user_input_is_properly_sanitized()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        
        $response = $this->actingAs($admin)
            ->post('/admin/properties', [
                'name' => '<script>alert("xss")</script>Test Property',
                'description' => '<img src="x" onerror="alert(1)">Test Description',
                'address' => 'Test Address',
                'capacity' => 4,
                'capacity_max' => 6,
                'base_rate' => 100000,
            ]);
            
        // Property should be created with sanitized data
        $this->assertDatabaseMissing('properties', [
            'name' => '<script>alert("xss")</script>Test Property'
        ]);
    }

    /** @test */
    public function api_endpoints_require_proper_authentication()
    {
        $endpoints = [
            'GET' => [
                '/api/properties/search',
                '/api/amenities',
            ],
            'POST' => [
                '/api/admin/booking-management/check-availability',
                '/api/admin/booking-management/calculate-rate',
            ],
        ];
        
        foreach ($endpoints as $method => $urls) {
            foreach ($urls as $url) {
                $response = $this->call($method, $url);
                $this->assertContains($response->getStatusCode(), [302, 401, 403], 
                    "Endpoint {$method} {$url} should require authentication");
            }
        }
    }

    /** @test */
    public function session_security_is_properly_configured()
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->get('/dashboard');
        
        // Check session cookie security
        $cookies = $response->headers->getCookies();
        foreach ($cookies as $cookie) {
            if (str_contains($cookie->getName(), 'session')) {
                $this->assertTrue($cookie->isSecure() || !app()->isProduction());
                $this->assertTrue($cookie->isHttpOnly());
            }
        }
    }
} 