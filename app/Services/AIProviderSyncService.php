<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIProviderSyncService
{
    /**
     * Sync models and rate limits for a given provider and API key
     *
     * @param string $provider
     * @param string $apiKey
     * @return array
     */
    public function sync(string $provider, string $apiKey): array
    {
        try {
            switch ($provider) {
                case 'gemini':
                    return $this->syncGemini($apiKey);
                case 'openrouter':
                    return $this->syncOpenRouter($apiKey);
                case 'openai':
                    return $this->syncOpenAI($apiKey);
                case 'anthropic':
                    return $this->syncAnthropic($apiKey);
                default:
                    throw new \Exception("Unsupported provider: {$provider}");
            }
        } catch (\Exception $e) {
            Log::error("API Sync failed for {$provider}", ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    private function syncGemini(string $apiKey): array
    {
        // Gemini API to list models
        $response = Http::get("https://generativelanguage.googleapis.com/v1beta/models?key={$apiKey}");

        if (!$response->successful()) {
            throw new \Exception('Failed to fetch Gemini models. Please check your API key. Error: ' . $response->body());
        }

        $data = $response->json();
        
        $models = [];
        if (isset($data['models'])) {
            // Filter models that support generateContent
            foreach ($data['models'] as $model) {
                if (isset($model['supportedGenerationMethods']) && in_array('generateContent', $model['supportedGenerationMethods'])) {
                    // removing 'models/' prefix
                    $id = str_replace('models/', '', $model['name']);
                    // skip tuned models for now unless requested
                    if (!str_starts_with($id, 'tunedModels/')) {
                        $models[] = [
                            'id' => $id,
                            'name' => $model['displayName'] ?? $id,
                        ];
                    }
                }
            }
        }

        return [
            'success' => true,
            'models' => $models,
        ];
    }

    private function syncOpenRouter(string $apiKey): array
    {
        // OpenRouter API to fetch models and rate limits
        // 1. Fetch available models (public endpoint, doesn't require auth but we can pass it)
        $modelsResponse = Http::get('https://openrouter.ai/api/v1/models');
        
        // 2. Fetch key rate limits
        $authResponse = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
        ])->get('https://openrouter.ai/api/v1/auth/key');

        if (!$authResponse->successful()) {
            throw new \Exception('Failed to authenticate with OpenRouter. Please check your API key.');
        }

        $authData = $authResponse->json();
        $rateLimit = $authData['data']['rate_limit'] ?? null;
        
        $models = [];
        if ($modelsResponse->successful()) {
            $modelsData = $modelsResponse->json();
            if (isset($modelsData['data'])) {
                foreach ($modelsData['data'] as $model) {
                    $models[] = [
                        'id' => $model['id'],
                        'name' => $model['name'] ?? $model['id'],
                    ];
                }
            }
        }

        return [
            'success' => true,
            'models' => $models,
            'credits' => $authData['data']['usage'] ?? 0,
            'limit' => $authData['data']['limit'] ?? null,
            'rate_limit' => [
                'requests_per_minute' => $rateLimit['requests'] ?? null,
                'interval' => $rateLimit['interval'] ?? null, // e.g. "10s",
            ]
        ];
    }

    private function syncOpenAI(string $apiKey): array
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
        ])->get('https://api.openai.com/v1/models');

        if (!$response->successful()) {
            throw new \Exception('Failed to fetch OpenAI models. Please check your API key.');
        }

        $data = $response->json();
        
        $models = [];
        if (isset($data['data'])) {
            foreach ($data['data'] as $model) {
                // Return only gpt/o1/o3 models to eliminate whisper/tts etc for now unless we need them
                if (str_starts_with($model['id'], 'gpt-') || str_starts_with($model['id'], 'o1-') || str_starts_with($model['id'], 'o3-')) {
                    $models[] = [
                        'id' => $model['id'],
                        'name' => $model['id'],
                    ];
                }
            }
            // Sort models by id
            usort($models, function($a, $b) {
                return strcmp($a['id'], $b['id']);
            });
        }

        return [
            'success' => true,
            'models' => $models,
        ];
    }

    private function syncAnthropic(string $apiKey): array
    {
        // Anthropic has models endpoint but we'll use a hardcoded list or endpoint if available
        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
        ])->get('https://api.anthropic.com/v1/models');

        $models = [];
        if ($response->successful()) {
            $data = $response->json();
            if (isset($data['data'])) {
                foreach ($data['data'] as $model) {
                    if ($model['type'] === 'model') {
                        $models[] = [
                            'id' => $model['id'],
                            'name' => $model['display_name'] ?? $model['id'],
                        ];
                    }
                }
            }
        } else {
            // Fallback for Anthropic if models endpoint not available or failing (due to cors/beta)
            $models = [
                ['id' => 'claude-3-7-sonnet-latest', 'name' => 'Claude 3.7 Sonnet'],
                ['id' => 'claude-3-5-sonnet-latest', 'name' => 'Claude 3.5 Sonnet'],
                ['id' => 'claude-3-5-haiku-latest', 'name' => 'Claude 3.5 Haiku'],
                ['id' => 'claude-3-opus-latest', 'name' => 'Claude 3 Opus'],
                ['id' => 'claude-3-haiku-20240307', 'name' => 'Claude 3 Haiku'],
            ];
        }

        return [
            'success' => true,
            'models' => $models,
        ];
    }
}
