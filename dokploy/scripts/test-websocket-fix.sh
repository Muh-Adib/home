#!/bin/bash

# Test WebSocket Fix for Socket.IO v4.x
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

echo "🔧 Testing WebSocket Fix for Socket.IO v4.x..."

# Test Nginx HTTP service first
log_info "Testing Nginx HTTP service..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200\|301\|302"; then
    log_success "Nginx HTTP service is running on port 80"
    HTTP_AVAILABLE=true
    APP_URL="http://app.homsjogja.com"
else
    log_warning "Nginx HTTP service not responding on port 80"
    HTTP_AVAILABLE=false
fi

# Test Nginx HTTPS service
log_info "Testing Nginx HTTPS service..."
if curl -s -k -o /dev/null -w "%{http_code}" https://localhost:443 | grep -q "200\|301\|302"; then
    log_success "Nginx HTTPS service is running on port 443"
    HTTPS_AVAILABLE=true
    APP_URL="https://app.homsjogja.com"
else
    log_warning "Nginx HTTPS service not responding on port 443"
    HTTPS_AVAILABLE=false
fi

# Test Echo Server
log_info "Testing Laravel Echo Server..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:6001 | grep -q "200\|400\|404"; then
    log_success "Echo Server is running on port 6001"
    ECHO_AVAILABLE=true
else
    log_warning "Echo Server not responding on port 6001"
    ECHO_AVAILABLE=false
fi

# Test Echo Server HTTPS
log_info "Testing Laravel Echo Server HTTPS..."
if curl -s -k -o /dev/null -w "%{http_code}" https://localhost:6001 | grep -q "200\|400\|404"; then
    log_success "Echo Server HTTPS is running on port 6001"
    ECHO_HTTPS_AVAILABLE=true
else
    log_warning "Echo Server HTTPS not responding on port 6001"
    ECHO_HTTPS_AVAILABLE=false
fi

# Check SSL certificate
log_info "Checking SSL certificate..."
SSL_CERT="/etc/ssl/certs/ssl-cert.pem"
SSL_KEY="/etc/ssl/private/ssl-cert.key"

if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    log_success "SSL certificate found"
    SSL_AVAILABLE=true
    
    # Check certificate validity
    if command -v openssl >/dev/null 2>&1; then
        EXPIRY=$(openssl x509 -in "$SSL_CERT" -noout -enddate 2>/dev/null | cut -d= -f2)
        log_info "SSL certificate expires: $EXPIRY"
    fi
else
    log_warning "SSL certificate not found"
    SSL_AVAILABLE=false
fi

# Check Echo Server configuration
log_info "Checking Echo Server configuration..."
CONFIG_PATH="/app/laravel-echo-server.json"
if [ -f "$CONFIG_PATH" ]; then
    log_success "Echo Server config found"
    
    # Check Socket.IO version settings
    if grep -q '"allowEIO4": true' "$CONFIG_PATH"; then
        log_success "Socket.IO v4.x support enabled"
    else
        log_warning "Socket.IO v4.x support not configured"
    fi
    
    if grep -q '"allowEIO3": false' "$CONFIG_PATH"; then
        log_success "Socket.IO v3.x compatibility disabled"
    else
        log_warning "Socket.IO v3.x compatibility still enabled"
    fi
else
    log_error "Echo Server config not found"
fi

# Check package.json for Socket.IO version
log_info "Checking Socket.IO client version..."
if [ -f "package.json" ]; then
    SOCKET_VERSION=$(grep '"socket.io-client"' package.json | sed 's/.*"socket.io-client": "\([^"]*\)".*/\1/')
    log_info "Socket.IO client version: $SOCKET_VERSION"
    
    if [[ "$SOCKET_VERSION" == ^4.* ]]; then
        log_success "Socket.IO client v4.x detected"
    else
        log_warning "Socket.IO client version might be incompatible"
    fi
else
    log_warning "package.json not found"
fi

# Test WebSocket connection
log_info "Testing WebSocket connection..."
if [ "$ECHO_AVAILABLE" = true ]; then
    # Test WebSocket upgrade
    if curl -s -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:6001/socket.io/ | grep -q "websocket\|upgrade"; then
        log_success "WebSocket upgrade supported"
    else
        log_warning "WebSocket upgrade test failed"
    fi
fi

# Generate test summary
echo ""
log_info "=== WebSocket Test Summary ==="
echo "HTTP Service: $([ "$HTTP_AVAILABLE" = true ] && echo "✅ Available" || echo "❌ Not Available")"
echo "HTTPS Service: $([ "$HTTPS_AVAILABLE" = true ] && echo "✅ Available" || echo "❌ Not Available")"
echo "Echo Server: $([ "$ECHO_AVAILABLE" = true ] && echo "✅ Available" || echo "❌ Not Available")"
echo "Echo Server HTTPS: $([ "$ECHO_HTTPS_AVAILABLE" = true ] && echo "✅ Available" || echo "❌ Not Available")"
echo "SSL Certificate: $([ "$SSL_AVAILABLE" = true ] && echo "✅ Available" || echo "❌ Not Available")"
echo "Recommended APP_URL: $APP_URL"

# Recommendations
echo ""
log_info "=== Recommendations ==="
if [ "$HTTPS_AVAILABLE" = true ] && [ "$SSL_AVAILABLE" = true ]; then
    log_success "Use HTTPS for all connections"
    echo "APP_URL=https://app.homsjogja.com"
    echo "FORCE_HTTPS=true"
elif [ "$HTTP_AVAILABLE" = true ]; then
    log_warning "Use HTTP fallback"
    echo "APP_URL=http://app.homsjogja.com"
    echo "FORCE_HTTPS=false"
else
    log_error "No web service available"
fi

if [ "$ECHO_AVAILABLE" = false ]; then
    log_error "Echo Server needs to be started"
    echo "Run: laravel-echo-server start"
fi

log_success "WebSocket test completed!"
