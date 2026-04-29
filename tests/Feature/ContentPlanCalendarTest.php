<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\ContentPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ContentPlanCalendarTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function can_reschedule_content_plan_via_update_endpoint()
    {
        $user = User::factory()->create(['role' => 'super_admin']);
        $this->actingAs($user);

        $plan = ContentPlan::create([
            'title' => 'Calendar Test',
            'status' => 'writing',
            'content_type' => 'article',
            'planned_publish_date' => now(),
            'created_by' => $user->id,
            'assigned_to' => $user->id,
            'uuid' => (string) \Str::uuid(),
        ]);

        Article::create([
            'content_plan_id' => $plan->id,
            'title' => $plan->title,
            'slug' => \Str::slug($plan->title),
            'status' => 'writing',
            'author_id' => $user->id,
            'language' => 'id',
        ]);

        // Enable observers to test real behavior!
        // ContentPlan::unsetEventDispatcher();
        // Article::unsetEventDispatcher();

        $newDate = now()->addDays(5)->format('Y-m-d');

        $response = $this->putJson(route('admin.content-plans.update', $plan->uuid), [
            'planned_publish_date' => $newDate,
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Content plan updated successfully!',
            ]);

        $freshPlan = $plan->fresh();
        // dump('Fresh Plan Date:', $freshPlan->planned_publish_date);
        // dump('Expected:', $newDate);

        $this->assertEquals($newDate, $freshPlan->planned_publish_date->format('Y-m-d'));

        // Verify show page is still accessible (sanity check)
        $this->actingAs($user)->get(route('admin.content-plans.show', $plan->uuid))
            ->assertSuccessful();
    }
}
