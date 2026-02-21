<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Services\AIArticleService;
use App\Exceptions\AIGenerationException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * ArticleAIController - AI-powered article generation endpoints
 */
class ArticleAIController extends Controller
{
    public function __construct(
        private AIArticleService $aiService
    ) {
    }

    /**
     * Generate title suggestions
     */
    public function generateTitle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'keywords' => 'required|array|min:1',
            'provider' => 'nullable|string|in:openrouter,gemini',
            'count' => 'nullable|integer|min:1|max:10',
        ]);

        try {
            $result = $this->aiService->generateTitle(
                $validated['keywords'],
                $validated['provider'] ?? config('article.ai.default_provider'),
                $validated['count'] ?? 5
            );

            return response()->json($result);

        } catch (AIGenerationException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'details' => $e->getDetails(),
                'retry_suggested' => $e->shouldRetry(),
            ], $e->getCode() ?: 500);
        } catch (\Exception $e) {
            Log::error('Unexpected error in title generation', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'An unexpected error occurred',
                'details' => config('app.debug') ? [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ] : [],
                'retry_suggested' => false,
            ], 500);
        }
    }

    /**
     * Generate article outline
     */
    public function generateOutline(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'keywords' => 'required|array',
            'provider' => 'nullable|string|in:openrouter,gemini',
        ]);

        try {
            $result = $this->aiService->generateOutline(
                $validated['title'],
                $validated['keywords'],
                $validated['provider'] ?? config('article.ai.default_provider')
            );

            return response()->json($result);

        } catch (AIGenerationException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'details' => $e->getDetails(),
                'retry_suggested' => $e->shouldRetry(),
            ], $e->getCode() ?: 500);
        } catch (\Exception $e) {
            Log::error('Unexpected error in outline generation', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'An unexpected error occurred',
                'retry_suggested' => false,
            ], 500);
        }
    }

    /**
     * Generate full article content
     */
    public function generateContent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'outline' => 'required|string',
            'keywords' => 'required|array',
            'property_ids' => 'nullable|array',
            'property_ids.*' => 'exists:properties,id',
            'provider' => 'nullable|string|in:openrouter,gemini',
            'language' => 'nullable|string|in:id,en',
            'tone' => 'nullable|string|in:professional,casual',
            'intent' => 'nullable|string',
        ]);

        try {
            $properties = [];
            if (!empty($validated['property_ids'])) {
                $properties = \App\Models\Property::whereIn('id', $validated['property_ids'])
                    ->get(['id', 'name', 'slug', 'description']) // include description for USP generation
                    ->toArray();
            }

            $result = $this->aiService->generateContent(
                $validated['outline'],
                $validated['keywords'],
                $properties,
                $validated['provider'] ?? config('article.ai.default_provider'),
                $validated['language'] ?? 'id',
                $validated['tone'] ?? 'professional',
                $validated['intent'] ?? null
            );

            return response()->json($result);

        } catch (AIGenerationException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'details' => $e->getDetails(),
                'retry_suggested' => $e->shouldRetry(),
            ], $e->getCode() ?: 500);
        } catch (\Exception $e) {
            Log::error('Unexpected error in content generation', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'An unexpected error occurred',
                'retry_suggested' => false,
            ], 500);
        }
    }

    /**
     * Improve existing content
     */
    public function improveContent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|string',
            'suggestions' => 'required|array',
            'provider' => 'nullable|string|in:openrouter,gemini',
        ]);

        try {
            $result = $this->aiService->improveContent(
                $validated['content'],
                $validated['suggestions'],
                $validated['provider'] ?? config('article.ai.default_provider')
            );

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Research topic using web search
     */
    public function researchTopic(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'topic' => 'required|string|max:500',
        ]);

        try {
            $result = $this->aiService->researchTopic($validated['topic']);

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Analyze SEO quality
     */
    public function analyzeSEO(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|string',
            'target_keywords' => 'required|array',
        ]);

        try {
            $result = $this->aiService->analyzeSEO(
                $validated['content'],
                $validated['target_keywords']
            );

            return response()->json([
                'success' => true,
                'analysis' => $result,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Suggest internal links to properties
     */
    public function suggestLinks(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        try {
            $suggestions = $this->aiService->suggestInternalLinks($validated['content']);

            return response()->json([
                'success' => true,
                'suggestions' => $suggestions,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
