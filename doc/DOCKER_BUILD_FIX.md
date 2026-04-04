# 🔧 Docker Build Fix - SQLite3 Error Resolution

## Property Management System website Homsjogja - Laravel 12 + React 18 + WebSocket

Dokumentasi untuk memperbaiki error SQLite3 saat build Docker image.

---

## 🚨 **Error yang Ditemukan**

### **Error Message:**
```
configure: error: Package requirements (sqlite3 >= 3.7.7) were not met:

Package 'sqlite3' not found

Consider adjusting the PKG_CONFIG_PATH environment variable if you
installed software in a non-standard prefix.
```

### **Root Cause:**
- Package `sqlite3` dan `sqlite-dev` tidak terinstall di Alpine Linux
- PHP extension `pdo_sqlite` memerlukan SQLite3 development headers
- `pkgconfig` tidak tersedia untuk dependency resolution

---

## ✅ **Solusi yang Diterapkan**

### **1. Menambahkan Dependencies yang Diperlukan**

```dockerfile
# Install system dependencies (termasuk Node.js untuk Laravel Echo Server)
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    wget \
    bash \
    git \
    netcat-openbsd \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    icu-dev \
    oniguruma-dev \
    mysql-client \
    postgresql-client \
    postgresql-dev \
    autoconf \
    g++ \
    make \
    pcre-dev \
    nodejs \
    npm \
    sqlite \           # ← ADDED
    sqlite-dev \       # ← ADDED
    pkgconfig          # ← ADDED
```

### **2. Cleanup yang Proper**

```dockerfile
# Clean up build tools
RUN apk del autoconf g++ make pcre-dev postgresql-dev sqlite-dev  # ← ADDED sqlite-dev
```

---

## 🔧 **Files yang Diperbaiki**

### **1. `Dockerfile.dokploy`**
```dockerfile
# BEFORE (Error):
RUN apk add --no-cache \
    # ... other packages ...
    sqlite

# AFTER (Fixed):
RUN apk add --no-cache \
    # ... other packages ...
    sqlite \
    sqlite-dev \
    pkgconfig
```

### **2. `deploy-dokploy-fixed.ps1`** (NEW)
- Script PowerShell yang diperbaiki
- Better error handling
- Detailed build output logging
- Comprehensive testing

---

## 🚀 **Cara Penggunaan**

### **1. Build dengan Script PowerShell**
```powershell
# Full deployment
.\deploy-dokploy-fixed.ps1 deploy

# Build only
.\deploy-dokploy-fixed.ps1 build

# Check status
.\deploy-dokploy-fixed.ps1 status
```

### **2. Manual Build**
```bash
# Build image
docker build -f Dockerfile.dokploy -t homsjogja-app .

# Run container
docker run -d \
  --name homsjogja-container \
  -p 8080:80 \
  -p 6001:6001 \
  homsjogja-app
```

---

## 📊 **Verifikasi Fix**

### **1. Check Dependencies**
```bash
# Inside container
docker exec -it homsjogja-container sh

# Check SQLite
sqlite3 --version

# Check PHP extensions
php -m | grep sqlite
php -m | grep pdo
```

### **2. Test PHP Extensions**
```bash
# Test PDO SQLite
docker exec homsjogja-container php -r "
try {
    \$pdo = new PDO('sqlite::memory:');
    echo '✅ PDO SQLite working\n';
} catch (Exception \$e) {
    echo '❌ PDO SQLite failed: ' . \$e->getMessage() . '\n';
}
"
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Still Getting SQLite Error**
```bash
# Check if SQLite is installed
docker exec homsjogja-container apk list | grep sqlite

# Check PHP configuration
docker exec homsjogja-container php --ini | grep sqlite
```

#### **2. Build Cache Issues**
```bash
# Clear Docker build cache
docker builder prune -f

# Build without cache
docker build --no-cache -f Dockerfile.dokploy -t homsjogja-app .
```

#### **3. Alpine Package Issues**
```bash
# Update Alpine packages
docker exec homsjogja-container apk update

# Install SQLite manually if needed
docker exec homsjogja-container apk add sqlite sqlite-dev
```

---

## 📋 **Build Process**

### **1. Node.js Stage**
```dockerfile
FROM node:20-alpine AS node-builder
# Build frontend assets
```

### **2. PHP Stage**
```dockerfile
FROM php:8.3-fpm-alpine AS php-stage
# Install system dependencies
# Install PHP extensions
# Setup Laravel Echo Server
```

### **3. Final Stage**
```dockerfile
# Copy built assets
# Install Composer dependencies
# Setup configuration
# Create startup script
```

---

## 🎯 **Success Indicators**

### **✅ Build Success**
- No SQLite3 errors during build
- All PHP extensions installed successfully
- Laravel Echo Server configuration created
- Startup script executable

### **✅ Runtime Success**
- Container starts without errors
- PHP extensions loaded correctly
- WebSocket server accessible
- Database connections working

---

## 🔧 **Additional Fixes**

### **1. Enhanced Error Handling**
```powershell
# Better error output in PowerShell script
$buildResult = docker build -f $Dockerfile -t $ImageName . 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Image built successfully"
} else {
    Write-Error "Image build failed"
    Write-ColorOutput "Build output:" $Yellow
    Write-ColorOutput $buildResult $Yellow
    exit 1
}
```

### **2. Comprehensive Testing**
```powershell
# Test all components
Test-Prerequisites
Test-ExternalServices
Build-Image
Test-Deployment
```

---

## 📚 **Reference**

### **Alpine Linux Packages**
- `sqlite` - SQLite3 runtime
- `sqlite-dev` - SQLite3 development headers
- `pkgconfig` - Package configuration tool

### **PHP Extensions**
- `pdo_sqlite` - PDO SQLite driver
- `pdo_mysql` - PDO MySQL driver
- `pdo_pgsql` - PDO PostgreSQL driver

### **Docker Commands**
```bash
# Build
docker build -f Dockerfile.dokploy -t homsjogja-app .

# Run
docker run -d --name homsjogja-container -p 8080:80 homsjogja-app

# Logs
docker logs homsjogja-container

# Shell
docker exec -it homsjogja-container sh
```

---

## 🎉 **Ready for Production!**

Error SQLite3 telah diperbaiki dengan:
- ✅ **Proper dependencies** - sqlite, sqlite-dev, pkgconfig
- ✅ **Cleanup optimization** - Remove build tools after use
- ✅ **Enhanced error handling** - Better PowerShell script
- ✅ **Comprehensive testing** - Full deployment verification

**📅 Last Updated**: 2025  
**🔄 Version**: 2.0  
**👤 Maintained By**: Development Team 