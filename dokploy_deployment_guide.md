# Dokploy Deployment Guide - Separated Services with Socket.io

## 📋 Overview

Guide deployment Property Management System ke Dokploy dengan:
- ✅ **Service Separation**: Database, Redis, App, dan Socket.io terpisah
- ✅ **Traefik Labels**: Domain routing otomatis
- ✅ **Socket.io Real-time**: Notifikasi WebSocket
- ✅ **Production Ready**: Optimized untuk production

## 🏗️ Arsitektur Deployment

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MySQL DB      │    │   Redis Cache   │    │   Laravel App   │
│   (Service 1)   │    │   (Service 2)   │    │   (Service 3)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                              ┌─────────────────┐
                                              │   Socket.io     │
                                              │   (Service 4)   │
                                              └─────────────────┘
```

## 🚀 Step-by-Step Deployment

### 1. Persiapan Repository

#### A. Update Environment Variables

Buat file `.env.dokploy`:

```env
# App Configuration
APP_NAME=Homsjogja
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:2KP58EicMQP7tFSYjfXVyeBYmvrRF+62NIErENjPfck=
APP_URL=https://homsjogja.yourdomain.com

# Database (akan dikonfigurasi dari Dokploy)
DB_CONNECTION=mysql
DB_HOST=homsjogja-db
DB_PORT=3306
DB_DATABASE=homsjogja_db
DB_USERNAME=homsjogja_user
DB_PASSWORD=SecurePassword123!

# Redis (akan dikonfigurasi dari Dokploy)
REDIS_HOST=homsjogja-redis
REDIS_PASSWORD=RedisPassword123!
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_CLIENT=phpredis

# Session & Cache - GUNAKAN REDIS
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis

# Broadcasting - ENABLE untuk Socket.io
BROADCAST_DRIVER=redis
BROADCAST_CONNECTION=default

# Socket.io Configuration
ECHO_HOST_MODE=public
ECHO_HOST_PORT=6001
ECHO_DEBUG=false

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@homsjogja.com"
MAIL_FROM_NAME="${APP_NAME}"

# File Storage
FILESYSTEM_DISK=local

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=error
LOG_STACK=single

# Security
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

# Performance
OPCACHE_ENABLE=1
REDIS_PREFIX=homsjogja_
```

#### B. Buat Dokploy Configuration Files

**1. File: `dokploy.json`**

```json
{
  "version": "1.0",
  "services": {
    "database": {
      "type": "mysql",
      "version": "8.0",
      "environment": {
        "MYSQL_DATABASE": "homsjogja_db",
        "MYSQL_USER": "homsjogja_user",
        "MYSQL_PASSWORD": "SecurePassword123!",
        "MYSQL_ROOT_PASSWORD": "RootPassword123!"
      },
      "volumes": [
        "mysql_data:/var/lib/mysql"
      ],
      "networks": ["homsjogja_network"]
    },
    "redis": {
      "type": "redis",
      "version": "7-alpine",
      "environment": {
        "REDIS_PASSWORD": "RedisPassword123!"
      },
      "volumes": [
        "redis_data:/data"
      ],
      "networks": ["homsjogja_network"]
    },
    "app": {
      "type": "application",
      "build": {
        "context": ".",
        "dockerfile": "Dockerfile.dokploy"
      },
      "depends_on": ["database", "redis"],
      "networks": ["homsjogja_network"]
    },
    "websocket": {
      "type": "application", 
      "build": {
        "context": ".",
        "dockerfile": "Dockerfile.websocket"
      },
      "depends_on": ["redis"],
      "networks": ["homsjogja_network"]
    }
  }
}
```

**2. File: `Dockerfile.dokploy`**

```dockerfile
# Multi-stage Dockerfile for Dokploy Laravel App
FROM node:20-alpine AS node-builder

WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./

# Install Node dependencies
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY resources/ ./resources/
COPY public/ ./public/
RUN npm run build

# PHP Production Stage
FROM php:8.3-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    icu-dev \
    oniguruma-dev \
    mysql-client \
    redis \
    autoconf \
    g++ \
    make

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Create app user
RUN addgroup -g 1000 www && adduser -u 1000 -G www -s /bin/sh -D www

