# 🌐 Docker Port Mapping Guide
## Property Management System website Homsjogja - Laravel 12 + React 18 + WebSocket

Dokumentasi lengkap tentang cara mengatur port mapping untuk deployment Docker.

---

## 🔍 **KONSEP PORT MAPPING**

### **1. Port Internal (Container)**
```dockerfile
# Port yang digunakan DI DALAM container
EXPOSE 8080 6002
```

### **2. Port External (Host/Server)**
```bash
# Port yang diakses dari LUAR container
docker run -p 80:8080 -p 6001:6002 myapp
```

---

## 📋 **KONFIGURASI SAAT INI**

### **🌐 Current Configuration:**

#### **Container Internal Ports:**
- **Nginx**: `8080` (internal)
- **PHP-FPM**: `9000` (internal)
- **Laravel Echo Server**: `6002` (internal)

#### **Host External Ports:**
- **Nginx**: `80` (external) → `8080` (internal)
- **WebSocket**: `6001` (external) → `6002` (internal)

### **🔧 Docker Run Command:**
```bash
docker run -d \
  --name homsjogja-container \
  -p 80:8080 \
  -p 6001:6002 \
  -e DB_HOST=homsjogja-db-xsjalx \
  -e DB_PORT=3306 \
  -e DB_DATABASE=homs-db \
  -e DB_USERNAME=homs-user \
  -e DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ \
  -e REDIS_HOST=homsjogja-redis-qmihbb \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD=5vlcwpzc45g9mtho \
  myapp:latest
```

---

## 🎯 **OPTIONS KONFIGURASI**

### **Option 1: Standard Web Ports (Recommended)**
```bash
# Container internal tetap 8080/6002
# Host external menggunakan port standar
docker run -p 80:8080 -p 6001:6002 myapp

# Akses:
# Web: http://server-ip:80
# WebSocket: ws://server-ip:6001
```

### **Option 2: Custom Ports**
```bash
# Container internal tetap 8080/6002
# Host external menggunakan port custom
docker run -p 3000:8080 -p 3001:6002 myapp

# Akses:
# Web: http://server-ip:3000
# WebSocket: ws://server-ip:3001
```

### **Option 3: Same Ports (Tidak Recommended)**
```bash
# Container dan host menggunakan port yang sama
# Perlu mengubah Dockerfile
docker run -p 80:80 -p 6001:6001 myapp
```

---

## 🔧 **IMPLEMENTASI YANG DISARANKAN**

### **1. Dockerfile (Tetap Internal 8080/6002)**
```dockerfile
# Container internal ports
EXPOSE 8080 6002

# Health check menggunakan internal ports
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health && curl -f http://localhost:6002/socket.io/ || exit 1
```

### **2. Docker Run Command**
```bash
# Host external ports
docker run -d \
  --name homsjogja-container \
  -p 80:8080 \        # Host:80 → Container:8080
  -p 6001:6002 \      # Host:6001 → Container:6002
  -e APP_URL=https://your-domain.com \
  myapp:latest
```

### **3. Nginx Configuration (Internal)**
```nginx
server {
    listen 8080;  # Container internal port
    server_name _;
    root /var/www/html/public;
    
    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://127.0.0.1:6002;  # Container internal
    }
}
```

### **4. Laravel Echo Server (Internal)**
```json
{
    "authHost": "http://localhost:8080",  # Container internal
    "port": 6002,  # Container internal
    "host": "localhost"
}
```

---

## 🌐 **ACCESS PATTERNS**

### **1. External Access (Dari Luar Container)**
```bash
# Web Application
http://server-ip:80
https://your-domain.com

# WebSocket
ws://server-ip:6001/socket.io/
wss://your-domain.com/socket.io/
```

### **2. Internal Access (Di Dalam Container)**
```bash
# Web Application
http://localhost:8080

# WebSocket
ws://localhost:6002/socket.io/
```

### **3. Health Checks (Internal)**
```bash
# Health check menggunakan internal ports
curl http://localhost:8080/health
curl http://localhost:6002/socket.io/
```

---

## 📊 **PORT MAPPING TABLE**

