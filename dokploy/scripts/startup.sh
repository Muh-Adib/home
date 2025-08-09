#!/bin/bash

# 🚀 STARTUP SCRIPT
# Property Management System - Laravel 12 + React + WebSocket

set -e

echo "🚀 Starting Property Management System..."

# Rely on Dokploy-provided environment variables (do not create or load .env)
echo "🌍 Using Dokploy environment variables (no .env creation)"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache
mkdir -p /var/log/supervisor /etc/supervisor/conf.d /etc/nginx
mkdir -p /var/log/nginx /run

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Configuration files are already copied in build phase
echo "📋 Configuration files already copied in build phase"

# Generate Laravel Echo Server config with environment variables
echo "🔧 Generating Laravel Echo Server config..."
bash dokploy/scripts/generate-echo-config-simple.sh

# Run Laravel commands with environment variables (RUNTIME)
echo "🔧 Running Laravel setup commands with Dokploy environment variables..."

# Ensure Laravel is properly installed
if [ ! -f "artisan" ]; then
    echo "❌ Laravel not found - redeploy needed"
    exit 1
fi

# Clear Laravel caches first
php artisan config:clear || echo "Config clear failed"
php artisan route:clear || echo "Route clear failed"
php artisan view:clear || echo "View clear failed"

# Ensure public/index.php exists
if [ ! -f "public/index.php" ]; then
    echo "❌ Laravel index.php not found - redeploy needed"
    exit 1
fi

# Run migrations if needed
echo "🔧 Running migrations..."
php artisan migrate --force || echo "Migration skipped"

# Create storage link
echo "🔧 Creating storage link..."
php artisan storage:link || echo "Storage link skipped"

# Cache configurations (now with proper environment variables)
echo "🔧 Caching configurations..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Test Laravel application
echo "🔧 Testing Laravel application..."
if php artisan --version > /dev/null 2>&1; then
    echo "✅ Laravel application is working"
else
    echo "❌ Laravel application not working"
fi

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
