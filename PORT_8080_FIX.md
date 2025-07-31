# 🔧 Perbaikan Port Standar - Property Management System

## 📋 Ringkasan Masalah

Error Dokploy deployment:
```
Error response from daemon: failed to set up container networking: driver failed programming external connectivity on endpoint homsjogja-nginx: Bind for :::80 failed: port is already allocated
```

## 🎯 Root Cause Analysis

### 1. **Port 80 Sudah Dialokasikan**
- **Masalah**: Port 80 sudah digunakan oleh Dokploy atau service lain
- **Penyebab**: Dokploy mungkin sudah menggunakan port 80 untuk proxy atau service lain
- **Solusi**: Menggunakan port 8080 untuk external access, port 80 untuk internal

### 2. **Dokploy Port Management**
- **Masalah**: Dokploy mengelola port secara otomatis
- **Penyebab**: Port 80 dan 443 biasanya digunakan oleh Dokploy untuk proxy
- **Solusi**: Menggunakan port standar 80 internal, port 8080 external

## 🛠️ Perbaikan yang Diterapkan

### ✅ 1. Port Mapping Configuration (`docker-compose.yml`)

**Sebelum (Dengan Konflik):**
```yaml
nginx:
  ports:
    - "80:8080"  # Port 80 sudah dialokasikan
```

**Sesudah (Port Standar):**
```yaml
nginx:
  ports:
    - "8080:80"  # External port 8080, internal port 80 (standard)
```

### ✅ 2. Nginx Configuration (`docker/nginx/dokploy.conf`)

**Perubahan:**
```nginx
server {
    listen 80;  # Port standar internal
    server_name localhost;
    # ... rest of configuration
}
```

### ✅ 3. Health Check Configuration

**Perubahan:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:80/health"]  # Port 80 internal
```

### ✅ 4. Keuntungan Konfigurasi Baru

1. **Port Standar Internal:**
   - Menggunakan port 80 (standar HTTP) di dalam container
   - Nginx berjalan di port standar
   - Health check menggunakan port standar

2. **External Port Aman:**
   - Port 8080 untuk external access
   - Tidak ada konflik dengan port 80/443 yang digunakan Dokploy
   - Port yang lebih aman untuk development dan production

3. **Dokploy Integration:**
   - Dokploy dapat mengatur proxy ke port 8080
   - Lebih fleksibel untuk load balancing
   - Mudah untuk scaling

## 🚀 Langkah Deployment

### 1. Dokploy Configuration

**Port Mapping di Dokploy:**
- **External Port**: 8080 (container akan menggunakan ini)
- **Internal Port**: 80 (standar HTTP di dalam container)
- **Dokploy Proxy**: Dokploy akan mengatur proxy ke port 8080

### 2. Environment Variables

**Required Environment Variables:**
```
APP_NAME=Homsjogja
APP_ENV=production
APP_KEY=your-app-key
APP_URL=https://your-domain.com
DB_HOST=your-db-host
DB_DATABASE=your-db-name
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password
REDIS_HOST=your-redis-host
```

### 3. Verifikasi Deployment

```bash
# Check container status
docker-compose ps

# Check nginx service
docker-compose logs nginx

# Test application
curl http://localhost:8080/health

# Check supervisor status
docker exec -it homsjogja-nginx supervisorctl status

# Test internal port
docker exec -it homsjogja-nginx curl -f http://localhost:80/health
```

## 🔍 Troubleshooting

### 1. Jika Port 8080 Masih Konflik

```bash
# Check what's using port 8080
netstat -tlnp | grep :8080

# Check Docker containers
docker ps

# Stop conflicting containers
docker stop <container-name>

# Restart deployment
docker-compose down
docker-compose up -d
```

### 2. Jika Internal Port 80 Tidak Bekerja

```bash
# Check if nginx is listening on port 80
docker exec -it homsjogja-nginx netstat -tlnp | grep :80

# Check nginx config
docker exec -it homsjogja-nginx nginx -t

# Check nginx error logs
docker exec -it homsjogja-nginx tail -f /var/log/nginx/error.log
```

### 3. Jika Application Tidak Bisa Diakses

```bash
# Check if nginx is running
docker exec -it homsjogja-nginx supervisorctl status

# Test internal connectivity
docker exec -it homsjogja-nginx curl -f http://localhost:80/health

# Check port mapping
docker port homsjogja-nginx
```

## 📊 Expected Results

Setelah menerapkan perbaikan ini:

### ✅ Positive Indicators
- Deployment berhasil tanpa error port conflict
- Container nginx start dengan normal
- Port 8080:80 mapped dengan benar
- Application accessible via port 8080
- Health check endpoint merespons `healthy`
- Internal nginx berjalan di port 80 (standar)
- Dokploy dapat mengatur proxy ke port 8080

### ❌ Negative Indicators (Masih Ada Masalah)
- Error "port is already allocated" masih muncul
- Container nginx tidak bisa start
- Port 8080 tidak bisa diakses
- Health check gagal
- Internal port 80 tidak berfungsi

## 📋 Checklist Verifikasi

- [ ] Port mapping menggunakan 8080:80
- [ ] Nginx berjalan di port 80 internal
- [ ] Container nginx start dengan normal
- [ ] Application accessible via port 8080
- [ ] Health check endpoint merespons `healthy`
- [ ] Internal health check di port 80 berfungsi
- [ ] Dokploy deployment berhasil
- [ ] Dokploy dapat mengatur proxy ke port 8080

## 🎯 Dokploy Port Configuration

### Dokploy Proxy Setup
- Dokploy akan mengatur proxy dari port 80/443 ke port 8080
- Container menggunakan port 80 internal (standar)
- SSL termination dilakukan di level Dokploy proxy
- Load balancing dapat diatur oleh Dokploy

### Manual Configuration (Jika Diperlukan)
Jika Dokploy tidak mengatur proxy otomatis:

1. **Set Dokploy port mapping:**
   - External: 80 → Internal: 8080
   - External: 443 → Internal: 8080 (jika HTTPS diperlukan)

2. **Atau gunakan custom domain:**
   - Set domain di Dokploy dashboard
   - Configure DNS untuk mengarah ke Dokploy
   - Let Dokploy handle routing

## 🔧 Alternative Ports (Jika 8080 Masih Konflik)

Jika port 8080 masih konflik, gunakan port alternatif:

```yaml
nginx:
  ports:
    - "3000:80"  # Alternative port 3000
    # atau
    - "9000:80"  # Alternative port 9000
    # atau
    - "8081:80"  # Alternative port 8081
```

---

**🎯 Kesimpulan**: Perbaikan konfigurasi port mapping telah diterapkan untuk menggunakan port standar 80 di dalam container dan port 8080 untuk external access. Konfigurasi ini mengikuti standar HTTP dan lebih aman untuk deployment, serta memungkinkan Dokploy untuk mengatur proxy dan load balancing dengan lebih baik. 