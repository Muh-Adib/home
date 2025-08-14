#!/usr/bin/env node

/**
 * Test Script untuk Soketi Connection
 * 
 * Script ini digunakan untuk test koneksi ke Soketi server
 * dan memverifikasi bahwa broadcasting berfungsi dengan baik.
 */

import Pusher from "pusher-js/node.js";

// Aktifkan log bawaan Pusher
Pusher.logToConsole = true;

// Konfigurasi client Pusher
const config = {
    appId: 'pkwmz5o7qjn3r8i0dtbs2cyu',
    key: 'i6rzh5fb4kq0d1m8vlj79xey',
    secret: 'ao93uedsctr12w8q6n54ixbl',
    host: 'ws.homsjogja.com',
    port: 80,
    scheme: 'http',
    cluster: 'mt1'
};

console.log('🔌 Testing Soketi Connection...');
console.log('Configuration:', config);

// Buat koneksi Pusher ke Soketi
const pusher = new Pusher(config.key, {
    wsHost: config.host,
    wsPort: config.port,
    wssPort: config.port,
    forceTLS: false,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    cluster: config.cluster
});

// Event ketika koneksi berhasil
pusher.connection.bind('connected', () => {
    console.log('✅ Connected to Soketi server');

    // Subscribe ke channel publik
    const channel = pusher.subscribe('test-channel');

    channel.bind('pusher:subscription_succeeded', () => {
        console.log('✅ Subscribed to test-channel');
    });

    channel.bind('pusher:subscription_error', (error) => {
        console.error('❌ Subscription error:', error);
    });

    // Menerima event dari server
    channel.bind('test-event', (data) => {
        console.log('📨 Received test event:', data);
    });

    setTimeout(() => {
        console.log('📤 Sending test event...');
        console.log('ℹ️  Event ini biasanya dikirim dari Laravel broadcasting.');
    }, 2000);
});

// Event koneksi terputus
pusher.connection.bind('disconnected', () => {
    console.log('❌ Disconnected from Soketi server');
});

// Event error koneksi
pusher.connection.bind('error', (error) => {
    console.error('❌ Connection error:', error);
});

// Test private channel
setTimeout(() => {
    console.log('🔐 Testing private channel subscription...');
    const privateChannel = pusher.subscribe('private-user.1');

    privateChannel.bind('pusher:subscription_succeeded', () => {
        console.log('✅ Subscribed to private-user.1');
    });

    privateChannel.bind('pusher:subscription_error', (error) => {
        console.log('❌ Private channel subscription error (expected if not authenticated):', error);
    });

    privateChannel.bind('booking.created', (data) => {
        console.log('📨 Received booking.created event:', data);
    });
}, 3000);

// Keep connection alive untuk testing
console.log('⏰ Keeping connection alive for 10 seconds...');
setTimeout(() => {
    console.log('🔌 Disconnecting...');
    pusher.disconnect();
    process.exit(0);
}, 10000);

// Handle proses termination manual (CTRL+C)
process.on('SIGINT', () => {
    console.log('\n🔌 Disconnecting...');
    pusher.disconnect();
    process.exit(0);
});

