#!/bin/bash

# 🔍 DEPLOYMENT VALIDATOR
# Property Management System - Laravel 12 + React + WebSocket

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔍 Validating deployment configuration..."

# Check if we're in the right directory
if [ ! -f "nixpacks.toml" ]; then
    log_error "Script harus dijalankan dari root project directory"
    exit 1
fi

# Check required files exist
log_info "📋 Checking required configuration files..."

REQUIRED_FILES=(
    "dokploy/config/nginx.conf"
    "dokploy/config/supervisord.conf"
    "dokploy/config/php-fpm.conf"
    "dokploy/scripts/startup.sh"
    "nixpacks.toml"
)

missing_files=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "✅ Found: $file"
    else
        missing_files+=("$file")
        log_error "❌ Missing: $file"
    fi
done

# Check nixpacks.toml configuration
log_info "🔧 Checking nixpacks.toml configuration..."

# Check if artisan caching is removed from build phase
if grep -q "php artisan config:cache" nixpacks.toml; then
    log_error "❌ Artisan caching commands found in build phase - should be in runtime"
else
    log_success "✅ Artisan caching commands not in build phase"
fi

# Check if supervisor config copy is included
if grep -q "cp dokploy/config/supervisord.conf" nixpacks.toml; then
    log_success "✅ Supervisor config copy included"
else
    log_error "❌ Supervisor config copy missing"
fi

# Check startup script
log_info "🚀 Checking startup script..."

if grep -q "php artisan config:clear" dokploy/scripts/startup.sh; then
    log_success "✅ Config clear command found in startup"
else
    log_warning "⚠️ Config clear command not found in startup"
fi

if grep -q "php artisan config:cache" dokploy/scripts/startup.sh; then
    log_success "✅ Config cache command found in startup"
else
    log_warning "⚠️ Config cache command not found in startup"
fi

# Check supervisor configuration
log_info "📋 Checking supervisor configuration..."

if grep -q "php-fpm83 -F" dokploy/config/supervisord.conf; then
    log_success "✅ PHP-FPM command found in supervisor"
else
    log_error "❌ PHP-FPM command not found in supervisor"
fi

if grep -q "nginx -g \"daemon off;\"" dokploy/config/supervisord.conf; then
    log_success "✅ Nginx command found in supervisor"
else
    log_error "❌ Nginx command not found in supervisor"
fi

if grep -q "queue:work" dokploy/config/supervisord.conf; then
    log_success "✅ Queue worker found in supervisor"
else
    log_error "❌ Queue worker not found in supervisor"
fi

# Check PHP-FPM configuration
log_info "🐘 Checking PHP-FPM configuration..."

if [ -f "dokploy/config/php-fpm.conf" ]; then
    if grep -q "listen = 127.0.0.1:9000" dokploy/config/php-fpm.conf; then
        log_success "✅ PHP-FPM listen configuration found"
    else
        log_error "❌ PHP-FPM listen configuration missing"
    fi
    
    if grep -q "user = www-data" dokploy/config/php-fpm.conf; then
        log_success "✅ PHP-FPM user configuration found"
    else
        log_error "❌ PHP-FPM user configuration missing"
    fi
else
    log_error "❌ PHP-FPM configuration file missing"
fi

# Check environment variables template
log_info "🌍 Checking environment variables template..."

if [ -f "env.dokploy.template" ]; then
    log_success "✅ Environment template found"
    
    # Check required env vars in template
    REQUIRED_ENV_VARS=(
        "APP_NAME"
        "APP_ENV"
        "APP_DEBUG"
        "APP_URL"
        "APP_KEY"
        "DB_CONNECTION"
        "DB_HOST"
        "DB_DATABASE"
        "DB_USERNAME"
        "DB_PASSWORD"
        "REDIS_HOST"
        "REDIS_PASSWORD"
        "BROADCAST_DRIVER"
        "CACHE_DRIVER"
        "SESSION_DRIVER"
        "QUEUE_CONNECTION"
    )
    
    missing_env_vars=()
    for var in "${REQUIRED_ENV_VARS[@]}"; do
        if grep -q "^$var=" env.dokploy.template; then
            log_success "✅ Found: $var"
        else
            missing_env_vars+=("$var")
            log_warning "⚠️ Missing: $var"
        fi
    done
else
    log_warning "⚠️ Environment template not found"
fi

# Summary
echo ""
if [ ${#missing_files[@]} -eq 0 ]; then
    log_success "🎉 All required files are present!"
else
    log_error "❌ Missing ${#missing_files[@]} required files"
fi

echo ""
echo "📊 DEPLOYMENT VALIDATION SUMMARY:"
echo "- Required files: $((${#REQUIRED_FILES[@]} - ${#missing_files[@]}))/${#REQUIRED_FILES[@]}"
echo "- Nixpacks configuration: $(grep -q 'php artisan config:cache' nixpacks.toml && echo "❌" || echo "✅")"
echo "- Supervisor configuration: $(grep -q 'php-fpm83 -F' dokploy/config/supervisord.conf && echo "✅" || echo "❌")"
echo "- PHP-FPM configuration: $(grep -q 'listen = 127.0.0.1:9000' dokploy/config/php-fpm.conf && echo "✅" || echo "❌")"
echo "- Startup script: $(grep -q 'php artisan config:cache' dokploy/scripts/startup.sh && echo "✅" || echo "❌")"

echo ""
echo "📋 NEXT STEPS:"
echo "1. Set environment variables in Dokploy Dashboard"
echo "2. Deploy with updated configuration"
echo "3. Run ./dokploy/scripts/check-deployment.sh after deployment"
echo "4. Run ./dokploy/scripts/validate-env.sh to verify environment"
