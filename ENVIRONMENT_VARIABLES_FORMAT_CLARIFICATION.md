# Environment Variables Format Clarification
## Property Management System - Laravel 12 + React 18 + WebSocket

---

## 🔍 PERBEDAAN FORMAT ENVIRONMENT VARIABLES

### 1. Dokploy Project Variables (Dokploy Environment)
Format `${{project.VARIABLE}}` hanya bisa digunakan di **Dokploy environment**, bukan di bash script.

```bash
# ✅ BENAR - Di Dokploy environment
${{project.APP_URL}}
${{project.DB_HOST}}
${{project.REDIS_HOST}}

# ❌ SALAH - Di bash script (akan error)
${{project.APP_URL}}  # Error: bad substitution
```

### 2. Bash Script Variables (Container Environment)
Format `$VARIABLE` digunakan di **bash script** dan **container environment**.

```bash
# ✅ BENAR - Di bash script
$APP_URL
$DB_HOST
$REDIS_HOST

# ✅ BENAR - Di container environment
echo $APP_URL
echo $DB_HOST
```

---

## 🛠️ IMPLEMENTASI YANG BENAR

### Dokploy Configuration (dokploy.json)
```json
{
  "environment": {
    "APP_URL": "https://app.homsjogja.com",
    "DB_HOST": "homsjogja-db-xsjalx",
    "REDIS_HOST": "homsjogja-redis-qmihbb"
  }
}
```

### Dockerfile Build Arguments
```dockerfile
# Set build arguments for Dokploy
ARG APP_URL
ARG DB_HOST
ARG DB_DATABASE
ARG DB_USERNAME
ARG DB_PASSWORD
ARG REDIS_HOST
ARG REDIS_PASSWORD
ARG REDIS_PORT
ARG REDIS_USERNAME

# Set environment variables for build
ENV APP_URL=$APP_URL
ENV DB_HOST=$DB_HOST
ENV DB_DATABASE=$DB_DATABASE
ENV DB_USERNAME=$DB_USERNAME
ENV DB_PASSWORD=$DB_PASSWORD
ENV REDIS_HOST=$REDIS_HOST
ENV REDIS_PASSWORD=$REDIS_PASSWORD
ENV REDIS_PORT=$REDIS_PORT
ENV REDIS_USERNAME=$REDIS_USERNAME
```

### Docker Build Command
```bash
# Build dengan build arguments
docker build \
  --build-arg APP_URL="https://app.homsjogja.com" \
  --build-arg DB_HOST="homsjogja-db-xsjalx" \
  --build-arg DB_DATABASE="homs-db" \
  --build-arg DB_USERNAME="homs-user" \
  --build-arg DB_PASSWORD="jD8-AKHx2gFCQ5gx3ouRJ" \
  --build-arg REDIS_HOST="homsjogja-redis-qmihbb" \
  --build-arg REDIS_PASSWORD="5vlcwpzc45g9mtho" \
  --build-arg REDIS_PORT="6379" \
  --build-arg REDIS_USERNAME="default" \
  -f Dockerfile.dokploy \
  -t homsjogja:latest \
  .
```

### Docker Run Command
```bash
# Run container dengan environment variables
docker run -d \
  --name homsjogja-app \
  -p 8080:8080 \
  -p 6002:6002 \
  -e APP_URL="https://app.homsjogja.com" \
  -e DB_HOST="homsjogja-db-xsjalx" \
  -e DB_DATABASE="homs-db" \
  -e DB_USERNAME="homs-user" \
  -e DB_PASSWORD="jD8-AKHx2gFCQ5gx3ouRJ" \
  -e REDIS_HOST="homsjogja-redis-qmihbb" \
  -e REDIS_PASSWORD="5vlcwpzc45g9mtho" \
  -e REDIS_PORT="6379" \
  -e REDIS_USERNAME="default" \
  -e APP_ENV="production" \
  -e APP_DEBUG="false" \
  -e CACHE_DRIVER="redis" \
  -e SESSION_DRIVER="redis" \
  -e QUEUE_CONNECTION="redis" \
  -e BROADCAST_CONNECTION="redis" \
  homsjogja:latest
```

