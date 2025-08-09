# 🚨 REDIS EMERGENCY FIX GUIDE
## Property Management System - Laravel 12 + React + WebSocket

---

## 📋 **MASALAH: "Class Redis not found" Error**

### **Error yang Diterima:**
```
Internal Server Error
Error: Class "Redis" not found
GET app.homsjogja.com
PHP 8.3.15 — Laravel 12.22.1
```

### **Root Cause:**
- Redis extension tidak terinstall di container
- Laravel mencoba menggunakan Redis untuk session, cache, queue, dan broadcasting
- Application crash karena Redis class tidak tersedia

---

## 🎯 **SOLUSI EMERGENCY**

### **1. Scripts yang Sudah Dibuat:**

#### **🔧 `dokploy/scripts/force-redis-install.sh`**
- Mencoba install Redis extension secara manual
- Menggunakan package manager (apt-get, yum, apk, pecl)
- Memberikan fallback configuration jika install gagal

#### **🔧 `dokploy/scripts/fix-session-cache-redis.sh`**
- Mengubah Laravel configuration untuk menggunakan file drivers
- Session: `redis` → `file`
- Cache: `redis` → `file`
- Queue: `redis` → `sync`
- Broadcasting: `redis` → `log`

#### **🔧 `dokploy/scripts/startup.sh` (Updated)**
- Otomatis menjalankan diagnosis Redis
- Otomatis mencoba force install Redis extension
- Otomatis fix session/cache jika Redis tidak tersedia

### **2. Langkah-langkah Deployment:**

#### **Step 1: Set Environment Variables di Dokploy Dashboard**
```env
# Redis Configuration (External Redis)
REDIS_HOST=homsjogja-redis-qmihbb
REDIS_PASSWORD=5vlcwpzc45g9mtho
REDIS_PORT=6379
REDIS_DB=0

# Fallback Configuration (jika Redis tidak tersedia)
SESSION_DRIVER=file
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
BROADCAST_DRIVER=log
```

#### **Step 2: Redeploy dengan Rebuild**
1. Buka **Dokploy Dashboard**
2. Set **Environment Variables** (lihat Step 1)
3. **Check "Rebuild" option**
4. Click **"Deploy"**
5. Monitor **build logs**

#### **Step 3: Monitor Startup Process**
Startup script akan otomatis:
1. ✅ Check Redis extension
2. ✅ Run diagnosis jika Redis tidak tersedia
3. ✅ Try force install Redis extension
4. ✅ Fix session/cache configuration jika Redis masih tidak tersedia

---

## 🔍 **DIAGNOSIS & TROUBLESHOOTING**

### **1. Check Redis Extension di Container**
```bash
# Check PHP modules
php -m | grep redis

# Check Redis class
php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';"

# Check Redis version
php -r "echo phpversion('redis');"
```

### **2. Check Laravel Configuration**
```bash
# Check session driver
php artisan tinker --execute="echo config('session.driver');"

# Check cache driver
php artisan tinker --execute="echo config('cache.default');"

# Check queue connection
php artisan tinker --execute="echo config('queue.default');"
```

### **3. Test Session & Cache**
```bash
# Test session
php artisan tinker --execute="Session::put('test', 'value'); echo Session::get('test');"

# Test cache
php artisan tinker --execute="Cache::put('test', 'value', 60); echo Cache::get('test');"
```

---

## 🛠️ **MANUAL FIX (Jika Scripts Tidak Berjalan)**

### **1. Force Install Redis Extension**
```bash
# Di container environment
cd /app

# Try different package managers
apt-get update && apt-get install -y php-redis
# atau
yum install -y php-redis
# atau
apk add --no-cache php-redis
# atau
pecl install redis
```

### **2. Fix Laravel Configuration**
```bash
# Update session configuration
sed -i "s/'driver' => env('SESSION_DRIVER', 'redis')/'driver' => env('SESSION_DRIVER', 'file')/g" config/session.php

# Update cache configuration
sed -i "s/'default' => env('CACHE_DRIVER', 'redis')/'default' => env('CACHE_DRIVER', 'file')/g" config/cache.php

# Update queue configuration
sed -i "s/'default' => env('QUEUE_CONNECTION', 'redis')/'default' => env('QUEUE_CONNECTION', 'sync')/g" config/queue.php

# Update broadcasting configuration
sed -i "s/'default' => env('BROADCAST_DRIVER', 'redis')/'default' => env('BROADCAST_DRIVER', 'log')/g" config/broadcasting.php
```

