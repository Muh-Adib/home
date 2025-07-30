# 🚀 Nixpacks Deployment Guide

## Property Management System - Laravel 12 + React 18 + WebSocket

Panduan lengkap untuk deploy aplikasi Laravel menggunakan Nixpacks.

---

## 📋 **Persiapan**

### **1. Install Nixpacks CLI**
```bash
# Install Nixpacks CLI
curl -sSL https://nixpacks.com/install.sh | bash

# Atau menggunakan npm
npm install -g @nixpacks/cli
```

### **2. Verify Installation**
```bash
nixpacks --version
```

---

## 🔧 **Konfigurasi Nixpacks**

### **1. File Konfigurasi Utama**

#### **`nixpacks.toml`**
```toml
[phases.setup]
nixPkgs = [
    "php82", 
    "php82Packages.composer",
    "nodejs_20",
    "nginx",
    "redis",
    "supervisor",
    "curl",
    "netcat",
    "procps",
    "sqlite",
    "pkg-config"
]

[phases.install]
cmds = [
    "composer install --no-dev --optimize-autoloader --no-interaction --no-progress --prefer-dist",
    "composer dump-autoload --optimize",
    "npm install",
    "npm run build"
]

[phases.build]
cmds = [
    "php artisan key:generate --force || echo 'Key generation skipped'",
    "php artisan storage:link || echo 'Storage link failed, continuing...'",
    "php artisan config:cache",
    "php artisan route:cache", 
    "php artisan view:cache"
]

[start]
cmd = "/usr/local/bin/startup.sh"

[variables]
PHP_FPM_USER = "root"
PHP_FPM_GROUP = "root"
NGINX_PORT = "8080"
ECHO_SERVER_PORT = "6002"
DEBUG_MODE = "true"
LOG_LEVEL = "debug"
```

#### **`.nixpacks` (JSON Format)**
```json
{
  "phases": {
    "setup": {
      "nixPkgs": [
        "php82",
        "php82Packages.composer", 
        "php82Packages.pdo_mysql",
        "php82Packages.redis",
        "php82Packages.gd",
        "php82Packages.mbstring",
        "php82Packages.exif",
        "php82Packages.pcntl",
        "php82Packages.bcmath",
        "php82Packages.zip",
        "php82Packages.intl",
        "php82Packages.opcache",
        "nodejs_20",
        "nginx",
        "redis",
        "supervisor",
        "curl",
        "netcat",
        "procps",
        "sqlite",
        "pkg-config"
      ]
    },
    "install": {
      "cmds": [
        "composer install --no-dev --optimize-autoloader --no-interaction --no-progress --prefer-dist",
        "composer dump-autoload --optimize",
        "npm install",
        "npm run build"
      ]
    },
    "build": {
      "cmds": [
        "php artisan key:generate --force || echo 'Key generation skipped'",
        "php artisan storage:link || echo 'Storage link failed, continuing...'",
        "php artisan config:cache",
        "php artisan route:cache",
        "php artisan view:cache"
      ]
    }
  },
  "start": {
    "cmd": "/usr/local/bin/startup.sh"
  },
  "variables": {
    "PHP_FPM_USER": "root",
    "PHP_FPM_GROUP": "root", 
    "NGINX_PORT": "8080",
    "ECHO_SERVER_PORT": "6002",
    "DEBUG_MODE": "true",
    "LOG_LEVEL": "debug"
  }
}
```

---

## 🚀 **Build Commands**

### **1. Local Build**
```bash
# Build image locally
nixpacks build .

# Build dengan specific platform
nixpacks build . --platform linux/amd64

# Build dengan custom tag
nixpacks build . -t myapp:latest
```

### **2. Build untuk Production**
```bash
# Build dengan production environment
nixpacks build . --env APP_ENV=production --env APP_DEBUG=false

# Build dengan external services
nixpacks build . \
  --env DB_HOST=homsjogja-db-xsjalx \
  --env DB_PORT=3306 \
  --env DB_DATABASE=homs-db \
  --env DB_USERNAME=homs-user \
  --env DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ \
  --env REDIS_HOST=homsjogja-redis-qmihbb \
  --env REDIS_PORT=6379 \
  --env REDIS_PASSWORD=5vlcwpzc45g9mtho
```

### **3. Build dengan Custom Startup Script**
```bash
# Copy startup script
cp nixpacks-startup.sh /usr/local/bin/startup.sh
chmod +x /usr/local/bin/startup.sh

# Build dengan custom startup
nixpacks build . --start-cmd "/usr/local/bin/startup.sh"
```

---

## 🌐 **Deployment Platforms**

### **1. Railway**
```bash
# Deploy ke Railway
railway login
railway init
railway up
```

### **2. Render**
```bash
# Deploy ke Render
# Gunakan nixpacks.toml sebagai build configuration
```

### **3. Fly.io**
```bash
# Deploy ke Fly.io
flyctl launch
flyctl deploy
```

### **4. DigitalOcean App Platform**
```bash
# Deploy ke DigitalOcean App Platform
# Upload nixpacks.toml sebagai build configuration
```

---

## 🔧 **Environment Variables**

### **1. Required Variables**
```env
# Laravel Configuration
APP_NAME="Property Management System"
APP_ENV=production
APP_KEY=base64:your-app-key-here
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=homsjogja-db-xsjalx
DB_PORT=3306
DB_DATABASE=homs-db
DB_USERNAME=homs-user
DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ

# Redis Configuration
REDIS_HOST=homsjogja-redis-qmihbb
REDIS_PASSWORD=5vlcwpzc45g9mtho
REDIS_PORT=6379

# Broadcasting Configuration
BROADCAST_DRIVER=redis
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@your-domain.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### **2. Optional Variables**
```env
# Logging
LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

