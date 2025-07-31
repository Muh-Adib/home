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

### Docker Run Command
```bash
# Dokploy akan otomatis resolve ${{project.VARIABLE}} ke actual values
docker run -d \
  -e APP_URL=https://app.homsjogja.com \
  -e DB_HOST=homsjogja-db-xsjalx \
  -e REDIS_HOST=homsjogja-redis-qmihbb \
  <image_name>
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

### 2. Docker Container
```
Dokploy resolves variables
${{project.APP_URL}} → $APP_URL=https://app.homsjogja.com
${{project.DB_HOST}} → $DB_HOST=homsjogja-db-xsjalx
${{project.REDIS_HOST}} → $REDIS_HOST=homsjogja-redis-qmihbb
```

### 3. Bash Script
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

---

## 🎯 BEST PRACTICES

### 1. Dokploy Environment
- ✅ Gunakan `${{project.VARIABLE}}` di Dokploy configuration
- ✅ Dokploy akan otomatis resolve ke actual values
- ✅ Variables akan tersedia di container sebagai `$VARIABLE`

### 2. Bash Scripts
- ✅ Gunakan `$VARIABLE` di bash scripts
- ✅ Check if variable exists: `[ ! -z "$VARIABLE" ]`
- ✅ Provide default values jika variable tidak ada

### 3. Docker Commands
- ✅ Gunakan actual values di docker run commands
- ✅ Dokploy akan handle variable resolution otomatis
- ✅ Test dengan actual values untuk development

### 4. Documentation
- ✅ Dokumentasikan format yang benar untuk setiap context
- ✅ Berikan contoh yang jelas
- ✅ Jelaskan flow environment variables

---

## 📝 SUMMARY

| Context | Format | Example | Notes |
|---------|--------|---------|-------|
| Dokploy Config | `${{project.VARIABLE}}` | `${{project.APP_URL}}` | Dokploy akan resolve |
| Docker Run | `$VARIABLE=value` | `-e APP_URL=https://app.homsjogja.com` | Actual values |
| Bash Script | `$VARIABLE` | `echo $APP_URL` | Container environment |
| .env File | `VARIABLE=value` | `APP_URL=https://app.homsjogja.com` | Laravel config |

---

**📅 Last Updated**: 2025  
**🔄 Status**: Clarified & Fixed  
**👤 Maintained By**: Development Team 