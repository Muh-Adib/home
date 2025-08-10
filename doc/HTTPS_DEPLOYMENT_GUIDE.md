# 🔒 HTTPS DEPLOYMENT GUIDE
# Property Management System - Laravel 12 + React + WebSocket

## 📋 OVERVIEW

Panduan lengkap untuk mengimplementasikan HTTPS deployment dengan Traefik, Laravel Trust, React HTTPS, dan Dokploy dengan 0.0.0.0 binding.

## 🎯 AREA YANG DIKONFIGURASI

| Area                | Tindakan yang Disarankan                                        | Status |
| ------------------- | --------------------------------------------------------------- | ------ |
| **Traefik → HTTPS** | Enable TLS, redirect HTTP ke HTTPS, dan proxied ke backend HTTP | ✅ |
| **Laravel Trust**   | Aktifkan `TrustProxies`, gunakan `URL::forceScheme('https')`    | ✅ |
| **React Config**    | Gunakan API_URL HTTPS dan sertakan CORS yang sesuai            | ✅ |
| **Dokploy Setup**   | Gunakan `0.0.0.0`, dan hindari mapping port manual              | ✅ |

---

## 🔧 1. TRAEFIK → HTTPS CONFIGURATION

### **A. Konfigurasi Traefik**

```yaml
# /etc/traefik/traefik.yml
api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@homsjogja.com
      storage: acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: web
```

### **B. Dynamic Configuration**

```yaml
# /etc/traefik/dynamic/app.yml
http:
  routers:
    homsjogja-app:
      rule: "Host(`homsjogja.com`) || Host(`www.homsjogja.com`)"
      service: homsjogja-app
      tls:
        certResolver: letsencrypt
      middlewares:
        - security-headers

  services:
    homsjogja-app:
      loadBalancer:
        servers:
          - url: "http://homsjogja-app:80"
```

### **C. Security Headers Middleware**

```yaml
http:
  middlewares:
    security-headers:
      headers:
        frameDeny: true
        sslRedirect: true
        browserXssFilter: true
        contentTypeNosniff: true
        forceSTSHeader: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 31536000
        customFrameOptionsValue: "SAMEORIGIN"
        customRequestHeaders:
          X-Forwarded-Proto: "https"
```

---

## 🔧 2. LARAVEL TRUST CONFIGURATION

### **A. TrustProxies Middleware**

```php
<?php
// app/Http/Middleware/TrustProxies.php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies as Middleware;
use Illuminate\Http\Request;

class TrustProxies extends Middleware
{
    protected $proxies = '*';

    protected $headers =
        Request::HEADER_X_FORWARDED_FOR |
        Request::HEADER_X_FORWARDED_HOST |
        Request::HEADER_X_FORWARDED_PORT |
        Request::HEADER_X_FORWARDED_PROTO |
        Request::HEADER_X_FORWARDED_AWS_ELB;
}
```

### **B. Force HTTPS in AppServiceProvider**

```php
<?php
// app/Providers/AppServiceProvider.php

public function boot(): void
{
    // Force HTTPS in production
    if (app()->environment('production')) {
        \URL::forceScheme('https');
    }
}
```

### **C. Environment Configuration**

```env
# .env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://homsjogja.com

# Trust all proxies
TRUSTED_PROXIES=*
```

---

## 🔧 3. REACT HTTPS CONFIGURATION

### **A. API Configuration**

```typescript
// resources/js/config/api.ts
export const API_CONFIG = {
    // Base URL - gunakan HTTPS di production
    BASE_URL: process.env.NODE_ENV === 'production' 
        ? 'https://' + window.location.hostname 
        : 'http://localhost:8000',
    
    // WebSocket URL - force HTTPS di production
    WS_URL: process.env.NODE_ENV === 'production'
        ? 'https://' + window.location.hostname + ':6001'
        : 'http://localhost:6001',
    
    // CORS Configuration
    CORS: {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        }
    }
};
```

### **B. WebSocket Configuration**

```typescript
// resources/js/lib/echo.ts
function getWebSocketUrlSafe(): string {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:6001';
    }
    
    const baseUrl = window.location.origin;
    // Force HTTPS for WebSocket in production
    const wsUrl = baseUrl.replace(/^http:/, 'https:').replace(/^https:/, 'https:');
    return wsUrl.replace(/:\d+/, ':6001');
}
```

### **C. CORS Headers**

```typescript
// CORS configuration untuk WebSocket
const echo = new Echo({
    broadcaster: 'socket.io',
    host: wsUrl,
    auth: {
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
    },
    client: io,
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    forceNew: false,
});
```

---

## 🔧 4. DOKPLOY SETUP DENGAN 0.0.0.0

### **A. Nginx Configuration**

