# 🔧 Perbaikan Konflik Port - Property Management System

## 📋 Ringkasan Masalah

Error Dokploy deployment:
```
Error response from daemon: failed to set up container networking: driver failed programming external connectivity on endpoint homsjogja-nginx: Bind for 0.0.0.0:443 failed: port is already allocated
```

## 🎯 Root Cause Analysis

### 1. **Port 443 Sudah Dialokasikan**
- **Masalah**: Port 443 sudah digunakan oleh container atau service lain
- **Penyebab**: Dokploy mungkin sudah menggunakan port 443 untuk HTTPS proxy
- **Solusi**: Menghapus port mapping 443 dan hanya menggunakan port 80

### 2. **Konflik Port Mapping**
- **Masalah**: Docker tidak bisa mengalokasikan port yang sudah digunakan
- **Penyebab**: Multiple services mencoba menggunakan port yang sama
- **Solusi**: Menggunakan port mapping yang unik dan tidak konflik

## 🛠️ Perbaikan yang Diterapkan

### ✅ 1. Port Mapping Configuration (`docker-compose.yml`)

**Sebelum (Dengan Konflik):**
```yaml
nginx:
  ports:
    - "80:8080"  # Dokploy expects port 80
    - "443:443"  # HTTPS port - KONFLIK!
```

**Sesudah (Tanpa Konflik):**
```yaml
nginx:
  ports:
    - "80:8080"  # Dokploy expects port 80, internal port 8080
```

### ✅ 2. Keuntungan Konfigurasi Baru

1. **Menghindari Konflik Port:**
   - Hanya menggunakan port 80 untuk HTTP
   - Tidak ada konflik dengan port 443 yang sudah dialokasikan
   - Dokploy dapat menangani HTTPS secara otomatis

2. **Dokploy HTTPS Handling:**
   - Dokploy biasanya menangani HTTPS di level proxy
   - Container hanya perlu menangani HTTP (port 80)
   - SSL termination dilakukan oleh Dokploy

3. **Simplified Configuration:**
   - Port mapping yang lebih sederhana
   - Mengurangi kemungkinan konflik
   - Lebih mudah untuk maintenance

## 🚀 Langkah Deployment

### 1. Dokploy Configuration

**Port Mapping di Dokploy:**
- **HTTP Port**: 80 (container akan menggunakan ini)
- **HTTPS**: Ditangani oleh Dokploy secara otomatis
- **Internal Port**: 8080 (dalam container)

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
curl http://localhost/health

# Check supervisor status
docker exec -it homsjogja-nginx supervisorctl status
```

## 🔍 Troubleshooting

### 1. Jika Port 80 Masih Konflik

```bash
# Check what's using port 80
netstat -tlnp | grep :80

# Check Docker containers
docker ps

# Stop conflicting containers
docker stop <container-name>

# Restart deployment
docker-compose down
docker-compose up -d
```

### 2. Jika HTTPS Tidak Bekerja

```bash
# Check if Dokploy handles HTTPS
# Usually Dokploy provides HTTPS automatically

# Test HTTP first
curl http://your-domain.com

# Check Dokploy dashboard for SSL configuration
```

### 3. Jika Container Tidak Start

```bash
# Check Docker logs
docker-compose logs nginx

# Check if port is available
docker port homsjogja-nginx

# Restart with force
docker-compose down
docker system prune -f
docker-compose up -d --force-recreate
```

## 📊 Expected Results

Setelah menerapkan perbaikan ini:

### ✅ Positive Indicators
- Deployment berhasil tanpa error port conflict
- Container nginx start dengan normal
- Port 80 mapped dengan benar
- Application accessible via HTTP
- Dokploy menangani HTTPS secara otomatis
- Health check endpoint merespons `healthy`

### ❌ Negative Indicators (Masih Ada Masalah)
- Error "port is already allocated" masih muncul
- Container nginx tidak bisa start
- Port 80 tidak bisa diakses
- Health check gagal
- HTTPS tidak bekerja

## 📋 Checklist Verifikasi

- [ ] Port mapping hanya menggunakan 80:8080
- [ ] Tidak ada konflik port 443
- [ ] Container nginx start dengan normal
- [ ] Application accessible via port 80
- [ ] Health check endpoint merespons `healthy`
- [ ] Dokploy deployment berhasil
- [ ] HTTPS ditangani oleh Dokploy (jika diperlukan)

## 🎯 Dokploy HTTPS Configuration

### Dokploy Automatic HTTPS
- Dokploy biasanya menyediakan HTTPS secara otomatis
- Container hanya perlu menangani HTTP (port 80)
- SSL termination dilakukan di level Dokploy proxy
- Certificate management ditangani oleh Dokploy

### Manual HTTPS (Jika Diperlukan)
Jika Dokploy tidak menyediakan HTTPS otomatis:

1. **Tambahkan port 443 dengan port yang berbeda:**
   ```yaml
   nginx:
     ports:
       - "80:8080"
       - "8443:443"  # Gunakan port yang berbeda
   ```

2. **Atau gunakan Dokploy SSL configuration:**
   - Set SSL certificate di Dokploy dashboard
   - Configure domain dengan SSL
   - Let Dokploy handle HTTPS termination

---

**🎯 Kesimpulan**: Perbaikan konfigurasi port mapping telah diterapkan untuk mengatasi konflik port 443. Konfigurasi baru hanya menggunakan port 80 untuk HTTP dan membiarkan Dokploy menangani HTTPS secara otomatis, yang merupakan praktik yang lebih baik untuk deployment. 