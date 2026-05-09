<?php

namespace Tests\Feature\ArticleController;

use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ArticlesIndexRenderTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function articles_index_renders_without_error(): void
    {
        $response = $this->get('/articles');
        $response->assertStatus(200);
    }

    #[Test]
    public function articles_index_renders_with_published_articles(): void
    {
        $author = User::factory()->create();
        Article::create([
            'title' => 'Test Article One',
            'slug' => 'test-article-one',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'author_id' => $author->id,
            'language' => 'id',
        ]);
        Article::create([
            'title' => 'Test Article Two',
            'slug' => 'test-article-two',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'author_id' => $author->id,
            'language' => 'id',
        ]);
        Article::create([
            'title' => 'Test Article Three',
            'slug' => 'test-article-three',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'author_id' => $author->id,
            'language' => 'id',
        ]);

        $response = $this->get('/articles');
        $response->assertStatus(200);
    }
}
