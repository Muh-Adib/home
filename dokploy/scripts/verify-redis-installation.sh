#!/bin/bash

# 🔍 VERIFY REDIS EXTENSION INSTALLATION
# Property Management System - Laravel 12 + React + WebSocket

set -e

echo "🔍 Verifying Redis extension installation..."

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

# 1. Check nixpacks.toml configuration
log_info "🔧 Checking nixpacks.toml configuration..."
echo "Current nixpacks.toml Redis extension configuration:"
grep -A 5 -B 5 "redis" nixpacks.toml || echo "No Redis configuration found"

# 2. Check if this is a container environment
log_info "🔧 Checking environment..."
if [ -d "/app" ]; then
    log_success "Container environment detected (/app exists)"
    CONTAINER_ENV=true
else
    log_info "Local environment detected"
    CONTAINER_ENV=false
fi

# 3. Check PHP installation and modules
log_info "🔧 Checking PHP installation..."
if command -v php &> /dev/null; then
    PHP_VERSION=$(php -v | head -n1 | cut -d' ' -f2)
    log_success "PHP installed: $PHP_VERSION"
    
    # Check PHP modules
    log_info "🔧 Checking PHP modules..."
    PHP_MODULES=$(php -m)
    echo "Available PHP modules (first 20):"
    echo "$PHP_MODULES" | head -20
    
    if echo "$PHP_MODULES" | grep -q redis; then
        log_success "Redis extension is loaded"
        REDIS_VERSION=$(php -r "echo phpversion('redis');" 2>/dev/null || echo "unknown")
        echo "  - Redis extension version: $REDIS_VERSION"
    else
        log_error "Redis extension is NOT loaded"
        echo "  - This means the extension wasn't installed during nixpacks build"
    fi
    
    # Check PHP configuration
    log_info "🔧 Checking PHP configuration..."
    PHP_INI_SCAN_DIR=$(php -r "echo ini_get('extension_dir');" 2>/dev/null || echo "unknown")
    echo "  - Extension directory: $PHP_INI_SCAN_DIR"
    
    # List available extensions
    if [ -d "$PHP_INI_SCAN_DIR" ]; then
        echo "  - Available extension files:"
        ls "$PHP_INI_SCAN_DIR" | grep -i redis || echo "    No Redis extension files found"
    fi
else
    log_error "PHP not installed"
fi

# 4. Test Redis class availability
log_info "🔧 Testing Redis class availability..."
if command -v php &> /dev/null; then
    if php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null; then
        log_success "Redis class is available"
    else
        log_error "Redis class is NOT available"
        echo "  - This confirms the 'Class Redis not found' error"
    fi
else
    log_error "Cannot test Redis class - PHP not available"
fi

# 5. Check Laravel Redis configuration
log_info "🔧 Checking Laravel Redis configuration..."
if [ -f "config/database.php" ]; then
    echo "Laravel Redis configuration:"
    grep -A 10 "'redis'" config/database.php || echo "No Redis configuration found"
else
    log_error "Laravel database config not found"
fi

# 6. Check environment variables
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

# 7. Test Redis connection (if extension available)
log_info "🔧 Testing Redis connection..."
if command -v php &> /dev/null && php -m | grep -q redis; then
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
else
    log_error "Cannot test Redis connection - extension not available"
fi

# 8. Check startup script
log_info "🔧 Checking startup script Redis checks..."
if [ -f "dokploy/scripts/startup.sh" ]; then
    echo "Startup script Redis checks:"
    grep -n "redis" dokploy/scripts/startup.sh || echo "No Redis checks found in startup script"
else
    log_error "Startup script not found"
fi

# 9. Provide troubleshooting steps
echo ""
echo -e "${GREEN}[SUCCESS]${NC} 🎉 Redis extension verification completed!"
echo ""
echo "📋 VERIFICATION SUMMARY:"
echo "- Nixpacks Redis extension: $(grep -q "php83Extensions.redis" nixpacks.toml && echo "✅" || echo "❌")"
echo "- PHP installed: $(command -v php > /dev/null && echo "✅" || echo "❌")"
echo "- Redis extension loaded: $(command -v php > /dev/null && php -m | grep -q redis && echo "✅" || echo "❌")"
echo "- Redis class available: $(command -v php > /dev/null && php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null && echo "✅" || echo "❌")"
echo "- Laravel Redis config: $(grep -q "REDIS_HOST" config/database.php && echo "✅" || echo "❌")"
echo "- Environment variables: $(echo $REDIS_HOST | grep -q "127.0.0.1" && echo "❌" || echo "✅")"
echo ""
echo "🔧 TROUBLESHOOTING STEPS:"
echo ""
echo "1. IF REDIS EXTENSION NOT LOADED IN CONTAINER:"
echo "   - Check nixpacks build logs in Dokploy Dashboard"
echo "   - Verify nixpacks.toml has 'php83Extensions.redis'"
echo "   - Redeploy with rebuild option in Dokploy Dashboard"
echo "   - Check if nixpacks build phase includes Redis extension"
echo ""
echo "2. IF REDIS EXTENSION LOADED BUT CONNECTION FAILS:"
echo "   - Set environment variables in Dokploy Dashboard:"
echo "     REDIS_HOST=homsjogja-redis-qmihbb"
echo "     REDIS_PORT=6379"
echo "     REDIS_PASSWORD=5vlcwpzc45g9mtho"
echo "     REDIS_DB=0"
echo "   - Redeploy application"
echo ""
echo "3. IF LARAVEL STILL SHOWS 'Class Redis not found':"
echo "   - Clear Laravel cache: php artisan config:clear"
echo "   - Check if Redis extension is loaded: php -m | grep redis"
echo "   - Verify Redis class exists: php -r \"echo class_exists('Redis') ? 'OK' : 'FAIL';\""
echo ""
echo "4. VERIFICATION COMMANDS FOR CONTAINER:"
echo "   - Check PHP modules: php -m | grep redis"
echo "   - Test Redis class: php -r \"echo class_exists('Redis') ? 'OK' : 'FAIL';\""
echo "   - Test Laravel Redis: php artisan tinker --execute=\"Redis::connection()->ping();\""
echo "   - Check environment: echo \$REDIS_HOST"
echo ""
echo "🎯 EXPECTED RESULT AFTER REDEPLOY:"
echo "- Redis extension installed and loaded in container"
echo "- Redis class available for Laravel"
echo "- Laravel can connect to external Redis service"
echo "- No more 'Class Redis not found' errors"
echo ""
echo "⚠️  IMPORTANT:"
echo "- This script shows current local environment"
echo "- In container, Redis extension should be installed by nixpacks"
echo "- If extension not loaded in container, check nixpacks build logs"
echo "- Redeploy with rebuild option to ensure Redis extension is installed"
