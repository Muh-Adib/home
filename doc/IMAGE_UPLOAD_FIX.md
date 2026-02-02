# Mengapa Konversi WebP Gagal?

## Root Cause

**Imagick extension TIDAK terinstall di environment lokal!**

```
📦 PHP Extensions:
  GD: ✅ Installed
  Imagick: ❌ Not installed  ← MASALAH!
```

## Penjelasan

1. **ImageService** default menggunakan driver `imagick` (dari config)
2. Saat upload, service mencoba create `ImagickDriver()`
3. Karena extension tidak ada, **error: "Unable to set format"**
4. Sekarang sudah ada fallback, jadi upload tetap berhasil dengan GD

## Perbedaan Environment

| Environment | Imagick | GD | WebP Support |
|-------------|---------|----|--------------| 
| **Local (Windows)** | ❌ Tidak ada | ✅ Ada | ✅ Via GD |
| **Production (Docker)** | ✅ Ada | ✅ Ada | ✅ Via Imagick |

## Solusi

### Untuk Development Lokal

**Opsi 1: Gunakan GD Driver (Recommended)**

Tambah ke `.env`:
```env
IMAGE_DRIVER=gd
IMAGE_AUTO_FALLBACK=true
```

Lalu clear config:
```bash
php artisan config:clear
```

**Opsi 2: Install Imagick di Local**

Windows:
1. Download Imagick DLL untuk PHP 8.4 dari https://pecl.php.net/package/imagick
2. Extract ke folder `ext`
3. Enable di `php.ini`: `extension=imagick`
4. Restart web server

Linux/Mac:
```bash
pecl install imagick
```

### Untuk Production

✅ **Sudah OK!** Dockerfile sudah diupdate dengan Imagick.

## Testing

Cek support dengan command:
```bash
php artisan image:check-support
```

## Kesimpulan

- ✅ Code sudah benar dengan fallback mechanism
- ✅ Production akan pakai Imagick (lebih baik)
- ✅ Local bisa pakai GD (sudah support WebP)
- ✅ Upload tidak akan gagal di environment manapun
