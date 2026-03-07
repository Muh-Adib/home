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
 * Supports: Open Router, Gemini
 * Features: Auto key rotation, usage tracking, type-aware prompt delegation
 */
class AIArticleService
{
    public function __construct(
        private readonly ArticlePromptService $promptService
    ) {
    }

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
            "- Make them click-worthy and informative\n" .
            "- Using Bahasa Indonesia";

        $response = $this->callAI($provider, $prompt, maxTokens: 300);

        return [
            'success' => true,
            'titles' => $this->parseList($response['content']),
            'provider' => $provider,
            'model' => $response['model'],
        ];
    }

    /**
     * Analyze topic using AI (Deep Research)
     */
    public function analyzeTopic(string $topic): array
    {
        // 1. Ambil data competitor SERP secara gratis (bisa kosong jika scraper diblokir)
        $scraper = app(SerpScraperService::class);
        $competitorData = $scraper->scrapeTopResults($topic, 3);
        $competitorContext = "";

        if (!empty($competitorData)) {
            $competitorContext = "\n\n=== [ TOP 3 COMPETITOR DI GOOGLE SAAT INI ] ===\n";
            foreach ($competitorData as $i => $comp) {
                $num = $i + 1;
                $competitorContext .= "{$num}. Title: {$comp['title']}\n   Snippet: {$comp['snippet']}\n";
            }
            $competitorContext .= "\nInstruksi Tambahan: Pastikan analisismu LEBIH BAIK dan MENUTUPI CELAH dari kompetitor di atas.\n";
        }

        $prompt = "Analyze the topic: '{$topic}' for a property rental blog article.\n\n" .
            "Provide a deep analysis in JSON format with the following keys:\n" .
            "- search_intent: What is the user looking for? (Informational, Transactional, etc.)\n" .
            "- target_audience_analysis: Who is this for? (Renters, Owners, Investors)\n" .
            "- key_points: Array of 5-7 critical points/facts that MUST be covered.\n" .
            "- suggested_tone: The best tone for this article.\n" .
            "- competitor_analysis: Brief summary of what competitors usually cover.\n" .
            $competitorContext . "\n\n" .
            "CRITICAL:\n" .
            "- Language: Bahasa Indonesia\n" .
            "- Return ONLY valid JSON.\n" .
            "- No intro/outro text.";

        $response = $this->callAI('gemini', $prompt, maxTokens: 1000); // Prefer Gemini for analysis

        // Parse JSON
        $content = $response['content'];
        if (preg_match('/\{.*\}/s', $content, $matches)) {
            $jsonStr = $matches[0];
        } else {
            $jsonStr = $content;
        }

        $data = json_decode($jsonStr, true);

        if (!$data) {
            // Fallback if JSON fails
            return [
                'success' => true,
                'search_intent' => 'Informational',
                'target_audience_analysis' => 'General Audience',
                'key_points' => $this->parseList($content), // Treat as list if not JSON
                'suggested_tone' => 'Neutral',
                'raw_output' => $content
            ];
        }

        return array_merge(['success' => true], $data);
    }

    /**
     * Analyze news relevance for traveler/stay perspective
     */
    public function analyzeNewsRelevance(array $newsItem): array
    {
        $prompt = "Analyze this news item for a Yogyakarta homestay/villa travel blog.\n\n" .
            "News: '{$newsItem['title']}'\n" .
            "Source: {$newsItem['source']}\n\n" .
            "Determine if this news is a good 'trigger' for recommending accommodation.\n" .
            "Criteria for High Score (7-10):\n" .
            "- Major events (concerts, festivals) that bring crowds.\n" .
            "- Seasonal updates (holiday traffic, weather warnings).\n" .
            "- New tourism openings.\n" .
            "Criteria for Low Score (0-6):\n" .
            "- Politics, crime (unless safety advisory), minor local issues.\n\n" .
            "Return JSON:\n" .
            "{\n" .
            "  \"score\": (0-10),\n" .
            "  \"reason\": \"Short explanation\",\n" .
            "  \"traveler_angle\": \"How to frame this for travelers (e.g., 'Book early due to heavy traffic')\"\n" .
            "}";

        $response = $this->callAI('gemini', $prompt, maxTokens: 500);
        $content = $response['content'];

        // Extract JSON
        if (preg_match('/\{.*\}/s', $content, $matches)) {
            $jsonStr = $matches[0];
        } else {
            $jsonStr = $content;
        }

        return json_decode($jsonStr, true) ?? ['score' => 5, 'reason' => 'Failed to parse', 'traveler_angle' => 'General info'];
    }

    /**
    /**
     * Generate article outline — delegates prompt to ArticlePromptService
     *
     * @param string $articleType travel_guide|seo_article|property_article|event_article
     */
    public function generateOutline(
        string $title,
        array $keywords,
        string $provider = 'gemini',
        array $researchContext = [],
        string $customInstructions = '',
        string $articleType = 'travel_guide',
        array $properties = []
    ): array {
        // Use custom instructions if provided (legacy support), otherwise delegate to prompt service
        if (!empty($customInstructions)) {
            $intent = $researchContext['search_intent'] ?? 'Informasional';
            $contextStr = '';
            if (!empty($researchContext)) {
                $contextStr = "\nCONTEXT FROM RESEARCH:\n"
                    . 'Intent: ' . $intent . "\n"
                    . 'Audience: ' . ($researchContext['target_audience_analysis'] ?? '') . "\n"
                    . 'Key Points: ' . implode(', ', $researchContext['key_points'] ?? []) . "\n";
            }
            $prompt = "Tugas: Buat outline artikel untuk: '{$title}'\n"
                . 'Kata kunci: ' . implode(', ', $keywords) . "\n"
                . $contextStr
                . "INSTRUKSI KHUSUS:\n{$customInstructions}";
        } else {
            $prompt = $this->promptService->outlinePrompt($articleType, $title, $keywords, $researchContext, $properties);
        }

        $response = $this->callAI($provider, $prompt, maxTokens: 1500);
        $content = $response['content'];
        Log::info('[AIArticleService] Outline generated', ['type' => $articleType, 'title' => $title]);

        // Extract LSI Keywords if present
        $lsiKeywords = [];
        if (preg_match('/LSI Keywords:\s*(.+)/i', $content, $matches)) {
            $lsiKeywords = array_map('trim', explode(',', $matches[1]));
            $content = trim(preg_replace('/LSI Keywords:\s*(.+)/i', '', $content));
        }

        return [
            'success' => true,
            'outline' => $content,
            'lsi_keywords' => $lsiKeywords,
            'provider' => $provider,
            'article_type' => $articleType,
        ];
    }

    /**
     * Generate a full marketing-focused article in a SINGLE AI call.
     * This merges Outline + Content into one optimized prompt.
     * Used by GenerateTrendingArticleJob.
     */
    public function generateMarketingArticle(
        string $articleTitle,
        string $newsTrigger,
        string $newsSource,
        string $travelerAngle,
        array $keywords,
        array $properties = [],
    ): array {
        $propertyContext = '';
        if (!empty($properties)) {
            $propertyList = array_map(function ($p) {
                $url = route('properties.show', $p['slug'] ?? \Illuminate\Support\Str::slug($p['name']));
                $usp = !empty($p['description'])
                    ? substr(strip_tags($p['description']), 0, 120) . '...'
                    : 'Homestay nyaman di Yogyakarta.';
                return "- **{$p['name']}**: {$usp}\n  Link: {$url}";
            }, $properties);

            $propertyContext = "\n\nPROPERTI YANG HARUS DISEBUTKAN (sebagai solusi alami):\n" .
                implode("\n", $propertyList) .
                "\n\nCARA MENYEBUT PROPERTI:\n" .
                "- Selipkan sebagai solusi dari masalah yang dihadapi wisatawan.\n" .
                "- Contoh: 'Untuk keluarga yang bawa anak, [Nama Villa](URL) cocok karena ada halaman luas.'\n" .
                "- JANGAN buat bagian 'Rekomendasi Penginapan' yang terpisah, selipkan secara natural.\n" .
                "- Gunakan format markdown link: [Nama Properti](URL).";
        }

        $keywordStr = implode(', ', $keywords);

        $prompt = <<<PROMPT
Kamu adalah penulis travel blog profesional Indonesia yang juga ahli marketing homestay & villa di Yogyakarta.
Tugas: Tulis artikel panduan menginap yang terasa MANUSIAWI, MEMBANTU, dan secara halus mempromosikan properti kami.

===[ KONTEKS BERITA (Pemicu, bukan topik utama) ]===
Tren/event terbaru: "{$newsTrigger}" ({$newsSource})
Traveler Angle: {$travelerAngle}

===[ JUDUL ARTIKEL ]===
{$articleTitle}

===[ KATA KUNCI ]===
{$keywordStr}
{$propertyContext}

===[ STRUKTUR WAJIB (IKUTI DENGAN KETAT) ]===
**1. HOOK / PEMBUKA** (1–2 paragraf)
   - Cerita kecil yang relatable tentang seorang wisatawan / kesulitan mencari penginapan saat event.
   - Pertanyaan reflektif. Contoh: "Pernah nggak, kamu udah jauh-jauh ke Jogja, eh tempat menginap penuh semua?"

**2. KONTEKS TREN** (1 paragraf ringkas)
   - Jelaskan kenapa Jogja sedang ramai / event ini penting bagi wisatawan.
   - Jangan copy-paste berita. Rangkum sudut pandang WISATAWAN.

**3. MASALAH WISATAWAN** (1–2 paragraf)
   - Dampak nyata: hotel penuh, harga melonjak, akses macet, capek setelah seharian jalan.
   - Bangun empati. Buat pembaca merasa "ini masalah ku juga."

**4. SOLUSI MENGINAP** (2–3 paragraf)
   - Kenalkan homestay/villa sebagai solusi cerdas.
   - Di sini sisipkan properti kami secara natural (jika tersedia).
   - Tips memilih homestay: dekat lokasi, kapasitas, fasilitas.

**5. TIPS BONUS** (poin-poin ringkas)
   - Tips transportasi, kuliner, atau aktivitas di sekitar.

**6. PENUTUP + SOFT CTA** (1 paragraf)
   - Kalimat penutup hangat.
   - Soft CTA: "Cek ketersediaan homestay kami sebelum musim ramai tiba!"

===[ ATURAN PENULISAN ]===
- Bahasa Indonesia, santai, hangat, seperti ngobrol dengan teman.
- MINIMUM 700 kata.
- DILARANG: "Berdasarkan data", "Kesimpulannya", "Tentunya", "Sejatinya", "Dalam hal ini".
- DILARANG: pembuka seperti "Tentu, ini dia artikel..." atau "Berikut adalah..."
- Gunakan heading H2 (##) dan H3 (###) untuk struktur.
- Bold kata kunci penting.
- LANGSUNG mulai dengan teks artikel (tanpa judul di baris pertama).
PROMPT;

        $response = $this->callAI('gemini', $prompt, maxTokens: 4000);
        $content = $response['content'];
        $wordCount = str_word_count(strip_tags($content));

        return [
            'success' => true,
            'content' => $content,
            'excerpt' => $this->generateExcerpt($content),
            'meta_description' => $this->generateMetaDescription($content, $keywords),
            'word_count' => $wordCount,
            'provider' => 'gemini',
        ];
    }

    /**
     * Generate full article content — delegates prompt to ArticlePromptService
     *
     * @param string $articleType travel_guide|seo_article|property_article|event_article
     */
    public function generateContent(
        string $outline,
        array $keywords,
        array $properties = [],
        string $provider = 'openrouter',
        string $language = 'id',
        string $tone = 'casual',
        ?string $intent = null,
        string $articleType = 'travel_guide'
    ): array {
        // Ambil maksimal 3 artikel relevan untuk internal linking
        $linkedArticles = Article::where('status', 'published')
            ->inRandomOrder()
            ->limit(3)
            ->get(['title', 'slug'])
            ->toArray();

        $prompt = $this->promptService->contentPrompt(
            $articleType,
            $outline,
            $keywords,
            $properties,
            $language,
            $tone,
            $linkedArticles
        );

        // Append intent instruction if provided (legacy support)
        if ($intent) {
            $prompt .= "\n\nSEARCH INTENT: {$intent}. Pastikan artikel menjawab intent ini secara tuntas.";
        }

        $response = $this->callAI($provider, $prompt, maxTokens: 5000);

        $content = $response['content'];

        // Strip any stray ```json blocks the AI might still produce (safety net)
        $content = trim(preg_replace('/```(?:json)?\s*\{[^`]+\}\s*```/is', '', $content));

        $wordCount = str_word_count(strip_tags($content));

        Log::info('[AIArticleService] Content generated', [
            'type' => $articleType,
            'word_count' => $wordCount,
            'provider' => $provider,
        ]);

        return [
            'success' => true,
            'content' => $content,
            'excerpt' => $this->generateExcerpt($content),
            'meta_description' => $this->generateMetaDescription($content, $keywords),
            'word_count' => $wordCount,
            'provider' => $provider,
            'article_type' => $articleType,
        ];
    }

    /**
     * Generate excerpt from content
     */
    private function generateExcerpt(string $content): string
    {
        // Remove markdown and HTML
        $text = strip_tags(preg_replace('/[#*_\[\]()]/', '', $content));

        // Attempt to find the "Hook" (often the first paragraph)
        // Split by double newline to get paragraphs
        $paragraphs = array_filter(array_map('trim', explode("\n\n", $text)));
        $firstPara = reset($paragraphs) ?: '';

        // Follow AIDA: Get first 2-3 sentences or around 160-200 chars
        $sentences = preg_split('/(?<=[.!?])\s+/', $firstPara, 4);
        $excerpt = implode(' ', array_slice($sentences, 0, 3));

        // Trim intelligently
        if (mb_strlen($excerpt) > 200) {
            // Cut at last space before 197 chars
            $excerpt = mb_substr($excerpt, 0, 197);
            $lastSpace = mb_strrpos($excerpt, ' ');
            if ($lastSpace !== false && $lastSpace > 100) {
                $excerpt = mb_substr($excerpt, 0, $lastSpace);
            }
            $excerpt .= '...';
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

        $paragraphs = array_filter(array_map('trim', explode("\n\n", $text)));
        $firstPara = reset($paragraphs) ?: '';

        // Try to construct a compelling description using the main keyword
        $mainKeyword = $keywords[0] ?? '';

        if ($mainKeyword && stripos($firstPara, $mainKeyword) === false) {
            // If keyword isn't in first paragraph naturally, prepend it gracefully
            // e.g., "Mencari \{keyword\}? \{sentence\}"
            $sentences = preg_split('/(?<=[.!?])\s+/', $firstPara, 3);
            $firstSentence = $sentences[0] ?? '';
            $description = ucfirst($mainKeyword) . ': ' . $firstSentence;
            if (mb_strlen($description) < 100 && isset($sentences[1])) {
                $description .= ' ' . $sentences[1];
            }
        } else {
            $description = $firstPara;
        }

        // Enforce 160 chars strictly without cutting mid-word if possible
        if (mb_strlen($description) > 160) {
            $description = mb_substr($description, 0, 157);
            $lastSpace = mb_strrpos($description, ' ');
            if ($lastSpace !== false && $lastSpace > 100) { // ensure we don't cut too short
                $description = mb_substr($description, 0, $lastSpace);
            }
            // Remove trailing punctuation before adding ellipsis
            $description = rtrim($description, '.,!?:;') . '...';
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
        // Rate Limit Protection (RPM/TPM)
        // Gemini is strict, so we force a pause to ensure the token bucket has time to refill.
        if ($provider === 'gemini' || $provider === 'google') {
            Log::info("AIArticleService: Pausing 3s for Gemini Rate Limit Protection...");
            sleep(3);
        } else {
            // Minimal pause for other providers to prevent burst flagging
            usleep(500000); // 0.5s
        }

        // Try requested provider first
        $providerKey = AIProviderKey::getOptimalKey($provider);

        // SAFEGUARD: Check for 4M Token Limit (User Request)
        if ($providerKey && ($provider === 'gemini' || $provider === 'google')) {
            if ($providerKey->tokens_used >= 3900000) {
                Log::warning("AI Key '{$providerKey->name}' approaching 4M tokens ({$providerKey->tokens_used}). Pausing 60s for safety...");
                sleep(60);
            }
        }

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

        $retryCount = 0;
        $maxRetries = 1;

        do {
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
                // Check for 429 and retry
                if ($e->getCode() === 429 && $retryCount < $maxRetries) {
                    $retryCount++;
                    Log::warning("AI Provider 429 Rate Limit hit. Pausing 60s then retrying (Attempt {$retryCount})...");
                    sleep(60);
                    continue;
                }
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
        } while ($retryCount <= $maxRetries);
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
