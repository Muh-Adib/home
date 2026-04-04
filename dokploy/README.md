# 🚀 DOKPLOY DEPLOYMENT PACKAGE
## Property Management System website Homsjogja - Laravel 12 + React + WebSocket

---

## 📁 **STRUKTUR FOLDER**

```
dokploy/
├── README.md                           # Dokumentasi utama
├── config/                            # File konfigurasi
│   ├── nginx.conf                     # Konfigurasi Nginx
│   ├── supervisord.conf               # Konfigurasi Supervisor
│   ├── env.nixpacks.template          # Template environment variables
│   └── laravel-echo-server.dokploy.json # Konfigurasi WebSocket
├── scripts/                           # Script utilitas
│   ├── startup.sh                     # Script startup container
│   └── check-deployment.sh            # Script verifikasi deployment
└── docs/                              # Dokumentasi lengkap
    ├── DEPLOYMENT-FINAL-SOLUTION.md   # Solusi final deployment
    ├── DEPLOYMENT-TROUBLESHOOTING.md  # Troubleshooting guide
    ├── ENVIRONMENT-VARIABLES-GUIDE.md # Panduan environment variables
    ├── NIXPACKS_DEPLOYMENT_GUIDE.md  # Panduan lengkap deployment
    └── README-NIXPACKS.md            # Quick start guide
```

**File di Root Project:**
```
nixpacks.toml                          # Konfigurasi Nixpacks
Procfile                               # Konfigurasi startup
```

---

## 🎯 **QUICK START**

### **1. Setup Environment Variables**
```bash
# Copy template dan sesuaikan dengan environment Anda
cp dokploy/config/env.nixpacks.template .env
```

### **2. Deploy ke Dokploy**
```bash
# File nixpacks.toml dan Procfile sudah di root
# Dokploy akan membaca konfigurasi secara otomatis
```

### **3. Verify Deployment**
```bash
# Jalankan script verifikasi
./dokploy/scripts/check-deployment.sh
```

---

## 🔧 **KONFIGURASI UTAMA**

### **nixpacks.toml** (di root)
```toml
[phases.setup]
nixPkgs = [
    "nginx",
    "supervisor", 
    "nodejs_20",
    "php83",
    "php83Packages.composer",
    "curl",
    "git",
    "bash"
]

[phases.install]
cmds = [
    "npm install -g laravel-echo-server@1.6.3",
    "composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-scripts",
    "npm ci --legacy-peer-deps"
]

[phases.build]
cmds = [
    "npm run build",
    "php artisan key:generate --force || echo 'Key generation skipped'",
    "php artisan storage:link || echo 'Storage link skipped'",
    "php artisan config:cache || echo 'Config cache failed'",
    "php artisan route:cache || echo 'Route cache failed'",
    "php artisan view:cache || echo 'View cache failed'",
    "mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache",
    "chmod -R 755 storage bootstrap/cache || echo 'Permission setting failed'",
    "chown -R www-data:www-data storage bootstrap/cache || echo 'Ownership setting failed'",
    "cp dokploy/config/nginx.conf /etc/nginx/nginx.conf || echo 'Nginx config copy failed'",
    "cp dokploy/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf || echo 'Supervisor config copy failed'",
    "cp dokploy/config/laravel-echo-server.dokploy.json /app/laravel-echo-server.json || echo 'Echo server config copy failed'"
]

[start]
cmd = "bash dokploy/scripts/startup.sh"
```

### **Procfile** (di root)
```
web: bash dokploy/scripts/startup.sh
```

---

## 🛠️ **SERVICES YANG BERJALAN**

### **1. Nginx** (Port 80)
- Serve Laravel public/ directory
- Proxy ke PHP-FPM
- Handle static assets (React build)
- WebSocket proxy ke port 6001

### **2. PHP-FPM** (Port 9000)
- Handle PHP requests dari Nginx
- Laravel application server

### **3. Laravel Queue Worker**
- Background job processing
- Redis queue driver

### **4. WebSocket Server** (Port 6001)
- Laravel Echo Server
- Real-time broadcasting
- Socket.IO support

