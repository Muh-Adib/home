# 🔌 PORT MAPPING DOCUMENTATION
## Property Management System website Homsjogja - Laravel 12 + React + WebSocket

---

## 📋 **PORT OVERVIEW**

### **Internal Container Ports:**
```
┌─────────────────────────────────────────────────────────────┐
│                    NIXPACKS CONTAINER                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   NGINX     │  │  PHP-FPM    │  │ SUPERVISOR  │        │
│  │   Port 80   │  │ Port 9000   │  │  (Manager)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ LARAVEL     │  │   QUEUE     │  │ WEBSOCKET   │        │
│  │ ARTISAN     │  │   WORKER    │  │ Port 6001   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### **External Service Ports:**
```
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   MYSQL     │  │    REDIS    │  │    MAIL     │        │
│  │ Port 3306   │  │ Port 6379   │  │ Port 587   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **DETAILED PORT CONFIGURATION**

### **1. Web Server (Nginx) - Port 80**
```nginx
# dokploy/config/nginx.conf
server {
    listen 80;
    server_name _;
    root /app/public;
    index index.php index.html;
    
    # Laravel Application
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    # PHP Files
    location ~ \.php$ {
        fastcgi_pass php-fpm;  # Points to port 9000
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # WebSocket Proxy
    location /socket.io/ {
        proxy_pass http://127.0.0.1:6001;  # WebSocket server
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Fungsi:**
- ✅ Menangani HTTP requests
- ✅ Serve Laravel application
- ✅ Serve React build assets
- ✅ Proxy WebSocket connections
- ✅ Rate limiting & security headers

### **2. PHP-FPM - Port 9000**
```ini
# dokploy/config/php-fpm.conf
[www]
listen = 127.0.0.1:9000
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
```

**Fungsi:**
- ✅ Process PHP files
- ✅ Handle Laravel requests
- ✅ Internal communication dengan Nginx
- ✅ Not accessible from external

### **3. WebSocket Server - Port 6001**
```json
// laravel-echo-server.json
{
    "port": 6001,
    "host": "0.0.0.0",
    "protocol": "http"
}
```

**Fungsi:**
- ✅ Real-time communication
- ✅ Broadcasting events
- ✅ Socket.IO connections
- ✅ Live notifications

### **4. External Database - Port 3306**
```env
# Environment Variables
DB_CONNECTION=mysql
DB_HOST=homsjogja-db-xsjalx
DB_PORT=3306
DB_DATABASE=homs-db
DB_USERNAME=homs-user
DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ
```

**Fungsi:**
- ✅ Store application data
- ✅ User management
- ✅ Booking records
- ✅ Property information

### **5. External Redis - Port 6379**
```env
# Environment Variables
REDIS_HOST=homsjogja-redis-qmihbb
REDIS_PASSWORD=5vlcwpzc45g9mtho
REDIS_PORT=6379
REDIS_DB=0
```

**Fungsi:**
- ✅ Cache storage
- ✅ Session management
- ✅ Queue processing
- ✅ Broadcasting events

### **6. Mail Server - Port 587**
```env
# Environment Variables
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
```

**Fungsi:**
- ✅ Send email notifications
- ✅ Booking confirmations
- ✅ Password resets
- ✅ System notifications

---

## 🔍 **PORT TESTING & VERIFICATION**

### **1. Check Internal Ports**
```bash
# Check if ports are listening
netstat -tlnp | grep -E ':(80|9000|6001)'

# Expected output:
# tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN
# tcp        0      0 127.0.0.1:9000          0.0.0.0:*               LISTEN
# tcp        0      0 0.0.0.0:6001            0.0.0.0:*               LISTEN
```

### **2. Test Web Server (Port 80)**
```bash
# Test HTTP response
curl -I http://localhost/

# Test health endpoint
curl http://localhost/health

# Expected response:
# HTTP/1.1 200 OK
# Server: nginx
# Content-Type: text/html; charset=UTF-8
```

### **3. Test WebSocket (Port 6001)**
```bash
# Test WebSocket server
curl http://localhost:6001/

