<?php

// Health Check Endpoint
// Property Management System - Laravel 12 + React + WebSocket

header('Content-Type: application/json');

$health = [
    'status' => 'ok',
    'timestamp' => date('Y-m-d H:i:s'),
    'service' => 'Property Management System',
    'version' => '1.0.0',
    'checks' => []
];

// Check if Laravel is working
if (file_exists('../artisan')) {
    $health['checks']['laravel'] = 'ok';
} else {
    $health['checks']['laravel'] = 'error';
    $health['status'] = 'error';
}

// Check if storage is writable
if (is_writable('../storage')) {
    $health['checks']['storage'] = 'ok';
} else {
    $health['checks']['storage'] = 'error';
    $health['status'] = 'error';
}

// Check if bootstrap/cache is writable
if (is_writable('../bootstrap/cache')) {
    $health['checks']['bootstrap_cache'] = 'ok';
} else {
    $health['checks']['bootstrap_cache'] = 'error';
    $health['status'] = 'error';
}

// Check if vendor exists
if (file_exists('../vendor/autoload.php')) {
    $health['checks']['vendor'] = 'ok';
} else {
    $health['checks']['vendor'] = 'error';
    $health['status'] = 'error';
}

// Check if public/index.php exists
if (file_exists('index.php')) {
    $health['checks']['index_php'] = 'ok';
} else {
    $health['checks']['index_php'] = 'error';
    $health['status'] = 'error';
}

// Add environment info
$health['environment'] = [
    'php_version' => PHP_VERSION,
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown'
];

echo json_encode($health, JSON_PRETTY_PRINT);