---

## 📊 **ENVIRONMENT VARIABLES**

### **Database Configuration**
```env
DB_CONNECTION=mysql
DB_HOST=homsjogja-mysql-7hwczo
DB_PORT=3306
DB_DATABASE=homsjogja
DB_USERNAME=homsjogja
DB_PASSWORD=hhmnyxuowt41ghk0
```

### **Redis Configuration**
```env
REDIS_HOST=homsjogja-redis-kqzqov
REDIS_PASSWORD=tzwr97nbicqh5w6e
REDIS_PORT=6379
REDIS_DB=0
```

### **Application Configuration**
```env
APP_NAME="HomsJogja"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.yourdomain.com
APP_KEY=base64:your-generated-key
```

---

## 🔍 **VERIFICATION**

### **Check Services**
```bash
# Supervisor status
supervisorctl status

# Nginx status
curl http://localhost/health

# WebSocket status
curl http://localhost:6001

# Database connection
php artisan tinker --execute="DB::connection()->getPdo();"

# Redis connection
php artisan tinker --execute="Redis::connection()->ping();"
```

### **Check Logs**
```bash
# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Laravel logs
tail -f storage/logs/laravel.log

# Supervisor logs
tail -f /var/log/supervisor/supervisord.log
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**
1. **Build Error**: Check `nixpacks.toml` dependencies
2. **Database Connection**: Verify environment variables
3. **WebSocket Issues**: Check Laravel Echo Server config
4. **Permission Issues**: Run `chmod` commands

### **Useful Commands**
```bash
# Check deployment status
./dokploy/scripts/check-deployment.sh

# Restart services
supervisorctl restart all

# Check disk space
df -h

# Check memory usage
free -h
```

---

## 📚 **DOCUMENTATION**

### **Complete Guides**
- 📖 [DEPLOYMENT-FINAL-SOLUTION.md](docs/DEPLOYMENT-FINAL-SOLUTION.md) - Solusi final deployment
- 🔧 [DEPLOYMENT-TROUBLESHOOTING.md](docs/DEPLOYMENT-TROUBLESHOOTING.md) - Troubleshooting guide
- 🌍 [ENVIRONMENT-VARIABLES-GUIDE.md](docs/ENVIRONMENT-VARIABLES-GUIDE.md) - Environment variables guide
- 📋 [NIXPACKS_DEPLOYMENT_GUIDE.md](docs/NIXPACKS_DEPLOYMENT_GUIDE.md) - Complete deployment guide
- ⚡ [README-NIXPACKS.md](docs/README-NIXPACKS.md) - Quick start guide

---

## 🎯 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment**
- ✅ Environment variables set di Dokploy dashboard
- ✅ Database dan Redis external services ready
- ✅ Domain dan SSL certificates configured
- ✅ Traefik routing configured

### **Post-Deployment**
- ✅ All services running (4/4)
- ✅ Database connection successful
- ✅ Redis connection successful
- ✅ WebSocket functionality working
- ✅ Laravel application accessible
- ✅ React frontend loading

---

## 🔄 **UPDATE TERBARU**

### **Konfigurasi yang Diperbarui:**
- ✅ `nixpacks.toml` - Menggunakan startup script
- ✅ `Procfile` - Menggunakan startup script
- ✅ `startup.sh` - Copy konfigurasi otomatis
- ✅ Build phase - Copy file konfigurasi selama build

### **Workflow Baru:**
1. **Build Phase**: Copy konfigurasi dari `dokploy/config/`
2. **Start Phase**: Jalankan `startup.sh` untuk setup final
3. **Supervisor**: Menjalankan 4 services dengan konfigurasi yang benar

---

**🎯 FOKUS UTAMA**: 
- ✅ Single container deployment dengan Supervisor
- ✅ Nginx + PHP-FPM + Queue Worker + WebSocket
- ✅ External database dan Redis
- ✅ Comprehensive monitoring dan logging
- ✅ Production-ready configuration

**📅 Last Updated**: 2025  
**📝 Version**: 1.1  
**👤 Maintained By**: Development Team
