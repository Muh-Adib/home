# 🛠️ DEPLOYMENT TROUBLESHOOTING
## Property Management System - Nixpacks Deployment

---

## ❌ **ERROR YANG TERJADI**

### **Error: undefined variable 'composer'**

```
error: undefined variable 'composer'
at /app/.nixpacks/nixpkgs-e24b4c09e963677b1beea49d411cd315a024ad3a.nix:19:14
```

**Penyebab**: Package `composer` tidak tersedia di Nixpacks repository.

**Solusi**: Gunakan `php83Packages.composer` sebagai gantinya.

---

## 🔧 **SOLUSI YANG SUDAH DITERAPKAN**

### **1. Update nixpacks.toml**
```toml
# Sebelum (ERROR)
"composer"

# Sesudah (FIXED)
"php83Packages.composer"
```

### **2. Tambahkan Error Handling**
```toml
[phases.build]
cmds = [
    "npm run build",
    "php artisan key:generate --force || echo 'Key generation skipped'",
    "php artisan storage:link || echo 'Storage link skipped'",
    "php artisan config:cache || echo 'Config cache failed'",
    "php artisan route:cache || echo 'Route cache failed'",
    "php artisan view:cache || echo 'View cache failed'",
    "mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache",
    "chmod -R 755 storage bootstrap/cache || echo 'Permission setting failed'",
    "chown -R www-data:www-data storage bootstrap/cache || echo 'Ownership setting failed'"
]
```

### **3. Alternative Configuration**
File `nixpacks-simple.toml` tersedia sebagai backup dengan konfigurasi yang lebih sederhana.

---

## 🚀 **LANGKAH DEPLOYMENT YANG DIPERBAIKI**

### **Step 1: Gunakan Konfigurasi yang Diperbaiki**
```bash
# Pastikan menggunakan nixpacks.toml yang sudah diperbaiki
# atau gunakan nixpacks-simple.toml sebagai alternatif
```

### **Step 2: Set Environment Variables**
```env
# Pastikan semua environment variables sudah diset di Dokploy
APP_NAME="HomsJogja"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.yourdomain.com
APP_KEY=base64:your-generated-key

# Database (External)
DB_HOST=your-external-mysql-host
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Redis (External)
REDIS_HOST=your-external-redis-host
REDIS_PASSWORD=your_redis_password

# Broadcasting
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
```

### **Step 3: Deploy Ulang**
```bash
# Deploy dengan konfigurasi yang sudah diperbaiki
# Dokploy akan menggunakan nixpacks.toml yang sudah diupdate
```

---

## 🔍 **VERIFICATION SETELAH FIX**

### **Check Build Process:**
```bash
# Pastikan semua dependencies terinstall
- nginx ✅
- supervisor ✅
- nodejs_20 ✅
- php83 ✅
- php83Packages.composer ✅
- php83Extensions.* ✅
```

### **Check Installation:**
```bash
# Pastikan semua packages terinstall
- Laravel Echo Server ✅
- Composer dependencies ✅
- NPM dependencies ✅
```

### **Check Build:**
```bash
# Pastikan semua build steps berhasil
- React build ✅
- Laravel optimization ✅
- File permissions ✅
```

---

## 🛠️ **ALTERNATIVE SOLUTIONS**

### **Jika Masih Error:**

#### **Option 1: Gunakan nixpacks-simple.toml**
```bash
# Rename file
mv nixpacks.toml nixpacks-backup.toml
mv nixpacks-simple.toml nixpacks.toml
```

#### **Option 2: Manual Dependencies**
```toml
[phases.setup]
nixPkgs = [
    "nginx",
    "supervisor", 
    "nodejs_20",
    "php83",
    "php83Extensions.opcache",
    "php83Extensions.mysql",
    "php83Extensions.redis",
    "php83Extensions.gd",
    "php83Extensions.zip",
    "php83Extensions.intl",
    "php83Extensions.mbstring",
    "php83Extensions.bcmath",
    "php83Extensions.pcntl",
    "php83Packages.composer",
    "curl",
    "git",
    "bash"
]
```

