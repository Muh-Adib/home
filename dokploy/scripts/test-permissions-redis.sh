#!/bin/bash

# 🧪 TEST PERMISSIONS & REDIS FIX
# Property Management System website Homsjogja - Laravel 12 + React + WebSocket

set -e

echo "🧪 Testing permissions and Redis configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 1. Test storage permissions
log_info "🔧 Testing storage permissions..."
if [ -d "storage" ]; then
    PERMISSIONS=$(stat -c "%a" storage)
    if [ "$PERMISSIONS" = "777" ] || [ "$PERMISSIONS" = "755" ]; then
        log_success "Storage directory has correct permissions"
    else
        log_error "Storage directory has wrong permissions: $PERMISSIONS"
    fi
else
    log_error "Storage directory not found"
fi

# 2. Test storage/logs permissions
log_info "🔧 Testing storage/logs permissions..."
if [ -d "storage/logs" ]; then
    PERMISSIONS=$(stat -c "%a" storage/logs)
    if [ "$PERMISSIONS" = "777" ] || [ "$PERMISSIONS" = "755" ]; then
        log_success "Storage/logs directory has correct permissions"
    else
        log_error "Storage/logs directory has wrong permissions: $PERMISSIONS"
    fi
else
    log_error "Storage/logs directory not found"
fi

# 3. Test laravel.log file
log_info "🔧 Testing laravel.log file..."
if [ -f "storage/logs/laravel.log" ]; then
    PERMISSIONS=$(stat -c "%a" storage/logs/laravel.log)
    if [ "$PERMISSIONS" = "666" ] || [ "$PERMISSIONS" = "644" ]; then
        log_success "laravel.log has correct permissions"
    else
        log_error "laravel.log has wrong permissions: $PERMISSIONS"
    fi
else
    log_error "laravel.log file not found"
fi

# 4. Test bootstrap/cache permissions
log_info "🔧 Testing bootstrap/cache permissions..."
if [ -d "bootstrap/cache" ]; then
    PERMISSIONS=$(stat -c "%a" bootstrap/cache)
    if [ "$PERMISSIONS" = "777" ] || [ "$PERMISSIONS" = "755" ]; then
        log_success "bootstrap/cache has correct permissions"
    else
        log_error "bootstrap/cache has wrong permissions: $PERMISSIONS"
    fi
else
    log_error "bootstrap/cache directory not found"
fi

# 5. Test nixpacks Redis extension
log_info "🔧 Testing nixpacks Redis extension..."
if grep -q "php83Extensions.redis" nixpacks.toml; then
    log_success "Redis extension included in nixpacks"
else
    log_error "Redis extension missing from nixpacks"
fi

# 6. Test startup.sh permissions setup
log_info "🔧 Testing startup.sh permissions setup..."
if grep -q "chmod -R 777 storage" dokploy/scripts/startup.sh; then
    log_success "startup.sh sets correct storage permissions"
else
    log_error "startup.sh missing storage permissions setup"
fi

# 7. Test startup.sh log file creation
log_info "🔧 Testing startup.sh log file creation..."
if grep -q "touch storage/logs/laravel.log" dokploy/scripts/startup.sh; then
    log_success "startup.sh creates laravel.log file"
else
    log_error "startup.sh missing log file creation"
fi

# 8. Test startup.sh Redis extension check
log_info "🔧 Testing startup.sh Redis extension check..."
if grep -q "php -m | grep -q redis" dokploy/scripts/startup.sh; then
    log_success "startup.sh checks Redis extension"
else
    log_error "startup.sh missing Redis extension check"
fi

echo ""
echo -e "${GREEN}[SUCCESS]${NC} 🎉 Permissions and Redis test completed!"
echo ""
echo "📋 SUMMARY:"
echo "- Storage permissions: $(stat -c "%a" storage 2>/dev/null || echo "❌")"
echo "- Storage/logs permissions: $(stat -c "%a" storage/logs 2>/dev/null || echo "❌")"
echo "- laravel.log permissions: $(stat -c "%a" storage/logs/laravel.log 2>/dev/null || echo "❌")"
echo "- bootstrap/cache permissions: $(stat -c "%a" bootstrap/cache 2>/dev/null || echo "❌")"
echo "- Redis extension in nixpacks: $(grep -q "php83Extensions.redis" nixpacks.toml && echo "✅" || echo "❌")"
echo "- startup.sh permissions: $(grep -q "chmod -R 777 storage" dokploy/scripts/startup.sh && echo "✅" || echo "❌")"
echo "- startup.sh log creation: $(grep -q "touch storage/logs/laravel.log" dokploy/scripts/startup.sh && echo "✅" || echo "❌")"
echo "- startup.sh Redis check: $(grep -q "php -m | grep -q redis" dokploy/scripts/startup.sh && echo "✅" || echo "❌")"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Redeploy dengan rebuild di Dokploy Dashboard"
echo "2. Monitor logs: tail -f /var/log/supervisor/php-fpm-error.log"
echo "3. Test Laravel: curl http://localhost/"
echo "4. Check Redis: php -m | grep redis"
echo ""
echo "🎯 EXPECTED RESULT:"
echo "- Tidak ada lagi error 'Permission denied' untuk laravel.log"
echo "- Redis extension terinstall dan berfungsi"
echo "- Laravel application accessible tanpa permission errors"
