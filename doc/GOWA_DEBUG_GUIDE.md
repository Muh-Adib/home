# GOWA Debug Guide

## Quick Debug Steps

### 1. Test Connection dari Browser

Akses halaman GOWA management: `/admin/gowa`

Klik button **"Test Connection"** di Debug Panel (paling bawah halaman)

**Hasil yang mungkin:**

#### ✅ Success
```json
{
  "success": true,
  "message": "GOWA server connected successfully",
  "debug": {
    "config_exists": true,
    "url": "https://gowa.linxit.id",
    "http_status": 200,
    "api_code": 200
  }
}
```
→ **Solusi**: Generate QR code dan scan dengan WhatsApp

#### ❌ Connection Timeout
```json
{
  "success": false,
  "message": "Cannot reach GOWA server",
  "debug": {
    "error": "Connection failed",
    "error_type": "ConnectionException"
  }
}
```
→ **Solusi**: 
- Check apakah GOWA server running
- Ping GOWA server: `ping gowa.linxit.id`
- Test manual: `curl https://gowa.linxit.id/app/devices`

#### ❌ HTTP 401 Unauthorized
```json
{
  "success": false,
  "debug": {
    "http_status": 401,
    "error": "HTTP request failed"
  }
}
```
→ **Solusi**: Username/password salah, update config

#### ❌ HTTP 404 Not Found
```json
{
  "success": false,
  "debug": {
    "http_status": 404
  }
}
```
→ **Solusi**: GOWA server URL salah atau endpoint tidak ada

### 2. Test Manual via cURL

```bash
# Test basic connection
curl -X GET https://gowa.linxit.id/app/devices \
  -u "username:password"

# Expected response if OK:
{
  "code": 200,
  "data": [...]
}
```

### 3. Check Laravel Logs

```bash
# View latest errors
tail -f storage/logs/laravel.log

# Search for GOWA errors
grep "GOWA" storage/logs/laravel.log
```

### 4. Test dari Tinker

```bash
php artisan tinker

# Test config
$config = App\Models\GowaConfig::getActive();
dd($config);

# Test service
$service = app(App\Services\GowaService::class);
$result = $service->checkConnection();
dd($result);

# Test devices
$devices = $service->getDevices();
dd($devices);
```

## Common Issues & Solutions

### Issue 1: "No active GOWA configuration found"
**Cause**: Config belum dibuat atau `is_active = false`

**Solution**:
```sql
-- Check config
SELECT * FROM gowa_configs;

-- Set active
UPDATE gowa_configs SET is_active = true WHERE id = 1;
```

### Issue 2: "Connection timeout"
**Cause**: GOWA server tidak bisa diakses

**Solution**:
1. Check GOWA server status
2. Check firewall rules
3. Check network connectivity
4. Verify URL correct

### Issue 3: "401 Unauthorized"
**Cause**: Username/password salah

**Solution**:
1. Verify credentials di GOWA server
2. Update config via `/admin/gowa`
3. Test dengan curl manual

### Issue 4: "SSL Certificate Error"
**Cause**: SSL certificate invalid

**Solution**:
```php
// Temporary: Disable SSL verification (NOT for production!)
// In GowaService.php makeRequest():
$request = Http::withBasicAuth($this->config->username, $this->config->password)
    ->withoutVerifying() // Add this
    ->timeout(30);
```

### Issue 5: "Connected but QR not working"
**Cause**: WhatsApp already connected atau QR expired

**Solution**:
1. Logout dari GOWA admin panel
2. Generate QR baru
3. Scan dalam 20 detik

## Debug Checklist

- [ ] Config exists dan `is_active = true`
- [ ] GOWA server URL benar
- [ ] Username/password benar
- [ ] GOWA server running
- [ ] Network connectivity OK
- [ ] Firewall allows connection
- [ ] SSL certificate valid (if HTTPS)
- [ ] Laravel can make HTTP requests
- [ ] Check Laravel logs for errors

## API Endpoints Reference

### Test Connection
```
GET /admin/gowa/test-connection
```
Returns detailed connection test results

### Debug Status
```
GET /admin/gowa/debug-status
```
Returns full debug information including config, environment, and test results

### Get Status
```
GET /admin/gowa/status
```
Returns current connection status and devices

## Next Steps After Debug

1. **If connection OK**: Generate QR and scan
2. **If connection fails**: Fix network/config issues
3. **If QR fails**: Check WhatsApp number in config
4. **If still issues**: Check GOWA server logs
