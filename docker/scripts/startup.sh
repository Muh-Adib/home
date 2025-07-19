#!/bin/bash

# Startup script untuk Dokploy deployment
# Handles migrations, cache optimization, dan service startup dengan external Redis/DB

set -e

echo "=== Laravel Dokploy Startup Script ==="

# Function untuk wait sampai service ready
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=1
    
    echo "Waiting for $service_name at $host:$port..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            echo "$service_name is ready!"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "WARNING: $service_name at $host:$port tidak ready setelah $max_attempts attempts"
    return 1
}

# Set environment variables dengan defaults
export DB_HOST=${DB_HOST:-mysql}
export DB_PORT=${DB_PORT:-3306}
export REDIS_HOST=${REDIS_HOST:-redis}
export REDIS_PORT=${REDIS_PORT:-6379}

# Setup dynamic URL configuration
echo "=== Setting up Dynamic Environment Configuration ==="

# Update .env file dengan dynamic values
if [ -f .env ]; then
    # Update database configuration
    sed -i "s/DB_HOST=.*/DB_HOST=${DB_HOST}/" .env
    sed -i "s/DB_PORT=.*/DB_PORT=${DB_PORT}/" .env
    sed -i "s/DB_DATABASE=.*/DB_DATABASE=${DB_DATABASE:-laravel}/" .env
    sed -i "s/DB_USERNAME=.*/DB_USERNAME=${DB_USERNAME:-root}/" .env
    if [ -n "$DB_PASSWORD" ]; then
        sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env
    fi

    # Update Redis configuration
    sed -i "s/REDIS_HOST=.*/REDIS_HOST=${REDIS_HOST}/" .env
    sed -i "s/REDIS_PORT=.*/REDIS_PORT=${REDIS_PORT}/" .env
    if [ -n "$REDIS_PASSWORD" ] && [ "$REDIS_PASSWORD" != "null" ]; then
        sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASSWORD}/" .env
    fi

    # Dynamic URL configuration - sangat penting untuk deployment
    if [ -n "$APP_URL" ]; then
        echo "Setting dynamic APP_URL to: $APP_URL"
        sed -i "s|APP_URL=.*|APP_URL=${APP_URL}|" .env
        
        # Update asset URL untuk static files
        if ! grep -q "ASSET_URL" .env; then
            echo "ASSET_URL=${APP_URL}" >> .env
        else
            sed -i "s|ASSET_URL=.*|ASSET_URL=${APP_URL}|" .env
        fi
        
        # Update mail domain berdasarkan APP_URL
        DOMAIN=$(echo "$APP_URL" | sed 's|https\?://||' | sed 's|/.*||')
        sed -i "s/MAIL_FROM_ADDRESS=.*/MAIL_FROM_ADDRESS=noreply@${DOMAIN}/" .env
        echo "Mail domain set to: noreply@$DOMAIN"
        
        export APP_URL="${APP_URL}"
    else
        echo "WARNING: APP_URL tidak di-set, menggunakan default"
    fi

    # Update cache drivers untuk external services
    sed -i "s/CACHE_DRIVER=.*/CACHE_DRIVER=redis/" .env
    sed -i "s/SESSION_DRIVER=.*/SESSION_DRIVER=redis/" .env
    sed -i "s/QUEUE_CONNECTION=.*/QUEUE_CONNECTION=redis/" .env
fi

echo "=== Environment Configuration ==="
echo "APP_URL: ${APP_URL:-not set}"
echo "Database: $DB_HOST:$DB_PORT"
echo "Redis: $REDIS_HOST:$REDIS_PORT"

# Wait for external services (dengan timeout)
if [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
    wait_for_service "$DB_HOST" "$DB_PORT" "Database" || echo "Continuing without DB connectivity check..."
fi

if [ "$REDIS_HOST" != "localhost" ] && [ "$REDIS_HOST" != "127.0.0.1" ]; then
    wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis" || echo "Continuing without Redis connectivity check..."
fi

# Test database connection
echo "=== Testing Database Connection ==="
if php artisan migrate:status >/dev/null 2>&1; then
    echo "Database connection successful!"
    
    # Run migrations jika diperlukan
    echo "=== Running Database Migrations ==="
    php artisan migrate --force || echo "Migration failed, continuing..."
    
    # Clear dan rebuild cache setelah migration
    echo "=== Clearing Application Cache ==="
    php artisan cache:clear || echo "Cache clear failed, continuing..."
    php artisan config:clear || echo "Config clear failed, continuing..."
    php artisan route:clear || echo "Route clear failed, continuing..."
    php artisan view:clear || echo "View clear failed, continuing..."
    
    # Rebuild cache untuk production
    echo "=== Rebuilding Production Cache ==="
    php artisan config:cache || echo "Config cache failed, continuing..."
    php artisan route:cache || echo "Route cache failed, continuing..."
    php artisan view:cache || echo "View cache failed, continuing..."
    php artisan event:cache || echo "Event cache failed, continuing..."
    
else
    echo "WARNING: Database connection failed atau migrations tidak dapat dijalankan"
fi

# Test Redis connection
echo "=== Testing Redis Connection ==="
if php artisan tinker --execute="Redis::ping();" >/dev/null 2>&1; then
    echo "Redis connection successful!"
    php artisan cache:clear || echo "Redis cache clear failed, continuing..."
else
    echo "WARNING: Redis connection failed, aplikasi akan berjalan tanpa Redis cache"
fi

# Setup storage link jika belum ada
echo "=== Setting up Storage Link ==="
php artisan storage:link || echo "Storage link already exists or failed"

# Set proper permissions
echo "=== Setting Final Permissions ==="
chown -R www:www /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 755 /var/www/html/storage /var/www/html/bootstrap/cache

# Start PHP-FPM in background
echo "=== Starting PHP-FPM ==="
php-fpm -D

# Start nginx in background
echo "=== Starting Nginx ==="
nginx

# Start supervisor untuk manage processes
echo "=== Starting Supervisor ==="
echo "Application startup completed successfully!"
echo "=== Services Status ==="
echo "- PHP-FPM: Running"
echo "- Nginx: Running"
echo "- Database: $DB_HOST:$DB_PORT"
echo "- Redis: $REDIS_HOST:$REDIS_PORT"

# Start supervisor in foreground untuk keep container running
exec /usr/bin/supervisord -c /etc/supervisor.d/supervisord.conf -n