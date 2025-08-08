# Docker Troubleshooting Guide

## Common Issues and Solutions

### 1. "Could not open input file: artisan" Error

**Problem**: 
```
Could not open input file: artisan
Script @php artisan package:discover --ansi handling the post-autoload-dump event returned with error code 1
```

**Cause**: The `artisan` file is not available when Composer runs the post-autoload-dump script.

**Solution**: ✅ **FIXED** - The Dockerfile has been updated to copy application code before running `composer install`.

### 2. Permission Issues

**Problem**: 
```
Permission denied: /var/www/html/storage
```

**Solution**:
```bash
# Fix permissions on host
sudo chown -R $USER:$USER storage bootstrap/cache
chmod -R 755 storage bootstrap/cache

# Or rebuild with proper permissions
./rebuild-docker.sh
```

### 3. Database Connection Issues

**Problem**: 
```
SQLSTATE[HY000] [2002] Connection refused
```

**Solution**:
```bash
# Check if database container is running
docker-compose ps

# Restart database service
docker-compose restart db

# Check database logs
docker-compose logs db
```

### 4. Redis Connection Issues

**Problem**: 
```
Connection refused to Redis
```

**Solution**:
```bash
# Check Redis container
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Check Redis logs
docker-compose logs redis
```

### 5. Build Cache Issues

**Problem**: Old cached layers causing build failures

**Solution**:
```bash
# Use the rebuild script
./rebuild-docker.sh

# Or manually clean and rebuild
docker-compose down --rmi all --volumes
docker system prune -f
docker-compose build --no-cache
```

### 6. Environment File Issues

**Problem**: Missing `.env` file or incorrect configuration

**Solution**:
```bash
# Copy example environment file
cp .env.example .env

# Generate application key
docker-compose exec app php artisan key:generate

# Clear configuration cache
docker-compose exec app php artisan config:clear
```

### 7. Node.js Build Issues

**Problem**: Frontend assets not building properly

**Solution**:
```bash
# Rebuild Node.js stage only
docker-compose build --no-cache node-builder

# Or rebuild everything
./rebuild-docker.sh
```

### 8. Port Conflicts

**Problem**: 
```
Bind for 0.0.0.0:80 failed: port is already allocated
```

**Solution**:
```bash
# Check what's using the port
sudo lsof -i :80

# Stop conflicting services
sudo systemctl stop nginx apache2

# Or change ports in docker-compose.yml
```

## Quick Commands

### Build and Start
```bash
# Full rebuild and start
./rebuild-docker.sh
docker-compose up -d

# Quick start (if already built)
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f redis
```

### Access Containers
```bash
# Access app container
docker-compose exec app bash

# Access database
docker-compose exec db mysql -u root -p

# Access Redis
docker-compose exec redis redis-cli
```

### Maintenance Commands
```bash
# Run Laravel commands
docker-compose exec app php artisan migrate
docker-compose exec app php artisan cache:clear
docker-compose exec app php artisan config:cache

# Check application status
docker-compose exec app php artisan --version
docker-compose exec app php artisan route:list
```

## Health Checks

### Application Health
```bash
# Check if app is responding
curl http://localhost/health

# Check container health
docker-compose ps
```

### Database Health
```bash
# Test database connection
docker-compose exec app php artisan tinker
# Then run: DB::connection()->getPdo();
```

### Redis Health
```bash
# Test Redis connection
docker-compose exec redis redis-cli ping
```

## Performance Optimization

### Build Optimization
```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1
./rebuild-docker.sh
```

### Runtime Optimization
```bash
# Monitor resource usage
docker stats

# Optimize container resources in docker-compose.yml
# Add memory and CPU limits
```

## Emergency Recovery

### Complete Reset
```bash
# Stop everything
docker-compose down

# Remove all containers, images, and volumes
docker-compose down --rmi all --volumes --remove-orphans
docker system prune -af

# Rebuild from scratch
./rebuild-docker.sh
docker-compose up -d
```

### Data Backup
```bash
# Backup database
docker-compose exec db mysqldump -u root -p property_management > backup.sql

# Backup application files
tar -czf app-backup.tar.gz . --exclude=node_modules --exclude=vendor
```

---

**Last Updated**: 2025  
**Maintained By**: Development Team