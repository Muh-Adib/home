# Docker SSL Certificate Integration

## 📋 Overview

Dokumen ini menjelaskan integrasi SSL certificate generation dan management di Docker deployment untuk mengatasi Mixed Content Error.

## 🔧 Perubahan yang Diterapkan

### 1. Dockerfile Updates

#### Dependencies Added:
```dockerfile
# Install OpenSSL
RUN apk add --no-cache \
    # ... existing packages ...
    openssl

# Create SSL directories
RUN mkdir -p \
    # ... existing directories ...
    /etc/ssl/certs \
    /etc/ssl/private
```

#### Script Integration:
```dockerfile
# Copy SSL scripts
COPY dokploy/scripts/generate-ssl-cert.sh /usr/local/bin/generate-ssl-cert.sh
COPY dokploy/scripts/ensure-ssl-cert.sh /usr/local/bin/ensure-ssl-cert.sh
COPY dokploy/scripts/test-https-fix.sh /usr/local/bin/test-https-fix.sh

# Set executable permissions
RUN chmod +x /usr/local/bin/generate-ssl-cert.sh /usr/local/bin/ensure-ssl-cert.sh /usr/local/bin/test-https-fix.sh

# Generate SSL certificate during build
RUN /usr/local/bin/ensure-ssl-cert.sh
```

#### Port Exposure:
```dockerfile
# Expose HTTPS port
EXPOSE 80 443 3000 6001
```

### 2. SSL Certificate Scripts

#### `generate-ssl-cert.sh`
- **Purpose**: Generate basic self-signed SSL certificate
- **Features**: 
  - Creates certificate with 365 days validity
  - Sets proper permissions (644 for cert, 600 for key)
  - Includes Subject Alternative Names (SAN)

#### `ensure-ssl-cert.sh`
- **Purpose**: Comprehensive SSL certificate management
- **Features**:
  - Checks certificate existence and validity
  - Validates expiration date (warns if < 30 days)
  - Auto-generates new certificate if needed
  - Displays detailed certificate information
  - Includes SAN for multiple domains

#### `test-https-fix.sh`
- **Purpose**: Test HTTPS configuration and Mixed Content fix
- **Features**:
  - Tests SSL certificate validity
  - Checks for mixed content errors
  - Verifies security headers
  - Tests WebSocket HTTPS connection

### 3. Startup Script Integration

#### `safe-startup.sh` Updates:
```bash
# SSL Certificate Check and Generation
log_info "🔐 Checking SSL certificate..."
if [ -f "/usr/local/bin/ensure-ssl-cert.sh" ]; then
    /usr/local/bin/ensure-ssl-cert.sh
else
    # Fallback to basic check
    if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
        /usr/local/bin/generate-ssl-cert.sh
    fi
fi

# Set SSL certificate permissions
if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    chmod 644 "$SSL_CERT"
    chmod 600 "$SSL_KEY"
fi

# Test HTTPS configuration
if [ -f "/usr/local/bin/test-https-fix.sh" ]; then
    /usr/local/bin/test-https-fix.sh
fi
```

## 🚀 Deployment Workflow

### 1. Build Process
```bash
# Docker build akan otomatis:
# 1. Install OpenSSL
# 2. Copy SSL scripts
# 3. Generate SSL certificate
# 4. Set proper permissions
docker build -t homsjogja-app .
```

### 2. Container Startup
```bash
# Container startup akan otomatis:
# 1. Check SSL certificate validity
# 2. Generate new certificate jika diperlukan
# 3. Set proper permissions
# 4. Test HTTPS configuration
# 5. Start services
docker run -p 80:80 -p 443:443 homsjogja-app
```

### 3. Runtime Certificate Management
```bash
# Manual certificate check
docker exec -it container_name /usr/local/bin/ensure-ssl-cert.sh

# Manual certificate generation
docker exec -it container_name /usr/local/bin/generate-ssl-cert.sh

# Test HTTPS configuration
docker exec -it container_name /usr/local/bin/test-https-fix.sh
```

## 🔍 Certificate Information

### Certificate Details:
- **Type**: Self-signed certificate
- **Validity**: 365 days
- **Key Size**: 2048 bits RSA
- **Subject**: `/C=ID/ST=Yogyakarta/L=Yogyakarta/O=HomsJogja/OU=IT/CN=app.homsjogja.com`
- **SAN**: `app.homsjogja.com`, `localhost`, `127.0.0.1`

