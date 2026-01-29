<?php

namespace App\Services;

use App\Models\AIProviderKey;
use App\Models\Article;
use App\Models\Property;
use App\Exceptions\AIGenerationException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AIArticleService - AI provider abstraction dengan key rotation
 * 
 * Supports: Open

Router, Gemini
 * Features: Auto key rotation, usage tracking, web search integration
 */
class AIArticleService
{
    /**
     * Generate article title suggestions
     */
    public function generateTitle(array $keywords, string $provider = 'openrouter', int $count = 5): array
    {
        $prompt = "Generate exactly {$count} compelling article titles about: " . implode(', ', $keywords) .
            ". Requirements:\n" .
            "- SEO-friendly and engaging for property rental blog\n" .
            "- Each title on a new line\n" .
            "- Use these keywords naturally\n" .
            "- NO introduction text, NO numbering, NO explanations\n" .
            "- ONLY return the titles, one per line\n" .
            "- Make them click-worthy and informative";

        $response = $this->callAI($provider, $prompt, maxTokens: 300);

        return [
            'success' => true,
            'titles' => $this->parseList($response['content']),
            'provider' => $provider,
            'model' => $response['model'],
        ];
    }

    /**
     * Generate article outline
     */
    public function generateOutline(string $title, array $keywords, string $provider = 'openrouter'): array
    {
        $prompt = "Create a detailed article outline for: '{$title}'\n" .
            "Target keywords: " . implode(', ', $keywords) . "\n\n" .
            "CRITICAL INSTRUCTIONS:\n" .
            "- Create comprehensive outline with sections and sub-points\n" .
            "- Include: Introduction, main sections, conclusion\n" .
            "- Use hierarchical structure (I., A., 1., etc.)\n" .
            "- NO introduction text like 'Here is the outline' or 'Here's a detailed'\n" .
            "- NO meta-commentary\n" .
            "- START DIRECTLY with the outline\n" .
            "- ONLY return outline, nothing else";

        $response = $this->callAI($provider, $prompt, maxTokens: 1500);
        Log::info($response['content']);

        return [
            'success' => true,
            'outline' => $response['content'],
            'provider' => $provider,
        ];
    }

    /**
     * Generate full article content
     */
    public function generateContent(
        string $outline,
        array $keywords,
        array $properties = [],
        string $provider = 'openrouter',
        string $language = 'id',
        string $tone = 'professional'
    ): array {
        $propertyContext = '';
        if (!empty($properties)) {
            $propertyContext = "\n\nMention these properties naturally: " .
                implode(', ', array_map(fn($p) => $p['name'], $properties));
        }

        $langInstruction = $language === 'id' ? 'in Indonesian (Bahasa Indonesia)' : 'in English';

        $toneInstruction = match ($tone) {
            'casual' => 'Use a friendly, conversational tone like a blog post. Be engaging and relatable.',
            'professional' => 'Use a professional, informative tone suitable for business content.',
            default => 'Use a balanced, engaging tone.',
        };

        $prompt = "Write a comprehensive article {$langInstruction} based on this outline:\n\n{$outline}\n\n" .
            "Keywords to include: " . implode(', ', $keywords) . $propertyContext . "\n\n" .
            "CRITICAL INSTRUCTIONS:\n" .
            "- {$toneInstruction}\n" .
            "- Minimum 500 words\n" .
            "- SEO-optimized with natural keyword integration\n" .
            "- Use markdown formatting (headings, lists, bold, italic)\n" .
            "- NO introduction text like 'Here is the article' or 'Tentu, ini dia artikel'\n" .
            "- NO meta-commentary or explanations\n" .
            "- START DIRECTLY with the article content without title\n" .
            "- Write engaging, informative content\n" .
            "- ONLY return the article markdown, nothing else";

        $response = $this->callAI($provider, $prompt, maxTokens: 2500);

        $content = $response['content'];
        $wordCount = str_word_count(strip_tags($content));

        // Generate excerpt (first 2-3 sentences or 150-200 chars)
        $excerpt = $this->generateExcerpt($content);

        // Generate meta description
        $metaDescription = $this->generateMetaDescription($content, $keywords);

        return [
            'success' => true,
            'content' => $content,
            'excerpt' => $excerpt,
            'meta_description' => $metaDescription,
            'word_count' => $wordCount,
            'provider' => $provider,
        ];
    }

