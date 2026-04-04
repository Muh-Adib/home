# 🔧 Docker Port Alternatives - Port 8080 Conflict Resolution
## Property Management System website Homsjogja - Laravel 12 + React 18 + WebSocket

Dokumentasi solusi alternatif ketika port 8080 sudah digunakan oleh server.

---

## 🚨 **MASALAH: Port 8080 Sudah Digunakan**

### **🔍 Diagnosis:**
```bash
# Check what's using port 8080
netstat -tlnp | grep :8080

# Check all listening ports
netstat -tlnp | grep LISTEN

# Check Docker containers using port 8080
docker ps | grep 8080
```

---

## 🎯 **SOLUSI ALTERNATIF**

### **Option 1: Gunakan Port Host Berbeda (Recommended)**

#### **🌐 Konfigurasi Baru:**
```bash
# Container internal tetap 8080/6002
# Host external menggunakan port yang berbeda
docker run -d \
  --name homsjogja-container \
  -p 3000:8080 \        # Host:3000 → Container:8080
  -p 3001:6002 \        # Host:3001 → Container:6002
  -e APP_URL=https://your-domain.com \
  myapp:latest
```

#### **🌐 Akses dari Luar:**
```bash
# Web Application
http://server-ip:3000
https://your-domain.com:3000

# WebSocket
ws://server-ip:3001/socket.io/
wss://your-domain.com:3001/socket.io/
```

### **Option 2: Gunakan Port Standar Lain**

#### **🌐 Konfigurasi dengan Port 8000:**
```bash
docker run -d \
  --name homsjogja-container \
  -p 8000:8080 \        # Host:8000 → Container:8080
  -p 8001:6002 \        # Host:8001 → Container:6002
  -e APP_URL=https://your-domain.com \
  myapp:latest
```

#### **🌐 Akses:**
```bash
# Web: http://server-ip:8000
# WebSocket: ws://server-ip:8001/socket.io/
```

### **Option 3: Gunakan Port 9000 Series**

#### **🌐 Konfigurasi dengan Port 9000:**
```bash
docker run -d \
  --name homsjogja-container \
  -p 9000:8080 \        # Host:9000 → Container:8080
  -p 9001:6002 \        # Host:9001 → Container:6002
  -e APP_URL=https://your-domain.com \
  myapp:latest
```

#### **🌐 Akses:**
```bash
# Web: http://server-ip:9000
# WebSocket: ws://server-ip:9001/socket.io/
```

---

## 📊 **PORT MAPPING ALTERNATIVES TABLE**

| **Option** | **Web Port** | **WebSocket Port** | **Access URLs** |
|------------|--------------|-------------------|-----------------|
| **Option 1** | `3000` | `3001` | `http://server:3000` / `ws://server:3001` |
| **Option 2** | `8000` | `8001` | `http://server:8000` / `ws://server:8001` |
| **Option 3** | `9000` | `9001` | `http://server:9000` / `ws://server:9001` |
| **Option 4** | `5000` | `5001` | `http://server:5000` / `ws://server:5001` |
| **Option 5** | `4000` | `4001` | `http://server:4000` / `ws://server:4001` |

---

## 🔧 **IMPLEMENTASI YANG DISARANKAN**

### **1. Dockerfile (Tetap Sama)**
```dockerfile
# Container internal ports tetap sama
EXPOSE 8080 6002

# Health check tetap menggunakan internal ports
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health && curl -f http://localhost:6002/socket.io/ || exit 1
```

### **2. Nginx Configuration (Tetap Sama)**
```nginx
server {
    listen 8080;  # Container internal port tetap
    server_name _;
    root /var/www/html/public;
    
    # WebSocket proxy tetap sama
    location /socket.io/ {
        proxy_pass http://127.0.0.1:6002;
    }
}
```

### **3. Laravel Echo Server (Tetap Sama)**
```json
{
    "authHost": "http://localhost:8080",  # Container internal tetap
    "port": 6002,  # Container internal tetap
    "host": "localhost"
}
```

---

## 🚀 **DEPLOYMENT COMMANDS**

### **1. Build Image (Tetap Sama)**
```bash
docker build -f Dockerfile.dokploy -t homsjogja:latest .
```

