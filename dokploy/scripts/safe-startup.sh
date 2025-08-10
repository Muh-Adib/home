#!/bin/bash

# 🚀 SAFE STARTUP SCRIPT
# Property Management System - Laravel 12 + React + WebSocket
# Enhanced with proper error handling and no looping

set -euo pipefail

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
    echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} ⚠️ $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} ❌ $1"
}

# Exit function with proper error code
exit_with_error() {
    log_error "$1"
    exit 1
}

# Success exit function
exit_with_success() {
    log_success "$1"
    exit 0
}

echo "🚀 Starting Property Management System (Safe Mode)..."

# Check if we're in the right directory
if [ ! -f "artisan" ]; then
    exit_with_error "Laravel artisan not found - invalid deployment"
fi

# SSL Certificate Check and Generation
log_info "🔐 Checking SSL certificate..."
SSL_CERT="/app/ssl/ssl-cert.pem"
SSL_KEY="/app/ssl/ssl-cert.key"
SSL_CERT_SYSTEM="/etc/ssl/certs/ssl-cert.pem"
SSL_KEY_SYSTEM="/etc/ssl/private/ssl-cert.key"

if [ -f "/usr/local/bin/ensure-ssl-cert.sh" ]; then
    log_info "Running SSL certificate check and generation..."
    /usr/local/bin/ensure-ssl-cert.sh || log_warning "SSL certificate check/generation failed"
else
    log_warning "SSL certificate ensure script not found, using basic check..."
    if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
        log_warning "SSL certificate not found in persistent location, checking system location..."
        if [ -f "$SSL_CERT_SYSTEM" ] && [ -f "$SSL_KEY_SYSTEM" ]; then
            log_info "SSL certificate found in system location, copying to persistent location..."
            mkdir -p /app/ssl
            cp "$SSL_CERT_SYSTEM" "$SSL_CERT"
            cp "$SSL_KEY_SYSTEM" "$SSL_KEY"
            chmod 644 "$SSL_CERT"
            chmod 600 "$SSL_KEY"
            log_success "SSL certificate copied to persistent location"
        else
            log_warning "SSL certificate not found anywhere, generating new one..."
            if [ -f "/usr/local/bin/generate-ssl-cert.sh" ]; then
                /usr/local/bin/generate-ssl-cert.sh || log_warning "SSL certificate generation failed"
            else
                log_warning "SSL certificate generation script not found"
            fi
        fi
    else
        log_success "SSL certificate found in persistent location"
        # Check certificate expiration
        if command -v openssl >/dev/null 2>&1; then
            EXPIRY=$(openssl x509 -in "$SSL_CERT" -noout -enddate 2>/dev/null | cut -d= -f2)
            log_info "SSL certificate expires: $EXPIRY"
        fi
    fi
fi

# Ensure composer dependencies are installed if missing
if [ ! -f "vendor/autoload.php" ]; then
    log_info "🔧 vendor/autoload.php missing, running composer install..."
    export COMPOSER_ALLOW_SUPERUSER=1
    if ! composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist; then
        log_warning "Composer install failed, clearing cache and retrying..."
        composer clear-cache || true
        composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist || exit_with_error "Composer install failed"
    fi
fi

# Create necessary directories with error handling
log_info "📁 Creating necessary directories..."
mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache || exit_with_error "Failed to create storage directories"
mkdir -p /var/log/supervisor /etc/supervisor/conf.d /etc/nginx || exit_with_error "Failed to create system directories"
mkdir -p /var/log/nginx /run || exit_with_error "Failed to create log directories"
mkdir -p /etc/ssl/certs /etc/ssl/private || log_warning "Failed to create SSL directories"

# Set proper permissions with error handling
log_info "🔐 Setting proper permissions..."
chmod -R 777 storage bootstrap/cache || log_warning "Failed to set storage permissions"
chown -R www:www storage bootstrap/cache 2>/dev/null || log_warning "Failed to set ownership (may be expected in container)"

