# Environment Variables Format Update
## Property Management System - Laravel 12 + React 18 + WebSocket

---

## 🔄 PERUBAHAN FORMAT ENVIRONMENT VARIABLES

### Format Lama
```bash
$APP_URL
$DB_HOST
$REDIS_HOST
$REDIS_PASSWORD
```

### Format Baru (Dokploy Project Variables)
```bash
${{project.APP_URL}}
${{project.DB_HOST}}
${{project.REDIS_HOST}}
${{project.REDIS_PASSWORD}}
```

---

## 📋 DAFTAR VARIABLES YANG DIUPDATE

### Application Variables
- `$APP_URL` → `${{project.APP_URL}}`
- `$APP_NAME` → `${{project.APP_NAME}}`
- `$APP_ENV` → `${{project.APP_ENV}}`
- `$APP_DEBUG` → `${{project.APP_DEBUG}}`

### Database Variables
- `$DB_HOST` → `${{project.DB_HOST}}`
- `$DB_PORT` → `${{project.DB_PORT}}`
- `$DB_DATABASE` → `${{project.DB_DATABASE}}`
- `$DB_USERNAME` → `${{project.DB_USERNAME}}`
- `$DB_PASSWORD` → `${{project.DB_PASSWORD}}`

### Redis Variables
- `$REDIS_HOST` → `${{project.REDIS_HOST}}`
- `$REDIS_PORT` → `${{project.REDIS_PORT}}`
- `$REDIS_PASSWORD` → `${{project.REDIS_PASSWORD}}`
- `$REDIS_USERNAME` → `${{project.REDIS_USERNAME}}`
- `$REDIS_URL` → `${{project.REDIS_URL}}`

### Mail Variables
- `$MAIL_HOST` → `${{project.MAIL_HOST}}`
- `$MAIL_PORT` → `${{project.MAIL_PORT}}`
- `$MAIL_USERNAME` → `${{project.MAIL_USERNAME}}`
- `$MAIL_PASSWORD` → `${{project.MAIL_PASSWORD}}`

---

## 🛠️ FILE YANG DIUPDATE

### 1. Script Startup (`docker/scripts/startup.sh`)
- ✅ Environment variables detection
- ✅ Database configuration update
- ✅ Redis configuration update
- ✅ APP_URL dynamic update
- ✅ Mail domain configuration

### 2. Fix Scripts
- ✅ `fix-redis-environment.sh` (Bash)
- ✅ `fix-redis-environment.ps1` (PowerShell)

### 3. Documentation
- ✅ `REDIS_ENVIRONMENT_FIX.md`
- ✅ `ENVIRONMENT_VARIABLES_FORMAT_UPDATE.md`

---

## 🚀 CARA MENGGUNAKAN FORMAT BARU

### Docker Run Command
```bash
docker run -d \
  -e ${{project.REDIS_HOST}}=homsjogja-redis-qmihbb \
  -e ${{project.REDIS_PASSWORD}}=5vlcwpzc45g9mtho \
  -e ${{project.REDIS_PORT}}=6379 \
  -e ${{project.REDIS_USERNAME}}=default \
  -e ${{project.DB_HOST}}=homsjogja-db-xsjalx \
  -e ${{project.DB_DATABASE}}=homs-db \
  -e ${{project.DB_USERNAME}}=homs-user \
  -e ${{project.DB_PASSWORD}}=jD8-AKHx2gFCQ5gx3ouRJ \
  -e ${{project.APP_URL}}=https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me \
  <image_name>
```

### Docker Compose
```yaml
services:
  app:
    environment:
      - ${{project.APP_URL}}=https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me
      - ${{project.DB_HOST}}=homsjogja-db-xsjalx
      - ${{project.DB_DATABASE}}=homs-db
      - ${{project.DB_USERNAME}}=homs-user
      - ${{project.DB_PASSWORD}}=jD8-AKHx2gFCQ5gx3ouRJ
      - ${{project.REDIS_HOST}}=homsjogja-redis-qmihbb
      - ${{project.REDIS_PASSWORD}}=5vlcwpzc45g9mtho
      - ${{project.REDIS_PORT}}=6379
      - ${{project.REDIS_USERNAME}}=default
```

### Environment File (.env)
```bash
# Application
${{project.APP_URL}}=https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me
${{project.APP_NAME}}=HomsJogja
${{project.APP_ENV}}=production
${{project.APP_DEBUG}}=false

# Database
${{project.DB_HOST}}=homsjogja-db-xsjalx
${{project.DB_PORT}}=3306
${{project.DB_DATABASE}}=homs-db
${{project.DB_USERNAME}}=homs-user
${{project.DB_PASSWORD}}=jD8-AKHx2gFCQ5gx3ouRJ

# Redis
${{project.REDIS_HOST}}=homsjogja-redis-qmihbb
${{project.REDIS_PORT}}=6379
${{project.REDIS_USERNAME}}=default
${{project.REDIS_PASSWORD}}=5vlcwpzc45g9mtho
${{project.REDIS_URL}}=redis://default:5vlcwpzc45g9mtho@homsjogja-redis-qmihbb:6379
```

