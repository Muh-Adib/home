# 🔧 Panduan Memperbaiki Mixed Content Issues

## 📋 Deskripsi Masalah

Mixed Content error terjadi ketika halaman web yang dimuat melalui HTTPS mencoba memuat resource (CSS, JS, images) melalui HTTP yang tidak aman. Browser modern memblokir resource ini untuk keamanan.

### Error yang Terjadi:
```
Mixed Content: The page at 'https://homsjogja.com/login' was loaded over HTTPS, 
but requested an insecure stylesheet 'http://homsjogja.com/build/assets/app-DvB2Xm2x.css'. 
This request has been blocked; the content must be served over HTTPS.
```

## ✅ Solusi yang Sudah Diterapkan

### 1. **Konfigurasi Environment**
- ✅ Update `APP_URL=https://homsjogja.com` di `.env`
- ✅ Tambahkan `ASSET_URL=https://homsjogja.com`
- ✅ Set `SESSION_SECURE_COOKIE=true`

### 2. **Konfigurasi Vite**
- ✅ Update `vite.config.ts` dengan base URL HTTPS
- ✅ Rebuild assets dengan `npm run build`

### 3. **Konfigurasi Inertia.js**
- ✅ Update `config/inertia.php` untuk HTTPS SSR
- ✅ Update `resources/js/bootstrap.js` dengan base URL HTTPS

### 4. **Konfigurasi Laravel**
- ✅ Update `config/app.php` untuk asset URL
- ✅ Clear semua cache Laravel

## 🚀 Langkah Deploy ke Production

### 1. **Upload File ke Server**
```bash
# Upload file yang sudah diupdate
scp -r . user@server:/var/www/homsjogja.com/
```

### 2. **Jalankan Script Fix**
```bash
# Di server production
cd /var/www/homsjogja.com
./fix-mixed-content.sh
```

### 3. **Update Nginx Configuration**
```bash
# Copy nginx config
sudo cp nginx-https-config.conf /etc/nginx/sites-available/homsjogja.com
sudo ln -sf /etc/nginx/sites-available/homsjogja.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔍 Verifikasi Fix

### 1. **Check Browser Console**
- Buka https://homsjogja.com
- Tekan F12 → Console
- Pastikan tidak ada Mixed Content errors

### 2. **Check Network Tab**
- F12 → Network tab
- Reload halaman
- Pastikan semua assets dimuat dengan HTTPS (🔒)

### 3. **Test Login Functionality**
- Coba login ke aplikasi
- Pastikan tidak ada network errors
- Check AJAX requests menggunakan HTTPS

## 🛠️ Troubleshooting

### Jika Masih Ada Mixed Content Errors:

#### 1. **Check .env File**
```bash
# Pastikan konfigurasi benar
cat .env | grep -E "(APP_URL|ASSET_URL)"
```

#### 2. **Clear Browser Cache**
- Hard refresh: Ctrl+Shift+R
- Clear browser cache
- Test di incognito mode

#### 3. **Check Nginx Logs**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

#### 4. **Verify SSL Certificate**
```bash
# Test SSL
curl -I https://homsjogja.com
openssl s_client -connect homsjogja.com:443
```

### Jika Assets Tidak Dimuat:

#### 1. **Check File Permissions**
```bash
sudo chown -R www-data:www-data /var/www/homsjogja.com/public/build
sudo chmod -R 755 /var/www/homsjogja.com/public/build
```

#### 2. **Check Nginx Configuration**
```bash
sudo nginx -t
sudo systemctl status nginx
```

#### 3. **Rebuild Assets**
```bash
cd /var/www/homsjogja.com
npm run build
```

## 📊 Monitoring

### 1. **Check Website Security**
- Gunakan tools seperti SSL Labs: https://www.ssllabs.com/ssltest/
- Test dengan: https://securityheaders.com/

### 2. **Monitor Browser Console**
- Set up monitoring untuk Mixed Content errors
- Check Google Search Console untuk security issues

## 🔒 Security Best Practices

### 1. **Content Security Policy**
- Implementasi CSP headers di Nginx
- Block mixed content secara eksplisit

### 2. **HTTPS Enforcement**
- Redirect semua HTTP ke HTTPS
- Set HSTS headers
- Use secure cookies

### 3. **Asset Security**
- Serve assets dengan HTTPS only
- Set proper cache headers
- Use immutable cache for assets

## 📞 Support

Jika masih mengalami masalah:
1. Check browser console untuk error details
2. Verify server configuration
3. Test dengan tools online
4. Contact development team

---

**📅 Last Updated**: $(date)  
**👤 Maintained By**: Development Team  
**🔗 Related**: [AI Coding Rules](./doc/AI_CODING_RULES.md)
