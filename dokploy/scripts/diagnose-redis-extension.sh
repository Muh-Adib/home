#!/bin/bash

# 🔍 DIAGNOSE REDIS EXTENSION ISSUES
# Property Management System website Homsjogja - Laravel 12 + React + WebSocket

set -e

echo "🔍 Diagnosing Redis extension issues..."

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

# 1. Check nixpacks.toml Redis extension
log_info "🔧 Checking nixpacks.toml Redis extension..."
if grep -q "php83Extensions.redis" nixpacks.toml; then
    log_success "Redis extension included in nixpacks.toml"
    echo "  - Line found: $(grep -n "php83Extensions.redis" nixpacks.toml)"
else
    log_error "Redis extension missing from nixpacks.toml"
fi

# 2. Check if we're in container environment
log_info "🔧 Checking container environment..."
if [ -d "/app" ]; then
    log_success "Running in container environment (/app exists)"
    CONTAINER_ENV=true
else
    log_info "Running in local environment"
    CONTAINER_ENV=false
fi

# 3. Check PHP installation
log_info "🔧 Checking PHP installation..."
if command -v php &> /dev/null; then
    PHP_VERSION=$(php -v | head -n1 | cut -d' ' -f2)
    log_success "PHP installed: $PHP_VERSION"
    
    # Check PHP modules
    log_info "🔧 Checking PHP modules..."
    if php -m | grep -q redis; then
        log_success "Redis extension loaded"
        echo "  - Redis extension version: $(php -r "echo phpversion('redis');" 2>/dev/null || echo "unknown")"
    else
        log_error "Redis extension not loaded"
        echo "  - Available extensions: $(php -m | head -10 | tr '\n' ' ')"
    fi
    
    # Check PHP configuration
    log_info "🔧 Checking PHP configuration..."
    PHP_INI_SCAN_DIR=$(php -r "echo ini_get('extension_dir');" 2>/dev/null || echo "unknown")
    echo "  - Extension directory: $PHP_INI_SCAN_DIR"
    
    # Check if Redis extension file exists
    if [ -f "$PHP_INI_SCAN_DIR/redis.so" ]; then
        log_success "Redis extension file exists"
    else
        log_error "Redis extension file not found"
        echo "  - Looking for: $PHP_INI_SCAN_DIR/redis.so"
    fi
else
    log_error "PHP not installed"
fi

# 4. Check Laravel Redis configuration
log_info "🔧 Checking Laravel Redis configuration..."
if [ -f "config/database.php" ]; then
    if grep -q "REDIS_HOST" config/database.php; then
        log_success "Laravel Redis config uses environment variables"
    else
        log_error "Laravel Redis config not using environment variables"
    fi
    
    # Check Redis client setting
    REDIS_CLIENT=$(grep -A 5 "'client'" config/database.php | grep "env" | head -1 | sed "s/.*env('REDIS_CLIENT', '\([^']*\)').*/\1/")
    echo "  - Redis client: $REDIS_CLIENT"
else
    log_error "Laravel database config not found"
fi

# 5. Check environment variables
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

# 6. Test Redis connection (if extension available)
log_info "🔧 Testing Redis connection..."
if command -v php &> /dev/null && php -m | grep -q redis; then
    log_success "Redis extension available for testing"
    
    # Test basic Redis connection
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

# 7. Check startup script Redis check
log_info "🔧 Checking startup script Redis check..."
if grep -q "php -m | grep -q redis" dokploy/scripts/startup.sh; then
    log_success "Startup script checks Redis extension"
else
    log_error "Startup script missing Redis extension check"
fi

# 8. Check if this is a fresh deployment issue
log_info "🔧 Checking deployment status..."
if [ "$CONTAINER_ENV" = true ]; then
    log_info "Container environment detected - this might be a fresh deployment"
    echo "  - If this is a fresh deployment, Redis extension should be installed during build"
    echo "  - Check if nixpacks build included Redis extension"
else
    log_info "Local environment - Redis extension should be installed manually"
fi

echo ""
echo -e "${GREEN}[SUCCESS]${NC} 🎉 Redis extension diagnosis completed!"
echo ""
echo "📋 DIAGNOSIS SUMMARY:"
echo "- Nixpacks Redis extension: $(grep -q "php83Extensions.redis" nixpacks.toml && echo "✅" || echo "❌")"
echo "- PHP installed: $(command -v php > /dev/null && echo "✅" || echo "❌")"
echo "- Redis extension loaded: $(command -v php > /dev/null && php -m | grep -q redis && echo "✅" || echo "❌")"
echo "- Laravel Redis config: $(grep -q "REDIS_HOST" config/database.php && echo "✅" || echo "❌")"
echo "- Environment variables: $(echo $REDIS_HOST | grep -q "127.0.0.1" && echo "❌" || echo "✅")"
echo "- Startup script check: $(grep -q "php -m | grep -q redis" dokploy/scripts/startup.sh && echo "✅" || echo "❌")"
echo ""
echo "🔧 TROUBLESHOOTING STEPS:"
echo ""
echo "1. IF REDIS EXTENSION NOT LOADED:"
echo "   - Check nixpacks build logs for Redis extension installation"
echo "   - Verify nixpacks.toml has 'php83Extensions.redis'"
echo "   - Redeploy with rebuild option in Dokploy Dashboard"
echo ""
echo "2. IF REDIS CONNECTION FAILS:"
echo "   - Set environment variables in Dokploy Dashboard:"
echo "     REDIS_HOST=homsjogja-redis-qmihbb"
echo "     REDIS_PORT=6379"
echo "     REDIS_PASSWORD=5vlcwpzc45g9mtho"
echo "     REDIS_DB=0"
echo "   - Redeploy application"
echo ""
echo "3. IF LARAVEL REDIS ERROR:"
echo "   - Check Laravel cache: php artisan config:clear"
echo "   - Check Redis client setting in config/database.php"
echo "   - Verify environment variables are loaded"
echo ""
echo "4. VERIFICATION COMMANDS:"
echo "   - Check PHP modules: php -m | grep redis"
echo "   - Test Redis: php -r \"echo class_exists('Redis') ? 'OK' : 'FAIL';\""
echo "   - Test Laravel Redis: php artisan tinker --execute=\"Redis::connection()->ping();\""
echo ""
echo "🎯 EXPECTED RESULT:"
echo "- Redis extension installed and loaded"
echo "- Laravel can connect to external Redis service"
echo "- No more 'Class Redis not found' errors"
