# Redis Environment Variables Fix
## Property Management System - Laravel 12 + React 18 + WebSocket

---

## 🚨 MASALAH YANG DIALAMI

Container tidak bisa terhubung ke Redis karena environment variables tidak ter-set dengan benar. Error yang muncul:

```
[WARNING] Critical environment variables not set by Dokploy!
[WARNING] DB_HOST:
[WARNING] REDIS_HOST:
[WARNING] Using default values from .env file
```

Kemudian script mencoba menunggu Redis di `127.0.0.1:6379` padahal environment variables menunjukkan Redis host adalah `homsjogja-redis-qmihbb`.

---

## 🔍 ANALISIS MASALAH

### 1. Environment Variables Tidak Ter-Set
- Dokploy environment variables (`REDIS_HOST=homsjogja-redis-qmihbb`) tidak ter-deteksi oleh script startup
- Script startup menggunakan default values (`127.0.0.1:6379`) yang tidak tersedia

### 2. File .env Tidak Ada atau Tidak Benar
- File `.env` mungkin tidak ada di dalam container
- Environment variables dari Dokploy tidak ter-update ke file `.env`

### 3. Redis Connection Timeout
- Script startup menunggu Redis connection tanpa timeout yang proper
- Tidak ada fallback mechanism jika Redis tidak tersedia

---

## 🛠️ SOLUSI YANG SUDAH DIIMPLEMENTASI

### 1. Perbaikan Script Startup (`docker/scripts/startup.sh`)

#### A. Environment Setup yang Lebih Robust
```bash
# Check if .env file exists, if not create it from template
if [ ! -f ".env" ]; then
    log_warning ".env file not found, creating from template..."
    if [ -f "env.dokploy.template" ]; then
        cp env.dokploy.template .env
        log_success "Created .env from template"
    else
        log_error "env.dokploy.template not found, creating basic .env..."
        # Create basic .env with default values
    fi
fi
```

#### B. Redis Wait dengan Timeout
```bash
# Check if Redis host is external (not 127.0.0.1)
REDIS_HOST_FROM_ENV=$(grep REDIS_HOST .env | cut -d'=' -f2)
if [ "$REDIS_HOST_FROM_ENV" = "127.0.0.1" ] || [ "$REDIS_HOST_FROM_ENV" = "localhost" ]; then
    log_warning "Redis host is local (127.0.0.1), skipping Redis wait..."
    log_info "Redis will be handled by external service or local installation"
else
    # Wait for Redis with timeout
    REDIS_TIMEOUT=60  # 60 seconds timeout
    # ... timeout logic
fi
```

#### C. Redis Test yang Lebih Toleran
```bash
# Test Redis connection with timeout
if php artisan tinker --execute="..." | grep -q "Redis OK"; then
    log_success "Redis connection successful!"
else
    log_warning "Redis connection failed, but continuing..."
    log_info "Application will work without Redis (some features may be limited)"
fi
```

### 2. Script Fix Manual

#### A. Bash Script (`fix-redis-environment.sh`)
- Script untuk memperbaiki environment variables di dalam container
- Mengupdate file `.env` dengan values dari Dokploy
- Test Redis connection dengan timeout

#### B. PowerShell Script (`fix-redis-environment.ps1`)
- Versi PowerShell untuk Windows
- Sama functionality dengan bash script

---

## 🚀 CARA MENGGUNAKAN SOLUSI

### Opsi 1: Restart Container (Recommended)
```bash
# Stop container
docker stop <container_name>

# Start container dengan environment variables yang benar
docker run -d \
  -e ${{project.REDIS_HOST}}=homsjogja-redis-qmihbb \
  -e ${{project.REDIS_PASSWORD}}=5vlcwpzc45g9mtho \
  -e ${{project.REDIS_PORT}}=6379 \
  -e ${{project.REDIS_USERNAME}}=default \
  -e ${{project.DB_HOST}}=homsjogja-db-xsjalx \
  -e ${{project.DB_DATABASE}}=homs-db \
  -e ${{project.DB_USERNAME}}=homs-user \
  -e ${{project.DB_PASSWORD}}=jD8-AKHx2gFCQ5gx3ouRJ \
  -e ${{project.APP_URL}}=https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me \
  <image_name>
```

### Opsi 2: Run Fix Script di Dalam Container
```bash
# Masuk ke container
docker exec -it <container_name> bash

# Run fix script
./fix-redis-environment.sh
```