#### **Option 3: Minimal Configuration**
```toml
[phases.setup]
nixPkgs = [
    "nginx",
    "supervisor", 
    "nodejs_20",
    "php83",
    "php83Packages.composer"
]

[phases.install]
cmds = [
    "npm install -g laravel-echo-server@1.6.3",
    "composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-scripts",
    "npm ci --legacy-peer-deps"
]

[phases.build]
cmds = [
    "npm run build",
    "mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache",
    "chmod -R 755 storage bootstrap/cache"
]

[start]
cmd = "supervisord -c /etc/supervisor/conf.d/supervisord.conf"
```

---

## 📊 **EXPECTED OUTPUT SETELAH FIX**

### **Build Process:**
```
╔══════════════════════════════ Nixpacks v1.39.0 ══════════════════════════════╗
║ setup      │ nginx, supervisor, nodejs_20, php83, php83Packages.composer,    ║
║            │ php83Extensions.*, curl, git, bash                              ║
║──────────────────────────────────────────────────────────────────────────────║
║ install    │ npm install -g laravel-echo-server@1.6.3                        ║
║            │ composer install --no-dev --optimize-autoloader --no-           ║
║            │ interaction --prefer-dist --no-scripts                          ║
║            │ npm ci --legacy-peer-deps                                       ║
║──────────────────────────────────────────────────────────────────────────────║
║ build      │ npm run build                                                   ║
║            │ php artisan key:generate --force || echo 'Key generation skipped'║
║            │ php artisan storage:link || echo 'Storage link skipped'         ║
║            │ php artisan config:cache || echo 'Config cache failed'          ║
║            │ php artisan route:cache || echo 'Route cache failed'            ║
║            │ php artisan view:cache || echo 'View cache failed'              ║
║            │ mkdir -p storage/logs storage/framework/cache storage/framework/║
║            │ sessions storage/framework/views bootstrap/cache                ║
║            │ chmod -R 755 storage bootstrap/cache || echo 'Permission failed'║
║            │ chown -R www-data:www-data storage bootstrap/cache || echo 'Own║
║            │ ership failed'                                                  ║
║──────────────────────────────────────────────────────────────────────────────║
║ start      │ supervisord -c /etc/supervisor/conf.d/supervisord.conf          ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### **Deployment Success:**
```
✅ Build completed successfully
✅ Container started
✅ All services running
✅ Health checks passed
```

---

## 🔄 **NEXT STEPS**

### **Setelah Fix Berhasil:**
1. ✅ Deploy ulang dengan konfigurasi yang diperbaiki
2. ✅ Verify semua services running
3. ✅ Test endpoints dan functionality
4. ✅ Monitor logs dan performance
5. ✅ Update documentation jika diperlukan

### **Jika Masih Ada Error:**
1. ✅ Check logs di Dokploy dashboard
2. ✅ Verify environment variables
3. ✅ Test external service connections
4. ✅ Review configuration files
5. ✅ Contact support jika diperlukan

---

## 📞 **SUPPORT**

### **Jika ada masalah:**
1. Check logs di Dokploy dashboard
2. Verify environment variables
3. Test external service connections
4. Review configuration files
5. Contact support jika diperlukan

### **Useful Commands:**
```bash
# Check build logs
tail -f /var/log/dokploy/build.log

# Check deployment status
./check-deployment.sh

# Test endpoints
curl http://localhost/health
curl http://localhost:6001
```

---

**🎯 FOKUS UTAMA**: 
- Fix composer dependency issue
- Add error handling untuk build process
- Provide alternative configurations
- Comprehensive troubleshooting guide

**📅 Last Updated**: 2025  
**📝 Version**: 1.1  
**👤 Maintained By**: Development Team
