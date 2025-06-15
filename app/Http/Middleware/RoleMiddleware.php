<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * RoleMiddleware - Middleware untuk mengontrol akses berdasarkan role pengguna
 * 
 * Middleware ini digunakan untuk:
 * 1. Memastikan pengguna sudah login
 * 2. Memeriksa role pengguna sesuai dengan yang diizinkan
 * 3. Memblokir akses jika role tidak sesuai
 * 
 * Contoh penggunaan di routes:
 * Route::get('/admin', [AdminController::class, 'index'])->middleware('role:super_admin,admin');
 * Route::get('/owner', [OwnerController::class, 'index'])->middleware('role:property_owner');
 */
class RoleMiddleware
{
    /**
     * Handle an incoming request.
     * 
     * Proses yang dilakukan:
     * 1. Cek apakah user sudah login
     * 2. Ambil role dari user yang login
     * 3. Bandingkan dengan role yang diizinkan
     * 4. Izinkan atau tolak akses
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string ...$roles - Daftar role yang diizinkan (bisa multiple: 'admin', 'manager', dll)
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // 1. PENGECEKAN LOGIN
        // Jika user belum login, redirect ke halaman login
        if (!$request->user()) {
            return redirect()->route('login');
        }

        // 2. AMBIL ROLE USER
        // Mendapatkan role dari user yang sedang login
        $userRole = $request->user()->role;
        
        // 3. PENGECEKAN ROLE
        // Cek apakah role user ada dalam daftar role yang diizinkan
        if (!in_array($userRole, $roles)) {
            // Jika role tidak cocok, tampilkan error 403 (Forbidden)
            abort(403, 'Access denied. You do not have permission to access this page.');
        }

        // 4. IZINKAN AKSES
        // Jika semua pengecekan passed, lanjutkan request
        return $next($request);
    }
}

/*
=== CONTOH IMPLEMENTASI DI ROUTES (routes/web.php) ===

// 1. SINGLE ROLE - Hanya super_admin yang bisa akses
Route::middleware(['auth', 'role:super_admin'])->group(function () {
    Route::get('/admin/settings', [SettingsController::class, 'index']);
    Route::get('/admin/system', [SystemController::class, 'index']);
});

// 2. MULTIPLE ROLES - Admin dan Manager bisa akses
Route::middleware(['auth', 'role:super_admin,admin,manager'])->group(function () {
    Route::get('/admin/dashboard', [DashboardController::class, 'index']);
    Route::get('/admin/reports', [ReportController::class, 'index']);
});

// 3. PROPERTY OWNER - Hanya pemilik property
Route::middleware(['auth', 'role:property_owner'])->group(function () {
    Route::get('/owner/properties', [PropertyController::class, 'ownerIndex']);
    Route::get('/owner/bookings', [BookingController::class, 'ownerBookings']);
});

// 4. STAFF ROLES - Multiple staff roles
Route::middleware(['auth', 'role:front_desk,housekeeping,finance'])->group(function () {
    Route::get('/staff/dashboard', [StaffController::class, 'dashboard']);
    Route::get('/staff/tasks', [TaskController::class, 'index']);
});

=== CONTOH ROLES DALAM SISTEM PROPERTY MANAGEMENT ===

1. super_admin      - Akses penuh ke seluruh sistem
2. admin            - Akses admin umum
3. property_owner   - Pemilik property, kelola property sendiri
4. property_manager - Manager property, kelola multiple properties
5. front_desk       - Staff front office, handle check-in/out
6. housekeeping     - Staff kebersihan
7. finance          - Staff keuangan, kelola payment
8. guest            - Tamu/pelanggan, akses terbatas

=== CONTOH PENGGUNAAN DI CONTROLLER ===

class AdminController extends Controller
{
    // Method ini hanya bisa diakses super_admin karena sudah ada middleware di route
    public function index()
    {
        return view('admin.dashboard');
    }
    
    // Tambahan pengecekan role di dalam method (optional)
    public function deleteUser(User $user)
    {
        // Double check di controller level
        if (!in_array(auth()->user()->role, ['super_admin'])) {
            abort(403, 'Only super admin can delete users');
        }
        
        $user->delete();
        return redirect()->back()->with('success', 'User deleted');
    }
}

=== CONTOH PENGGUNAAN DI BLADE TEMPLATE ===

@if(auth()->user()->role === 'super_admin')
    <a href="/admin/settings" class="btn btn-primary">System Settings</a>
@endif

@if(in_array(auth()->user()->role, ['super_admin', 'admin', 'property_manager']))
    <a href="/admin/properties" class="btn btn-secondary">Manage Properties</a>
@endif

=== CONTOH REGISTRASI MIDDLEWARE (app/Http/Kernel.php) ===

protected $middlewareAliases = [
    'auth' => \App\Http\Middleware\Authenticate::class,
    'role' => \App\Http\Middleware\RoleMiddleware::class,
    // ... other middlewares
];

=== CONTOH STRUKTUR DATABASE USERS ===

users table:
- id
- name
- email
- password
- role (enum: 'super_admin', 'admin', 'property_owner', 'property_manager', 'front_desk', 'housekeeping', 'finance', 'guest')
- status (enum: 'active', 'inactive')
- created_at
- updated_at

=== CONTOH SEEDER UNTUK ROLES ===

User::create([
    'name' => 'Super Admin',
    'email' => 'superadmin@example.com',
    'role' => 'super_admin',
    'password' => Hash::make('password'),
]);

User::create([
    'name' => 'Property Owner',
    'email' => 'owner@example.com', 
    'role' => 'property_owner',
    'password' => Hash::make('password'),
]);

=== KEUNTUNGAN MENGGUNAKAN ROLE MIDDLEWARE ===

1. ✅ Keamanan terpusat - Semua pengecekan role di satu tempat
2. ✅ Mudah maintenance - Tinggal ubah di middleware
3. ✅ Reusable - Bisa dipakai di banyak route
4. ✅ Flexible - Support multiple roles
5. ✅ Clean code - Route menjadi lebih bersih
6. ✅ Performance - Pengecekan cepat sebelum masuk controller

=== ALTERNATIVE MENGGUNAKAN POLICY (LARAVEL NATIVE) ===

// Jika ingin lebih advanced, bisa menggunakan Laravel Policy
// php artisan make:policy PropertyPolicy

class PropertyPolicy
{
    public function view(User $user, Property $property)
    {
        return $user->role === 'property_owner' && $user->id === $property->owner_id;
    }
    
    public function update(User $user, Property $property)
    {
        return in_array($user->role, ['super_admin', 'property_owner']) 
               && ($user->role === 'super_admin' || $user->id === $property->owner_id);
    }
}

// Penggunaan di controller:
public function show(Property $property)
{
    $this->authorize('view', $property);
    return view('properties.show', compact('property'));
}
*/
