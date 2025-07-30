# 🔧 Supervisor Error Fix - Production Startup Issues

## Property Management System - Laravel 12 + React 18 + WebSocket

Dokumentasi untuk memperbaiki error supervisor dan startup script yang terjadi di production.

---

## 🚨 **Error yang Ditemukan**

### **1. Port Binding Error**
```
nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address in use)
```

### **2. PHP-FPM Permission Error**
```
[30-Jul-2025 09:34:17] ERROR: failed to open error_log (/proc/self/fd/2): Permission denied (13)
[30-Jul-2025 09:34:17] ERROR: failed to post process the configuration
[30-Jul-2025 09:34:17] ERROR: FPM initialization failed
```

### **3. Laravel Echo Server Config Error**
```
Error: There was a problem reading the config file.
```

---

## ✅ **Solusi yang Diterapkan**

### **1. Supervisor Configuration Fix**
```ini
# Enhanced supervisor configuration dengan:
- Proper user permissions (www user)
- Redirect stderr untuk semua programs
- Laravel Echo Server program configuration
- Health check programs
- Log cleanup program
- Better process management
```

### **2. Startup Script Enhancements**
```bash
# Added functions:
- cleanup_existing_processes() - Kill existing processes
- setup_logs() - Create log directories dengan proper permissions
- Enhanced setup_echo_server() - Proper config file permissions
- Better error handling dan logging
```

### **3. Laravel Echo Server Config Fix**
```json
{
    "authHost": "http://localhost:80",  // Fixed dari "http://app:80"
    "host": "0.0.0.0",
    "port": "6001"
}
```

---

## 🔧 **Files yang Diperbaiki**

### **1. `docker/supervisor/supervisord.conf`**
- ✅ **Added Laravel Echo Server program**
- ✅ **Enhanced error handling** - redirect_stderr untuk semua programs
- ✅ **Health check programs** - Application dan WebSocket monitoring
- ✅ **Log cleanup program** - Automatic log rotation
- ✅ **Better process management** - Proper user permissions

### **2. `docker/scripts/startup.sh`**
- ✅ **Process cleanup function** - Kill existing processes sebelum start
- ✅ **Log directory setup** - Create directories dengan proper permissions
- ✅ **Enhanced Echo Server setup** - Proper config file permissions
- ✅ **Better error handling** - Graceful degradation

### **3. `laravel-echo-server.dokploy.json`**
- ✅ **Fixed authHost** - Changed dari "http://app:80" ke "http://localhost:80"
- ✅ **Proper configuration** - Valid JSON format

---

## 🚀 **Key Improvements**

### **1. Process Management**
```bash
# Cleanup existing processes sebelum start
cleanup_existing_processes() {
    pkill -f nginx || true
    pkill -f php-fpm || true
    pkill -f laravel-echo-server || true
}
```

### **2. Log Directory Setup**
```bash
# Create log directories dengan proper permissions
setup_logs() {
    mkdir -p /var/log/supervisor /var/log/nginx /var/log/php-fpm
    chown -R www:www /var/log/supervisor
    chmod -R 755 /var/log/supervisor
    touch /var/log/supervisor/*.log
    chown www:www /var/log/supervisor/*.log
    chmod 644 /var/log/supervisor/*.log
}
```

### **3. Enhanced Supervisor Programs**
```ini
[program:laravel-echo-server]
command=laravel-echo-server start --config=/var/www/html/laravel-echo-server.dokploy.json
user=www
redirect_stderr=true

[program:health-check]
command=/bin/sh -c "while [ true ]; do curl -f http://localhost/health >/dev/null 2>&1 || echo 'Health check failed'; sleep 30; done"

[program:websocket-health-check]
command=/bin/sh -c "while [ true ]; do curl -f http://localhost:6001 >/dev/null 2>&1 || echo 'WebSocket health check failed'; sleep 45; done"
```

---

## 📊 **Verifikasi Fix**

### **1. Check Process Status**
```bash
# Inside container
docker exec -it homsjogja-container sh

# Check supervisor status
supervisorctl status

# Check running processes
ps aux | grep -E "(nginx|php-fpm|laravel-echo-server)"
```

### **2. Check Logs**
```bash
# Check supervisor logs
tail -f /var/log/supervisor/supervisord.log

# Check nginx logs
tail -f /var/log/supervisor/nginx.log

# Check PHP-FPM logs
tail -f /var/log/supervisor/php-fpm.log

# Check Echo Server logs
tail -f /var/log/supervisor/echo-server.log
```

