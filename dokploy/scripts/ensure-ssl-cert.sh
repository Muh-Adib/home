#!/bin/bash

# Ensure SSL Certificate is Available and Valid
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

echo "🔐 Ensuring SSL Certificate is Available and Valid..."

# SSL certificate paths
SSL_CERT="/etc/ssl/certs/ssl-cert.pem"
SSL_KEY="/etc/ssl/private/ssl-cert.key"

# Function to check if certificate is valid
check_certificate_validity() {
    local cert_file="$1"
    
    if [ ! -f "$cert_file" ]; then
        return 1
    fi
    
    # Check if certificate is valid and not expired
    if command -v openssl >/dev/null 2>&1; then
        # Check certificate expiration
        local expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ -n "$expiry_date" ]; then
            local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
            local current_timestamp=$(date +%s)
            
            # Check if certificate expires in less than 30 days
            local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if [ $days_until_expiry -lt 0 ]; then
                log_warning "SSL certificate has expired"
                return 1
            elif [ $days_until_expiry -lt 30 ]; then
                log_warning "SSL certificate expires in $days_until_expiry days"
                return 1
            else
                log_success "SSL certificate is valid and expires in $days_until_expiry days"
                return 0
            fi
        else
            log_warning "Could not read certificate expiration date"
            return 1
        fi
    else
        log_warning "OpenSSL not available, cannot validate certificate"
        return 0
    fi
}

# Function to generate new certificate
generate_new_certificate() {
    log_info "Generating new SSL certificate..."
    
    # Create SSL directories if they don't exist
    mkdir -p /etc/ssl/certs /etc/ssl/private
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_KEY" \
        -out "$SSL_CERT" \
        -subj "/C=ID/ST=Yogyakarta/L=Yogyakarta/O=HomsJogja/OU=IT/CN=app.homsjogja.com" \
        -addext "subjectAltName=DNS:app.homsjogja.com,DNS:localhost,IP:127.0.0.1" \
        2>/dev/null || {
        log_error "Failed to generate SSL certificate"
        return 1
    }
    
    # Set proper permissions
    chmod 644 "$SSL_CERT" 2>/dev/null || log_warning "Failed to set certificate permissions"
    chmod 600 "$SSL_KEY" 2>/dev/null || log_warning "Failed to set key permissions"
    
    log_success "SSL certificate generated successfully"
    return 0
}

# Main logic
main() {
    # Check if both certificate and key exist
    if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
        log_warning "SSL certificate or key not found"
        generate_new_certificate
        return $?
    fi
    
    # Check certificate validity
    if check_certificate_validity "$SSL_CERT"; then
        log_success "SSL certificate is valid and ready"
        return 0
    else
        log_warning "SSL certificate is invalid or expired, generating new one"
        generate_new_certificate
        return $?
    fi
}

# Run main function
main

# Display certificate information
if [ -f "$SSL_CERT" ]; then
    echo ""
    log_info "SSL Certificate Information:"
    echo "  Certificate: $SSL_CERT"
    echo "  Private Key: $SSL_KEY"
    
    if command -v openssl >/dev/null 2>&1; then
        echo "  Subject: $(openssl x509 -in "$SSL_CERT" -noout -subject 2>/dev/null | sed 's/subject=//')"
        echo "  Issuer: $(openssl x509 -in "$SSL_CERT" -noout -issuer 2>/dev/null | sed 's/issuer=//')"
        echo "  Valid Until: $(openssl x509 -in "$SSL_CERT" -noout -enddate 2>/dev/null | sed 's/notAfter=//')"
        echo "  Serial Number: $(openssl x509 -in "$SSL_CERT" -noout -serial 2>/dev/null | sed 's/serial=//')"
    fi
fi

echo ""
log_success "SSL certificate check completed!"
