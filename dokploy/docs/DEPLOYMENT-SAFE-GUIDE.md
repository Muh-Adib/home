# 🛡️ DEPLOYMENT SAFE GUIDE
## Property Management System website Homsjogja - Laravel 12 + React + WebSocket

---

## ✅ **PERBAIKAN YANG SUDAH DITERAPKAN**

### **1. Environment Variables Runtime Fix**
**❌ Masalah Sebelumnya:**
- `php artisan config:cache` dijalankan di build phase
- Environment variables tidak tersedia saat build
- Laravel menggunakan default values

**✅ Solusi:**
- Hapus semua artisan caching dari `nixpacks.toml` build phase
- Pindahkan ke `startup.sh` runtime
- Environment variables akan terbaca dengan benar

### **2. Supervisor Configuration Fix**
**❌ Masalah Sebelumnya:**
- Supervisor error "could not find config file"
- File konfigurasi tidak ter-copy dengan benar
- Service startup gagal

**✅ Solusi:**
- Pastikan semua config files ada di repo
- Copy config files di build phase
- Simplified supervisor configuration
- Proper service priorities

### **3. PHP-FPM Configuration**
**❌ Masalah Sebelumnya:**
- PHP-FPM menggunakan default config
- Tidak ada proper user/group settings
- Memory limits tidak optimal

**✅ Solusi:**
- Custom PHP-FPM configuration
- Proper user/group settings (www-data)
- Optimized memory and performance settings
- Clear environment variables handling

---

## 🚀 **DEPLOYMENT PROCESS YANG AMAN**

### **Step 1: Pre-Deployment Validation**
```bash
# Run deployment validator
./dokploy/scripts/deployment-validator.sh

# Expected output:
# ✅ All required files are present!
# ✅ Nixpacks configuration: ✅
# ✅ Supervisor configuration: ✅
# ✅ PHP-FPM configuration: ✅
# ✅ Startup script: ✅
```

### **Step 2: Environment Variables Setup**
**Di Dokploy Dashboard:**

1. **Login ke Dokploy Dashboard**
2. **Pilih project/applicasi**
3. **Buka tab "Environment Variables"**
4. **Hapus semua variables yang ada**
5. **Tambah satu per satu dengan format yang benar:**

```env
# Application Configuration
APP_NAME=HomsJogja
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com
APP_KEY=base64:your-generated-key-here

# Database Configuration (External MySQL)
DB_CONNECTION=mysql
DB_HOST=your-mysql-host
DB_PORT=3306
DB_DATABASE=your-database-name
DB_USERNAME=your-username
DB_PASSWORD=your-password

# Redis Configuration (External Redis)
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password
REDIS_PORT=6379
REDIS_DB=0

# Broadcasting Configuration (WebSocket)
BROADCAST_DRIVER=redis
BROADCAST_CONNECTION=default

# Cache Configuration
CACHE_DRIVER=redis
CACHE_PREFIX=homsjogja_

# Session Configuration
SESSION_DRIVER=redis
SESSION_LIFETIME=120
SESSION_PREFIX=homsjogja_session_

# Queue Configuration
QUEUE_CONNECTION=redis
QUEUE_PREFIX=homsjogja_queue_

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=your-mail-host
MAIL_PORT=587
MAIL_USERNAME=your-mail-username
MAIL_PASSWORD=your-mail-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME=HomsJogja

# Logging Configuration
LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=warning

# WebSocket Configuration
SOCKETIO_PORT=6001
SOCKETIO_HOST=0.0.0.0

# File Upload Configuration
FILESYSTEM_DISK=local
PUBLIC_DISK=public

# Security Configuration
SESSION_SECURE_COOKIE=false
SESSION_SAME_SITE=lax
```

### **Step 3: Deploy**
```bash
# Di Dokploy Dashboard:
# 1. Pastikan "Rebuild" option dicentang
# 2. Click "Deploy"
# 3. Monitor build logs
```

