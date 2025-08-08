# Docker Deployment Volume Fix Guide

## 🚨 Issue Description

The Docker deployment is failing with the error:
```
Error response from daemon: failed to populate volume: error while mounting volume '/var/lib/docker/volumes/homsjogja-laravel-pl2z2a_mysql_data/_data': failed to mount local volume: mount /etc/dokploy/compose/homsjogja-laravel-pl2z2a/code/docker/volumes/mysql:/var/lib/docker/volumes/homsjogja-laravel-pl2z2a_mysql_data/_data, flags: 0x1000: no such file or directory
```

This occurs because the Docker Compose file uses bind mounts to local directories that don't exist.

## 🔧 Solution Options

### Option 1: Create Missing Directories (Quick Fix)

Run the provided script to create all required volume directories:

```bash
chmod +x fix-docker-volumes.sh
./fix-docker-volumes.sh
```

This will create:
- `docker/volumes/mysql`
- `docker/volumes/redis`
- `docker/volumes/nginx/logs`
- `docker/volumes/prometheus`
- `docker/volumes/grafana`
- `docker/volumes/postgres`

### Option 2: Use Production Docker Compose (Recommended)

Use the production-ready Docker Compose file that uses named volumes instead of bind mounts:

```bash
# Use the production configuration
docker-compose -f docker-compose.production.yml up -d --build
```

### Option 3: Manual Directory Creation

If you prefer to create directories manually:

```bash
# Create base volumes directory
mkdir -p docker/volumes

# Create all required subdirectories
mkdir -p docker/volumes/{mysql,redis,nginx/logs,prometheus,grafana,postgres}

# Set proper permissions
chmod 755 docker/volumes -R

# Set ownership (adjust as needed)
sudo chown -R 1000:1000 docker/volumes/
```

## 📋 Deployment Steps

### Step 1: Choose Your Approach

**For Development/Testing:**
```bash
# Use the volume fix script
./fix-docker-volumes.sh
docker-compose up -d --build
```

**For Production:**
```bash
# Use production configuration
docker-compose -f docker-compose.production.yml up -d --build
```

### Step 2: Verify Deployment

```bash
# Check container status
docker-compose ps

# Check logs for any errors
docker-compose logs app
docker-compose logs db
docker-compose logs redis
```

### Step 3: Initialize Application

```bash
# Run migrations
docker-compose exec app php artisan migrate

# Generate application key if needed
docker-compose exec app php artisan key:generate

# Clear caches
docker-compose exec app php artisan config:clear
docker-compose exec app php artisan cache:clear
```

## 🔍 Troubleshooting

### Volume Permission Issues

If you encounter permission issues:

```bash
# Fix ownership
sudo chown -R 1000:1000 docker/volumes/

# Or use current user
sudo chown -R $(id -u):$(id -g) docker/volumes/
```

### Container Startup Issues

```bash
# Check container logs
docker-compose logs [service_name]

# Restart specific service
docker-compose restart [service_name]

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Database Connection Issues

```bash
# Check database container
docker-compose exec db mysql -u root -p

# Test connection from app container
docker-compose exec app php artisan tinker
# Then run: DB::connection()->getPdo();
```

## 📊 Volume Management

### List Volumes
```bash
docker volume ls
```

### Backup Volumes
```bash
# Backup MySQL data
docker run --rm -v homsjogja-laravel-pl2z2a_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql_backup.tar.gz -C /data .

# Backup Redis data
docker run --rm -v homsjogja-laravel-pl2z2a_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz -C /data .
```

### Restore Volumes
```bash
# Restore MySQL data
docker run --rm -v homsjogja-laravel-pl2z2a_mysql_data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql_backup.tar.gz -C /data

# Restore Redis data
docker run --rm -v homsjogja-laravel-pl2z2a_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis_backup.tar.gz -C /data
```

## 🚀 Production Recommendations

1. **Use Named Volumes**: The `docker-compose.production.yml` file uses named volumes which are more reliable than bind mounts.

2. **Environment Variables**: Create a `.env` file with proper production values:
   ```env
   APP_ENV=production
   APP_DEBUG=false
   APP_KEY=your-application-key
   DB_PASSWORD=strong-password
   ```

3. **SSL Configuration**: Set up SSL certificates in `docker/ssl/` directory.

4. **Monitoring**: Enable monitoring profiles if needed:
   ```bash
   docker-compose --profile monitoring up -d
   ```

5. **Backup Strategy**: Implement regular volume backups for data persistence.

## 📝 File Structure After Fix

```
docker/
├── volumes/
│   ├── mysql/
│   ├── redis/
│   ├── nginx/
│   │   └── logs/
│   ├── prometheus/
│   ├── grafana/
│   └── postgres/
├── mysql/
├── nginx/
├── php/
├── redis/
└── supervisor/
```

## ✅ Success Indicators

- All containers start without volume errors
- Database connection successful
- Application accessible via web browser
- Queue workers running
- Scheduler container active
- Health checks passing

## 🔄 Next Steps

After successful deployment:

1. Set up your domain and SSL certificates
2. Configure email settings
3. Set up monitoring and logging
4. Implement backup strategies
5. Configure CI/CD pipelines

---

**Note**: This guide addresses the immediate volume mounting issue. For comprehensive deployment guidance, refer to the main `DOCKER_DEPLOYMENT_GUIDE.md` file.