| **Service** | **Container Internal** | **Host External** | **Access URL** |
|-------------|----------------------|-------------------|----------------|
| **Nginx Web** | `8080` | `80` | `http://server-ip:80` |
| **PHP-FPM** | `9000` | - | Internal only |
| **WebSocket** | `6002` | `6001` | `ws://server-ip:6001` |
| **Redis** | `6379` | - | External service |
| **MySQL** | `3306` | - | External service |

---

## 🔧 **DEPLOYMENT COMMANDS**

### **1. Build Image**
```bash
docker build -f Dockerfile.dokploy -t homsjogja:latest .
```

### **2. Run Container**
```bash
docker run -d \
  --name homsjogja-container \
  -p 80:8080 \
  -p 6001:6002 \
  -e APP_URL=https://homsjogja-testlaravel-jc5ygn-c6322f-213-210-36-24.traefik.me \
  -e DB_HOST=homsjogja-db-xsjalx \
  -e DB_PORT=3306 \
  -e DB_DATABASE=homs-db \
  -e DB_USERNAME=homs-user \
  -e DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ \
  -e REDIS_HOST=homsjogja-redis-qmihbb \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD=5vlcwpzc45g9mtho \
  homsjogja:latest
```

### **3. Check Ports**
```bash
# Check container ports
docker port homsjogja-container

# Check host ports
netstat -tlnp | grep -E "(80|6001)"

# Check container internal
docker exec homsjogja-container netstat -tlnp | grep -E "(8080|6002)"
```

---

## 🎯 **KEUNTUNGAN KONFIGURASI INI**

### **✅ Benefits:**
1. **Flexibility**: Bisa mengubah host port tanpa rebuild image
2. **Security**: Container internal ports tidak exposed langsung
3. **Scalability**: Bisa run multiple containers dengan port mapping berbeda
4. **Standard**: Menggunakan port standar (80) untuk web
5. **Debugging**: Internal ports tetap konsisten untuk debugging

### **📋 Example Scenarios:**

#### **Scenario 1: Production**
```bash
docker run -p 80:8080 -p 6001:6002 myapp
# Web: http://production-server.com
# WebSocket: ws://production-server.com:6001
```

#### **Scenario 2: Development**
```bash
docker run -p 3000:8080 -p 3001:6002 myapp
# Web: http://localhost:3000
# WebSocket: ws://localhost:3001
```

#### **Scenario 3: Multiple Instances**
```bash
docker run -p 8080:8080 -p 6001:6002 myapp1
docker run -p 8081:8080 -p 6002:6002 myapp2
# Instance 1: http://server:8080
# Instance 2: http://server:8081
```

---

## 🔍 **TROUBLESHOOTING**

### **1. Port Already in Use**
```bash
# Check what's using port 80
netstat -tlnp | grep :80

# Kill process using port 80
sudo fuser -k 80/tcp

# Or use different host port
docker run -p 8080:8080 myapp
```

### **2. Container Can't Start**
```bash
# Check container logs
docker logs homsjogja-container

# Check if internal ports are working
docker exec homsjogja-container curl http://localhost:8080/health
```

### **3. WebSocket Not Working**
```bash
# Check WebSocket port mapping
docker port homsjogja-container

# Test WebSocket internally
docker exec homsjogja-container curl http://localhost:6002/socket.io/
```

---

## 📚 **REFERENCE**

### **Docker Commands:**
```bash
# Port mapping
docker run -p HOST_PORT:CONTAINER_PORT image

# Check port mappings
docker port container_name

# Inspect container
docker inspect container_name | grep PortBindings
```

### **Nginx Commands:**
```bash
# Test nginx config
nginx -t

# Check nginx status
systemctl status nginx

# Check nginx ports
netstat -tlnp | grep nginx
```

---

**🎯 KESIMPULAN:**
- **Container internal**: Tetap menggunakan 8080/6002 untuk konsistensi
- **Host external**: Bisa diubah sesuai kebutuhan (80/6001 atau custom)
- **Port mapping**: `-p HOST:CONTAINER` untuk mapping
- **Flexibility**: Bisa deploy dengan port berbeda tanpa rebuild image

**📅 Last Updated**: 2025  
**🔄 Version**: 1.0  
**👤 Maintained By**: Development Team 