# Set SSL certificate permissions
if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    chmod 644 "$SSL_CERT" 2>/dev/null || log_warning "Failed to set SSL certificate permissions"
    chmod 600 "$SSL_KEY" 2>/dev/null || log_warning "Failed to set SSL key permissions"
    log_success "SSL certificate permissions set"
    
    # Ensure system location has the certificate for nginx
    if [ ! -f "$SSL_CERT_SYSTEM" ] || [ ! -f "$SSL_KEY_SYSTEM" ]; then
        log_info "Copying SSL certificate to system location for nginx..."
        mkdir -p /etc/ssl/certs /etc/ssl/private
        cp "$SSL_CERT" "$SSL_CERT_SYSTEM"
        cp "$SSL_KEY" "$SSL_KEY_SYSTEM"
        chmod 644 "$SSL_CERT_SYSTEM" 2>/dev/null || log_warning "Failed to set system SSL certificate permissions"
        chmod 600 "$SSL_KEY_SYSTEM" 2>/dev/null || log_warning "Failed to set system SSL key permissions"
        log_success "SSL certificate copied to system location"
    fi
fi

# Create log file with proper permissions
log_info "📝 Creating log files..."
touch storage/logs/laravel.log || exit_with_error "Failed to create log file"
chmod 666 storage/logs/laravel.log || log_warning "Failed to set log permissions"
chown www:www storage/logs/laravel.log 2>/dev/null || log_warning "Failed to set log ownership"

# Generate Laravel Echo Server config using the dedicated script
log_info "🔧 Generating Laravel Echo Server config..."
if [ -f "/usr/local/bin/generate-echo-config-simple.sh" ]; then
    log_info "Using generate-echo-config-simple.sh script from /usr/local/bin"
    bash /usr/local/bin/generate-echo-config-simple.sh || log_warning "Echo config generation failed"
elif [ -f "dokploy/scripts/generate-echo-config-simple.sh" ]; then
    log_info "Using generate-echo-config-simple.sh script from dokploy/scripts"
    bash dokploy/scripts/generate-echo-config-simple.sh || log_warning "Echo config generation failed"
else
    log_warning "generate-echo-config-simple.sh script not found"
    exit_with_error "Required echo config script not found"
fi

# Upgrade Laravel Echo Server to latest version
echo "🔧 Upgrading Laravel Echo Server..."
/usr/local/bin/upgrade-echo-server.sh

# Generate supervisor configuration
echo "🔧 Generating supervisor configuration..."
/usr/local/bin/generate-supervisor-config.sh

# Debug WebSocket if needed
if [ "${DEBUG_WEBSOCKET:-false}" = "true" ]; then
    echo "🔍 Debugging WebSocket configuration..."
    /usr/local/bin/debug-websocket.sh
fi

# Fix WebSocket issues if needed
if [ "${FIX_WEBSOCKET:-false}" = "true" ]; then
    echo "🔧 Fixing WebSocket issues..."
    /usr/local/bin/fix-websocket-issues.sh
fi

# Verify config file exists
if [ ! -f "/app/laravel-echo-server.json" ]; then
    log_warning "Laravel Echo Server config file not found in /app, checking current directory"
    if [ -f "laravel-echo-server.json" ]; then
        log_info "Config file found in current directory, copying to /app"
        cp laravel-echo-server.json /app/laravel-echo-server.json 2>/dev/null || log_warning "Failed to copy echo config to /app"
    else
        log_error "Laravel Echo Server config file not found anywhere"
        exit_with_error "Echo config file generation failed"
    fi
fi

# Run Laravel commands with proper error handling
log_info "🔧 Running Laravel setup commands..."

# Check if vendor directory exists
if [ ! -d "vendor" ]; then
    log_warning "Vendor directory not found - Laravel dependencies not installed"
    log_warning "Skipping Laravel commands until dependencies are installed"
