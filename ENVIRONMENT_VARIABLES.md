# 🔧 Environment Variables Configuration - Property Management System

## 📋 Overview

Dokumen ini menjelaskan semua environment variables yang diperlukan untuk Property Management System, termasuk konfigurasi port dinamis dan Laravel Echo Server.

## 🚀 Dynamic Port Configuration

### ✅ PORT Variable (NEW)

**Fitur Baru**: Port mapping sekarang menggunakan environment variable `PORT` untuk konfigurasi dinamis.

```yaml
# docker-compose.yml
nginx:
  ports:
    - "${PORT:-3000}:80"  # Dynamic port mapping
```

**Cara Penggunaan:**

1. **Set PORT di Environment:**
   ```bash
   export PORT=3000
   docker-compose up -d
   ```

2. **Set PORT di .env file:**
   ```bash
   # .env
   PORT=3000
   ```

3. **Set PORT di Dokploy:**
   - Tambahkan variable `PORT` di Dokploy dashboard
   - Atau gunakan Dokploy auto-port assignment

4. **Default Value:**
   - Jika `PORT` tidak diset, akan menggunakan port `3000`
   - Format: `${PORT:-3000}`

### 🎯 Keuntungan Dynamic Port

1. **Fleksibilitas:**
   - Port dapat diubah tanpa edit docker-compose.yml
   - Mudah untuk testing dengan port berbeda
   - Dokploy dapat mengatur port otomatis

2. **Dokploy Integration:**
   - Dokploy dapat set PORT variable otomatis
   - Menghindari port conflict
   - Auto-scaling friendly

3. **Development:**
   - Developer dapat set port sesuai kebutuhan
   - Multiple environment support
   - Easy local development

## 🔌 Dynamic Laravel Echo Server Configuration

### ✅ Laravel Echo Server Listener

**Fitur Baru**: Laravel Echo Server configuration diupdate secara dinamis berdasarkan PORT environment variable.

```bash
# Script: docker/scripts/update-echo-config.sh
# Otomatis dijalankan saat startup untuk mengupdate konfigurasi
```

**Konfigurasi Dinamis:**
- **authHost**: `http://localhost:80` (internal port)
- **port**: `6002` (WebSocket port tetap)
- **host**: `127.0.0.1` (internal binding)
- **protocol**: `http`

**Keuntungan:**
1. **Internal Communication**: Echo Server tetap menggunakan port 80 internal
2. **External Access**: Nginx proxy ke port 6002 untuk WebSocket
3. **Dynamic Updates**: Konfigurasi diupdate otomatis saat startup
4. **No Port Conflicts**: WebSocket port 6002 terpisah dari HTTP port

### 🔧 Laravel Echo Server Scripts

**Update Script**: `docker/scripts/update-echo-config.sh`
- Mengupdate konfigurasi Echo Server secara dinamis
- Dipanggil otomatis saat startup
- Restart Echo Server jika sudah berjalan

**Startup Integration**: `docker/scripts/startup.sh`
- Memanggil update script saat startup
- Memastikan konfigurasi sesuai dengan PORT
- Logging untuk debugging

## 📋 Complete Environment Variables List

### 🔧 Application Configuration

```bash
# Required
APP_NAME=Homsjogja
APP_ENV=production
APP_KEY=your-app-key-here
APP_DEBUG=false
APP_URL=https://your-domain.com

# Optional (with defaults)
APP_LOCALE=id
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US
APP_MAINTENANCE_DRIVER=file
```

### 🌐 Port Configuration (NEW)

```bash
# Dynamic port for external access
PORT=3000  # Default: 3000, can be changed via environment
```

### 🗄️ Database Configuration

```bash
# Required
DB_CONNECTION=mysql
DB_HOST=your-db-host
DB_PORT=3306
DB_DATABASE=property_management
DB_USERNAME=your-db-username
DB_PASSWORD=your-db-password
```

### 🔴 Redis Configuration

```bash
# Required
REDIS_CLIENT=phpredis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_USERNAME=null
REDIS_PASSWORD=null
REDIS_URL=redis://your-redis-host:6379
```

