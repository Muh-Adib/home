# 🔧 ENVIRONMENT VARIABLES GUIDE
## Property Management System - Laravel 12 + React + WebSocket

---

## ❌ **FORMAT YANG SALAH**

### **Database Connection String (SALAH):**
```env
DB_HOST=mysql://homsjogja:hhmnyxuowt41ghk0@homsjogja-mysql-7hwczo:3306/homsjogja
```

### **Redis Connection String (SALAH):**
```env
REDIS_HOST=redis://default:tzwr97nbicqh5w6e@homsjogja-redis-kqzqov:6379
```

---

## ✅ **FORMAT YANG BENAR**

### **Database Configuration (BENAR):**
```env
# Database Configuration
DB_CONNECTION=mysql
DB_HOST=homsjogja-mysql-7hwczo
DB_PORT=3306
DB_DATABASE=homsjogja
DB_USERNAME=homsjogja
DB_PASSWORD=hhmnyxuowt41ghk0
```

### **Redis Configuration (BENAR):**
```env
# Redis Configuration
REDIS_HOST=homsjogja-redis-kqzqov
REDIS_PASSWORD=tzwr97nbicqh5w6e
REDIS_PORT=6379
REDIS_DB=0
```

---

## 📋 **ENVIRONMENT VARIABLES LENGKAP**

### **Application Configuration:**
```env
APP_NAME="HomsJogja"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.yourdomain.com
APP_KEY=base64:your-generated-app-key-here
```

### **Database Configuration:**
```env
DB_CONNECTION=mysql
DB_HOST=homsjogja-mysql-7hwczo
DB_PORT=3306
DB_DATABASE=homsjogja
DB_USERNAME=homsjogja
DB_PASSWORD=hhmnyxuowt41ghk0
```

### **Redis Configuration:**
```env
REDIS_HOST=homsjogja-redis-kqzqov
REDIS_PASSWORD=tzwr97nbicqh5w6e
REDIS_PORT=6379
REDIS_DB=0
```

### **Broadcasting Configuration:**
```env
BROADCAST_DRIVER=redis
BROADCAST_CONNECTION=default
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_APP_CLUSTER=mt1
```

### **Cache & Session Configuration:**
```env
CACHE_DRIVER=redis
CACHE_PREFIX=homsjogja_
SESSION_DRIVER=redis
SESSION_LIFETIME=120
SESSION_PREFIX=homsjogja_session_
```

### **Queue Configuration:**
```env
QUEUE_CONNECTION=redis
QUEUE_PREFIX=homsjogja_queue_
```

---

## 🔍 **VERIFICATION CONNECTION**

### **Test Database Connection:**
```bash
# Di dalam container
php artisan tinker --execute="DB::connection()->getPdo();"
```

### **Test Redis Connection:**
```bash
# Di dalam container
php artisan tinker --execute="Redis::connection()->ping();"
```

### **Expected Output:**
```bash
# Database connection successful
# Redis connection successful
```

---

## 🛠️ **TROUBLESHOOTING**

### **Database Connection Issues:**
```bash
# Check database connection
php artisan tinker --execute="try { DB::connection()->getPdo(); echo 'Database connected'; } catch (Exception \$e) { echo 'Database error: ' . \$e->getMessage(); }"
```

### **Redis Connection Issues:**
```bash
# Check Redis connection
php artisan tinker --execute="try { Redis::connection()->ping(); echo 'Redis connected'; } catch (Exception \$e) { echo 'Redis error: ' . \$e->getMessage(); }"
```

### **Common Issues:**
1. **Wrong Host**: Pastikan host name benar
2. **Wrong Port**: Pastikan port sesuai (MySQL: 3306, Redis: 6379)
3. **Wrong Credentials**: Pastikan username dan password benar
4. **Network Issues**: Pastikan container bisa mengakses external services

---

## 📊 **LARAVEL CONFIGURATION**

### **config/database.php:**
```php
'mysql' => [
    'driver' => 'mysql',
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '3306'),
    'database' => env('DB_DATABASE', 'forge'),
    'username' => env('DB_USERNAME', 'forge'),
    'password' => env('DB_PASSWORD', ''),
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix' => '',
    'strict' => true,
    'engine' => null,
],
```

### **config/database.php (Redis):**
```php
'redis' => [
    'client' => env('REDIS_CLIENT', 'phpredis'),
    'options' => [
        'cluster' => env('REDIS_CLUSTER', Redis::class),
        'prefix' => env('REDIS_PREFIX', Str::slug(env('APP_NAME', 'laravel'), '_').'_database_',
    ],
    'default' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'username' => env('REDIS_USERNAME'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_DB', '0'),
    ],
],
```

---

## 🚀 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment:**
- ✅ Set semua environment variables di Dokploy dashboard
- ✅ Verify database credentials
- ✅ Verify Redis credentials
- ✅ Test connections locally jika memungkinkan

### **Post-Deployment:**
- ✅ Check database connection
- ✅ Check Redis connection
- ✅ Verify Laravel application running
- ✅ Test WebSocket functionality

---

## 📞 **SUPPORT**

### **Jika ada masalah:**
1. Check logs di Dokploy dashboard
2. Verify environment variables format
3. Test external service connections
4. Review Laravel configuration files
5. Contact support jika diperlukan

### **Useful Commands:**
```bash
# Check environment variables
php artisan tinker --execute="echo 'DB_HOST: ' . env('DB_HOST'); echo 'REDIS_HOST: ' . env('REDIS_HOST');"

# Test database connection
php artisan tinker --execute="DB::connection()->getPdo();"

# Test Redis connection
php artisan tinker --execute="Redis::connection()->ping();"
```

---

**🎯 FOKUS UTAMA**: 
- Format environment variables yang benar untuk Laravel
- Pemisahan komponen connection string
- Verification dan troubleshooting
- Best practices untuk deployment

**📅 Last Updated**: 2025  
**📝 Version**: 1.0  
**👤 Maintained By**: Development Team