### File Locations:
- **Certificate**: `/etc/ssl/certs/ssl-cert.pem`
- **Private Key**: `/etc/ssl/private/ssl-cert.key`
- **Permissions**: 644 (cert), 600 (key)

## 🛡️ Security Features

### 1. Certificate Validation
- ✅ **Existence check**: Ensures certificate and key exist
- ✅ **Expiration check**: Warns if certificate expires in < 30 days
- ✅ **Auto-renewal**: Generates new certificate if invalid/expired
- ✅ **Permission validation**: Sets proper file permissions

### 2. HTTPS Configuration
- ✅ **Nginx SSL**: Configured for HTTPS on port 443
- ✅ **HTTP redirect**: All HTTP requests redirected to HTTPS
- ✅ **Security headers**: HSTS, CSP, X-Frame-Options, etc.
- ✅ **WebSocket SSL**: WebSocket connections use WSS

### 3. Mixed Content Prevention
- ✅ **Asset URLs**: All assets served via HTTPS
- ✅ **Content Security Policy**: Restricts to HTTPS only
- ✅ **URL generation**: Laravel forces HTTPS URLs
- ✅ **Middleware**: ForceHttps middleware for redirects

## 🔄 Maintenance & Monitoring

### 1. Certificate Monitoring
```bash
# Check certificate status
docker exec -it container_name openssl x509 -in /etc/ssl/certs/ssl-cert.pem -noout -dates

# Monitor certificate expiration
docker exec -it container_name /usr/local/bin/ensure-ssl-cert.sh
```

### 2. HTTPS Testing
```bash
# Test HTTPS configuration
docker exec -it container_name /usr/local/bin/test-https-fix.sh

# Test from host
curl -k https://localhost
curl -I https://localhost
```

### 3. Log Monitoring
```bash
# Check SSL-related logs
docker logs container_name | grep -i ssl
docker logs container_name | grep -i certificate
```

## 🚨 Troubleshooting

### Common Issues:

#### 1. Certificate Generation Failed
```bash
# Check OpenSSL installation
docker exec -it container_name openssl version

# Manual certificate generation
docker exec -it container_name /usr/local/bin/generate-ssl-cert.sh
```

#### 2. Permission Issues
```bash
# Fix certificate permissions
docker exec -it container_name chmod 644 /etc/ssl/certs/ssl-cert.pem
docker exec -it container_name chmod 600 /etc/ssl/private/ssl-cert.key
```

#### 3. Nginx SSL Configuration
```bash
# Check nginx configuration
docker exec -it container_name nginx -t

# Reload nginx
docker exec -it container_name nginx -s reload
```

#### 4. Mixed Content Still Appearing
```bash
# Clear browser cache
# Check asset URLs in source
# Verify environment variables
docker exec -it container_name env | grep -i https
```

## 📊 Benefits

### 1. Automated SSL Management
- ✅ **Auto-generation**: Certificates generated during build
- ✅ **Auto-validation**: Certificate validity checked at startup
- ✅ **Auto-renewal**: Expired certificates automatically replaced
- ✅ **Zero-downtime**: Certificate updates without service interruption

### 2. Security Compliance
- ✅ **HTTPS-only**: All traffic encrypted
- ✅ **Modern TLS**: TLS 1.2/1.3 support
- ✅ **Security headers**: Comprehensive security headers
- ✅ **Mixed content prevention**: No HTTP resources in HTTPS pages

### 3. Development Experience
- ✅ **Self-contained**: No external certificate management needed
- ✅ **Consistent**: Same SSL setup across environments
- ✅ **Testable**: Built-in HTTPS testing tools
- ✅ **Documented**: Clear SSL management procedures

## 🎯 Success Metrics

### Technical Metrics:
- ✅ **SSL certificate always available** at container startup
- ✅ **Zero certificate expiration** issues
- ✅ **100% HTTPS traffic** (no HTTP requests)
- ✅ **Zero mixed content errors** in browser console

### Operational Metrics:
- ✅ **Automated certificate management** (no manual intervention)
- ✅ **Consistent SSL configuration** across deployments
- ✅ **Proper security headers** implementation
- ✅ **HTTPS testing tools** available

---

**📅 Last Updated**: 2025  
**👤 Maintained By**: Development Team  
**🔄 Review Schedule**: Monthly  
**📋 Status**: ✅ Implemented & Tested
