# 🔧 Perbaikan Konfigurasi Deployment - Property Management System

## 📋 Ringkasan Masalah

Error Nginx yang dilaporkan:
- `open() "/var/lib/nginx/html/50x.html" failed (2: No such file or directory)`
- `directory index of "/var/www/html/public/" is forbidden`

## 🎯 Root Cause Analysis

### 1. **Konfigurasi Docker Compose Tidak Sesuai**
- **Masalah**: `docker-compose.yml` menggunakan multiple containers terpisah (app, nginx, php-fpm, websocket)
- **Penyebab**: Dokploy deployment memerlukan single container dengan semua service di dalamnya
- **Solusi**: Mengubah ke single container deployment

### 2. **Port Mapping Tidak Konsisten**
- **Masalah**: Nginx di konfigurasi untuk port 80, tetapi aplikasi berjalan di port 8080
- **Penyebab**: Konfigurasi port tidak sesuai antara Nginx dan aplikasi
- **Solusi**: Menyeragamkan port mapping ke 8080

### 3. **Error Pages Tidak Ditemukan**
- **Masalah**: Nginx mencari error pages di path yang salah
- **Penyebab**: Konfigurasi error_page tidak sesuai dengan struktur file
- **Solusi**: Memperbaiki path error pages dan memastikan file ada

## 🛠️ Perbaikan yang Diterapkan

### ✅ 1. Docker Compose Configuration (`docker-compose.yml`)

**Sebelum (Multiple Containers):**
```yaml
services:
  app: # Laravel app
  nginx: # Separate Nginx
  php-fpm: # Separate PHP-FPM
  websocket: # Separate WebSocket
  queue: # Separate Queue
  scheduler: # Separate Scheduler
```

**Sesudah (Single Container):**
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dokploy
    container_name: homsjogja-app
    restart: unless-stopped
    ports:
      - "8080:8080"  # Main application port
      - "6002:6002"  # WebSocket port
    working_dir: /var/www/html
    volumes:
      - ./storage:/var/www/html/storage
      - ./bootstrap/cache:/var/www/html/bootstrap/cache
      - ./public:/var/www/html/public
    environment:
      - APP_NAME=${APP_NAME:-Laravel}
      - APP_ENV=${APP_ENV:-production}
      # ... semua environment variables dengan default values
    command: ["/usr/local/bin/startup.sh"]
```

### ✅ 2. Nginx Configuration (`docker/nginx/dokploy.conf`)

**Perbaikan yang Diterapkan:**

1. **Port Configuration:**
   ```nginx
   server {
       listen 8080;  # Konsisten dengan docker-compose
       server_name _;
       root /var/www/html/public;
       index index.php index.html;
   }
   ```

2. **Error Pages Configuration:**
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

3. **FastCGI Configuration:**
   ```nginx
   location ~ \.php$ {
       try_files $uri =404;
       fastcgi_split_path_info ^(.+\.php)(/.+)$;
       fastcgi_pass 127.0.0.1:9000;  # Menggunakan 127.0.0.1
       fastcgi_index index.php;
       fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
       include fastcgi_params;
   }
   ```

4. **WebSocket Configuration:**
   ```nginx
   location /socket.io/ {
       proxy_pass http://127.0.0.1:6002;  # Menggunakan 127.0.0.1
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       # ... proxy headers
   }
   ```

### ✅ 3. Supervisor Configuration (`docker/supervisor/dokploy.conf`)

**Memastikan Semua Service Berjalan dalam Single Container:**

1. **PHP-FPM:**
   ```ini
   [program:php-fpm]
   command=/usr/local/sbin/php-fpm --nodaemonize --force-stderr
   autostart=true
   autorestart=true
   priority=5
   ```

2. **Nginx:**
   ```ini
   [program:nginx]
   command=/usr/sbin/nginx -g "daemon off;"
   autostart=true
   autorestart=true
   priority=10
   ```

3. **Laravel Echo Server:**
   ```ini
   [program:laravel-echo-server]
   command=/usr/local/bin/laravel-echo-server start --config=/var/www/html/laravel-echo-server.dokploy.json --force --verbose
   autostart=true
   autorestart=true
   priority=15
   ```

4. **Queue Workers:**
   ```ini
   [program:queue-worker]
   command=php /var/www/html/artisan queue:work redis --sleep=3 --tries=3 --timeout=90
   numprocs=2
   autostart=true
   autorestart=true
   ```

5. **Scheduler:**
   ```ini
   [program:schedule]
   command=/bin/sh -c "while [ true ]; do (php /var/www/html/artisan schedule:run --verbose --no-interaction &); sleep 60; done"
   autostart=true
   autorestart=true
   ```

### ✅ 4. Custom Error Pages

**`public/404.html` - Error 40x:**
- Halaman error yang user-friendly
- Fitur search box untuk mencari properti
- Auto-refresh setelah 60 detik
- Menampilkan container info dan requested URL

**`public/50x.html` - Error 50x:**
- Halaman error server yang informatif
- Auto-refresh setelah 30 detik
- Menampilkan container info dan timestamp

## 🚀 Langkah Deployment

### 1. Build dan Run Container

```bash
# Build image
docker build -t homsjogja-app -f Dockerfile.dokploy .

