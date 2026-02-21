<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\ContentPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ArticleContentPlanSyncTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Create a user for authentication
        $this->actingAs(User::factory()->create());

        // Reset static flags
        Article::$isSyncing = false;
        ContentPlan::$isSyncing = false;
    }

    /** @test */
    public function article_status_syncs_to_content_plan()
    {
        // 1. Create linked entities
        $plan = ContentPlan::create([
            'title' => 'Sync Test Article',
            'status' => 'writing',
            'content_type' => 'article',
            'created_by' => auth()->id(),
            'assigned_to' => auth()->id(),
        ]);

        // Article is auto-created by ArticleObserver or we create manually if using service
        // Let's create manually to be sure they are linked
        $article = Article::create([
            'content_plan_id' => $plan->id,
            'title' => 'Sync Test Article',
            'slug' => 'sync-test-article',
            'status' => 'writing',
            'author_id' => auth()->id(),
        ]);

        // 2. Update Article status
        $article->update(['status' => 'reviewing']);

        // 3. Verify Plan status
        $this->assertEquals('reviewing', $plan->fresh()->status);
    }

    /** @test */
    public function content_plan_status_syncs_to_article()
    {
        $plan = ContentPlan::create([
            'title' => 'Plan Sync Test',
            'status' => 'idea',
            'content_type' => 'article',
            'created_by' => auth()->id(),
            'assigned_to' => auth()->id(),
        ]);

        $article = Article::create([
            'content_plan_id' => $plan->id,
            'title' => 'Plan Sync Test',
            'slug' => 'plan-sync-test',
            'status' => 'idea',
            'author_id' => auth()->id(),
        ]);

        // Update Plan status
        $plan->update(['status' => 'researching']);

        // Verify Article status
        $this->assertEquals('researching', $article->fresh()->status);
    }

    /** @test */
    public function article_schedule_syncs_to_content_plan()
    {
        $plan = ContentPlan::create([
            'title' => 'Date Sync Test',
            'status' => 'writing',
            'content_type' => 'article',
            'created_by' => auth()->id(),
            'assigned_to' => auth()->id(),
        ]);

        $article = Article::create([
            'content_plan_id' => $plan->id,
            'title' => 'Date Sync Test',
            'slug' => 'date-sync-test',
            'status' => 'writing',
            'author_id' => auth()->id(),
        ]);

        $date = now()->addDays(5);

        // Schedule Article
        $article->schedule($date);

        // Verify Plan date
        $this->assertEquals($date->format('Y-m-d'), $plan->fresh()->planned_publish_date->format('Y-m-d'));
        $this->assertEquals('scheduled', $plan->fresh()->status);
    }

    /** @test */
    public function content_plan_date_syncs_to_article()
    {
        $plan = ContentPlan::create([
            'title' => 'Plan Date Sync',
            'status' => 'writing',
            'content_type' => 'article',
            'created_by' => auth()->id(),
            'assigned_to' => auth()->id(),
        ]);

        $article = Article::create([
            'content_plan_id' => $plan->id,
            'title' => 'Plan Date Sync',
            'slug' => 'plan-date-sync',
            'status' => 'writing',
            'author_id' => auth()->id(),
        ]);

        $date = now()->addDays(3);

        // Update Plan date
        $plan->update(['planned_publish_date' => $date]);

        // Verify Article date (Observer syncs the in-memory Carbon instance, so time is preserved in Article)
        $this->assertEquals($date->format('Y-m-d H:i:s'), $article->fresh()->scheduled_at->format('Y-m-d H:i:s'));
    }

    /** @test */
    public function bidirectional_title_sync()
    {
        $plan = ContentPlan::create([
            'title' => 'Original Title',
            'status' => 'writing',
            'content_type' => 'article',
            'created_by' => auth()->id(),
            'assigned_to' => auth()->id(),
        ]);

        $article = Article::create([
            'content_plan_id' => $plan->id,
            'title' => 'Original Title',
            'slug' => 'original-title',
            'status' => 'writing',
            'author_id' => auth()->id(),
        ]);

        // Article -> Plan
        $article->update(['title' => 'Updated by Article']);
        $this->assertEquals('Updated by Article', $plan->fresh()->title);

        // Plan -> Article
        $plan->update(['title' => 'Updated by Plan']);
        $this->assertEquals('Updated by Plan', $article->fresh()->title);
    }

    /** @test */
    public function infinite_loop_prevention()
    {
        $plan = ContentPlan::create([
            'title' => 'Loop Test',
            'status' => 'writing',
            'content_type' => 'article',
            'created_by' => auth()->id(),
            'assigned_to' => auth()->id(),
        ]);

        $article = Article::create([
            'content_plan_id' => $plan->id,
            'title' => 'Loop Test',
            'slug' => 'loop-test',
            'status' => 'writing',
            'author_id' => auth()->id(),
        ]);

        // If loop prevention works, this shouldn't timeout or crash
        $article->update(['title' => 'Loop Start']);

        $this->assertEquals('Loop Start', $plan->fresh()->title);
        $this->assertEquals('Loop Start', $article->fresh()->title);
    }
}
