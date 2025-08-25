# 🔐 Logout Troubleshooting Guide

Panduan troubleshooting untuk masalah logout di aplikasi Homsjogja.

## 🚨 Error yang Sering Terjadi

### 1. **The GET method is not supported for route logout. Supported methods: POST.**

**Penyebab:**
- Logout menggunakan GET method padahal route hanya mendukung POST
- Implementasi logout yang tidak proper

**Solusi:**
```tsx
// ❌ SALAH - Menggunakan GET
window.location.href = '/logout';

// ✅ BENAR - Menggunakan POST dengan Inertia
const logoutForm = useForm({});

const handleLogout = () => {
    logoutForm.post('/logout');
};
```

## 🔧 Implementasi Logout yang Benar

### **Method 1: Menggunakan useForm (Recommended)**

```tsx
import { useForm } from '@inertiajs/react';

export default function DashboardLayout() {
    const logoutForm = useForm({});

    const handleLogout = () => {
        logoutForm.post('/logout');
    };

    return (
        <DropdownMenuItem asChild>
            <form onSubmit={(e) => {
                e.preventDefault();
                handleLogout();
            }} className="w-full">
                <button
                    type="submit"
                    className="flex w-full items-center text-red-600 focus:text-red-600"
                    disabled={logoutForm.processing}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutForm.processing ? 'Logging out...' : 'Log out'}</span>
                </button>
            </form>
        </DropdownMenuItem>
    );
}
```

### **Method 2: Menggunakan router.post**

```tsx
import { router } from '@inertiajs/react';

const handleLogout = () => {
    router.post('/logout');
};
```

### **Method 3: Menggunakan Link dengan method POST**

```tsx
import { Link } from '@inertiajs/react';

<Link href="/logout" method="post" as="button" className="...">
    <LogOut className="mr-2 h-4 w-4" />
    <span>Log out</span>
</Link>
```

## 📋 Route Configuration

### **Laravel Route (routes/auth.php)**
```php
Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
    ->name('logout');
```

### **Include di web.php**
```php
require __DIR__.'/auth.php';
```

## 🔍 Troubleshooting Checklist

### **1. Cek Route Registration**
```bash
php artisan route:list | grep logout
```

**Expected Output:**
```
POST   logout  logout  App\Http\Controllers\Auth\AuthenticatedSessionController@destroy
```

### **2. Cek CSRF Token**
Pastikan CSRF token tersedia:
```tsx
// Di layout utama
<meta name="csrf-token" content="{{ csrf_token() }}">
```

### **3. Cek Network Tab**
- Buka Developer Tools
- Cek Network tab
- Pastikan request menggunakan POST method
- Pastikan CSRF token terkirim

### **4. Cek Laravel Logs**
```bash
tail -f storage/logs/laravel.log
```

## 🎯 Best Practices

### **1. Loading State**
```tsx
<button disabled={logoutForm.processing}>
    {logoutForm.processing ? 'Logging out...' : 'Log out'}
</button>
```

### **2. Error Handling**
```tsx
const handleLogout = () => {
    logoutForm.post('/logout', {
        onError: (errors) => {
            console.error('Logout failed:', errors);
        },
        onSuccess: () => {
            // Redirect atau cleanup
        }
    });
};
```

### **3. Confirmation Dialog**
```tsx
const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
        logoutForm.post('/logout');
    }
};
```

## 🚀 Advanced Implementation

### **Custom Logout Hook**
```tsx
// hooks/use-logout.ts
import { useForm } from '@inertiajs/react';

export function useLogout() {
    const logoutForm = useForm({});

    const logout = (options?: {
        onSuccess?: () => void;
        onError?: (errors: any) => void;
        confirm?: boolean;
    }) => {
        const { onSuccess, onError, confirm = false } = options || {};

        const performLogout = () => {
            logoutForm.post('/logout', {
                onSuccess,
                onError,
            });
        };

        if (confirm) {
            if (window.confirm('Are you sure you want to logout?')) {
                performLogout();
            }
        } else {
            performLogout();
        }
    };

    return {
        logout,
        processing: logoutForm.processing,
    };
}
```

### **Usage:**
```tsx
const { logout, processing } = useLogout();

const handleLogout = () => {
    logout({
        confirm: true,
        onSuccess: () => {
            // Custom success handling
        }
    });
};
```

## 🔒 Security Considerations

### **1. CSRF Protection**
- Laravel otomatis menambahkan CSRF protection
- Pastikan meta tag CSRF ada di layout

### **2. Session Cleanup**
```php
// AuthenticatedSessionController@destroy
public function destroy(Request $request): RedirectResponse
{
    Auth::guard('web')->logout();

    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return redirect('/');
}
```

### **3. Remember Me Token**
```php
// Jika menggunakan remember me
Auth::guard('web')->logout();
$request->session()->invalidate();
$request->session()->regenerateToken();
```

## 📱 Mobile Considerations

### **1. Touch Targets**
```tsx
<button className="min-h-[44px] min-w-[44px]"> // iOS minimum touch target
    Log out
</button>
```

### **2. Loading States**
```tsx
<button disabled={processing} className="opacity-50">
    {processing ? (
        <div className="flex items-center">
            <Spinner className="mr-2" />
            Logging out...
        </div>
    ) : (
        'Log out'
    )}
</button>
```

## 🧪 Testing

### **1. Unit Test**
```php
public function test_users_can_logout()
{
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $response->assertRedirect('/');
    $this->assertGuest();
}
```

### **2. Feature Test**
```php
public function test_logout_requires_post_method()
{
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/logout');

    $response->assertStatus(405); // Method Not Allowed
}
```

---

## 📞 Support

Jika masih mengalami masalah:

1. **Cek Laravel Logs**: `storage/logs/laravel.log`
2. **Cek Browser Console**: Developer Tools > Console
3. **Cek Network Tab**: Developer Tools > Network
4. **Cek Route List**: `php artisan route:list | grep logout`

**Common Issues:**
- CSRF token missing
- Route not registered
- Wrong HTTP method
- Session configuration issues
