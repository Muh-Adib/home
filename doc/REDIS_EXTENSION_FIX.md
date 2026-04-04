# 🔧 REDIS EXTENSION FIX GUIDE
## Property Management System website Homsjogja - Laravel 12 + React + WebSocket

---

## 📋 **MASALAH: "Class Redis not found"**

### **Root Cause Analysis:**
Error "Class Redis not found" terjadi karena:
1. **Redis extension tidak terinstall** di container
2. **Redis extension tidak terload** oleh PHP
3. **Laravel tidak dapat mengakses** Redis class

### **Gejala:**
- ✅ `nixpacks.toml` sudah include `php83Extensions.redis`
- ❌ Redis extension tidak terload (`php -m | grep redis` = kosong)
- ❌ Redis class tidak tersedia (`class_exists('Redis')` = false)
- ❌ Laravel error "Class Redis not found"

---

## 🎯 **SOLUSI LENGKAP**

### **1. Verifikasi Konfigurasi nixpacks.toml**

```toml
[phases.setup]
nixPkgs = [
    "nginx",
    "python3Packages.supervisor",
    "nodejs_20",
    "php83",
    "php83Packages.composer",
    "php83Extensions.redis",  # ✅ Pastikan ini ada
    "curl",
    "git",
    "bash"
]
```

### **2. Set Environment Variables di Dokploy Dashboard**

```env
# Redis Configuration (External Redis)
REDIS_HOST=homsjogja-redis-qmihbb
REDIS_PASSWORD=5vlcwpzc45g9mtho
REDIS_PORT=6379
REDIS_DB=0

# Laravel Redis Configuration
REDIS_CLIENT=phpredis
BROADCAST_DRIVER=redis
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

### **3. Redeploy dengan Rebuild**

**Langkah-langkah:**
1. Buka **Dokploy Dashboard**
2. Set **Environment Variables** (lihat poin 2)
3. **Check "Rebuild" option**
4. Click **"Deploy"**
5. Monitor **build logs** untuk Redis extension installation

### **4. Verifikasi di Container**

Setelah deploy, jalankan script verifikasi:

```bash
# Di container environment
./dokploy/scripts/container-redis-check.sh
```

**Expected Output:**
```
✅ Redis extension is loaded
✅ Redis class is available
✅ Redis connection test successful
✅ Laravel Redis connection successful
```

---

## 🔍 **DIAGNOSIS STEPS**

### **1. Check Redis Extension di Container**

```bash
# Check PHP modules
php -m | grep redis

# Check Redis class
php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';"

# Check Redis extension version
php -r "echo phpversion('redis');"
```

### **2. Check Environment Variables**

```bash
# Check Redis environment
echo "REDIS_HOST: $REDIS_HOST"
echo "REDIS_PORT: $REDIS_PORT"
echo "REDIS_PASSWORD: $REDIS_PASSWORD"
echo "REDIS_DB: $REDIS_DB"
```

### **3. Test Redis Connection**

```bash
# Test basic Redis connection
php -r "
try {
    \$redis = new Redis();
    \$redis->connect('$REDIS_HOST', $REDIS_PORT);
    if (!empty('$REDIS_PASSWORD')) {
        \$redis->auth('$REDIS_PASSWORD');
    }
    echo 'PONG: ' . \$redis->ping() . PHP_EOL;
} catch (Exception \$e) {
    echo 'ERROR: ' . \$e->getMessage() . PHP_EOL;
}
"

# Test Laravel Redis
php artisan tinker --execute="Redis::connection()->ping();"
```

---

## 🛠️ **TROUBLESHOOTING**

### **Problem 1: Redis Extension Not Loaded**

**Symptoms:**
- `php -m | grep redis` returns empty
- `class_exists('Redis')` returns false

**Solutions:**
1. **Check nixpacks build logs** in Dokploy Dashboard
2. **Verify nixpacks.toml** has `php83Extensions.redis`
3. **Redeploy with rebuild** option
4. **Check if nixpacks build phase** includes Redis extension

### **Problem 2: Redis Connection Fails**

**Symptoms:**
- Redis extension loaded but connection fails
- Laravel Redis connection error

**Solutions:**
1. **Set environment variables** in Dokploy Dashboard:
   ```env
   REDIS_HOST=homsjogja-redis-qmihbb
   REDIS_PORT=6379
   REDIS_PASSWORD=5vlcwpzc45g9mtho
   REDIS_DB=0
   ```
2. **Redeploy application**
3. **Check external Redis service** is accessible

### **Problem 3: Laravel Still Shows "Class Redis not found"**

**Symptoms:**
- Redis extension loaded but Laravel still errors

**Solutions:**
1. **Clear Laravel cache:**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```
2. **Check Redis client setting** in `config/database.php`
3. **Verify environment variables** are loaded
4. **Restart PHP-FPM** service

