# 🔧 Nixpacks Troubleshooting Guide

## Property Management System - Laravel 12 + React 18 + WebSocket

Panduan troubleshooting untuk masalah deployment dengan Nixpacks.

---

## 🚨 **Error yang Ditemukan**

### **1. Nixpacks Config Parsing Error**
```
Error: Failed to parse Nixpacks config file `nixpacks.toml`
Caused by:
redefinition of table `phases.setup` for key `phases.setup` at line 44 column 1
```

**MASALAH**: Ada dua definisi `[phases.setup]` di file yang sama.

**SOLUSI**: Gabungkan semua konfigurasi dalam satu definisi `[phases.setup]`.

---

## ✅ **Solusi yang Diterapkan**

### **1. Fixed nixpacks.toml**
```toml
[phases.setup]
nixPkgs = [
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

### **2. Alternative .nixpacks (JSON Format)**
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

## 🔧 **Files yang Diperbaiki**

### **1. `nixpacks.toml`**
- ✅ **Removed duplicate phases.setup** - Hanya satu definisi
- ✅ **Added all PHP extensions** - Lengkap dengan semua extensions yang diperlukan
- ✅ **Simplified configuration** - Menghindari konflik parsing
- ✅ **Removed aptPkgs** - Menggunakan nixPkgs saja untuk konsistensi

### **2. `.nixpacks`**
- ✅ **JSON format** - Lebih aman dari parsing errors
- ✅ **Complete PHP extensions** - Semua extensions yang diperlukan
- ✅ **Simplified structure** - Menghindari konflik

### **3. `nixpacks-simple.toml`**
- ✅ **Alternative configuration** - Backup jika file utama bermasalah
- ✅ **Clean structure** - Tidak ada duplikasi
- ✅ **Complete dependencies** - Semua package yang diperlukan

---

## 🚀 **Build Commands**

### **1. Test Configuration**
```bash
# Validate nixpacks.toml
nixpacks plan .

# Validate .nixpacks
nixpacks plan . --config .nixpacks

# Test build locally
nixpacks build . --debug
```

### **2. Build dengan Fixed Config**
```bash
# Build dengan nixpacks.toml
nixpacks build .

# Build dengan .nixpacks
nixpacks build . --config .nixpacks

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

---

## 🔍 **Troubleshooting Steps**

### **1. Check Configuration Files**
```bash
# Check if files exist
ls -la nixpacks.toml .nixpacks nixpacks-simple.toml

# Validate TOML syntax
cat nixpacks.toml

# Validate JSON syntax
cat .nixpacks
```

### **2. Test Nixpacks Locally**
```bash
# Install nixpacks CLI
curl -sSL https://nixpacks.com/install.sh | bash

# Test configuration
nixpacks plan .

# Test build
nixpacks build . --debug
```

### **3. Alternative Configurations**
```bash
# Use JSON config
nixpacks build . --config .nixpacks

# Use simple config
cp nixpacks-simple.toml nixpacks.toml
nixpacks build .
```

---

## 📋 **Common Issues & Solutions**

### **1. TOML Parsing Errors**
```bash
# Problem: Duplicate sections
[phases.setup]
nixPkgs = [...]
[phases.setup]  # ❌ Duplicate
aptPkgs = [...]

# Solution: Combine sections
[phases.setup]
nixPkgs = [...]
aptPkgs = [...]  # ✅ Single section
```

### **2. Missing PHP Extensions**
```bash
# Add missing extensions to nixPkgs
nixPkgs = [
    "php82Packages.pdo_mysql",
    "php82Packages.redis",
    "php82Packages.gd",
    # ... other extensions
]
```

### **3. Build Failures**
```bash
# Debug build process
nixpacks build . --debug

# Check logs
docker logs <container-name>

# Test individual commands
composer install --no-dev --optimize-autoloader
npm install
npm run build
```

---

## 🎯 **Success Indicators**

### **✅ Configuration Success**
- ✅ **No parsing errors** - TOML/JSON syntax valid
- ✅ **Single phases.setup** - Tidak ada duplikasi
- ✅ **Complete dependencies** - Semua package yang diperlukan
- ✅ **Valid commands** - Semua commands bisa dijalankan

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

---

## 📚 **Reference**

### **Nixpacks Commands**
```bash
# Configuration validation
nixpacks plan .                    # Show build plan
nixpacks plan . --config .nixpacks # Use JSON config

# Build commands
nixpacks build .                   # Build with TOML config
nixpacks build . --config .nixpacks # Build with JSON config
nixpacks build . --debug           # Debug build process

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

## 🎉 **Ready for Deployment!**

Konfigurasi Nixpacks telah diperbaiki dengan:
- ✅ **Fixed parsing errors** - Tidak ada duplikasi sections
- ✅ **Complete PHP extensions** - Semua extensions yang diperlukan
- ✅ **Multiple config options** - TOML dan JSON format
- ✅ **Simplified structure** - Menghindari konflik
- ✅ **Debug capabilities** - Comprehensive troubleshooting

**📅 Last Updated**: 2025  
**🔄 Version**: 1.1  
**👤 Maintained By**: Development Team 