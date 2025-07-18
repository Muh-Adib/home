# 🚀 Dokploy Deployment Instructions - Property Management System

## 📋 Pre-Deployment Checklist

- [ ] Domain/subdomain ready (`homsjogja.yourdomain.com`, `ws.homsjogja.yourdomain.com`)
- [ ] Dokploy server accessible and configured
- [ ] GitHub repository connected to Dokploy
- [ ] SSL certificates configured (Let's Encrypt)
- [ ] DNS pointing to Dokploy server

## 🏗️ Service Architecture

```
🌐 Internet
    ↓
📡 Traefik (Reverse Proxy)
    ↓
┌─────────────────────────────────────────────────────────┐
│                    Dokploy Services                      │
├─────────────────┬─────────────────┬─────────────────────┤
│   MySQL DB      │   Redis Cache   │   Laravel App       │
│   (Service 1)   │   (Service 2)   │   (Service 3)       │
│                 │                 │   - Nginx           │
│                 │                 │   - PHP-FPM         │
│                 │                 │   - Queue Workers   │
└─────────────────┴─────────────────┴─────────────────────┤
                                    │   Socket.io Server  │
                                    │   (Service 4)       │
                                    └─────────────────────┘
```

## 🔧 Step 1: Create Services in Dokploy Dashboard

### A. Create MySQL Database Service

1. **Login to Dokploy Dashboard**
2. **Go to Services → Create Service → Database → MySQL**
3. **Configure Database:**
   ```
   Service Name: homsjogja-db
   Database Name: homsjogja_db
   Username: homsjogja_user
   Password: SecurePassword123!
   Root Password: RootPassword123!
   Version: 8.0
   ```
4. **Resources:**
   ```
   Memory: 512MB
   CPU: 0.5 cores
   ```
5. **Volume Mount:**
   ```
   Volume: mysql_data
   Mount Path: /var/lib/mysql
   ```
6. **Click Deploy**

### B. Create Redis Service

1. **Create Service → Database → Redis**
2. **Configure Redis:**
   ```
   Service Name: homsjogja-redis
   Password: RedisPassword123!
   Version: 7-alpine
   ```
3. **Resources:**
   ```
   Memory: 256MB
   CPU: 0.25 cores
   ```
4. **Volume Mount:**
   ```
   Volume: redis_data
   Mount Path: /data
   ```
5. **Command Override:**
   ```
   redis-server --requirepass RedisPassword123! --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
   ```
6. **Click Deploy**

### C. Create Laravel Application Service

1. **Create Service → Application**
2. **Configure Application:**
   ```
   Service Name: homsjogja-app
   Repository: your-github-repo-url
   Branch: main
   Build Pack: Dockerfile
   Dockerfile: Dockerfile.dokploy
   ```

3. **Environment Variables:**
   ```env
   APP_NAME=Homsjogja
   APP_ENV=production
   APP_DEBUG=false
   APP_KEY=base64:2KP58EicMQP7tFSYjfXVyeBYmvrRF+62NIErENjPfck=
   APP_URL=https://homsjogja.yourdomain.com
   APP_TIMEZONE=Asia/Jakarta
   
   DB_CONNECTION=mysql
   DB_HOST=homsjogja-db
   DB_PORT=3306
   DB_DATABASE=homsjogja_db
   DB_USERNAME=homsjogja_user
   DB_PASSWORD=SecurePassword123!
   
   REDIS_HOST=homsjogja-redis
   REDIS_PASSWORD=RedisPassword123!
   REDIS_PORT=6379
   REDIS_CLIENT=phpredis
   
   SESSION_DRIVER=redis
   CACHE_STORE=redis
   QUEUE_CONNECTION=redis
   BROADCAST_DRIVER=redis
   
   LOG_CHANNEL=stack
   LOG_LEVEL=error
   
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.mailtrap.io
   MAIL_PORT=2525
   MAIL_USERNAME=null
   MAIL_PASSWORD=null
   MAIL_FROM_ADDRESS=noreply@homsjogja.com
   MAIL_FROM_NAME=Homsjogja
   
   # Add all other variables from .env.dokploy
   ```

4. **Domain Configuration:**
   ```
   Domain: homsjogja.yourdomain.com
   SSL: Enable (Let's Encrypt)
   ```

5. **Traefik Labels:**
   ```
   traefik.enable=true
   traefik.http.routers.homsjogja-app.rule=Host(`homsjogja.yourdomain.com`)
   traefik.http.routers.homsjogja-app.entrypoints=websecure
   traefik.http.routers.homsjogja-app.tls.certresolver=letsencrypt
   traefik.http.services.homsjogja-app.loadbalancer.server.port=80
   ```

6. **Resources:**
   ```
   Memory: 1GB
   CPU: 1.0 cores
   ```

7. **Dependencies:**
   ```
   Depends On: homsjogja-db, homsjogja-redis
   ```

8. **Click Deploy**

### D. Create WebSocket Service

1. **Create Service → Application**
2. **Configure WebSocket Service:**
   ```
   Service Name: homsjogja-websocket
   Repository: your-github-repo-url
   Branch: main
   Build Pack: Dockerfile
   Dockerfile: Dockerfile.websocket
   ```

3. **Environment Variables:**
   ```env
   REDIS_HOST=homsjogja-redis
   REDIS_PASSWORD=RedisPassword123!
   AUTH_HOST=https://homsjogja.yourdomain.com
   ```

4. **Domain Configuration:**
   ```
   Domain: ws.homsjogja.yourdomain.com
   SSL: Enable (Let's Encrypt)
   ```

5. **Traefik Labels:**
   ```
   traefik.enable=true
   traefik.http.routers.homsjogja-ws.rule=Host(`ws.homsjogja.yourdomain.com`)
   traefik.http.routers.homsjogja-ws.entrypoints=websecure
   traefik.http.routers.homsjogja-ws.tls.certresolver=letsencrypt
   traefik.http.services.homsjogja-ws.loadbalancer.server.port=6001
   traefik.http.routers.homsjogja-ws.middlewares=websocket-headers
   traefik.http.middlewares.websocket-headers.headers.customrequestheaders.Connection=upgrade
   traefik.http.middlewares.websocket-headers.headers.customrequestheaders.Upgrade=websocket
   ```

6. **Resources:**
   ```
   Memory: 256MB
   CPU: 0.5 cores
   ```

7. **Dependencies:**
   ```
   Depends On: homsjogja-redis
   ```

8. **Click Deploy**

## 🔄 Step 2: Post-Deployment Configuration

### A. Database Setup

1. **Access Laravel App Container:**
   ```bash
   # Via Dokploy console or SSH
   docker exec -it homsjogja-app bash
   ```

2. **Run Migrations:**
   ```bash
   php artisan migrate --force
   ```

3. **Create Session Table:**
   ```bash
   php artisan session:table
   php artisan migrate --force
   ```

4. **Seed Database (Optional):**
   ```bash
   php artisan db:seed --force
   ```

### B. Cache Optimization

1. **Clear and Rebuild Cache:**
   ```bash
   php artisan optimize:clear
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   php artisan event:cache
   ```

2. **Verify Queue Workers:**
   ```bash
   supervisorctl status
   ```

### C. Storage Setup

1. **Create Storage Link:**
   ```bash
   php artisan storage:link
   ```

2. **Set Permissions:**
   ```bash
   chown -R www:www storage bootstrap/cache
   chmod -R 755 storage bootstrap/cache
   ```

## 🧪 Step 3: Testing Deployment

### A. Health Checks

1. **Test Main Application:**
   ```bash
   curl -I https://homsjogja.yourdomain.com/health
   ```

2. **Test WebSocket Service:**
   ```bash
   curl -I https://ws.homsjogja.yourdomain.com
   ```

3. **Test Database Connection:**
   ```bash
   docker exec homsjogja-app php artisan tinker --execute="DB::connection()->getPdo(); echo 'DB Connected';"
   ```

4. **Test Redis Connection:**
   ```bash
   docker exec homsjogja-app php artisan tinker --execute="Redis::ping(); echo 'Redis Connected';"
   ```

### B. WebSocket Testing

1. **Test in Browser Console:**
   ```javascript
   // Open browser console on your app
   // This should connect to WebSocket
   window.Echo.connector.socket.connected; // Should return true
   ```

2. **Test Real-time Notifications:**
   ```bash
   # In Laravel app container
   php artisan tinker
   
   # Test notification
   $user = App\Models\User::first();
   $user->notify(new App\Notifications\TestNotification());
   ```

## 🔄 Step 4: CI/CD Setup

### A. GitHub Secrets

Add these secrets to your GitHub repository:

```
DOKPLOY_SERVER_URL: https://your-dokploy-server.com
DOKPLOY_API_TOKEN: your-dokploy-api-token
```

### B. Auto-Deployment

The GitHub Actions workflow (`/.github/workflows/dokploy-deploy.yml`) will automatically:

1. **Build application** on every push to `main`
2. **Deploy services** in correct order
3. **Run migrations** and cache optimization
4. **Health checks** to verify deployment
5. **Notification** of deployment status

### C. Manual Deployment

You can also trigger deployment manually:

1. **Go to GitHub Actions**
2. **Select "Deploy to Dokploy" workflow**
3. **Click "Run workflow"**
4. **Choose deployment target:** all, app, websocket, or database

## 🎯 Step 5: Domain Configuration

### A. DNS Setup

Point your domains to Dokploy server:

```
A Record: homsjogja.yourdomain.com → YOUR_DOKPLOY_SERVER_IP
A Record: ws.homsjogja.yourdomain.com → YOUR_DOKPLOY_SERVER_IP
```

### B. SSL Certificate

Dokploy will automatically provision Let's Encrypt certificates for:
- `https://homsjogja.yourdomain.com`
- `https://ws.homsjogja.yourdomain.com`

## 🔍 Step 6: Monitoring & Maintenance

### A. Log Monitoring

```bash
# Application logs
docker logs -f homsjogja-app

# WebSocket logs
docker logs -f homsjogja-websocket

# Database logs
docker logs -f homsjogja-db

# Redis logs
docker logs -f homsjogja-redis
```

### B. Performance Monitoring

1. **Check Resource Usage:**
   ```bash
   docker stats homsjogja-app homsjogja-websocket homsjogja-db homsjogja-redis
   ```

2. **Monitor WebSocket Connections:**
   ```bash
   docker exec homsjogja-websocket netstat -an | grep :6001
   ```

3. **Monitor Queue Workers:**
   ```bash
   docker exec homsjogja-app supervisorctl status
   ```

### C. Backup Strategy

1. **Database Backup:**
   ```bash
   docker exec homsjogja-db mysqldump -u homsjogja_user -pSecurePassword123! homsjogja_db > backup.sql
   ```

2. **Redis Backup:**
   ```bash
   docker exec homsjogja-redis redis-cli --rdb /data/dump.rdb
   ```

3. **Application Files:**
   ```bash
   # Backup storage directory
   docker cp homsjogja-app:/var/www/html/storage ./storage-backup
   ```

## 🚨 Troubleshooting

### Common Issues:

1. **502 Error:**
   - Check Nginx buffer settings in `docker/nginx/dokploy.conf`
   - Verify PHP-FPM is running: `supervisorctl status php-fpm`

2. **WebSocket Connection Failed:**
   - Check domain `ws.homsjogja.yourdomain.com` resolves correctly
   - Verify Traefik labels for WebSocket headers
   - Check Redis connection in WebSocket container

3. **Database Connection Failed:**
   - Verify database service is running
   - Check environment variables match database credentials
   - Test connection: `docker exec homsjogja-app php artisan migrate:status`

4. **Queue Jobs Not Processing:**
   - Check queue workers: `supervisorctl status queue-worker`
   - Verify Redis connection for queues
   - Check Laravel logs: `docker exec homsjogja-app tail -f storage/logs/laravel.log`

### Emergency Commands:

```bash
# Restart all services
docker restart homsjogja-app homsjogja-websocket homsjogja-db homsjogja-redis

# Clear all cache
docker exec homsjogja-app php artisan optimize:clear

# Reset queue workers
docker exec homsjogja-app supervisorctl restart queue-worker:*

# Check service health
curl -f https://homsjogja.yourdomain.com/health
curl -f https://ws.homsjogja.yourdomain.com
```

## ✅ Deployment Success Checklist

- [ ] All 4 services deployed successfully
- [ ] Main app accessible at `https://homsjogja.yourdomain.com`
- [ ] WebSocket service accessible at `https://ws.homsjogja.yourdomain.com`
- [ ] Database migrations completed
- [ ] Session table created
- [ ] Redis cache working
- [ ] Queue workers running
- [ ] WebSocket real-time notifications working
- [ ] SSL certificates active
- [ ] Health checks passing
- [ ] CI/CD pipeline configured
- [ ] Monitoring setup complete

🎉 **Congratulations! Your Property Management System is now live on Dokploy with full separation of services and real-time WebSocket support!**