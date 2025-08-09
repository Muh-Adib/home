# 🔧 NGINX LARAVEL TROUBLESHOOTING
## Property Management System - Laravel 12 + React + WebSocket

---

## ❌ **MASALAH: Port 80 Menampilkan "Welcome to nginx!"**

### **Gejala:**
- Port 80 hanya menampilkan halaman default Nginx
- Laravel application tidak muncul
- Tidak ada error yang jelas

### **Penyebab Umum:**
1. **Laravel belum ter-deploy dengan benar**
2. **File `public/index.php` tidak ada**
3. **PHP-FPM tidak berjalan**
4. **Build process gagal**
5. **Environment variables tidak terbaca**

---

## 🔍 **DIAGNOSIS STEP-BY-STEP**

### **Step 1: Run Diagnosis Script**
```bash
# Run the diagnosis script
./dokploy/scripts/nginx-laravel-fix.sh

# Expected output:
# ✅ Laravel index.php found
# ✅ PHP-FPM is running
# ✅ Nginx is running
# ✅ Laravel application is accessible
# ✅ PHP processing is working
```

### **Step 2: Check Health Endpoint**
```bash
# Test health endpoint
curl http://localhost/health

# Expected output:
# {
#   "status": "ok",
#   "timestamp": "2025-01-XX XX:XX:XX",
#   "service": "Property Management System",
#   "version": "1.0.0",
#   "checks": {
#     "laravel": "ok",
#     "storage": "ok",
#     "bootstrap_cache": "ok",
#     "vendor": "ok",
#     "index_php": "ok"
#   }
# }
```

### **Step 3: Check Service Status**
```bash
# Check all services
supervisorctl status

# Expected output:
# php-fpm                          RUNNING
# nginx                            RUNNING
# laravel-queue                    RUNNING
# websocket                        RUNNING
```

---

## 🔧 **SOLUSI BERDASARKAN DIAGNOSIS**

### **Solution 1: Laravel Not Deployed Properly**

**Symptoms:**
- `❌ Laravel index.php not found`
- `❌ Laravel artisan not found`

**Solution:**
```bash
# 1. Redeploy dengan rebuild
# Di Dokploy Dashboard:
# - Check "Rebuild" option
# - Click "Deploy"

# 2. Verify deployment
./dokploy/scripts/deployment-validator.sh

# 3. Check if Laravel files exist
ls -la public/index.php
ls -la artisan
```

### **Solution 2: PHP-FPM Not Running**

**Symptoms:**
- `❌ PHP-FPM is not running`
- `❌ PHP processing is not working`

**Solution:**
```bash
# 1. Start PHP-FPM
supervisorctl start php-fpm

# 2. Check PHP-FPM logs
tail -f /var/log/supervisor/php-fpm-error.log

# 3. Test PHP processing
curl http://localhost/test.php
```

### **Solution 3: Nginx Configuration Issue**

**Symptoms:**
- `❌ Nginx configuration is invalid`
- `❌ Nginx is not running`

**Solution:**
```bash
# 1. Test Nginx config
nginx -t

# 2. Restart Nginx
supervisorctl restart nginx

# 3. Check Nginx logs
tail -f /var/log/supervisor/nginx-error.log
```

### **Solution 4: Environment Variables Not Set**

**Symptoms:**
- `⚠️ Environment variables might not be set`
- Laravel using default values

**Solution:**
```bash
# 1. Check environment variables
./dokploy/scripts/validate-env.sh

# 2. Set in Dokploy Dashboard
# - Go to Environment Variables tab
# - Add all required variables
# - Format: KEY=value (no spaces)

# 3. Redeploy
```

---

## 🚀 **QUICK FIXES**

### **Fix 1: Manual Laravel Setup**
```bash
# If Laravel files are missing
composer install --no-dev --optimize-autoloader
npm ci --legacy-peer-deps
npm run build

# Create necessary directories
mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache
chmod -R 755 storage bootstrap/cache

# Clear and cache Laravel
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### **Fix 2: Restart All Services**
```bash
# Restart all services
supervisorctl restart all

# Check status
supervisorctl status

# Test endpoints
curl http://localhost/health
curl http://localhost/
```

### **Fix 3: Check File Permissions**
```bash
# Set proper permissions
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Check if files are accessible
ls -la public/index.php
ls -la storage/logs
```

---

## 📊 **MONITORING & VERIFICATION**

### **1. Check Logs**
```bash
# Nginx logs
tail -f /var/log/supervisor/nginx-error.log
tail -f /var/log/nginx/error.log

# PHP-FPM logs
tail -f /var/log/supervisor/php-fpm-error.log

# Laravel logs
tail -f storage/logs/laravel.log
```

### **2. Test Endpoints**
```bash
# Health check
curl http://localhost/health

# Main application
curl http://localhost/

# PHP info (temporary)
curl http://localhost/test.php
```

### **3. Check File Structure**
```bash
# Verify Laravel structure
ls -la
ls -la public/
ls -la storage/
ls -la bootstrap/cache/
```

---

## 🔍 **COMMON ISSUES & SOLUTIONS**

### **Issue 1: "File not found" Error**
```bash
# Check if Laravel is in correct location
pwd
ls -la public/index.php

# If missing, redeploy is needed
```

### **Issue 2: "Permission denied" Error**
```bash
# Fix permissions
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Check ownership
ls -la storage/
```

### **Issue 3: "500 Internal Server Error"**
```bash
# Check Laravel logs
tail -f storage/logs/laravel.log

# Check PHP-FPM logs
tail -f /var/log/supervisor/php-fpm-error.log

# Clear Laravel caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### **Issue 4: "502 Bad Gateway"**
```bash
# Check PHP-FPM status
supervisorctl status php-fpm

# Restart PHP-FPM
supervisorctl restart php-fpm

# Check PHP-FPM logs
tail -f /var/log/supervisor/php-fpm-error.log
```

---

## 🎯 **SUCCESS INDICATORS**

### **✅ Working Application:**
- Health endpoint returns `{"status": "ok"}`
- Main page shows Laravel application
- All services running (nginx, php-fpm, queue, websocket)
- No errors in logs

### **❌ Still Broken:**
- Health endpoint shows errors
- Main page shows "Welcome to nginx!"
- Services not running
- Errors in logs

---

## 📋 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment:**
- [ ] Environment variables set in Dokploy Dashboard
- [ ] All config files exist
- [ ] Run deployment validator

### **Post-Deployment:**
- [ ] Check health endpoint
- [ ] Verify Laravel application loads
- [ ] Test all services running
- [ ] Monitor logs for errors

---

## 🆘 **EMERGENCY FIXES**

### **If Nothing Works:**
```bash
# 1. Complete redeploy
# - Delete and recreate application in Dokploy
# - Set all environment variables
# - Deploy with rebuild

# 2. Manual verification
./dokploy/scripts/nginx-laravel-fix.sh
./dokploy/scripts/check-deployment.sh
./dokploy/scripts/validate-env.sh

# 3. Check all logs
tail -f /var/log/supervisor/*.log
tail -f storage/logs/laravel.log
```

---

**🎯 FOKUS UTAMA**: 
- ✅ Verify Laravel files exist
- ✅ Check PHP-FPM is running
- ✅ Ensure Nginx configuration is correct
- ✅ Validate environment variables
- ✅ Monitor logs for errors

**📅 Last Updated**: 2025  
**📝 Version**: 1.0  
**👤 Maintained By**: Development Team
