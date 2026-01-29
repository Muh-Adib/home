<?php

return [
    /*
    |--------------------------------------------------------------------------
    | AI Provider Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for AI providers used in article generation.
    | Keys are managed via AIProviderKey model with auto-rotation.
    |
    */

    'ai' => [
        'providers' => [
            'openrouter' => [
                'api_url' => 'https://openrouter.ai/api/v1',
                'default_model' => env('OPENROUTER_DEFAULT_MODEL', 'anthropic/claude-3.5-sonnet'),
                'models' => [
                    'anthropic/claude-3.5-sonnet',
                    'anthropic/claude-3-haiku',
                    'openai/gpt-4-turbo',
                    'openai/gpt-3.5-turbo',
                    'google/gemini-pro',
                    'meta-llama/llama-3-70b-instruct',
                ],
            ],
            'gemini' => [
                'api_url' => 'https://generativelanguage.googleapis.com/v1beta',
                'default_model' => env('GEMINI_DEFAULT_MODEL', 'gemini-2.5-flash-lite'),
                'models' => [
                    'gemini-2.5-flash-lite',
                    'gemini-2.5-flash',
                    'gemini-3-flash',
                ],
            ],
        ],
        'default_provider' => env('ARTICLE_DEFAULT_AI_PROVIDER', 'openrouter'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Web Search Configuration
    |--------------------------------------------------------------------------
    |
    | Free search provider: DuckDuckGo Instant Answer API
    | No API key required, unlimited usage
    |
    */

    'search' => [
        'provider' => env('SEARCH_PROVIDER', 'duckduckgo'),
        'duckduckgo' => [
            'api_url' => 'https://api.duckduckgo.com',
            'enabled' => true,
        ],
        // Alternative free/paid options (if needed in future)
        'serper' => [
            'api_key' => env('SERPER_API_KEY'),
            'api_url' => 'https://google.serper.dev/search',
            'enabled' => false,
        ],
        'brave' => [
            'api_key' => env('BRAVE_SEARCH_API_KEY'),
            'api_url' => 'https://api.search.brave.com/res/v1/web/search',
            'enabled' => false,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | SEO Configuration
    |--------------------------------------------------------------------------
    */

    'seo' => [
        'min_score' => env('ARTICLE_MIN_SEO_SCORE', 70),
        'min_words' => 500,
        'max_title_length' => 60,
        'max_description_length' => 160,
        'optimal_keyword_density' => [
            'min' => 1.0, // 1%
            'max' => 3.0, // 3%
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Content Features
    |--------------------------------------------------------------------------
    */

    'features' => [
        'auto_detect_properties' => env('ARTICLE_AUTO_DETECT_PROPERTIES', true),
        'auto_save_interval' => 30, // seconds
        'enable_scheduling' => true,
        'enable_ai_suggestions' => true,
        'enable_web_search' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Image Configuration
    |--------------------------------------------------------------------------
    */

    'images' => [
        'max_upload_size' => 10 * 1024 * 1024, // 10MB
        'webp_quality' => 88,
        'max_width' => 1920,
        'max_height' => 1080,
        'thumbnail_width' => 400,
        'thumbnail_height' => 300,
        'allowed_formats' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Language Configuration
    |--------------------------------------------------------------------------
    */

    'languages' => [
        'default' => env('ARTICLE_DEFAULT_LANGUAGE', 'id'),
        'supported' => ['id', 'en'],
        'names' => [
            'id' => 'Bahasa Indonesia',
            'en' => 'English',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Publishing Configuration
    |--------------------------------------------------------------------------
    */

    'publishing' => [
        'statuses' => ['draft', 'scheduled', 'published', 'archived'],
        'default_status' => 'draft',
        'auto_publish_scheduled' => true, // via scheduled command
    ],
];