WORKDIR /var/www/html

# Copy application
COPY --chown=www:www . .
COPY --from=node-builder /app/public/build ./public/build

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Create required directories
RUN mkdir -p storage/logs storage/framework/{cache,sessions,views} \
    && chown -R www:www storage bootstrap/cache \
    && chmod -R 755 storage bootstrap/cache

# Copy configurations
COPY docker/nginx/dokploy.conf /etc/nginx/http.d/default.conf
COPY docker/supervisor/dokploy.conf /etc/supervisor.d/supervisord.conf
COPY docker/php/dokploy.ini /usr/local/etc/php/conf.d/custom.ini

# Optimize Laravel
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor.d/supervisord.conf"]
```

**3. File: `Dockerfile.websocket`**

```dockerfile
# Dockerfile untuk Laravel Echo Server (Socket.io)
FROM node:20-alpine

WORKDIR /app

# Install global packages
RUN npm install -g laravel-echo-server

# Copy configuration
COPY laravel-echo-server.dokploy.json ./laravel-echo-server.json

# Create database directory
RUN mkdir -p database && touch database/laravel-echo-server.sqlite

# Expose WebSocket port
EXPOSE 6001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:6001 || exit 1

# Start Laravel Echo Server
CMD ["laravel-echo-server", "start"]
```

**4. File: `laravel-echo-server.dokploy.json`**

```json
{
    "authHost": "https://homsjogja.yourdomain.com",
    "authEndpoint": "/broadcasting/auth", 
    "clients": [
        {
            "appId": "homsjogja",
            "key": "homsjogja_websocket_key"
        }
    ],
    "database": "redis",
    "databaseConfig": {
        "redis": {
            "host": "homsjogja-redis",
            "port": "6379",
            "password": "RedisPassword123!",
            "keyPrefix": "laravel_database_",
            "db": 0
        }
    },
    "devMode": false,
    "host": "0.0.0.0",
    "port": "6001",
    "protocol": "http",
    "socketio": {
        "transports": ["websocket", "polling"],
        "allowEIO3": true,
        "cors": {
            "origin": [
                "https://homsjogja.yourdomain.com",
                "https://ws.homsjogja.yourdomain.com"
            ],
            "methods": ["GET", "POST"],
            "credentials": true
        },
        "pingTimeout": 60000,
        "pingInterval": 25000,
        "maxHttpBufferSize": 1e6,
        "allowUpgrades": true
    },
    "sslCertPath": "",
    "sslKeyPath": "", 
    "sslCertChainPath": "",
    "sslPassphrase": "",
    "apiOriginAllow": {
        "allowCors": true,
        "allowOrigin": [
            "https://homsjogja.yourdomain.com",
            "https://ws.homsjogja.yourdomain.com"
        ],
        "allowMethods": "GET,POST,PUT,DELETE,OPTIONS",
        "allowHeaders": "Origin,Content-Type,X-Auth-Token,X-Requested-With,Accept,Authorization,X-CSRF-TOKEN,X-Socket-Id,Cookie"
    }
}
```

#### C. Docker Configuration Files

**1. File: `docker/nginx/dokploy.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/html/public;
    index index.php index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Buffer settings untuk fix "upstream sent too big header"
    fastcgi_buffers 16 64k;
    fastcgi_buffer_size 128k;
    fastcgi_busy_buffers_size 256k;
    client_header_buffer_size 4k;
    large_client_header_buffers 8 16k;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Laravel routes
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP handling
    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        
        # Timeouts
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
        
        # Buffers
        fastcgi_buffers 16 64k;
        fastcgi_buffer_size 128k;
        fastcgi_busy_buffers_size 256k;
    }

    # Static files caching
    location ~* \.(css|js|gif|jpe?g|png|svg|ico|woff2?|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Security - deny access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ /(vendor|storage|bootstrap/cache) {
        deny all;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

**2. File: `docker/supervisor/dokploy.conf`**

```ini
[supervisord]
nodaemon=true
user=root
logfile=/dev/stdout
logfile_maxbytes=0
pidfile=/var/run/supervisord.pid

[program:php-fpm]
command=/usr/local/sbin/php-fpm --nodaemonize
autostart=true
autorestart=true
priority=5
stdout_logfile=/dev/stdout
stderr_logfile=/dev/stderr
stdout_logfile_maxbytes=0
stderr_logfile_maxbytes=0
user=www

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
autostart=true
autorestart=true
priority=10
stdout_logfile=/dev/stdout
stderr_logfile=/dev/stderr
stdout_logfile_maxbytes=0
stderr_logfile_maxbytes=0

[program:queue-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/html/artisan queue:work redis --sleep=3 --tries=3 --timeout=90
directory=/var/www/html
autostart=true
autorestart=true
user=www
numprocs=2
redirect_stderr=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stopwaitsecs=60

[program:schedule]
command=/bin/sh -c "while [ true ]; do (php /var/www/html/artisan schedule:run --verbose --no-interaction &); sleep 60; done"
directory=/var/www/html
autostart=true
autorestart=true
user=www
stdout_logfile=/dev/stdout
stderr_logfile=/dev/stderr
stdout_logfile_maxbytes=0
stderr_logfile_maxbytes=0
```

**3. File: `docker/php/dokploy.ini`**

```ini
; PHP Configuration for Dokploy Production

; Memory & Performance
memory_limit = 256M
max_execution_time = 300
max_input_time = 300
post_max_size = 50M
upload_max_filesize = 50M

; Session
session.gc_maxlifetime = 7200
session.cookie_lifetime = 0
session.cookie_httponly = 1
session.cookie_secure = 1
session.use_strict_mode = 1

; Error Reporting (Production)
display_errors = Off
display_startup_errors = Off
log_errors = On
error_log = /var/log/php_errors.log

; OPcache
opcache.enable = 1
opcache.enable_cli = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 8
opcache.max_accelerated_files = 4000
opcache.revalidate_freq = 60
opcache.fast_shutdown = 1

; Realpath Cache
realpath_cache_size = 4096K
realpath_cache_ttl = 600

; File uploads
file_uploads = On
max_file_uploads = 20

; Date
date.timezone = Asia/Jakarta
```

### 2. Konfigurasi di Dokploy Dashboard

#### A. Buat Service Database (MySQL)

1. **Login ke Dokploy Dashboard**
2. **Create New Service → Database → MySQL**
3. **Configuration:**
   ```
   Service Name: homsjogja-db
   Database Name: homsjogja_db
   Username: homsjogja_user
   Password: SecurePassword123!
   Root Password: RootPassword123!
   Version: 8.0
   ```
4. **Traefik Labels:** (Tidak perlu untuk database)
5. **Deploy Database**

#### B. Buat Service Redis

1. **Create New Service → Database → Redis**
2. **Configuration:**
   ```
   Service Name: homsjogja-redis
   Password: RedisPassword123!
   Version: 7-alpine
   ```
3. **Deploy Redis**

#### C. Buat Service Laravel App

1. **Create New Service → Application**
2. **Configuration:**
   ```
   Service Name: homsjogja-app
   Repository: your-repo-url
   Branch: main
   Build Type: Dockerfile
   Dockerfile: Dockerfile.dokploy
   ```

3. **Environment Variables:**
   ```
   APP_NAME=Homsjogja
   APP_ENV=production
   APP_DEBUG=false
   APP_KEY=base64:2KP58EicMQP7tFSYjfXVyeBYmvrRF+62NIErENjPfck=
   APP_URL=https://homsjogja.yourdomain.com
   
   DB_CONNECTION=mysql
   DB_HOST=homsjogja-db
   DB_PORT=3306
   DB_DATABASE=homsjogja_db
   DB_USERNAME=homsjogja_user
   DB_PASSWORD=SecurePassword123!
   
   REDIS_HOST=homsjogja-redis
   REDIS_PASSWORD=RedisPassword123!
   REDIS_PORT=6379
   
   SESSION_DRIVER=redis
   CACHE_STORE=redis
   QUEUE_CONNECTION=redis
   BROADCAST_DRIVER=redis
   
   # Add all other environment variables...
   ```

4. **Traefik Labels:**
   ```
   traefik.enable=true
   traefik.http.routers.homsjogja-app.rule=Host(`homsjogja.yourdomain.com`)
   traefik.http.routers.homsjogja-app.entrypoints=websecure
   traefik.http.routers.homsjogja-app.tls.certresolver=letsencrypt
   traefik.http.services.homsjogja-app.loadbalancer.server.port=80
   ```

5. **Deploy Application**

#### D. Buat Service WebSocket (Socket.io)

1. **Create New Service → Application**
2. **Configuration:**
   ```
   Service Name: homsjogja-websocket
   Repository: your-repo-url  
   Branch: main
   Build Type: Dockerfile
   Dockerfile: Dockerfile.websocket
   ```

3. **Environment Variables:**
   ```
   REDIS_HOST=homsjogja-redis
   REDIS_PASSWORD=RedisPassword123!
   AUTH_HOST=https://homsjogja.yourdomain.com
   ```

4. **Traefik Labels:**
   ```
   traefik.enable=true
   traefik.http.routers.homsjogja-ws.rule=Host(`ws.homsjogja.yourdomain.com`)
   traefik.http.routers.homsjogja-ws.entrypoints=websecure
   traefik.http.routers.homsjogja-ws.tls.certresolver=letsencrypt
   traefik.http.services.homsjogja-ws.loadbalancer.server.port=6001
   
   # WebSocket headers
   traefik.http.routers.homsjogja-ws.middlewares=websocket-headers
   traefik.http.middlewares.websocket-headers.headers.customrequestheaders.Connection=upgrade
   traefik.http.middlewares.websocket-headers.headers.customrequestheaders.Upgrade=websocket
   ```

5. **Deploy WebSocket Service**

### 3. Post-Deployment Setup

#### A. Database Migration

1. **Access Laravel App Container:**
   ```bash
   # Via Dokploy console atau:
   docker exec -it homsjogja-app php artisan migrate --force
   ```

2. **Seed Database (Optional):**
   ```bash
   docker exec -it homsjogja-app php artisan db:seed --force
   ```

3. **Create Session Table:**
   ```bash
   docker exec -it homsjogja-app php artisan session:table
   docker exec -it homsjogja-app php artisan migrate --force
   ```

#### B. Test Services

1. **Test Main App:**
   ```bash
   curl -I https://homsjogja.yourdomain.com
   ```

2. **Test WebSocket:**
   ```bash
   curl -I https://ws.homsjogja.yourdomain.com
   ```

3. **Test Database Connection:**
   ```bash
   docker exec -it homsjogja-app php artisan tinker --execute="DB::connection()->getPdo(); echo 'DB Connected';"
   ```

4. **Test Redis Connection:**
   ```bash
   docker exec -it homsjogja-app php artisan tinker --execute="Redis::ping(); echo 'Redis Connected';"
   ```

### 4. Frontend Configuration Update

#### A. Update Echo Configuration

File: `resources/js/lib/echo.ts`

```typescript
import Echo from 'laravel-echo';
import io from 'socket.io-client';

// Configuration for production
const echoConfig = {
    broadcaster: 'socket.io',
    host: window.location.hostname === 'localhost' 
        ? 'http://localhost:6001'
        : 'https://ws.homsjogja.yourdomain.com',
    socketio: io,
    auth: {
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
    },
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
};

export const echo = new Echo(echoConfig);

// Connection status monitoring
echo.connector.socket.on('connect', () => {
    console.log('✅ WebSocket Connected');
});

echo.connector.socket.on('disconnect', () => {
    console.log('❌ WebSocket Disconnected');
});

echo.connector.socket.on('connect_error', (error: any) => {
    console.warn('🔄 WebSocket Connection Error:', error.message);
});

export default echo;
```

#### B. Update Environment untuk Frontend

File: `resources/js/env.ts`

```typescript
export const env = {
    APP_URL: process.env.APP_URL || window.location.origin,
    WEBSOCKET_URL: process.env.NODE_ENV === 'production' 
        ? 'https://ws.homsjogja.yourdomain.com'
        : 'http://localhost:6001',
    APP_ENV: process.env.NODE_ENV || 'development',
};
```

### 5. CI/CD Auto-Deployment

#### A. GitHub Actions Workflow

File: `.github/workflows/dokploy-deploy.yml`

```yaml
name: Deploy to Dokploy

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to Dokploy
      uses: dokploy/dokploy-action@v1
      with:
        server-url: ${{ secrets.DOKPLOY_SERVER_URL }}
        api-token: ${{ secrets.DOKPLOY_API_TOKEN }}
        service-name: homsjogja-app
        
    - name: Deploy WebSocket Service
      uses: dokploy/dokploy-action@v1
      with:
        server-url: ${{ secrets.DOKPLOY_SERVER_URL }}
        api-token: ${{ secrets.DOKPLOY_API_TOKEN }}
        service-name: homsjogja-websocket
```

### 6. Monitoring & Troubleshooting

#### A. Log Monitoring

```bash
# App logs
docker logs -f homsjogja-app

# WebSocket logs  
docker logs -f homsjogja-websocket

# Database logs
docker logs -f homsjogja-db

# Redis logs
docker logs -f homsjogja-redis
```

#### B. Health Checks

```bash
# App health
curl https://homsjogja.yourdomain.com/health

# WebSocket health
curl https://ws.homsjogja.yourdomain.com

# Database health
docker exec homsjogja-db mysqladmin ping

# Redis health
docker exec homsjogja-redis redis-cli ping
```

#### C. Performance Monitoring

1. **Setup Laravel Telescope** (Optional):
   ```bash
   composer require laravel/telescope
   php artisan telescope:install
   php artisan migrate
   ```

2. **Monitor Real-time Connections**:
   ```bash
   # Check active WebSocket connections
   docker exec homsjogja-websocket netstat -an | grep :6001
   
   # Monitor Redis connections
   docker exec homsjogja-redis redis-cli info clients
   ```

## 🎯 Production Checklist

- [ ] ✅ Database service deployed dan accessible
- [ ] ✅ Redis service deployed dan accessible  
- [ ] ✅ Laravel app deployed dengan proper environment
- [ ] ✅ WebSocket service deployed dan accessible
- [ ] ✅ Domain routing configured (Traefik labels)
- [ ] ✅ SSL certificates configured
- [ ] ✅ Database migrated dan seeded
- [ ] ✅ Session table created
- [ ] ✅ Cache dan config optimized
- [ ] ✅ Queue workers running
- [ ] ✅ WebSocket connections tested
- [ ] ✅ Real-time notifications working
- [ ] ✅ File uploads working
- [ ] ✅ Email delivery configured
- [ ] ✅ Monitoring setup
- [ ] ✅ Backup strategy implemented

## 🔧 Optimizations

### A. Performance

```env
# Laravel Optimizations
OPCACHE_ENABLE=1
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis
VIEW_CACHE_PATH=/var/www/html/storage/framework/views

# Database Optimizations  
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_unicode_ci

# Redis Optimizations
REDIS_PREFIX=homsjogja_
REDIS_DB=0
```

### B. Security

```env
# Security Headers
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
SANCTUM_STATEFUL_DOMAINS=homsjogja.yourdomain.com

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://homsjogja.yourdomain.com,https://ws.homsjogja.yourdomain.com
```

### C. Scaling

1. **Horizontal Scaling**: Add multiple app instances
2. **Database Read Replicas**: Setup MySQL read replicas
3. **Redis Cluster**: Configure Redis cluster untuk high availability
4. **CDN Integration**: Setup CloudFlare atau AWS CloudFront
5. **Load Balancing**: Configure Traefik load balancing

## 📚 References

- [Dokploy Documentation](https://dokploy.com/docs)
- [Laravel Echo Server](https://github.com/tlaverdure/laravel-echo-server)
- [Traefik Labels Guide](https://doc.traefik.io/traefik/routing/providers/docker/)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Laravel Broadcasting](https://laravel.com/docs/10.x/broadcasting)