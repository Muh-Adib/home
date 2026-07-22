<?php

namespace App\Services;

use App\Models\Article;
use App\Models\Property;

class ArticleAnalysisService
{
    /**
     * Calculate SEO score based on content metrics
     */
    public function calculateSeoScore(Article $article): int
    {
        $score = 0;

        // Title (20 points)
        $titleLen = strlen($article->title ?? '');
        if ($titleLen >= 30 && $titleLen <= 60) {
            $score += 20;
        } elseif ($titleLen > 0) {
            $score += 10;
        }

        // Meta description (20 points)
        $metaDescLen = strlen($article->meta_description ?? '');
        if ($metaDescLen >= 120 && $metaDescLen <= 160) {
            $score += 20;
        } elseif ($metaDescLen > 0) {
            $score += 10;
        }

        // Keywords (15 points)
        $keywords = $article->target_keywords ?? [];
        if (count($keywords) >= 3) {
            $score += 15;
        }

        // Content length (15 points)
        $wordCount = str_word_count(strip_tags($article->content ?? ''));
        if ($wordCount >= 500) {
            $score += 15;
        } elseif ($wordCount >= 300) {
            $score += 10;
        }

        // Internal links to properties (15 points)
        if ($article->properties()->count() > 0) {
            $score += 15;
        }

        // Featured image (10 points)
        if (! empty($article->featured_image)) {
            $score += 10;
        }

        // Excerpt (5 points)
        if (! empty($article->excerpt)) {
            $score += 5;
        }

        return $score;
    }

    /**
     * Detect property mentions in content
     */
    public function detectPropertyMentions(string $content): array
    {
        $properties = Property::select('id', 'name')->get();
        $mentions = [];

        foreach ($properties as $property) {
            if (stripos($content, $property->name) !== false) {
                $mentions[] = $property->id;
            }
        }

        return $mentions;
    }

    /**
     * Calculate reading time in minutes
     */
    public function calculateReadingTime(string $content): int
    {
        $wordCount = str_word_count(strip_tags($content));

        return (int) ceil($wordCount / 200);
    }
}
