#!/bin/bash

# 🧪 TEST REDIS EXTERNAL SERVICE
# Property Management System website Homsjogja - Laravel 12 + React + WebSocket

set -e

echo "🧪 Testing Redis external service configuration..."

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

# 1. Test environment variables
log_info "🔧 Testing Redis environment variables..."
REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
REDIS_PORT=${REDIS_PORT:-"6379"}
REDIS_PASSWORD=${REDIS_PASSWORD:-""}
REDIS_DB=${REDIS_DB:-"0"}

echo "Current Redis configuration:"
echo "  - REDIS_HOST: ${REDIS_HOST}"
echo "  - REDIS_PORT: ${REDIS_PORT}"
echo "  - REDIS_PASSWORD: ${REDIS_PASSWORD:-'not set'}"
echo "  - REDIS_DB: ${REDIS_DB}"

if [ "$REDIS_HOST" != "127.0.0.1" ]; then
    log_success "Redis host is external service"
else
    log_error "Redis host is localhost - should be external service"
fi

# 2. Test Laravel Redis configuration
log_info "🔧 Testing Laravel Redis configuration..."
if [ -f "config/database.php" ]; then
    if grep -q "REDIS_HOST" config/database.php; then
        log_success "Laravel Redis config uses environment variables"
    else
        log_error "Laravel Redis config not using environment variables"
    fi
else
    log_error "Laravel database config not found"
fi

# 3. Test Redis extension
log_info "🔧 Testing Redis extension..."
if command -v php &> /dev/null; then
    if php -m | grep -q redis; then
        log_success "Redis extension installed"
    else
        log_error "Redis extension not installed"
    fi
else
    log_info "PHP not available locally, skipping extension check"
fi

# 4. Test startup script Redis check
log_info "🔧 Testing startup script Redis check..."
if grep -q "REDIS_HOST.*REDIS_PORT" dokploy/scripts/startup.sh; then
    log_success "Startup script checks Redis environment variables"
else
    log_error "Startup script missing Redis environment check"
fi

# 5. Test env template
log_info "🔧 Testing environment template..."
if grep -q "REDIS_HOST=homsjogja-redis" env.dokploy.template; then
    log_success "Environment template has external Redis host"
else
    log_error "Environment template missing external Redis host"
fi

# 6. Test Laravel Echo Server config
log_info "🔧 Testing Laravel Echo Server Redis config..."
if grep -q "REDIS_HOST_PLACEHOLDER" dokploy/scripts/generate-echo-config-simple.sh; then
    log_success "Laravel Echo Server uses environment variables"
else
    log_error "Laravel Echo Server not using environment variables"
fi

# 7. Test nixpacks Redis extension
log_info "🔧 Testing nixpacks Redis extension..."
if grep -q "php83Extensions.redis" nixpacks.toml; then
    log_success "Redis extension included in nixpacks"
else
    log_error "Redis extension missing from nixpacks"
fi

echo ""
echo -e "${GREEN}[SUCCESS]${NC} 🎉 Redis external service test completed!"
echo ""
echo "📋 SUMMARY:"
echo "- Redis host: $(echo $REDIS_HOST)"
echo "- Redis port: $(echo $REDIS_PORT)"
echo "- Laravel Redis config: $(grep -q "REDIS_HOST" config/database.php && echo "✅" || echo "❌")"
echo "- Redis extension: $(command -v php > /dev/null && php -m | grep -q redis && echo "✅" || echo "❌")"
echo "- Startup script check: $(grep -q "REDIS_HOST.*REDIS_PORT" dokploy/scripts/startup.sh && echo "✅" || echo "❌")"
echo "- Env template: $(grep -q "REDIS_HOST=homsjogja-redis" env.dokploy.template && echo "✅" || echo "❌")"
echo "- Echo Server config: $(grep -q "REDIS_HOST_PLACEHOLDER" dokploy/scripts/generate-echo-config-simple.sh && echo "✅" || echo "❌")"
echo "- Nixpacks extension: $(grep -q "php83Extensions.redis" nixpacks.toml && echo "✅" || echo "❌")"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Set environment variables in Dokploy Dashboard:"
echo "   - REDIS_HOST=homsjogja-redis-qmihbb"
echo "   - REDIS_PORT=6379"
echo "   - REDIS_PASSWORD=5vlcwpzc45g9mtho"
echo "   - REDIS_DB=0"
echo "2. Redeploy dengan rebuild di Dokploy Dashboard"
echo "3. Monitor logs: tail -f /var/log/supervisor/php-fpm-error.log"
echo "4. Test Redis: php artisan tinker --execute=\"Redis::connection()->ping();\""
echo ""
echo "🎯 EXPECTED RESULT:"
echo "- Redis menggunakan external service dari environment variables"
echo "- Laravel dapat connect ke external Redis"
echo "- Laravel Echo Server menggunakan external Redis"
echo "- Tidak ada lagi error 'Class Redis not found'"
