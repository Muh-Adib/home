# 🌐 Dokploy Proxy Configuration Guide

## 📋 Overview

Dokumen ini menjelaskan konfigurasi lengkap untuk environment Dokploy dengan internal Nginx sebagai reverse proxy ke aplikasi Laravel, dengan Traefik sebagai TLS termination layer.

## 🔄 Architecture Flow

```
Client (HTTPS) → Traefik (TLS Termination) → Nginx (HTTP) → Laravel (HTTPS Detected)
```

### Layer Responsibilities:
- **Traefik**: TLS termination, SSL certificate management, header forwarding
- **Nginx Internal**: HTTP only, reverse proxy, static file serving
- **Laravel**: Application logic, HTTPS detection from headers, asset URL generation

## ⚙️ Configuration Components

### 1. Laravel Trusted Proxies (`config/trusted-proxies.php`)

```php
<?php

return [
    'proxies' => [
        '10.0.0.0/8',     // Docker internal network
        '172.16.0.0/12',  // Docker bridge network
        '192.168.0.0/16', // Docker host network
        '127.0.0.1',      // Localhost
        '::1',            // IPv6 localhost
    ],

    'headers' => [
        Illuminate\Http\Request::HEADER_FORWARDED => 'FORWARDED',
        Illuminate\Http\Request::HEADER_X_FORWARDED_FOR => 'X_FORWARDED_FOR',
        Illuminate\Http\Request::HEADER_X_FORWARDED_HOST => 'X_FORWARDED_HOST',
        Illuminate\Http\Request::HEADER_X_FORWARDED_PORT => 'X_FORWARDED_PORT',
        Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO => 'X_FORWARDED_PROTO',
        Illuminate\Http\Request::HEADER_X_FORWARDED_AWS_ELB => 'X_FORWARDED_AWS_ELB',
    ],
];
```

### 2. Nginx Configuration (`dokploy/config/nginx.conf`)

#### Key Changes for Dokploy + Traefik:
```nginx
# HTTP Only - No SSL handling (Traefik handles SSL)
server {
    listen 80;
    server_name _;
    # No SSL configuration needed
}

# Trusted Proxies Configuration for Dokploy
set_real_ip_from 10.0.0.0/8;
set_real_ip_from 172.16.0.0/12;
set_real_ip_from 192.168.0.0/16;
set_real_ip_from 127.0.0.1;
real_ip_header X-Forwarded-For;
real_ip_recursive on;
```

#### PHP-FPM Proxy Headers:
```nginx
# Dokploy Proxy Headers - Ensure HTTPS detection from Traefik
fastcgi_param HTTP_X_FORWARDED_PROTO $http_x_forwarded_proto;
fastcgi_param HTTP_X_FORWARDED_HOST $http_x_forwarded_host;
fastcgi_param HTTP_X_FORWARDED_PORT $http_x_forwarded_port;
fastcgi_param HTTP_X_FORWARDED_FOR $http_x_forwarded_for;
fastcgi_param HTTP_X_REAL_IP $remote_addr;

# Force HTTPS detection if X-Forwarded-Proto is https
if ($http_x_forwarded_proto = "https") {
    fastcgi_param HTTPS on;
}
```

#### WebSocket Proxy Headers:
```nginx
# WebSocket Proxy
location /socket.io/ {
    proxy_pass http://127.0.0.1:6001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $http_x_forwarded_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
    proxy_set_header X-Forwarded-Host $http_x_forwarded_host;
    proxy_set_header X-Forwarded-Port $http_x_forwarded_port;
    proxy_cache_bypass $http_upgrade;
}
```

### 3. Laravel AppServiceProvider (`app/Providers/AppServiceProvider.php`)

```php
public function boot(): void
{
    // Force HTTPS URLs when X-Forwarded-Proto is https (Traefik -> Nginx -> Laravel)
    if (request()->header('x-forwarded-proto') === 'https') {
        URL::forceScheme('https');
    }
    
    // Fallback: Force HTTPS in production if APP_URL is https
    if (app()->environment('production') && 
        config('app.url') && 
        str_starts_with(config('app.url'), 'https://')) {
        URL::forceScheme('https');
    }
}
```

### 4. FastCGI Parameters (`dokploy/config/fastcgi_params`)

```nginx
# Proxy headers for Laravel
fastcgi_param HTTP_X_FORWARDED_FOR $http_x_forwarded_for;
fastcgi_param HTTP_X_FORWARDED_PROTO $http_x_forwarded_proto;
fastcgi_param HTTP_X_FORWARDED_HOST $http_x_forwarded_host;
fastcgi_param HTTP_X_FORWARDED_PORT $http_x_forwarded_port;
fastcgi_param HTTP_X_REAL_IP $remote_addr;
```