### Bash Script (startup.sh)
```bash
# ✅ BENAR - Menggunakan $VARIABLE di bash script
log_info "APP_URL: $APP_URL"
log_info "DB_HOST: $DB_HOST"
log_info "REDIS_HOST: $REDIS_HOST"

# ❌ SALAH - Tidak bisa menggunakan ${{project.VARIABLE}} di bash script
log_info "APP_URL: ${{project.APP_URL}}"  # Error: bad substitution
```

---

## 🔄 FLOW ENVIRONMENT VARIABLES

### 1. Dokploy Environment
```
Dokploy Project Variables
${{project.APP_URL}} → https://app.homsjogja.com
${{project.DB_HOST}} → homsjogja-db-xsjalx
${{project.REDIS_HOST}} → homsjogja-redis-qmihbb
```

### 2. Docker Build
```
Build Arguments
--build-arg APP_URL=value → ARG APP_URL → ENV APP_URL=value
--build-arg DB_HOST=value → ARG DB_HOST → ENV DB_HOST=value
--build-arg REDIS_HOST=value → ARG REDIS_HOST → ENV REDIS_HOST=value
```

### 3. Docker Container
```
Runtime Environment Variables
-e APP_URL=value → $APP_URL=value
-e DB_HOST=value → $DB_HOST=value
-e REDIS_HOST=value → $REDIS_HOST=value
```

### 4. Bash Script
```
Container environment variables
$APP_URL → https://app.homsjogja.com
$DB_HOST → homsjogja-db-xsjalx
$REDIS_HOST → homsjogja-redis-qmihbb
```

---

## 📋 CONFIGURATION EXAMPLES

### Dokploy Configuration
```json
{
  "name": "homsjogja",
  "environment": {
    "APP_URL": "https://app.homsjogja.com",
    "DB_HOST": "homsjogja-db-xsjalx",
    "DB_DATABASE": "homs-db",
    "DB_USERNAME": "homs-user",
    "DB_PASSWORD": "jD8-AKHx2gFCQ5gx3ouRJ",
    "REDIS_HOST": "homsjogja-redis-qmihbb",
    "REDIS_PASSWORD": "5vlcwpzc45g9mtho",
    "REDIS_PORT": "6379",
    "REDIS_USERNAME": "default"
  }
}
```

### Docker Compose (Local Development)
```yaml
services:
  app:
    environment:
      - APP_URL=http://localhost:8080
      - DB_HOST=127.0.0.1
      - DB_DATABASE=property_management
      - DB_USERNAME=root
      - DB_PASSWORD=
      - REDIS_HOST=127.0.0.1
      - REDIS_PORT=6379
      - REDIS_PASSWORD=null
```

### Bash Script (startup.sh)
```bash
# Environment variables detection
log_info "APP_URL: $APP_URL"
log_info "DB_HOST: $DB_HOST"
log_info "REDIS_HOST: $REDIS_HOST"

# Update .env file
if [ ! -z "$APP_URL" ]; then
    sed -i "s|APP_URL=.*|APP_URL=$APP_URL|g" .env
fi

if [ ! -z "$DB_HOST" ]; then
    sed -i "s|DB_HOST=.*|DB_HOST=$DB_HOST|g" .env
fi

if [ ! -z "$REDIS_HOST" ]; then
    sed -i "s|REDIS_HOST=.*|REDIS_HOST=$REDIS_HOST|g" .env
fi
```

---

## 🚀 QUICK DEPLOYMENT SCRIPTS

