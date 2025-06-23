# Redis Setup untuk Windows

## 🔧 Cara Install Redis di Windows

### Opsi 1: Download Redis untuk Windows
1. **Download Redis**: https://github.com/microsoftarchive/redis/releases
2. **Extract** file zip ke folder (misal: `C:\redis`)
3. **Buka Command Prompt sebagai Administrator**
4. **Navigate** ke folder redis: `cd C:\redis`
5. **Start Redis Server**:
   ```cmd
   redis-server.exe redis.windows.conf
   ```

### Opsi 2: Menggunakan Chocolatey (Easiest)
```cmd
# Install Chocolatey terlebih dahulu jika belum ada:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Redis
choco install redis-64

# Start Redis
redis-server
```

### Opsi 3: Docker (Alternative)
```cmd
# Pull Redis image
docker pull redis:alpine

# Run Redis container
docker run --name redis -d -p 6379:6379 redis:alpine

# Test connection
docker exec -it redis redis-cli ping
```

## ✅ Test Redis Installation

Setelah install, test dengan:
```cmd
redis-cli ping
# Should return: PONG
```

## 🚀 Start Echo Server Setelah Redis Running

```cmd
# Start Redis (in background)
redis-server

# Start Echo Server (new terminal)
laravel-echo-server start --dev
```

---

## 📋 Troubleshooting Redis Issues

### Error: Redis Connection Refused
- Pastikan Redis server berjalan di port 6379
- Check dengan: `netstat -an | findstr ":6379"`
- Restart Redis service

### Error: Access Denied
- Run Command Prompt sebagai Administrator
- Set permission untuk Redis folder

### Alternative: Use Database Driver
Jika tidak bisa install Redis, ubah di `laravel-echo-server.json`:
```json
{
  "database": "sqlite",
  "databaseConfig": {
    "sqlite": {
      "databasePath": "./database/laravel-echo-server.sqlite"
    }
  }
}
``` 