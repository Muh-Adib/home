# Docker Setup for Property Management System

## Overview

This project uses Docker for containerized deployment with the following services:

- **Laravel Application** (PHP 8.2)
- **MySQL Database** (8.0)
- **Redis** (7-alpine) for caching and sessions
- **Nginx** (alpine) for web server
- **MailHog** for email testing
- **Queue Workers** for background jobs
- **Scheduler** for cron jobs
- **Optional**: Monitoring (Prometheus + Grafana), WebSockets (Laravel Echo)

## Quick Start

### 1. Prerequisites

- Docker Desktop installed and running
- Git (to clone the repository)

### 2. Clone and Setup

```bash
git clone <repository-url>
cd property-management-system
```

### 3. Environment Configuration

Copy the environment file and configure it:

```bash
cp .env.example .env
# Edit .env file with your configuration
```

### 4. Deploy with Script

Use the deployment script for easy setup:

```bash
# Make script executable
chmod +x docker-deploy.sh

# Development environment
./docker-deploy.sh development up

# Production environment
./docker-deploy.sh production up

# With monitoring
./docker-deploy.sh monitoring up
```

### 5. Manual Docker Commands

If you prefer manual commands:

```bash
# Build and start services
docker-compose up -d

# Build with no cache
docker-compose build --no-cache

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Service Details

### Core Services

#### Laravel Application (`app`)
- **Port**: 8000 (development), 80 (production via nginx)
- **Environment**: Production/Development
- **Health Check**: PHP artisan commands
- **Dependencies**: Database, Redis

#### MySQL Database (`db`)
- **Port**: 3306
- **Database**: property_management
- **User**: pms_user
- **Password**: secret (configurable via .env)
- **Health Check**: MySQL ping
- **Optimizations**: InnoDB buffer pool, native password auth

#### Redis (`redis`)
- **Port**: 6379
- **Purpose**: Cache, sessions, queues
- **Health Check**: Redis ping
- **Configuration**: Custom redis.conf

#### Nginx (`nginx`)
- **Port**: 80, 443
- **Purpose**: Web server (production only)
- **SSL**: Configurable via docker/ssl/
- **Health Check**: HTTP endpoint check

#### Queue Worker (`queue`)
- **Purpose**: Process background jobs
- **Command**: `php artisan queue:work`
- **Health Check**: Queue work test
- **Settings**: Sleep 3s, 3 retries, 90s timeout

#### Scheduler (`scheduler`)
- **Purpose**: Laravel cron jobs
- **Command**: `php artisan schedule:run`
- **Interval**: Every 60 seconds
- **Health Check**: PHP artisan version

#### MailHog (`mailhog`)
- **Ports**: 1025 (SMTP), 8025 (Web UI)
- **Purpose**: Email testing and debugging
- **Health Check**: HTTP endpoint

### Optional Services

#### Development Tools
- **phpMyAdmin**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

#### Monitoring (Production)
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000

#### WebSockets
- **Laravel Echo Server**: Port 6001

## Environment Variables

### Required Variables
```bash
APP_KEY=base64:your-app-key-here
DB_PASSWORD=your-database-password
```

### Optional Variables
```bash
APP_ENV=production
APP_DEBUG=false
APP_URL=http://localhost
DB_DATABASE=property_management
DB_USERNAME=pms_user
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

## Volume Management

### Persistent Data
- **MySQL Data**: `./docker/volumes/mysql`
- **Redis Data**: `./docker/volumes/redis`
- **Nginx Logs**: `./docker/volumes/nginx/logs`
- **Prometheus Data**: `./docker/volumes/prometheus`
- **Grafana Data**: `./docker/volumes/grafana`

### Application Volumes
- **Storage**: `./storage`
- **Bootstrap Cache**: `./bootstrap/cache`
- **Public Storage**: `./public/storage`
- **Vendor**: `./vendor` (development)

## Deployment Scripts

### Available Commands

```bash
# Start services
./docker-deploy.sh development up
./docker-deploy.sh production up

# Stop services
./docker-deploy.sh development down

# Restart services
./docker-deploy.sh development restart

# View logs
./docker-deploy.sh development logs

# Show status
./docker-deploy.sh development status

# Setup Laravel
./docker-deploy.sh development setup

# Cleanup everything
./docker-deploy.sh development cleanup

# Show help
./docker-deploy.sh help
```