### **3. Clear Laravel Caches**
```bash
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear
```

### **4. Create Directories**
```bash
mkdir -p storage/framework/sessions
mkdir -p storage/framework/cache
mkdir -p storage/framework/views
chmod -R 755 storage/framework
```

---

## 📊 **VERIFICATION CHECKLIST**

### **✅ Pre-Deployment:**
- [ ] Environment variables set in Dokploy Dashboard
- [ ] Rebuild option checked
- [ ] All scripts committed to repository

### **✅ Post-Deployment:**
- [ ] No "Class Redis not found" errors
- [ ] Application loads without crashes
- [ ] Session working (file driver)
- [ ] Cache working (file driver)
- [ ] Queue working (sync driver)
- [ ] Broadcasting working (log driver)

### **✅ Application Functionality:**
- [ ] User authentication working
- [ ] Booking system working
- [ ] Property management working
- [ ] Admin panel accessible
- [ ] No 500 errors

---

## 🎯 **EXPECTED RESULTS**

### **✅ Jika Redis Extension Berhasil Diinstall:**
```bash
# Check PHP modules
php -m | grep redis
# Output: redis

# Check Redis class
php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';"
# Output: OK

# Test Redis connection
php artisan tinker --execute="Redis::connection()->ping();"
# Output: PONG
```

### **✅ Jika Menggunakan Fallback Configuration:**
```bash
# Check session driver
php artisan tinker --execute="echo config('session.driver');"
# Output: file

# Check cache driver
php artisan tinker --execute="echo config('cache.default');"
# Output: file

# Test session
php artisan tinker --execute="Session::put('test', 'value'); echo Session::get('test');"
# Output: value

# Test cache
php artisan tinker --execute="Cache::put('test', 'value', 60); echo Cache::get('test');"
# Output: value
```

### **✅ Application Working:**
- ❌ "Class Redis not found" errors
- ❌ Internal Server Error 500
- ✅ Application loads successfully
- ✅ All functionality working
- ✅ Session and cache working

---

## 📝 **COMMANDS REFERENCE**

### **Diagnosis Commands:**
```bash
# Check Redis extension
php -m | grep redis

# Check Redis class
php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';"

# Check Laravel config
php artisan tinker --execute="echo config('session.driver');"
php artisan tinker --execute="echo config('cache.default');"
```

### **Fix Commands:**
```bash
# Run force install script
bash dokploy/scripts/force-redis-install.sh

# Run session/cache fix script
bash dokploy/scripts/fix-session-cache-redis.sh

# Clear Laravel caches
php artisan config:clear
php artisan cache:clear
```

### **Test Commands:**
```bash
# Test session
php artisan tinker --execute="Session::put('test', 'value'); echo Session::get('test');"

# Test cache
php artisan tinker --execute="Cache::put('test', 'value', 60); echo Cache::get('test');"

# Test Redis (if available)
php artisan tinker --execute="Redis::connection()->ping();"
```

---

## 🚀 **DEPLOYMENT STEPS**

### **1. Emergency Fix (Immediate)**
1. Set environment variables in Dokploy Dashboard
2. Redeploy with rebuild option
3. Monitor startup logs
4. Verify application loads without errors

### **2. Long-term Fix (Recommended)**
1. Check nixpacks build logs for Redis extension installation
2. Verify nixpacks.toml has `php83Extensions.redis`
3. Fix Redis extension installation in nixpacks build
4. Redeploy with proper Redis extension

### **3. Verification**
1. Run verification scripts in container
2. Test application functionality
3. Monitor error logs
4. Ensure no Redis-related errors

---

## ⚠️ **IMPORTANT NOTES**

### **Performance Impact:**
- **File drivers** are slower than Redis
- **Sync queue** processes jobs immediately (no background)
- **Log broadcasting** writes to log files instead of real-time

### **Production Considerations:**
- Fix Redis extension installation for production
- Use Redis for better performance
- Monitor application performance
- Consider Redis cluster for high availability

### **Fallback Strategy:**
- Application works without Redis
- All functionality preserved
- Performance may be slower
- Suitable for development/testing

---

**📅 Last Updated:** 2025  
**📝 Version:** 1.0  
**👤 Maintained By:** Development Team  
**🚨 Emergency Fix:** Ready for immediate deployment
