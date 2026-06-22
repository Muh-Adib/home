<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    #[Test]
    public function authorized_users_can_upload_valid_images()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();

        $file = UploadedFile::fake()->image('test.jpg', 800, 600);

        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->slug}/media/upload", [
                'files' => [$file],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Files uploaded successfully',
            ]);

        $this->assertDatabaseHas('property_media', [
            'property_id' => $property->id,
        ]);
    }

    #[Test]
    public function unauthorized_users_cannot_upload_media()
    {
        $guest = User::factory()->create(['role' => 'guest']);
        $property = Property::factory()->create();

        $file = UploadedFile::fake()->image('test.jpg');

        $response = $this->actingAs($guest)
            ->postJson("/admin/properties/{$property->slug}/media/upload", [
                'files' => [$file],
            ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function upload_rejects_non_image_files()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();

        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->slug}/media/upload", [
                'files' => [$file],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['files.0']);
    }

    #[Test]
    public function upload_enforces_file_size_limits()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();

        $file = UploadedFile::fake()->image('large.jpg')->size(150000); // 150MB (over 100MB limit)

        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->slug}/media/upload", [
                'files' => [$file],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['files.0']);
    }

    #[Test]
    public function upload_enforces_image_dimensions()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();

        $file = UploadedFile::fake()->image('tiny.jpg', 50, 50); // Too small (under 100x100 limit)

        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->slug}/media/upload", [
                'files' => [$file],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['files.0']);
    }

    #[Test]
    public function upload_creates_secure_filenames()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();

        $file = UploadedFile::fake()->image('test with spaces & symbols!.jpg', 800, 600);

        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->slug}/media/upload", [
                'files' => [$file],
            ]);

        $response->assertStatus(200);

        $media = PropertyMedia::where('property_id', $property->id)->first();

        // Filename should be sanitized and secure
        $this->assertStringNotContainsString(' ', $media->file_name);
        $this->assertStringNotContainsString('&', $media->file_name);
        $this->assertStringNotContainsString('!', $media->file_name);
    }

    #[Test]
    public function can_update_media_metadata()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $media = PropertyMedia::factory()->create();

        $response = $this->actingAs($admin)
            ->patchJson("/admin/media/{$media->id}", [
                'alt_text' => 'Beautiful villa exterior',
                'description' => 'Main entrance view',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('property_media', [
            'id' => $media->id,
            'alt_text' => 'Beautiful villa exterior',
            'description' => 'Main entrance view',
        ]);
    }

    #[Test]
    public function can_delete_media()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $media = PropertyMedia::factory()->create();

        $response = $this->actingAs($admin)
            ->deleteJson("/admin/media/{$media->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('property_media', [
            'id' => $media->id,
        ]);
    }

    #[Test]
    public function can_reorder_media()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();

        $media1 = PropertyMedia::factory()->create(['property_id' => $property->id, 'display_order' => 1]);
        $media2 = PropertyMedia::factory()->create(['property_id' => $property->id, 'display_order' => 2]);
        $media3 = PropertyMedia::factory()->create(['property_id' => $property->id, 'display_order' => 3]);

        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->slug}/media/reorder", [
                'media_ids' => [$media3->id, $media1->id, $media2->id],
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('property_media', ['id' => $media3->id, 'display_order' => 1]);
        $this->assertDatabaseHas('property_media', ['id' => $media1->id, 'display_order' => 2]);
        $this->assertDatabaseHas('property_media', ['id' => $media2->id, 'display_order' => 3]);
    }

    #[Test]
    public function can_set_cover_image()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();

        $media1 = PropertyMedia::factory()->create(['property_id' => $property->id, 'is_cover' => true]);
        $media2 = PropertyMedia::factory()->create(['property_id' => $property->id, 'is_cover' => false]);

        $response = $this->actingAs($admin)
            ->patchJson("/admin/media/{$media2->id}", [
                'is_cover' => true,
            ]);

        $response->assertStatus(200);

        // Old cover should be unset, new one should be set
        $this->assertDatabaseHas('property_media', ['id' => $media1->id, 'is_cover' => false]);
        $this->assertDatabaseHas('property_media', ['id' => $media2->id, 'is_cover' => true]);
    }

    #[Test]
    public function upload_limits_concurrent_files()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();

        $files = [];
        for ($i = 0; $i < 51; $i++) { // Try to upload 51 files (over limit of 50)
            $files[] = UploadedFile::fake()->image("test{$i}.jpg", 800, 600);
        }

        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->slug}/media/upload", [
                'files' => $files,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['files']);
    }

    #[Test]
    public function upload_logs_security_events()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();

        $file = UploadedFile::fake()->image('test.jpg', 800, 600);

        Log::shouldReceive('info')->atLeast()->once();
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        $response = $this->actingAs($admin)
            ->postJson("/admin/properties/{$property->slug}/media/upload", [
                'files' => [$file],
            ]);

        $response->assertStatus(200);
    }

    #[Test]
    public function media_list_returns_correct_format()
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();

        PropertyMedia::factory()->count(3)->create(['property_id' => $property->id]);

        $response = $this->actingAs($admin)
            ->getJson("/admin/properties/{$property->slug}/media/list");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'file_name',
                        'url',
                        'alt_text',
                        'is_cover',
                        'display_order',
                    ],
                ],
            ]);
    }
}
