# 🔧 Perbaikan MySQL Deployment untuk Dokploy

## 🚨 Masalah yang Ditemukan

Error log menunjukkan MySQL tidak dapat menginisialisasi tabel sistem yang diperlukan:

```
[ERROR] [MY-010326] [Server] Fatal error: Can't open and lock privilege tables: Table 'mysql.user' doesn't exist
[ERROR] [MY-010952] [Server] The privilege system failed to initialize correctly
```

### Penyebab Utama:
1. **Volume MySQL corrupt** atau tidak terinisialisasi dengan benar
2. **Mount point** yang bermasalah di environment Dokploy
3. **Konfigurasi MySQL** tidak optimal untuk container deployment
4. **Healthcheck** yang terlalu ketat menyebabkan restart loop

---

## ✅ Solusi Komprehensif

### 🎯 Solusi 1: Gunakan Konfigurasi Dokploy-Optimized (RECOMMENDED)

Jalankan script perbaikan otomatis:

```bash
chmod +x fix-mysql-deployment.sh
./fix-mysql-deployment.sh
```

Script ini akan:
- ✅ Membersihkan volume MySQL yang corrupt
- ✅ Membuat `docker-compose.dokploy.yml` yang dioptimasi
- ✅ Menyiapkan MySQL init script
- ✅ Membuat script deployment dan health check

### 🚀 Solusi 2: Deploy Manual dengan File Optimized

```bash
# 1. Stop dan bersihkan deployment lama
docker-compose down --volumes --remove-orphans

# 2. Hapus volume MySQL yang corrupt
docker volume rm $(docker volume ls -q | grep mysql) 2>/dev/null || true

# 3. Deploy dengan konfigurasi optimized
docker-compose -f docker-compose.dokploy.yml up -d --build

# 4. Tunggu MySQL initialize (60 detik)
sleep 60

# 5. Setup Laravel
docker-compose -f docker-compose.dokploy.yml exec app php artisan key:generate --force
docker-compose -f docker-compose.dokploy.yml exec app php artisan migrate --force
```

### 🔧 Solusi 3: Quick Fix untuk Masalah Cepat

```bash
chmod +x quick-fix-dokploy.sh
./quick-fix-dokploy.sh
```

---

## 📋 Konfigurasi Yang Diperbaiki

### 1. MySQL Service Optimization

**Sebelum (Bermasalah):**
```yaml
db:
  image: mysql:8.0
  command: --default-authentication-plugin=mysql_native_password --innodb-buffer-pool-size=128M
  healthcheck:
    interval: 60s
    timeout: 30s
    retries: 15
    start_period: 120s
```

**Sesudah (Diperbaiki):**
```yaml
db:
  image: mysql:8.0
  environment:
    MYSQL_RANDOM_ROOT_PASSWORD: "no"    # Force proper init
    MYSQL_ONETIME_PASSWORD: "no"        # Disable one-time password
  command: >
    --default-authentication-plugin=mysql_native_password
    --innodb-buffer-pool-size=128M
    --innodb-log-file-size=32M
    --innodb-flush-log-at-trx-commit=2
    --innodb-flush-method=O_DIRECT_NO_FSYNC
    --skip-name-resolve
    --max-connections=100
  healthcheck:
    interval: 30s        # Lebih sering check
    timeout: 10s         # Timeout lebih cepat
    retries: 10          # Lebih sedikit retry
    start_period: 60s    # Waktu start lebih cepat
```

### 2. Volume Strategy

**Development (bind mounts):**
```yaml
volumes:
  - ./docker/volumes/mysql:/var/lib/mysql
```

**Production/Dokploy (named volumes):**
```yaml
volumes:
  - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
    driver: local
```

### 3. Environment Variables

**File `.env.dokploy.template`:**
```env
# Database Configuration untuk Dokploy
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=property_management
DB_USERNAME=pms_user
DB_PASSWORD=secret

# Cache & Session
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

---

## 🔍 Monitoring & Troubleshooting

### Health Check Commands

```bash
# Check deployment status
./health-check-dokploy.sh

# Manual health checks
docker-compose -f docker-compose.dokploy.yml ps
docker-compose -f docker-compose.dokploy.yml logs db --tail=20
docker-compose -f docker-compose.dokploy.yml exec db mysqladmin ping -u root -p
```

### Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **MySQL Won't Start** | Container keeps restarting | `./quick-fix-dokploy.sh` |
| **Permission Denied** | Storage/cache errors | Check file permissions |
| **Connection Refused** | App can't connect to DB | Verify network connectivity |
| **Slow Performance** | Long response times | Optimize MySQL settings |

### MySQL Log Analysis

```bash
# Check MySQL error logs
docker-compose -f docker-compose.dokploy.yml logs db | grep ERROR

# Check initialization logs
docker-compose -f docker-compose.dokploy.yml logs db | grep "ready for connections"

# Monitor real-time logs
docker-compose -f docker-compose.dokploy.yml logs -f db
```

---

## 🎯 Deployment Workflow untuk Dokploy

### Step 1: Preparation
```bash
# Clone repository
git clone <your-repo>
cd property-management-system

