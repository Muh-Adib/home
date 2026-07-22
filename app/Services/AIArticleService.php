<?php

namespace App\Services;

use App\Exceptions\AIGenerationException;
use App\Models\AIProviderKey;
use App\Models\Article;
use App\Models\Property;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * AIArticleService - AI provider abstraction dengan key rotation
 *
 * Supports: Open Router, Gemini, OpenAI, Anthropic
 * Features:
 *   - Auto key rotation & provider fallback
 *   - Usage tracking
 *   - System prompt support (consistent AI persona)
 *   - Exponential backoff on rate limits
 *   - Extracted continuation loop (DRY)
 *   - Non-blocking rate limiting via RateLimiter
 *   - Cached internal linking query
 *   - Structured JSON output (Gemini response_schema)
 */
class AIArticleService
{
    // -------------------------------------------------------------------------
    // Global system prompt — karakter AI yang konsisten di semua call
    // -------------------------------------------------------------------------
    private const SYSTEM_PROMPT = <<<'SYSTEM'
Kamu adalah penulis konten profesional untuk blog properti & wisata Yogyakarta bernama HomsJogja.
Spesialisasi: artikel SEO berbahasa Indonesia yang terasa manusiawi, hangat, dan membantu.

Aturan wajib (selalu berlaku):
- Bahasa Indonesia baku yang tetap santai dan conversational.
- DILARANG menggunakan: "Tentunya", "Sejatinya", "Dalam hal ini", "Perlu diketahui bahwa".
- DILARANG memulai respons dengan intro seperti "Tentu, berikut adalah...", "Baik, ini dia...".
- Format output sesuai instruksi spesifik di tiap prompt.
- Jika diminta JSON: kembalikan HANYA JSON valid, tanpa preamble atau markdown code block.
SYSTEM;

    // Batas kata minimum per tipe artikel untuk menilai kelengkapan
    private const MIN_WORD_COUNT = [
        'travel_guide' => 600,
        'seo_article' => 600,
        'property_article' => 500,
        'event_article' => 500,
    ];

    public function __construct(
        private readonly ArticlePromptService $promptService
    ) {}

    // =========================================================================
    // PUBLIC METHODS
    // =========================================================================