    /**
     * Generate excerpt from content
     */
    private function generateExcerpt(string $content): string
    {
        // Remove markdown and HTML
        $text = strip_tags(preg_replace('/[#*_\[\]()]/', '', $content));

        // Get first 2 sentences or 200 chars, whichever is shorter
        $sentences = preg_split('/(?<=[.!?])\s+/', $text, 3);
        $excerpt = implode(' ', array_slice($sentences, 0, 2));

        if (strlen($excerpt) > 200) {
            $excerpt = substr($excerpt, 0, 197) . '...';
        }

        return trim($excerpt);
    }

    /**
     * Generate meta description optimized for SEO
     */
    private function generateMetaDescription(string $content, array $keywords): string
    {
        // Remove markdown and get clean text
        $text = strip_tags(preg_replace('/[#*_\[\]()]/', '', $content));

        // Get first paragraph or 160 chars
        $paragraphs = preg_split('/\n\n+/', $text);
        $firstPara = $paragraphs[0] ?? '';

        // Include main keyword if not already present
        $mainKeyword = $keywords[0] ?? '';
        if ($mainKeyword && stripos($firstPara, $mainKeyword) === false) {
            $description = $mainKeyword . ': ' . $firstPara;
        } else {
            $description = $firstPara;
        }

        // Trim to 160 chars
        if (strlen($description) > 160) {
            $description = substr($description, 0, 157) . '...';
        }

        return trim($description);
    }

    /**
     * Improve existing content
     */
    public function improveContent(string $content, array $suggestions, string $provider = 'openrouter'): array
    {
        $prompt = "Improve this content based on these suggestions:\n\n" .
            "Content:\n{$content}\n\n" .
            "Suggestions:\n" . implode("\n", $suggestions);

        $response = $this->callAI($provider, $prompt, maxTokens: 2000);

        return [
            'success' => true,
            'improved_content' => $response['content'],
            'provider' => $provider,
        ];
    }

    /**
     * Research topic using web search (DuckDuckGo - free)
     */
    public function researchTopic(string $topic): array
    {
        try {
            // Use DuckDuckGo Instant Answer API (free, no key required)
            // Use withoutVerifying() to handle local SSL issues
            $response = Http::withoutVerifying()->get('https://api.duckduckgo.com/', [
                'q' => $topic . " (dalam Bahasa Indonesia)",
                'format' => 'json',
                'no_html' => 1,
                'skip_disambig' => 1,
            ]);

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'success' => true,
                    'abstract' => $data['Abstract'] ?? '',
                    'source' => $data['AbstractSource'] ?? '',
                    'url' => $data['AbstractURL'] ?? '',
                    'related_topics' => array_map(fn($t) => $t['Text'] ?? '', $data['RelatedTopics'] ?? []),
                ];
            }

