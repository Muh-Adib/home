# Dokploy Environment Variables Solution
## Property Management System - Laravel 12 + React 18 + WebSocket

---

## 🔍 MASALAH YANG DIHADAPI

### Error yang Muncul:
```
[WARNING] Critical environment variables not set by Dokploy!
[WARNING] DB_HOST:
[WARNING] REDIS_HOST:
[WARNING] Using default values from .env file
[INFO] Environment Configuration:
[INFO] APP_URL: http://localhost
[INFO] Database: 127.0.0.1:3306 (property_management)
[INFO] Redis: 127.0.0.1:6379
```

### Penyebab:
1. **Environment variables kosong** - Container tidak menerima environment variables dari Dokploy
2. **Database connection refused** - Container tidak bisa connect ke database external
3. **Redis connection failed** - Container tidak bisa connect ke Redis external
4. **Container menggunakan default values** - `127.0.0.1:3306` dan `127.0.0.1:6379`

---

## 🛠️ SOLUSI LENGKAP

### 1. Dockerfile dengan Build Arguments

**File:** `Dockerfile.dokploy`
```dockerfile
# ==================================================
# Laravel Dokploy Production Dockerfile
# Property Management System - Laravel 12 + React 18 + WebSocket
# ==================================================

FROM php:8.2-fpm-alpine

# Set build arguments for Dokploy
ARG APP_URL
ARG DB_HOST
ARG DB_DATABASE
ARG DB_USERNAME
ARG DB_PASSWORD
ARG REDIS_HOST
ARG REDIS_PASSWORD
ARG REDIS_PORT
ARG REDIS_USERNAME

# Set environment variables for build
ENV APP_URL=$APP_URL
ENV DB_HOST=$DB_HOST
ENV DB_DATABASE=$DB_DATABASE
ENV DB_USERNAME=$DB_USERNAME
ENV DB_PASSWORD=$DB_PASSWORD
ENV REDIS_HOST=$REDIS_HOST
ENV REDIS_PASSWORD=$REDIS_PASSWORD
ENV REDIS_PORT=$REDIS_PORT
ENV REDIS_USERNAME=$REDIS_USERNAME

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    git \
    unzip \
    libzip-dev \
    oniguruma-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libxml2-dev \
    icu-dev \
    nodejs \
    npm \
    redis \
    mysql-client

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

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . .

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Install Node.js dependencies and build assets
RUN npm ci --only=production && npm run build

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 777 /var/www/html/storage \
    && chmod -R 777 /var/www/html/bootstrap/cache

# Copy configuration files
COPY docker/nginx/dokploy.conf /etc/nginx/http.d/default.conf
COPY docker/php/dokploy.ini /usr/local/etc/php/conf.d/dokploy.ini
COPY docker/supervisor/dokploy.conf /etc/supervisor.d/supervisord.conf
COPY docker/scripts/startup.sh /usr/local/bin/startup.sh

# Make startup script executable
RUN chmod +x /usr/local/bin/startup.sh

# Create Laravel Echo Server config
COPY laravel-echo-server.dokploy.json /var/www/html/laravel-echo-server.dokploy.json

# Install Laravel Echo Server globally
RUN npm install -g laravel-echo-server

# Expose ports
EXPOSE 8080 6002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start application
CMD ["/usr/local/bin/startup.sh"]
```

### 2. Build Command dengan Environment Variables

**Bash Script:** `run-dokploy-with-env.sh`
```bash
#!/bin/bash

# Environment Variables Configuration
APP_URL="https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me"
DB_HOST="homsjogja-db-xsjalx"
DB_DATABASE="homs-db"
DB_USERNAME="homs-user"
DB_PASSWORD="jD8-AKHx2gFCQ5gx3ouRJ"
REDIS_HOST="homsjogja-redis-qmihbb"
REDIS_PASSWORD="5vlcwpzc45g9mtho"
REDIS_PORT="6379"
REDIS_USERNAME="default"

# Build image with build arguments
docker build \
  --build-arg APP_URL="$APP_URL" \
  --build-arg DB_HOST="$DB_HOST" \
  --build-arg DB_DATABASE="$DB_DATABASE" \
  --build-arg DB_USERNAME="$DB_USERNAME" \
  --build-arg DB_PASSWORD="$DB_PASSWORD" \
  --build-arg REDIS_HOST="$REDIS_HOST" \
  --build-arg REDIS_PASSWORD="$REDIS_PASSWORD" \
  --build-arg REDIS_PORT="$REDIS_PORT" \
  --build-arg REDIS_USERNAME="$REDIS_USERNAME" \
  -f Dockerfile.dokploy \
  -t homsjogja:latest \
  .

# Run container with environment variables
docker run -d \
  --name homsjogja-app \
  -p 8080:8080 \
  -p 6002:6002 \
  -e APP_URL="$APP_URL" \
  -e DB_HOST="$DB_HOST" \
  -e DB_DATABASE="$DB_DATABASE" \
  -e DB_USERNAME="$DB_USERNAME" \
  -e DB_PASSWORD="$DB_PASSWORD" \
  -e REDIS_HOST="$REDIS_HOST" \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  -e REDIS_PORT="$REDIS_PORT" \
  -e REDIS_USERNAME="$REDIS_USERNAME" \
  -e APP_ENV="production" \
  -e APP_DEBUG="false" \
  -e CACHE_DRIVER="redis" \
  -e SESSION_DRIVER="redis" \
  -e QUEUE_CONNECTION="redis" \
  -e BROADCAST_CONNECTION="redis" \
  homsjogja:latest
```

