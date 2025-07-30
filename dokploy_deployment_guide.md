# 🚀 Dokploy Deployment Guide

## Property Management System - Laravel 12 + React 18 + WebSocket

Panduan lengkap untuk deployment aplikasi Property Management System menggunakan Dockerfile dengan external Redis dan MySQL services.

---

## 📋 Prerequisites

### System Requirements
- Docker 20.10+
- Docker Compose (optional, untuk development)
- 4GB RAM minimum
- 10GB disk space

### External Services
- **MySQL Database**: `homsjogja-db-xsjalx:3306`
  - Database: `homs-db`
  - Username: `homs-user`
  - Password: `jD8-AKHx2gFCQ5gx3ouRJ`

- **Redis Cache**: `homsjogja-redis-qmihbb:6379`
  - Password: `5vlcwpzc45g9mtho`
  - Database: `0`

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   Mobile App    │    │   Admin Panel   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │    Docker Container       │
                    │  ┌─────────────────────┐  │
                    │  │   Nginx (Port 80)   │  │
                    │  └─────────┬───────────┘  │
                    │            │              │
                    │  ┌─────────▼───────────┐  │
                    │  │  PHP-FPM (Laravel) │  │
                    │  └─────────┬───────────┘  │
                    │            │              │
                    │  ┌─────────▼───────────┐  │
                    │  │ Laravel Echo Server │  │
                    │  │   (Port 6001)       │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    External Services      │
                    │  ┌─────────┬───────────┐  │
                    │  │  MySQL  │   Redis   │  │
                    │  │  (DB)   │ (Cache)   │  │
                    │  └─────────┴───────────┘  │
                    └───────────────────────────┘
```

---

## 🚀 Quick Deployment

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd home
```

### 2. Setup Environment
```bash
# Copy environment template
cp env.dokploy.template .env

# Edit environment variables sesuai kebutuhan
nano .env
```

### 3. Run Deployment
```bash
# Make script executable
chmod +x docker-deploy.sh

# Full deployment
./docker-deploy.sh deploy
```

### 4. Verify Deployment
```bash
# Check status
./docker-deploy.sh status

# View logs
./docker-deploy.sh logs

# Test application
curl http://localhost:8080/health
```

---

## 📁 File Structure

```
home/
├── Dockerfile.dokploy              # Multi-stage Docker build
├── docker-deploy.sh               # Deployment script
├── env.dokploy.template           # Environment template
├── laravel-echo-server.dokploy.json # WebSocket config
├── docker/
│   ├── nginx/
│   │   └── dokploy.conf          # Nginx configuration
│   ├── php/
│   │   └── dokploy.ini           # PHP configuration
│   ├── supervisor/
│   │   └── dokploy.conf          # Process management
│   └── scripts/
│       └── startup.sh            # Container startup script
└── resources/
    └── js/
        └── lib/
            └── echo.ts            # WebSocket client config
```

---

## 🔧 Configuration Details

### Dockerfile.dokploy
- **Multi-stage build** untuk optimasi ukuran image
- **Node.js stage** untuk build frontend assets
- **PHP 8.3-FPM** dengan extensions yang diperlukan
- **Nginx** untuk web server
- **Supervisor** untuk process management

### Environment Variables
```bash
# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=http://localhost:8080

# Database (External MySQL)
DB_HOST=homsjogja-db-xsjalx
DB_PORT=3306
DB_DATABASE=homs-db
DB_USERNAME=homs-user
DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ

# Redis (External)
REDIS_HOST=homsjogja-redis-qmihbb
REDIS_PORT=6379
REDIS_PASSWORD=5vlcwpzc45g9mtho
REDIS_DB=0

# Broadcasting (WebSocket)
BROADCAST_DRIVER=redis
BROADCAST_CONNECTION=default
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

### WebSocket Configuration
- **Laravel Echo Server** untuk real-time notifications
- **Socket.io** client untuk frontend
- **Redis** sebagai broadcasting backend
- **Port 6001** untuk WebSocket connections

---

## 🛠️ Deployment Commands

### Full Deployment
```bash
./docker-deploy.sh deploy
```

### Individual Commands
```bash
# Build image only
./docker-deploy.sh build

# Start container
./docker-deploy.sh start

# Stop container
./docker-deploy.sh stop

# Restart container
./docker-deploy.sh restart

# View logs
./docker-deploy.sh logs

# Check status
./docker-deploy.sh status

# Test deployment
./docker-deploy.sh test

# Run migrations
./docker-deploy.sh migrate

# Cleanup (remove container & image)
./docker-deploy.sh cleanup
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check container logs
./docker-deploy.sh logs

# Check container status
docker ps -a

# Check image exists
docker images | grep homsjogja
```

#### 2. Database Connection Failed
```bash
# Test external MySQL connection
nc -zv homsjogja-db-xsjalx 3306

# Check database credentials
docker exec homsjogja-container php artisan tinker --execute="DB::connection()->getPdo();"
```

#### 3. Redis Connection Failed
```bash
# Test external Redis connection
nc -zv homsjogja-redis-qmihbb 6379

# Check Redis connection
docker exec homsjogja-container php artisan tinker --execute="Redis::ping();"
```

#### 4. WebSocket Not Working
```bash
# Check WebSocket server
curl http://localhost:6001

# Check WebSocket logs
docker logs homsjogja-container | grep -i websocket
```

#### 5. Application Not Accessible
```bash
# Check if container is running
docker ps | grep homsjogja

# Check nginx logs
docker exec homsjogja-container tail -f /var/log/nginx/error.log

# Check PHP-FPM logs
docker exec homsjogja-container tail -f /var/log/php-fpm.log
```

### Debug Commands

#### Check Container Health
```bash
# Container status
docker inspect homsjogja-container --format='{{.State.Status}}'

