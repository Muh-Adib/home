# 🌍 ENVIRONMENT VARIABLES GUIDE
## Property Management System - Laravel 12 + React + WebSocket

---

## 📋 **CARA AGAR ENV DI DOKPLOY DAPAT TERBACA**

### **1. Definisi di `nixpacks.toml` (Build & Runtime)**
```toml
[variables]
# Application Configuration
APP_NAME = "HomsJogja"
APP_ENV = "production"
APP_DEBUG = "false"
APP_URL = "https://app.yourdomain.com"
APP_KEY = "base64:your-generated-key-here"

# Database Configuration
DB_CONNECTION = "mysql"
DB_HOST = "homsjogja-mysql-7hwczo"
DB_PORT = "3306"
DB_DATABASE = "homsjogja"
DB_USERNAME = "homsjogja"
DB_PASSWORD = "hhmnyxuowt41ghk0"

# Redis Configuration
REDIS_HOST = "homsjogja-redis-kqzqov"
REDIS_PASSWORD = "tzwr97nbicqh5w6e"
REDIS_PORT = "6379"
REDIS_DB = "0"
```

### **2. Setup Environment Variables**
```bash
# Jalankan script setup environment
./dokploy/scripts/setup-env.sh

# Atau manual copy template
cp dokploy/config/env.nixpacks.template .env
```

### **3. Set di Dokploy Dashboard**
- Buka Dokploy dashboard
- Pilih aplikasi Anda
- Masuk ke section "Environment Variables"
- Tambahkan semua variabel yang diperlukan

---

## 🔧 **METODE PENGATURAN ENVIRONMENT VARIABLES**

### **Metode 1: Definisi di `nixpacks.toml`**
```toml
[variables]
APP_NAME = "HomsJogja"
APP_ENV = "production"
DB_HOST = "your-db-host"
REDIS_HOST = "your-redis-host"
```
**Keuntungan:**
- ✅ Tersedia saat build dan runtime
- ✅ Tidak perlu set manual di dashboard
- ✅ Version controlled

### **Metode 2: Set di Dokploy Dashboard**
```bash
# Di Dokploy dashboard
APP_NAME=HomsJogja
APP_ENV=production
DB_HOST=homsjogja-mysql-7hwczo
REDIS_HOST=homsjogja-redis-kqzqov
```
**Keuntungan:**
- ✅ Secure (tidak di version control)
- ✅ Mudah diupdate tanpa redeploy
- ✅ Environment-specific values

### **Metode 3: File `.env`**
```bash
# Copy template
cp dokploy/config/env.nixpacks.template .env

# Update values
sed -i 's/your-db-host/homsjogja-mysql-7hwczo/' .env
sed -i 's/your-redis-host/homsjogja-redis-kqzqov/' .env
```
**Keuntungan:**
- ✅ Local development
- ✅ Testing environment
- ✅ Backup configuration

---

## 📊 **ENVIRONMENT VARIABLES YANG DIPERLUKAN**

### **Application Configuration**
```env
APP_NAME="HomsJogja"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.yourdomain.com
APP_KEY=base64:your-generated-key
APP_TIMEZONE=Asia/Jakarta
```

### **Database Configuration**
```env
DB_CONNECTION=mysql
DB_HOST=homsjogja-mysql-7hwczo
DB_PORT=3306
DB_DATABASE=homsjogja
DB_USERNAME=homsjogja
DB_PASSWORD=hhmnyxuowt41ghk0
```

### **Redis Configuration**
```env
REDIS_HOST=homsjogja-redis-kqzqov
REDIS_PASSWORD=tzwr97nbicqh5w6e
REDIS_PORT=6379
REDIS_DB=0
```

### **Broadcasting Configuration**
```env
BROADCAST_DRIVER=redis
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120
```

### **Pusher Configuration**
```env
PUSHER_APP_ID=your-app-id
PUSHER_APP_KEY=your-app-key
PUSHER_APP_SECRET=your-app-secret
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_APP_CLUSTER=mt1
```

---

## 🔍 **VERIFICATION & TESTING**

### **Test Environment Variables**
```bash
# Check if variables are loaded
php artisan tinker --execute="echo env('APP_NAME');"

# Test database connection
php artisan tinker --execute="DB::connection()->getPdo();"

# Test Redis connection
php artisan tinker --execute="Redis::connection()->ping();"

# Check all environment variables
php artisan tinker --execute="print_r($_ENV);"
```

### **Debug Environment Variables**
```bash
# Check .env file
cat .env

# Check system environment
env | grep -E "(APP_|DB_|REDIS_|PUSHER_)"

# Check Laravel config
php artisan config:show
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

#### **1. Environment Variables Not Loading**
```bash
# Solution: Check .env file exists
ls -la .env

# Solution: Check file permissions
chmod 644 .env

# Solution: Reload environment
source .env
```

#### **2. Database Connection Failed**
```bash
# Check DB_HOST format
echo $DB_HOST

# Test connection manually
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE
```

#### **3. Redis Connection Failed**
```bash
# Check REDIS_HOST format
echo $REDIS_HOST

# Test connection manually
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

#### **4. APP_KEY Not Generated**
```bash
# Generate new APP_KEY
php artisan key:generate

# Or manually set
echo "APP_KEY=base64:$(openssl rand -base64 32)" >> .env
```

---

## 📋 **CHECKLIST ENVIRONMENT VARIABLES**

### **Pre-Deployment**
- ✅ APP_NAME, APP_ENV, APP_DEBUG set
- ✅ APP_KEY generated
- ✅ Database credentials configured
- ✅ Redis credentials configured
- ✅ Broadcasting settings configured
- ✅ Mail settings configured

### **Post-Deployment**
- ✅ Environment variables loaded
- ✅ Database connection successful
- ✅ Redis connection successful
- ✅ Laravel application accessible
- ✅ WebSocket server running

---

## 🎯 **BEST PRACTICES**

### **Security**
- ❌ Jangan commit `.env` file ke git
- ✅ Gunakan Dokploy dashboard untuk sensitive data
- ✅ Rotate credentials regularly
- ✅ Use strong passwords

### **Organization**
- ✅ Group related variables
- ✅ Use descriptive names
- ✅ Document variable purposes
- ✅ Version control templates

### **Testing**
- ✅ Test all connections
- ✅ Verify environment loading
- ✅ Check application functionality
- ✅ Monitor logs for errors

---

**🎯 FOKUS UTAMA**: 
- ✅ Environment variables tersedia saat build dan runtime
- ✅ Secure handling of sensitive data
- ✅ Proper verification dan testing
- ✅ Comprehensive documentation

**📅 Last Updated**: 2025  
**📝 Version**: 1.1  
**👤 Maintained By**: Development Team