### **3. Test Services**
```bash
# Test nginx
curl -f http://localhost/health

# Test WebSocket
curl -f http://localhost:6001

# Test PHP-FPM
php-fpm -t
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Port 80 Still in Use**
```bash
# Check what's using port 80
netstat -tlnp | grep :80

# Kill process using port 80
fuser -k 80/tcp

# Restart container
docker restart homsjogja-container
```

#### **2. Permission Issues**
```bash
# Fix permissions
chown -R www:www /var/www/html
chmod -R 755 /var/www/html/storage /var/www/html/bootstrap/cache

# Fix log permissions
chown -R www:www /var/log/supervisor
chmod -R 755 /var/log/supervisor
```

#### **3. Laravel Echo Server Issues**
```bash
# Check config file
cat /var/www/html/laravel-echo-server.dokploy.json

# Test Echo Server manually
laravel-echo-server start --config=/var/www/html/laravel-echo-server.dokploy.json

# Check Echo Server logs
tail -f /var/log/supervisor/echo-server.log
```

---

## 📋 **Supervisor Programs**

### **Active Programs**
```ini
[program:php-fpm]           # PHP-FPM process
[program:nginx]             # Nginx web server
[program:laravel-echo-server] # WebSocket server
[program:queue-worker]       # Laravel queue workers (2 instances)
[program:schedule]          # Laravel scheduler
[program:health-check]      # Application health monitoring
[program:websocket-health-check] # WebSocket health monitoring
[program:log-cleanup]       # Log rotation
```

### **Program Priorities**
```ini
priority=5   # php-fpm (highest)
priority=10  # nginx
priority=15  # laravel-echo-server
priority=999 # queue-worker, schedule (lowest)
```

---

## 🎯 **Success Indicators**

### **✅ Supervisor Success**
- ✅ **All programs running** - No FATAL states
- ✅ **No port conflicts** - Services bind successfully
- ✅ **Proper permissions** - No permission denied errors
- ✅ **Health checks passing** - Application dan WebSocket accessible

### **✅ Application Success**
- ✅ **Nginx running** - Web server accessible
- ✅ **PHP-FPM running** - PHP processing working
- ✅ **Echo Server running** - WebSocket connections working
- ✅ **Queue workers running** - Background jobs processing
- ✅ **Health checks passing** - Application monitoring working

---

## 🔧 **Additional Fixes**

### **1. Environment Variables**
```env
# Supervisor environment
SUPERVISOR_USER=root
SUPERVISOR_GROUP=root

# Log configuration
SUPERVISOR_LOG_LEVEL=info
SUPERVISOR_LOG_MAXBYTES=50MB
SUPERVISOR_LOG_BACKUPS=10
```

### **2. Process Management**
```bash
# Start supervisor
supervisord -c /etc/supervisor.d/supervisord.conf

# Control supervisor
supervisorctl status
supervisorctl restart all
supervisorctl stop all
```

### **3. Log Management**
```bash
# Log rotation
find /var/log/supervisor -name '*.log' -size +50M -exec truncate -s 50M {} \;

# Log cleanup
rm -f /var/log/supervisor/*.log.1
```

---

## 📚 **Reference**

### **Supervisor Commands**
```bash
# Check status
supervisorctl status

# Restart specific program
supervisorctl restart nginx

# Restart all programs
supervisorctl restart all

# Stop all programs
supervisorctl stop all

# Reload configuration
supervisorctl reread
supervisorctl update
```

### **Docker Commands**
```bash
# Check container logs
docker logs homsjogja-container

# Execute commands in container
docker exec -it homsjogja-container supervisorctl status

# Restart container
docker restart homsjogja-container
```

### **Troubleshooting Commands**
```bash
# Check port usage
netstat -tlnp | grep :80
netstat -tlnp | grep :6001

# Check process status
ps aux | grep nginx
ps aux | grep php-fpm
ps aux | grep laravel-echo-server

# Check file permissions
ls -la /var/log/supervisor/
ls -la /var/www/html/laravel-echo-server.dokploy.json
```

---

## 🎉 **Ready for Production!**

Error supervisor telah diperbaiki dengan:
- ✅ **Process cleanup** - Kill existing processes sebelum start
- ✅ **Proper permissions** - Log directories dan files
- ✅ **Enhanced configuration** - Better supervisor programs
- ✅ **Health monitoring** - Application dan WebSocket checks
- ✅ **Error handling** - Graceful degradation dan logging

**📅 Last Updated**: 2025  
**🔄 Version**: 2.0  
**👤 Maintained By**: Development Team 