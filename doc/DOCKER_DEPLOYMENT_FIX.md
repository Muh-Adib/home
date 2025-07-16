# 🐳 DOCKER DEPLOYMENT FIX GUIDE

## 🔍 **MASALAH YANG DITEMUKAN**

Error pada deployment Docker:
```
ERROR: failed to calculate checksum of ref b210074f-e65e-46f0-946e-7ff158171d92::phm269f3tb0prr5g9y11mj6vh: "/composer.lock": not found
```

## 🛠️ **PENYEBAB MASALAH**

1. **File `composer.lock` di-exclude** dalam `.dockerignore`
2. **File `package-lock.json` di-exclude** dalam `.dockerignore`
3. **Warning `version` obsolete** dalam `docker-compose.yml`

## ✅ **SOLUSI YANG SUDAH DITERAPKAN**

### 1. **Perbaikan `.dockerignore`**
```diff
- composer.lock
- package-lock.json
+ # composer.lock
+ # package-lock.json
```

### 2. **Perbaikan `docker-compose.yml`**
```diff
- version: '3.8'
+ # Docker Compose version 3.8
```

### 3. **Perbaikan `Dockerfile`**
- Menambahkan conditional copy untuk config files
- Menambahkan error handling untuk Laravel commands
- Memperbaiki urutan copy files

## 🚀 **CARA MENJALANKAN FIX**

### **Opsi 1: Menggunakan Script Otomatis**
```bash
# Jalankan script fix
chmod +x fix-docker-deploy.sh
./fix-docker-deploy.sh

# Deploy setelah fix
docker-compose up -d --build
```

### **Opsi 2: Manual Fix**
```bash
# 1. Update .dockerignore
sed -i 's/^composer\.lock/# composer.lock/' .dockerignore
sed -i 's/^package-lock\.json/# package-lock.json/' .dockerignore

# 2. Update docker-compose.yml
sed -i 's/^version: .*/# Docker Compose version/' docker-compose.yml

# 3. Install dependencies jika belum ada
composer install --no-dev --optimize-autoloader
npm ci --only=production

# 4. Create volume directories
mkdir -p docker/volumes/mysql
mkdir -p docker/volumes/redis
mkdir -p docker/volumes/nginx/logs
mkdir -p docker/volumes/prometheus
mkdir -p docker/volumes/grafana

# 5. Set permissions
chmod -R 755 docker/volumes/

# 6. Create .env if needed
cp ENV_EXAMPLE.md .env

# 7. Deploy
docker-compose up -d --build
```

## 📋 **CHECKLIST DEPLOYMENT**

### **✅ Pre-Deployment**
- [ ] File `composer.lock` ada dan tidak di-exclude
- [ ] File `package-lock.json` ada dan tidak di-exclude
- [ ] `docker-compose.yml` tidak menggunakan `version` obsolete
- [ ] Volume directories sudah dibuat
- [ ] File `.env` sudah ada dan dikonfigurasi

### **✅ Post-Deployment**
- [ ] Semua containers running (`docker-compose ps`)
- [ ] Database accessible
- [ ] Laravel setup commands berhasil
- [ ] Application accessible di `http://localhost`

## 🔧 **TROUBLESHOOTING**

### **Masalah: composer.lock not found**
```bash
# Solusi: Install dependencies
composer install --no-dev --optimize-autoloader
```

### **Masalah: package-lock.json not found**
```bash
# Solusi: Install npm dependencies
npm ci --only=production
```

### **Masalah: Permission denied**
```bash
# Solusi: Set proper permissions
chmod -R 755 docker/volumes/
```

### **Masalah: Database connection failed**
```bash
# Solusi: Wait for database to be ready
docker-compose logs db
# Wait until you see "MySQL init process done"
```

### **Masalah: Laravel commands failed**
```bash
# Solusi: Run setup commands manually
docker-compose exec app php artisan key:generate
docker-compose exec app php artisan migrate
docker-compose exec app php artisan config:cache
```

## 📊 **MONITORING DEPLOYMENT**

### **Check Container Status**
```bash
docker-compose ps
```

### **View Logs**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f nginx
```

### **Check Health**
```bash
# Application health
curl http://localhost/health

# Database health
docker-compose exec db mysqladmin ping -h localhost -u root -psecret
```

## 🎯 **EXPECTED RESULT**

Setelah fix berhasil, Anda akan melihat:
```
✅ Docker images built successfully
✅ Containers started successfully
✅ Database is ready
✅ Laravel setup completed
✅ Application accessible at http://localhost
```

## 📝 **NOTES**

- **File lock penting** untuk reproducible builds
- **Volume directories** harus ada sebelum deployment
- **Environment variables** harus dikonfigurasi dengan benar
- **Health checks** membantu memastikan services ready

## 🔄 **NEXT STEPS**

1. **Test deployment** dengan script fix
2. **Monitor logs** untuk memastikan semua services running
3. **Access application** di browser
4. **Run tests** untuk memastikan functionality
5. **Setup monitoring** jika diperlukan

---

**📅 Last Updated**: 2025  
**🔧 Status**: Fixed  
**✅ Ready for Deployment**: Yes 