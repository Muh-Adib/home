#!/bin/bash

# Verify SSL Certificate in Runtime
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

echo "🔍 Verifying SSL Certificate in Runtime..."

# SSL certificate paths
SSL_CERT="/app/ssl/ssl-cert.pem"
SSL_KEY="/app/ssl/ssl-cert.key"
SSL_CERT_SYSTEM="/etc/ssl/certs/ssl-cert.pem"
SSL_KEY_SYSTEM="/etc/ssl/private/ssl-cert.key"

# Function to check file existence and permissions
check_file() {
    local file_path="$1"
    local description="$2"
    
    if [ -f "$file_path" ]; then
        log_success "$description exists: $file_path"
        
        # Check permissions
        local perms=$(stat -c "%a" "$file_path" 2>/dev/null || echo "unknown")
        log_info "  Permissions: $perms"
        
        # Check file size
        local size=$(stat -c "%s" "$file_path" 2>/dev/null || echo "unknown")
        log_info "  Size: $size bytes"
        
        return 0
    else
        log_error "$description not found: $file_path"
        return 1
    fi
}

# Function to verify certificate validity
verify_certificate() {
    local cert_file="$1"
    local description="$2"
    
    if [ ! -f "$cert_file" ]; then
        log_error "$description not found: $cert_file"
        return 1
    fi
    
    log_info "Verifying $description..."
    
    # Check certificate format
    if openssl x509 -in "$cert_file" -text -noout >/dev/null 2>&1; then
        log_success "$description format is valid"
    else
        log_error "$description format is invalid"
        return 1
    fi
    
    # Get certificate details
    local subject=$(openssl x509 -in "$cert_file" -noout -subject 2>/dev/null | sed 's/subject=//')
    local issuer=$(openssl x509 -in "$cert_file" -noout -issuer 2>/dev/null | sed 's/issuer=//')
    local expiry=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | sed 's/notAfter=//')
    local serial=$(openssl x509 -in "$cert_file" -noout -serial 2>/dev/null | sed 's/serial=//')
    
    log_info "  Subject: $subject"
    log_info "  Issuer: $issuer"
    log_info "  Valid Until: $expiry"
    log_info "  Serial Number: $serial"
    
    # Check expiration
    local expiry_timestamp=$(date -d "$expiry" +%s 2>/dev/null || echo "0")
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    if [ $days_until_expiry -lt 0 ]; then
        log_error "$description has expired"
        return 1
    elif [ $days_until_expiry -lt 30 ]; then
        log_warning "$description expires in $days_until_expiry days"
    else
        log_success "$description is valid for $days_until_expiry days"
    fi
    
    return 0
}

# Main verification
echo ""
log_info "Checking SSL certificate files..."

# Check persistent location
check_file "$SSL_CERT" "SSL Certificate (persistent)"
check_file "$SSL_KEY" "SSL Private Key (persistent)"

# Check system location
check_file "$SSL_CERT_SYSTEM" "SSL Certificate (system)"
check_file "$SSL_KEY_SYSTEM" "SSL Private Key (system)"

echo ""
log_info "Verifying certificate validity..."

# Verify certificates
verify_certificate "$SSL_CERT" "SSL Certificate (persistent)"
verify_certificate "$SSL_CERT_SYSTEM" "SSL Certificate (system)"

echo ""
log_info "Checking nginx SSL configuration..."

# Check if nginx can read the certificate
if nginx -t >/dev/null 2>&1; then
    log_success "Nginx configuration is valid"
else
    log_error "Nginx configuration is invalid"
    nginx -t 2>&1 | head -5
fi

echo ""
log_info "Testing HTTPS connectivity..."

# Test HTTPS connection
if curl -s -k https://localhost >/dev/null 2>&1; then
    log_success "HTTPS connection successful"
else
    log_warning "HTTPS connection failed (this might be expected if nginx is not running)"
fi

echo ""
log_success "SSL certificate verification completed!"

# Summary
echo ""
log_info "📋 SSL Certificate Summary:"
echo "  Persistent Location: /app/ssl/"
echo "  System Location: /etc/ssl/"
echo "  Nginx Config: /etc/nginx/nginx.conf"
echo ""
log_info "💡 If certificates are missing, run:"
echo "  /usr/local/bin/ensure-ssl-cert.sh"
