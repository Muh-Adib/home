# 🚨 QUICK FIX GUIDE - Redis & Database Issues

## ⚡ **IMMEDIATE FIXES**

### **Error: "Driver [database] not supported"**
### **Error: "Unknown class Redis"**

---

## 🔧 **Solution 1: Quick Fix (Recommended)**

```bash
# Run the complete fix script
./fix-all-issues.sh
```

This script will automatically:
- ✅ Install/verify Redis extension
- ✅ Fix environment variables
- ✅ Clear and rebuild caches
- ✅ Test all connections
- ✅ Setup sessions properly
- ✅ Restart services

---

## 🔧 **Solution 2: Manual Step-by-Step Fix**

### **Step 1: Update Environment Variables**

Replace your current `.env` with these corrected settings:

```env
### ==== APP CONFIGURATION ====
APP_NAME=Homsjogja
APP_ENV=production
APP_KEY=base64:2KP58EicMQP7tFSYjfXVyeBYmvrRF+62NIErENjPfck=
APP_DEBUG=false  # ⚠️ CHANGED: false for production
APP_URL=https://homsjogja-testlaravel-jc5ygn-c6322f-213-210-36-24.traefik.me

### ==== DATABASE ====
DB_CONNECTION=mysql
DB_HOST=homsjogja-db-xsjalx
DB_PORT=3306
DB_DATABASE=homs-db
DB_USERNAME=homs-user
DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ

### ==== SESSION (Redis) ====
SESSION_DRIVER=redis  # ⚠️ KEEP as redis
SESSION_LIFETIME=120
SESSION_CONNECTION=default  # ⚠️ ADDED

### ==== CACHE (Redis) ====
CACHE_DRIVER=redis
CACHE_STORE=redis

### ==== QUEUE (Redis) ====
QUEUE_CONNECTION=redis

### ==== BROADCASTING (Redis) ====
BROADCAST_DRIVER=redis  # ⚠️ CHANGED: from 'log' to 'redis'
BROADCAST_CONNECTION=default  # ⚠️ ADDED

### ==== REDIS CONFIG ====
REDIS_CLIENT=phpredis
REDIS_HOST=homsjogja-redis-qmihbb
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=5vlcwpzc45g9mtho
REDIS_URL=redis://default:5vlcwpzc45g9mtho@homsjogja-redis-qmihbb:6379

# ⚠️ ADDED: Redis database separation
REDIS_DB=0
REDIS_CACHE_DB=1
REDIS_SESSION_DB=2

### ==== OTHER SETTINGS ====
FILESYSTEM_DISK=local
LOG_CHANNEL=stack
LOG_LEVEL=error

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

# ⚠️ ADDED: Empty values untuk warning fix
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_HOST=
ABLY_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
DB_CACHE_CONNECTION=
MEMCACHED_PERSISTENT_ID=
MEMCACHED_USERNAME=
MEMCACHED_PASSWORD=
LOG_SLACK_WEBHOOK_URL=
PAPERTRAIL_URL=
PAPERTRAIL_PORT=

VITE_APP_NAME="${APP_NAME}"
```

### **Step 2: Install Redis Extension**

```bash
# Check if Redis extension is installed
php -m | grep redis

# If not installed, run:
./fix-redis-config.sh
```

### **Step 3: Clear All Caches**

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

### **Step 4: Test Connections**

```bash
# Test Redis connection
php -r "
\$redis = new Redis();
\$redis->connect('homsjogja-redis-qmihbb', 6379);
\$redis->auth('5vlcwpzc45g9mtho');
echo 'Redis: ' . \$redis->ping() . PHP_EOL;
"

# Test Database
php artisan tinker --execute="
DB::connection()->getPdo();
echo 'Database connected successfully';
"
```

### **Step 5: Rebuild Caches**

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### **Step 6: Restart Services**

```bash
# In Docker/Dokploy
docker restart [container-name]

# Or restart specific services
supervisorctl restart all
```

---

## 🔍 **Diagnostic Commands**

### **Check Issues:**
```bash
# Run full diagnostic
./diagnose-laravel-issues.sh

# Quick checks
php -m | grep redis
php artisan config:show cache.default
php artisan config:show session.driver
```

### **Test Individual Components:**
```bash
# Test Redis
php artisan tinker --execute="use Illuminate\Support\Facades\Redis; Redis::ping();"

# Test Cache
php artisan tinker --execute="use Illuminate\Support\Facades\Cache; Cache::put('test', 'ok'); echo Cache::get('test');"

# Test Session
php artisan tinker --execute="session()->put('test', 'ok'); echo session()->get('test');"
```

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: "Class Redis not found"**
**Solution:**
```bash
# Install Redis extension
pecl install redis
echo "extension=redis.so" >> /usr/local/etc/php/conf.d/redis.ini
```

### **Issue 2: "Redis connection refused"**
**Solution:**
- Check `REDIS_HOST` is correct: `homsjogja-redis-qmihbb`
- Check `REDIS_PASSWORD` is correct: `5vlcwpzc45g9mtho`
- Verify Redis service is running in Dokploy

### **Issue 3: "Session driver [database] not supported"**
**Solution:**
```bash
# Either use Redis sessions (recommended)
SESSION_DRIVER=redis

# Or create session table for database
php artisan session:table
php artisan migrate --force
```

### **Issue 4: Still getting environment warnings**
**Solution:**
Add all missing environment variables with empty values (see Step 1 above)

---

## ✅ **Success Verification**

After fixes, you should see:

```bash
# ✅ No more errors when running:
php artisan config:cache

# ✅ Redis working:
php artisan tinker --execute="Redis::ping();"
# Output: "+PONG"

# ✅ Cache working:
php artisan tinker --execute="Cache::put('test', 'value'); echo Cache::get('test');"
# Output: "value"

# ✅ Sessions working:
php artisan tinker --execute="session()->put('test', 'value'); echo session()->get('test');"
# Output: "value"

# ✅ No 502 errors in browser
# ✅ Application loads properly
```

---

## 🔄 **Dokploy Specific Steps**

1. **Update Environment Variables** in Dokploy dashboard with corrected values
2. **Redeploy the application** to apply changes
3. **Check logs** in Dokploy console:
   ```bash
   docker logs [app-container-name]
   ```
4. **Access container** and run fix script:
   ```bash
   docker exec -it [app-container-name] ./fix-all-issues.sh
   ```

---

## 📞 **Emergency Commands**

```bash
# Complete reset if needed
php artisan optimize:clear
php artisan config:cache
docker restart [container-name]

# Check current status
php artisan about
php -m | grep redis
docker ps
```

---

## 🎯 **Expected Result**

After applying these fixes:
- ✅ No more "Driver [database] not supported" error
- ✅ No more "Unknown class Redis" error  
- ✅ No more environment variable warnings
- ✅ Application loads without 502 errors
- ✅ WebSocket integrated in same container
- ✅ Real-time notifications working at `/socket.io/`
- ✅ Sessions and cache working properly

**Total fix time: ~5-10 minutes** ⏱️