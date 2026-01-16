# Solusi: Aplikasi Timeout - Maximum Execution Time Exceeded

## Masalah

Aplikasi mengalami timeout error:
```
Maximum execution time of 30 seconds exceeded
```

Error terjadi di berbagai tempat random:
- `vendor/composer/ClassLoader.php`
- `vendor/laravel/framework/.../AbstractHasher.php`
- `vendor/laravel/framework/.../Filesystem.php`
- Dan berbagai file framework lainnya

## Root Cause

**BUKAN masalah query atau lazy loading!**

Masalahnya adalah **PHP `max_execution_time` terlalu rendah untuk development environment**

Development environment Laravel + Inertia + SSR + Vite  membutuhkan waktu lebih lama untuk:
1. Class autoloading
2. SSR rendering  
3. Vite dev server communication
4. Framework initialization

Defaultnya PHP execution time = 30 detik, terlalu pendek.

## Solusi

### 1. Tingkatkan PHP Execution Time Limit

Edit file `php.ini`:

```ini
max_execution_time = 300  ; 5 menit untuk development
max_input_time = 300
memory_limit = 512M       ; Tambah memory juga
```

**Lokasi php.ini:**
- Windows (XAMPP): `C:\xampp\php\php.ini`  
- Windows (Laragon): `C:\laragon\bin\php\php8.x\php.ini`
- Linux: `/etc/php/8.x/cli/php.ini` dan `/etc/php/8.x/fpm/php.ini`

### 2. Restart Web Server

Setelah edit php.ini:
```bash
# XAMPP
Restart Apache dari XAMPP Control Panel

# Laragon  
Restart All Services

# Laravel Artisan Serve
php artisan serve
```

### 3. Verifikasi

Check apakah sudah berubah:
```bash
php -i | grep max_execution_time
```

Seharusnya output: `max_execution_time => 300 => 300`

### 4. Alternative: Set di Runtime (Laravel)

Jika tidak bisa edit php.ini, tambahkan di `public/index.php`:

```php
<?php

// Tambahkan ini di awal file, sebelum require autoload
ini_set('max_execution_time', 300);
ini_set('memory_limit', '512M');

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));
// ... rest of file
```

## Production Notes

**PENTING:** Untuk production, JANGAN set execution time terlalu tinggi!

Production seharusnya:
- `max_execution_time = 60` (1 menit max)
- Optimasi code agar fast
- Use caching, queue jobs
- Lazy loading sudah aktif (bundle 655KB)

## Verification Steps

Setelah fix, test:

1. **Clear cache:**
   ```bash
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   php artisan view:clear
   ```

2. **Access homepage:**
   ```
   http://home.test
   ```

3. **Check logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

Seharusnya tidak ada timeout error lagi.

## Additional Checks

Jika masih timeout setelah increase limit, kemungkinan ada:

1. **Infinite loop** di code
2. **Database connection issue** 
3. **External API call yang hang**
4. **File system issue** (antivirus scanning)

Check dengan Laravel Debugbar atau Telescope untuk profiling.
