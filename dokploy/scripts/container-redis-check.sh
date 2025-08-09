#!/bin/bash

# 🔍 CONTAINER REDIS EXTENSION CHECK
# Property Management System - Laravel 12 + React + WebSocket

set -e

echo "🔍 Checking Redis extension in container environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} ❌ $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} 🔍 $1"
}

# Check if we're in container
if [ ! -d "/app" ]; then
    log_error "This script should run in container environment"
    echo "Run this script after deployment in the container"
    exit 1
fi

log_success "Container environment detected"

# 1. Check PHP installation
log_info "🔧 Checking PHP installation..."
if command -v php &> /dev/null; then
    PHP_VERSION=$(php -v | head -n1 | cut -d' ' -f2)
    log_success "PHP installed: $PHP_VERSION"
else
    log_error "PHP not installed"
    exit 1
fi

# 2. Check PHP modules
log_info "🔧 Checking PHP modules..."
PHP_MODULES=$(php -m)
echo "Available PHP modules:"
echo "$PHP_MODULES"

if echo "$PHP_MODULES" | grep -q redis; then
    log_success "Redis extension is loaded"
    REDIS_VERSION=$(php -r "echo phpversion('redis');" 2>/dev/null || echo "unknown")
    echo "  - Redis extension version: $REDIS_VERSION"
else
    log_error "Redis extension is NOT loaded"
    echo "  - This means nixpacks build didn't install Redis extension"
    echo "  - Check nixpacks build logs for Redis extension installation"
fi

# 3. Check Redis class availability
log_info "🔧 Checking Redis class availability..."
if php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null | grep -q "OK"; then
    log_success "Redis class is available"
else
    log_error "Redis class is NOT available"
    echo "  - This confirms the 'Class Redis not found' error"
fi

# 4. Check environment variables
log_info "🔧 Checking Redis environment variables..."
REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
REDIS_PORT=${REDIS_PORT:-"6379"}
REDIS_PASSWORD=${REDIS_PASSWORD:-""}
REDIS_DB=${REDIS_DB:-"0"}

echo "Current Redis environment:"
echo "  - REDIS_HOST: $REDIS_HOST"
echo "  - REDIS_PORT: $REDIS_PORT"
echo "  - REDIS_PASSWORD: ${REDIS_PASSWORD:-'not set'}"
echo "  - REDIS_DB: $REDIS_DB"

# 5. Test Redis connection (if extension available)
log_info "🔧 Testing Redis connection..."
if echo "$PHP_MODULES" | grep -q redis; then
    log_success "Redis extension available for connection test"
    
    # Test basic Redis connection
    echo "Testing Redis connection to $REDIS_HOST:$REDIS_PORT..."
    if php -r "
        try {
            \$redis = new Redis();
            \$redis->connect('$REDIS_HOST', $REDIS_PORT);
            if (!empty('$REDIS_PASSWORD')) {
                \$redis->auth('$REDIS_PASSWORD');
            }
            echo 'PONG: ' . \$redis->ping() . PHP_EOL;
        } catch (Exception \$e) {
            echo 'ERROR: ' . \$e->getMessage() . PHP_EOL;
        }
    " 2>/dev/null; then
        log_success "Redis connection test successful"
    else
        log_error "Redis connection test failed"
    fi
    
    # Test Laravel Redis
    if php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
        log_success "Laravel Redis connection successful"
    else
        log_error "Laravel Redis connection failed"
    fi
else
    log_error "Cannot test Redis connection - extension not available"
fi

# 6. Check nixpacks build
log_info "🔧 Checking nixpacks configuration..."
if [ -f "/app/nixpacks.toml" ]; then
    if grep -q "php83Extensions.redis" /app/nixpacks.toml; then
        log_success "Redis extension included in nixpacks.toml"
    else
        log_error "Redis extension missing from nixpacks.toml"
    fi
else
    log_info "nixpacks.toml not found in container"
fi

echo ""
echo -e "${GREEN}[SUCCESS]${NC} 🎉 Container Redis check completed!"
echo ""
echo "📋 CONTAINER CHECK SUMMARY:"
echo "- Container environment: ✅"
echo "- PHP installed: $(command -v php > /dev/null && echo "✅" || echo "❌")"
echo "- Redis extension loaded: $(php -m | grep -q redis && echo "✅" || echo "❌")"
echo "- Redis class available: $(php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null | grep -q "OK" && echo "✅" || echo "❌")"
echo "- Environment variables: $(echo $REDIS_HOST | grep -q "127.0.0.1" && echo "❌" || echo "✅")"
echo "- Nixpacks Redis config: $(grep -q "php83Extensions.redis" /app/nixpacks.toml 2>/dev/null && echo "✅" || echo "❌")"
echo ""
echo "🔧 TROUBLESHOOTING:"
echo ""
echo "IF REDIS EXTENSION NOT LOADED:"
echo "1. Check nixpacks build logs in Dokploy Dashboard"
echo "2. Verify nixpacks.toml has 'php83Extensions.redis'"
echo "3. Redeploy with rebuild option in Dokploy Dashboard"
echo ""
echo "IF REDIS CONNECTION FAILS:"
echo "1. Set environment variables in Dokploy Dashboard:"
echo "   REDIS_HOST=homsjogja-redis-qmihbb"
echo "   REDIS_PORT=6379"
echo "   REDIS_PASSWORD=5vlcwpzc45g9mtho"
echo "   REDIS_DB=0"
echo "2. Redeploy application"
echo ""
echo "IF LARAVEL STILL SHOWS 'Class Redis not found':"
echo "1. Clear Laravel cache: php artisan config:clear"
echo "2. Check if Redis extension is loaded: php -m | grep redis"
echo "3. Verify Redis class exists: php -r \"echo class_exists('Redis') ? 'OK' : 'FAIL';\""
echo ""
echo "🎯 EXPECTED RESULT:"
echo "- Redis extension installed and loaded in container"
echo "- Redis class available for Laravel"
echo "- Laravel can connect to external Redis service"
echo "- No more 'Class Redis not found' errors"
