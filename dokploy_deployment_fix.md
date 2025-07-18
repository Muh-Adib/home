# Dokploy Laravel Deployment Fix Guide

## 🚨 Analisis Masalah

### Error yang Terjadi:
```
upstream sent too big header while reading response header from upstream
```

### Penyebab Utama:
1. **Session Driver Cookie**: Laravel menggunakan `SESSION_DRIVER=file` yang menyimpan session data dalam cookies
2. **Environment Variables**: Banyak environment variables yang tidak di-set menyebabkan warning berlebihan
3. **Nginx Buffer Size**: Default buffer size di nixpacks terlalu kecil untuk menangani header Laravel yang besar
4. **Debug Mode**: `APP_DEBUG=true` menghasilkan output yang lebih besar

## 🔧 Solusi Utama

### 1. Perbaikan Environment Variables (WAJIB)

Tambahkan environment variables yang hilang untuk menghilangkan warning:

```env
# Core App Settings
APP_NAME=Homsjogja
APP_ENV=production
APP_KEY=base64:2KP58EicMQP7tFSYjfXVyeBYmvrRF+62NIErENjPfck=
APP_DEBUG=false  # UBAH DARI true KE false
APP_URL=https://homsjogja-testlaravel-jc5ygn-c6322f-213-210-36-24.traefik.me

# Database
DB_CONNECTION=mysql
DB_HOST=homsjogja-db-xsjalx
DB_PORT=3306
DB_DATABASE=homs-db
DB_USERNAME=homs-user
DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ

# Session - UBAH KE DATABASE/REDIS
SESSION_DRIVER=database  # Ganti dari 'file' ke 'database'
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

# Cache & Queue
CACHE_STORE=redis  # Gunakan Redis untuk cache
QUEUE_CONNECTION=sync

# Redis Configuration
REDIS_HOST=homsjogja-redis-qmihbb
REDIS_PASSWORD=5vlcwpzc45g9mtho
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_CLIENT=phpredis
REDIS_URL=redis://default:5vlcwpzc45g9mtho@homsjogja-redis-qmihbb:6379

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

# Broadcast & Filesystem
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local

# Set empty values untuk environment yang tidak digunakan
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_HOST=
ABLY_KEY=

# Database Cache
DB_CACHE_CONNECTION=
DB_CACHE_LOCK_CONNECTION=
DB_CACHE_LOCK_TABLE=

# Memcached (not used)
MEMCACHED_PERSISTENT_ID=
MEMCACHED_USERNAME=
MEMCACHED_PASSWORD=

# AWS (not used in this setup)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false
AWS_URL=
AWS_ENDPOINT=
DYNAMODB_ENDPOINT=

# Database URLs
DB_URL=

# MySQL SSL
MYSQL_ATTR_SSL_CA=

# Logging
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error  # Ubah dari debug ke error
LOG_DEPRECATIONS_CHANNEL=null
LOG_SLACK_WEBHOOK_URL=
LOG_STDERR_FORMATTER=
PAPERTRAIL_URL=
PAPERTRAIL_PORT=

# Mail additional
MAIL_URL=
MAIL_LOG_CHANNEL=
POSTMARK_TOKEN=
POSTMARK_MESSAGE_STREAM_ID=
RESEND_KEY=

# Queue additional
DB_QUEUE_CONNECTION=
SQS_SUFFIX=

# Slack
SLACK_BOT_USER_OAUTH_TOKEN=
SLACK_BOT_USER_DEFAULT_CHANNEL=

# Session additional
SESSION_CONNECTION=
SESSION_STORE=
SESSION_SECURE_COOKIE=

# Vite
VITE_APP_NAME="${APP_NAME}"
```

### 2. Buat Nginx Configuration Override

Buat file `.dokploy/nginx.conf` di root project:

```nginx
# .dokploy/nginx.conf
server {
    listen 80;
    server_name _;
    
    # Increase buffer sizes untuk fix "upstream sent too big header"
    fastcgi_buffers 16 64k;
    fastcgi_buffer_size 128k;
    fastcgi_busy_buffers_size 256k;
    
    # Client header buffers
    client_header_buffer_size 4k;
    large_client_header_buffers 8 16k;
    
    # Proxy buffers (jika menggunakan proxy)
    proxy_buffer_size 128k;
    proxy_buffers 8 128k;
    proxy_busy_buffers_size 256k;
    
    root /app/public;
    index index.php index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Handle Laravel routes
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    # PHP-FPM configuration
    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        
        # Increase timeouts
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
        
        # Buffer settings untuk PHP
        fastcgi_buffers 16 64k;
        fastcgi_buffer_size 128k;
        fastcgi_busy_buffers_size 256k;
    }
    
    # Static files
    location ~* \.(css|js|gif|jpe?g|png|svg|ico|woff2?|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ /(vendor|storage|bootstrap/cache) {
        deny all;
    }
}
```