### **Step 4: Post-Deployment Verification**
```bash
# Check deployment status
./dokploy/scripts/check-deployment.sh

# Validate environment variables
./dokploy/scripts/validate-env.sh
```

---

## 🔧 **KONFIGURASI YANG SUDAH DIPERBAIKI**

### **1. nixpacks.toml (Fixed)**
```toml
[phases.setup]
nixPkgs = [
    "nginx",
    "python3Packages.supervisor", 
    "nodejs_20",
    "php83",
    "php83Packages.composer",
    "curl",
    "git",
    "bash"
]

[phases.install]
cmds = [
    "composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-scripts",
    "npm ci --legacy-peer-deps"
]

[phases.build]
cmds = [
    "npm run build",
    "mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache",
    "chmod -R 755 storage bootstrap/cache",
    "chown -R www-data:www-data storage bootstrap/cache",
    "mkdir -p /etc/nginx /etc/supervisor/conf.d /var/log/supervisor",
    "cp dokploy/config/nginx.conf /etc/nginx/nginx.conf",
    "cp dokploy/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf",
    "cp dokploy/config/php-fpm.conf /etc/php-fpm.conf"
]

[start]
cmd = "bash dokploy/scripts/startup.sh"
```

### **2. startup.sh (Fixed)**
```bash
#!/bin/bash
set -e

echo "🚀 Starting Laravel with Supervisor..."

# Create necessary directories
mkdir -p storage/logs storage/framework/{cache,sessions,views} bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Clear Laravel caches first
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Run migrations if needed
php artisan migrate --force || echo "Migration skipped"

# Create storage link
php artisan storage:link || echo "Storage link skipped"

# Cache configurations (now with proper environment variables)
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start supervisor
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
```

### **3. supervisord.conf (Fixed)**
```ini
[supervisord]
nodaemon=true
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid
childlogdir=/var/log/supervisor
user=root

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

[supervisorctl]
serverurl=unix:///var/run/supervisor.sock

# PHP-FPM (Priority 10 - Start First)
[program:php-fpm]
command=php-fpm83 -F --fpm-config /app/dokploy/config/php-fpm.conf
autostart=true
autorestart=true
startretries=3
startsecs=5
priority=10
stdout_logfile=/var/log/supervisor/php-fpm.log
stderr_logfile=/var/log/supervisor/php-fpm-error.log

# Nginx Web Server (Priority 20 - Start Second)
[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
startretries=3
startsecs=5
priority=20
stdout_logfile=/var/log/supervisor/nginx.log
stderr_logfile=/var/log/supervisor/nginx-error.log

# Laravel Queue Worker (Priority 30 - Start Third)
[program:laravel-queue]
command=php /app/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
directory=/app
autostart=true
autorestart=true
startretries=3
startsecs=5
priority=30
stdout_logfile=/var/log/supervisor/laravel-queue.log
stderr_logfile=/var/log/supervisor/laravel-queue-error.log
environment=HOME="/app"

# WebSocket Server (Priority 40 - Start Last)
[program:websocket]
command=npx --yes laravel-echo-server@1.6.3 start --config=/app/laravel-echo-server.json
directory=/app
autostart=true
autorestart=true
startretries=3
startsecs=5
priority=40
stdout_logfile=/var/log/supervisor/websocket.log
stderr_logfile=/var/log/supervisor/websocket-error.log
environment=NODE_ENV="production"
```

### **4. php-fpm.conf (New)**
```ini
[global]
pid = /var/run/php-fpm.pid
error_log = /var/log/php-fpm.log
daemonize = no

[www]
user = www-data
group = www-data
listen = 127.0.0.1:9000
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
pm.max_requests = 500

clear_env = no
catch_workers_output = yes
decorate_workers_output = no

php_admin_value[error_log] = /var/log/php-fpm-error.log
php_admin_flag[log_errors] = on
php_admin_value[memory_limit] = 256M
php_admin_value[max_execution_time] = 300
php_admin_value[max_input_time] = 300
php_admin_value[post_max_size] = 100M
php_admin_value[upload_max_filesize] = 100M

security.limit_extensions = .php
```

