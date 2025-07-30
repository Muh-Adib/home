# 🔧 Database Error Fix - Table Not Found Resolution

## Property Management System - Laravel 12 + React 18 + WebSocket

Dokumentasi untuk memperbaiki error "Table 'homs-db.amenities' doesn't exist" dan masalah database lainnya.

---

## 🚨 **Error yang Ditemukan**

### **Error Message:**
```
SQLSTATE[42S02]: Base table or view not found: 1146 Table 'homs-db.amenities' doesn't exist
(Connection: mysql, SQL: select * from `amenities` where (`name` = Sound System) limit 1)
```

### **Root Cause:**
- **Database migrations belum dijalankan** - Tabel `amenities` belum dibuat
- **Database seeders belum dijalankan** - Data awal belum dimasukkan
- **Container baru** - Database masih kosong setelah deployment

---

## ✅ **Solusi yang Diterapkan**

### **1. Script PowerShell untuk Database Fix**
```powershell
# Fix database (migrate + seed)
.\fix-database.ps1 fix

# Run migrations only
.\fix-database.ps1 migrate

# Run seeders only
.\fix-database.ps1 seed

# Check database status
.\fix-database.ps1 check
```

### **2. Manual Commands**
```bash
# Inside container
docker exec -it homsjogja-container sh

# Run migrations
php artisan migrate --force

# Run seeders
php artisan db:seed --force

# Check migration status
php artisan migrate:status
```

---

## 🔧 **Files yang Diperbaiki**

### **1. `fix-database.ps1`** (NEW)
- ✅ **Comprehensive database fix script**
- ✅ **Migration dan seeder automation**
- ✅ **Database status checking**
- ✅ **Error handling dan logging**

### **2. Database Migrations**
- ✅ **`2025_06_04_105840_create_amenities_table.php`** - Tabel amenities
- ✅ **`2025_06_04_105827_create_properties_table.php`** - Tabel properties
- ✅ **`2025_06_04_105852_create_bookings_table.php`** - Tabel bookings
- ✅ **Dan migrasi lainnya...**

### **3. Database Seeders**
- ✅ **`AmenitySeeder.php`** - Data amenities
- ✅ **`DatabaseSeeder.php`** - Main seeder
- ✅ **`PaymentMethodSeeder.php`** - Payment methods

---

## 🚀 **Cara Penggunaan**

### **1. Quick Fix (Recommended)**
```powershell
# Fix semua masalah database
.\fix-database.ps1 fix
```

### **2. Step by Step**
```powershell
# 1. Check container status
.\fix-database.ps1 check

# 2. Run migrations
.\fix-database.ps1 migrate

# 3. Run seeders
.\fix-database.ps1 seed

# 4. Test application
.\fix-database.ps1 test
```

### **3. Specific Commands**
```powershell
# Run amenities seeder only
.\fix-database.ps1 amenities

# Show migration status
.\fix-database.ps1 status

# Fresh database (drop + migrate + seed)
.\fix-database.ps1 fresh
```

---

## 📊 **Verifikasi Fix**

### **1. Check Database Tables**
```bash
# Inside container
docker exec -it homsjogja-container sh

# Check if amenities table exists
php artisan tinker --execute="echo Schema::hasTable('amenities') ? 'Table exists' : 'Table not found';"

# Check amenities count
php artisan tinker --execute="echo App\Models\Amenity::count();"
```

### **2. Check Migration Status**
```bash
# Show migration status
docker exec homsjogja-container php artisan migrate:status

# Show all tables
docker exec homsjogja-container php artisan tinker --execute="echo implode(', ', Schema::getTableNames());"
```

### **3. Test Application**
```bash
# Test main application
curl http://localhost:8080

# Test health endpoint
curl http://localhost:8080/health
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Container Not Running**
```powershell
# Start container first
.\deploy-dokploy-fixed.ps1 start

# Then fix database
.\fix-database.ps1 fix
```

#### **2. Database Connection Failed**
```powershell
# Check database connection
.\fix-database.ps1 check