# Expected response:
# {"status":"ok","message":"Laravel Echo Server"}
```

### **4. Test External Connections**
```bash
# Test database connection
php artisan tinker --execute="DB::connection()->getPdo();"

# Test Redis connection
php artisan tinker --execute="Redis::connection()->ping();"

# Expected output:
# ✅ Database connection successful
# ✅ Redis connection successful
```

---

## 🛡️ **SECURITY CONSIDERATIONS**

### **1. Internal Ports (Container)**
- **Port 80**: Public access (HTTP)
- **Port 9000**: Internal only (PHP-FPM)
- **Port 6001**: Internal + Proxy access (WebSocket)

### **2. External Ports (Dokploy)**
- **Port 3306**: Database (External service)
- **Port 6379**: Redis (External service)
- **Port 587**: Mail (External service)

### **3. Firewall Rules**
```bash
# Only port 80 should be publicly accessible
# Port 9000 and 6001 are internal only
# External services are managed by Dokploy
```

---

## 📊 **PORT MONITORING**

### **1. Service Status Check**
```bash
# Check all services
supervisorctl status

# Expected output:
# php-fpm                          RUNNING
# nginx                            RUNNING
# laravel-queue                    RUNNING
# websocket                        RUNNING
```

### **2. Port Usage Monitoring**
```bash
# Monitor port usage
ss -tlnp | grep -E ':(80|9000|6001)'

# Check connections
netstat -an | grep -E ':(80|9000|6001)'
```

### **3. Log Monitoring**
```bash
# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PHP-FPM logs
tail -f /var/log/supervisor/php-fpm-error.log

# WebSocket logs
tail -f /var/log/supervisor/websocket.log
```

---

## 🔧 **TROUBLESHOOTING PORTS**

### **Issue 1: Port 80 Not Responding**
```bash
# Check Nginx status
supervisorctl status nginx

# Check Nginx logs
tail -f /var/log/supervisor/nginx-error.log

# Test Nginx config
nginx -t
```

### **Issue 2: Port 9000 (PHP-FPM) Not Working**
```bash
# Check PHP-FPM status
supervisorctl status php-fpm

# Check PHP-FPM logs
tail -f /var/log/supervisor/php-fpm-error.log

# Test PHP-FPM config
php-fpm83 -t
```

### **Issue 3: Port 6001 (WebSocket) Not Working**
```bash
# Check WebSocket status
supervisorctl status websocket

# Check WebSocket logs
tail -f /var/log/supervisor/websocket.log

# Test WebSocket directly
curl http://localhost:6001/
```

### **Issue 4: External Ports Not Accessible**
```bash
# Test database connection
php artisan tinker --execute="DB::connection()->getPdo();"

# Test Redis connection
php artisan tinker --execute="Redis::connection()->ping();"

# Check environment variables
./dokploy/scripts/validate-env.sh
```

---

## 📋 **PORT SUMMARY**

| Service | Port | Access | Status | Function |
|---------|------|--------|--------|----------|
| **Nginx** | 80 | Public | ✅ Active | Web server |
| **PHP-FPM** | 9000 | Internal | ✅ Active | PHP processing |
| **WebSocket** | 6001 | Internal+Proxy | ✅ Active | Real-time comm |
| **MySQL** | 3306 | External | ✅ Active | Database |
| **Redis** | 6379 | External | ✅ Active | Cache/Queue |
| **Mail** | 587 | External | ✅ Active | Email |

---

## 🎯 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment:**
- [ ] Verify all config files exist
- [ ] Check port configurations
- [ ] Validate environment variables
- [ ] Test external service connections

### **Post-Deployment:**
- [ ] Check all services running
- [ ] Test port accessibility
- [ ] Verify WebSocket functionality
- [ ] Monitor logs for errors

---

**🎯 FOKUS UTAMA**: 
- ✅ Port 80: Public web access
- ✅ Port 9000: Internal PHP processing
- ✅ Port 6001: Real-time WebSocket
- ✅ External ports: Database, Cache, Mail
- ✅ Comprehensive monitoring & troubleshooting

**📅 Last Updated**: 2025  
**📝 Version**: 1.0  
**👤 Maintained By**: Development Team
