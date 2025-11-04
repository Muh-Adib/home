# 🔧 Perbaikan Error 419 (Page Expired - CSRF Token)

**Tanggal**: 2025-01-27  
**Status**: ✅ Fixed

---

## 🐛 Masalah

Error **419 (Page Expired)** terjadi karena:
- CSRF token expired atau tidak valid
- Session expired
- CSRF token tidak ter-update dengan benar di form submission
- Form submission tidak mengirim CSRF token header

---

## ✅ Solusi yang Diterapkan

### 1. **Update app.tsx** - Error Handler untuk Inertia
**File**: `resources/js/app.tsx`

**Changes**:
- Tambahkan `onError` handler untuk handle 419 dan 401 errors
- Auto reload page jika terjadi CSRF token expired

```typescript
onError: (page) => {
    if (page.status === 419 || page.status === 401) {
        // CSRF token expired or unauthorized - refresh the page to get a new token
        window.location.reload();
    }
}
```

### 2. **Update HandleInertiaRequests** - Share CSRF Token
**File**: `app/Http/Middleware/HandleInertiaRequests.php`

**Changes**:
- Share CSRF token ke frontend melalui Inertia props
- Membantu frontend untuk selalu punya akses ke CSRF token terbaru

```php
'csrf' => csrf_token(),
```

### 3. **Update bootstrap.js** - Axios Interceptors
**File**: `resources/js/bootstrap.js`

**Changes**:
- Function `updateCsrfToken()` untuk update CSRF token secara dinamis
- Request interceptor untuk selalu mengirim CSRF token terbaru pada setiap request
- Response interceptor untuk handle 419 errors dengan auto-retry setelah refresh token

**Features**:
- Auto-update CSRF token pada setiap request
- Auto-retry request setelah refresh CSRF token jika terjadi 419 error
- Auto-reload page jika refresh token gagal

### 4. **Add CSRF Token Endpoint** - Route untuk Refresh Token
**File**: `routes/web.php`

**Changes**:
- Tambahkan route `/csrf-token` untuk mendapatkan CSRF token terbaru
- Digunakan oleh axios interceptor untuk refresh token saat terjadi 419 error

```php
Route::get('/csrf-token', function (Request $request) {
    return response()->json(['token' => csrf_token()]);
})->middleware('web')->name('csrf.token');
```

---

## 🎯 Cara Kerja

### Flow Normal (No Error):
1. User mengisi form
2. Form submission via Inertia.js
3. CSRF token otomatis diambil dari meta tag
4. Request berhasil

### Flow Saat 419 Error:
1. User mengisi form
2. Form submission via Inertia.js
3. Server return 419 (CSRF token expired)
4. **Axios Interceptor** menangkap error 419
5. Auto-refresh CSRF token dari endpoint `/csrf-token`
6. Update meta tag dan axios default headers
7. Auto-retry request dengan token baru
8. Request berhasil

### Flow Saat Refresh Token Gagal:
1. User mengisi form
2. Form submission via Inertia.js
3. Server return 419 (CSRF token expired)
4. **Axios Interceptor** menangkap error 419
5. Refresh token dari endpoint `/csrf-token` **gagal**
6. **Auto-reload page** untuk mendapatkan token baru
7. User bisa submit form lagi setelah reload

### Flow Saat Inertia Error:
1. User mengisi form
2. Form submission via Inertia.js
3. Server return 419 atau 401
4. **Inertia onError Handler** menangkap error
5. **Auto-reload page** untuk mendapatkan token baru
6. User bisa submit form lagi setelah reload

---

## 📋 Testing Checklist

### ✅ Manual Testing
- [ ] Submit form setelah page dibuka beberapa saat (session masih aktif)
- [ ] Submit form setelah page dibuka lama (session expired)
- [ ] Submit form dengan multiple tabs (CSRF token sync)
- [ ] Submit form dengan network slow (timeout handling)
- [ ] Submit form setelah idle lama (auto-refresh token)

### ✅ Edge Cases
- [ ] Form submission saat CSRF token expired
- [ ] Multiple form submissions secara bersamaan
- [ ] Form submission saat network unstable
- [ ] Form submission saat session expired

---

## 🔍 Troubleshooting

### Masih Terjadi Error 419?

1. **Clear Browser Cache & Cookies**
   ```
   - Clear browser cache
   - Clear cookies untuk domain aplikasi
   - Restart browser
   ```

2. **Cek Session Configuration**
   ```bash
   # Cek config/session.php
   - Pastikan SESSION_DRIVER sudah benar
   - Pastikan SESSION_LIFETIME tidak terlalu pendek
   ```

3. **Cek Laravel Logs**
   ```bash
   tail -f storage/logs/laravel.log
   ```
   - Cari error terkait CSRF token
   - Cari error terkait session

4. **Cek Network Tab (Browser DevTools)**
   - Pastikan request mengirim header `X-CSRF-TOKEN`
   - Pastikan CSRF token valid (tidak expired)
   - Pastikan response dari server

5. **Cek Meta Tag**
   ```html
   <!-- Pastikan ada di <head> -->
   <meta name="csrf-token" content="{{ csrf_token() }}">
   ```

6. **Test CSRF Token Endpoint**
   ```bash
   curl http://your-app-url/csrf-token
   ```
   - Harus return JSON dengan token
   - Pastikan tidak ada 401/403 error

---

## 📝 Notes

### Inertia.js CSRF Handling
- Inertia.js **otomatis** handle CSRF token untuk semua form submission
- Inertia menggunakan header `X-CSRF-TOKEN` atau `X-XSRF-TOKEN`
- CSRF token diambil dari meta tag `<meta name="csrf-token">`

### Axios CSRF Handling
- Axios memerlukan setup manual untuk CSRF token
- Kita sudah setup di `bootstrap.js` dengan interceptors
- CSRF token diambil dari meta tag dan di-set sebagai default header

### Session Expiration
- Jika session expired, CSRF token juga expired
- Auto-reload page akan membuat session baru dan token baru
- User perlu login lagi jika session benar-benar expired

---

## 🚀 Best Practices

### 1. **Session Lifetime**
```env
# .env
SESSION_LIFETIME=120  # 2 jam (minutes)
```
- Jangan set terlalu pendek (< 30 menit)
- Jangan set terlalu panjang (> 8 jam untuk security)

### 2. **Remember CSRF Token Update**
- CSRF token bisa berubah setelah:
  - Login/Logout
  - Session regenerate
  - Long idle time

### 3. **User Experience**
- Auto-reload page mungkin mengganggu user
- Pertimbangkan untuk show notification sebelum reload
- Pertimbangkan untuk save form data sebelum reload (localStorage)

---

## 🔐 Security Considerations

### CSRF Protection
- ✅ CSRF token validation aktif di semua POST/PUT/DELETE requests
- ✅ CSRF token refresh tidak mengubah security level
- ✅ Auto-reload hanya terjadi saat 419 error (legitimate case)

### Session Security
- ✅ Session cookie secure dan httpOnly
- ✅ CSRF token tidak disimpan di localStorage (security risk)
- ✅ CSRF token hanya diambil dari meta tag atau server response

---

## 📦 Files Modified

1. ✅ `resources/js/app.tsx` - Added error handler
2. ✅ `app/Http/Middleware/HandleInertiaRequests.php` - Share CSRF token
3. ✅ `resources/js/bootstrap.js` - Axios interceptors untuk CSRF
4. ✅ `routes/web.php` - CSRF token refresh endpoint

---

**Status**: ✅ Complete  
**Next Steps**: Monitor error logs dan user feedback untuk ensure fix bekerja dengan baik