### 📧 Mail Configuration

```bash
# Required
MAIL_MAILER=smtp
MAIL_SCHEME=tls
MAIL_HOST=your-mail-host
MAIL_PORT=587
MAIL_USERNAME=your-mail-username
MAIL_PASSWORD=your-mail-password
MAIL_FROM_ADDRESS=noreply@your-domain.com
MAIL_FROM_NAME="${APP_NAME}"
```

### 🔐 Session & Cache Configuration

```bash
# Optional (with defaults)
SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null
CACHE_DRIVER=file
CACHE_STORE=file
```

### 📡 Broadcasting Configuration

```bash
# Optional (with defaults)
BROADCAST_CONNECTION=log
QUEUE_CONNECTION=sync
```

### 📝 Logging Configuration

```bash
# Optional (with defaults)
LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug
```

### ⚙️ PHP Configuration

```bash
# Optional (with defaults)
PHP_CLI_SERVER_WORKERS=1
BCRYPT_ROUNDS=10
```

### ☁️ AWS Configuration (Optional)

```bash
# Optional
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your-s3-bucket
AWS_USE_PATH_STYLE_ENDPOINT=false
```

### 📁 File System Configuration

```bash
# Optional (with defaults)
FILESYSTEM_DISK=local
```

### 🎨 Vite Configuration

```bash
# Optional (with defaults)
VITE_APP_NAME="${APP_NAME}"
```

## 🚀 Deployment Scenarios

### 1. Local Development

```bash
# .env.local
APP_NAME=Homsjogja
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:3000
PORT=3000
DB_HOST=localhost
DB_DATABASE=property_management
DB_USERNAME=root
DB_PASSWORD=
REDIS_HOST=localhost
```

### 2. Dokploy Production

```bash
# Dokploy will inject these automatically:
APP_NAME=Homsjogja
APP_ENV=production
APP_KEY=auto-generated
APP_DEBUG=false
APP_URL=https://your-domain.com
PORT=auto-assigned
DB_HOST=dokploy-db-host
DB_DATABASE=property_management
DB_USERNAME=dokploy-user
DB_PASSWORD=dokploy-password
REDIS_HOST=dokploy-redis-host
```

### 3. Custom Port Configuration

```bash
# For specific port requirements
PORT=8080  # Custom port
APP_URL=http://localhost:8080
```

## 🔧 Docker Compose Usage

### 1. With Environment File

```bash
# Create .env file
cp .env.example .env
# Edit .env with your values

# Run with .env
docker-compose up -d
```

### 2. With Environment Variables

```bash
# Set variables directly
export PORT=3000
export APP_NAME=Homsjogja
export DB_HOST=localhost

# Run
docker-compose up -d
```

### 3. With Dokploy

```bash
# Dokploy will handle environment injection
# Just push to repository
git push origin main
```

## 🔍 Verification Commands

### 1. Check Port Mapping

```bash
# Check current port mapping
docker port homsjogja-nginx

# Expected output:
# 80/tcp -> 0.0.0.0:3000
```

### 2. Check Environment Variables

```bash
# Check environment in container
docker exec -it homsjogja-nginx env | grep PORT
docker exec -it homsjogja-nginx env | grep APP_URL
```

### 3. Test Application

```bash
# Test with current PORT
curl http://localhost:${PORT:-3000}/health

# Test internal port
docker exec -it homsjogja-nginx curl -f http://localhost:80/health
```

### 4. Test Laravel Echo Server

```bash
# Check Echo Server status
docker exec -it homsjogja-nginx supervisorctl status laravel-echo-server

# Test WebSocket connection
curl http://localhost:${PORT:-3000}/socket.io/

# Check Echo Server logs
docker exec -it homsjogja-nginx tail -f /var/log/laravel-echo-server.log
```

## 🛠️ Troubleshooting

### 1. Port Already in Use

```bash
# Check what's using the port
netstat -tlnp | grep :3000

# Change PORT variable
export PORT=3001
docker-compose down
docker-compose up -d
```

### 2. Environment Variables Not Set