### Bash Script (run-dokploy-with-env.sh)
```bash
#!/bin/bash
# Environment Variables Configuration
APP_URL="https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me"
DB_HOST="homsjogja-db-xsjalx"
DB_DATABASE="homs-db"
DB_USERNAME="homs-user"
DB_PASSWORD="jD8-AKHx2gFCQ5gx3ouRJ"
REDIS_HOST="homsjogja-redis-qmihbb"
REDIS_PASSWORD="5vlcwpzc45g9mtho"
REDIS_PORT="6379"
REDIS_USERNAME="default"

# Build image with build arguments
docker build \
  --build-arg APP_URL="$APP_URL" \
  --build-arg DB_HOST="$DB_HOST" \
  --build-arg DB_DATABASE="$DB_DATABASE" \
  --build-arg DB_USERNAME="$DB_USERNAME" \
  --build-arg DB_PASSWORD="$DB_PASSWORD" \
  --build-arg REDIS_HOST="$REDIS_HOST" \
  --build-arg REDIS_PASSWORD="$REDIS_PASSWORD" \
  --build-arg REDIS_PORT="$REDIS_PORT" \
  --build-arg REDIS_USERNAME="$REDIS_USERNAME" \
  -f Dockerfile.dokploy \
  -t homsjogja:latest \
  .

# Run container with environment variables
docker run -d \
  --name homsjogja-app \
  -p 8080:8080 \
  -p 6002:6002 \
  -e APP_URL="$APP_URL" \
  -e DB_HOST="$DB_HOST" \
  -e DB_DATABASE="$DB_DATABASE" \
  -e DB_USERNAME="$DB_USERNAME" \
  -e DB_PASSWORD="$DB_PASSWORD" \
  -e REDIS_HOST="$REDIS_HOST" \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  -e REDIS_PORT="$REDIS_PORT" \
  -e REDIS_USERNAME="$REDIS_USERNAME" \
  -e APP_ENV="production" \
  -e APP_DEBUG="false" \
  -e CACHE_DRIVER="redis" \
  -e SESSION_DRIVER="redis" \
  -e QUEUE_CONNECTION="redis" \
  -e BROADCAST_CONNECTION="redis" \
  homsjogja:latest
```

### PowerShell Script (run-dokploy-with-env.ps1)
```powershell
# Environment Variables Configuration
$APP_URL = "https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me"
$DB_HOST = "homsjogja-db-xsjalx"
$DB_DATABASE = "homs-db"
$DB_USERNAME = "homs-user"
$DB_PASSWORD = "jD8-AKHx2gFCQ5gx3ouRJ"
$REDIS_HOST = "homsjogja-redis-qmihbb"
$REDIS_PASSWORD = "5vlcwpzc45g9mtho"
$REDIS_PORT = "6379"
$REDIS_USERNAME = "default"

# Build image with build arguments
$buildArgs = @(
    "--build-arg", "APP_URL=$APP_URL",
    "--build-arg", "DB_HOST=$DB_HOST",
    "--build-arg", "DB_DATABASE=$DB_DATABASE",
    "--build-arg", "DB_USERNAME=$DB_USERNAME",
    "--build-arg", "DB_PASSWORD=$DB_PASSWORD",
    "--build-arg", "REDIS_HOST=$REDIS_HOST",
    "--build-arg", "REDIS_PASSWORD=$REDIS_PASSWORD",
    "--build-arg", "REDIS_PORT=$REDIS_PORT",
    "--build-arg", "REDIS_USERNAME=$REDIS_USERNAME",
    "-f", "Dockerfile.dokploy",
    "-t", "homsjogja:latest",
    "."
)

docker build $buildArgs

# Run container with environment variables
$runArgs = @(
    "run", "-d",
    "--name", "homsjogja-app",
    "-p", "8080:8080",
    "-p", "6002:6002",
    "-e", "APP_URL=$APP_URL",
    "-e", "DB_HOST=$DB_HOST",
    "-e", "DB_DATABASE=$DB_DATABASE",
    "-e", "DB_USERNAME=$DB_USERNAME",
    "-e", "DB_PASSWORD=$DB_PASSWORD",
    "-e", "REDIS_HOST=$REDIS_HOST",
    "-e", "REDIS_PASSWORD=$REDIS_PASSWORD",
    "-e", "REDIS_PORT=$REDIS_PORT",
    "-e", "REDIS_USERNAME=$REDIS_USERNAME",
    "-e", "APP_ENV=production",
    "-e", "APP_DEBUG=false",
    "-e", "CACHE_DRIVER=redis",
    "-e", "SESSION_DRIVER=redis",
    "-e", "QUEUE_CONNECTION=redis",
    "-e", "BROADCAST_CONNECTION=redis",
    "homsjogja:latest"
)

docker $runArgs
```

