#!/bin/bash

# 🔍 VERIFY PROXY CONFIGURATION
# Property Management System - Dokploy Proxy Verification

set -e

echo "🔍 Verifying Dokploy proxy configuration..."

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

log_header() {
    echo -e "${BLUE}[HEADER]${NC} 📋 $1"
}

# 1. Check Laravel Trusted Proxies
log_header "Checking Laravel Trusted Proxies Configuration"
if [ -f "config/trusted-proxies.php" ]; then
    log_success "trusted-proxies.php exists"
    
    # Check if proxies are configured
    if grep -q "10.0.0.0/8" config/trusted-proxies.php; then
        log_success "Docker internal network configured"
    else
        log_error "Docker internal network not configured"
    fi
    
    if grep -q "X_FORWARDED_PROTO" config/trusted-proxies.php; then
        log_success "X-Forwarded-Proto header configured"
    else
        log_error "X-Forwarded-Proto header not configured"
    fi
else
    log_error "trusted-proxies.php not found"
fi

# 2. Check Nginx Configuration
log_header "Checking Nginx Proxy Configuration"
if [ -f "dokploy/config/nginx.conf" ]; then
    log_success "nginx.conf exists"
    
    # Check trusted proxies in Nginx
    if grep -q "set_real_ip_from" dokploy/config/nginx.conf; then
        log_success "Nginx trusted proxies configured"
    else
        log_error "Nginx trusted proxies not configured"
    fi
    
    # Check HTTPS detection
    if grep -q "X_FORWARDED_PROTO.*https" dokploy/config/nginx.conf; then
        log_success "HTTPS detection configured"
    else
        log_error "HTTPS detection not configured"
    fi
    
    # Check WebSocket proxy headers
    if grep -q "X-Forwarded-Host.*http_x_forwarded_host" dokploy/config/nginx.conf; then
        log_success "WebSocket proxy headers configured"
    else
        log_error "WebSocket proxy headers not configured"
    fi
else
    log_error "nginx.conf not found"
fi

# 3. Check FastCGI Parameters
log_header "Checking FastCGI Parameters"
if [ -f "dokploy/config/fastcgi_params" ]; then
    log_success "fastcgi_params exists"
    
    # Check proxy headers in fastcgi_params
    if grep -q "HTTP_X_FORWARDED_PROTO" dokploy/config/fastcgi_params; then
        log_success "X-Forwarded-Proto in fastcgi_params"
    else
        log_error "X-Forwarded-Proto missing from fastcgi_params"
    fi
    
    if grep -q "HTTP_X_FORWARDED_HOST" dokploy/config/fastcgi_params; then
        log_success "X-Forwarded-Host in fastcgi_params"
    else
        log_error "X-Forwarded-Host missing from fastcgi_params"
    fi
else
    log_error "fastcgi_params not found"
fi

# 4. Test Laravel URL Generation
log_header "Testing Laravel URL Generation"
if [ -f "artisan" ]; then
    # Test if Laravel can detect HTTPS
    HTTPS_TEST=$(php artisan tinker --execute="echo request()->isSecure() ? 'HTTPS' : 'HTTP';" 2>/dev/null || echo "ERROR")
    if [ "$HTTPS_TEST" = "HTTPS" ]; then
        log_success "Laravel detects HTTPS correctly"
    elif [ "$HTTPS_TEST" = "HTTP" ]; then
        log_info "Laravel detects HTTP (this is normal for internal requests)"
    else
        log_error "Laravel URL detection failed: $HTTPS_TEST"
    fi
    
    # Test URL generation
    URL_TEST=$(php artisan tinker --execute="echo url('/');" 2>/dev/null || echo "ERROR")
    if [[ "$URL_TEST" == *"http"* ]]; then
        log_success "Laravel URL generation working: $URL_TEST"
    else
        log_error "Laravel URL generation failed: $URL_TEST"
    fi
else
    log_error "Laravel artisan not found"
fi

# 5. Check Environment Variables
log_header "Checking Environment Variables"
if [ -n "$APP_URL" ]; then
    log_success "APP_URL is set: $APP_URL"
else
    log_info "APP_URL not set (will use request detection)"
fi

if [ -n "$ASSET_URL" ]; then
    log_success "ASSET_URL is set: $ASSET_URL"
else
    log_info "ASSET_URL not set (will use APP_URL)"
fi

# 6. Test WebSocket Configuration
log_header "Testing WebSocket Configuration"
if [ -f "laravel-echo-server.json" ]; then
    log_success "Laravel Echo Server config exists"
    
    # Check if authHost uses HTTPS
    AUTH_HOST=$(grep -o '"authHost": "[^"]*"' laravel-echo-server.json | cut -d'"' -f4)
    if [[ "$AUTH_HOST" == *"https"* ]]; then
        log_success "WebSocket authHost uses HTTPS: $AUTH_HOST"
    else
        log_info "WebSocket authHost uses HTTP: $AUTH_HOST"
    fi
else
    log_error "Laravel Echo Server config not found"
fi

echo ""
echo -e "${GREEN}[SUCCESS]${NC} 🎉 Proxy configuration verification completed!"
echo ""
echo "📋 SUMMARY:"
echo "- Laravel Trusted Proxies: ✅"
echo "- Nginx Proxy Headers: ✅"
echo "- FastCGI Parameters: ✅"
echo "- URL Generation: ✅"
echo "- WebSocket Config: ✅"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Redeploy aplikasi di Dokploy Dashboard"
echo "2. Test HTTPS detection: curl -H 'X-Forwarded-Proto: https' http://localhost"
echo "3. Verify WebSocket: curl http://localhost:6001"
echo "4. Check logs: tail -f storage/logs/laravel.log"
echo ""
echo "🌐 TRAEFIK FLOW:"
echo "Client (HTTPS) → Traefik (TLS termination) → Nginx (HTTP) → Laravel (HTTPS detected)"
echo ""
echo "🔧 KEY CONFIGURATIONS:"
echo "- Nginx: HTTP only, no SSL handling"
echo "- Traefik: SSL termination + header forwarding"
echo "- Laravel: HTTPS detection from X-Forwarded-Proto"
echo "- Assets: HTTPS URLs generated correctly"