### Environment Profiles

- **development/dev**: Development with debug tools
- **production/prod**: Production environment
- **monitoring**: Production with monitoring
- **websockets**: Production with WebSocket support

## Development Workflow

### 1. Start Development Environment
```bash
./docker-deploy.sh development up
```

### 2. Access Services
- **Application**: http://localhost:8000
- **MailHog**: http://localhost:8025
- **phpMyAdmin**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

### 3. Run Laravel Commands
```bash
# Execute commands in container
docker-compose exec app php artisan migrate
docker-compose exec app php artisan db:seed
docker-compose exec app php artisan make:controller TestController
```

### 4. View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
```

## Production Deployment

### 1. Environment Setup
```bash
# Set production environment
export APP_ENV=production
export APP_DEBUG=false
export DB_PASSWORD=secure-password
```

### 2. Deploy
```bash
./docker-deploy.sh production up
```

### 3. SSL Configuration
1. Place SSL certificates in `./docker/ssl/`
2. Update nginx configuration
3. Restart nginx service

### 4. Monitoring (Optional)
```bash
./docker-deploy.sh monitoring up
```

## Troubleshooting

### Common Issues

#### 1. Port Conflicts
```bash
# Check what's using the port
netstat -tulpn | grep :80
# Stop conflicting service or change port in docker-compose.yml
```

#### 2. Permission Issues
```bash
# Fix storage permissions
chmod -R 755 storage
chmod -R 755 bootstrap/cache
```

#### 3. Database Connection Issues
```bash
# Check database container
docker-compose logs db
# Wait for database to be ready
docker-compose exec app php artisan migrate
```

#### 4. Redis Connection Issues
```bash
# Check Redis container
docker-compose logs redis
# Test Redis connection
docker-compose exec app php artisan tinker
# Then: Redis::ping()
```

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# View health check logs
docker-compose exec app php artisan --version
docker-compose exec db mysqladmin ping
docker-compose exec redis redis-cli ping
```

### Performance Optimization

#### 1. Database Optimization
- InnoDB buffer pool size: 256M (production), 128M (development)
- Character set: utf8mb4
- Collation: utf8mb4_unicode_ci

#### 2. Redis Optimization
- Custom configuration in `./docker/redis/redis.conf`
- Persistent data storage
- Memory optimization

#### 3. Nginx Optimization
- Static file serving
- Gzip compression
- SSL termination

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use strong passwords for database
- Rotate secrets regularly

### 2. Network Security
- Services communicate via internal network
- Only necessary ports exposed
- SSL/TLS for production

### 3. Container Security
- Non-root user in containers
- Minimal base images
- Regular security updates

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker-compose exec db mysqldump -u root -p property_management > backup.sql

# Restore backup
docker-compose exec -T db mysql -u root -p property_management < backup.sql
```

### Volume Backup
```bash
# Backup volumes
tar -czf volumes-backup.tar.gz docker/volumes/

# Restore volumes
tar -xzf volumes-backup.tar.gz
```

## Monitoring and Logging

### Application Logs
```bash
# Laravel logs
docker-compose exec app tail -f storage/logs/laravel.log

# Nginx logs
docker-compose exec nginx tail -f /var/log/nginx/access.log
```

### System Monitoring
- Prometheus metrics collection
- Grafana dashboards
- Container resource usage

## Scaling

### Horizontal Scaling
```bash
# Scale queue workers
docker-compose up -d --scale queue=3

# Scale web servers (with load balancer)
docker-compose up -d --scale app=3
```

### Vertical Scaling
- Adjust container resource limits
- Optimize database configuration
- Increase Redis memory

## Maintenance

### Regular Maintenance Tasks
```bash
# Update dependencies
docker-compose exec app composer update

# Clear caches
docker-compose exec app php artisan cache:clear
docker-compose exec app php artisan config:clear

# Optimize autoloader
docker-compose exec app composer dump-autoload --optimize
```

### Container Updates
```bash
# Pull latest images
docker-compose pull

# Rebuild with new images
docker-compose up -d --build
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review container logs
3. Check health status
4. Consult Laravel documentation
5. Review Docker documentation 