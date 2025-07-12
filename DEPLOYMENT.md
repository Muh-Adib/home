# 🚀 Production Deployment Guide

## 📋 Overview

This guide covers the production deployment setup for Property Management System using Dokploy with Docker.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx (80)    │    │   PHP-FPM       │    │   Redis (6379)  │
│   - Static      │◄──►│   - Laravel     │◄──►│   - Cache       │
│   - Proxy       │    │   - Queue       │    │   - Session     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Socket.IO     │    │   MySQL/PostgreSQL│  │   File Storage  │
│   (6001)        │    │   Database      │    │   - Images      │
│   - Real-time   │    │   - Data        │    │   - Documents   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 File Structure

```
├── Dockerfile                    # Multi-stage production build
├── .dockerignore                 # Exclude unnecessary files
├── production.env.example        # Production environment template
├── docker/
│   ├── php/
│   │   ├── php.ini              # PHP production config
│   │   └── opcache.ini          # OPcache optimization
│   ├── nginx/
│   │   ├── nginx.conf           # Nginx main config
│   │   └── default.conf         # Nginx server config
│   ├── supervisor/
│   │   └── supervisord.conf     # Process management
│   └── redis/
│       └── redis.conf           # Redis production config
└── resources/js/
    └── socket-server.js         # Socket.IO server
```

## 🔧 Configuration Files

### 1. Dockerfile
- **Multi-stage build** for optimized production image
- **PHP 8.3** with FPM and required extensions
- **Nginx** for web server and reverse proxy
- **Supervisor** for process management
- **Redis** for caching and sessions

### 2. PHP Configuration (`docker/php/php.ini`)
```ini
memory_limit = 512M
max_execution_time = 60
upload_max_filesize = 100M
opcache.enable = 1
opcache.memory_consumption = 256
```

### 3. Nginx Configuration (`docker/nginx/default.conf`)
- **Security headers** for protection
- **Rate limiting** for API endpoints
- **WebSocket support** for Socket.IO
- **Static file caching** for performance

### 4. Redis Configuration (`docker/redis/redis.conf`)
```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
```

### 5. Supervisor Configuration (`docker/supervisor/supervisord.conf`)
Manages:
- **PHP-FPM** process
- **Nginx** web server
- **Laravel Queue** workers
- **Laravel Scheduler**
- **Socket.IO** server
- **Redis** server

## 🚀 Deployment Steps

### 1. Environment Setup
```bash
# Copy production environment template
cp production.env.example .env

# Generate application key
php artisan key:generate

# Set production environment variables
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com
```

### 2. Database Setup
```bash
# Run migrations
php artisan migrate --force

# Seed production data (if needed)
php artisan db:seed --force

# Cache configurations
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 3. File Permissions
```bash
# Set proper permissions
chown -R www:www /var/www/html
chmod -R 755 /var/www/html/storage
chmod -R 755 /var/www/html/bootstrap/cache
```

### 4. Build and Deploy
```bash
# Build Docker image
docker build -t pms-production .

# Run container
docker run -d \
  --name pms-production \
  -p 80:80 \
  -p 443:443 \
  -p 6001:6001 \
  -e APP_ENV=production \
  pms-production
```

## 🔒 Security Configuration

### 1. Environment Variables
```env
# Security
APP_DEBUG=false
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax

# Database
DB_PASSWORD=your_strong_password_here

# Redis
REDIS_PASSWORD=your_redis_password

# Mail
MAIL_FROM_ADDRESS=noreply@your-domain.com
```

### 2. SSL/TLS Setup
```nginx
# Add to nginx configuration
ssl_certificate /path/to/certificate.crt;
ssl_certificate_key /path/to/private.key;
ssl_protocols TLSv1.2 TLSv1.3;
```

### 3. Rate Limiting
```nginx
# API endpoints
location /api/ {
    limit_req zone=api burst=20 nodelay;
}

# Authentication endpoints
location ~* /(login|register|password) {
    limit_req zone=login burst=5 nodelay;
}
```

## 📊 Performance Optimization

### 1. OPcache Settings
```ini
opcache.enable = 1
opcache.memory_consumption = 256
opcache.max_accelerated_files = 10000
opcache.validate_timestamps = 0
```

### 2. Redis Configuration
```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
```

### 3. Nginx Optimization
```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;

# Static file caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔍 Monitoring and Logging

### 1. Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1
```

### 2. Log Files
```
/var/log/supervisor/
├── php-fpm.log
├── nginx.log
├── laravel-queue.log
├── laravel-scheduler.log
├── socket-io.log
└── redis.log
```

### 3. Application Logs
```
/var/www/html/storage/logs/
├── laravel.log
└── queue.log
```

## 🚨 Troubleshooting

### 1. Common Issues

**Socket.IO Connection Failed**
```bash
# Check Socket.IO server
docker logs pms-production | grep socket-io

# Verify Redis connection
docker exec -it pms-production redis-cli ping
```

**Database Connection Issues**
```bash
# Check database connectivity
docker exec -it pms-production php artisan tinker
DB::connection()->getPdo();
```

**File Permission Issues**
```bash
# Fix permissions
docker exec -it pms-production chown -R www:www /var/www/html
docker exec -it pms-production chmod -R 755 /var/www/html/storage
```

### 2. Performance Issues

**High Memory Usage**
```bash
# Check memory usage
docker stats pms-production

# Optimize OPcache
docker exec -it pms-production php -r "opcache_reset();"
```

**Slow Database Queries**
```bash
# Enable query logging
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
```

## 📈 Scaling Considerations

### 1. Horizontal Scaling
- **Load Balancer** for multiple containers
- **Redis Cluster** for session sharing
- **Database Replication** for read/write separation

### 2. Vertical Scaling
- **Increase memory** for PHP and Redis
- **Optimize database** indexes and queries
- **CDN** for static assets

### 3. Monitoring
- **Application Performance Monitoring (APM)**
- **Log aggregation** (ELK Stack)
- **Metrics collection** (Prometheus + Grafana)

## 🔄 Maintenance

### 1. Regular Updates
```bash
# Update application code
git pull origin main

# Rebuild and redeploy
docker build -t pms-production .
docker stop pms-production
docker rm pms-production
docker run -d --name pms-production pms-production
```

### 2. Database Backups
```bash
# Create backup
mysqldump -u username -p database_name > backup.sql

# Restore backup
mysql -u username -p database_name < backup.sql
```

### 3. Log Rotation
```bash
# Configure logrotate for application logs
/var/www/html/storage/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www www
}
```

## 📞 Support

For deployment issues:
1. Check application logs: `/var/www/html/storage/logs/`
2. Check supervisor logs: `/var/log/supervisor/`
3. Check nginx logs: `/var/log/nginx/`
4. Verify environment variables
5. Test database connectivity
6. Check Redis connection

---

**🎯 Production Checklist:**
- [ ] Environment variables configured
- [ ] Database migrated and seeded
- [ ] File permissions set correctly
- [ ] SSL certificate installed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Logging configured
- [ ] Health checks working 