# GOWA Configuration Guide

## Cara Kerja GOWA Config

### 1. Penyimpanan Configuration

GOWA configuration disimpan di database table `gowa_configs` dengan struktur:

```
- id: Primary key
- name: Identifier config (default: 'default')
- url: GOWA server URL
- username: Basic auth username
- password: Basic auth password (encrypted)
- whatsapp_number: Nomor WA yang digunakan
- is_active: Boolean flag untuk config aktif
- created_at, updated_at: Timestamps
```

**Penting:**
- Password **otomatis di-encrypt** saat disimpan menggunakan Laravel encryption
- Password **otomatis di-decrypt** saat diambil dari database
- Hanya **1 config yang boleh aktif** (`is_active = true`) pada satu waktu

### 2. Pemilihan Config Aktif

`GowaService` memilih config dengan cara:

```php
// Di constructor GowaService
public function __construct()
{
    $this->config = GowaConfig::getActive();
}

// Method getActive() di GowaConfig model
public static function getActive(): ?self
{
    return static::where('is_active', true)->first();
}
```

**Flow:**
1. Setiap kali `GowaService` di-instantiate, ia memanggil `GowaConfig::getActive()`
2. `getActive()` query database untuk config dengan `is_active = true`
3. Hanya config pertama yang ditemukan yang digunakan
4. Jika tidak ada config aktif, service akan return null dan throw error

### 3. Setup Awal

**Opsi 1: Via Seeder (Recommended)**

```bash
# Run seeder
php artisan db:seed --class=GowaConfigSeeder
```

Seeder akan:
- Membaca dari environment variables (.env)
- Membuat config default jika belum ada
- Set config sebagai active

**Opsi 2: Via Admin Panel**

1. Login sebagai admin/manager
2. Akses `/admin/gowa`
3. Isi form configuration:
   - Server URL: `https://gowa.yourdomain.com`
   - Username: `admin`
   - Password: `your-password`
   - WhatsApp Number: `628123456789`
4. Click "Save Configuration"

### 4. Environment Variables

Tambahkan di `.env`:

```env
GOWA_URL=https://gowa.yourdomain.com
GOWA_USERNAME=admin
GOWA_PASSWORD=your-secure-password
GOWA_WHATSAPP_NUMBER=628123456789
```

### 5. Update Configuration

Saat admin update config via `/admin/gowa`:

```php
// Di GowaAdminController::updateConfig()
1. Validate input
2. Get active config (atau create baru jika belum ada)
3. Update config data
4. Ensure hanya config ini yang active:
   GowaConfig::where('id', '!=', $config->id)->update(['is_active' => false]);
5. Return success
```

**Mekanisme Ensure Single Active:**
- Setelah update/create config, semua config lain di-set `is_active = false`
- Ini memastikan hanya 1 config yang aktif

### 6. Multiple Config (Future Enhancement)

Saat ini sistem hanya support 1 active config. Jika di masa depan perlu multiple config:

**Opsi A: Config per Property**
```php
// Add property_id to gowa_configs
$config = GowaConfig::where('property_id', $propertyId)
    ->where('is_active', true)
    ->first();
```

**Opsi B: Config Switching**
```php
// Add method to switch active config
public function switchConfig(int $configId)
{
    GowaConfig::query()->update(['is_active' => false]);
    GowaConfig::find($configId)->update(['is_active' => true]);
}
```

### 7. Troubleshooting

**Problem: "GOWA configuration not found"**
- Cause: Tidak ada config dengan `is_active = true`
- Solution: Run seeder atau create config via admin panel

**Problem: Multiple active configs**
- Cause: Manual database edit
- Solution: 
  ```sql
  UPDATE gowa_configs SET is_active = false WHERE id != <desired_id>;
  UPDATE gowa_configs SET is_active = true WHERE id = <desired_id>;
  ```

**Problem: Password tidak bisa decrypt**
- Cause: APP_KEY berubah setelah password di-encrypt
- Solution: Update password via admin panel

### 8. Security Notes

1. **Password Encryption**: Password di-encrypt menggunakan Laravel's encryption (AES-256-CBC)
2. **APP_KEY**: Jangan ubah `APP_KEY` di `.env` setelah ada config tersimpan
3. **Database Backup**: Backup database sebelum ubah `APP_KEY`
4. **Access Control**: Hanya admin/manager yang bisa akses GOWA config

### 9. Testing Config

```bash
# Test via artisan tinker
php artisan tinker

# Get active config
$config = App\Models\GowaConfig::getActive();
dd($config);

# Test GOWA connection
$service = app(App\Services\GowaService::class);
$status = $service->checkConnection();
dd($status);
```

## Summary

**Cara Kerja Singkat:**
1. Config disimpan di `gowa_configs` table
2. Hanya 1 config boleh `is_active = true`
3. `GowaService` selalu ambil config aktif via `getActive()`
4. Update config via admin panel otomatis ensure single active
5. Password auto-encrypted/decrypted
