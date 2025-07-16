# Real-time Notification System Setup

## 🚀 Sistem Notifikasi Real-time Laravel 12 + Inertia.js + React

Implementasi lengkap sistem notifikasi real-time menggunakan Laravel Event/Listener, Laravel Notifications, Redis, Socket.io, dan Laravel Echo tanpa menggunakan layanan berbayar seperti Pusher.

---

## 📋 Environment Configuration

Add these variables to your `.env` file:

```env
# Broadcasting Configuration
BROADCAST_DRIVER=redis
BROADCAST_CONNECTION=default

# Redis Configuration for Broadcasting
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=0

# Queue Configuration
QUEUE_CONNECTION=redis

# Notification Configuration
NOTIFICATION_CHANNELS=database,broadcast

# Socket.io Configuration
SOCKETIO_PORT=6001
SOCKETIO_HOST=localhost
```

---

## 🔧 Dependencies Installation

### Backend Dependencies (Laravel)
```bash
# Install Redis for Laravel
composer require predis/predis

# Install Laravel Echo Server
npm install -g laravel-echo-server
```

### Frontend Dependencies (React)
```bash
# Install Socket.io client and Laravel Echo (use --legacy-peer-deps if conflict occurs)
npm install socket.io-client laravel-echo --legacy-peer-deps
```

---

## 🔴 Redis Setup
Make sure Redis is installed and running on your system:

### Windows (via Chocolatey)
```bash
choco install redis-64
redis-server
```

### macOS (via Homebrew)
```bash
brew install redis
brew services start redis
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

---

## 🗄️ Database Setup

Run the notifications migration:
```bash
php artisan migrate
```

---

## 🚀 Starting the System

### 1. Start Laravel Development Server
```bash
php artisan serve
```

### 2. Start Queue Worker (for processing notifications)
```bash
php artisan queue:work --tries=3
```

### 3. Start Laravel Echo Server (for real-time communication)
```bash
laravel-echo-server start
```

### 4. Start Frontend Development Server
```bash
npm run dev
```

---

## 📁 Struktur File yang Dibuat

### Backend Laravel

#### Events
- `app/Events/BookingCreated.php` - Event untuk booking baru

#### Listeners  
- `app/Listeners/SendBookingNotification.php` - Listener untuk mengirim notifikasi

#### Notifications
- `app/Notifications/BookingCreatedNotification.php` - Notification class dengan database & broadcast channels

#### Controllers
- `app/Http/Controllers/NotificationController.php` - API endpoints untuk notifikasi

#### Providers
- `app/Providers/EventServiceProvider.php` - Register events dan listeners

#### Routes
- `routes/channels.php` - Private channel authorization untuk broadcasting
- `routes/web.php` - Notification routes

#### Configuration
- `config/broadcasting.php` - Konfigurasi broadcasting dengan Redis
- `laravel-echo-server.json` - Konfigurasi Echo Server

### Frontend React

#### Components
- `resources/js/components/notifications/notification-bell.tsx` - Komponen bell icon dengan dropdown

#### Hooks
- `resources/js/hooks/use-notifications.tsx` - Custom hook untuk notifikasi state & actions

#### Configuration
- `resources/js/lib/echo.ts` - Setup Laravel Echo dengan Socket.io

---

## 🎯 Cara Menggunakan

### 1. Trigger Notifikasi dari Controller

```php
use App\Events\BookingCreated;

// Di dalam method controller
event(new BookingCreated($booking, auth()->user()));
```

### 2. Menampilkan Notification Bell di Header

```tsx
import { NotificationBell } from '@/components/notifications/notification-bell';

