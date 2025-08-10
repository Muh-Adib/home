#!/bin/bash

# Add HTTPS Server Block to Nginx Configuration
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

echo "🔐 Adding HTTPS Server Block to Nginx Configuration..."

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

# Backup current nginx configuration
NGINX_CONF="/etc/nginx/nginx.conf"
if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" "$NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "Backup created: $NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Create HTTPS server block configuration
HTTPS_SERVER_BLOCK="
    # HTTPS Server Block
    server {
        listen 443 ssl http2;
        server_name _;
        root /app/public;
        index index.php index.html;

        # SSL Configuration
        ssl_certificate $SSL_CERT;
        ssl_certificate_key $SSL_KEY;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers for HTTPS
        add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;
        add_header X-Frame-Options \"SAMEORIGIN\" always;
        add_header X-XSS-Protection \"1; mode=block\" always;
        add_header X-Content-Type-Options \"nosniff\" always;
        add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;
        add_header Content-Security-Policy \"default-src 'self' https: data: blob: 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:;\" always;

        # Health Check
        location /health {
            try_files /health.php =404;
            access_log off;
        }

        # Laravel Application
        location / {
            try_files \$uri \$uri/ /index.php?\$query_string;
        }

        # PHP Files
        location ~ \\.php\$ {
            fastcgi_pass php-fpm;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
            include fastcgi_params;
            fastcgi_buffers 16 16k;
            fastcgi_buffer_size 128k;
            fastcgi_busy_buffers_size 192k;
            fastcgi_temp_file_write_size 256k;
            
            # Rate limiting for API
            location ~ ^/api/ {
                limit_req zone=api burst=20 nodelay;
            }
            
            # Rate limiting for login
            location ~ ^/login {
                limit_req zone=login burst=5 nodelay;
            }
        }

        # Static Assets (React Build) - Force HTTPS
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control \"public, immutable\";
            add_header X-Content-Type-Options \"nosniff\" always;
            access_log off;
            
            # Ensure assets are served over HTTPS
            add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;
        }

        # WebSocket Proxy (HTTPS)
        location /socket.io/ {
            proxy_pass https://127.0.0.1:6001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection \"upgrade\";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_cache_bypass \$http_upgrade;
        }

        # Laravel Echo WebSocket (HTTPS)
        location /app/ {
            proxy_pass https://127.0.0.1:6001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection \"upgrade\";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_cache_bypass \$http_upgrade;
        }

        # Deny access to sensitive files
        location ~ /\\. {
            deny all;
        }

        location ~ /\\.env {
            deny all;
        }

        location ~ /\\.git {
            deny all;
        }

        # Security: Hide PHP version
        fastcgi_hide_header X-Powered-By;
    }
"

# Add HTTPS server block to nginx configuration
if [ -f "$NGINX_CONF" ]; then
    # Insert HTTPS server block before the closing brace of http block
    sed -i '/^}$/i\'"$HTTPS_SERVER_BLOCK" "$NGINX_CONF"
    log_success "HTTPS server block added to nginx configuration"
else
    log_error "Nginx configuration file not found: $NGINX_CONF"
    exit 1
fi

# Test nginx configuration
log_info "Testing nginx configuration..."
if nginx -t; then
    log_success "Nginx configuration is valid"
else
    log_error "Nginx configuration is invalid"
    log_info "Restoring backup..."
    cp "$NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)" "$NGINX_CONF"
    exit 1
fi

# Reload nginx
log_info "Reloading nginx..."
if nginx -s reload; then
    log_success "Nginx reloaded successfully"
else
    log_warning "Nginx reload failed, you may need to restart nginx manually"
fi

log_success "HTTPS server block added successfully!"
log_info "HTTPS is now available on port 443"