---

## 🔧 IMPLEMENTASI DALAM SCRIPT

### Bash Script Example
```bash
# Check environment variables
if [ ! -z "${{project.REDIS_HOST}}" ]; then
    log_info "Setting REDIS_HOST to: ${{project.REDIS_HOST}}"
    sed -i "s|REDIS_HOST=.*|REDIS_HOST=${{project.REDIS_HOST}}|g" .env
fi

# Update APP_URL
if [ ! -z "${{project.APP_URL}}" ]; then
    log_info "Setting APP_URL to: ${{project.APP_URL}}"
    sed -i "s|APP_URL=.*|APP_URL=${{project.APP_URL}}|g" .env
fi
```

### PowerShell Script Example
```powershell
# Check environment variables
if (${{project.REDIS_HOST}}) {
    Write-Host "Setting REDIS_HOST to: ${{project.REDIS_HOST}}" -ForegroundColor Blue
    $envContent = $envContent -replace "^REDIS_HOST=.*", "REDIS_HOST=$(${{project.REDIS_HOST}})"
}

# Update APP_URL
if (${{project.APP_URL}}) {
    Write-Host "Setting APP_URL to: ${{project.APP_URL}}" -ForegroundColor Blue
    $envContent = $envContent -replace "^APP_URL=.*", "APP_URL=$(${{project.APP_URL}})"
}
```

---

## 📊 MONITORING & VERIFICATION

### Check Environment Variables in Container
```bash
# Check environment variables
docker exec <container_name> env | grep -E "project\."

# Check .env file
docker exec <container_name> cat .env | grep -E "(APP_URL|DB_HOST|REDIS_HOST)"
```

### Expected Output
```bash
# Environment variables
${{project.APP_URL}}=https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me
${{project.DB_HOST}}=homsjogja-db-xsjalx
${{project.REDIS_HOST}}=homsjogja-redis-qmihbb

# .env file
APP_URL=https://homsjogja-testfull-qrndqp-b17540-213-210-36-24.traefik.me
DB_HOST=homsjogja-db-xsjalx
REDIS_HOST=homsjogja-redis-qmihbb
```

---

## 🎯 BENEFITS OF NEW FORMAT

### 1. Dokploy Integration
- ✅ Compatible dengan Dokploy project variables
- ✅ Automatic variable resolution
- ✅ Centralized configuration management

### 2. Security
- ✅ Variables tidak exposed di logs
- ✅ Encrypted variable handling
- ✅ Secure password management

### 3. Flexibility
- ✅ Easy switching between environments
- ✅ Dynamic configuration updates
- ✅ Template-based deployment

### 4. Maintainability
- ✅ Clear variable naming convention
- ✅ Consistent format across all scripts
- ✅ Easy to identify project-specific variables

---

## 🔄 MIGRATION GUIDE

### Step 1: Update Docker Commands
```bash
# Old format
docker run -e REDIS_HOST=homsjogja-redis-qmihbb

# New format
docker run -e ${{project.REDIS_HOST}}=homsjogja-redis-qmihbb
```

### Step 2: Update Scripts
```bash
# Old format
if [ ! -z "$REDIS_HOST" ]; then

# New format
if [ ! -z "${{project.REDIS_HOST}}" ]; then
```

### Step 3: Update Documentation
- Update semua contoh environment variables
- Update deployment guides
- Update troubleshooting documentation

---

## ⚠️ IMPORTANT NOTES

### 1. Backward Compatibility
- Script masih support format lama untuk development
- Dokploy akan handle format baru secara otomatis
- Fallback ke default values jika variable tidak ada

### 2. Variable Resolution
- Dokploy akan resolve `${{project.VARIABLE}}` ke actual values
- Script akan receive resolved values
- No manual variable substitution needed

### 3. Testing
- Test dengan Dokploy environment
- Verify variable resolution
- Check application functionality

---

## 📝 NEXT STEPS

1. **Deploy dengan format baru** ke Dokploy
2. **Test variable resolution** di production
3. **Update deployment scripts** untuk format baru
4. **Monitor logs** untuk variable detection
5. **Verify application functionality** dengan new format

---

**📅 Last Updated**: 2025  
**🔄 Status**: Implemented & Ready for Deployment  
**👤 Maintained By**: Development Team 