**PowerShell Script:** `run-dokploy-with-env.ps1`
```powershell
# Environment Variables Configuration
$APP_URL = "https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me"
$DB_HOST = "homsjogja-db-xsjalx"
$DB_DATABASE = "homs-db"
$DB_USERNAME = "homs-user"
$DB_PASSWORD = "jD8-AKHx2gFCQ5gx3ouRJ"
$REDIS_HOST = "homsjogja-redis-qmihbb"
$REDIS_PASSWORD = "5vlcwpzc45g9mtho"
$REDIS_PORT = "6379"
$REDIS_USERNAME = "default"

# Build image with build arguments
$buildArgs = @(
    "--build-arg", "APP_URL=$APP_URL",
    "--build-arg", "DB_HOST=$DB_HOST",
    "--build-arg", "DB_DATABASE=$DB_DATABASE",
    "--build-arg", "DB_USERNAME=$DB_USERNAME",
    "--build-arg", "DB_PASSWORD=$DB_PASSWORD",
    "--build-arg", "REDIS_HOST=$REDIS_HOST",
    "--build-arg", "REDIS_PASSWORD=$REDIS_PASSWORD",
    "--build-arg", "REDIS_PORT=$REDIS_PORT",
    "--build-arg", "REDIS_USERNAME=$REDIS_USERNAME",
    "-f", "Dockerfile.dokploy",
    "-t", "homsjogja:latest",
    "."
)

docker build $buildArgs

# Run container with environment variables
$runArgs = @(
    "run", "-d",
    "--name", "homsjogja-app",
    "-p", "8080:8080",
    "-p", "6002:6002",
    "-e", "APP_URL=$APP_URL",
    "-e", "DB_HOST=$DB_HOST",
    "-e", "DB_DATABASE=$DB_DATABASE",
    "-e", "DB_USERNAME=$DB_USERNAME",
    "-e", "DB_PASSWORD=$DB_PASSWORD",
    "-e", "REDIS_HOST=$REDIS_HOST",
    "-e", "REDIS_PASSWORD=$REDIS_PASSWORD",
    "-e", "REDIS_PORT=$REDIS_PORT",
    "-e", "REDIS_USERNAME=$REDIS_USERNAME",
    "-e", "APP_ENV=production",
    "-e", "APP_DEBUG=false",
    "-e", "CACHE_DRIVER=redis",
    "-e", "SESSION_DRIVER=redis",
    "-e", "QUEUE_CONNECTION=redis",
    "-e", "BROADCAST_CONNECTION=redis",
    "homsjogja:latest"
)

docker $runArgs
```

### 3. Dokploy Configuration

**File:** `dokploy.json`
```json
{
  "name": "homsjogja",
  "environment": {
    "APP_URL": "https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me",
    "DB_HOST": "homsjogja-db-xsjalx",
    "DB_DATABASE": "homs-db",
    "DB_USERNAME": "homs-user",
    "DB_PASSWORD": "jD8-AKHx2gFCQ5gx3ouRJ",
    "REDIS_HOST": "homsjogja-redis-qmihbb",
    "REDIS_PASSWORD": "5vlcwpzc45g9mtho",
    "REDIS_PORT": "6379",
    "REDIS_USERNAME": "default",
    "APP_ENV": "production",
    "APP_DEBUG": "false",
    "CACHE_DRIVER": "redis",
    "SESSION_DRIVER": "redis",
    "QUEUE_CONNECTION": "redis",
    "BROADCAST_CONNECTION": "redis"
  }
}
```

---

## 🚀 LANGKAH-LANGKAH DEPLOYMENT

### 1. Pastikan Docker Desktop Berjalan
```bash
# Cek Docker version
docker --version

# Cek Docker status
docker info
```

### 2. Build Image dengan Environment Variables
```bash
# Linux/Mac
./run-dokploy-with-env.sh

# Windows PowerShell
.\run-dokploy-with-env.ps1
```

