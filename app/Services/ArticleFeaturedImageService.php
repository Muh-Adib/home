<?php

namespace App\Services;

use App\Models\Article;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ArticleFeaturedImageService
{
    /**
     * Generate featured image for article using AI
     * 
     * @param Article $article
     * @return string|null Path to generated image or null on failure
     */
    public function generateForArticle(Article $article): ?string
    {
        try {
            // Create prompt from article title and excerpt
            $prompt = $this->createPrompt($article);

            // Generate image using generate_image tool
            // Note: This is a placeholder - actual implementation will use the generate_image tool
            // For now, we'll skip actual generation and just return null
            // In production, this would call an AI image generation service

            Log::info('Featured image generation requested for article', [
                'article_id' => $article->id,
                'title' => $article->title,
                'prompt' => $prompt,
            ]);

            // TODO: Implement actual image generation
            // $imagePath = $this->callImageGenerationAPI($prompt);

            return null;

        } catch (\Exception $e) {
            Log::error('Failed to generate featured image for article', [
                'article_id' => $article->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Create image generation prompt from article
     * 
     * @param Article $article
     * @return string
     */
    private function createPrompt(Article $article): string
    {
        $title = $article->title;
        $excerpt = $article->excerpt ?? '';

        // Create a descriptive prompt for image generation
        $prompt = "Create a professional, high-quality featured image for a blog article titled '{$title}'.";

        if ($excerpt) {
            $prompt .= " The article is about: {$excerpt}.";
        }

        $prompt .= " The image should be visually appealing, modern, and relevant to the content. Use vibrant colors and professional design.";

        return $prompt;
    }

    /**
     * Save generated image to storage
     * 
     * @param string $imageData Base64 or binary image data
     * @param int $articleId
     * @return string Path to saved image
     */
    private function saveImage(string $imageData, int $articleId): string
    {
        $filename = "article-{$articleId}-" . time() . '.webp';
        $path = "articles/featured/{$filename}";

        Storage::disk('public')->put($path, $imageData);

        return $path;
    }

    /**
     * Delete featured image from storage
     * 
     * @param string $path
     * @return bool
     */
    public function deleteImage(string $path): bool
    {
        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->delete($path);
        }

        return false;
    }
}
