# 🚀 Nixpacks Deployment - Property Management System

## 📋 **QUICK START**

### **File Konfigurasi yang Sudah Dibuat:**
- ✅ `nixpacks.toml` - Konfigurasi Nixpacks
- ✅ `nginx.conf` - Konfigurasi Nginx
- ✅ `supervisord.conf` - Konfigurasi Supervisor
- ✅ `startup.sh` - Script startup
- ✅ `Procfile` - Alternative startup
- ✅ `laravel-echo-server.dokploy.json` - WebSocket config
- ✅ `env.nixpacks.template` - Environment template
- ✅ `check-deployment.sh` - Status checker
- ✅ `NIXPACKS_DEPLOYMENT_GUIDE.md` - Panduan lengkap

---

## 🎯 **DEPLOYMENT STEPS**

### **1. Set Environment Variables di Dokploy**
Copy dari `env.nixpacks.template` dan sesuaikan dengan environment Anda:

```env
# Application
APP_NAME="HomsJogja"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.yourdomain.com
APP_KEY=base64:your-generated-key

# Database (External)
DB_HOST=your-external-mysql-host
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Redis (External)
REDIS_HOST=your-external-redis-host
REDIS_PASSWORD=your_redis_password

# Broadcasting
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
```

### **2. Deploy dengan Nixpacks**
Dokploy akan otomatis menggunakan `nixpacks.toml` dan menjalankan `startup.sh`

### **3. Configure Traefik**
Set 2 routers di Dokploy dashboard:

**Router 1 - Laravel App:**
```yaml
rule: "Host(`app.yourdomain.com`)"
entrypoints: "websecure"
tls:
  certresolver: "letsencrypt"
service:
  port: 80
```

**Router 2 - WebSocket:**
```yaml
rule: "Host(`ws.yourdomain.com`)"
entrypoints: "websecure"
tls:
  certresolver: "letsencrypt"
service:
  port: 6001
```

---

## 🔍 **VERIFICATION**

### **Check Deployment Status:**
```bash
# Di dalam container
./check-deployment.sh
```

### **Expected Output:**
```
✅ Supervisor is running
✅ Nginx is running  
✅ PHP-FPM is running
✅ WebSocket server is running
✅ Laravel Queue Worker is running
✅ All services are running (4/4)
```

### **Test Endpoints:**
- `https://app.yourdomain.com/health` → Health check
- `https://app.yourdomain.com` → Laravel application
- `wss://ws.yourdomain.com` → WebSocket server

---

## 🛠️ **TROUBLESHOOTING**

### **Common Issues:**

#### **Services Not Running:**
```bash
# Check status
supervisorctl status

# Restart all services
supervisorctl restart all
```

#### **Permission Issues:**
```bash
# Fix permissions
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

#### **Database Connection Failed:**
```bash
# Test connection
php artisan tinker --execute="DB::connection()->getPdo();"
```

#### **WebSocket Not Working:**
```bash
# Test WebSocket
curl http://localhost:6001

# Check logs
tail -f /var/log/supervisor/websocket.log
```

---

## 📊 **ARCHITECTURE**

### **Single Container dengan Supervisor:**
```
┌─────────────────────────────────────┐
│           Nixpacks Container       │
├─────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌──────┐ │
│  │  Nginx  │ │ PHP-FPM │ │Queue │ │
│  │  (Port  │ │ (Port   │ │Worker│ │
│  │   80)   │ │  9000)  │ │      │ │
│  └─────────┘ └─────────┘ └──────┘ │
│  ┌─────────────────────────────┐   │
│  │    WebSocket Server        │   │
│  │      (Port 6001)          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### **External Services:**
- **MySQL Database** → External service
- **Redis** → External service untuk cache, session, queue, broadcasting

---

## 🔧 **CONFIGURATION FILES**

### **nixpacks.toml**
- Install PHP 8.3, Node.js 20, Nginx, Supervisor
- Build React assets dan optimize Laravel
- Set production environment variables

### **nginx.conf**
- Serve Laravel public/ dan React assets
- WebSocket proxy untuk development
- Rate limiting dan security headers
- Static asset optimization

### **supervisord.conf**
- Manage 4 services: Nginx, PHP-FPM, Queue Worker, WebSocket
- Auto-restart pada failure
- Comprehensive logging

### **startup.sh**
- Environment validation
- Database migration dan Laravel optimization
- Service testing
- Start Supervisor

---

## 📈 **PERFORMANCE FEATURES**

### **Optimizations:**
- ✅ **Gzip compression** untuk static assets
- ✅ **Laravel caching** (config, route, view)
- ✅ **OPcache** untuk PHP performance
- ✅ **Redis** untuk cache, session, queue
- ✅ **Rate limiting** untuk API protection
- ✅ **Security headers** untuk protection

### **Monitoring:**
- ✅ **Health checks** untuk semua services
- ✅ **Comprehensive logging** untuk debugging
- ✅ **Process management** dengan Supervisor
- ✅ **Error tracking** dan alerting

---

## 🔒 **SECURITY**

### **Nginx Security:**
- Rate limiting untuk API dan login
- Security headers (X-Frame-Options, X-XSS-Protection, etc.)
- File access restrictions
- SSL/TLS configuration

### **Laravel Security:**
- Environment variables untuk sensitive data
- Proper file permissions
- Database connection security
- Session security

---

## 📞 **SUPPORT**

### **Jika ada masalah:**
1. Check logs di Dokploy dashboard
2. Run `./check-deployment.sh` untuk diagnosis
3. Verify environment variables
4. Test external service connections
5. Review configuration files

### **Useful Commands:**
```bash
# Check all service status
supervisorctl status

# Restart all services
supervisorctl restart all

# Monitor logs
tail -f /var/log/supervisor/supervisord.log
tail -f /var/www/html/storage/logs/laravel.log

# Test endpoints
curl http://localhost/health
curl http://localhost:6001
```

---

## 📚 **DOCUMENTATION**

- 📖 **NIXPACKS_DEPLOYMENT_GUIDE.md** - Panduan lengkap deployment
- 🔧 **env.nixpacks.template** - Template environment variables
- 🔍 **check-deployment.sh** - Script untuk verifikasi deployment

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
