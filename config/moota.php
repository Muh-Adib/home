<?php

return [
    'client_id' => env('MOOTA_CLIENT_ID'),
    'client_secret' => env('MOOTA_CLIENT_SECRET'),
    'webhook_secret' => env('MOOTA_WEBHOOK_SECRET'),
    'expiry_hours' => env('MOOTA_EXPIRY_HOURS', 24),
];
