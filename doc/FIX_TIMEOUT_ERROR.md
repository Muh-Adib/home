# Fix Maximum Execution Time Error

## Masalah

Error: `Fatal error: Maximum execution time of 30 seconds exceeded in vendor/laravel/framework/config/services.php on line 18`

## Penyebab Umum

1. **Config cache corrupt** - Cache config yang rusak menyebabkan infinite loop
2. **Circular dependency** - Dependency yang saling memanggil di service providers
3. **Masalah .env** - Variable environment yang menyebabkan loop
4. **Autoload issues** - Masalah di composer autoload

## Solusi Cepat (Step by Step)

### Step 1: Clear Semua Cache

```bash
# Clear semua cache Laravel
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize:clear
rm -f bootstrap/cache/config.php
rm -f bootstrap/cache/routes.php
rm -f bootstrap/cache/services.php
```

**Atau gunakan script yang sudah disediakan:**

```bash
# Windows (Git Bash)
bash fix-timeout.sh

# Linux/Mac
chmod +x fix-timeout.sh
./fix-timeout.sh
```

### Step 2: Debug Masalah

Jalankan script debug untuk melihat detail masalah:

```bash
php debug-timeout.php
```

Script ini akan menampilkan:
- PHP configuration
- Config cache status
- .env file check
- Service providers check
- Potential circular dependencies

### Step 3: Periksa Service Providers

Pastikan tidak ada `config()` calls di method `register()` di service providers. Jika ada, pindahkan ke method `boot()`.

**❌ SALAH:**
```php
public function register(): void
{
    $value = config('app.key'); // BISA MENYEBABKAN INFINITE LOOP
}
```

**✅ BENAR:**
```php
public function boot(): void
{
    $value = config('app.key'); // AMAN di boot()
}
```

### Step 4: Periksa .env File

Pastikan tidak ada circular references di `.env`:

```bash
# Check for potential issues
grep -E '\$\{|\(\$' .env
```

Jika ada, perbaiki dengan menghapus atau mengubah variable tersebut.

### Step 5: Rebuild Autoload

```bash
composer dump-autoload
```

### Step 6: Jika Masih Error

**Option A: Increase timeout sementara untuk debugging**

Edit `php.ini`:
```ini
max_execution_time = 60
```

Atau tambahkan di awal `public/index.php`:
```php
ini_set('max_execution_time', 60);
```

**Option B: Disable config caching sementara**

Di `.env`:
```env
APP_ENV=local
APP_DEBUG=true
```

Jangan jalankan `php artisan config:cache` sampai masalah teratasi.

## Perbaikan Permanen

### 1. Optimasi AppServiceProvider

Pastikan `AppServiceProvider` tidak memanggil config di `register()`:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // ✅ HANYA register services, JANGAN panggil config() di sini
        $this->app->singleton(SomeService::class);
    }

    public function boot(): void
    {
        // ✅ Panggil config() di sini jika diperlukan
        if (config('app.force_https')) {
            \URL::forceScheme('https');
        }
    }
}
```

### 2. Check untuk Circular Dependencies

Pastikan tidak ada service yang saling memanggil:

```php
// ❌ SALAH - Circular dependency
ServiceA -> depends on -> ServiceB
ServiceB -> depends on -> ServiceA

// ✅ BENAR - One-way dependency
ServiceA -> depends on -> ServiceB
ServiceB -> independent
```

### 3. Optimasi Config Loading

Jika menggunakan banyak config, pertimbangkan lazy loading:

```php
// ❌ SALAH - Load semua config di awal
$config = config('services.all');

// ✅ BENAR - Load hanya yang diperlukan
$config = config('services.specific');
```

## Troubleshooting

### Error masih terjadi setelah clear cache?

1. **Check file permissions:**
   ```bash
   chmod -R 775 bootstrap/cache
   chmod -R 775 storage
   ```

2. **Check disk space:**
   ```bash
   df -h
   ```

3. **Check PHP error log:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

4. **Enable detailed error reporting:**
   Di `.env`:
   ```env
   APP_DEBUG=true
   LOG_LEVEL=debug
   ```

### Error hanya terjadi di production?

1. **Check APP_ENV:**
   ```env
   APP_ENV=production
   APP_DEBUG=false
   ```

2. **Check config cache:**
   ```bash
   php artisan config:cache
   ```

3. **Check opcache:**
   ```bash
   php -i | grep opcache
   ```

## Prevention

Untuk mencegah masalah ini di masa depan:

1. **Jangan panggil `config()` di `register()` method**
2. **Gunakan lazy loading untuk config yang berat**
3. **Clear cache secara berkala di development**
4. **Monitor error logs untuk early detection**

## Scripts yang Tersedia

1. **debug-timeout.php** - Debug script untuk analisis masalah
2. **fix-timeout.sh** - Auto-fix script untuk clear cache

## Support

Jika masalah masih terjadi setelah semua langkah di atas:

1. Jalankan `php debug-timeout.php` dan simpan output
2. Check `storage/logs/laravel.log` untuk error details
3. Check PHP error log untuk stack trace lengkap
4. Share hasil debug untuk analisis lebih lanjut

