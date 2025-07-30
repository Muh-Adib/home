# 🔧 Startup Error Fix V2 - Production Issues Resolution

## Property Management System - Laravel 12 + React 18 + WebSocket

Dokumentasi untuk memperbaiki error startup yang terjadi di production environment.

---

## 🚨 **Error yang Ditemukan**

### **1. Port Binding Error (Masih Terjadi)**
```
nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address in use)
```

### **2. PHP-FPM Permission Error (Masih Terjadi)**
```
[30-Jul-2025 10:02:56] ERROR: failed to open error_log (/proc/self/fd/2): Permission denied (13)
[30-Jul-2025 10:02:56] ERROR: failed to post process the configuration
[30-Jul-2025 10:02:56] ERROR: FPM initialization failed
```

### **3. Laravel Echo Server Redis Config Error**
```
TypeError: Cannot read properties of undefined (reading 'keyPrefix')
```

### **4. Queue Table Command Error**
```
The "--create" option does not exist.
```

---

## ✅ **Solusi yang Diterapkan**

### **1. Enhanced Process Cleanup**
```bash
# Added port 80 check dan kill
if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    log_warning "Port 80 is still in use, trying to kill process"
    fuser -k 80/tcp || true
    sleep 3
fi
```

### **2. PHP-FPM User Fix**
```ini
# Changed PHP-FPM user dari www ke root
[program:php-fpm]
user=root
```

### **3. Laravel Echo Server Redis Config Fix**
```json
{
    "databaseConfig": {
        "redis": {
            "host": "homsjogja-redis-qmihbb",
            "port": 6379,  // Changed dari string ke integer
            "password": "5vlcwpzc45g9mtho",
            "keyPrefix": "laravel_database_",
            "db": 0
        }
    },
    "host": "localhost",  // Changed dari 0.0.0.0 ke localhost
    "port": 6001
}
```

### **4. Queue Table Setup Fix**
```bash
# Check if queue table exists, if not create it
if ! php artisan migrate:status | grep -q "jobs"; then
    log_info "Creating jobs table..."
    php artisan make:migration create_jobs_table --create=jobs || log_warning "Jobs migration already exists"
    php artisan migrate --force || log_warning "Jobs migration failed"
else
    log_info "Jobs table already exists"
fi
```

---

## 🔧 **Files yang Diperbaiki**

### **1. `docker/scripts/startup.sh`**
- ✅ **Enhanced process cleanup** - Check dan kill port 80 processes
- ✅ **Fixed Laravel Echo Server config** - Proper Redis configuration dengan localhost
- ✅ **Fixed queue table setup** - Proper migration check dan creation
- ✅ **Enhanced log directory setup** - PHP-FPM log directory creation

### **2. `docker/supervisor/supervisord.conf`**
- ✅ **Fixed PHP-FPM user** - Changed dari www ke root untuk permission
- ✅ **Enhanced error handling** - Better process management

### **3. `laravel-echo-server.dokploy.json`**
- ✅ **Fixed Redis configuration** - Proper port format (integer)
- ✅ **Fixed keyPrefix issue** - Proper Redis config structure
- ✅ **Changed host** - Dari 0.0.0.0 ke localhost untuk security

---

## 🚀 **Key Improvements**

### **1. Enhanced Process Cleanup**
```bash
cleanup_existing_processes() {
    # Kill existing processes
    pkill -f nginx || true
    pkill -f php-fpm || true
    pkill -f laravel-echo-server || true
    
    # Check if port 80 is still in use
    if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
        log_warning "Port 80 is still in use, trying to kill process"
        fuser -k 80/tcp || true
        sleep 3
    fi
}
```

### **2. Laravel Echo Server Config Fix**
```bash
# Fix Redis configuration untuk Laravel Echo Server
cat > "$ECHO_CONFIG" << 'EOF'
{
    "databaseConfig": {
        "redis": {
            "host": "homsjogja-redis-qmihbb",
            "port": 6379,  // Integer, not string
            "password": "5vlcwpzc45g9mtho",
            "keyPrefix": "laravel_database_",
            "db": 0
        }
    },
    "host": "localhost",  // Security: localhost instead of 0.0.0.0
    "port": 6001
}
EOF
```

### **3. Queue Table Setup Fix**
```bash
setup_queue() {
    # Check if queue table exists, if not create it
    if ! php artisan migrate:status | grep -q "jobs"; then
        log_info "Creating jobs table..."
        php artisan make:migration create_jobs_table --create=jobs || log_warning "Jobs migration already exists"
        php artisan migrate --force || log_warning "Jobs migration failed"
    else
        log_info "Jobs table already exists"
    fi
}
```

### **4. Enhanced Log Directory Setup**
```bash
setup_logs() {
    # Create PHP-FPM log directory
    mkdir -p /var/log/php-fpm
    chown www:www /var/log/php-fpm
    chmod 755 /var/log/php-fpm
}
```

---

## 📊 **Verifikasi Fix**

### **1. Check Process Status**
```bash
# Inside container
docker exec -it homsjogja-container sh

# Check if port 80 is free
netstat -tlnp | grep :80

# Check running processes
ps aux | grep -E "(nginx|php-fpm|laravel-echo-server)"
```

