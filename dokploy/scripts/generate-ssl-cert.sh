#!/bin/bash

# Generate SSL Certificate for HTTPS
# This script creates a self-signed certificate for development/testing

set -e

echo "🔐 Generating SSL Certificate for HTTPS..."

# Create SSL directory if it doesn't exist
sudo mkdir -p /etc/ssl/certs
sudo mkdir -p /etc/ssl/private

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ssl-cert.key \
    -out /etc/ssl/certs/ssl-cert.pem \
    -subj "/C=ID/ST=Yogyakarta/L=Yogyakarta/O=HomsJogja/OU=IT/CN=app.homsjogja.com"

# Set proper permissions
sudo chmod 644 /etc/ssl/certs/ssl-cert.pem
sudo chmod 600 /etc/ssl/private/ssl-cert.key

echo "✅ SSL Certificate generated successfully!"
echo "📁 Certificate: /etc/ssl/certs/ssl-cert.pem"
echo "🔑 Private Key: /etc/ssl/private/ssl-cert.key"

# Verify certificate
echo "🔍 Verifying certificate..."
sudo openssl x509 -in /etc/ssl/certs/ssl-cert.pem -text -noout | head -20

echo "🚀 SSL Certificate is ready for HTTPS configuration!"
