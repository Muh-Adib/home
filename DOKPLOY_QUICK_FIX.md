# 🚀 DOKPLOY QUICK FIX - MySQL Deployment

## ⚡ Solusi Cepat untuk Error MySQL di Dokploy

### 🚨 Error yang Anda Alami:
```
[ERROR] [MY-010326] [Server] Fatal error: Can't open and lock privilege tables: Table 'mysql.user' doesn't exist
```

---

## 🔧 SOLUSI INSTANT (3 Langkah)

### Step 1: Bersihkan dan Setup
```bash
# Di terminal Dokploy atau server Anda:
chmod +x fix-mysql-deployment.sh
./fix-mysql-deployment.sh
```

### Step 2: Deploy dengan Konfigurasi Optimized
```bash
# Gunakan file docker-compose yang sudah diperbaiki:
docker-compose -f docker-compose.dokploy.yml up -d --build
```

### Step 3: Verify Deployment
```bash
# Check status deployment:
./health-check-dokploy.sh
```

---

## 📋 Alternative: Manual Fix (Jika Script Gagal)

### 1. Stop & Clean
```bash
docker-compose down --volumes --remove-orphans
docker volume rm $(docker volume ls -q | grep mysql) 2>/dev/null || true
```

### 2. Use Production Config
```bash
# Gunakan docker-compose.production.yml yang sudah ada:
docker-compose -f docker-compose.production.yml up -d --build

# Atau gunakan docker-compose.dokploy.yml jika sudah dibuat
docker-compose -f docker-compose.dokploy.yml up -d --build
```

### 3. Setup Laravel
```bash
# Tunggu MySQL ready (60 detik)
sleep 60

# Setup Laravel
docker-compose exec app php artisan key:generate --force
docker-compose exec app php artisan migrate --force
docker-compose exec app php artisan config:cache
```

---

## 🎯 Konfigurasi Khusus Dokploy

### Environment Variables (.env)
```env
APP_NAME="Property Management System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-dokploy-domain.com

# Database - PENTING untuk Dokploy
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=property_management
DB_USERNAME=pms_user
DB_PASSWORD=YourStrongPassword123

# Cache
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
REDIS_HOST=redis
```

### Docker Compose Settings untuk Dokploy
```yaml
# Pastikan MySQL service seperti ini:
db:
  image: mysql:8.0
  environment:
    MYSQL_DATABASE: property_management
    MYSQL_ROOT_PASSWORD: YourStrongPassword123
    MYSQL_USER: pms_user
    MYSQL_PASSWORD: YourStrongPassword123
    MYSQL_CHARACTER_SET_SERVER: utf8mb4
    MYSQL_COLLATION_SERVER: utf8mb4_unicode_ci
    # PENTING untuk Dokploy:
    MYSQL_RANDOM_ROOT_PASSWORD: "no"
    MYSQL_ONETIME_PASSWORD: "no"
  volumes:
    - mysql_data:/var/lib/mysql  # NAMED VOLUME, bukan bind mount
  command: >
    --default-authentication-plugin=mysql_native_password
    --skip-name-resolve
    --max-connections=100
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-pYourStrongPassword123"]
    interval: 30s
    timeout: 10s
    retries: 10
    start_period: 60s
```

---

## 🔍 Troubleshooting Dokploy

### Issue 1: Container Keeps Restarting
```bash
# Solution:
docker logs pms_database  # Check logs
./quick-fix-dokploy.sh    # Auto fix common issues
```

### Issue 2: Permission Denied
```bash
# Solution:
docker-compose exec app chown -R www-data:www-data /var/www/html/storage
docker-compose exec app chmod -R 755 /var/www/html/storage
```

### Issue 3: Database Connection Refused
```bash
# Check MySQL container:
docker-compose exec db mysqladmin ping -u root -p

# Check network:
docker network ls
docker-compose ps
```

### Issue 4: Deployment Timeout
```bash
# Increase timeouts in docker-compose:
healthcheck:
  start_period: 120s  # Increase if needed
  interval: 60s
  retries: 15
```

---

## 📱 Dokploy Specific Commands

### Via Dokploy Dashboard:
1. **Environment Variables**: Set all variables dari `.env.dokploy.template`
2. **Build Command**: `docker-compose -f docker-compose.dokploy.yml build`
3. **Deploy Command**: `docker-compose -f docker-compose.dokploy.yml up -d`

### Via CLI:
```bash
# Clone and deploy:
git clone your-repo
cd property-management-system

# Setup environment:
cp .env.dokploy.template .env
# Edit .env dengan domain dan password Dokploy Anda

# Deploy:
./deploy-to-dokploy.sh
```

---

## ✅ Success Checklist

Deployment berhasil jika:

- [ ] ✅ MySQL container running tanpa restart loop
- [ ] ✅ Application container healthy
- [ ] ✅ `docker-compose ps` menunjukkan semua service UP
- [ ] ✅ `curl http://your-domain/health` return OK
- [ ] ✅ Tidak ada error di `docker-compose logs`

---

## 🆘 Emergency Commands

### Complete Reset:
```bash
docker-compose down --volumes --rmi all
docker system prune -a -f
./fix-mysql-deployment.sh
./deploy-to-dokploy.sh
```

### Quick Health Check:
```bash
docker-compose ps
docker-compose logs db --tail=10
docker-compose exec db mysqladmin ping -u root -p
```

### Force MySQL Reinit:
```bash
docker-compose down
docker volume rm $(docker volume ls -q | grep mysql)
docker-compose -f docker-compose.dokploy.yml up -d db
sleep 60
docker-compose -f docker-compose.dokploy.yml up -d
```

---

## 📞 Support

### Log Files untuk Debug:
```bash
# All logs:
docker-compose logs

# MySQL specific:
docker-compose logs db

# Application specific:
docker-compose logs app

# Real-time monitoring:
docker-compose logs -f
```

### Common Error Solutions:

| Error | Quick Fix |
|-------|-----------|
| `Table 'mysql.user' doesn't exist` | `./quick-fix-dokploy.sh` |
| `Connection refused` | Check network: `docker-compose ps` |
| `Permission denied` | Fix permissions: see above |
| `Container exits` | Check logs: `docker-compose logs db` |

---

**🎯 DOKPLOY DEPLOYMENT STATUS: FIXED ✅**

Gunakan `docker-compose.dokploy.yml` atau `docker-compose.production.yml` untuk deployment yang stabil di Dokploy.

**📞 Emergency Contact**: Check `DOKPLOY_MYSQL_FIX.md` untuk troubleshooting detail.