# Setup environment
cp .env.dokploy.template .env
# Edit .env dengan konfigurasi Dokploy Anda
```

### Step 2: Fix MySQL Issues
```bash
# Jalankan fix script
chmod +x fix-mysql-deployment.sh
./fix-mysql-deployment.sh
```

### Step 3: Deploy
```bash
# Deploy menggunakan konfigurasi optimized
./deploy-to-dokploy.sh
```

### Step 4: Verify
```bash
# Check deployment health
./health-check-dokploy.sh

# Test application
curl http://your-dokploy-url/health
```

---

## 📊 Performance Optimization

### MySQL Settings untuk Small Instance

```sql
-- Konfigurasi optimized untuk instance kecil (512MB-1GB RAM)
innodb-buffer-pool-size=128M      -- 15-20% dari total RAM
innodb-log-file-size=32M          -- Untuk recovery yang cepat
max-connections=100               -- Batasi koneksi bersamaan
query-cache-size=32M              -- Cache query results
thread-cache-size=8               -- Reuse threads
table-open-cache=64               -- Cache open tables
```

### Container Resource Limits

```yaml
# Tambahkan ke docker-compose.dokploy.yml jika diperlukan
db:
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '0.5'
      reservations:
        memory: 256M
        cpus: '0.25'
```

---

## 🔐 Security Considerations

### 1. Database Security
```yaml
environment:
  MYSQL_RANDOM_ROOT_PASSWORD: "no"
  MYSQL_ONETIME_PASSWORD: "no"
  # Gunakan password yang kuat di production
  MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
```

### 2. Network Security
```yaml
networks:
  pms_network:
    driver: bridge
    internal: true  # Tambahkan untuk isolasi network
```

### 3. File Permissions
```bash
# Set proper permissions
docker-compose exec app chown -R www-data:www-data /var/www/html/storage
docker-compose exec app chmod -R 755 /var/www/html/storage
```

---

## 📚 Files Yang Dibuat

Setelah menjalankan `fix-mysql-deployment.sh`, file-file berikut akan dibuat:

```
├── docker-compose.dokploy.yml      # Konfigurasi optimized untuk Dokploy
├── deploy-to-dokploy.sh           # Script deployment otomatis
├── health-check-dokploy.sh        # Script health check
├── quick-fix-dokploy.sh           # Script quick fix untuk masalah umum
├── .env.dokploy.template          # Template environment variables
├── docker/
│   ├── mysql-init/
│   │   └── init.sql               # MySQL initialization script
│   └── mysql/
│       └── my.cnf.dokploy         # MySQL config optimized
└── docker-compose.yml.backup      # Backup file original
```

---

## 🆘 Emergency Recovery

### Jika Deployment Completely Broken

```bash
# 1. Complete cleanup
docker-compose -f docker-compose.dokploy.yml down --volumes --rmi all
docker system prune -a -f

# 2. Remove all volumes
docker volume rm $(docker volume ls -q)

# 3. Fresh deployment
./fix-mysql-deployment.sh
./deploy-to-dokploy.sh
```

### Jika MySQL Data Corruption

```bash
# 1. Backup data jika memungkinkan
docker-compose exec db mysqldump -u root -p property_management > backup.sql

# 2. Recreate volume
docker-compose down
docker volume rm $(docker volume ls -q | grep mysql)

# 3. Redeploy
docker-compose -f docker-compose.dokploy.yml up -d db
sleep 60

# 4. Restore data
docker-compose exec -T db mysql -u root -p property_management < backup.sql
```

---

## 📞 Support & Contact

### Troubleshooting Checklist

- [ ] Apakah volume MySQL sudah dibersihkan?
- [ ] Apakah menggunakan `docker-compose.dokploy.yml`?
- [ ] Apakah environment variables sudah benar?
- [ ] Apakah healthcheck berhasil?
- [ ] Apakah ada error di logs?

### Log Files Locations

```bash
# Application logs
docker-compose logs app

# MySQL logs
docker-compose logs db

# System logs
docker-compose logs --tail=50

# Real-time monitoring
docker-compose logs -f
```

---

## ✅ Success Indicators

Deployment berhasil jika:

1. ✅ **Containers Running**: Semua container dalam status `healthy`
2. ✅ **Database Connected**: MySQL ping berhasil
3. ✅ **Laravel Working**: Artisan commands berjalan normal
4. ✅ **Health Check Pass**: `/health` endpoint respond OK
5. ✅ **No Error Logs**: Tidak ada error di container logs

```bash
# Verify semua success indicators
./health-check-dokploy.sh
```

---

**📅 Created**: 2025  
**🔄 Last Updated**: Latest fix implementation  
**👤 Maintained By**: Development Team  
**🎯 Status**: PRODUCTION READY ✅

---

**🚀 QUICK START:**
```bash
git clone <repo> && cd property-management-system
chmod +x fix-mysql-deployment.sh && ./fix-mysql-deployment.sh
./deploy-to-dokploy.sh
./health-check-dokploy.sh
```