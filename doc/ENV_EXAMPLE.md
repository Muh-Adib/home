# ===========================================
# PROPERTY MANAGEMENT SYSTEM - ENVIRONMENT VARIABLES
# ===========================================

# ===========================================
# LARAVEL APPLICATION CONFIGURATION
# ===========================================

# Application Environment
APP_NAME="Property Management System"
APP_ENV=production
APP_KEY=base64:your-32-character-app-key-here
APP_DEBUG=false
APP_URL=http://localhost

# ===========================================
# DATABASE CONFIGURATION
# ===========================================

# Database Connection (mysql atau postgres)
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=property_management
DB_USERNAME=pms_user
DB_PASSWORD=secret

# PostgreSQL (jika menggunakan postgres)
# DB_CONNECTION=pgsql
# DB_HOST=db_postgres
# DB_PORT=5432
# DB_DATABASE=property_management
# DB_USERNAME=pms_user
# DB_PASSWORD=secret

# ===========================================
# REDIS CONFIGURATION
# ===========================================

REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# ===========================================
# CACHE & SESSION CONFIGURATION
# ===========================================

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# ===========================================
# MAIL CONFIGURATION
# ===========================================

MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME="Property Management System"

# ===========================================
# LOGGING CONFIGURATION
# ===========================================

LOG_CHANNEL=stack
LOG_LEVEL=debug

# ===========================================
# BROADCASTING & FILESYSTEM
# ===========================================

BROADCAST_DRIVER=log
FILESYSTEM_DISK=local

# ===========================================
# OPTIONAL SERVICES CONFIGURATION
# ===========================================

# Grafana (jika menggunakan monitoring)
GRAFANA_PASSWORD=admin

# ===========================================
# SECURITY CONFIGURATION
# ===========================================

# JWT Secret (jika menggunakan JWT)
JWT_SECRET=your-jwt-secret-here

# Sanctum Configuration
SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1

# ===========================================
# EXTERNAL SERVICES (OPTIONAL)
# ===========================================

# Payment Gateway (Midtrans, Xendit, dll)
MIDTRANS_SERVER_KEY=your-midtrans-server-key
MIDTRANS_CLIENT_KEY=your-midtrans-client-key
MIDTRANS_MERCHANT_ID=your-midtrans-merchant-id
MIDTRANS_IS_PRODUCTION=false

# File Storage (AWS S3, Google Cloud Storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_DEFAULT_REGION=ap-southeast-1
AWS_BUCKET=your-s3-bucket-name
AWS_USE_PATH_STYLE_ENDPOINT=false

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json

# ===========================================
# NOTIFICATION SERVICES
# ===========================================

# FCM (Firebase Cloud Messaging)
FCM_SERVER_KEY=your-fcm-server-key
FCM_SENDER_ID=your-fcm-sender-id

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token

# ===========================================
# MAPS & LOCATION SERVICES
# ===========================================

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# ===========================================
# DEVELOPMENT TOOLS
# ===========================================

# Telescope (Laravel Debug Tool)
TELESCOPE_ENABLED=false

# Horizon (Redis Queue Monitor)
HORIZON_DOMAIN=localhost

# ===========================================
# CUSTOM APPLICATION SETTINGS
# ===========================================

# Booking Settings
BOOKING_DP_PERCENTAGES=30,50,70
BOOKING_CONFIRMATION_HOURS=24
BOOKING_CANCELLATION_HOURS=48

# Property Settings
PROPERTY_MAX_IMAGES=10
PROPERTY_MAX_VIDEOS=3
PROPERTY_MAX_DOCUMENTS=5

# Payment Settings
PAYMENT_TIMEOUT_MINUTES=30
PAYMENT_RETRY_ATTEMPTS=3

# Notification Settings
NOTIFICATION_EMAIL_ENABLED=true
NOTIFICATION_SMS_ENABLED=false
NOTIFICATION_WHATSAPP_ENABLED=false
NOTIFICATION_PUSH_ENABLED=false

# ===========================================
# PERFORMANCE & OPTIMIZATION
# ===========================================

# Queue Settings
QUEUE_WORKERS=2
QUEUE_TIMEOUT=90
QUEUE_SLEEP=3
QUEUE_TRIES=3

# Cache Settings
CACHE_TTL=3600
SESSION_LIFETIME=120

# ===========================================
# MONITORING & ANALYTICS
# ===========================================

# Sentry (Error Tracking)
SENTRY_LARAVEL_DSN=your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=1.0

# Google Analytics
GOOGLE_ANALYTICS_ID=your-ga-id

# ===========================================
# BACKUP & MAINTENANCE
# ===========================================

# Backup Settings
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE=local

# Maintenance Mode
MAINTENANCE_MODE=false
MAINTENANCE_SECRET=your-maintenance-secret

# ===========================================
# SECURITY HEADERS
# ===========================================

# Content Security Policy
CSP_ENABLED=true
CSP_REPORT_ONLY=false

# ===========================================
# CUSTOM ENVIRONMENT VARIABLES
# ===========================================

# Tambahkan variabel custom aplikasi di sini
CUSTOM_SETTING_1=value1
CUSTOM_SETTING_2=value2

# ===========================================
# NOTES & INSTRUCTIONS
# ===========================================

# 1. Ganti semua nilai 'your-*-key-here' dengan nilai yang sebenarnya
# 2. Untuk production, set APP_DEBUG=false dan APP_ENV=production
# 3. Generate APP_KEY dengan: php artisan key:generate
# 4. Sesuaikan database credentials sesuai kebutuhan
# 5. Aktifkan service yang diperlukan (payment, storage, notification)
# 6. Test semua konfigurasi sebelum deploy ke production

# ===========================================
# DOCKER SPECIFIC NOTES
# ===========================================

# Untuk Docker deployment:
# - DB_HOST akan otomatis menggunakan service name dari docker-compose
# - REDIS_HOST akan otomatis menggunakan service name dari docker-compose
# - Semua port akan di-mapping oleh docker-compose
# - Volume mounts sudah dikonfigurasi di docker-compose.yml 