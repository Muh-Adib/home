<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    /** @test */
    public function authorized_users_can_upload_valid_images()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $file = UploadedFile::fake()->image('test.jpg', 800, 600);
        
        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->id}/media/upload", [
                'files' => [$file]
            ]);
            
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Files uploaded successfully'
            ]);
            
        $this->assertDatabaseHas('property_media', [
            'property_id' => $property->id,
            'uploaded_by' => $admin->id,
        ]);
    }

    /** @test */
    public function unauthorized_users_cannot_upload_media()
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
    public function upload_rejects_non_image_files()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');
        
        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->id}/media/upload", [
                'files' => [$file]
            ]);
            
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['files.0']);
    }

    /** @test */
    public function upload_enforces_file_size_limits()
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
    public function upload_enforces_image_dimensions()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $file = UploadedFile::fake()->image('tiny.jpg', 100, 100); // Too small
        
        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->id}/media/upload", [
                'files' => [$file]
            ]);
            
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['files.0']);
    }

    /** @test */
    public function upload_creates_secure_filenames()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $file = UploadedFile::fake()->image('test with spaces & symbols!.jpg', 800, 600);
        
        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->id}/media/upload", [
                'files' => [$file]
            ]);
            
        $response->assertStatus(200);
        
        $media = PropertyMedia::where('property_id', $property->id)->first();
        
        // Filename should be sanitized and secure
        $this->assertStringNotContainsString(' ', $media->file_name);
        $this->assertStringNotContainsString('&', $media->file_name);
        $this->assertStringNotContainsString('!', $media->file_name);
    }

    /** @test */
    public function can_update_media_metadata()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $media = PropertyMedia::factory()->create();
        
        $response = $this->actingAs($admin)
            ->patchJson("/admin/media/{$media->id}", [
                'alt_text' => 'Beautiful villa exterior',
                'caption' => 'Main entrance view'
            ]);
            
        $response->assertStatus(200);
        
        $this->assertDatabaseHas('property_media', [
            'id' => $media->id,
            'alt_text' => 'Beautiful villa exterior',
        ]);
    }

    /** @test */
    public function can_delete_media()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $media = PropertyMedia::factory()->create();
        
        $response = $this->actingAs($admin)
            ->deleteJson("/admin/media/{$media->id}");
            
        $response->assertStatus(200);
        
        $this->assertDatabaseMissing('property_media', [
            'id' => $media->id
        ]);
    }

    /** @test */
    public function can_reorder_media()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $media1 = PropertyMedia::factory()->create(['property_id' => $property->id, 'sort_order' => 1]);
        $media2 = PropertyMedia::factory()->create(['property_id' => $property->id, 'sort_order' => 2]);
        $media3 = PropertyMedia::factory()->create(['property_id' => $property->id, 'sort_order' => 3]);
        
        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->id}/media/reorder", [
                'order' => [$media3->id, $media1->id, $media2->id]
            ]);
            
        $response->assertStatus(200);
        
        $this->assertDatabaseHas('property_media', ['id' => $media3->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('property_media', ['id' => $media1->id, 'sort_order' => 2]);
        $this->assertDatabaseHas('property_media', ['id' => $media2->id, 'sort_order' => 3]);
    }

    /** @test */
    public function can_set_cover_image()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $media1 = PropertyMedia::factory()->create(['property_id' => $property->id, 'is_cover' => true]);
        $media2 = PropertyMedia::factory()->create(['property_id' => $property->id, 'is_cover' => false]);
        
        $response = $this->actingAs($admin)
            ->patchJson("/admin/media/{$media2->id}/featured");
            
        $response->assertStatus(200);
        
        // Old cover should be unset, new one should be set
        $this->assertDatabaseHas('property_media', ['id' => $media1->id, 'is_cover' => false]);
        $this->assertDatabaseHas('property_media', ['id' => $media2->id, 'is_cover' => true]);
    }

    /** @test */
    public function upload_limits_concurrent_files()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $files = [];
        for ($i = 0; $i < 15; $i++) { // Try to upload 15 files (over limit of 10)
            $files[] = UploadedFile::fake()->image("test{$i}.jpg", 800, 600);
        }
        
        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->id}/media/upload", [
                'files' => $files
            ]);
            
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['files']);
    }

    /** @test */
    public function upload_logs_security_events()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        $file = UploadedFile::fake()->image('test.jpg', 800, 600);
        
        $this->expectsEvents(\Illuminate\Log\Events\MessageLogged::class);
        
        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->id}/media/upload", [
                'files' => [$file]
            ]);
            
        $response->assertStatus(200);
    }

    /** @test */
    public function media_list_returns_correct_format()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        
        PropertyMedia::factory()->count(3)->create(['property_id' => $property->id]);
        
        $response = $this->actingAs($admin)
            ->getJson("/admin/properties/{$property->id}/media/list");
            
        $response->assertStatus(200)
            ->assertJsonStructure([
                'media' => [
                    '*' => [
                        'id',
                        'file_name',
                        'url',
                        'alt_text',
                        'is_cover',
                        'sort_order'
                    ]
                ]
            ]);
    }
} 