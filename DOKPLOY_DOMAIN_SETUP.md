# 🌐 Dokploy Domain Setup dengan Traefik Labeling

## 🎯 Skenario Setup Domain di Dokploy

Untuk testing deployment dengan **random domain Traefik** sebelum menggunakan domain asli `homsjogja.com`.

---

## 🔧 **Metode 1: Random Domain Testing (Recommended untuk Testing)**

### Via Dokploy Interface - Domain Tab

1. **Buka Service Docker Compose Anda**
2. **Pilih tab "Domains"**
3. **Add Domain dengan setting berikut:**

```
Domain: random-test.traefik.local
Port: 80 (untuk aplikasi web)
Path: / (default)
```

### Konfigurasi Docker Compose untuk Random Domain:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: php-base
    restart: unless-stopped
    volumes:
      - app_storage:/var/www/html/storage
      - app_cache:/var/www/html/bootstrap/cache
    networks:
      - dokploy-network
    depends_on:
      db:
        condition: service_healthy
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
      - APP_URL=http://random-test.traefik.local  # Random domain untuk testing
      - DB_CONNECTION=mysql
      - DB_HOST=db
      - DB_PORT=3306
      - DB_DATABASE=${DB_DATABASE:-property_management}
      - DB_USERNAME=${DB_USERNAME:-pms_user}
      - DB_PASSWORD=${DB_PASSWORD:-secret}
    # TIDAK perlu labels manual - Dokploy akan inject otomatis
    ports:
      - "80"  # Internal port exposure

  db:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: ${DB_DATABASE:-property_management}
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-secret}
      MYSQL_USER: ${DB_USERNAME:-pms_user}
      MYSQL_PASSWORD: ${DB_PASSWORD:-secret}
      MYSQL_CHARACTER_SET_SERVER: utf8mb4
      MYSQL_COLLATION_SERVER: utf8mb4_unicode_ci
      MYSQL_RANDOM_ROOT_PASSWORD: "no"
      MYSQL_ONETIME_PASSWORD: "no"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - dokploy-network
    command: >
      --default-authentication-plugin=mysql_native_password
      --innodb-buffer-pool-size=128M
      --skip-name-resolve
      --max-connections=100
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_PASSWORD:-secret}"]
      interval: 30s
      timeout: 10s
      retries: 10
      start_period: 60s

networks:
  dokploy-network:
    external: true

volumes:
  mysql_data:
    driver: local
  app_storage:
    driver: local
  app_cache:
    driver: local
```

---

## 🌍 **Metode 2: Domain Asli homsjogja.com (Untuk Production)**

### Setup DNS terlebih dahulu:

```
Type: A Record
Name: app (atau subdomain yang diinginkan)
Value: [IP-SERVER-DOKPLOY]
TTL: 300 (5 menit)

Hasil: app.homsjogja.com → IP Server
```

### Via Dokploy Interface - Domain Tab:

```
Domain: app.homsjogja.com
Port: 80
Path: /
```

### Docker Compose untuk Production Domain:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: php-base
    restart: unless-stopped
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
      - APP_URL=https://app.homsjogja.com  # Domain asli dengan HTTPS
      - DB_CONNECTION=mysql
      - DB_HOST=db
      # ... environment lainnya
    networks:
      - dokploy-network
    depends_on:
      db:
        condition: service_healthy

  # ... services lainnya sama
```

---

## 🔄 **Metode 3: Hybrid - Manual Traefik Labels**

Jika Anda ingin kontrol penuh atas Traefik labels:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    networks:
      - dokploy-network
    environment:
      - APP_URL=http://test-pms.local  # Testing domain
    labels:
      # Manual Traefik configuration
      - "traefik.enable=true"
      - "traefik.http.routers.pms-test.rule=Host(`test-pms.local`)"
      - "traefik.http.routers.pms-test.entrypoints=web"
      - "traefik.http.services.pms-test.loadbalancer.server.port=80"
      # Untuk HTTPS (production):
      # - "traefik.http.routers.pms-prod.rule=Host(`app.homsjogja.com`)"
      # - "traefik.http.routers.pms-prod.entrypoints=websecure"
      # - "traefik.http.routers.pms-prod.tls.certResolver=letsencrypt"

  db:
    image: mysql:8.0
    # ... konfigurasi MySQL sama
    networks:
      - dokploy-network

networks:
  dokploy-network:
    external: true