---

## ⚠️ COMMON ERRORS & SOLUTIONS

### Error: "bad substitution"
```bash
# ❌ SALAH
log_info "APP_URL: ${{project.APP_URL}}"

# ✅ BENAR
log_info "APP_URL: $APP_URL"
```

### Error: Variable not found
```bash
# ❌ SALAH - Variable tidak ada di container
echo ${{project.APP_URL}}

# ✅ BENAR - Variable ada di container
echo $APP_URL
```

### Error: Environment not set
```bash
# ❌ SALAH - Dokploy variables tidak ter-resolve
docker run -e ${{project.APP_URL}}=value

# ✅ BENAR - Dokploy akan resolve otomatis
docker run -e APP_URL=https://app.homsjogja.com
```

### Error: Build arguments not passed
```bash
# ❌ SALAH - Build tanpa arguments
docker build -f Dockerfile.dokploy -t image:latest .

# ✅ BENAR - Build dengan arguments
docker build \
  --build-arg APP_URL="https://app.homsjogja.com" \
  --build-arg DB_HOST="homsjogja-db-xsjalx" \
  -f Dockerfile.dokploy \
  -t image:latest \
  .
```

---

## 🎯 BEST PRACTICES

### 1. Dokploy Environment
- ✅ Gunakan `${{project.VARIABLE}}` di Dokploy configuration
- ✅ Dokploy akan otomatis resolve ke actual values
- ✅ Variables akan tersedia di container sebagai `$VARIABLE`

### 2. Docker Build
- ✅ Gunakan `--build-arg` untuk build time variables
- ✅ Set `ARG` dan `ENV` di Dockerfile
- ✅ Pass semua required variables saat build

### 3. Docker Run
- ✅ Gunakan `-e` untuk runtime environment variables
- ✅ Pass semua required variables saat run
- ✅ Set production environment variables

### 4. Bash Scripts
- ✅ Gunakan `$VARIABLE` di bash scripts
- ✅ Check if variable exists: `[ ! -z "$VARIABLE" ]`
- ✅ Provide default values jika variable tidak ada

### 5. Docker Commands
- ✅ Gunakan actual values di docker run commands
- ✅ Dokploy akan handle variable resolution otomatis
- ✅ Test dengan actual values untuk development

### 6. Documentation
- ✅ Dokumentasikan format yang benar untuk setiap context
- ✅ Berikan contoh yang jelas
- ✅ Jelaskan flow environment variables

---

## 📝 SUMMARY

| Context | Format | Example | Notes |
|---------|--------|---------|-------|
| Dokploy Config | `${{project.VARIABLE}}` | `${{project.APP_URL}}` | Dokploy akan resolve |
| Docker Build | `--build-arg VARIABLE=value` | `--build-arg APP_URL=https://app.homsjogja.com` | Build time variables |
| Docker Run | `-e VARIABLE=value` | `-e APP_URL=https://app.homsjogja.com` | Runtime variables |
| Bash Script | `$VARIABLE` | `echo $APP_URL` | Container environment |
| .env File | `VARIABLE=value` | `APP_URL=https://app.homsjogja.com` | Laravel config |

---

**📅 Last Updated**: 2025  
**🔄 Status**: Clarified & Fixed  
**👤 Maintained By**: Development Team 