# Verify external services
.\deploy-dokploy-fixed.ps1 test
```

#### **3. Migration Errors**
```powershell
# Reset database completely
.\fix-database.ps1 fresh

# Or reset and re-run
.\fix-database.ps1 reset
```

#### **4. Seeder Errors**
```powershell
# Run specific seeder
.\fix-database.ps1 amenities

# Check seeder output
docker exec homsjogja-container php artisan db:seed --class=AmenitySeeder --force
```

---

## 📋 **Database Schema**

### **Amenities Table**
```sql
CREATE TABLE `amenities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL UNIQUE,
  `icon` varchar(100) NOT NULL,
  `category` enum('basic','kitchen','bathroom','entertainment','outdoor','safety','special','accessibility') DEFAULT 'basic',
  `description` text,
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `amenities_category_is_active_index` (`category`,`is_active`),
  KEY `amenities_sort_order_index` (`sort_order`)
);
```

### **Properties Table**
```sql
CREATE TABLE `properties` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `address` text,
  `city` varchar(100),
  `state` varchar(100),
  `country` varchar(100),
  `postal_code` varchar(20),
  `latitude` decimal(10,8),
  `longitude` decimal(11,8),
  `price_per_night` decimal(10,2),
  `max_guests` int,
  `bedrooms` int,
  `bathrooms` int,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
);
```

---

## 🎯 **Success Indicators**

### **✅ Database Success**
- ✅ **All tables created** - Migrations run successfully
- ✅ **Data seeded** - Initial data inserted
- ✅ **Amenities table exists** - No more "table not found" errors
- ✅ **Application accessible** - No database errors

### **✅ Application Success**
- ✅ **Homepage loads** - No database errors
- ✅ **Properties page works** - Amenities display correctly
- ✅ **Booking system works** - All tables accessible
- ✅ **Admin panel works** - CRUD operations functional

---

## 🔧 **Additional Fixes**

### **1. Environment Variables**
```env
# Database Configuration
DB_CONNECTION=mysql
DB_HOST=homsjogja-db-xsjalx
DB_PORT=3306
DB_DATABASE=homs-db
DB_USERNAME=homs-user
DB_PASSWORD=jD8-AKHx2gFCQ5gx3ouRJ
```

### **2. Cache Clearing**
```bash
# Clear all caches
docker exec homsjogja-container php artisan config:clear
docker exec homsjogja-container php artisan cache:clear
docker exec homsjogja-container php artisan route:clear
docker exec homsjogja-container php artisan view:clear
```

### **3. Storage Permissions**
```bash
# Fix storage permissions
docker exec homsjogja-container chmod -R 755 storage
docker exec homsjogja-container chown -R www:www storage
```

---

## 📚 **Reference**

### **Laravel Commands**
```bash
# Migrations
php artisan migrate --force
php artisan migrate:status
php artisan migrate:reset --force
php artisan migrate:fresh --seed --force

# Seeders
php artisan db:seed --force
php artisan db:seed --class=AmenitySeeder --force

# Cache
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### **Database Commands**
```bash
# Check tables
php artisan tinker --execute="echo implode(', ', Schema::getTableNames());"

# Check specific table
php artisan tinker --execute="echo Schema::hasTable('amenities') ? 'Table exists' : 'Table not found';"

# Count records
php artisan tinker --execute="echo App\Models\Amenity::count();"
```

### **Docker Commands**
```bash
# Container shell
docker exec -it homsjogja-container sh

# Run commands in container
docker exec homsjogja-container php artisan migrate --force

# Check logs
docker logs homsjogja-container
```

---

## 🎉 **Ready for Production!**

Error database telah diperbaiki dengan:
- ✅ **Comprehensive fix script** - Automated database setup
- ✅ **Migration automation** - All tables created properly
- ✅ **Seeder automation** - Initial data inserted
- ✅ **Error handling** - Better troubleshooting tools
- ✅ **Verification tools** - Check database status

**📅 Last Updated**: 2025  
**🔄 Version**: 2.0  
**👤 Maintained By**: Development Team 