else
    # Clear Laravel caches (non-critical)
    php artisan config:clear 2>/dev/null || log_warning "Config clear failed"
    php artisan route:clear 2>/dev/null || log_warning "Route clear failed"
    php artisan view:clear 2>/dev/null || log_warning "View clear failed"

    # Ensure public/index.php exists
    if [ ! -f "public/index.php" ]; then
        exit_with_error "Laravel index.php not found - invalid deployment"
    fi

    # Run migrations with timeout
    log_info "🔧 Running migrations..."
    timeout 300 php artisan migrate --force 2>/dev/null || log_warning "Migration failed or timed out"

    # Create storage link
    log_info "🔧 Creating storage link..."
    php artisan storage:link 2>/dev/null || log_warning "Storage link failed"

    # Cache configurations with timeout
    log_info "🔧 Caching configurations..."
    timeout 300 php artisan config:cache 2>/dev/null || log_warning "Config cache failed"
    timeout 300 php artisan route:cache 2>/dev/null || log_warning "Route cache failed"
    timeout 300 php artisan view:cache 2>/dev/null || log_warning "View cache failed"
fi

# Test Laravel application
log_info "🔧 Testing Laravel application..."
if [ -d "vendor" ]; then
    if timeout 30 php artisan --version > /dev/null 2>&1; then
        log_success "Laravel application is working"
    else
        log_warning "Laravel application test failed"
    fi

    # Test external connections with timeout
    log_info "🔍 Testing external connections..."
    if timeout 30 php artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1; then
        log_success "Database connection successful"
    else
        log_warning "Database connection failed"
    fi
else
    log_warning "Vendor directory not found - skipping Laravel application tests"
fi

# Test Redis extension and connection with timeout
log_info "🔍 Testing Redis extension and connection..."

# Check if Redis extension is loaded
if php -m | grep -q redis; then
    log_success "Redis extension installed and loaded"
    REDIS_VERSION=$(php -r "echo phpversion('redis');" 2>/dev/null || echo "unknown")
    log_info "Redis extension version: $REDIS_VERSION"
    
    # Test Redis class availability
    if timeout 10 php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';" 2>/dev/null | grep -q "OK"; then
        log_success "Redis class is available"
        
        # Test Redis connection with timeout
        log_info "🔍 Testing Redis connection to external service..."
        REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
        REDIS_PORT=${REDIS_PORT:-"6379"}
        log_info "Using Redis: ${REDIS_HOST}:${REDIS_PORT}"
        
        if timeout 30 php artisan tinker --execute="Redis::connection()->ping();" > /dev/null 2>&1; then
            log_success "Redis connection successful"
        else
            log_warning "Redis connection failed - check REDIS_HOST and REDIS_PORT"
            log_info "Current Redis config:"
            log_info "  - REDIS_HOST: ${REDIS_HOST}"
            log_info "  - REDIS_PORT: ${REDIS_PORT}"
            log_info "  - REDIS_PASSWORD: ${REDIS_PASSWORD:-'not set'}"
        fi
    else
        log_warning "Redis class not available despite extension being loaded"
    fi
else
    log_warning "Redis extension not installed or not loaded"
    log_info "Available PHP modules (first 10):"
    php -m | head -10 | tr '\n' ' '
    echo ""
fi

# Test HTTPS configuration if available
log_info "🔐 Testing HTTPS configuration..."
if [ -f "/usr/local/bin/test-https-fix.sh" ]; then
    log_info "Running HTTPS configuration test..."
    /usr/local/bin/test-https-fix.sh || log_warning "HTTPS configuration test failed"
else
    log_warning "HTTPS test script not found"
fi

log_success "Startup completed successfully!"
log_info "Starting Supervisor..."

# Start Supervisor with proper error handling
if [ -f "/etc/supervisor/conf.d/supervisord.conf" ]; then
    exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
else
    exit_with_error "Supervisor config not found"
fi
