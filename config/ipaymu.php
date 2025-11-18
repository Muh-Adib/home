<?php

return [
    /*
    |--------------------------------------------------------------------------
    | iPaymu Payment Gateway Configuration
    |--------------------------------------------------------------------------
    |
    | Konfigurasi untuk integrasi iPaymu payment gateway.
    | Mendukung sandbox dan production mode.
    |
    */

    'mode' => env('IPAYMU_MODE', 'sandbox'), // sandbox atau production

    'api_key' => env('IPAYMU_API_KEY'),
    'secret_key' => env('IPAYMU_SECRET_KEY'),

    'sandbox' => [
        'api_url' => 'https://sandbox.ipaymu.com/api/v2',
        'payment_url' => 'https://sandbox.ipaymu.com/api/v2/payment',
        'redirect_url' => 'https://sandbox.ipaymu.com/payment',
    ],

    'production' => [
        'api_url' => 'https://my.ipaymu.com/api/v2',
        'payment_url' => 'https://my.ipaymu.com/api/v2/payment',
        'redirect_url' => 'https://my.ipaymu.com/payment',
    ],

    /*
    |--------------------------------------------------------------------------
    | Callback URLs
    |--------------------------------------------------------------------------
    |
    | URL untuk callback dan redirect setelah pembayaran.
    | Akan menggunakan APP_URL jika tidak di-set.
    |
    */

    'callback_url' => env('IPAYMU_CALLBACK_URL', env('APP_URL') . '/payment-gateway/callback'),
    'return_url' => env('IPAYMU_RETURN_URL', env('APP_URL') . '/payment-gateway/callback'),
    'notify_url' => env('IPAYMU_NOTIFY_URL', env('APP_URL') . '/payment-gateway/webhook'),

    /*
    |--------------------------------------------------------------------------
    | Payment Settings
    |--------------------------------------------------------------------------
    |
    | Konfigurasi default untuk payment.
    |
    */

    'expiry_hours' => env('IPAYMU_EXPIRY_HOURS', 24), // Payment link expiry dalam jam

    'payment_methods' => [
        'bank_transfer' => true,
        'e_wallet' => true,
        'qris' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Webhook Settings
    |--------------------------------------------------------------------------
    |
    | Konfigurasi untuk webhook verification.
    |
    */

    'webhook' => [
        'verify_signature' => env('IPAYMU_VERIFY_WEBHOOK', true),
        'allowed_ips' => [
            // iPaymu production IPs (akan di-update setelah konfirmasi dari iPaymu)
            '103.127.132.0/24',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging
    |--------------------------------------------------------------------------
    |
    | Enable logging untuk debugging.
    |
    */

    'log_requests' => env('IPAYMU_LOG_REQUESTS', true),
    'log_channel' => env('IPAYMU_LOG_CHANNEL', 'daily'),
];








