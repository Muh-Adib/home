<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminRoleAndDashboardAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_create_user_with_admin_role()
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);

        $response = $this->actingAs($superAdmin)->post(route('admin.users.store'), [
            'name' => 'John Admin',
            'email' => 'johnadmin@example.com',
            'phone' => '0812345678',
            'role' => 'admin',
            'status' => 'active',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('users', [
            'email' => 'johnadmin@example.com',
            'role' => 'admin',
        ]);
    }

    public function test_super_admin_can_update_user_to_admin_role()
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $user = User::factory()->create(['role' => 'guest']);

        $response = $this->actingAs($superAdmin)->put(route('admin.users.update', $user), [
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'role' => 'admin',
        ]);
    }

    public function test_content_creator_can_access_admin_dashboard()
    {
        $creator = User::factory()->create(['role' => 'content_creator']);

        $response = $this->actingAs($creator)->get(route('admin.dashboard'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('contentCreatorData')
        );
    }

    public function test_admin_role_can_access_admin_dashboard()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get(route('admin.dashboard'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('adminRoleData')
        );
    }

    public function test_content_creator_can_access_properties()
    {
        $creator = User::factory()->create(['role' => 'content_creator']);
        Property::factory()->create(['status' => 'active']);

        $response = $this->actingAs($creator)->get(route('admin.properties.index'));
        $response->assertStatus(200);
    }

    public function test_content_creator_can_access_content_plans()
    {
        $creator = User::factory()->create(['role' => 'content_creator']);

        $response = $this->actingAs($creator)->get(route('admin.content-plans.index'));
        $response->assertStatus(200);
    }

    public function test_content_creator_can_access_ai_keys()
    {
        $creator = User::factory()->create(['role' => 'content_creator']);

        $response = $this->actingAs($creator)->get(route('admin.ai-keys.index'));
        $response->assertStatus(200);
    }

    public function test_content_creator_can_create_article_with_all_statuses()
    {
        $creator = User::factory()->create(['role' => 'content_creator']);
        $property = Property::factory()->create(['status' => 'active']);

        // 1. Store as draft
        $response = $this->actingAs($creator)->post(route('admin.articles.store'), [
            'title' => 'My Draft Article',
            'content' => 'Draft Content',
            'language' => 'id',
            'status' => 'draft',
            'property_ids' => [$property->id],
        ]);
        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('articles', [
            'title' => 'My Draft Article',
            'status' => 'draft',
        ]);

        // 2. Store as scheduled
        $response = $this->actingAs($creator)->post(route('admin.articles.store'), [
            'title' => 'My Scheduled Article',
            'content' => 'Scheduled Content',
            'language' => 'id',
            'status' => 'scheduled',
            'scheduled_at' => now()->addDays(2)->format('Y-m-d H:i:s'),
            'property_ids' => [$property->id],
        ]);
        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('articles', [
            'title' => 'My Scheduled Article',
            'status' => 'scheduled',
        ]);

        // 3. Store as reviewing
        $response = $this->actingAs($creator)->post(route('admin.articles.store'), [
            'title' => 'My Reviewing Article',
            'content' => 'Reviewing Content',
            'language' => 'id',
            'status' => 'reviewing',
            'property_ids' => [$property->id],
        ]);
        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('articles', [
            'title' => 'My Reviewing Article',
            'status' => 'reviewing',
        ]);
    }

    public function test_accessing_dashboard_automatically_publishes_due_scheduled_articles()
    {
        $creator = User::factory()->create(['role' => 'content_creator']);

        // Create an article scheduled in the past
        $article = Article::create([
            'title' => 'Scheduled Travel Guide',
            'slug' => 'scheduled-travel-guide',
            'status' => 'scheduled',
            'scheduled_at' => now()->subHour(),
            'author_id' => $creator->id,
            'language' => 'id',
            'content' => 'Scheduled Content',
        ]);

        $this->assertDatabaseHas('articles', [
            'id' => $article->id,
            'status' => 'scheduled',
        ]);

        // Access dashboard
        $response = $this->actingAs($creator)->get(route('admin.dashboard'));
        $response->assertStatus(200);

        // Assert that status is updated to published
        $this->assertDatabaseHas('articles', [
            'id' => $article->id,
            'status' => 'published',
        ]);
    }

    public function test_admin_can_access_damages()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $response = $this->actingAs($admin)->get(route('admin.unit-damages.index'));
        $response->assertStatus(200);
    }

    public function test_admin_can_access_lost_and_founds()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $response = $this->actingAs($admin)->get(route('admin.lost-and-founds.index'));
        $response->assertStatus(200);
    }

    public function test_admin_can_access_ai_keys()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $response = $this->actingAs($admin)->get(route('admin.ai-keys.index'));
        $response->assertStatus(200);
    }

    public function test_super_admin_can_access_property_details()
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $property = Property::factory()->create();
        $response = $this->actingAs($superAdmin)->get(route('admin.properties.show', $property->slug));
        $response->assertStatus(200);
    }

    public function test_admin_can_access_property_details()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $property = Property::factory()->create();
        $response = $this->actingAs($admin)->get(route('admin.properties.show', $property->slug));
        $response->assertStatus(200);
    }

    public function test_content_creator_can_access_property_details()
    {
        $creator = User::factory()->create(['role' => 'content_creator']);
        $property = Property::factory()->create();
        $response = $this->actingAs($creator)->get(route('admin.properties.show', $property->slug));
        $response->assertStatus(200);
    }
}
