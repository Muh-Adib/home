# 🔧 Dynamic Port Configuration - Property Management System

## 📋 Ringkasan Masalah

Error Dokploy deployment:
```
Error response from daemon: failed to set up container networking: driver failed programming external connectivity on endpoint homsjogja-nginx: Bind for 0.0.0.0:8080 failed: port is already allocated
```

## 🎯 Root Cause Analysis

### 1. **Port Conflicts dengan Dokploy**
- **Masalah**: Port 80, 443, dan 8080 sudah digunakan oleh Dokploy atau service lain
- **Penyebab**: Dokploy mengelola port secara otomatis untuk proxy dan load balancing
- **Solusi**: Menggunakan dynamic PORT variable untuk external access

### 2. **Dynamic Port Solution**
- **Masalah**: Port statis menyebabkan konflik
- **Penyebab**: Setiap deployment memerlukan port yang berbeda
- **Solusi**: Environment variable `PORT` untuk konfigurasi dinamis

## 🛠️ Perbaikan yang Diterapkan

### ✅ 1. Dynamic Port Mapping Configuration (`docker-compose.yml`)

**Sebelum (Static Port):**
```yaml
nginx:
  ports:
    - "8080:80"  # Port statis, mudah konflik
```

**Sesudah (Dynamic PORT):**
```yaml
nginx:
  ports:
    - "${PORT:-3000}:80"  # Dynamic port mapping using PORT env variable
```

### ✅ 2. Dynamic APP_URL Configuration

**Perubahan:**
```yaml
environment:
  - APP_URL=${APP_URL:-http://localhost:${PORT:-3000}}
```

### ✅ 3. Keuntungan Dynamic Port Configuration

1. **Fleksibilitas Maksimal:**
   - Port dapat diubah tanpa edit docker-compose.yml
   - Mudah untuk testing dengan port berbeda
   - Dokploy dapat mengatur port otomatis

2. **Dokploy Integration:**
   - Dokploy dapat set PORT variable otomatis
   - Menghindari port conflict
   - Auto-scaling friendly

3. **Development Friendly:**
   - Developer dapat set port sesuai kebutuhan
   - Multiple environment support
   - Easy local development

## 🚀 Cara Penggunaan Dynamic PORT

### 1. **Set PORT di Environment:**
```bash
export PORT=3000
docker-compose up -d
```

### 2. **Set PORT di .env file:**
```bash
# .env
PORT=3000
APP_URL=http://localhost:3000
```

### 3. **Set PORT di Dokploy:**
- Tambahkan variable `PORT` di Dokploy dashboard
- Atau gunakan Dokploy auto-port assignment

### 4. **Default Value:**
- Jika `PORT` tidak diset, akan menggunakan port `3000`
- Format: `${PORT:-3000}`

## 🔧 Deployment Scenarios

### 1. **Local Development**
```bash
# .env.local
PORT=3000
APP_URL=http://localhost:3000
```

### 2. **Dokploy Production**
```bash
# Dokploy akan inject otomatis:
PORT=auto-assigned
APP_URL=https://your-domain.com
```

### 3. **Custom Port**
```bash
# Untuk kebutuhan port spesifik
PORT=8080
APP_URL=http://localhost:8080
```

## 🔍 Verification Commands

### 1. **Check Port Mapping**
```bash
# Check current port mapping
docker port homsjogja-nginx

# Expected output:
# 80/tcp -> 0.0.0.0:3000
```

### 2. **Check Environment Variables**
```bash
# Check PORT variable
docker exec -it homsjogja-nginx env | grep PORT

# Check APP_URL
docker exec -it homsjogja-nginx env | grep APP_URL
```

### 3. **Test Application**
```bash
# Test dengan PORT yang diset
curl http://localhost:${PORT:-3000}/health

# Test internal port
docker exec -it homsjogja-nginx curl -f http://localhost:80/health
```

## 🛠️ Troubleshooting

### 1. **Port Masih Konflik**
```bash
# Check what's using the port
netstat -tlnp | grep :3000

# Change PORT variable
export PORT=3001
docker-compose down
docker-compose up -d
```

### 2. **Environment Variables Tidak Terbaca**
```bash
# Check if variables are loaded
docker-compose config

# Check container environment
docker exec -it homsjogja-nginx printenv | grep PORT
```

### 3. **APP_URL Mismatch**
```bash
# Ensure APP_URL matches PORT
export PORT=3000
export APP_URL=http://localhost:3000

# Restart containers
docker-compose down
docker-compose up -d
```

## 📊 Expected Results

### ✅ Positive Indicators
- Port mapping menggunakan `${PORT:-3000}:80`
- APP_URL menggunakan `${PORT:-3000}` dalam URL
- Container dapat diakses via port yang diset di PORT
- Internal nginx tetap berjalan di port 80 (standar)
- Health check berfungsi di port internal 80
- Dokploy dapat mengatur proxy ke port external
- Tidak ada error "port is already allocated"

### ❌ Negative Indicators (Masih Ada Masalah)
- Error "port is already allocated" masih muncul
- Container nginx tidak bisa start
- Port external tidak bisa diakses
- Health check gagal
- Environment variables tidak terbaca
- APP_URL tidak sesuai dengan PORT

## 📋 Checklist Verifikasi

- [ ] Port mapping menggunakan `${PORT:-3000}:80`
- [ ] Nginx berjalan di port 80 internal
- [ ] Container nginx start dengan normal
- [ ] Application accessible via port yang diset di PORT
- [ ] Health check endpoint merespons `healthy`
- [ ] Internal health check di port 80 berfungsi
- [ ] Dokploy deployment berhasil
- [ ] Dokploy dapat mengatur proxy ke port external
- [ ] Environment variable PORT dapat diubah
- [ ] APP_URL sesuai dengan PORT yang diset

## 🎯 Dokploy Integration

### Dokploy Auto-Port Assignment
- Dokploy dapat mengatur PORT variable otomatis
- Container menggunakan port 80 internal (standar)
- SSL termination dilakukan di level Dokploy proxy
- Load balancing dapat diatur oleh Dokploy

### Manual PORT Configuration
Jika perlu set PORT manual di Dokploy:

1. **Set PORT di Dokploy Dashboard:**
   - Tambahkan variable `PORT` dengan value yang diinginkan
   - Contoh: `PORT=3000` atau `PORT=8080`

2. **Atau gunakan Dokploy auto-assignment:**
   - Biarkan Dokploy mengatur PORT otomatis
   - Dokploy akan memilih port yang tersedia

## 🔧 Alternative Ports

Jika port default masih konflik, gunakan port alternatif:

```bash
# Set PORT ke port yang berbeda
export PORT=9000
# atau
export PORT=8081
# atau
export PORT=4000
```

## 📚 Dokumentasi Terkait

- **ENVIRONMENT_VARIABLES.md**: Dokumentasi lengkap environment variables
- **Dockerfile.dokploy**: Konfigurasi container
- **docker/nginx/dokploy.conf**: Nginx configuration
- **docker/supervisor/dokploy.conf**: Supervisor configuration

---

**🎯 Kesimpulan**: Konfigurasi port dinamis telah diterapkan menggunakan environment variable `PORT`. Ini memberikan fleksibilitas maksimal untuk deployment di berbagai environment dan memudahkan integrasi dengan Dokploy. Port dapat diubah dengan mudah tanpa perlu edit file konfigurasi, dan Dokploy dapat mengatur port assignment otomatis. 