---

## 🔍 **TROUBLESHOOTING GUIDE**

### **Issue 1: Environment Variables Not Detected**
**Symptoms:**
- Laravel menggunakan default values
- Database connection failed
- Redis connection failed

**Solution:**
```bash
# 1. Check environment variables
./dokploy/scripts/validate-env.sh

# 2. Verify in Dokploy Dashboard
# - Format: KEY=value (no spaces)
# - Set one by one
# - Save after each variable

# 3. Redeploy with rebuild
```

### **Issue 2: Supervisor Error**
**Symptoms:**
- "could not find config file"
- Services not starting

**Solution:**
```bash
# 1. Check config files exist
ls -la dokploy/config/

# 2. Run deployment validator
./dokploy/scripts/deployment-validator.sh

# 3. Check build logs in Dokploy Dashboard
```

### **Issue 3: PHP-FPM Error**
**Symptoms:**
- 502 Bad Gateway
- PHP-FPM not responding

**Solution:**
```bash
# 1. Check PHP-FPM logs
tail -f /var/log/supervisor/php-fpm-error.log

# 2. Check PHP-FPM config
cat dokploy/config/php-fpm.conf

# 3. Verify permissions
ls -la storage/
```

### **Issue 4: Build Failed**
**Symptoms:**
- Nixpacks build error
- Dependencies not found

**Solution:**
```bash
# 1. Check nixpacks.toml syntax
cat nixpacks.toml

# 2. Verify all files exist
./dokploy/scripts/deployment-validator.sh

# 3. Check build logs in Dokploy Dashboard
```

---

## 📊 **MONITORING & MAINTENANCE**

### **Daily Health Checks:**
```bash
# Check service status
supervisorctl status

# Check logs
tail -f /var/log/supervisor/supervisord.log
tail -f storage/logs/laravel.log

# Check environment
./dokploy/scripts/validate-env.sh
```

### **Weekly Maintenance:**
```bash
# Clear old logs
find /var/log/supervisor -name "*.log" -mtime +7 -delete
find storage/logs -name "*.log" -mtime +7 -delete

# Check disk usage
df -h
du -sh storage/

# Restart services if needed
supervisorctl restart all
```

### **Monthly Review:**
```bash
# Full deployment validation
./dokploy/scripts/deployment-validator.sh

# Environment validation
./dokploy/scripts/validate-env.sh

# Performance check
./dokploy/scripts/check-deployment.sh
```

---

## 🎯 **SUCCESS METRICS**

### **Deployment Success Indicators:**
- ✅ All services running (nginx, php-fpm, queue, websocket)
- ✅ Database connection successful
- ✅ Redis connection successful
- ✅ Environment variables detected
- ✅ Laravel application responding
- ✅ WebSocket server running

### **Performance Targets:**
- Response time: < 2 seconds
- Database queries: < 100ms
- Memory usage: < 512MB
- CPU usage: < 80%
- Uptime: > 99.5%

---

## 📞 **SUPPORT**

### **If Issues Persist:**
1. **Check Dokploy Dashboard logs**
2. **Run validation scripts**
3. **Verify environment variables**
4. **Check external service connections**
5. **Review configuration files**

### **Useful Commands:**
```bash
# Quick health check
curl http://localhost/health

# Service status
supervisorctl status

# Environment check
./dokploy/scripts/validate-env.sh

# Full deployment check
./dokploy/scripts/check-deployment.sh
```

---

**🎯 FOKUS UTAMA**: 
- ✅ Environment variables di runtime, bukan build time
- ✅ Supervisor configuration yang proper
- ✅ PHP-FPM configuration yang optimal
- ✅ Comprehensive error handling
- ✅ Step-by-step validation process

**📅 Last Updated**: 2025  
**📝 Version**: 2.0  
**👤 Maintained By**: Development Team
