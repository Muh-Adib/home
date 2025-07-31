#!/bin/bash

# =============================================================================
# Property Management System - Startup Script
# =============================================================================

set -e

echo "🚀 Starting Property Management System..."

# =============================================================================
# 1. Setup Logs
# =============================================================================
echo "📝 Setting up logs..."
mkdir -p /var/log/nginx /var/log/supervisor /var/log/php-fpm /var/log/laravel-echo-server /var/log/queue-worker /var/log/scheduler /var/log/health-monitor

# =============================================================================
# 2. Cleanup Existing Processes
# =============================================================================
echo "🧹 Cleaning up existing processes..."
pkill -f nginx || true
pkill -f php-fpm || true
pkill -f laravel-echo-server || true
pkill -f "php artisan queue:work" || true
pkill -f "php artisan schedule:work" || true

# =============================================================================
# 3. Setup Environment Variables
# =============================================================================
echo "🔧 Setting up environment variables..."

# Get PORT from environment or use default
EXTERNAL_PORT=${PORT:-3000}
echo "🌐 External PORT: $EXTERNAL_PORT"

# Update Laravel Echo Server configuration dynamically
echo "🔧 Updating Laravel Echo Server configuration..."
/usr/local/bin/update-echo-config.sh

# =============================================================================
# 4. Wait for External Services
# =============================================================================
echo "⏳ Waiting for external services..."

# Wait for Database
echo "🗄️ Waiting for database..."
until php artisan tinker --execute="DB::connection()->getPdo();" 2>/dev/null; do
    echo "Database not ready, waiting..."
    sleep 5
done
echo "✅ Database is ready!"

# Wait for Redis
echo "🔴 Waiting for Redis..."
until php artisan tinker --execute="Redis::connection()->ping();" 2>/dev/null; do
    echo "Redis not ready, waiting..."
    sleep 5
done
echo "✅ Redis is ready!"

# =============================================================================
# 5. Setup Storage and Permissions
# =============================================================================
echo "📁 Setting up storage and permissions..."
chown -R www:www /var/www/html/storage
chown -R www:www /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage
chmod -R 775 /var/www/html/bootstrap/cache

# =============================================================================
# 6. Database Setup
# =============================================================================
echo "🗄️ Setting up database..."

# Run migrations
echo "🔄 Running migrations..."
php artisan migrate --force

# Seed database if needed
if [ "$APP_ENV" = "local" ] || [ "$APP_ENV" = "development" ]; then
    echo "🌱 Seeding database..."
    php artisan db:seed --force
fi

# =============================================================================
# 7. Production Optimizations
# =============================================================================
if [ "$APP_ENV" = "production" ]; then
    echo "⚡ Running production optimizations..."
    
    # Clear and cache config
    php artisan config:clear
    php artisan config:cache
    
    # Clear and cache routes
    php artisan route:clear
    php artisan route:cache
    
    # Clear and cache views
    php artisan view:clear
    php artisan view:cache
    
    # Optimize autoloader
    composer install --optimize-autoloader --no-dev
    
    # Generate application key if not set
    if [ -z "$APP_KEY" ]; then
        php artisan key:generate
    fi
fi

# =============================================================================
# 8. Start Supervisor
# =============================================================================
echo "🎯 Starting Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf