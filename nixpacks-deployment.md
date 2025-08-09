# 🚀 NIXPACKS DEPLOYMENT GUIDE
# Property Management System - Laravel 12 + React + WebSocket

## 📋 OVERVIEW

Deployment yang aman menggunakan Nixpacks dengan Dockerfile untuk menghindari looping dan error handling yang lebih baik.

## 🔧 PERUBAHAN UTAMA

### 1. **Safe Startup Script** (`dokploy/scripts/safe-startup.sh`)
- ✅ **No Looping**: Menggunakan `set -euo pipefail` untuk exit on error
- ✅ **Timeout Protection**: Semua command memiliki timeout (30s-300s)
- ✅ **Proper Error Handling**: Exit codes yang jelas
- ✅ **Color-coded Logging**: Info, Success, Warning, Error levels
- ✅ **Graceful Degradation**: Non-critical failures tidak stop deployment

### 2. **Optimized Nixpacks Configuration** (`nixpacks.toml`)
- ✅ **Updated Start Command**: Menggunakan `safe-startup.sh`
- ✅ **Proper Dependencies**: Semua PHP extensions dan tools
- ✅ **Build Optimization**: Layer caching dan proper permissions

### 3. **Dockerfile for Nixpacks** (`Dockerfile.nixpacks`)
- ✅ **Multi-stage Build**: Node.js build + PHP production
- ✅ **Security**: Proper user permissions dan ownership
- ✅ **Health Checks**: Comprehensive health monitoring
- ✅ **Error Handling**: Graceful failure handling

## 🚀 DEPLOYMENT STEPS

### Step 1: Update Configuration Files

```bash
# Backup old startup script
cp dokploy/scripts/startup.sh dokploy/scripts/startup.sh.backup

# Use new safe startup script
# (already created: dokploy/scripts/safe-startup.sh)

# Update nixpacks configuration
# (already updated: nixpacks.toml)
```

### Step 2: Deploy with Nixpacks

```bash
# Option 1: Use existing nixpacks.toml
# Dokploy akan menggunakan nixpacks.toml secara otomatis

# Option 2: Use Dockerfile.nixpacks
# Set environment variable: DOCKERFILE_PATH=Dockerfile.nixpacks
```

### Step 3: Monitor Deployment

```bash
# Check deployment logs
tail -f /var/log/supervisor/supervisord.log

# Check application logs
tail -f storage/logs/laravel.log

# Check WebSocket logs
tail -f /var/log/supervisor/websocket-error.log
```

## 🔍 SAFETY FEATURES

### 1. **Error Prevention**
- ✅ **Exit on Error**: `set -euo pipefail`
- ✅ **Timeout Protection**: Semua commands memiliki timeout
- ✅ **Validation Checks**: File existence checks
- ✅ **Graceful Degradation**: Non-critical failures tidak stop deployment

### 2. **Logging & Monitoring**
- ✅ **Color-coded Output**: Info (blue), Success (green), Warning (yellow), Error (red)
- ✅ **Structured Logging**: Consistent log format
- ✅ **Error Context**: Detailed error information
- ✅ **Health Checks**: Application health monitoring

### 3. **Resource Management**
- ✅ **Memory Protection**: Timeout pada heavy operations
- ✅ **Disk Space**: Proper cleanup dan optimization
- ✅ **Process Management**: Proper supervisor integration
- ✅ **Network Timeouts**: Connection timeout protection

## 🛠️ TROUBLESHOOTING

### Common Issues & Solutions

#### 1. **Startup Script Fails**
```bash
# Check script permissions
chmod +x dokploy/scripts/safe-startup.sh

# Check script syntax
bash -n dokploy/scripts/safe-startup.sh

# Run script manually
bash dokploy/scripts/safe-startup.sh
```

#### 2. **Redis Connection Issues**
```bash
# Check Redis extension
php -m | grep redis

# Test Redis connection
php artisan tinker --execute="Redis::connection()->ping();"

# Check environment variables
echo "REDIS_HOST: $REDIS_HOST"
echo "REDIS_PORT: $REDIS_PORT"
```

