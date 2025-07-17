# 🎛️ Panduan Interface Dokploy untuk Domain Setup

## 🌐 Setting Domain dengan Traefik Labeling di Dokploy Interface

### Panduan lengkap untuk setup domain testing dan production menggunakan interface Dokploy.

---

## 🧪 **PHASE 1: Testing dengan Random Domain**

### Step 1: Buka Dokploy Dashboard

1. **Login ke Dokploy Dashboard**
   ```
   URL: http://[SERVER-IP]:3000
   atau: https://dokploy.your-domain.com
   ```

2. **Navigasi ke Project Anda**
   - Pilih project yang sudah dibuat
   - Atau buat project baru jika belum ada

### Step 2: Setup Docker Compose Service

1. **Create New Service**
   - Click "Create Service"
   - Pilih "Compose"
   - Service Type: "Docker Compose"

2. **General Configuration**
   ```
   Name: homsjogja-laravel-pms
   Description: Property Management System Testing
   ```

### Step 3: Git Source Configuration

1. **Repository Setup**
   ```
   Provider: GitHub/Git
   Repository: your-repository-url
   Branch: main
   ```

2. **Build Configuration**
   ```
   Compose Path: ./docker-compose.testing.yml
   Environment File: .env.testing
   ```

### Step 4: Domain Configuration (TESTING)

1. **Buka Tab "Domains"**
2. **Click "Add Domain"**
3. **Setup Testing Domain:**
   ```
   Domain: test-homsjogja.local
   Port: 80
   Path: /
   ```
4. **Click "Save"**

### Step 5: Environment Variables

1. **Buka Tab "Environment"**
2. **Add Variables:**
   ```
   APP_NAME=Property Management System - Testing
   APP_ENV=testing
   APP_DEBUG=true
   APP_KEY=[akan di-generate otomatis]
   APP_URL=http://test-homsjogja.local
   
   DB_CONNECTION=mysql
   DB_HOST=db
   DB_PORT=3306
   DB_DATABASE=property_management_test
   DB_USERNAME=pms_user
   DB_PASSWORD=testing_secret_123
   
   CACHE_DRIVER=array
   SESSION_DRIVER=file
   QUEUE_CONNECTION=sync
   ```

### Step 6: Deploy Testing

1. **Buka Tab "General"**
2. **Click "Deploy"**
3. **Monitor Deployment di Tab "Deployments"**

---

## 🌍 **PHASE 2: Production dengan homsjogja.com**

### Step 1: Setup DNS (Sebelum Production Deploy)

1. **Masuk ke DNS Management (Cloudflare/Domain Provider)**
2. **Tambahkan A Record:**
   ```
   Type: A
   Name: app (atau subdomain yang diinginkan)
   Content: [IP-SERVER-DOKPLOY]
   TTL: Auto atau 300 seconds
   ```
3. **Verifikasi DNS Propagation:**
   ```bash
   dig app.homsjogja.com
   nslookup app.homsjogja.com
   ```

### Step 2: Update Domain di Dokploy Interface

1. **Buka Tab "Domains"**
2. **Edit Domain yang sudah ada ATAU Add New Domain:**
   ```
   Domain: app.homsjogja.com
   Port: 80
   Path: /
   ```
3. **Enable HTTPS (Recommended untuk Production):**
   - ✅ Enable SSL/TLS
   - Certificate Provider: Let's Encrypt
4. **Click "Save"**

### Step 3: Update Environment untuk Production

1. **Buka Tab "Environment"**
2. **Update Variables:**
   ```
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://app.homsjogja.com
   
   DB_DATABASE=property_management
   DB_PASSWORD=[password-yang-kuat]
   
   CACHE_DRIVER=redis
   SESSION_DRIVER=redis
   QUEUE_CONNECTION=redis
   ```

### Step 4: Deploy Production

1. **Buka Tab "General"**
2. **Click "Deploy"**
3. **Monitor di Tab "Deployments"**

---

## 🔧 **Advanced: Manual Traefik Labels (Opsional)**

Jika Anda ingin kontrol penuh, bisa menggunakan labels manual di docker-compose:

### Untuk Testing:
```yaml
services:
  app:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pms-test.rule=Host(`test-homsjogja.local`)"
      - "traefik.http.routers.pms-test.entrypoints=web"
      - "traefik.http.services.pms-test.loadbalancer.server.port=80"
```