            return ['success' => false, 'error' => 'Search failed'];

        } catch (\Exception $e) {
            Log::error('Web search failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Analyze SEO quality
     */
    public function analyzeSEO(string $content, array $targetKeywords): array
    {
        $wordCount = str_word_count(strip_tags($content));
        $contentLower = strtolower($content);

        $analysis = [
            'word_count' => $wordCount,
            'keyword_density' => [],
            'readability_score' => $this->calculateReadability($content),
            'suggestions' => [],
        ];

        // Keyword density
        foreach ($targetKeywords as $keyword) {
            $count = substr_count($contentLower, strtolower($keyword));
            $density = $wordCount > 0 ? ($count / $wordCount) * 100 : 0;

            $analysis['keyword_density'][$keyword] = [
                'count' => $count,
                'density' => round($density, 2),
                'optimal' => $density >= 1 && $density <= 3,
            ];

            if ($density < 1) {
                $analysis['suggestions'][] = "Add more mentions of '{$keyword}' (current: {$count})";
            } elseif ($density > 3) {
                $analysis['suggestions'][] = "Reduce mentions of '{$keyword}' to avoid keyword stuffing";
            }
        }

        // Content length
        if ($wordCount < 300) {
            $analysis['suggestions'][] = "Content is too short. Aim for at least 500 words for better SEO.";
        }

        return $analysis;
    }

    /**
     * Suggest internal links to properties
     */
    public function suggestInternalLinks(string $content): array
    {
        $properties = Property::active()->get();
        $suggestions = [];

        foreach ($properties as $property) {
            // Check if property name is mentioned
            if (stripos($content, $property->name) !== false) {
                $suggestions[] = [
                    'property_id' => $property->id,
                    'property_name' => $property->name,
                    'slug' => $property->slug,
                    'url' => route('properties.show', $property->slug),
                    'mentions' => substr_count(strtolower($content), strtolower($property->name)),
                ];
            }
        }

        return $suggestions;
    }

    /**
     * Core AI call with key rotation and smart provider fallback
     */
    public function callAI(string $provider, string $prompt, int $maxTokens = 1000): array
    {
        // Try requested provider first
        $providerKey = AIProviderKey::getOptimalKey($provider);

        // If requested provider has no keys, try to fallback to any available provider
        if (!$providerKey) {
            Log::info("No key found for provider: {$provider}, attempting fallback");

            // Get any available provider with active key
            $fallbackKey = AIProviderKey::where('is_active', true)
                ->where('provider', '!=', $provider)
                ->orderBy('priority', 'desc')
                ->orderBy('requests_count', 'asc')
                ->first();

            if ($fallbackKey) {
                $provider = $fallbackKey->provider;
                $providerKey = $fallbackKey;

                Log::info("Falling back to provider: {$provider}");
            } else {
                throw new AIGenerationException(
                    "No active API key configured",
                    [
                        'provider' => $provider,
                        'suggestion' => 'Please add an API key in Settings → AI Provider Keys',
                        'retry_suggested' => false,
                    ]
                );
            }
        }

        if ($providerKey->isRateLimited()) {
            throw new AIGenerationException(
                'API rate limit exceeded',
                [
                    'provider' => $provider,
                    'key_name' => $providerKey->name,
                    'suggestion' => 'Try again in a few minutes or add another API key',
                    'retry_suggested' => true,
                ],
                429
            );
        }

        try {
            $apiKey = $providerKey->api_key;

            if ($provider === 'openrouter') {
                $result = $this->callOpenRouter($apiKey, $prompt, $maxTokens);
            } elseif ($provider === 'gemini') {
                $result = $this->callGemini($apiKey, $prompt, $maxTokens);
            } else {
                throw new \Exception("Unsupported provider: {$provider}");
            }

            // Track usage
            $providerKey->incrementUsage(
                tokens: $result['tokens'] ?? 0,
                cost: $result['cost'] ?? 0
            );

            return $result;

        } catch (AIGenerationException $e) {
            // Re-throw our custom exceptions
            throw $e;
        } catch (\Exception $e) {
            Log::error('AI generation failed', [
                'provider' => $provider,
                'key_id' => $providerKey->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new AIGenerationException(
                'AI generation failed',
                [
                    'provider' => $provider,
                    'original_error' => $e->getMessage(),
                    'suggestion' => 'This might be a temporary issue. Please try again.',
                    'retry_suggested' => true,
                ]
            );
        }
    }

    /**
     * Call OpenRouter API
     */
    private function callOpenRouter(string $apiKey, string $prompt, int $maxTokens): array
    {
        $model = config('article.ai.providers.openrouter.default_model', 'anthropic/claude-3.5-sonnet');

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])->post('https://openrouter.ai/api/v1/chat/completions', [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'max_tokens' => $maxTokens,
                ]);

        if (!$response->successful()) {
            $errorBody = $response->json();
            $errorMessage = $errorBody['error']['message'] ?? 'Unknown API error';

            Log::error('OpenRouter API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new AIGenerationException(
                "OpenRouter API error: {$errorMessage}",
                [
                    'provider' => 'openrouter',
                    'status_code' => $response->status(),
                    'original_error' => $errorMessage,
                    'suggestion' => $response->status() === 401
                        ? 'API key might be invalid. Please check your key configuration.'
                        : 'This might be a temporary issue with OpenRouter.',
                    'retry_suggested' => $response->status() >= 500,
                ],
                $response->status()
            );
        }

        $data = $response->json();

        return [
            'content' => $data['choices'][0]['message']['content'] ?? '',
            'model' => $data['model'] ?? $model,
            'tokens' => $data['usage']['total_tokens'] ?? 0,
            'cost' => 0, // Calculate based on model pricing
        ];
    }

    /**
     * Call Gemini API
     */
    private function callGemini(string $apiKey, string $prompt, int $maxTokens): array
    {
        $model = config('article.ai.providers.gemini.default_model', 'gemini-2.5-flash-lite');

        $response = Http::post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
            'generationConfig' => [
                'maxOutputTokens' => $maxTokens,
            ],
        ]);

        if (!$response->successful()) {
            $errorBody = $response->json();
            $errorMessage = $errorBody['error']['message'] ?? 'Unknown API error';

            Log::error('Gemini API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new AIGenerationException(
                "Gemini API error: {$errorMessage}",
                [
                    'provider' => 'gemini',
                    'status_code' => $response->status(),
                    'original_error' => $errorMessage,
                    'suggestion' => $response->status() === 401 || $response->status() === 403
                        ? 'API key might be invalid. Please check your key configuration.'
                        : 'This might be a temporary issue with Gemini.',
                    'retry_suggested' => $response->status() >= 500,
                ],
                $response->status()
            );
        }

        $data = $response->json();

        return [
            'content' => $data['candidates'][0]['content']['parts'][0]['text'] ?? '',
            'model' => $model,
            'tokens' => $data['usageMetadata']['totalTokenCount'] ?? 0,
            'cost' => 0, // Gemini pricing
        ];
    }

    /**
     * Parse list from AI response
     */
    private function parseList(string $content): array
    {
        $lines = explode("\n", $content);
        $items = [];

        foreach ($lines as $line) {
            $line = trim($line);
            // Remove numbering, bullets, dashes
            $line = preg_replace('/^[\d\.\-\*\•]\s*/', '', $line);

            if (!empty($line)) {
                $items[] = $line;
            }
        }

        return array_filter($items);
    }

    /**
     * Calculate readability score (Flesch Reading Ease approximation)
     */
    private function calculateReadability(string $content): float
    {
        $text = strip_tags($content);
        $wordCount = str_word_count($text);
        $sentenceCount = preg_match_all('/[.!?]+/', $text);
        $syllableCount = $this->countSyllables($text);

        if ($wordCount == 0 || $sentenceCount == 0) {
            return 0;
        }

        $avgWordsPerSentence = $wordCount / max($sentenceCount, 1);
        $avgSyllablesPerWord = $syllableCount / $wordCount;

        $score = 206.835 - (1.015 * $avgWordsPerSentence) - (84.6 * $avgSyllablesPerWord);

        return round(max(0, min(100, $score)), 1);
    }

    /**
     * Approximate syllable count
     */
    private function countSyllables(string $text): int
    {
        $words = str_word_count(strtolower($text), 1);
        $syllables = 0;

        foreach ($words as $word) {
            $syllables += max(1, preg_match_all('/[aeiouy]+/', $word));
        }

        return $syllables;
    }
}
