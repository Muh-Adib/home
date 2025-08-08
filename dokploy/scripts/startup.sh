#!/bin/bash

# 🚀 STARTUP SCRIPT
# Property Management System - Laravel 12 + React + WebSocket

set -e

echo "🚀 Starting Property Management System..."

# Load environment variables
echo "🌍 Loading environment variables..."
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded from .env"
else
    echo "⚠️ .env file not found, using system environment variables"
fi

# Create necessary directories
mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache
mkdir -p /var/log/supervisor /etc/supervisor/conf.d

# Set proper permissions
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Copy configuration files (if not already copied during build)
if [ ! -f "/etc/nginx/nginx.conf" ] && [ -f "/app/dokploy/config/nginx.conf" ]; then
    cp /app/dokploy/config/nginx.conf /etc/nginx/nginx.conf
    echo "✅ Nginx configuration copied"
fi

if [ ! -f "/etc/supervisor/conf.d/supervisord.conf" ] && [ -f "/app/dokploy/config/supervisord.conf" ]; then
    cp /app/dokploy/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
    echo "✅ Supervisor configuration copied"
fi

if [ ! -f "/app/laravel-echo-server.json" ] && [ -f "/app/dokploy/config/laravel-echo-server.dokploy.json" ]; then
    cp /app/dokploy/config/laravel-echo-server.dokploy.json /app/laravel-echo-server.json
    echo "✅ Laravel Echo Server configuration copied"
fi

# Run Laravel commands with environment variables
echo "🔧 Running Laravel setup commands..."
php artisan key:generate --force || echo "Key generation skipped"
php artisan storage:link || echo "Storage link skipped"
php artisan config:cache || echo "Config cache failed"
php artisan route:cache || echo "Route cache failed"
php artisan view:cache || echo "View cache failed"

# Test external connections with environment variables
echo "🔍 Testing external connections..."
if php artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "⚠️ Database connection failed"
fi

if php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
    echo "✅ Redis connection successful"
else
    echo "⚠️ Redis connection failed"
fi

echo "🎉 Startup completed successfully!"
echo "Starting Supervisor..."

# Start Supervisor with environment variables
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