### 3. Manual Build (Jika Script Tidak Bisa)
```bash
# Build image
docker build \
  --build-arg APP_URL="https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me" \
  --build-arg DB_HOST="homsjogja-db-xsjalx" \
  --build-arg DB_DATABASE="homs-db" \
  --build-arg DB_USERNAME="homs-user" \
  --build-arg DB_PASSWORD="jD8-AKHx2gFCQ5gx3ouRJ" \
  --build-arg REDIS_HOST="homsjogja-redis-qmihbb" \
  --build-arg REDIS_PASSWORD="5vlcwpzc45g9mtho" \
  --build-arg REDIS_PORT="6379" \
  --build-arg REDIS_USERNAME="default" \
  -f Dockerfile.dokploy \
  -t homsjogja:latest \
  .

# Run container
docker run -d \
  --name homsjogja-app \
  -p 8080:8080 \
  -p 6002:6002 \
  -e APP_URL="https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me" \
  -e DB_HOST="homsjogja-db-xsjalx" \
  -e DB_DATABASE="homs-db" \
  -e DB_USERNAME="homs-user" \
  -e DB_PASSWORD="jD8-AKHx2gFCQ5gx3ouRJ" \
  -e REDIS_HOST="homsjogja-redis-qmihbb" \
  -e REDIS_PASSWORD="5vlcwpzc45g9mtho" \
  -e REDIS_PORT="6379" \
  -e REDIS_USERNAME="default" \
  -e APP_ENV="production" \
  -e APP_DEBUG="false" \
  -e CACHE_DRIVER="redis" \
  -e SESSION_DRIVER="redis" \
  -e QUEUE_CONNECTION="redis" \
  -e BROADCAST_CONNECTION="redis" \
  homsjogja:latest
```

### 4. Cek Container Status
```bash
# Cek container running
docker ps

# Cek logs
docker logs homsjogja-app

# Cek environment variables di container
docker exec homsjogja-app env | grep -E "(APP_URL|DB_HOST|REDIS_HOST)"
```

---

## 🔍 TROUBLESHOOTING

### Error: "docker command not found"
**Solusi:**
1. Install Docker Desktop untuk Windows
2. Start Docker Desktop
3. Restart PowerShell/Command Prompt
4. Cek dengan `docker --version`

### Error: "Build failed"
**Solusi:**
1. Pastikan semua file ada di direktori yang benar
2. Cek Dockerfile.dokploy ada
3. Cek semua dependencies terinstall
4. Cek disk space cukup

### Error: "Container failed to start"
**Solusi:**
1. Cek logs: `docker logs homsjogja-app`
2. Cek port 8080 tidak digunakan: `netstat -an | findstr 8080`
3. Cek environment variables: `docker exec homsjogja-app env`
4. Restart container: `docker restart homsjogja-app`

### Error: "Database connection refused"
**Solusi:**
1. Cek DB_HOST benar: `homsjogja-db-xsjalx`
2. Cek database service running
3. Cek network connectivity
4. Cek credentials benar

### Error: "Redis connection failed"
**Solusi:**
1. Cek REDIS_HOST benar: `homsjogja-redis-qmihbb`
2. Cek Redis service running
3. Cek network connectivity
4. Cek credentials benar

---

## 📋 CHECKLIST DEPLOYMENT

### ✅ Pre-Deployment
- [ ] Docker Desktop installed dan running
- [ ] Environment variables sudah benar
- [ ] Database service accessible
- [ ] Redis service accessible
- [ ] Port 8080 dan 6002 available

### ✅ Build Process
- [ ] Dockerfile.dokploy ada dan benar
- [ ] Build arguments passed dengan benar
- [ ] Image build successful
- [ ] No build errors

### ✅ Container Deployment
- [ ] Container start successful
- [ ] Environment variables ter-set dengan benar
- [ ] Port mapping correct (8080:8080, 6002:6002)
- [ ] Container running dan healthy

### ✅ Application Health
- [ ] Database connection successful
- [ ] Redis connection successful
- [ ] Laravel application accessible
- [ ] Health check endpoint responding
- [ ] WebSocket server running

### ✅ Post-Deployment
- [ ] Application accessible via browser
- [ ] Database migrations completed
- [ ] Storage links created
- [ ] Cache cleared and rebuilt
- [ ] Logs showing no errors

---

## 🎯 EXPECTED OUTPUT

### Successful Deployment Logs:
```
[INFO] Environment Variables Configuration:
[INFO] APP_URL: https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me
[INFO] DB_HOST: homsjogja-db-xsjalx
[INFO] REDIS_HOST: homsjogja-redis-qmihbb
[SUCCESS] Database is ready!
[SUCCESS] Redis is ready!
[SUCCESS] Application is healthy and accessible
```

### Container Status:
```
CONTAINER ID   IMAGE              COMMAND                  CREATED         STATUS         PORTS                                                                     NAMES
abc123def456   homsjogja:latest   "/usr/local/bin/start…"   2 minutes ago   Up 2 minutes   0.0.0.0:8080->8080/tcp, :::8080->8080/tcp, 0.0.0.0:6002->6002/tcp   homsjogja-app
```

### Health Check:
```
HTTP/1.1 200 OK
Content-Type: application/json
{"status":"healthy","timestamp":"2025-01-27T10:30:00Z"}
```

---

**📅 Last Updated**: 2025  
**🔄 Status**: Ready for Deployment  
**👤 Maintained By**: Development Team 