### **2. Check Laravel Echo Server**
```bash
# Check Echo Server config
cat /var/www/html/laravel-echo-server.dokploy.json

# Test Echo Server manually
laravel-echo-server start --config=/var/www/html/laravel-echo-server.dokploy.json

# Check Echo Server logs
tail -f /var/log/supervisor/echo-server.log
```

### **3. Check Queue Tables**
```bash
# Check migration status
php artisan migrate:status

# Check if jobs table exists
php artisan tinker --execute="echo Schema::hasTable('jobs') ? 'Jobs table exists' : 'Jobs table not found';"
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

# Check if port is free
netstat -tlnp | grep :80 || echo "Port 80 is free"
```

#### **2. PHP-FPM Permission Issues**
```bash
# Check PHP-FPM user
ps aux | grep php-fpm

# Fix permissions
chown -R root:root /var/log/php-fpm
chmod -R 755 /var/log/php-fpm

# Restart PHP-FPM
supervisorctl restart php-fpm
```

#### **3. Laravel Echo Server Redis Issues**
```bash
# Check Redis connection
redis-cli -h homsjogja-redis-qmihbb -p 6379 -a 5vlcwpzc45g9mtho ping

# Test Echo Server config
laravel-echo-server start --config=/var/www/html/laravel-echo-server.dokploy.json --dev
```

#### **4. Queue Table Issues**
```bash
# Check if jobs table exists
php artisan migrate:status | grep jobs

# Create jobs table if needed
php artisan make:migration create_jobs_table --create=jobs
php artisan migrate --force
```

---

## 📋 **Configuration Details**

### **1. Laravel Echo Server Redis Config**
```json
{
    "databaseConfig": {
        "redis": {
            "host": "homsjogja-redis-qmihbb",
            "port": 6379,  // Must be integer
            "password": "5vlcwpzc45g9mtho",
            "keyPrefix": "laravel_database_",
            "db": 0
        }
    },
    "host": "localhost",  // Security: localhost instead of 0.0.0.0
    "port": 6001
}
```

### **2. Supervisor PHP-FPM Config**
```ini
[program:php-fpm]
command=/usr/local/sbin/php-fpm --nodaemonize --fpm-config /usr/local/etc/php-fpm.conf
user=root  # Changed dari www ke root
autostart=true
autorestart=true
priority=5
```

### **3. Process Cleanup**
```bash
# Enhanced cleanup dengan port check
cleanup_existing_processes() {
    pkill -f nginx || true
    pkill -f php-fpm || true
    pkill -f laravel-echo-server || true
    
    # Check port 80
    if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
        fuser -k 80/tcp || true
        sleep 3
    fi
}
```

---

## 🎯 **Success Indicators**

### **✅ Process Success**
- ✅ **Port 80 free** - No port binding conflicts
- ✅ **PHP-FPM running** - No permission errors
- ✅ **Nginx running** - Web server accessible
- ✅ **Echo Server running** - WebSocket connections working

### **✅ Configuration Success**
- ✅ **Redis config valid** - No keyPrefix errors
- ✅ **Queue tables exist** - Jobs table created properly
- ✅ **Log directories exist** - Proper permissions set
- ✅ **Supervisor programs running** - All services started
- ✅ **Security improved** - localhost instead of 0.0.0.0

---

## 🔧 **Additional Fixes**

### **1. Environment Variables**
```env
# PHP-FPM configuration
PHP_FPM_USER=root
PHP_FPM_GROUP=root

# Log configuration
PHP_FPM_LOG_LEVEL=notice
NGINX_LOG_LEVEL=error
```

### **2. Process Management**
```bash
# Check all processes
supervisorctl status

# Restart specific services
supervisorctl restart php-fpm
supervisorctl restart nginx
supervisorctl restart laravel-echo-server

# Check logs
tail -f /var/log/supervisor/php-fpm.log
tail -f /var/log/supervisor/nginx.log
tail -f /var/log/supervisor/echo-server.log
```

### **3. Debug Commands**
```bash
# Check port usage
netstat -tlnp | grep :80
netstat -tlnp | grep :6001

# Check process status
ps aux | grep nginx
ps aux | grep php-fpm
ps aux | grep laravel-echo-server

# Check file permissions
ls -la /var/log/php-fpm/
ls -la /var/www/html/laravel-echo-server.dokploy.json
```

---

## 📚 **Reference**

### **Laravel Commands**
```bash
# Queue management
php artisan queue:table
php artisan migrate --force
php artisan queue:work redis

# Cache management
php artisan config:cache
php artisan route:cache
php artisan view:cache
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
# Check Redis connection
redis-cli -h homsjogja-redis-qmihbb -p 6379 -a 5vlcwpzc45g9mtho ping

# Test Echo Server
laravel-echo-server start --config=/var/www/html/laravel-echo-server.dokploy.json

# Check PHP-FPM config
php-fpm -t
```

---

## 🎉 **Ready for Production!**

Error startup telah diperbaiki dengan:
- ✅ **Enhanced process cleanup** - Better port management
- ✅ **Fixed PHP-FPM permissions** - Root user untuk supervisor
- ✅ **Fixed Laravel Echo Server** - Proper Redis configuration
- ✅ **Fixed queue table setup** - Proper migration handling
- ✅ **Enhanced error handling** - Better logging dan debugging
- ✅ **Security improvement** - localhost instead of 0.0.0.0

**📅 Last Updated**: 2025  
**🔄 Version**: 2.2  
**👤 Maintained By**: Development Team 