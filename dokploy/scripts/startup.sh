#!/bin/bash

# 🚀 STARTUP SCRIPT
# Property Management System website Homsjogja - Laravel 12 + React + WebSocket

set -e

echo "🚀 Starting Property Management System website Homsjogja..."

# Rely on Dokploy-provided environment variables (do not create or load .env)
echo "🌍 Using Dokploy environment variables (no .env creation)"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache
mkdir -p /var/log/supervisor /etc/supervisor/conf.d /etc/nginx
mkdir -p /var/log/nginx /run

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod -R 777 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Force clear persistent bootstrap cache (prevents CollisionServiceProvider error)
echo "🧹 Cleaning bootstrap cache..."
rm -f bootstrap/cache/*.php

# Create log file with proper permissions
echo "📝 Creating log files..."
touch storage/logs/laravel.log
chmod 666 storage/logs/laravel.log
chown www-data:www-data storage/logs/laravel.log 2>/dev/null || true

# Configuration files are already copied in build phase
echo "📋 Configuration files already copied in build phase"

# Generate Laravel Echo Server config with environment variables
echo "🔧 Generating Laravel Echo Server config..."
bash dokploy/scripts/generate-echo-config-simple.sh

# Verify config file exists
if [ ! -f "/app/laravel-echo-server.json" ]; then
    echo "❌ Laravel Echo Server config file not found!"
    echo "Creating fallback config..."
    cat > /app/laravel-echo-server.json << 'EOF'
{
    "authHost": "http://localhost",
    "authEndpoint": "/broadcasting/auth",
    "clients": [{"appId": "homsjogja", "key": "homsjogja-key"}],
    "database": "redis",
    "databaseConfig": {"redis": {"host": "127.0.0.1", "port": 6379, "password": null, "db": 0}},
    "devMode": false,
    "host": "0.0.0.0",
    "port": 6001,
    "protocol": "http",
    "socketio": {},
    "subscribers": {"http": true, "redis": true},
    "apiOriginAllow": {"allowCors": true, "allowOrigin": "*", "allowMethods": "GET, POST", "allowHeaders": "Origin, Content-Type, Accept, Authorization, X-Request-With"}
}
EOF
    echo "✅ Fallback config created"
else
    echo "✅ Laravel Echo Server config file exists"
fi

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

# Test Redis client and connection
echo "🔍 Testing Redis client and connection..."
REDIS_CLIENT=${REDIS_CLIENT:-phpredis}
if [ "$REDIS_CLIENT" = "predis" ]; then
    echo "✅ Using Predis client - PHP Redis extension not required"
    REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
    REDIS_PORT=${REDIS_PORT:-"6379"}
    echo "Using Redis: ${REDIS_HOST}:${REDIS_PORT}"
    if php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
        echo "✅ Redis connection successful (Predis)"
    else
        echo "⚠️ Redis connection failed (Predis) - check REDIS_HOST and REDIS_PORT"
        echo "Current Redis config:"
        echo "  - REDIS_HOST: ${REDIS_HOST}"
        echo "  - REDIS_PORT: ${REDIS_PORT}"
        echo "  - REDIS_PASSWORD: ${REDIS_PASSWORD:-'not set'}"
    fi
else
    echo "🔍 Testing Redis extension and connection..."

    # Check if Redis extension is loaded
    if php -m | grep -q redis; then
        echo "✅ Redis extension installed and loaded"
        REDIS_VERSION=$(php -r "echo phpversion('redis');" 2>/dev/null || echo "unknown")
        echo "  - Redis extension version: $REDIS_VERSION"
        
        # Test Redis class availability
        if php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null | grep -q "OK"; then
            echo "✅ Redis class is available"
            
            # Test Redis connection with environment variables
            echo "🔍 Testing Redis connection to external service..."
            REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
            REDIS_PORT=${REDIS_PORT:-"6379"}
            echo "Using Redis: ${REDIS_HOST}:${REDIS_PORT}"
            
            if php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
                echo "✅ Redis connection successful"
            else
                echo "⚠️ Redis connection failed - check REDIS_HOST and REDIS_PORT"
                echo "Current Redis config:"
                echo "  - REDIS_HOST: ${REDIS_HOST}"
                echo "  - REDIS_PORT: ${REDIS_PORT}"
                echo "  - REDIS_PASSWORD: ${REDIS_PASSWORD:-'not set'}"
            fi
        else
            echo "❌ Redis class not available despite extension being loaded"
        fi
    else
        echo "❌ Redis extension not installed or not loaded"
        echo "  - This means nixpacks build didn't install Redis extension properly"
        echo "  - Check nixpacks build logs for Redis extension installation"
        echo "  - Available PHP modules:"
        php -m | head -10 | tr '\n' ' '
        echo ""
        
        # Run detailed Redis diagnosis and force install if needed
        echo "🔍 Running detailed Redis diagnosis..."
        if [ -f "dokploy/scripts/diagnose-redis-extension.sh" ]; then
            echo "Running diagnose-redis-extension.sh..."
            bash dokploy/scripts/diagnose-redis-extension.sh
        else
            echo "Diagnosis script not found, running manual checks..."
            
            # Manual Redis diagnosis
            echo "📋 MANUAL REDIS DIAGNOSIS:"
            echo "1. Checking nixpacks.toml Redis extension..."
            if grep -q "php83Extensions.redis" nixpacks.toml; then
                echo "   ✅ Redis extension included in nixpacks.toml"
            else
                echo "   ❌ Redis extension missing from nixpacks.toml"
            fi
            
            echo "2. Checking PHP installation..."
            if command -v php &> /dev/null; then
                PHP_VERSION=$(php -v | head -n1 | cut -d' ' -f2)
                echo "   ✅ PHP installed: $PHP_VERSION"
            else
                echo "   ❌ PHP not installed"
            fi
            
            echo "3. Checking PHP modules..."
            PHP_MODULES=$(php -m)
            if echo "$PHP_MODULES" | grep -q redis; then
                echo "   ✅ Redis extension is loaded"
            else
                echo "   ❌ Redis extension is NOT loaded"
                echo "   Available modules (first 10):"
                echo "$PHP_MODULES" | head -10
            fi
            
            echo "4. Checking Redis class availability..."
            if php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null | grep -q "OK"; then
                echo "   ✅ Redis class is available"
            else
                echo "   ❌ Redis class is NOT available"
            fi
            
            echo "5. Checking environment variables..."
            REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
            REDIS_PORT=${REDIS_PORT:-"6379"}
            echo "   - REDIS_HOST: $REDIS_HOST"
            echo "   - REDIS_PORT: $REDIS_PORT"
            echo "   - REDIS_PASSWORD: ${REDIS_PASSWORD:-'not set'}"
            
            echo "6. Checking Laravel Redis configuration..."
            if [ -f "config/database.php" ]; then
                if grep -q "REDIS_HOST" config/database.php; then
                    echo "   ✅ Laravel Redis config uses environment variables"
                else
                    echo "   ❌ Laravel Redis config not using environment variables"
                fi
            else
                echo "   ❌ Laravel database config not found"
            fi
        fi
        
        # Try to force install Redis extension if not available
        echo "🔧 Attempting to force install Redis extension..."
        if [ -f "dokploy/scripts/force-redis-install.sh" ]; then
            echo "Running force-redis-install.sh..."
            bash dokploy/scripts/force-redis-install.sh
        else
            echo "Force install script not found"
        fi
        
        # If Redis is still not available, fix session and cache issues
        echo "🔧 Checking if Redis is still not available..."
        if ! php -m | grep -q redis || ! php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null | grep -q "OK"; then
            echo "⚠️ Redis extension still not available, fixing session and cache issues..."
            if [ -f "dokploy/scripts/fix-session-cache-redis.sh" ]; then
                echo "Running fix-session-cache-redis.sh..."
                bash dokploy/scripts/fix-session-cache-redis.sh
            else
                echo "Fix session/cache script not found"
            fi
        else
            echo "✅ Redis extension is now available"
        fi
    fi
fi

# Additional Redis verification in container environment
if [ -d "/app" ]; then
    echo "🔍 Running container Redis verification..."
    if [ -f "dokploy/scripts/container-redis-check.sh" ]; then
        echo "Running container-redis-check.sh..."
        bash dokploy/scripts/container-redis-check.sh
    else
        echo "Container Redis check script not found"
    fi
fi

echo "🎉 Startup completed successfully!"
echo "Starting Supervisor..."

# Start Supervisor with environment variables
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
