# Panduan Deployment Laravel ke Dokploy

## Perbaikan yang Dilakukan

### 1. Dockerfile.dokploy yang Diperbaiki

**Masalah yang diperbaiki:**
- ❌ Error `npm ci` karena package-lock.json di-exclude
- ❌ Konfigurasi untuk Redis dan DB terpisah tidak optimal  
- ❌ Build Node.js dependencies tidak reliable
- ❌ Missing connectivity checks untuk external services

**Solusi yang diimplementasikan:**
- ✅ Menghapus `package-lock.json` dari `.dockerignore`
- ✅ Menambahkan `netcat-openbsd` untuk connectivity testing
- ✅ Improved error handling untuk npm install dengan fallback
- ✅ Optimasi untuk external Redis dan Database
- ✅ Startup script untuk handle migrations dan service connectivity
- ✅ Menghapus Laravel Echo Server (untuk terpisah service)

### 2. Files yang Diubah/Ditambahkan

```
├── Dockerfile.dokploy          # ✅ Diperbaiki untuk external services
├── .dockerignore              # ✅ Package-lock.json di-uncomment
├── docker/scripts/startup.sh   # ✅ Baru: Startup script dengan connectivity check
├── docker/supervisor/dokploy.conf # ✅ Dioptimasi tanpa Echo Server
├── .env.dokploy               # ✅ Environment template untuk deployment
└── docker-compose.dokploy.yml # ✅ Testing compose file
```

## Cara Deploy ke Dokploy

### 1. Environment Variables di Dokploy

Set environment variables berikut di Dokploy dashboard:

```bash
# Database (External MySQL Service)
DB_HOST=your-mysql-host
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Redis (External Redis Service)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_or_null

# Application
APP_ENV=production
APP_DEBUG=false
APP_KEY=your_generated_key
APP_URL=https://yourdomain.com
```

### 2. Build Configuration

Pastikan di Dokploy:
- **Dockerfile**: `Dockerfile.dokploy`
- **Build Context**: Root directory (`.`)
- **Port**: `80`

### 3. Database Setup (Sebelum Deploy)

Jika menggunakan external database, pastikan:

```sql
-- Buat database dan user
CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'your_username'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON your_database_name.* TO 'your_username'@'%';
FLUSH PRIVILEGES;
```

### 4. Redis Setup (Sebelum Deploy)

Pastikan Redis service bisa diakses dari aplikasi Laravel dan konfigurasi:
- Host dan port yang benar
- Password jika ada
- Network connectivity

## Testing Local (Opsional)

Untuk testing Dockerfile sebelum deploy:

```bash
# Build dan test dengan external services
docker-compose -f docker-compose.dokploy.yml up --build

# Test hanya build image
docker build -f Dockerfile.dokploy -t laravel-dokploy-test .

# Test startup script
docker run --rm laravel-dokploy-test /usr/local/bin/startup.sh
```

## Monitoring dan Troubleshooting

### 1. Health Check

Aplikasi memiliki endpoint health check di `/health`

### 2. Logs untuk Debug

```bash
# Via Dokploy console atau Docker logs
docker logs your-container-name

# Specific logs dalam container
docker exec -it your-container-name tail -f /var/log/nginx/error.log
docker exec -it your-container-name tail -f /var/www/html/storage/logs/laravel.log
```

### 3. Common Issues

**Issue**: Database connection failed
```bash
# Check environment variables
docker exec -it your-container-name env | grep DB_

# Test connection manually
docker exec -it your-container-name php artisan migrate:status
```

**Issue**: Redis connection failed  
```bash
# Check Redis connectivity
docker exec -it your-container-name php artisan tinker --execute="Redis::ping();"
```

**Issue**: npm ci still failing
```bash
# Check if package-lock.json is included in build
docker exec -it your-container-name ls -la package*
```

## Optimasi Performance

### 1. Laravel Cache

Aplikasi akan otomatis cache config, routes, dan views saat startup.

### 2. OPcache

PHP OPcache sudah dikonfigurasi optimal untuk production.

### 3. Nginx

Konfigurasi nginx sudah include:
- Gzip compression
- Static file caching
- Buffer optimization

### 4. Supervisor

Queue workers dan scheduler sudah dikonfigurasi optimal dengan supervisor.

## Support

Jika masih ada error saat deployment:

1. Check Dokploy logs untuk detail error
2. Verifikasi environment variables sudah benar
3. Pastikan external services (DB, Redis) dapat diakses
4. Check network connectivity antara services