# Error Pages Documentation
## Property Management System - Laravel 12 + React 18 + WebSocket

---

## 📋 OVERVIEW

Dokumentasi ini menjelaskan error pages yang telah dibuat untuk menangani berbagai jenis error di aplikasi Homsjogja Property Management System.

---

## 🎨 ERROR PAGES YANG TERSEDIA

### 1. **404.html - Page Not Found**
- **File Location**: `public/404.html`
- **Error Codes**: 400, 401, 402, 403, 404
- **Features**:
  - ✅ Responsive design dengan gradient background
  - ✅ Search box untuk mencari properti/layanan
  - ✅ Container info display
  - ✅ Auto-refresh setelah 60 detik
  - ✅ Requested URL display

### 2. **50x.html - Server Error**
- **File Location**: `public/50x.html`
- **Error Codes**: 500, 502, 503, 504
- **Features**:
  - ✅ Responsive design dengan gradient background
  - ✅ Container info display
  - ✅ Auto-refresh setelah 30 detik
  - ✅ Professional error message

---

## 🛠️ KONFIGURASI NGINX

### Error Page Configuration
```nginx
# Error pages - menggunakan custom error pages
error_page 400 401 402 403 404 /404.html;
error_page 500 502 503 504 /50x.html;

location = /404.html {
    root /var/www/html/public;
    internal;
}

location = /50x.html {
    root /var/www/html/public;
    internal;
}
```

### Error Code Mapping
| Error Code | Description | File | Auto-refresh |
|------------|-------------|------|--------------|
| 400 | Bad Request | 404.html | 60s |
| 401 | Unauthorized | 404.html | 60s |
| 402 | Payment Required | 404.html | 60s |
| 403 | Forbidden | 404.html | 60s |
| 404 | Not Found | 404.html | 60s |
| 500 | Internal Server Error | 50x.html | 30s |
| 502 | Bad Gateway | 50x.html | 30s |
| 503 | Service Unavailable | 50x.html | 30s |
| 504 | Gateway Timeout | 50x.html | 30s |

---

## 🎨 DESIGN FEATURES

### Common Design Elements
- **Background**: Linear gradient (blue to purple)
- **Font**: System fonts (Apple, BlinkMacSystem, Segoe UI, Roboto)
- **Container**: Glassmorphism effect dengan backdrop blur
- **Colors**: White text dengan opacity variations
- **Responsive**: Mobile-first design

### 404.html Specific Features
- **Search Box**: Input field untuk mencari properti/layanan
- **Requested URL**: Menampilkan URL yang diminta
- **Search Functionality**: Redirect ke homepage dengan query parameter
- **Longer Auto-refresh**: 60 detik untuk user experience yang lebih baik

### 50x.html Specific Features
- **Server Error Message**: Pesan yang lebih technical
- **Shorter Auto-refresh**: 30 detik untuk quick recovery
- **Container Info**: Menampilkan container ID dan timestamp

---

## 🔧 IMPLEMENTATION

### 1. File Creation
```bash
# Buat file error pages
touch public/404.html
touch public/50x.html
```

### 2. Nginx Configuration
```bash
# Update nginx config
vim docker/nginx/dokploy.conf
```

### 3. Script Integration
```bash
# Jalankan fix script
./fix-nginx-issues.sh
```

---

## 🧪 TESTING

### Test Error Pages
```bash
# Test 404 error
curl -I http://localhost:8080/nonexistent-page

# Test 500 error (simulate)
curl -I http://localhost:8080/health
```

### Expected Responses
```html
<!-- 404.html Response -->
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=UTF-8

<!-- 50x.html Response -->
HTTP/1.1 500 Internal Server Error
Content-Type: text/html; charset=UTF-8
```

---

## 📱 RESPONSIVE DESIGN

### Mobile Viewport
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### CSS Media Queries
```css
/* Mobile optimization */
@media (max-width: 768px) {
    .error-code {
        font-size: 4rem;
    }
    .error-container {
        padding: 1rem;
        margin: 1rem;
    }
}
```

---

## 🔍 TROUBLESHOOTING

### Common Issues

#### 1. Error Page Not Showing
**Problem**: Error page tidak muncul
**Solution**:
```bash
# Cek file exists
ls -la /var/www/html/public/404.html
ls -la /var/www/html/public/50x.html

# Cek nginx config
nginx -t

# Restart nginx
supervisorctl restart nginx
```

#### 2. Wrong Error Page Displayed
**Problem**: 404 error menampilkan 50x page
**Solution**:
```bash
# Cek nginx error page config
grep "error_page" /etc/nginx/http.d/default.conf

# Update config jika perlu
vim docker/nginx/dokploy.conf
```

#### 3. Search Not Working
**Problem**: Search box di 404 page tidak berfungsi
**Solution**:
```javascript
// Cek JavaScript console untuk errors
// Pastikan search functionality ter-load
```

---

## 📊 MONITORING

### Log Monitoring
```bash
# Monitor error page access
tail -f /var/log/nginx/access.log | grep "404\|500"

# Monitor error page errors
tail -f /var/log/nginx/error.log
```

### Analytics Integration
```javascript
// Google Analytics untuk error pages
gtag('event', 'error_page_view', {
    'error_code': '404',
    'page_url': window.location.pathname
});
```

---

## 🔄 MAINTENANCE

### Regular Updates
- **Monthly**: Review error page content
- **Quarterly**: Update design elements
- **Annually**: Full redesign jika diperlukan

### Content Updates
```bash
# Update error page content
vim public/404.html
vim public/50x.html

# Test changes
curl http://localhost:8080/404.html
curl http://localhost:8080/50x.html
```

---

## 📋 CHECKLIST

### ✅ Pre-Implementation
- [ ] Design mockups approved
- [ ] Content reviewed
- [ ] Nginx config updated
- [ ] File permissions correct

### ✅ Implementation
- [ ] 404.html created
- [ ] 50x.html created
- [ ] Nginx config updated
- [ ] Error page mapping correct
- [ ] Responsive design tested

### ✅ Post-Implementation
- [ ] Error pages accessible
- [ ] Search functionality working
- [ ] Auto-refresh working
- [ ] Mobile responsive
- [ ] Logs monitoring setup

---

## 🎯 SUCCESS METRICS

### User Experience
- **Bounce Rate**: < 50% dari error pages
- **Search Usage**: > 20% users menggunakan search box
- **Return Rate**: > 30% users kembali ke homepage

### Technical Metrics
- **Load Time**: < 2 seconds
- **Uptime**: > 99.9%
- **Error Rate**: < 1% dari total requests

---

**📅 Last Updated**: 2025  
**🔄 Status**: Production Ready  
**👤 Maintained By**: Development Team 