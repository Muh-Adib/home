# 🚀 Dokploy Deployment Guide - Laravel dengan WebSocket Support

## 📋 Overview

Panduan lengkap untuk deploy aplikasi Laravel Property Management System ke Dokploy dengan fitur:
- ✅ Laravel Framework dengan Inertia.js React
- ✅ MySQL Database (External Service)
- ✅ Redis Cache/Queue/Session (External Service)  
- ✅ Laravel Echo Server untuk WebSocket real-time
- ✅ Multi-stage Docker build optimization
- ✅ Supervisor process management
- ✅ Nginx web server dengan optimasi production

## 🛠️ Pre-requisites

### 1. Dokploy Setup
- Dokploy server sudah terinstall dan berjalan
- Access ke Dokploy dashboard
- Git repository sudah terhubung ke Dokploy

### 2. External Services
Pastikan service berikut sudah tersedia di Dokploy:

#### MySQL Database
```
Service Name: homsjogja-db-xsjalx
Database: homs-db
Username: homs-user
Password: jD8-AKHx2gFCQ5gx3ouRJ
Port: 3306
```

#### Redis Service
```
Service Name: homsjogja-redis-qmihbb
Username: default
Password: 5vlcwpzc45g9mtho
Port: 6379
```

## 📂 File Structure

File-file penting untuk deployment:

```
├── Dockerfile.dokploy              # Multi-stage Docker configuration
├── .env.dokploy                    # Production environment template
├── deploy-dokploy-production.sh    # Deployment preparation script
├── docker/
│   ├── nginx/dokploy.conf          # Nginx configuration dengan WebSocket proxy
│   ├── supervisor/dokploy.conf     # Process management dengan Echo Server
│   ├── php/dokploy.ini            # PHP optimization untuk production
│   └── scripts/startup.sh          # Enhanced startup script
└── laravel-echo-server.production.json # WebSocket server config
```

## 🚀 Deployment Steps

### Step 1: Persiapan Repository

```bash
# 1. Clone atau update repository
git pull origin main

# 2. Run deployment preparation script
chmod +x deploy-dokploy-production.sh
./deploy-dokploy-production.sh

# 3. Review dan commit changes
git add .
git commit -m "feat: setup Dokploy production deployment dengan WebSocket support"
git push origin main
```

### Step 2: Konfigurasi Dokploy

1. **Buat Application baru di Dokploy:**
   - Type: `Docker`
   - Source: Git Repository
   - Build Path: `/`
   - Dockerfile: `Dockerfile.dokploy`

2. **Environment Variables:**
   Set variable berikut di Dokploy dashboard:
   ```env
   APP_URL=https://your-domain.traefik.me
   DB_HOST=homsjogja-db-xsjalx
   DB_PORT=3306
   DB_DATABASE=homs-db
   DB_USERNAME=homs-user
   DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ
   REDIS_HOST=homsjogja-redis-qmihbb
   REDIS_PORT=6379
   REDIS_USERNAME=default
   REDIS_PASSWORD=5vlcwpzc45g9mtho
   ```

3. **Port Configuration:**
   - Main Port: `80` (HTTP)
   - Additional Port: `6001` (WebSocket) - expose untuk testing

4. **Domain Setup:**
   - Configure domain sesuai APP_URL
   - Enable HTTPS jika diperlukan

### Step 3: Deploy

1. **Trigger deployment dari Dokploy dashboard**
2. **Monitor build logs** untuk memastikan:
   - ✅ Dependencies installed successfully
   - ✅ Frontend assets built
   - ✅ Laravel optimizations completed
   - ✅ Laravel Echo Server installed

## 🔍 Verification & Testing

### 1. Health Checks

```bash
# Basic application health
curl https://your-domain.traefik.me/health

# WebSocket health (jika port 6001 exposed)
curl https://your-domain.traefik.me:6001/socket.io/

# Response should be: HTTP 200 OK
```

### 2. Database Connection

   ```bash
# Access container untuk testing
docker exec -it <container-id> php artisan migrate:status
   ```

### 3. Redis Connection

   ```bash
# Test Redis connection
docker exec -it <container-id> php artisan tinker
# Dalam tinker:
# Redis::ping(); // Should return "PONG"
```

### 4. WebSocket Testing

