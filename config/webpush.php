<?php

return [
    /*
    |--------------------------------------------------------------------------
    | VAPID Keys for Web Push Notifications
    |--------------------------------------------------------------------------
    |
    | Generate a new key pair with:
    |   php artisan tinker --execute 'use Minishlink\WebPush\VAPID;
    |       $k = VAPID::createVapidKeys();
    |       echo "PUBLIC: ".$k["publicKey"]."\n";
    |       echo "PRIVATE: ".$k["privateKey"]."\n";'
    |
    | Then add to your .env file:
    |   VAPID_PUBLIC_KEY=...
    |   VAPID_PRIVATE_KEY=...
    |
    */
    'vapid' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
    ],
];
