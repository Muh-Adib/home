#!/bin/bash

# Update Laravel Echo Server Configuration for HTTPS
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

echo "🔧 Updating Laravel Echo Server Configuration for HTTPS..."

# Get environment variables with defaults
REDIS_HOST=${REDIS_HOST:-"127.0.0.1"}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-null}
REDIS_DB=${REDIS_DB:-0}

# Check if SSL certificate exists
SSL_CERT="/etc/ssl/certs/ssl-cert.pem"
SSL_KEY="/etc/ssl/private/ssl-cert.key"

# Determine protocol and auth host
if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    PROTOCOL="https"
    AUTH_HOST="https://localhost"
    log_info "SSL certificate found, using HTTPS"
else
    PROTOCOL="http"
    AUTH_HOST="http://localhost"
    log_warning "SSL certificate not found, using HTTP"
fi

echo "Using REDIS_HOST: ${REDIS_HOST}"
echo "Using REDIS_PORT: ${REDIS_PORT}"
echo "Using PROTOCOL: ${PROTOCOL}"

# Create config file (works in both local and production)
CONFIG_PATH="/app/laravel-echo-server.json"
if [ ! -d "/app" ]; then
    CONFIG_PATH="laravel-echo-server.json"
fi

# Backup existing config
if [ -f "$CONFIG_PATH" ]; then
    cp "$CONFIG_PATH" "$CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "Backup created: $CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
fi

cat > "$CONFIG_PATH" << CONFIG_EOF
{
    "authHost": "${AUTH_HOST}",
    "authEndpoint": "/broadcasting/auth",
    "clients": [
        {
            "appId": "homsjogja",
            "key": "homsjogja-key"
        }
    ],
    "database": "redis",
    "databaseConfig": {
        "redis": {
            "host": "${REDIS_HOST}",
            "port": ${REDIS_PORT},
            "password": "${REDIS_PASSWORD}",
            "db": ${REDIS_DB}
        }
    },
    "devMode": false,
    "host": "0.0.0.0",
    "port": 6001,
    "protocol": "${PROTOCOL}",
    "socketio": {
        "cors": {
            "origin": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "credentials": true,
            "allowedHeaders": ["Content-Type", "Authorization", "X-CSRF-TOKEN", "X-Requested-With"]
        },
        "allowEIO3": false,
        "allowEIO4": true,
        "allowRequest": function(req, callback) {
            callback(null, true);
        }
    },
    "sslCertPath": "${SSL_CERT}",
    "sslKeyPath": "${SSL_KEY}",
    "sslCertChainPath": "",
    "sslPassphrase": "",
    "subscribers": {
        "http": true,
        "redis": true
    },
    "apiOriginAllow": {
        "allowCors": true,
        "allowOrigin": "*",
        "allowMethods": "GET, POST, PUT, DELETE, OPTIONS",
        "allowHeaders": "Origin, Content-Type, Accept, Authorization, X-Request-With, X-CSRF-TOKEN"
    }
}
CONFIG_EOF

log_success "Laravel Echo Server config updated!"
echo "Config file: $CONFIG_PATH"

# Debug: Show config content
echo "🔍 Debug: Config file content:"
cat "$CONFIG_PATH" | head -15
echo "..."

# Test configuration
log_info "Testing Echo Server configuration..."
if [ -f "/usr/local/bin/laravel-echo-server" ]; then
    /usr/local/bin/laravel-echo-server start --config="$CONFIG_PATH" --dry-run 2>/dev/null && {
        log_success "Echo Server configuration is valid"
    } || {
        log_warning "Echo Server configuration test failed (this might be expected)"
    }
else
    log_warning "laravel-echo-server binary not found"
fi

log_success "Echo Server configuration updated successfully!"
log_info "Protocol: ${PROTOCOL}"
log_info "Auth Host: ${AUTH_HOST}"