---

## 📊 **VERIFICATION CHECKLIST**

### **✅ Pre-Deployment Checks:**
- [ ] `nixpacks.toml` has `php83Extensions.redis`
- [ ] Environment variables set in Dokploy Dashboard
- [ ] Rebuild option checked for deployment

### **✅ Post-Deployment Checks:**
- [ ] Redis extension loaded (`php -m | grep redis`)
- [ ] Redis class available (`class_exists('Redis')`)
- [ ] Redis connection successful
- [ ] Laravel Redis connection working
- [ ] No "Class Redis not found" errors

### **✅ Application Checks:**
- [ ] Cache working with Redis
- [ ] Session working with Redis
- [ ] Queue working with Redis
- [ ] Broadcasting working with Redis

---

## 🎯 **EXPECTED RESULT**

Setelah mengikuti solusi ini:

### **✅ Redis Extension Working:**
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

### **✅ Laravel Redis Working:**
```bash
# Test cache
php artisan tinker --execute="Cache::store('redis')->put('test', 'value', 60);"
# Output: true

# Test session
php artisan tinker --execute="Session::store('redis')->put('test', 'value');"
# Output: true
```

### **✅ No More Errors:**
- ❌ "Class Redis not found"
- ❌ "Redis extension not loaded"
- ❌ "Redis connection failed"
- ✅ All Redis functionality working

---

## 📝 **COMMANDS REFERENCE**

### **Diagnosis Commands:**
```bash
# Check Redis extension
php -m | grep redis

# Check Redis class
php -r "echo class_exists('Redis') ? 'OK' : 'FAIL';"

# Check Redis version
php -r "echo phpversion('redis');"

# Check environment
echo "REDIS_HOST: $REDIS_HOST"
echo "REDIS_PORT: $REDIS_PORT"
```

### **Test Commands:**
```bash
# Test basic Redis
php -r "
\$redis = new Redis();
\$redis->connect('$REDIS_HOST', $REDIS_PORT);
echo \$redis->ping();
"

# Test Laravel Redis
php artisan tinker --execute="Redis::connection()->ping();"

# Test Laravel cache
php artisan tinker --execute="Cache::store('redis')->put('test', 'value', 60);"
```

### **Fix Commands:**
```bash
# Clear Laravel cache
php artisan config:clear
php artisan cache:clear

# Restart services
supervisorctl restart php-fpm
supervisorctl restart nginx
```

---

## 🚀 **DEPLOYMENT STEPS**

### **1. Set Environment Variables**
```env
REDIS_HOST=homsjogja-redis-qmihbb
REDIS_PORT=6379
REDIS_PASSWORD=5vlcwpzc45g9mtho
REDIS_DB=0
REDIS_CLIENT=phpredis
```

### **2. Redeploy with Rebuild**
1. Open Dokploy Dashboard
2. Set environment variables
3. Check "Rebuild" option
4. Click "Deploy"
5. Monitor build logs

### **3. Verify Installation**
```bash
# Run verification script
./dokploy/scripts/container-redis-check.sh

# Check logs
tail -f /var/log/supervisor/php-fpm-error.log
```

### **4. Test Application**
```bash
# Test Redis connection
php artisan tinker --execute="Redis::connection()->ping();"

# Test cache
php artisan tinker --execute="Cache::store('redis')->put('test', 'value', 60);"
```

---

**📅 Last Updated:** 2025  
**📝 Version:** 1.0  
**👤 Maintained By:** Development Team
