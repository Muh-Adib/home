#!/bin/bash

# Enable HTTPS Configuration
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
    echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} ⚠️ $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} ❌ $1"
}

echo "🔐 Enabling HTTPS Configuration..."

# Check if SSL certificate exists
SSL_CERT="/etc/ssl/certs/ssl-cert.pem"
SSL_KEY="/etc/ssl/private/ssl-cert.key"

if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
    log_error "SSL certificate not found"
    log_info "Generating SSL certificate first..."
    if [ -f "/usr/local/bin/ensure-ssl-cert.sh" ]; then
        /usr/local/bin/ensure-ssl-cert.sh
    else
        log_error "SSL certificate generation script not found"
        exit 1
    fi
fi

# Update environment variables for HTTPS
log_info "Updating environment variables for HTTPS..."

# Create backup of current .env
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    log_info "Created backup of current .env file"
fi

# Update .env file with HTTPS configuration
if [ -f ".env" ]; then
    # Update APP_URL to HTTPS
    sed -i 's|APP_URL=.*|APP_URL=https://app.homsjogja.com|g' .env
    
    # Update ASSET_URL to HTTPS
    sed -i 's|ASSET_URL=.*|ASSET_URL=https://app.homsjogja.com|g' .env
    
    # Enable HTTPS forcing
    sed -i 's|FORCE_HTTPS=.*|FORCE_HTTPS=true|g' .env
    
    # Enable secure cookies
    sed -i 's|SESSION_SECURE_COOKIE=.*|SESSION_SECURE_COOKIE=true|g' .env
    
    # Enable WebSocket SSL
    sed -i 's|SOCKETIO_SSL=.*|SOCKETIO_SSL=true|g' .env
    
    # Enable secure cookies
    sed -i 's|SECURE_COOKIES=.*|SECURE_COOKIES=true|g' .env
    
    log_success "Environment variables updated for HTTPS"
else
    log_warning ".env file not found, creating new one with HTTPS configuration"
    cat > .env << EOF
APP_NAME="HomsJogja"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.homsjogja.com
APP_KEY=base64:your-app-key-here
ASSET_URL=https://app.homsjogja.com
FORCE_HTTPS=true
SESSION_SECURE_COOKIE=true
SOCKETIO_SSL=true
SECURE_COOKIES=true
EOF
    log_success "Created new .env file with HTTPS configuration"
fi

# Clear Laravel cache
log_info "Clearing Laravel cache..."
if [ -d "vendor" ]; then
    php artisan config:clear 2>/dev/null || log_warning "Config clear failed"
    php artisan route:clear 2>/dev/null || log_warning "Route clear failed"
    php artisan view:clear 2>/dev/null || log_warning "View clear failed"
    php artisan cache:clear 2>/dev/null || log_warning "Cache clear failed"
    log_success "Laravel cache cleared"
else
    log_warning "Vendor directory not found, skipping Laravel cache clear"
fi

# Test HTTPS configuration
log_info "Testing HTTPS configuration..."
if [ -f "/usr/local/bin/test-https-fix.sh" ]; then
    /usr/local/bin/test-https-fix.sh
else
    log_warning "HTTPS test script not found"
fi

# Restart services if needed
log_info "HTTPS configuration enabled!"
log_info "You may need to restart your services for changes to take effect:"
echo ""
echo "  # For Docker containers:"
echo "  docker restart your-container-name"
echo ""
echo "  # For system services:"
echo "  sudo systemctl restart nginx"
echo "  sudo systemctl restart php8.2-fpm"
echo ""

log_success "HTTPS configuration completed!"