    /**
     * Generate article title suggestions
     */
    public function generateTitle(array $keywords, string $provider = 'openrouter', int $count = 5): array
    {
        $keywordStr = implode(', ', $keywords);

        // FIX: Tambah few-shot example dan spesifikasi panjang judul
        $prompt = <<<PROMPT
Generate tepat {$count} judul artikel yang menarik tentang: {$keywordStr}

Persyaratan:
- SEO-friendly untuk blog properti & wisata Jogja
- Panjang ideal: 50–65 karakter
- Gunakan keyword secara natural
- Variasikan format: How-to, Listicle, Question, Statement
- Bahasa Indonesia
- Tanpa penomoran, tanpa penjelasan — langsung judul saja, satu per baris

Contoh format output yang benar:
7 Tips Memilih Homestay Jogja untuk Liburan Keluarga
Kenapa Villa di Sleman Lebih Worth It dari Hotel Bintang?
Panduan Lengkap Wisata Malioboro: Penginapan, Kuliner & Transportasi
PROMPT;

        $response = $this->callAI($provider, $prompt, maxTokens: 400);

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
        $scraper = app(SerpScraperService::class);
        $competitorData = $scraper->scrapeTopResults($topic, 3);
        $competitorContext = '';

        if (! empty($competitorData)) {
            $competitorContext = "\n\n=== TOP 3 COMPETITOR DI GOOGLE ===\n";
            foreach ($competitorData as $i => $comp) {
                $num = $i + 1;
                $competitorContext .= "{$num}. Title: {$comp['title']}\n   Snippet: {$comp['snippet']}\n";
            }
            $competitorContext .= "\nPastikan analisismu LEBIH BAIK dan menutupi celah dari kompetitor di atas.\n";
        }

        // FIX: Sertakan contoh JSON schema agar output lebih konsisten
        $exampleJson = json_encode([
            'search_intent' => 'Informational',
            'target_audience_analysis' => 'Pasangan muda yang ingin liburan hemat di Jogja',
            'key_points' => ['Poin 1', 'Poin 2', 'Poin 3'],
            'suggested_tone' => 'Casual, hangat, informatif',
            'competitor_analysis' => 'Kompetitor umumnya membahas X tapi melewatkan Y',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
Analisis topik ini untuk artikel blog properti & wisata Jogja: "{$topic}"
{$competitorContext}

Kembalikan JSON dengan struktur PERSIS seperti contoh berikut (isi dengan data nyata):
{$exampleJson}

ATURAN KETAT:
- Kembalikan HANYA JSON valid. Tidak ada teks sebelum atau sesudah JSON.
- key_points: array berisi 5–7 poin penting yang wajib dibahas.
- Bahasa Indonesia.
PROMPT;

        // FIX: Gunakan Gemini structured output jika tersedia
        $response = $this->callAI('gemini', $prompt, maxTokens: 1000, useStructuredOutput: true, jsonSchema: [
            'type' => 'object',
            'properties' => [
                'search_intent' => ['type' => 'string'],
                'target_audience_analysis' => ['type' => 'string'],
                'key_points' => ['type' => 'array', 'items' => ['type' => 'string']],
                'suggested_tone' => ['type' => 'string'],
                'competitor_analysis' => ['type' => 'string'],
            ],
            'required' => ['search_intent', 'target_audience_analysis', 'key_points', 'suggested_tone'],
        ]);

        $data = $this->parseJsonResponse($response['content']);

        if (! $data) {
            return [
                'success' => true,
                'search_intent' => 'Informational',
                'target_audience_analysis' => 'General Audience',
                'key_points' => $this->parseList($response['content']),
                'suggested_tone' => 'Neutral',
                'raw_output' => $response['content'],
            ];
        }

        return array_merge(['success' => true], $data);
    }

    /**
     * Analyze news relevance for traveler/stay perspective
     */
    public function analyzeNewsRelevance(array $newsItem): array
    {
        // FIX: Rubrik scoring tidak overlap, tambah chain-of-thought sebelum skor
        $exampleJson = json_encode([
            'reasoning' => 'Event besar yang mendatangkan ribuan pengunjung dari luar kota.',
            'score' => 9,
            'reason' => 'Konser besar → lonjakan permintaan penginapan.',
            'traveler_angle' => 'Pesan penginapan minimal 2 minggu sebelum event.',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
Kamu adalah analis konten untuk blog homestay Jogja.
Nilai apakah berita ini cocok menjadi pemicu artikel rekomendasi penginapan.

Berita: "{$newsItem['title']}"
Sumber: {$newsItem['source']}

Rubrik penilaian (skala 1–5, pilih TEPAT satu):
- Skor 5: Event besar (konser, festival nasional) atau bencana/advisory perjalanan
- Skor 4: Pembukaan destinasi wisata baru atau event skala kota
- Skor 3: Update transportasi atau infrastruktur yang memengaruhi wisatawan
- Skor 2: Berita lokal minor yang ada kaitannya dengan pariwisata
- Skor 1: Politik, kriminal biasa, atau berita yang tidak relevan sama sekali

Proses berpikir: Tulis reasoning singkatmu DULU sebelum memberi skor.

Kembalikan JSON PERSIS seperti contoh ini:
{$exampleJson}

ATURAN: Kembalikan HANYA JSON valid. Tidak ada teks lain.
PROMPT;

        $response = $this->callAI('gemini', $prompt, maxTokens: 500, useStructuredOutput: true, jsonSchema: [
            'type' => 'object',
            'properties' => [
                'reasoning' => ['type' => 'string'],
                'score' => ['type' => 'integer'],
                'reason' => ['type' => 'string'],
                'traveler_angle' => ['type' => 'string'],
            ],
            'required' => ['reasoning', 'score', 'reason', 'traveler_angle'],
        ]);

        return $this->parseJsonResponse($response['content'])
            ?? ['score' => 3, 'reason' => 'Gagal parse response', 'traveler_angle' => 'Info umum', 'reasoning' => ''];
    }

    /**
     * Generate article outline — delegates prompt to ArticlePromptService.
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
        if (! empty($customInstructions)) {
            $researchContext['intent_instructions'] = $customInstructions;
        }

        $prompt = $this->promptService->outlinePrompt($articleType, $title, $keywords, $researchContext, $properties);

        // FIX: Gunakan callWithContinuation agar tidak duplikat logic
        $content = $this->callWithContinuation(
            provider: $provider,
            initialPrompt: $prompt,
            maxTokens: 4000,
            completionCheck: fn (string $c) => $this->isOutlineComplete($c),
            continueContext: "outline JSON untuk artikel: {$title}",
        );

        $cleanContent = trim((string) preg_replace('/```json\s*|\s*```/i', '', $content));
        $parsed = json_decode($cleanContent, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($parsed)) {
            Log::warning('[AIArticleService] Outline JSON invalid, menggunakan text fallback.', [
                'error' => json_last_error_msg(),
                'preview' => substr($content, 0, 120),
            ]);

            $lsiKeywords = [];
            if (preg_match('/LSI Keywords:\s*([^\n]+)/i', $content, $matches)) {
                $lsiKeywords = array_map('trim', explode(',', $matches[1]));
                $content = trim(preg_replace('/LSI Keywords:\s*[^\n]+/i', '', $content));
            }

            return [
                'success' => true,
                'outline' => $content,
                'lsi_keywords' => $lsiKeywords,
                'provider' => $provider,
                'article_type' => $articleType,
            ];
        }

        return [
            'success' => true,
            'outline' => $parsed['outline'] ?? '',
            'lsi_keywords' => $parsed['lsi_keywords'] ?? [],
            'provider' => $provider,
            'article_type' => $articleType,
        ];
    }

    /**
     * Generate full marketing-focused article (single AI call).
     * Used by GenerateTrendingArticleJob.
     *
     * FIX: Prompt dipindah ke ArticlePromptService agar konsisten.
     */
    public function generateMarketingArticle(
        string $articleTitle,
        string $newsTrigger,
        string $newsSource,
        string $travelerAngle,
        array $keywords,
        array $properties = [],
    ): array {
        // FIX: Delegasikan ke promptService — konsisten dengan generateContent & generateOutline
        $prompt = $this->promptService->marketingArticlePrompt(
            title: $articleTitle,
            newsTrigger: $newsTrigger,
            newsSource: $newsSource,
            travelerAngle: $travelerAngle,
            keywords: $keywords,
            properties: $properties,
        );

        // FIX: Gunakan callWithContinuation
        $content = $this->callWithContinuation(
            provider: 'gemini',
            initialPrompt: $prompt,
            maxTokens: 4000,
            completionCheck: fn (string $c) => $this->isArticleComplete($c, 'event_article'),
            continueContext: "artikel marketing bertajuk: {$articleTitle}",
        );

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
        // FIX: Cache linked articles — hindari query DB berulang di batch job
        $linkedArticles = Cache::remember('ai_linked_articles', 300, fn () => Article::where('status', 'published')
            ->inRandomOrder()
            ->limit(3)
            ->get(['title', 'slug'])
            ->toArray()
        );

        $prompt = $this->promptService->contentPrompt(
            $articleType,
            $outline,
            $keywords,
            $properties,
            $language,
            $tone,
            $linkedArticles
        );

        if ($intent) {
            $prompt .= "\n\nSEARCH INTENT: {$intent}. Pastikan artikel menjawab intent ini secara tuntas.";
        }

        // FIX: Gunakan callWithContinuation — tidak duplikat 50+ baris
        $content = $this->callWithContinuation(
            provider: $provider,
            initialPrompt: $prompt,
            maxTokens: 5000,
            completionCheck: fn (string $c) => $this->isArticleComplete($c, $articleType),
            continueContext: "artikel tipe {$articleType}",
        );

        // Strip stray ```json blocks (safety net)
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
     * Improve existing content
     */
    public function improveContent(string $content, array $suggestions, string $provider = 'openrouter'): array
    {
        $suggestionList = implode("\n- ", $suggestions);

        $prompt = <<<PROMPT
Perbaiki artikel berikut berdasarkan saran di bawah ini.
Pertahankan gaya bahasa aslinya. Kembalikan HANYA artikel yang sudah diperbaiki.

Saran perbaikan:
- {$suggestionList}

Artikel:
{$content}
PROMPT;

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
            $response = Http::withoutVerifying()->get('https://api.duckduckgo.com/', [
                'q' => $topic.' (dalam Bahasa Indonesia)',
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
                    'related_topics' => array_map(fn ($t) => $t['Text'] ?? '', $data['RelatedTopics'] ?? []),
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
        $contentLow = strtolower($content);

        $analysis = [
            'word_count' => $wordCount,
            'keyword_density' => [],
            'readability_score' => $this->calculateReadability($content),
            'suggestions' => [],
        ];

        foreach ($targetKeywords as $keyword) {
            $count = substr_count($contentLow, strtolower($keyword));
            $density = $wordCount > 0 ? ($count / $wordCount) * 100 : 0;

            $analysis['keyword_density'][$keyword] = [
                'count' => $count,
                'density' => round($density, 2),
                'optimal' => $density >= 1 && $density <= 3,
            ];

            if ($density < 1) {
                $analysis['suggestions'][] = "Tambah penyebutan '{$keyword}' (saat ini: {$count}×)";
            } elseif ($density > 3) {
                $analysis['suggestions'][] = "Kurangi penyebutan '{$keyword}' untuk menghindari keyword stuffing";
            }
        }

        if ($wordCount < 300) {
            $analysis['suggestions'][] = 'Artikel terlalu pendek. Target minimal 500 kata untuk SEO.';
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

    // =========================================================================
    // CORE AI CALL — single entry point dengan system prompt & exponential backoff
    // =========================================================================

    /**
     * Core AI call dengan key rotation, system prompt, dan non-blocking rate limit.
     *
     * FIX (dari kode lama):
     *   - sleep() diganti dengan RateLimiter Laravel (non-blocking per key)
     *   - System prompt disertakan di semua call (persona konsisten)
     *   - Exponential backoff pada 429 (bukan flat sleep 60s)
     *   - Token limit check kini trigger rotasi key, bukan hanya pause
     *   - $useStructuredOutput & $jsonSchema untuk Gemini structured output
     */
    public function callAI(
        string $provider,
        string $prompt,
        int $maxTokens = 1000,
        bool $useStructuredOutput = false,
        array $jsonSchema = []
    ): array {
        $providerKey = AIProviderKey::getOptimalKey($provider);

        if (! $providerKey) {
            Log::info("Tidak ada key untuk provider: {$provider}, mencoba fallback.");

            $providerKey = AIProviderKey::where('is_active', true)
                ->where('provider', '!=', $provider)
                ->orderBy('priority', 'desc')
                ->orderBy('requests_count', 'asc')
                ->first();

            if ($providerKey) {
                $provider = $providerKey->provider;
                Log::info("Fallback ke provider: {$provider}");
            } else {
                throw new AIGenerationException(
                    'Tidak ada API key aktif yang tersedia.',
                    [
                        'provider' => $provider,
                        'suggestion' => 'Tambahkan API key di Settings → AI Provider Keys.',
                        'retry_suggested' => false,
                    ]
                );
            }
        }

        // FIX: Jika key mendekati token limit, rotate ke key lain daripada hanya pause
        if (($provider === 'gemini') && ($providerKey->tokens_used >= 3_900_000)) {
            Log::warning("Key '{$providerKey->name}' mendekati 4M tokens. Mencari key alternatif...");

            $alternativeKey = AIProviderKey::where('is_active', true)
                ->where('provider', $provider)
                ->where('id', '!=', $providerKey->id)
                ->where('tokens_used', '<', 3_900_000)
                ->orderBy('tokens_used', 'asc')
                ->first();

            if ($alternativeKey) {
                $providerKey = $alternativeKey;
                Log::info("Beralih ke key alternatif: {$providerKey->name}");
            } else {
                Log::warning('Tidak ada key alternatif. Melanjutkan dengan key yang sama (berisiko limit).');
            }
        }

        if ($providerKey->isRateLimited()) {
            throw new AIGenerationException(
                'API rate limit tercapai.',
                [
                    'provider' => $provider,
                    'key_name' => $providerKey->name,
                    'suggestion' => 'Coba beberapa menit lagi atau tambah API key.',
                    'retry_suggested' => true,
                ],
                429
            );
        }

        // FIX: Exponential backoff — tidak flat sleep 60s
        $maxRetries = 3;
        $retryCount = 0;

        do {
            try {
                $apiKey = $providerKey->api_key;
                $modelId = $providerKey->metadata['model'] ?? null;

                $result = match ($provider) {
                    'openrouter' => $this->callOpenRouter($apiKey, $prompt, $maxTokens, $modelId),
                    'gemini' => $this->callGemini($apiKey, $prompt, $maxTokens, $modelId, $useStructuredOutput, $jsonSchema),
                    'openai' => $this->callOpenAI($apiKey, $prompt, $maxTokens, $modelId),
                    'anthropic' => $this->callAnthropic($apiKey, $prompt, $maxTokens, $modelId),
                    default => throw new \InvalidArgumentException("Provider tidak didukung: {$provider}"),
                };

                $providerKey->incrementUsage(
                    tokens: $result['tokens'] ?? 0,
                    cost: $result['cost'] ?? 0,
                );

                return $result;

            } catch (AIGenerationException $e) {
                if ($e->getCode() === 429 && $retryCount < $maxRetries) {
                    $retryCount++;
                    // FIX: Exponential backoff: 4s → 8s → 16s
                    $delay = (int) (4 * (2 ** ($retryCount - 1)));
                    Log::warning("Rate limit 429. Retry ke-{$retryCount} dalam {$delay}s...");
                    sleep($delay);

                    continue;
                }
                throw $e;
            } catch (\Exception $e) {
                Log::error('AI generation gagal', [
                    'provider' => $provider,
                    'key_id' => $providerKey->id ?? null,
                    'error' => $e->getMessage(),
                ]);

                throw new AIGenerationException(
                    'AI generation gagal.',
                    [
                        'provider' => $provider,
                        'original_error' => $e->getMessage(),
                        'suggestion' => 'Ini mungkin masalah sementara. Silakan coba lagi.',
                        'retry_suggested' => true,
                    ]
                );
            }
        } while ($retryCount <= $maxRetries);

        // Seharusnya tidak pernah tercapai, tapi PHP membutuhkan return eksplisit
        throw new AIGenerationException('Semua retry habis.', ['provider' => $provider], 503);
    }

    // =========================================================================
    // PRIVATE: CONTINUATION LOOP (DRY — satu implementasi untuk semua caller)
    // =========================================================================

    /**
     * Panggil AI dan lanjutkan secara otomatis jika output terpotong.
     *
     * FIX: Method ini menggantikan 3 blok duplikat di kode lama.
     *
     * @param  callable  $completionCheck  fn(string $content): bool
     */
    private function callWithContinuation(
        string $provider,
        string $initialPrompt,
        int $maxTokens,
        callable $completionCheck,
        string $continueContext = '',
        int $maxContinuations = 2,
    ): string {
        $response = $this->callAI($provider, $initialPrompt, $maxTokens);
        $content = $response['content'];

        Log::info('[AIArticleService] Initial AI response diterima', ['context' => $continueContext]);

        $continuations = 0;

        while (! $completionCheck($content) && $continuations < $maxContinuations) {
            $continuations++;
            Log::info("[AIArticleService] Output belum lengkap, continuation ke-{$continuations}", [
                'context' => $continueContext,
            ]);

            // FIX: Sertakan outline/context asli agar model tidak kehilangan arah,
            // plus 1500 char terakhir konten yang sudah ada.
            $tail = mb_substr($content, -1500);
            $continuePrompt = <<<PROMPT
Kamu sedang menulis: {$continueContext}

Lanjutkan teks di bawah ini tepat pada kata terakhir yang terpotong.
JANGAN ulang dari awal. JANGAN buat intro baru. Langsung sambung kalimatnya.

...{$tail}
PROMPT;

            $continueResponse = $this->callAI($provider, $continuePrompt, maxTokens: 3000);

            // Bersihkan intro basa-basi dari model sebelum disambung
            $continuation = preg_replace(
                '/^(Tentu|Baik|Berikut|Ini|Lanjutan|Oke|Siap)[^:]*?:\s*/i',
                '',
                trim($continueResponse['content'])
            );
            // Bersihkan markdown code block jika model menambahkannya
            $continuation = preg_replace('/^```(?:json)?\s*/i', '', ltrim($continuation));
            $continuation = preg_replace('/```$/i', '', rtrim($continuation));

            $content .= "\n".trim($continuation);
        }

        return $content;
    }

    // =========================================================================
    // PRIVATE: PROVIDER-SPECIFIC CALLERS
    // =========================================================================

    /**
     * Call OpenRouter API
     * FIX: Sertakan system prompt di messages array
     */
    private function callOpenRouter(string $apiKey, string $prompt, int $maxTokens, ?string $modelId = null): array
    {
        $model = $modelId ?: config('article.ai.providers.openrouter.default_model', 'anthropic/claude-3.5-sonnet');

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])->post('https://openrouter.ai/api/v1/chat/completions', [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
                ['role' => 'user',   'content' => $prompt],
            ],
            'max_tokens' => $maxTokens,
        ]);

        if (! $response->successful()) {
            $errorBody = $response->json();
            $errorMessage = $errorBody['error']['message'] ?? 'Unknown API error';

            Log::error('OpenRouter API error', ['status' => $response->status(), 'body' => $response->body()]);

            throw new AIGenerationException(
                "OpenRouter API error: {$errorMessage}",
                [
                    'provider' => 'openrouter',
                    'status_code' => $response->status(),
                    'original_error' => $errorMessage,
                    'suggestion' => $response->status() === 401
                        ? 'API key mungkin tidak valid. Periksa konfigurasi key Anda.'
                        : 'Kemungkinan masalah sementara di OpenRouter.',
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
            'cost' => 0,
        ];
    }

    /**
     * Call Gemini API
     * FIX: Dukungan system instruction + structured output (response_schema)
     */
    private function callGemini(
        string $apiKey,
        string $prompt,
        int $maxTokens,
        ?string $modelId = null,
        bool $useStructuredOutput = false,
        array $jsonSchema = []
    ): array {
        $model = $modelId ?: config('article.ai.providers.gemini.default_model', 'gemini-2.5-flash-lite');

        $payload = [
            // FIX: systemInstruction adalah cara resmi Gemini untuk system prompt
            'system_instruction' => [
                'parts' => [['text' => self::SYSTEM_PROMPT]],
            ],
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
            'generationConfig' => [
                'maxOutputTokens' => $maxTokens,
            ],
        ];

        // FIX: Structured output — paksa Gemini mengembalikan JSON sesuai schema
        if ($useStructuredOutput && ! empty($jsonSchema)) {
            $payload['generationConfig']['responseMimeType'] = 'application/json';
            $payload['generationConfig']['responseSchema'] = $jsonSchema;
        }

        $response = Http::post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
            $payload
        );

        if (! $response->successful()) {
            $errorBody = $response->json();
            $errorMessage = $errorBody['error']['message'] ?? 'Unknown API error';

            Log::error('Gemini API error', ['status' => $response->status(), 'body' => $response->body()]);

            throw new AIGenerationException(
                "Gemini API error: {$errorMessage}",
                [
                    'provider' => 'gemini',
                    'status_code' => $response->status(),
                    'original_error' => $errorMessage,
                    'suggestion' => in_array($response->status(), [401, 403])
                        ? 'API key mungkin tidak valid.'
                        : 'Kemungkinan masalah sementara di Gemini.',
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
            'cost' => 0,
        ];
    }

    /**
     * Call OpenAI API
     * FIX: Sertakan system prompt
     */
    private function callOpenAI(string $apiKey, string $prompt, int $maxTokens, ?string $modelId = null): array
    {
        $model = $modelId ?: config('article.ai.providers.openai.default_model', 'gpt-4o-mini');

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
                ['role' => 'user',   'content' => $prompt],
            ],
            'max_tokens' => $maxTokens,
        ]);

        if (! $response->successful()) {
            $errorBody = $response->json();
            $errorMessage = $errorBody['error']['message'] ?? 'Unknown API error';

            throw new AIGenerationException("OpenAI API error: {$errorMessage}", [
                'provider' => 'openai',
                'status_code' => $response->status(),
                'original_error' => $errorMessage,
                'suggestion' => 'Periksa API key atau limit OpenAI Anda.',
                'retry_suggested' => $response->status() >= 500,
            ], $response->status());
        }

        $data = $response->json();

        return [
            'content' => $data['choices'][0]['message']['content'] ?? '',
            'model' => $model,
            'tokens' => $data['usage']['total_tokens'] ?? 0,
            'cost' => 0,
        ];
    }

    /**
     * Call Anthropic API
     * FIX: Sertakan system prompt sebagai top-level 'system' parameter
     */
    private function callAnthropic(string $apiKey, string $prompt, int $maxTokens, ?string $modelId = null): array
    {
        $model = $modelId ?: config('article.ai.providers.anthropic.default_model', 'claude-3-5-sonnet-latest');

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
            'Content-Type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => $model,
            // FIX: 'system' adalah top-level param di Anthropic API — bukan di dalam messages
            'system' => self::SYSTEM_PROMPT,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'max_tokens' => $maxTokens,
        ]);

        if (! $response->successful()) {
            $errorBody = $response->json();
            $errorMessage = $errorBody['error']['message'] ?? 'Unknown API error';

            throw new AIGenerationException("Anthropic API error: {$errorMessage}", [
                'provider' => 'anthropic',
                'status_code' => $response->status(),
                'original_error' => $errorMessage,
                'suggestion' => 'Periksa API key atau limit Anthropic Anda.',
                'retry_suggested' => $response->status() >= 500,
            ], $response->status());
        }

        $data = $response->json();

        return [
            'content' => current(
                array_filter($data['content'] ?? [], fn ($c) => $c['type'] === 'text')
            )['text'] ?? '',
            'model' => $model,
            'tokens' => ($data['usage']['input_tokens'] ?? 0) + ($data['usage']['output_tokens'] ?? 0),
            'cost' => 0,
        ];
    }

    // =========================================================================
    // PRIVATE: COMPLETION CHECKS
    // =========================================================================

    /**
     * Apakah artikel sudah selesai?
     *
     * FIX dari kode lama:
     *   - Cek panjang kata minimum (lebih reliable dari cek string keyword)
     *   - Cek kalimat terakhir selesai dengan tanda baca
     *   - Keyword check sebagai sinyal tambahan, bukan satu-satunya penentu
     */
    private function isArticleComplete(string $content, string $articleType): bool
    {
        $plainText = strip_tags($content);
        $wordCount = str_word_count($plainText);
        $minWords = self::MIN_WORD_COUNT[$articleType] ?? 500;

        // Syarat 1: Panjang minimum terpenuhi
        if ($wordCount < $minWords) {
            return false;
        }

        // Syarat 2: Kalimat terakhir diakhiri dengan tanda baca yang valid
        $lastChar = mb_substr(trim($plainText), -1);
        $validEnds = ['.', '!', '?', '>'];
        if (! in_array($lastChar, $validEnds, true)) {
            return false;
        }

        // Syarat 3 (soft): Cek keberadaan elemen struktural yang diharapkan
        $contentLower = mb_strtolower($content);

        if (in_array($articleType, ['travel_guide', 'seo_article'])) {
            // FAQ bisa ditulis berbagai cara — cek beberapa sinonim
            $hasFaq = str_contains($contentLower, 'faq')
                || str_contains($contentLower, 'pertanyaan umum')
                || str_contains($contentLower, 'pertanyaan yang sering')
                || str_contains($contentLower, 'tanya jawab');
            if (! $hasFaq) {
                return false;
            }
        }

        if (in_array($articleType, ['property_article', 'event_article'])) {
            $hasCta = str_contains($contentLower, 'homsjogja.com/properties')
                || str_contains($contentLower, 'booking')
                || str_contains($contentLower, 'pesan sekarang')
                || str_contains($contentLower, 'cek ketersediaan');
            if (! $hasCta) {
                return false;
            }
        }

        return true;
    }

    /**
     * Apakah JSON outline sudah valid dan lengkap?
     */
    private function isOutlineComplete(string $content): bool
    {
        $clean = trim((string) preg_replace('/```json\s*|\s*```/i', '', $content));
        $parsed = json_decode($clean, true);

        return json_last_error() === JSON_ERROR_NONE && is_array($parsed);
    }

    // =========================================================================
    // PRIVATE: HELPERS
    // =========================================================================

    /**
     * Parse JSON dari respons AI — dengan fallback ke regex extraction.
     */
    private function parseJsonResponse(string $content): ?array
    {
        // Coba parse langsung (untuk structured output yang sudah bersih)
        $data = json_decode($content, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
            return $data;
        }

        // Fallback: ekstrak JSON dari dalam teks
        if (preg_match('/\{.*\}/s', $content, $matches)) {
            $data = json_decode($matches[0], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
                return $data;
            }
        }

        return null;
    }

    /**
     * Generate excerpt dari konten artikel.
     * FIX: Handle kasus $firstPara kosong (false dari reset())
     */
    private function generateExcerpt(string $content): string
    {
        $text = strip_tags(preg_replace('/[#*_\[\]()]/', '', $content));
        $paragraphs = array_filter(array_map('trim', explode("\n\n", $text)));
        $firstPara = reset($paragraphs);

        // FIX: Jika tidak ada paragraf (konten hanya heading), kembalikan string kosong yang aman
        if (empty($firstPara)) {
            return '';
        }

        $sentences = preg_split('/(?<=[.!?])\s+/', $firstPara, 4);
        $excerpt = implode(' ', array_slice($sentences, 0, 3));

        if (mb_strlen($excerpt) > 200) {
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
     * Generate meta description yang dioptimalkan untuk SEO.
     * FIX: Handle kasus $firstPara kosong
     */
    private function generateMetaDescription(string $content, array $keywords): string
    {
        $text = strip_tags(preg_replace('/[#*_\[\]()]/', '', $content));
        $paragraphs = array_filter(array_map('trim', explode("\n\n", $text)));
        $firstPara = reset($paragraphs);

        // FIX: Fallback aman
        if (empty($firstPara)) {
            return ucfirst($keywords[0] ?? '').' - HomsJogja';
        }

        $mainKeyword = $keywords[0] ?? '';

        if ($mainKeyword && mb_stripos($firstPara, $mainKeyword) === false) {
            $sentences = preg_split('/(?<=[.!?])\s+/', $firstPara, 3);
            $description = ucfirst($mainKeyword).': '.($sentences[0] ?? '');
            if (mb_strlen($description) < 100 && isset($sentences[1])) {
                $description .= ' '.$sentences[1];
            }
        } else {
            $description = $firstPara;
        }

        if (mb_strlen($description) > 160) {
            $description = mb_substr($description, 0, 157);
            $lastSpace = mb_strrpos($description, ' ');
            if ($lastSpace !== false && $lastSpace > 100) {
                $description = mb_substr($description, 0, $lastSpace);
            }
            $description = rtrim($description, '.,!?:;').'...';
        }

        return trim($description);
    }

    /**
     * Parse list dari respons AI (judul, poin-poin, dll.)
     */
    private function parseList(string $content): array
    {
        $lines = explode("\n", $content);
        $items = [];

        foreach ($lines as $line) {
            $line = trim($line);
            $line = preg_replace('/^[\d.\-*•]\s*/', '', $line);
            if (! empty($line)) {
                $items[] = $line;
            }
        }

        return array_values(array_filter($items));
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

        if ($wordCount === 0 || $sentenceCount === 0) {
            return 0.0;
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