# Run container dengan environment variables
docker run -d \
  --name homsjogja-app \
  -p 8080:8080 \
  -p 6002:6002 \
  -e APP_NAME="Homsjogja" \
  -e APP_ENV=production \
  -e APP_KEY=your-app-key \
  -e DB_HOST=your-db-host \
  -e DB_DATABASE=your-db-name \
  -e DB_USERNAME=your-db-user \
  -e DB_PASSWORD=your-db-password \
  -e REDIS_HOST=your-redis-host \
  homsjogja-app
```

### 2. Dokploy Configuration

**Environment Variables di Dokploy:**
```
APP_NAME=Homsjogja
APP_ENV=production
APP_KEY=your-app-key
APP_URL=https://your-domain.com
DB_HOST=your-db-host
DB_DATABASE=your-db-name
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password
REDIS_HOST=your-redis-host
```

**Port Mapping di Dokploy:**
- Main App: 8080:8080
- WebSocket: 6002:6002 (jika diperlukan)

### 3. Verifikasi Deployment

```bash
# Check container status
docker ps

# Check logs
docker logs homsjogja-app

# Test application
curl http://localhost:8080/health

# Test WebSocket
curl http://localhost:6002/

# Check supervisor status
docker exec -it homsjogja-app supervisorctl status
```

## 🔍 Troubleshooting

### 1. Jika Nginx Error Masih Muncul

```bash
# Masuk ke container
docker exec -it homsjogja-app bash

# Check Nginx config
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log

# Restart services
supervisorctl restart nginx
supervisorctl restart php-fpm
```

### 2. Jika Port Tidak Bisa Diakses

```bash
# Check port listening
netstat -tlnp | grep -E ":(8080|6002)"

# Check container logs
docker logs homsjogja-app

# Check supervisor status
docker exec -it homsjogja-app supervisorctl status
```

### 3. Jika Environment Variables Tidak Terbaca

```bash
# Check environment variables
docker exec -it homsjogja-app env | grep -E "(APP_|DB_|REDIS_)"

# Check .env file
docker exec -it homsjogja-app cat /var/www/html/.env
```

## 📊 Expected Results

Setelah menerapkan perbaikan ini:

### ✅ Positive Indicators
- Single container deployment berjalan dengan semua service
- Nginx berjalan di port 8080 tanpa error
- Custom error pages muncul untuk 404 dan 50x errors
- PHP-FPM, Nginx, WebSocket, Queue, Scheduler semua RUNNING
- Health check endpoint merespons `healthy`
- WebSocket berjalan di port 6002

### ❌ Negative Indicators (Masih Ada Masalah)
- Multiple container deployment
- Port mapping tidak konsisten
- Error pages tidak ditemukan
- Services tidak running di supervisor
- Environment variables tidak terbaca

## 📋 Checklist Verifikasi

- [ ] Single container deployment
- [ ] Port 8080 dan 6002 mapped dengan benar
- [ ] Environment variables terbaca dengan benar
- [ ] Nginx configuration test passes (`nginx -t`)
- [ ] All supervisor services RUNNING
- [ ] Application accessible at `http://localhost:8080/`
- [ ] Health check returns `healthy`
- [ ] WebSocket accessible at `http://localhost:6002/`
- [ ] Error pages working (test with non-existent URL)
- [ ] No more 50x.html or directory index errors

---

**🎯 Kesimpulan**: Perbaikan konfigurasi deployment telah diterapkan untuk mengatasi masalah Nginx dengan mengubah dari multiple containers ke single container deployment, memperbaiki port mapping, dan memastikan semua service berjalan dengan benar dalam satu container. 