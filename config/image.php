<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Image Processing Driver
    |--------------------------------------------------------------------------
    |
    | Preferred driver for image processing: 'imagick' or 'gd'
    | Imagick is recommended for better WebP support and image quality.
    |
    */
    'driver' => env('IMAGE_DRIVER', 'imagick'),

    /*
    |--------------------------------------------------------------------------
    | Auto Fallback
    |--------------------------------------------------------------------------
    |
    | Automatically fallback to GD driver if Imagick is not available.
    |
    */
    'auto_fallback' => env('IMAGE_AUTO_FALLBACK', true),

    /*
    |--------------------------------------------------------------------------
    | Quality Settings
    |--------------------------------------------------------------------------
    |
    | Default quality settings for different image formats.
    | Range: 0-100 (higher = better quality, larger file size)
    |
    */
    'quality' => [
        'webp' => (int) env('IMAGE_QUALITY_WEBP', 85),
        'jpeg' => (int) env('IMAGE_QUALITY_JPEG', 90),
        'png' => (int) env('IMAGE_QUALITY_PNG', 90),
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Max Dimensions
    |--------------------------------------------------------------------------
    |
    | Default maximum dimensions for uploaded images.
    | Images larger than this will be resized while preserving aspect ratio.
    |
    */
    'max_dimensions' => [
        'width' => (int) env('IMAGE_MAX_WIDTH', 1920),
        'height' => (int) env('IMAGE_MAX_HEIGHT', 1920),
    ],

    /*
    |--------------------------------------------------------------------------
    | Validation Rules
    |--------------------------------------------------------------------------
    |
    | Default validation rules for image uploads.
    |
    */
    'validation' => [
        'max_file_size' => 10 * 1024 * 1024, // 10MB
        'min_dimensions' => [
            'width' => 100,
            'height' => 100,
        ],
        'max_dimensions' => [
            'width' => 8192,
            'height' => 8192,
        ],
        'allowed_mime_types' => [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Thumbnail Settings
    |--------------------------------------------------------------------------
    |
    | Default settings for thumbnail generation.
    |
    */
    'thumbnail' => [
        'width' => 300,
        'height' => 200,
        'quality' => 80,
        'suffix' => '_thumb',
    ],
];