### Untuk Production:
```yaml
services:
  app:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pms-prod.rule=Host(`app.homsjogja.com`)"
      - "traefik.http.routers.pms-prod.entrypoints=websecure"
      - "traefik.http.routers.pms-prod.tls.certResolver=letsencrypt"
      - "traefik.http.services.pms-prod.loadbalancer.server.port=80"
```

---

## 📊 **Monitoring Interface Dokploy**

### Tab Monitoring

1. **Container Metrics:**
   - CPU Usage per service
   - Memory Usage per service
   - Network I/O
   - Storage Usage

2. **Real-time Data:**
   - Akses melalui Tab "Monitoring"
   - Grafik real-time CPU/Memory
   - Network traffic monitoring

### Tab Logs

1. **Service Logs:**
   - Pilih service (app, db, redis, dll)
   - Real-time log streaming
   - Log filtering dan search

2. **Deployment Logs:**
   - Tab "Deployments"
   - Detail build process
   - Error troubleshooting

---

## 🔍 **Troubleshooting via Interface**

### 1. Domain Tidak Accessible

**Check di Interface:**
- Tab "Domains" → Verify domain sudah benar
- Tab "Monitoring" → Check container status
- Tab "Logs" → Check Traefik errors

**Common Issues:**
```
DNS not propagated → Wait 5-15 minutes
Wrong port mapping → Check port 80/443
Container not running → Check container health
```

### 2. SSL Certificate Issues

**Check di Interface:**
- Tab "Domains" → Verify HTTPS enabled
- Tab "Logs" → Check Let's Encrypt errors

**Solutions:**
```
Domain DNS must be pointing to server
Wait 2-5 minutes for certificate generation
Check domain is accessible via HTTP first
```

### 3. Application Errors

**Check di Interface:**
- Tab "Logs" → Select "app" service
- Tab "Monitoring" → Check resource usage
- Tab "Environment" → Verify variables

---

## 📋 **Checklist Setup Domain**

### ✅ Testing Phase:
- [ ] Service dibuat dengan docker-compose.testing.yml
- [ ] Domain testing setup: test-homsjogja.local
- [ ] Environment variables untuk testing
- [ ] Deploy berhasil tanpa error
- [ ] Container status healthy
- [ ] Database connection works
- [ ] Application accessible via testing domain

### ✅ Production Phase:
- [ ] DNS A record dibuat: app.homsjogja.com
- [ ] Domain production setup di interface
- [ ] HTTPS enabled dengan Let's Encrypt
- [ ] Environment variables untuk production
- [ ] Deploy berhasil tanpa error
- [ ] SSL certificate aktif
- [ ] Application accessible via production domain
- [ ] Performance monitoring aktif

---

## 🎯 **Workflow Recommended**

### Testing → Production Migration:

```bash
# 1. Setup Testing
./deploy-testing-dokploy.sh

# 2. Verify Testing
./test-deployment.sh

# 3. Setup DNS untuk Production
# (Manual: Add A record di DNS provider)

# 4. Update Domain di Dokploy Interface
# Domain: app.homsjogja.com
# Enable HTTPS

# 5. Deploy Production
./deploy-to-dokploy.sh

# 6. Verify Production
./health-check-dokploy.sh
```

---

## 📱 **Mobile/Desktop Interface Tips**

### Navigation Shortcuts:
- **Quick Deploy:** General Tab → Deploy Button
- **Quick Logs:** Logs Tab → Select Service
- **Quick Domain:** Domains Tab → Add/Edit
- **Quick Monitor:** Monitoring Tab → Service Metrics

### Keyboard Shortcuts:
```
Ctrl + D = Deploy
Ctrl + L = Open Logs
Ctrl + M = Open Monitoring
Ctrl + E = Open Environment
```

---

## 🔄 **Auto-Deploy Setup**

### Via Interface:
1. **Tab "General"**
2. **Auto Deploy Settings:**
   ```
   ✅ Enable Auto Deploy
   Branch: main
   Webhook URL: [auto-generated]
   ```
3. **Add Webhook di Repository:**
   - GitHub: Settings → Webhooks
   - GitLab: Settings → Integrations
   - Paste webhook URL

---

**🎯 SUMMARY:** 

Untuk deployment optimal di Dokploy:
1. **Testing**: Gunakan random domain (test-homsjogja.local) via interface
2. **Production**: Setup DNS dulu, lalu update domain ke app.homsjogja.com
3. **Monitoring**: Gunakan built-in monitoring untuk troubleshooting
4. **Auto-Deploy**: Setup webhook untuk deployment otomatis

Interface Dokploy menyediakan semua tools yang diperlukan untuk management deployment yang efisien!