#### 3. **Database Connection Issues**
```bash
# Test database connection
php artisan tinker --execute="DB::connection()->getPdo();"

# Check database configuration
php artisan config:show database
```

#### 4. **WebSocket Issues**
```bash
# Check WebSocket service
supervisorctl status websocket

# Check WebSocket logs
tail -f /var/log/supervisor/websocket-error.log

# Test WebSocket connection
curl http://localhost:6001/socket.io/
```

## 📊 MONITORING

### Health Check Endpoints
- ✅ **Application Health**: `http://localhost/health`
- ✅ **WebSocket Health**: `http://localhost:6001/socket.io/`
- ✅ **Database Health**: Internal Laravel health checks
- ✅ **Redis Health**: Internal Redis connection checks

### Log Monitoring
```bash
# Application logs
tail -f storage/logs/laravel.log

# Supervisor logs
tail -f /var/log/supervisor/supervisord.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# WebSocket logs
tail -f /var/log/supervisor/websocket-error.log
```

## 🔄 ROLLBACK PROCEDURE

### If Deployment Fails
```bash
# 1. Stop current deployment
supervisorctl stop all

# 2. Restore backup startup script
cp dokploy/scripts/startup.sh.backup dokploy/scripts/startup.sh

# 3. Update nixpacks.toml to use old script
# Change: cmd = "bash dokploy/scripts/safe-startup.sh"
# To: cmd = "bash dokploy/scripts/startup.sh"

# 4. Redeploy
# Use Dokploy dashboard to redeploy
```

## 📈 PERFORMANCE OPTIMIZATION

### 1. **Build Optimization**
- ✅ **Layer Caching**: Proper Docker layer ordering
- ✅ **Dependency Caching**: npm/composer cache optimization
- ✅ **Asset Optimization**: Production build optimization

### 2. **Runtime Optimization**
- ✅ **OPcache**: PHP bytecode caching
- ✅ **Redis Caching**: Session dan cache optimization
- ✅ **Nginx Optimization**: Static file serving
- ✅ **Supervisor Management**: Process monitoring

## 🎯 SUCCESS METRICS

### Deployment Success Indicators
- ✅ **Startup Time**: < 2 minutes
- ✅ **Health Checks**: All services responding
- ✅ **Error Rate**: < 1% startup errors
- ✅ **Resource Usage**: Normal CPU/memory usage
- ✅ **Service Status**: All supervisor services running

### Monitoring Checklist
- [ ] Application responds to HTTP requests
- [ ] WebSocket service is running
- [ ] Database connections are working
- [ ] Redis connections are working
- [ ] All log files are being written
- [ ] Health checks are passing
- [ ] No error loops in logs

## 🔐 SECURITY CONSIDERATIONS

### 1. **File Permissions**
- ✅ **Proper Ownership**: www-data user ownership
- ✅ **Secure Permissions**: 755 for directories, 644 for files
- ✅ **Log Security**: Proper log file permissions

### 2. **Environment Security**
- ✅ **No Hardcoded Secrets**: All secrets via environment variables
- ✅ **Secure Configuration**: Production-ready configurations
- ✅ **Access Control**: Proper user/group permissions

## 📝 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Backup current startup script
- [ ] Test safe-startup.sh locally
- [ ] Verify nixpacks.toml configuration
- [ ] Check Dockerfile.nixpacks syntax
- [ ] Ensure all config files are present

### During Deployment
- [ ] Monitor deployment logs
- [ ] Check for timeout errors
- [ ] Verify service startup order
- [ ] Monitor resource usage
- [ ] Test health endpoints

### Post-Deployment
- [ ] Verify all services are running
- [ ] Test application functionality
- [ ] Check WebSocket connections
- [ ] Monitor error logs
- [ ] Validate performance metrics

---

**🎯 RESULT**: Deployment yang aman tanpa looping, dengan proper error handling dan monitoring yang comprehensive.