// Di dalam komponen header
<NotificationBell userId={auth.user.id} />
```

### 3. Menggunakan Hook Notifikasi

```tsx
import { useNotifications } from '@/hooks/use-notifications';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected
  } = useNotifications(userId);

  // ... gunakan state dan actions
}
```

---

## 🔧 API Endpoints

```bash
GET    /notifications              # Daftar notifikasi dengan pagination
GET    /notifications/unread       # Notifikasi yang belum dibaca
GET    /notifications/recent       # Notifikasi terbaru untuk dropdown
GET    /notifications/count        # Jumlah notifikasi
PATCH  /notifications/{id}/read    # Tandai notifikasi sebagai dibaca
PATCH  /notifications/mark-all-read # Tandai semua sebagai dibaca
DELETE /notifications/{id}         # Hapus notifikasi
DELETE /notifications/clear/read   # Hapus semua notifikasi yang sudah dibaca
```

---

## 🎛️ Fitur Sistem

### Real-time Features
- ✅ Notifikasi real-time tanpa refresh halaman
- ✅ Broadcasting ke multiple users berdasarkan role
- ✅ Private channels untuk notifikasi personal
- ✅ Browser notifications (jika diizinkan user)
- ✅ Connection status indicator

### UI/UX Features
- ✅ Bell icon dengan badge unread count
- ✅ Dropdown notifikasi dengan scroll
- ✅ Mark as read individual/bulk
- ✅ Delete notifikasi
- ✅ Icon dan color coding berdasarkan tipe
- ✅ Responsive design
- ✅ Loading states dan error handling

### Backend Features
- ✅ Database storage untuk persistence
- ✅ Queue processing untuk performance
- ✅ Event-driven architecture
- ✅ Role-based notification targeting
- ✅ Comprehensive API endpoints

---

## 🔍 Testing

### Test Notifikasi Manual

1. Buat booking baru melalui form
2. Login sebagai admin/staff
3. Notification bell akan menampilkan badge baru
4. Klik bell untuk melihat notifikasi
5. Test mark as read dan delete

### Test Real-time

1. Buka 2 browser/tab berbeda
2. Login sebagai admin di keduanya
3. Buat booking dari tab pertama
4. Lihat notifikasi muncul real-time di tab kedua

---

## 🚨 Troubleshooting

### Redis Connection Error
```bash
# Check Redis status
redis-cli ping
# Should return PONG

# Restart Redis
sudo systemctl restart redis-server
```

### NPM Dependency Conflicts
Jika mengalami error `ERESOLVE` saat install dependencies:

```bash
# Solusi 1: Install dengan --legacy-peer-deps
npm install socket.io-client laravel-echo --legacy-peer-deps

# Solusi 2: Clear cache dan retry
npm cache clean --force
npm install socket.io-client laravel-echo --legacy-peer-deps

# Solusi 3: Update package.json untuk resolusi otomatis
# Tambahkan di package.json:
"overrides": {
  "date-fns": "^4.1.0"
}
```

Untuk mengatasi konflik dependency berdasarkan [npm troubleshooting guide](https://docs.npmjs.com/common-errors/), gunakan flag `--legacy-peer-deps` yang memungkinkan instalasi meskipun ada konflik peer dependency.

### Echo Server Issues
```bash
# Check if port 6001 is available
netstat -an | grep 6001

# Restart Echo Server
laravel-echo-server stop
laravel-echo-server start
```

### Queue Not Processing
```bash
# Restart queue worker
php artisan queue:restart
php artisan queue:work
```

### Database Issues
```bash
# Clear notifications table if needed
php artisan tinker
>>> DB::table('notifications')->truncate();
```

---

## 🔧 Customization

### Menambah Tipe Notifikasi Baru

1. **Buat Event Baru**
```bash
php artisan make:event PaymentReceived
```

2. **Buat Listener**
```bash
php artisan make:listener SendPaymentNotification --event=PaymentReceived
```

3. **Buat Notification Class**
```bash
php artisan make:notification PaymentReceivedNotification
```

4. **Register di EventServiceProvider**
```php
PaymentReceived::class => [
    SendPaymentNotification::class,
],
```

### Customize Icon dan Color

Edit di `notification-bell.tsx`:
```tsx
const getNotificationIcon = (type: string, icon?: string) => {
    switch (icon || type) {
        case 'payment_received':
            return '💰';
        // ... tambah cases baru
    }
};
```

---

## 📊 Performance Tips

1. **Limit Notification History**
```php
// Hapus notifikasi lama secara berkala
DB::table('notifications')
    ->where('created_at', '<', now()->subDays(30))
    ->delete();
```

2. **Index Database**
```php
// Tambah index untuk performance
Schema::table('notifications', function (Blueprint $table) {
    $table->index(['notifiable_type', 'notifiable_id', 'read_at']);
});
```

3. **Queue Configuration**
```env
QUEUE_CONNECTION=redis
REDIS_CLIENT=predis
```

---

## 🔒 Security Considerations

1. **Channel Authorization** - Sudah diimplementasi di `routes/channels.php`
2. **CSRF Protection** - Menggunakan CSRF token di headers
3. **Rate Limiting** - Pertimbangkan rate limiting untuk API endpoints
4. **Input Validation** - Validasi semua input di controllers

---

## 📈 Monitoring

### Log Monitoring
```bash
# Monitor Laravel logs
tail -f storage/logs/laravel.log

# Monitor Echo Server logs
laravel-echo-server start --dev
```

### Queue Monitoring
```bash
# Check queue status
php artisan queue:status

# Failed jobs
php artisan queue:failed
```

---

✅ **SISTEM READY TO USE!** 

Ikuti langkah-langkah di atas untuk mengaktifkan sistem notifikasi real-time yang lengkap di aplikasi Laravel 12 + Inertia.js + React Anda. 