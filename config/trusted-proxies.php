<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Trusted Proxies
    |--------------------------------------------------------------------------
    |
    | Laravel dapat mendeteksi proxy yang dapat dipercaya untuk menangani
    | header X-Forwarded-For, X-Forwarded-Host, dan X-Forwarded-Proto.
    | Konfigurasi ini penting untuk Dokploy dengan Traefik + Nginx internal.
    |
    */

    'proxies' => [
        // Dokploy Traefik dan internal Nginx
        '10.0.0.0/8',     // Docker internal network
        '172.16.0.0/12',  // Docker bridge network
        '192.168.0.0/16', // Docker host network
        '127.0.0.1',      // Localhost
        '::1',            // IPv6 localhost
    ],

    /*
    |--------------------------------------------------------------------------
    | Trusted Headers
    |--------------------------------------------------------------------------
    |
    | Header yang dapat dipercaya dari proxy. Untuk Dokploy:
    | - Traefik mengirim header X-Forwarded-*
    | - Nginx internal meneruskan header tersebut
    | - Laravel harus mempercayai header ini
    |
    */

    'headers' => [
        Illuminate\Http\Request::HEADER_FORWARDED => 'FORWARDED',
        Illuminate\Http\Request::HEADER_X_FORWARDED_FOR => 'X_FORWARDED_FOR',
        Illuminate\Http\Request::HEADER_X_FORWARDED_HOST => 'X_FORWARDED_HOST',
        Illuminate\Http\Request::HEADER_X_FORWARDED_PORT => 'X_FORWARDED_PORT',
        Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO => 'X_FORWARDED_PROTO',
        Illuminate\Http\Request::HEADER_X_FORWARDED_AWS_ELB => 'X_FORWARDED_AWS_ELB',
    ],
];