# Resource usage
docker stats homsjogja-container

# Container processes
docker exec homsjogja-container ps aux
```

#### Check Application Health
```bash
# Health endpoint
curl http://localhost:8080/health

# Application logs
docker exec homsjogja-container tail -f /var/www/html/storage/logs/laravel.log

# Laravel artisan commands
docker exec homsjogja-container php artisan --version
```

#### Check External Services
```bash
# MySQL connection test
docker exec homsjogja-container php artisan tinker --execute="DB::connection()->getPdo(); echo 'MySQL OK';"

# Redis connection test
docker exec homsjogja-container php artisan tinker --execute="Redis::ping(); echo 'Redis OK';"

# WebSocket test
curl -I http://localhost:6001
```

---

## 📊 Monitoring & Maintenance

### Health Checks
- **Application**: `http://localhost:8080/health`
- **WebSocket**: `http://localhost:6001`
- **Database**: Laravel artisan commands
- **Redis**: Laravel artisan commands

### Log Locations
```bash
# Application logs
docker exec homsjogja-container tail -f /var/www/html/storage/logs/laravel.log

# Nginx logs
docker exec homsjogja-container tail -f /var/log/nginx/access.log
docker exec homsjogja-container tail -f /var/log/nginx/error.log

# PHP-FPM logs
docker exec homsjogja-container tail -f /var/log/php-fpm.log

# Supervisor logs
docker exec homsjogja-container tail -f /var/log/supervisor/supervisord.log
```

### Backup Commands
```bash
# Database backup
docker exec homsjogja-container php artisan tinker --execute="DB::connection()->getPdo();"

# File backup
docker cp homsjogja-container:/var/www/html/storage ./backup/storage

# Configuration backup
docker cp homsjogja-container:/var/www/html/.env ./backup/env
```

---

## 🔄 Update & Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
./docker-deploy.sh deploy
```

### Update Dependencies
```bash
# Update PHP dependencies
docker exec homsjogja-container composer update --no-dev

# Update Node dependencies
docker exec homsjogja-container npm update

# Rebuild assets
docker exec homsjogja-container npm run build
```

### Database Maintenance
```bash
# Run migrations
./docker-deploy.sh migrate

# Clear cache
docker exec homsjogja-container php artisan cache:clear
docker exec homsjogja-container php artisan config:clear
docker exec homsjogja-container php artisan route:clear
docker exec homsjogja-container php artisan view:clear

# Rebuild cache
docker exec homsjogja-container php artisan config:cache
docker exec homsjogja-container php artisan route:cache
docker exec homsjogja-container php artisan view:cache
```

---

## 🚨 Emergency Procedures

### Container Crash Recovery
```bash
# Stop and remove crashed container
docker stop homsjogja-container
docker rm homsjogja-container

# Restart with fresh container
./docker-deploy.sh start
```

### Database Recovery
```bash
# Check database connection
docker exec homsjogja-container php artisan migrate:status

# Run migrations if needed
./docker-deploy.sh migrate

# Clear application cache
docker exec homsjogja-container php artisan cache:clear
```

### WebSocket Recovery
```bash
# Restart WebSocket server
docker exec homsjogja-container supervisorctl restart laravel-echo-server

# Check WebSocket status
curl http://localhost:6001
```

---

## 📈 Performance Optimization

### Container Optimization
- **Multi-stage build** untuk mengurangi image size
- **Production PHP configuration** dengan OPcache
- **Nginx optimization** untuk static files
- **Supervisor** untuk process management

### Application Optimization
- **Laravel cache** untuk config, routes, views
- **Redis** untuk session, cache, queue
- **WebSocket** untuk real-time notifications
- **Asset optimization** dengan Vite build

### Monitoring
- **Health checks** untuk semua services
- **Log rotation** untuk disk space management
- **Resource monitoring** dengan docker stats
- **Error tracking** dengan Laravel logging

---

## 🔐 Security Considerations

### Container Security
- **Non-root user** (www:www)
- **Read-only filesystem** untuk sensitive directories
- **Security headers** di Nginx configuration
- **HTTPS enforcement** untuk production

### Application Security
- **Laravel security features** (CSRF, XSS protection)
- **Input validation** dan sanitization
- **SQL injection prevention** dengan Eloquent ORM
- **Session security** dengan Redis

### External Services Security
- **Database credentials** management
- **Redis password** protection
- **Network isolation** dengan Docker networks
- **SSL/TLS** untuk external communications

---

## 📞 Support & Documentation

### Useful Commands
```bash
# Quick status check
./docker-deploy.sh status

# View recent logs
./docker-deploy.sh logs

# Test all services
./docker-deploy.sh test

# Access container shell
docker exec -it homsjogja-container sh

# Laravel artisan commands
docker exec homsjogja-container php artisan list
```

### Documentation Files
- `DOKPLOY_DEPLOYMENT_GUIDE.md` - This guide
- `Dockerfile.dokploy` - Docker build configuration
- `docker-deploy.sh` - Deployment script
- `env.dokploy.template` - Environment template
- `laravel-echo-server.dokploy.json` - WebSocket configuration

### Contact Information
- **Technical Issues**: Check logs dan troubleshooting guide
- **Configuration**: Review environment variables
- **Performance**: Monitor resource usage
- **Security**: Follow security best practices

---

**🎯 Success Metrics:**
- ✅ Container starts successfully
- ✅ Application accessible on port 8080
- ✅ WebSocket server running on port 6001
- ✅ Database connection established
- ✅ Redis connection established
- ✅ Health endpoint responding
- ✅ Real-time notifications working

**📅 Last Updated**: 2025  
**🔄 Version**: 1.0  
**👤 Maintained By**: Development Team