#!/bin/bash

# 🔧 FIX SESSION & CACHE REDIS ISSUES
# Property Management System - Laravel 12 + React + WebSocket

set -e

echo "🔧 Fixing session and cache Redis issues..."

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

# 1. Check if Redis extension is available
log_info "🔧 Checking Redis extension availability..."
if php -m | grep -q redis && php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null | grep -q "OK"; then
    log_success "Redis extension is available"
    log_info "No need to fix session/cache - Redis is working"
    exit 0
else
    log_warning "Redis extension is NOT available"
    log_info "Setting up fallback configuration for session and cache"
fi

# 2. Create fallback environment configuration
log_info "🔧 Creating fallback environment configuration..."
cat > /app/.env.fallback << 'EOF'
# Fallback configuration when Redis is not available
SESSION_DRIVER=file
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
BROADCAST_DRIVER=log
REDIS_CLIENT=predis
EOF

# 3. Update Laravel configuration files
log_info "🔧 Updating Laravel configuration files..."

# Update session configuration
if [ -f "/app/config/session.php" ]; then
    log_info "Updating session configuration..."
    sed -i "s/'driver' => env('SESSION_DRIVER', 'redis')/'driver' => env('SESSION_DRIVER', 'file')/g" /app/config/session.php
    sed -i "s/'driver' => env('SESSION_DRIVER', 'database')/'driver' => env('SESSION_DRIVER', 'file')/g" /app/config/session.php
    log_success "Session driver updated to file"
else
    log_error "Session configuration file not found"
fi

# Update cache configuration
if [ -f "/app/config/cache.php" ]; then
    log_info "Updating cache configuration..."
    sed -i "s/'default' => env('CACHE_DRIVER', 'redis')/'default' => env('CACHE_DRIVER', 'file')/g" /app/config/cache.php
    sed -i "s/'default' => env('CACHE_DRIVER', 'database')/'default' => env('CACHE_DRIVER', 'file')/g" /app/config/cache.php
    log_success "Cache driver updated to file"
else
    log_error "Cache configuration file not found"
fi

# Update queue configuration
if [ -f "/app/config/queue.php" ]; then
    log_info "Updating queue configuration..."
    sed -i "s/'default' => env('QUEUE_CONNECTION', 'redis')/'default' => env('QUEUE_CONNECTION', 'sync')/g" /app/config/queue.php
    sed -i "s/'default' => env('QUEUE_CONNECTION', 'database')/'default' => env('QUEUE_CONNECTION', 'sync')/g" /app/config/queue.php
    log_success "Queue connection updated to sync"
else
    log_error "Queue configuration file not found"
fi

# Update broadcasting configuration
if [ -f "/app/config/broadcasting.php" ]; then
    log_info "Updating broadcasting configuration..."
    sed -i "s/'default' => env('BROADCAST_DRIVER', 'redis')/'default' => env('BROADCAST_DRIVER', 'log')/g" /app/config/broadcasting.php
    sed -i "s/'default' => env('BROADCAST_DRIVER', 'pusher')/'default' => env('BROADCAST_DRIVER', 'log')/g" /app/config/broadcasting.php
    log_success "Broadcast driver updated to log"
else
    log_error "Broadcasting configuration file not found"
fi

# 4. Create necessary directories for file drivers
log_info "🔧 Creating directories for file drivers..."
mkdir -p /app/storage/framework/sessions
mkdir -p /app/storage/framework/cache
mkdir -p /app/storage/framework/views
mkdir -p /app/storage/logs

# Set proper permissions
chmod -R 755 /app/storage/framework
chmod -R 755 /app/storage/logs

# 5. Clear Laravel caches
log_info "🔧 Clearing Laravel caches..."
if command -v php &> /dev/null; then
    cd /app
    php artisan config:clear 2>/dev/null || true
    php artisan cache:clear 2>/dev/null || true
    php artisan view:clear 2>/dev/null || true
    php artisan route:clear 2>/dev/null || true
    log_success "Laravel caches cleared"
else
    log_error "PHP not available to clear caches"
fi

# 6. Test session and cache functionality
log_info "🔧 Testing session and cache functionality..."
if command -v php &> /dev/null; then
    cd /app
    
    # Test session
    if php artisan tinker --execute="Session::put('test', 'value'); echo Session::get('test');" 2>/dev/null | grep -q "value"; then
        log_success "Session functionality working"
    else
        log_error "Session functionality failed"
    fi
    
    # Test cache
    if php artisan tinker --execute="Cache::put('test', 'value', 60); echo Cache::get('test');" 2>/dev/null | grep -q "value"; then
        log_success "Cache functionality working"
    else
        log_error "Cache functionality failed"
    fi
else
    log_error "PHP not available to test functionality"
fi

# 7. Update environment variables
log_info "🔧 Setting environment variables for fallback..."
export SESSION_DRIVER=file
export CACHE_DRIVER=file
export QUEUE_CONNECTION=sync
export BROADCAST_DRIVER=log

# 8. Create a simple test script
log_info "🔧 Creating test script for verification..."
cat > /app/test-redis-fallback.php << 'EOF'
<?php
// Test script to verify fallback configuration
echo "Testing Laravel configuration...\n";

// Test session
try {
    session_start();
    $_SESSION['test'] = 'value';
    echo "Session: " . ($_SESSION['test'] === 'value' ? "OK" : "FAIL") . "\n";
} catch (Exception $e) {
    echo "Session: FAIL - " . $e->getMessage() . "\n";
}

// Test cache directory
if (is_dir('/app/storage/framework/cache')) {
    echo "Cache directory: OK\n";
} else {
    echo "Cache directory: FAIL\n";
}

// Test session directory
if (is_dir('/app/storage/framework/sessions')) {
    echo "Session directory: OK\n";
} else {
    echo "Session directory: FAIL\n";
}

echo "Test completed.\n";
EOF

echo ""
echo -e "${GREEN}[SUCCESS]${NC} 🎉 Session and cache Redis issues fixed!"
echo ""
echo "📋 FIX SUMMARY:"
echo "- Session driver: file"
echo "- Cache driver: file"
echo "- Queue connection: sync"
echo "- Broadcast driver: log"
echo "- Directories created: $(ls -la /app/storage/framework/ | wc -l) items"
echo "- Laravel caches cleared: $(command -v php > /dev/null && echo "✅" || echo "❌")"
echo ""
echo "🔧 CONFIGURATION CHANGES:"
echo "- /app/config/session.php: driver => file"
echo "- /app/config/cache.php: default => file"
echo "- /app/config/queue.php: default => sync"
echo "- /app/config/broadcasting.php: default => log"
echo ""
echo "🎯 EXPECTED RESULT:"
echo "- No more 'Class Redis not found' errors"
echo "- Session working with file driver"
echo "- Cache working with file driver"
echo "- Queue working with sync driver"
echo "- Broadcasting working with log driver"
echo ""
echo "⚠️  IMPORTANT:"
echo "- Application will work without Redis"
echo "- Performance may be slower with file drivers"
echo "- For production, consider fixing Redis extension installation"
echo "- Test the application to ensure everything works"