```

---

## 🎯 **Workflow Deployment Testing → Production**

### Phase 1: Testing dengan Random Domain

1. **Setup di Dokploy:**
   ```
   Domain: test-pms.dokploy.local
   Port: 80
   ```

2. **Deploy & Test:**
   ```bash
   ./deploy-to-dokploy.sh
   ./health-check-dokploy.sh
   
   # Test access
   curl -H "Host: test-pms.dokploy.local" http://[SERVER-IP]
   ```

3. **Verify Functionality:**
   - Database connection works
   - Laravel routes accessible
   - No error logs

### Phase 2: Production dengan homsjogja.com

1. **Setup DNS:**
   ```bash
   # Tambahkan A record:
   app.homsjogja.com → [SERVER-IP]
   ```

2. **Update Domain di Dokploy:**
   ```
   Domain: app.homsjogja.com
   Port: 80
   HTTPS: Enable (Let's Encrypt)
   ```

3. **Update Environment:**
   ```env
   APP_URL=https://app.homsjogja.com
   APP_ENV=production
   ```

---

## 🔧 **Environment Variables untuk Setiap Phase**

### Testing Phase (.env):
```env
APP_NAME="Property Management System"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://test-pms.dokploy.local

# Database
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=property_management_test
DB_USERNAME=pms_user
DB_PASSWORD=secret

# Cache
CACHE_DRIVER=array
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
```

### Production Phase (.env):
```env
APP_NAME="Property Management System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.homsjogja.com

# Database
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=property_management
DB_USERNAME=pms_user
DB_PASSWORD=YourStrongPassword123

# Cache
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
REDIS_HOST=redis
```

---

## 📋 **Step-by-Step Deployment Testing**

### 1. Setup Testing Domain di Dokploy Interface

```bash
# Di Dokploy Dashboard:
1. Buka service Anda
2. Tab "Domains" → "Add Domain"
3. Domain: test-homsjogja.local
4. Port: 80
5. Path: /
6. Save
```

### 2. Deploy dengan Docker Compose Testing

```bash
# Gunakan docker-compose.dokploy.yml
cp docker-compose.dokploy.yml docker-compose.yml

# Set environment untuk testing
cp .env.dokploy.template .env
# Edit APP_URL=http://test-homsjogja.local

# Deploy
./deploy-to-dokploy.sh
```

### 3. Test Access

```bash
# Dari server Dokploy:
curl -H "Host: test-homsjogja.local" http://localhost

# Atau setup local hosts file untuk testing:
echo "[SERVER-IP] test-homsjogja.local" >> /etc/hosts
curl http://test-homsjogja.local
```

### 4. Verify Health

```bash
./health-check-dokploy.sh

# Check Traefik dashboard
# Akses: http://[SERVER-IP]:8080 (jika enabled)
```

### 5. Migrate to Production

```bash
# Update domain di Dokploy interface
# Domain: app.homsjogja.com
# Enable HTTPS

# Update environment
sed -i 's/test-homsjogja.local/app.homsjogja.com/g' .env
sed -i 's/http:/https:/g' .env
sed -i 's/APP_ENV=local/APP_ENV=production/g' .env

# Redeploy
./deploy-to-dokploy.sh
```

---

## 🔍 **Monitoring & Troubleshooting**

### Check Traefik Routing:

```bash
# Lihat routes yang active
docker exec traefik traefik version

# Check logs Traefik
docker logs traefik

# Verify container labels
docker inspect [container-name] | grep -A 10 Labels
```

### Common Issues & Solutions:

| Issue | Cause | Solution |
|-------|-------|----------|
| Domain not accessible | DNS not propagated | Wait atau use hosts file |
| SSL certificate error | Let's Encrypt failed | Check domain DNS |
| 404 error | Wrong port/path | Verify port in Dokploy |
| Container not reachable | Network issue | Check dokploy-network |

---

## 📝 **Recommended Testing Workflow**

```bash
# 1. Create Testing Deployment
./fix-mysql-deployment.sh

# 2. Set testing domain
# Via Dokploy interface: test-pms.local

# 3. Deploy and test
./deploy-to-dokploy.sh
./health-check-dokploy.sh

# 4. Verify all functionality
curl http://test-pms.local/health

# 5. Once stable, switch to production domain
# Update Dokploy interface: app.homsjogja.com
# Enable HTTPS

# 6. Final production deploy
./deploy-to-dokploy.sh
```

---

**🎯 Untuk testing Anda, gunakan random domain dulu (seperti `test-homsjogja.local`) melalui interface Dokploy, lalu setelah stabil baru switch ke domain asli `app.homsjogja.com` dengan HTTPS enabled.**

Apakah ada bagian spesifik dari setup domain ini yang perlu saya jelaskan lebih detail?