Open browser console dan test:
```javascript
// Test WebSocket connection
const socket = io('https://your-domain.traefik.me:6001');
socket.on('connect', () => {
    console.log('✅ WebSocket connected');
});
socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
});
```

## 🎯 Production Optimizations

### 1. Aplikasi Laravel
- ✅ OPCache enabled dengan validation disabled
- ✅ Config, routes, views cached
- ✅ Autoloader optimized
- ✅ Production environment set

### 2. Nginx Configuration
- ✅ Gzip compression enabled
- ✅ Static file caching dengan long expiry
- ✅ Buffer optimization untuk prevent "header too big"
- ✅ WebSocket proxy untuk Laravel Echo Server

### 3. Supervisor Process Management
- ✅ PHP-FPM dengan optimal worker processes
- ✅ Multiple Queue workers untuk better throughput
- ✅ Laravel Scheduler replacement untuk cron
- ✅ Laravel Echo Server untuk WebSocket
- ✅ Health check monitors
- ✅ Log cleanup automation

### 4. Security Headers
- ✅ X-Frame-Options, X-Content-Type-Options
- ✅ X-XSS-Protection, Referrer-Policy
- ✅ CORS configuration untuk WebSocket

## 🐛 Troubleshooting

### 1. Build Failures

**Error: npm install failed**
   ```bash
# Solution: Clear npm cache
RUN npm cache clean --force
   ```

**Error: composer install failed**
   ```bash
# Check memory limits
# Solution: Increase Docker build memory
   ```

### 2. Runtime Issues

**Error: Database connection failed**
   ```bash
# Check:
1. Service names correct (homsjogja-db-xsjalx)
2. Network connectivity between containers
3. Database credentials
4. Database service is running
```

**Error: Redis connection failed**
   ```bash
# Check:
1. Redis service name (homsjogja-redis-qmihbb)
2. Redis password dan username
3. Network connectivity
4. Redis service is running
```

**Error: WebSocket tidak berfungsi**
```bash
# Check:
1. Laravel Echo Server process running
2. Port 6001 accessible
3. CORS configuration
4. Frontend Echo configuration
```

### 3. Performance Issues

**High memory usage**
```bash
# Solutions:
1. Reduce queue worker processes
2. Optimize OPCache settings
3. Monitor dengan supervisor logs
```

**Slow response times**
```bash
# Check:
1. Database query optimization
2. Redis cache hit rates
3. Nginx access logs
4. PHP-FPM slow logs
```

## 📊 Monitoring

### 1. Application Logs
```bash
# Supervisor logs
docker exec -it <container> supervisorctl status

# Application logs
docker exec -it <container> tail -f /var/www/html/storage/logs/laravel.log

# Queue worker logs
docker exec -it <container> tail -f /var/log/supervisor/queue-worker*
```

### 2. Service Health
   ```bash
# All services status
docker exec -it <container> supervisorctl status all

# Restart specific service
docker exec -it <container> supervisorctl restart laravel-echo-server
```

### 3. Performance Monitoring
   ```bash
# PHP-FPM status
curl https://your-domain.traefik.me/status

# Nginx status
docker exec -it <container> nginx -t
```

## 🔄 Updates & Maintenance

### 1. Code Updates
```bash
# 1. Update repository
git push origin main

# 2. Dokploy auto-deploy triggers
# 3. Monitor deployment in dashboard
```

### 2. Maintenance Tasks
```bash
# Clear application cache
docker exec -it <container> php artisan cache:clear

# Restart queue workers
docker exec -it <container> supervisorctl restart queue-worker:*

# Check disk usage
docker exec -it <container> df -h
```

## 🎉 Success Indicators

Deployment berhasil jika:
- ✅ Application responds di main domain
- ✅ Health check returns 200
- ✅ Database migrations completed
- ✅ WebSocket connection established
- ✅ Queue workers processing jobs
- ✅ Static assets loading correctly
- ✅ No errors dalam application logs

## 📞 Support

Jika mengalami masalah:
1. Check Dokploy deployment logs
2. Review container logs
3. Verify external service connectivity
4. Test health endpoints
5. Monitor supervisor process status

---

**Last Updated:** January 2025  
**Version:** 1.0 dengan WebSocket Support