```nginx
# dokploy/config/nginx.conf
server {
    listen 0.0.0.0:80;
    server_name _;
    root /app/public;
    index index.php index.html;
    
    # Laravel Application
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    # PHP Files
    location ~ \.php$ {
        fastcgi_pass php-fpm;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### **B. Laravel Echo Server Configuration**

```json
// laravel-echo-server.json
{
    "authHost": "https://homsjogja.com",
    "authEndpoint": "/broadcasting/auth",
    "clients": [
        {
            "appId": "homsjogja",
            "key": "homsjogja-key"
        }
    ],
    "database": "redis",
    "databaseConfig": {
        "redis": {
            "host": "127.0.0.1",
            "port": 6379,
            "password": null,
            "db": 0
        }
    },
    "devMode": false,
    "host": "0.0.0.0",
    "port": 6001,
    "protocol": "https",
    "sslCertPath": "/etc/ssl/certs/homsjogja.com.crt",
    "sslKeyPath": "/etc/ssl/private/homsjogja.com.key",
    "subscribers": {
        "http": true,
        "redis": true
    },
    "apiOriginAllow": {
        "allowCors": true,
        "allowOrigin": "https://homsjogja.com",
        "allowMethods": "GET, POST",
        "allowHeaders": "Origin, Content-Type, Accept, Authorization, X-Request-With"
    }
}
```

### **C. Dockerfile Configuration**

```dockerfile
# Dockerfile
# Expose HTTP dan WebSocket ports
EXPOSE 80 3000 6001

# Healthcheck via Nginx root
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost/health || exit 1

# Start dengan safe startup script
CMD ["/usr/local/bin/safe-startup.sh"]
```

---

## 🚀 DEPLOYMENT STEPS

### **Step 1: Setup Server**

```bash
# Jalankan script setup
sudo bash dokploy/scripts/setup-https-deployment.sh
```

### **Step 2: Build Application**

```bash
# Build Docker image
docker build -t homsjogja-app .

# Run dengan Traefik labels
docker run -d \
    --name homsjogja-app \
    --network web \
    --label "traefik.enable=true" \
    --label "traefik.http.routers.homsjogja-app.rule=Host(\`homsjogja.com\`)" \
    --label "traefik.http.routers.homsjogja-app.tls.certresolver=letsencrypt" \
    --label "traefik.http.services.homsjogja-app.loadbalancer.server.port=80" \
    --restart unless-stopped \
    homsjogja-app
```

### **Step 3: Verify Deployment**

```bash
# Check Traefik status
docker logs traefik

# Check application status
docker logs homsjogja-app

# Test HTTPS
curl -I https://homsjogja.com

# Monitor health
/usr/local/bin/monitor-app.sh
```

---

## 🔍 TESTING & VALIDATION

### **A. SSL Certificate Test**

```bash
# Test SSL certificate
openssl s_client -connect homsjogja.com:443 -servername homsjogja.com

# Check certificate expiry
echo | openssl s_client -servername homsjogja.com -connect homsjogja.com:443 2>/dev/null | openssl x509 -noout -dates
```

### **B. Security Headers Test**

```bash
# Test security headers
curl -I https://homsjogja.com

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

### **C. WebSocket Test**

```bash
# Test WebSocket connection
curl -I https://homsjogja.com:6001/socket.io/

# Test WebSocket upgrade
wscat -c wss://homsjogja.com:6001
```

---

## 🛠️ TROUBLESHOOTING

### **A. Common Issues**

1. **SSL Certificate Not Generated**
   ```bash
   # Check Traefik logs
   docker logs traefik | grep -i acme
   
   # Check DNS resolution
   nslookup homsjogja.com
   ```

2. **WebSocket Connection Failed**
   ```bash
   # Check Echo Server logs
   docker logs homsjogja-app | grep -i echo
   
   # Check port binding
   netstat -tlnp | grep 6001
   ```

3. **CORS Issues**
   ```bash
   # Check browser console
   # Verify CORS headers in response
   curl -H "Origin: https://homsjogja.com" -I https://homsjogja.com
   ```

### **B. Debug Commands**

```bash
# Check all containers
docker ps -a

# Check network
docker network inspect web

# Check Traefik dashboard
curl http://localhost:8080/api/http/routers

# Check SSL certificate
docker exec traefik cat /etc/traefik/acme/acme.json
```

---

## 📊 MONITORING & MAINTENANCE

### **A. Health Monitoring**

```bash
# Automated health check
*/5 * * * * /usr/local/bin/monitor-app.sh >> /var/log/app-monitor.log 2>&1

# Log rotation
/var/log/app-monitor.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

### **B. SSL Certificate Renewal**

```bash
# Traefik automatically renews certificates
# Check renewal status
docker exec traefik cat /etc/traefik/acme/acme.json | jq '.homsjogja.com.certificate'
```

### **C. Performance Monitoring**

```bash
# Monitor Traefik metrics
curl http://localhost:8080/metrics

# Monitor application performance
docker stats homsjogja-app
```

---

## 🎯 SUCCESS METRICS

### **Security Metrics**
- ✅ SSL certificate valid dan auto-renewal
- ✅ HTTP to HTTPS redirect working
- ✅ Security headers present
- ✅ CORS properly configured

### **Performance Metrics**
- ✅ HTTPS response time < 2 seconds
- ✅ WebSocket connection stable
- ✅ No mixed content warnings
- ✅ SSL handshake < 100ms

### **Functionality Metrics**
- ✅ All API endpoints accessible via HTTPS
- ✅ WebSocket real-time features working
- ✅ File uploads working via HTTPS
- ✅ Authentication working with HTTPS

---

## 📚 REFERENCES

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Laravel Trust Proxies](https://laravel.com/docs/10.x/requests#configuring-trusted-proxies)
- [Laravel Echo Server](https://github.com/tlaverdure/laravel-echo-server)
- [WebSocket Security](https://websocket.org/echo.html)
- [HTTPS Best Practices](https://developers.google.com/web/fundamentals/security/encrypt-in-transit)

---

**🎉 RESULT**: Sistem Property Management dengan HTTPS deployment yang aman, performant, dan scalable!
