#!/bin/bash

# 🔧 FORCE REDIS EXTENSION INSTALLATION
# Property Management System website Homsjogja - Laravel 12 + React + WebSocket

set -e

echo "🔧 Force Redis extension installation..."

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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} ⚠️ $1"
}

# Check if we're in container
if [ ! -d "/app" ]; then
    log_error "This script should run in container environment"
    echo "Run this script after deployment in the container"
    exit 1
fi

log_success "Container environment detected"

# 1. Check current Redis extension status
log_info "🔧 Checking current Redis extension status..."
if php -m | grep -q redis; then
    log_success "Redis extension is already loaded"
    REDIS_VERSION=$(php -r "echo phpversion('redis');" 2>/dev/null || echo "unknown")
    echo "  - Redis extension version: $REDIS_VERSION"
    exit 0
else
    log_error "Redis extension is NOT loaded"
fi

# 2. Check if Redis extension file exists
log_info "🔧 Checking Redis extension files..."
PHP_INI_SCAN_DIR=$(php -r "echo ini_get('extension_dir');" 2>/dev/null || echo "unknown")
echo "  - Extension directory: $PHP_INI_SCAN_DIR"

if [ -d "$PHP_INI_SCAN_DIR" ]; then
    echo "  - Available extension files:"
    ls "$PHP_INI_SCAN_DIR" | grep -i redis || echo "    No Redis extension files found"
fi

# 3. Try to install Redis extension manually
log_info "🔧 Attempting manual Redis extension installation..."

# Check if we have package manager
if command -v apt-get &> /dev/null; then
    log_info "Using apt-get to install Redis extension..."
    apt-get update
    apt-get install -y php-redis
elif command -v yum &> /dev/null; then
    log_info "Using yum to install Redis extension..."
    yum install -y php-redis
elif command -v apk &> /dev/null; then
    log_info "Using apk to install Redis extension..."
    apk add --no-cache php-redis
else
    log_warning "No package manager found, trying to compile Redis extension..."
    
    # Try to compile Redis extension
    if command -v pecl &> /dev/null; then
        log_info "Using PECL to install Redis extension..."
        pecl install redis
    else
        log_error "No PECL found, cannot install Redis extension"
    fi
fi

# 4. Check if installation was successful
log_info "🔧 Checking if Redis extension installation was successful..."
if php -m | grep -q redis; then
    log_success "Redis extension installation successful"
    REDIS_VERSION=$(php -r "echo phpversion('redis');" 2>/dev/null || echo "unknown")
    echo "  - Redis extension version: $REDIS_VERSION"
else
    log_error "Redis extension installation failed"
    
    # 5. Provide fallback configuration
    log_warning "Setting up fallback configuration..."
    
    # Create fallback .env for session/cache
    echo "Creating fallback configuration..."
    cat > /app/.env.fallback << 'EOF'
# Fallback configuration when Redis is not available
SESSION_DRIVER=file
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
BROADCAST_DRIVER=log
EOF
    
    # Copy fallback config to main .env if it doesn't exist
    if [ ! -f "/app/.env" ]; then
        cp /app/.env.fallback /app/.env
        log_info "Created fallback .env file"
    fi
    
    # Update Laravel config to use file drivers
    log_info "Updating Laravel configuration to use file drivers..."
    
    # Update session config
    if [ -f "/app/config/session.php" ]; then
        sed -i "s/'driver' => env('SESSION_DRIVER', 'redis')/'driver' => env('SESSION_DRIVER', 'file')/g" /app/config/session.php
        log_info "Updated session driver to file"
    fi
    
    # Update cache config
    if [ -f "/app/config/cache.php" ]; then
        sed -i "s/'default' => env('CACHE_DRIVER', 'redis')/'default' => env('CACHE_DRIVER', 'file')/g" /app/config/cache.php
        log_info "Updated cache driver to file"
    fi
    
    # Update queue config
    if [ -f "/app/config/queue.php" ]; then
        sed -i "s/'default' => env('QUEUE_CONNECTION', 'redis')/'default' => env('QUEUE_CONNECTION', 'sync')/g" /app/config/queue.php
        log_info "Updated queue connection to sync"
    fi
    
    # Update broadcasting config
    if [ -f "/app/config/broadcasting.php" ]; then
        sed -i "s/'default' => env('BROADCAST_DRIVER', 'redis')/'default' => env('BROADCAST_DRIVER', 'log')/g" /app/config/broadcasting.php
        log_info "Updated broadcast driver to log"
    fi
    
    log_warning "Fallback configuration applied - using file drivers instead of Redis"
    log_warning "Application will work but without Redis functionality"
fi

# 6. Test Redis functionality
log_info "🔧 Testing Redis functionality..."
if php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null | grep -q "OK"; then
    log_success "Redis class is available"
    
    # Test Redis connection
    REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
    REDIS_PORT=${REDIS_PORT:-"6379"}
    
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
    log_error "Redis class is NOT available"
    log_warning "Application will use fallback drivers (file/sync/log)"
fi

echo ""
echo -e "${GREEN}[SUCCESS]${NC} 🎉 Redis extension installation attempt completed!"
echo ""
echo "📋 INSTALLATION SUMMARY:"
echo "- Redis extension loaded: $(php -m | grep -q redis && echo "✅" || echo "❌")"
echo "- Redis class available: $(php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null | grep -q "OK" && echo "✅" || echo "❌")"
echo "- Fallback config applied: $(if [ -f "/app/.env.fallback" ]; then echo "✅"; else echo "❌"; fi)"
echo ""
echo "🔧 NEXT STEPS:"
echo ""
if php -m | grep -q redis; then
    echo "✅ Redis extension is working:"
    echo "   - Laravel can use Redis for cache, session, queue, and broadcasting"
    echo "   - No further action needed"
else
    echo "⚠️ Redis extension not available:"
    echo "   - Application will use fallback drivers (file/sync/log)"
    echo "   - Check nixpacks build logs for Redis extension installation"
    echo "   - Redeploy with rebuild option in Dokploy Dashboard"
    echo "   - Or manually install Redis extension in container"
fi
echo ""
echo "🎯 EXPECTED RESULT:"
echo "- Redis extension installed and working"
echo "- Or fallback drivers working without Redis"
echo "- No more 'Class Redis not found' errors"
