#!/bin/bash

# Simple Nixpacks Startup Script untuk Laravel Application
# Property Management System - Laravel 12 + React 18 + WebSocket

set -e

echo "=== Laravel Nixpacks Production Startup ==="
echo "Property Management System - Laravel 12 + React 18 + WebSocket"
echo "=================================================="

# Setup environment variables
echo "[INFO] Setting up environment..."
export APP_ENV=${APP_ENV:-production}
export APP_DEBUG=${APP_DEBUG:-false}
export APP_URL=${APP_URL:-http://localhost:8080}
export DB_CONNECTION=${DB_CONNECTION:-mysql}
export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-3306}
export DB_DATABASE=${DB_DATABASE:-laravel}
export DB_USERNAME=${DB_USERNAME:-root}
export DB_PASSWORD=${DB_PASSWORD:-}
export REDIS_HOST=${REDIS_HOST:-localhost}
export REDIS_PORT=${REDIS_PORT:-6379}
export REDIS_PASSWORD=${REDIS_PASSWORD:-}
export BROADCAST_DRIVER=${BROADCAST_DRIVER:-redis}
export CACHE_DRIVER=${CACHE_DRIVER:-redis}
export QUEUE_CONNECTION=${QUEUE_CONNECTION:-redis}
export SESSION_DRIVER=${SESSION_DRIVER:-redis}
echo "[SUCCESS] Environment setup completed"

# Wait for external services
echo "[INFO] Waiting for external services..."
if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ]; then
    echo "[INFO] Waiting for database at $DB_HOST:$DB_PORT..."
    while ! nc -z "$DB_HOST" "$DB_PORT"; do
        echo "[WARNING] Database not ready, waiting..."
        sleep 2
    done
    echo "[SUCCESS] Database is ready!"
fi

if [ -n "$REDIS_HOST" ] && [ "$REDIS_HOST" != "localhost" ]; then
    echo "[INFO] Waiting for Redis at $REDIS_HOST:$REDIS_PORT..."
    while ! nc -z "$REDIS_HOST" "$REDIS_PORT"; do
        echo "[WARNING] Redis not ready, waiting..."
        sleep 2
    done
    echo "[SUCCESS] Redis is ready!"
fi

# Setup Laravel application
echo "[INFO] Setting up Laravel application..."
mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views storage/app/public bootstrap/cache
chmod -R 755 storage bootstrap/cache

echo "[INFO] Running database migrations..."
php artisan migrate --force || echo "[WARNING] Migrations failed, continuing..."

echo "[INFO] Setting up storage link..."
php artisan storage:link || echo "[WARNING] Storage link failed, continuing..."

echo "[INFO] Caching configuration..."
php artisan config:cache || echo "[WARNING] Config cache failed"
php artisan route:cache || echo "[WARNING] Route cache failed"
php artisan view:cache || echo "[WARNING] View cache failed"

echo "[SUCCESS] Laravel setup completed"

# Start services
echo "[INFO] Starting services..."

echo "[INFO] Starting PHP-FPM..."
php-fpm -D || echo "[ERROR] Failed to start PHP-FPM"

echo "[INFO] Starting Nginx..."
nginx -g "daemon off;" &

if [ -n "$REDIS_HOST" ] && [ "$REDIS_HOST" != "localhost" ]; then
    echo "[INFO] Starting Laravel Echo Server..."
    laravel-echo-server start --config=/var/www/html/laravel-echo-server.dokploy.json &
fi

echo "[INFO] Starting queue workers..."
php artisan queue:work redis --sleep=3 --tries=3 --timeout=90 &

echo "[INFO] Starting scheduler..."
while true; do
    php artisan schedule:run --verbose --no-interaction
    sleep 60
done &

echo "[SUCCESS] All services started"

# Wait for nginx to be ready
echo "[INFO] Waiting for application to be ready..."
sleep 5

# Test application
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "[SUCCESS] Application is ready to serve requests"
else
    echo "[WARNING] Application health check failed, but continuing..."
fi

echo "[SUCCESS] Application startup completed successfully!"

# Keep container running
wait 