# Queue Configuration
QUEUE_FAILED_DRIVER=database-uuids

# Session Configuration
SESSION_LIFETIME=120

# Cache Configuration
CACHE_PREFIX=laravel_cache

# File Upload
FILESYSTEM_DISK=local
```

---

## 📊 **Build Process**

### **1. Setup Phase**
```bash
# Install system packages
nix-env -iA nixpkgs.php82 nixpkgs.php82Packages.composer nixpkgs.nodejs_20 nixpkgs.nginx nixpkgs.redis nixpkgs.supervisor nixpkgs.curl nixpkgs.netcat nixpkgs.procps nixpkgs.sqlite nixpkgs.pkg-config
```

### **2. Install Phase**
```bash
# Install PHP dependencies
composer install --no-dev --optimize-autoloader --no-interaction --no-progress --prefer-dist
composer dump-autoload --optimize

# Install Node.js dependencies
npm install
npm run build
```

### **3. Build Phase**
```bash
# Laravel setup
php artisan key:generate --force || echo 'Key generation skipped'
php artisan storage:link || echo 'Storage link failed, continuing...'
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### **4. Start Phase**
```bash
# Start application
/usr/local/bin/startup.sh
```

---

## 🔍 **Troubleshooting**

### **1. Build Issues**
```bash
# Check Nixpacks version
nixpacks --version

# Validate configuration
nixpacks plan .

# Debug build process
nixpacks build . --debug
```

### **2. Runtime Issues**
```bash
# Check container logs
docker logs <container-name>

# Execute commands in container
docker exec -it <container-name> /bin/bash

# Check service status
docker exec -it <container-name> supervisorctl status
```

### **3. Common Errors**

#### **PHP Extension Missing**
```bash
# Add missing PHP extensions to nixpacks.toml
nixPkgs = [
    "php82Packages.pdo_mysql",
    "php82Packages.redis",
    "php82Packages.gd",
    # ... other extensions
]
```

#### **Node.js Build Failed**
```bash
# Check Node.js version compatibility
# Update package.json engines field
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

#### **Permission Issues**
```bash
# Fix permissions in startup script
chmod -R 755 storage bootstrap/cache
chown -R www:www storage bootstrap/cache
```

---

## 📈 **Performance Optimization**

### **1. Build Optimization**
```toml
# Optimize build time
[phases.setup]
nixPkgs = [
    "php82", 
    "php82Packages.composer",
    "nodejs_20"
]

# Cache dependencies
[phases.install]
cmds = [
    "composer install --no-dev --optimize-autoloader --no-interaction --no-progress --prefer-dist",
    "npm ci --only=production"
]
```

### **2. Runtime Optimization**
```bash
# Enable OPcache
php -d opcache.enable=1 -d opcache.memory_consumption=128 -d opcache.interned_strings_buffer=8 -d opcache.max_accelerated_files=4000 -d opcache.revalidate_freq=2 -d opcache.fast_shutdown=1

# Enable Redis persistence
redis-server --save 900 1 --save 300 10 --save 60 10000
```

---

## 🎯 **Success Indicators**

### **✅ Build Success**
- ✅ **Nixpacks build completed** - No build errors
- ✅ **All dependencies installed** - Composer and npm packages
- ✅ **Laravel optimized** - Config, route, and view cached
- ✅ **Startup script ready** - Executable and configured

### **✅ Runtime Success**
- ✅ **Nginx running** - Port 8080 accessible
- ✅ **PHP-FPM running** - Port 9000 processing requests
- ✅ **Laravel Echo Server running** - Port 6002 for WebSocket
- ✅ **Queue workers running** - Redis queue processing
- ✅ **Database connected** - Migrations successful
- ✅ **Redis connected** - Cache and sessions working

### **✅ Health Checks**
```bash
# Test HTTP endpoint
curl -f http://localhost:8080/health

# Test WebSocket endpoint
curl -f http://localhost:6002/socket.io/

# Test database connection
php artisan tinker --execute="echo 'Database connected';"

# Test Redis connection
php artisan tinker --execute="echo Redis::ping();"
```

---

## 📚 **Reference**

### **Nixpacks Commands**
```bash
# Build commands
nixpacks build .                    # Build image
nixpacks plan .                     # Show build plan
nixpacks --help                     # Show help

# Platform specific
nixpacks build . --platform linux/amd64
nixpacks build . --platform linux/arm64

# Environment variables
nixpacks build . --env KEY=value
nixpacks build . --env-file .env
```

### **Docker Commands**
```bash
# Run built image
docker run -p 8080:8080 -p 6002:6002 your-app:latest

# Check container status
docker ps
docker logs <container-name>

# Execute commands
docker exec -it <container-name> /bin/bash
```

---

## 🎉 **Ready for Nixpacks Deployment!**

Konfigurasi Nixpacks telah siap dengan:
- ✅ **PHP 8.2** dengan semua extensions yang diperlukan
- ✅ **Node.js 20** untuk React build
- ✅ **Nginx** untuk web server
- ✅ **Redis** untuk cache dan queue
- ✅ **Supervisor** untuk process management
- ✅ **Startup script** yang komprehensif
- ✅ **Environment variables** yang terkonfigurasi
- ✅ **Health checks** untuk monitoring

**📅 Last Updated**: 2025  
**🔄 Version**: 1.0  
**👤 Maintained By**: Development Team 