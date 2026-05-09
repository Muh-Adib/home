<?php

namespace Tests\Feature\ArticleController;

use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ArticlesShowRenderTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function article_show_page_renders_without_error(): void
    {
        $author = User::factory()->create();
        $article = Article::create([
            'title' => 'Test Article',
            'slug' => 'test-article',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'author_id' => $author->id,
            'language' => 'id',
            'content' => 'Test content',
        ]);

        $response = $this->get("/articles/{$article->slug}");

        $response->assertStatus(200);
    }
}
