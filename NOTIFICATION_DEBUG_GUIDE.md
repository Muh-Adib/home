# 🔔 Panduan Debug Sistem Notifikasi Real-time

## ✅ Checklist Sistem Notifikasi

### 1. **Prerequisites Check**
- [ ] Laravel aplikasi berjalan (`php artisan serve`)
- [ ] Redis server berjalan (lihat `REDIS_WINDOWS_SETUP.md`)
- [ ] Laravel Echo Server berjalan (`npm run echo:serve`)
- [ ] Database migrasi completed
- [ ] User sudah login dan authenticated

### 2. **File Structure Check**
```
resources/js/
├── lib/
│   ├── echo.ts ✅ (Enhanced with fallback)
│   └── echo-fallback.ts ✅ (Polling fallback system)
├── hooks/
│   └── use-notifications.tsx ✅ (Updated hook)
├── components/
│   └── notifications/
│       └── notification-bell.tsx ✅ (Notification component)
└── app.tsx ✅ (Echo imported)
```

## 🚀 Step-by-Step Troubleshooting

### Step 1: Start Required Services

**Terminal 1 - Laravel Server:**
```bash
php artisan serve
```

**Terminal 2 - Redis Server:**
```bash
# Windows (jika belum auto-start)
redis-server

# Linux/Mac
sudo systemctl start redis
# atau
brew services start redis
```

**Terminal 3 - Laravel Echo Server:**
```bash
npm run echo:serve
# atau manual:
npx laravel-echo-server start
```

**Terminal 4 - Vite Dev Server:**
```bash
npm run dev
```

### Step 2: Verify Services Running

**Check Redis:**
```bash
redis-cli ping
# Should return: PONG
```

**Check Laravel Echo Server:**
- Open browser: `http://localhost:6001`
- Should show Laravel Echo Server dashboard

**Check Laravel App:**
- Open browser: `http://localhost:8000` (atau port Laravel)
- Login dengan user account

### Step 3: Debug Notification System

**Open Browser Console (F12) dan check:**

1. **Echo Connection Status:**
```javascript
// Di browser console
console.log('Echo instance:', window.Echo);
console.log('Echo connected:', window.Echo?.connector?.socket?.connected);
```

2. **Test Notification Bell:**
- Look for notification bell icon di header (🔔)
- Click notification bell, should open dropdown
- Check console for connection status

3. **Test WebSocket Connection:**
```javascript
// Di browser console
window.Echo?.connector?.socket?.on('connect', () => {
    console.log('✅ WebSocket connected!');
});

window.Echo?.connector?.socket?.on('connect_error', (error) => {
    console.log('❌ WebSocket error:', error);
});
```

## 🔍 Debug Tools

### 1. **Test Page for Notifications**
Akses file `test-notification-system.html` di browser:
```
http://localhost:8000/test-notification-system.html
```

Test semua fitur:
- WebSocket Connection Test
- Polling Fallback Test
- API Endpoints Test
- Create Test Notification

### 2. **Manual API Testing**

**Test Recent Notifications:**
```bash
curl -X GET "http://localhost:8000/notifications/recent" \
  -H "Accept: application/json" \
  -H "Cookie: laravel_session=your_session_cookie"
```

**Create Test Notification:**
```bash
curl -X POST "http://localhost:8000/test-notification" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: your_csrf_token" \
  -H "Cookie: laravel_session=your_session_cookie" \
  -d '{"title":"Test","message":"Hello World"}'
```

### 3. **Laravel Artisan Commands**

**Check Queue Workers:**
```bash
php artisan queue:work --verbose
```

**Clear All Caches:**
```bash
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear
```

**Check Database Notifications:**
```bash
php artisan tinker
# Kemudian di tinker:
>>> \App\Models\User::find(1)->notifications()->count()
>>> \App\Models\User::find(1)->unreadNotifications()->count()
```

## 🐛 Common Issues & Solutions

### Issue 1: "WebSocket connection failed"

**Symptoms:**
- Notification bell tidak update real-time
- Console error: "WebSocket connection to 'ws://localhost:6001' failed"

**Solution:**
```bash
# 1. Stop Laravel Echo Server
pkill -f "laravel-echo-server"

# 2. Restart Redis
redis-cli shutdown
redis-server

# 3. Restart Laravel Echo Server
npx laravel-echo-server start
```

### Issue 2: "Polling fallback not working"

**Symptoms:**
- WebSocket fails but polling juga tidak bekerja
- API requests return 401/403

**Solution:**
1. Check user authentication status
2. Verify CSRF token in meta tag:
```html
<meta name="csrf-token" content="{{ csrf_token() }}">
```
3. Check route middleware di `routes/web.php`

### Issue 3: "Notifications not showing in bell"

**Symptoms:**
- Notifications created in database
- Bell tidak show unread count

**Solution:**
1. Check notification bell component props:
```tsx
<NotificationBell userId={auth.user.id} />
```

2. Verify notification data structure dalam database:
```sql
SELECT * FROM notifications WHERE notifiable_id = 1 ORDER BY created_at DESC LIMIT 5;
```

### Issue 4: "Echo undefined atau null"

**Symptoms:**
- Console error: "Cannot read property of undefined"
- `window.Echo` is null

**Solution:**
1. Check import di `app.tsx`:
```tsx
import './lib/echo'; // Make sure this line exists
```

2. Verify echo.ts file tidak ada syntax errors
3. Check network tab untuk JavaScript errors

## 📊 Monitoring & Logs

### Laravel Logs
```bash
tail -f storage/logs/laravel.log
```

### Laravel Echo Server Logs
```bash
# Check console output dari terminal yang run echo server
```

### Redis Logs
```bash
redis-cli monitor
```

### Browser Console
- Open F12 → Console tab
- Look for notification-related logs
- Check Network tab untuk API requests

## 🎯 Test Scenarios

### Scenario 1: Complete Notification Flow
1. Login sebagai admin
2. Create new booking (triggers notification)
3. Check notification bell untuk new notification
4. Click notification to mark as read
5. Verify notification status in database

### Scenario 2: Fallback System Test
1. Stop Laravel Echo Server (simulate WebSocket failure)
2. Reload page
3. System should automatically switch to polling
4. Create test notification
5. Should still receive notification via polling

### Scenario 3: Multi-User Test
1. Login dengan 2 different users di different browsers
2. Create notification untuk user 1
3. User 1 should receive real-time notification
4. User 2 should NOT receive notification

## 📋 Final Checklist

Setelah troubleshooting, verify:

- [ ] WebSocket connection successful (check console)
- [ ] Notification bell shows correct unread count
- [ ] Clicking notification marks as read
- [ ] Real-time updates working (test dengan creating notification)
- [ ] Fallback system working when WebSocket fails
- [ ] No JavaScript errors in console
- [ ] API endpoints responding correctly
- [ ] Database storing notifications correctly

## 🆘 Last Resort Commands

Jika semua masih belum bekerja:

```bash
# 1. Reset semua services
pkill -f "php artisan serve"
pkill -f "laravel-echo-server"
pkill -f "redis-server"

# 2. Clear everything
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear
npm run build

# 3. Restart everything
redis-server &
php artisan serve &
npx laravel-echo-server start &
npm run dev
```

## 📞 Support

Jika masih ada masalah:
1. Check documentation di `doc/` folder
2. Review `NOTIFICATION_SYSTEM_SETUP.md`
3. Check Laravel Echo Server documentation
4. Verify Redis installation dan configuration 