### **2. Run Container dengan Port Alternatif**
```bash
# Option 1: Port 3000 series
docker run -d \
  --name homsjogja-container \
  -p 3000:8080 \
  -p 3001:6002 \
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

### **3. Check Port Mapping**
```bash
# Check container ports
docker port homsjogja-container

# Expected output:
# 3000/tcp -> 0.0.0.0:3000
# 3001/tcp -> 0.0.0.0:3001

# Check host ports
netstat -tlnp | grep -E "(3000|3001)"

# Check container internal
docker exec homsjogja-container netstat -tlnp | grep -E "(8080|6002)"
```

---

## 🌐 **ACCESS PATTERNS**

### **1. External Access (Dari Luar Container)**
```bash
# Web Application
http://server-ip:3000
https://your-domain.com:3000

# WebSocket
ws://server-ip:3001/socket.io/
wss://your-domain.com:3001/socket.io/
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

## 🔍 **TROUBLESHOOTING**

### **1. Port 3000 Juga Sudah Digunakan**
```bash
# Check available ports
netstat -tlnp | grep LISTEN

# Use different port
docker run -p 4000:8080 -p 4001:6002 myapp
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

## 📋 **QUICK DEPLOYMENT SCRIPTS**

### **Script 1: Port 3000 Series**
```bash
#!/bin/bash
echo "Deploying with port 3000 series..."

docker run -d \
  --name homsjogja-container \
  -p 3000:8080 \
  -p 3001:6002 \
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

echo "Deployed! Access at:"
echo "Web: http://server-ip:3000"
echo "WebSocket: ws://server-ip:3001/socket.io/"
```

### **Script 2: Port 8000 Series**
```bash
#!/bin/bash
echo "Deploying with port 8000 series..."

docker run -d \
  --name homsjogja-container \
  -p 8000:8080 \
  -p 8001:6002 \
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

echo "Deployed! Access at:"
echo "Web: http://server-ip:8000"
echo "WebSocket: ws://server-ip:8001/socket.io/"
```

---

## 🎯 **KEUNTUNGAN SOLUSI INI**

### **✅ Benefits:**
1. **No Code Changes**: Tidak perlu mengubah Dockerfile atau konfigurasi internal
2. **Flexibility**: Bisa menggunakan port host apapun yang tersedia
3. **Consistency**: Container internal tetap konsisten untuk debugging
4. **Scalability**: Bisa run multiple containers dengan port berbeda
5. **Quick Fix**: Solusi cepat tanpa rebuild image

### **📋 Example Scenarios:**

#### **Scenario 1: Development Server**
```bash
docker run -p 3000:8080 -p 3001:6002 myapp
# Web: http://localhost:3000
# WebSocket: ws://localhost:3001
```

#### **Scenario 2: Production Server**
```bash
docker run -p 8000:8080 -p 8001:6002 myapp
# Web: http://production-server.com:8000
# WebSocket: ws://production-server.com:8001
```

#### **Scenario 3: Multiple Instances**
```bash
docker run -p 3000:8080 -p 3001:6002 myapp1
docker run -p 4000:8080 -p 4001:6002 myapp2
docker run -p 5000:8080 -p 5001:6002 myapp3
```

---

## 🔧 **VERIFICATION COMMANDS**

### **1. Check Port Availability**
```bash
# Check if port 3000 is available
netstat -tlnp | grep :3000

# Check if port 3001 is available
netstat -tlnp | grep :3001
```

### **2. Test Application**
```bash
# Test web application
curl -v http://server-ip:3000/health

# Test WebSocket
curl -v http://server-ip:3001/socket.io/
```

### **3. Check Container Status**
```bash
# Check container is running
docker ps | grep homsjogja-container

# Check container logs
docker logs homsjogja-container

# Check port mappings
docker port homsjogja-container
```

---

**🎯 KESIMPULAN:**
- **Container internal**: Tetap menggunakan 8080/6002 (tidak berubah)
- **Host external**: Bisa menggunakan port apapun yang tersedia
- **Port mapping**: `-p HOST:CONTAINER` untuk mapping
- **Quick fix**: Tidak perlu rebuild image, cukup ganti port saat run

**📅 Last Updated**: 2025  
**🔄 Version**: 1.0  
**👤 Maintained By**: Development Team 