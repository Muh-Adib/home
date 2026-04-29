---
inclusion: manual
---

# Laravel Dev & Debug Skill — Homsjogja

Skill ini aktif saat kamu sedang debug, investigasi bug, atau eksplorasi codebase Homsjogja.
Gunakan tools dan endpoint yang sudah tersedia di project ini — jangan buat ulang yang sudah ada.

---

## Tools yang Tersedia

### 1. Codebase Visualizer (realtime)
URL: `http://home.test/dev/codevis`
API: `http://home.test/dev/codevis/api`

API mengembalikan JSON dengan struktur:
```json
{
  "tree": [...],
  "graph": {
    "nodes": [{ "id", "name", "path", "ext", "group", "size" }],
    "edges": [{ "source", "target", "type" }]
  },
  "scanned_at": "ISO8601"
}
```

**Gunakan API ini untuk:**
- Cari file berdasarkan nama/group
- Temukan semua file yang menggunakan class tertentu (edges `target = file`)
- Temukan semua dependency sebuah file (edges `source = file`)
- Identifikasi file terisolasi (tidak ada edges)

**Cara query via tinker:**
```bash
php artisan tinker --execute '
$d = json_decode(file_get_contents("http://home.test/dev/codevis/api"), true);
$edges = $d["graph"]["edges"];
// Siapa yang pakai BookingService?
$users = array_filter($edges, fn($e) => str_contains($e["target"], "BookingService"));
foreach ($users as $e) echo basename($e["source"]) . "\n";
'
```

### 2. Laravel Artisan
```bash
# Lihat semua route
php artisan route:list --except-vendor

# Filter route
php artisan route:list --path=admin/bookings
php artisan route:list --name=admin.payments

# Cek config
php artisan config:show database
php artisan config:show app.env

# Cek error terakhir
php artisan pail --filter=ERROR
```

### 3. Log & Error
- Error terakhir: gunakan tool `mcp_laravel_boost_last_error`
- Log entries: gunakan tool `mcp_laravel_boost_read_log_entries`
- Browser console: gunakan tool `mcp_laravel_boost_browser_logs`

### 4. Database
- Schema: gunakan tool `mcp_laravel_boost_database_schema`
- Query: gunakan tool `mcp_laravel_boost_database_query`

---

## Alur Debug yang Efisien

### Bug di fitur booking admin
1. `mcp_laravel_boost_last_error` → lihat exception + stack trace
2. `php artisan route:list --path=admin/bookings` → konfirmasi route & controller
3. Baca controller → cari service yang di-inject
4. Baca service → temukan logic yang bermasalah
5. `mcp_laravel_boost_database_query` → validasi data di DB jika perlu

### Tidak tahu file mana yang relevan
1. Query codevis API → filter edges by nama class
2. Atau: `grep -rn "NamaClass" app/ --include="*.php" -l`

### Perubahan tidak muncul di frontend
- Minta user jalankan `npm run build` atau `composer run dev`
- Cek: `mcp_laravel_boost_browser_logs` untuk JS error

### Service tidak terhubung / dependency tidak jelas
- Cek constructor injection: `grep -A10 "__construct" app/Services/NamaService.php`
- Visualizer: buka `http://home.test/dev/codevis` → klik node → lihat "Imports from" & "Imported by"

---

## Struktur Codebase Ringkas

```
Request → routes/{admin,user,staff,web}.php
        → Controller (app/Http/Controllers/)
        → Service (app/Services/)          ← business logic
        → Repository (app/Repositories/)   ← data access (hanya BookingRepository)
        → Model (app/Models/)              ← Eloquent
        → Event (app/Events/)              ← async side effects
        → Response → Inertia::render() → resources/js/pages/
```

**Groups di visualizer:**
| Group | Path |
|---|---|
| `controller-admin` | `app/Http/Controllers/Admin/` |
| `service` | `app/Services/` |
| `model` | `app/Models/` |
| `page-admin` | `resources/js/pages/Admin/` |
| `hook` | `resources/js/hooks/` |
| `route` | `routes/` |

---

## Konvensi Penting

- Route canonical booking admin: `admin.bookings.*` via `BookingManagementController`
- API booking (timeline/search): `/api/admin/booking-management/*` via `BookingApiController`
- Constructor injection tanpa `use` statement = Laravel autowiring (normal)
- Semua operasi DB berat → lewat `BookingService` atau `AdminBookingService`, bukan langsung di controller
- Frontend state → Inertia props dari controller, bukan API call terpisah (kecuali fitur realtime)

---

## Cara Aktifkan Skill Ini

Ketik `#laravel-dev-debug` di chat Kiro untuk load skill ini ke context.