## 🔧 Environment Variables

### Required Variables:
```bash
# Laravel Configuration
APP_URL=https://yourdomain.com
ASSET_URL=https://yourdomain.com

# Dokploy will automatically set these from Traefik
# X-Forwarded-Proto: https
# X-Forwarded-Host: yourdomain.com
# X-Forwarded-Port: 443
```

### Optional Variables:
```bash
# For custom asset CDN
ASSET_URL=https://cdn.yourdomain.com

# For WebSocket configuration
LARAVEL_ECHO_SERVER_AUTH_HOST=https://yourdomain.com
```

## 🧪 Testing & Verification

### 1. Run Verification Script:
```bash
./dokploy/scripts/verify-proxy-config.sh
```

### 2. Manual Testing:
```bash
# Test HTTPS detection
curl -H 'X-Forwarded-Proto: https' -H 'X-Forwarded-Host: yourdomain.com' http://localhost

# Test WebSocket
curl http://localhost:6001

# Test Laravel URL generation
php artisan tinker --execute="echo url('/');"
```

### 3. Check Logs:
```bash
# Laravel logs
tail -f storage/logs/laravel.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Supervisor logs
tail -f /var/log/supervisor/websocket-error.log
```

## 🚀 Deployment Steps

### 1. Pre-Deployment:
- [ ] Verify `config/trusted-proxies.php` exists
- [ ] Check `dokploy/config/nginx.conf` proxy headers
- [ ] Ensure `dokploy/config/fastcgi_params` includes proxy headers
- [ ] Set environment variables in Dokploy Dashboard

### 2. Deployment:
- [ ] Deploy dengan rebuild di Dokploy Dashboard
- [ ] Monitor startup logs untuk proxy configuration
- [ ] Run verification script: `./dokploy/scripts/verify-proxy-config.sh`

### 3. Post-Deployment:
- [ ] Test HTTPS detection
- [ ] Verify WebSocket functionality
- [ ] Check asset loading (CSS/JS)
- [ ] Test URL generation in Laravel

## 🔍 Troubleshooting

### Common Issues:

#### 1. Laravel Not Detecting HTTPS
**Symptoms**: URLs generated as HTTP instead of HTTPS
**Solution**: 
- Check `config/trusted-proxies.php` exists
- Verify Nginx proxy headers in `fastcgi_params`
- Ensure `X-Forwarded-Proto: https` is passed

#### 2. WebSocket Connection Failed
**Symptoms**: WebSocket errors in browser console
**Solution**:
- Check WebSocket proxy headers in Nginx
- Verify Laravel Echo Server config
- Test WebSocket endpoint: `curl http://localhost:6001`

#### 3. Asset Loading Issues
**Symptoms**: CSS/JS files not loading
**Solution**:
- Set `ASSET_URL` environment variable
- Check Nginx static file serving
- Verify asset paths in Laravel

#### 4. Mixed Content Errors
**Symptoms**: Browser blocking HTTP resources on HTTPS page
**Solution**:
- Ensure all URLs generated as HTTPS
- Check `APP_URL` environment variable
- Verify proxy headers are working

### Debug Commands:
```bash
# Check Laravel HTTPS detection
php artisan tinker --execute="echo request()->isSecure() ? 'HTTPS' : 'HTTP';"

# Check proxy headers
php artisan tinker --execute="dd(request()->headers->all());"

# Test URL generation
php artisan tinker --execute="echo url('/'); echo asset('/css/app.css');"

# Check WebSocket config
cat laravel-echo-server.json | jq '.authHost'
```

## 📊 Monitoring

### Key Metrics to Monitor:
- HTTPS detection accuracy
- WebSocket connection success rate
- Asset loading performance
- URL generation consistency

### Log Patterns to Watch:
```bash
# Successful HTTPS detection
grep "HTTPS detected" storage/logs/laravel.log

# WebSocket connections
grep "WebSocket" storage/logs/laravel.log

# Proxy header issues
grep "X-Forwarded" /var/log/nginx/error.log
```

## 🔄 Maintenance

### Regular Checks:
- [ ] Monthly: Verify proxy configuration
- [ ] Quarterly: Update trusted proxies list
- [ ] After updates: Test HTTPS detection
- [ ] After deployment: Run verification script

### Configuration Updates:
- Update `config/trusted-proxies.php` for new networks
- Modify Nginx proxy headers as needed
- Adjust FastCGI parameters for new requirements

---

**📅 Last Updated**: 2025  
**🔄 Version**: 1.0  
**👤 Maintained By**: Development Team