### Opsi 3: Run PowerShell Script (Windows)
```powershell
# Run PowerShell script
.\fix-redis-environment.ps1
```

---

## 📋 ENVIRONMENT VARIABLES YANG DIPERLUKAN

### Dokploy Environment Variables
```bash
# Application
${{project.APP_URL}}=https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me

# Database
${{project.DB_HOST}}=homsjogja-db-xsjalx
${{project.DB_PORT}}=3306
${{project.DB_DATABASE}}=homs-db
${{project.DB_USERNAME}}=homs-user
${{project.DB_PASSWORD}}=jD8-AKHx2gFCQ5gx3ouRJ

# Redis
${{project.REDIS_HOST}}=homsjogja-redis-qmihbb
${{project.REDIS_PORT}}=6379
${{project.REDIS_USERNAME}}=default
${{project.REDIS_PASSWORD}}=5vlcwpzc45g9mtho
${{project.REDIS_URL}}=redis://default:5vlcwpzc45g9mtho@homsjogja-redis-qmihbb:6379
```

### Default Values (Jika Tidak Ada Dokploy)
```bash
# Application
APP_URL=http://localhost:8080

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=property_management
DB_USERNAME=root
DB_PASSWORD=

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=null
REDIS_USERNAME=
```

---

## 🔧 TROUBLESHOOTING

### 1. Redis Connection Timeout
**Gejala**: Container stuck di "Redis not ready, waiting..."
**Solusi**: 
- Pastikan Redis service tersedia di Dokploy
- Check network connectivity ke Redis host
- Gunakan fix script untuk skip Redis wait

### 2. Environment Variables Tidak Ter-Set
**Gejala**: Warning "Critical environment variables not set by Dokploy!"
**Solusi**:
- Pastikan environment variables di-set saat run container
- Check Dokploy configuration
- Gunakan fix script untuk set manual

### 3. File .env Tidak Ada
**Gejala**: Error "env.dokploy.template not found"
**Solusi**:
- Pastikan file `env.dokploy.template` ada di root directory
- Script akan create basic .env jika template tidak ada

### 4. Application Tidak Bisa Start
**Gejala**: Container exit dengan error
**Solusi**:
- Check container logs: `docker logs <container_name>`
- Pastikan database connection berhasil
- Redis tidak critical untuk startup (akan skip jika tidak tersedia)

---

## 📊 MONITORING & VERIFICATION

### 1. Check Container Logs
```bash
# View container logs
docker logs <container_name>

# Follow logs in real-time
docker logs -f <container_name>
```

### 2. Check Environment Variables
```bash
# Check environment variables in container
docker exec <container_name> env | grep -E "(REDIS|DB|APP)"

# Check .env file in container
docker exec <container_name> cat .env | grep -E "(REDIS|DB|APP)"
```

### 3. Test Redis Connection
```bash
# Test Redis connection manually
docker exec <container_name> php artisan tinker --execute="try { \$redis = new Redis(); \$redis->connect(config('database.redis.default.host'), config('database.redis.default.port')); if(config('database.redis.default.password')) { \$redis->auth(config('database.redis.default.password')); } \$redis->ping(); echo 'Redis OK'; } catch (Exception \$e) { echo 'Redis Error: ' . \$e->getMessage(); }"
```

### 4. Check Application Health
```bash
# Test application health endpoint
curl -f http://localhost:8080/health

# Test WebSocket endpoint
curl -f http://localhost:6002/
```

---

## 🎯 EXPECTED RESULTS

### Setelah Fix Berhasil:
1. ✅ Container start tanpa error
2. ✅ Database connection successful
3. ✅ Redis connection successful (atau skip dengan warning)
4. ✅ Application accessible di port 8080
5. ✅ WebSocket accessible di port 6002
6. ✅ Health endpoint responding

### Log Output yang Diharapkan:
```
[SUCCESS] Database is ready!
[SUCCESS] Redis is ready! (atau [WARNING] Redis connection failed, but continuing...)
[SUCCESS] Application startup completed successfully!
```

---

## 📝 NEXT STEPS

1. **Restart Container** dengan environment variables yang benar
2. **Monitor Logs** untuk memastikan startup berhasil
3. **Test Application** functionality
4. **Configure Dokploy** untuk set environment variables secara otomatis
5. **Update Documentation** jika ada perubahan konfigurasi

---

**📅 Last Updated**: 2025  
**🔄 Status**: Implemented & Tested  
**👤 Maintained By**: Development Team 