# 🚀 Nixpacks Deployment Guide
## Property Management System website Homsjogja - Laravel 12 + React + WebSocket

---

## 📋 **OVERVIEW**

Dokumen ini menjelaskan cara deploy aplikasi Property Management System website Homsjogja menggunakan Nixpacks di Dokploy dengan konfigurasi Supervisor untuk menjalankan semua services dalam satu container.

---

## 🏗️ **ARQUITECTURE**

### **Single Container dengan Supervisor:**
- **Nginx** → Serve Laravel public/ dan React assets
- **PHP-FPM** → Laravel application
- **Laravel Queue Worker** → Background jobs
- **WebSocket Server** → Laravel Echo Server

### **External Services:**
- **MySQL Database** → External service
- **Redis** → External service untuk cache, session, queue, dan broadcasting

---

## 📁 **FILE KONFIGURASI YANG DIBUTUHKAN**

### 1. **nixpacks.toml** ✅
- Konfigurasi Nixpacks untuk build dan deployment
- Install dependencies (PHP 8.3, Node.js 20, Nginx, Supervisor)
- Build React assets dan optimize Laravel

### 2. **nginx.conf** ✅
- Konfigurasi Nginx untuk Laravel + React
- WebSocket proxy untuk development
- Rate limiting dan security headers
- Static asset optimization

### 3. **supervisord.conf** ✅
- Konfigurasi Supervisor untuk menjalankan 4 services
- Process management dan logging
- Auto-restart pada failure

### 4. **startup.sh** ✅
- Script startup untuk Nixpacks
- Environment validation
- Database migration dan Laravel optimization
- Service testing

### 5. **laravel-echo-server.dokploy.json** ✅
- Konfigurasi WebSocket server
- Redis connection untuk broadcasting
- CORS configuration

### 6. **Procfile** ✅
- Alternative startup command untuk Nixpacks

---

## 🔧 **ENVIRONMENT VARIABLES**

### **Required Variables:**
```env
# Application
APP_NAME="HomsJogja"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.domain.com
APP_KEY=base64:your-generated-key

# Database (External)
DB_CONNECTION=mysql
DB_HOST=your-external-mysql-host
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Redis (External)
REDIS_HOST=your-external-redis-host
REDIS_PASSWORD=your_redis_password
REDIS_PORT=6379
REDIS_DB=0

# Broadcasting
BROADCAST_DRIVER=redis
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret

# Cache & Session
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Mail
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="${APP_NAME}"
```

---

## 🚀 **DEPLOYMENT STEPS**

### **Step 1: Prepare Project**
```bash
# Pastikan semua file konfigurasi ada di root project
ls -la nixpacks.toml nginx.conf supervisord.conf startup.sh Procfile
```

### **Step 2: Set Environment Variables di Dokploy**
1. Buka Dokploy dashboard
2. Pilih project Anda
3. Masuk ke section "Environment Variables"
4. Set semua required variables sesuai template di atas

### **Step 3: Deploy dengan Nixpacks**
```bash
# Dokploy akan otomatis menggunakan nixpacks.toml
# dan menjalankan startup.sh
```

### **Step 4: Configure Traefik**

**Router 1 - Laravel App:**
```yaml
rule: "Host(`app.domain.com`)"
entrypoints: "websecure"
tls:
  certresolver: "letsencrypt"
service:
  port: 80
```

**Router 2 - WebSocket:**
```yaml
rule: "Host(`ws.domain.com`)"
entrypoints: "websecure"
tls:
  certresolver: "letsencrypt"
service:
  port: 6001
middlewares:
  - "websocket-headers"
```

---

## 🔍 **VERIFICATION & MONITORING**

### **Check Service Status:**
```bash
# Di dalam container
supervisorctl status
```

### **Expected Output:**
```
nginx                            RUNNING   pid 123, uptime 0:05:30
php-fpm                          RUNNING   pid 124, uptime 0:05:30
laravel-queue                    RUNNING   pid 125, uptime 0:05:30
websocket-server                 RUNNING   pid 126, uptime 0:05:30
```

### **Test Endpoints:**
- `https://app.domain.com/health` → Health check
- `https://app.domain.com` → Laravel application
- `wss://ws.domain.com` → WebSocket server

### **Check Logs:**
```bash
# Nginx logs
tail -f /var/log/nginx/access.log

# Supervisor logs
tail -f /var/log/supervisor/supervisord.log

# Laravel logs
tail -f /var/www/html/storage/logs/laravel.log

# WebSocket logs
tail -f /var/log/supervisor/websocket.log
```

---

## 🛠️ **TROUBLESHOOTING**

### **Common Issues:**

#### 1. **Permission Issues**
```bash
# Fix permissions
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

#### 2. **Database Connection Failed**
```bash
# Test database connection
php artisan tinker --execute="DB::connection()->getPdo();"
```

#### 3. **Redis Connection Failed**
```bash
# Test Redis connection
php artisan tinker --execute="Redis::connection()->ping();"
```

#### 4. **WebSocket Not Working**
```bash
# Check WebSocket server
curl http://localhost:6001

# Check WebSocket logs
tail -f /var/log/supervisor/websocket.log
```

#### 5. **Build Failures**
```bash
# Clear npm cache
npm cache clean --force

# Use legacy peer deps
npm ci --legacy-peer-deps
```

---

## 📊 **PERFORMANCE OPTIMIZATION**

### **Nginx Optimization:**
- ✅ Gzip compression
- ✅ Static asset caching
- ✅ Rate limiting
- ✅ Security headers

### **Laravel Optimization:**
- ✅ Config caching
- ✅ Route caching
- ✅ View caching
- ✅ Optimized autoloader

### **WebSocket Optimization:**
- ✅ Redis for broadcasting
- ✅ CORS configuration
- ✅ Connection pooling

---

## 🔒 **SECURITY CONSIDERATIONS**

### **Nginx Security:**
- ✅ Rate limiting untuk API dan login
- ✅ Security headers
- ✅ File access restrictions
- ✅ SSL/TLS configuration

### **Laravel Security:**
- ✅ Environment variables untuk sensitive data
- ✅ Proper file permissions
- ✅ Database connection security
- ✅ Session security

---

## 📈 **MONITORING & ALERTS**

### **Health Checks:**
- ✅ Application health endpoint
- ✅ Database connection monitoring
- ✅ Redis connection monitoring
- ✅ WebSocket connection monitoring

### **Logging:**
- ✅ Comprehensive logging untuk semua services
- ✅ Error tracking dan alerting
- ✅ Performance monitoring

---

## 🔄 **DEPLOYMENT WORKFLOW**

### **Pre-Deployment:**
1. ✅ Update environment variables
2. ✅ Test external services
3. ✅ Verify configuration files

### **Deployment:**
1. ✅ Nixpacks build process
2. ✅ Supervisor startup
3. ✅ Service health checks
4. ✅ Traefik routing

### **Post-Deployment:**
1. ✅ Verify all services running
2. ✅ Test application functionality
3. ✅ Monitor logs dan performance
4. ✅ Update DNS jika diperlukan

---

## 📞 **SUPPORT**

### **Jika ada masalah:**
1. Check logs di Dokploy dashboard
2. Verify environment variables
3. Test external service connections
4. Review configuration files
5. Contact support jika diperlukan

---

**🎯 FOKUS UTAMA**: 
- Single container deployment dengan Supervisor
- External database dan Redis untuk scalability
- WebSocket support untuk real-time features
- Comprehensive monitoring dan logging
- Security best practices

**📅 Last Updated**: 2025  
**📝 Version**: 1.0  
**👤 Maintained By**: Development Team