```bash
# Check if variables are loaded
docker-compose config

# Check container environment
docker exec -it homsjogja-nginx printenv | grep PORT
```

### 3. APP_URL Mismatch

```bash
# Ensure APP_URL matches PORT
export PORT=3000
export APP_URL=http://localhost:3000

# Restart containers
docker-compose down
docker-compose up -d
```

### 4. Laravel Echo Server Issues

```bash
# Check Echo Server configuration
docker exec -it homsjogja-nginx cat /var/www/html/laravel-echo-server.dokploy.json

# Restart Echo Server
docker exec -it homsjogja-nginx supervisorctl restart laravel-echo-server

# Check Echo Server logs
docker exec -it homsjogja-nginx tail -f /var/log/laravel-echo-server.log

# Manual update Echo Server config
docker exec -it homsjogja-nginx /usr/local/bin/update-echo-config.sh
```

## 📊 Expected Results

### ✅ Success Indicators

- Port mapping menggunakan `${PORT:-3000}:80`
- APP_URL menggunakan `${PORT:-3000}` dalam URL
- Container dapat diakses via port yang diset di PORT
- Internal nginx tetap berjalan di port 80 (standar)
- Health check berfungsi di port internal 80
- Dokploy dapat mengatur proxy ke port external
- Laravel Echo Server berjalan di port 6002 internal
- WebSocket accessible via nginx proxy
- Echo Server configuration diupdate otomatis

### ❌ Error Indicators

- Error "port is already allocated"
- APP_URL tidak sesuai dengan PORT
- Container tidak bisa diakses via port external
- Health check gagal
- Environment variables tidak terbaca
- Laravel Echo Server tidak start
- WebSocket connection gagal
- Echo Server configuration tidak terupdate

## 🎯 Best Practices

### 1. Port Management

- ✅ Gunakan PORT variable untuk external port
- ✅ Tetap gunakan port 80 untuk internal
- ✅ Set default value `3000` untuk PORT
- ✅ Update APP_URL sesuai dengan PORT

### 2. Laravel Echo Server

- ✅ Echo Server tetap di port 6002 internal
- ✅ Nginx proxy ke port 6002 untuk WebSocket
- ✅ Konfigurasi diupdate otomatis saat startup
- ✅ Logs tersimpan di `/var/log/laravel-echo-server.log`

### 3. Environment Variables

- ✅ Gunakan .env file untuk local development
- ✅ Biarkan Dokploy handle production variables
- ✅ Set default values untuk optional variables
- ✅ Dokumentasikan semua required variables

### 4. Dokploy Integration

- ✅ Biarkan Dokploy inject database/redis variables
- ✅ Set PORT manual jika diperlukan
- ✅ Gunakan Dokploy auto-port assignment
- ✅ Test deployment dengan berbagai port

## 🔧 Scripts Reference

### 1. Startup Script
- **File**: `docker/scripts/startup.sh`
- **Purpose**: Main startup script
- **Features**: Environment setup, service waiting, database setup, Echo Server config update

### 2. Echo Server Config Script
- **File**: `docker/scripts/update-echo-config.sh`
- **Purpose**: Update Laravel Echo Server configuration
- **Features**: Dynamic config generation, Echo Server restart

### 3. Usage Examples

```bash
# Manual Echo Server config update
docker exec -it homsjogja-nginx /usr/local/bin/update-echo-config.sh

# Check startup script
docker exec -it homsjogja-nginx cat /usr/local/bin/startup.sh

# Check Echo Server config
docker exec -it homsjogja-nginx cat /var/www/html/laravel-echo-server.dokploy.json
```

---

**🎯 Kesimpulan**: Konfigurasi port dinamis telah diterapkan menggunakan environment variable `PORT`, termasuk Laravel Echo Server yang diupdate secara dinamis. Ini memberikan fleksibilitas maksimal untuk deployment di berbagai environment dan memudahkan integrasi dengan Dokploy. Port dapat diubah dengan mudah tanpa perlu edit file konfigurasi, dan Dokploy dapat mengatur port assignment otomatis. 