### 3. Buat Dockerfile Custom (Opsional tapi Disarankan)

Buat `Dockerfile` untuk override nixpacks:

```dockerfile
# Dockerfile
FROM ghcr.io/railwayapp/nixpacks:ubuntu-latest

# Copy custom nginx config
COPY .dokploy/nginx.conf /etc/nginx/sites-available/default

# Install additional packages if needed
RUN apt-get update && apt-get install -y \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy application
COPY . /app
WORKDIR /app

# Install composer dependencies
RUN composer install --no-dev --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data /app/storage /app/bootstrap/cache

# Build assets
RUN npm ci && npm run build

# Start services
CMD ["sh", "-c", "nginx && php-fpm"]
```

### 4. Setup Database Session Table

Jalankan migration untuk session table:

```bash
# Di local atau melalui Dokploy console
php artisan session:table
php artisan migrate
```

### 5. Buat dokploy.json Configuration

```json
{
  "services": [
    {
      "name": "laravel-app",
      "buildCommand": "composer install --no-dev --optimize-autoloader && npm ci && npm run build",
      "startCommand": "php artisan config:cache && php artisan route:cache && php artisan view:cache && php-fpm & nginx -g 'daemon off;'",
      "environment": {
        "APP_ENV": "production",
        "APP_DEBUG": "false"
      }
    }
  ]
}
```

## 🚀 Best Practices untuk Production

### 1. Optimization Commands

Tambahkan di start command atau buat script:

```bash
#!/bin/bash
# optimize.sh
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan optimize
```

### 2. Security Checklist

```env
# Security settings
APP_DEBUG=false
APP_ENV=production
SESSION_SECURE_COOKIE=true  # Jika menggunakan HTTPS
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
```

### 3. Performance Settings

```env
# Performance optimization
CACHE_STORE=redis
SESSION_DRIVER=redis  # Atau database
QUEUE_CONNECTION=redis
REDIS_CLIENT=phpredis

# Database optimization
DB_CACHE_CONNECTION=redis
```

### 4. Monitoring & Logging

```env
# Production logging
LOG_CHANNEL=stack
LOG_LEVEL=error
LOG_STACK=single,slack  # Jika ada slack integration
```

## 🔍 Troubleshooting Additional

### Jika Masih Error 502:

1. **Check Container Logs**:
```bash
dokploy logs <app-name>
```

2. **Verify Environment Variables**:
```bash
# Di container
printenv | grep -E "(APP_|DB_|SESSION_)"
```

3. **Test Database Connection**:
```bash
# Di container
php artisan tinker
# Test: DB::connection()->getPdo();
```

4. **Check Nginx Configuration**:
```bash
# Di container
nginx -t
```

### Common Issues:

1. **Session Table Missing**: Jalankan `php artisan session:table && php artisan migrate`
2. **Redis Connection**: Pastikan Redis credentials benar
3. **File Permissions**: Set proper permissions untuk storage
4. **Cache Issues**: Clear all caches dengan `php artisan optimize:clear`

## 📝 Checklist Deployment

- [ ] Set `APP_DEBUG=false`
- [ ] Set `SESSION_DRIVER=database` atau `redis`
- [ ] Set `CACHE_STORE=redis`
- [ ] Tambahkan semua environment variables yang hilang
- [ ] Buat session table (`php artisan session:table`)
- [ ] Test Redis connection
- [ ] Configure nginx buffer sizes
- [ ] Set proper file permissions
- [ ] Test deployment

## 🎯 Expected Results

Setelah implementasi:
- ✅ Error 502 hilang
- ✅ Warning environment variables hilang
- ✅ Response time lebih cepat
- ✅ Session handling yang lebih efficient
- ✅ Production-ready security settings

## 📚 References

- [Laravel Session Configuration](https://laravel.com/docs/10.x/session)
- [Nginx Buffer Tuning](https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html)
- [Dokploy Documentation](https://dokploy.com/docs)