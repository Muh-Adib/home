# 🏗️ Stack & Architecture Rules — Homsjogja

## Tech Stack (pinned versions)

| Layer | Package | Version |
|---|---|---|
| PHP Runtime | PHP | ^8.2 |
| Backend Framework | Laravel | ^13.0 |
| SPA Bridge | inertiajs/inertia-laravel | 3.0 |
| Frontend Framework | React | ^19.0 |
| Inertia React Adapter | @inertiajs/react | ^3.0.3 |
| Bundler | Vite | ^6.0 |
| Styling | Tailwind CSS | ^4.0 |
| TypeScript | typescript | ^5.7 |
| HTTP Utility | resources/js/lib/api.ts | internal |
| State (Server) | Inertia props | — |
| State (Async) | @tanstack/react-query | ^5 |
| Forms | react-hook-form + zod | — |
| UI Components | Radix UI + shadcn/ui pattern | — |
| Icons | lucide-react | ^0.475 |
| Notifications | sonner | ^2 |
| Real-time | Laravel Echo + Pusher | — |
| Maps | Leaflet + react-leaflet | — |
| Charts | Recharts | ^2 |
| Calendar | FullCalendar | ^6 |
| Animations | framer-motion | ^12 |
| i18n | react-i18next / i18next | ^23/^14 |
| Excel | maatwebsite/excel | ^3.1 |
| Images | intervention/image | ^3.11 |
| SEO | spatie/laravel-sitemap + spatie/schema-org | — |
| Routes in JS | ziggy-js | ^2.6 |
| Queue | Laravel Queue (database driver) | — |
| Dev Tools | laravel/boost, laravel/pint, PHPUnit 11 | — |

---

## 1. Inertia v3 Rules (CRITICAL)

### ❌ FORBIDDEN — Inertia v2/v1 patterns
```tsx
// NEVER — v2 patterns are BROKEN in v3
import { Inertia } from '@inertiajs/inertia';
Inertia.visit('/url');
Inertia.post('/url', data);
```

### ✅ REQUIRED — Inertia v3 patterns
```tsx
import { router, useForm, Link, usePage, Head } from '@inertiajs/react';

// Navigate
router.visit('/url');
router.reload({ only: ['prop'] });

// Forms — always use Inertia useForm for submit to Laravel
const { data, setData, post, put, patch, delete: destroy, processing, errors } = useForm({ ... });

// Links
<Link href={route('admin.bookings.index')}>...</Link>

// Dynamic <head>
<Head title="Page Title" />
```

### Flash messages via usePage
```tsx
const { flash } = usePage<PageProps>().props;
```

---

## 2. HTTP Fetch Rules (NO AXIOS — EVER)

> **Axios was removed for security. All async HTTP calls MUST use `@/lib/api`.**

```ts
import { apiGet, apiPost, apiPut, apiPostForm, apiDelete } from '@/lib/api';

// GET with query params
const data = await apiGet<ResponseType>('/api/endpoint', { key: 'value' });

// POST JSON
const result = await apiPost<ResponseType>('/api/endpoint', payload);

// PUT JSON
await apiPut('/api/endpoint', payload);

// File upload (FormData)
const fd = new FormData();
fd.append('file', file);
const r = await apiPostForm<ResponseType>('/api/endpoint', fd);

// DELETE with optional body
await apiDelete('/api/endpoint', { id: 1 });
```

**Error handling:** `api.ts` throws `{ status, message, data }` — catch without `.response.data`:
```ts
} catch (error: any) {
    toast.error(error?.data?.message || error?.message || 'Error');
}
```

---

## 3. Backend Architecture Rules

### 3A. Routes (`routes/web.php`)
```php
// ✅ Grouped, named, minimal
Route::controller(BookingController::class)
    ->prefix('bookings')
    ->as('bookings.')
    ->middleware('auth')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::get('/{booking}', 'show')->name('show');
    });
```

### 3B. Controllers — thin (max ~100 lines each)
```php
// ✅ Controller only: validates, delegates to Service, returns Inertia
public function store(StoreBookingRequest $request): Response
{
    $booking = $this->bookingService->create($request->validated());
    return redirect()->route('admin.bookings.show', $booking);
}

// ❌ NEVER put business logic inside controller
```

### 3C. Services — `app/Services/`
All business logic lives in Services. Constructor-inject dependencies:
```php
final class BookingService
{
    public function __construct(
        private readonly AvailabilityService $availability,
        private readonly RateCalculationService $rates,
    ) {}

    public function create(array $data): Booking { ... }
}
```

### 3D. Actions — `app/Actions/` 
Single-responsibility operations (e.g. `CreateBookingAction`, `ConvertPlanToArticleAction`).

### 3E. Jobs — `app/Jobs/`
All side-effects (email, API calls, heavy processing) — always queued:
```php
SendBookingConfirmationJob::dispatch($booking);
GenerateArticleJob::dispatch($contentPlan);
```

### 3F. Observers — `app/Observers/`
Model lifecycle hooks (auto-slug, file cleanup, index sync):
```php
// Registered in AppServiceProvider or ObserverServiceProvider
Article::observe(ArticleObserver::class);
```

### 3G. FormRequests — `app/Http/Requests/`
ALL validation in FormRequest classes. Never `$request->validate()` inline.

### 3H. Models
- Define `$fillable` or `$guarded`
- Use `Attribute::make()` for accessors
- Use Local Scopes for repeated queries
- Relationships are defined explicitly with return types

---

## 4. Frontend Architecture Rules

### 4A. Directory Structure
```
resources/js/
├── components/
│   ├── ui/              # Pure Radix/shadcn atoms (Button, Input, Dialog...)
│   ├── booking/         # Domain: booking components
│   ├── Article/         # Domain: article components
│   ├── Features/        # Smart domain components
│   ├── seo/             # SEO components
│   └── *.tsx            # Shared layout/structural components
├── pages/               # Inertia route targets (one per route)
│   ├── Admin/
│   ├── Booking/
│   ├── Properties/
│   └── ...
├── hooks/               # Custom React hooks
├── lib/
│   ├── api.ts           # ← ONLY HTTP client
│   └── *.ts             # Utilities, echo, i18n, etc.
├── layouts/             # AdminLayout, GuestLayout
├── types/               # TypeScript interfaces
└── locales/             # i18n JSON files
```

### 4B. Component Rules
- **Max 150 lines per component** — split if exceeded
- Pages in `pages/` = Inertia targets only — never export sub-components from them
- Complex `useState`/`useEffect` → extract to `hooks/use[Feature].ts`
- `ui/` components = zero domain logic, fully reusable

### 4C. Styling
```tsx
// ✅ Use clsx + tailwind-merge for conditional classes
import { cn } from '@/lib/utils'; // wraps clsx + twMerge

<div className={cn('base-class', isActive && 'active-class', className)} />

// ❌ Never inline style for layout — use Tailwind
```

### 4D. Forms
```tsx
// ✅ Server mutations → Inertia useForm (preserves Inertia state + errors)
const { data, setData, post, processing, errors } = useForm({ title: '' });

// ✅ Complex client-side forms → react-hook-form + zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// ❌ Never both patterns in the same component
```

### 4E. Routes in JS
```tsx
// ✅ Always use ziggy route() helper
import { route } from 'ziggy-js';
<Link href={route('admin.articles.edit', article.slug)}>Edit</Link>
router.visit(route('admin.bookings.index'));
```

### 4F. SEO
```tsx
// Always add Head for every page
<Head title="Page Title — Homsjogja" />
// Schema.org via SeoHead/SchemaOrg components
<SeoHead />
<SchemaOrg />
```

---

## 5. Real-time (Echo + Pusher)

```ts
// Use @/lib/echo.ts (not window.Echo directly)
import { getEcho } from '@/lib/echo';
const echo = getEcho();
echo.private(`booking.${userId}`)
    .listen('BookingConfirmed', handler);
```

Always cleanup in `useEffect` return:
```ts
return () => { channel.stopListening('BookingConfirmed'); };
```

---

## 6. TypeScript Rules

- **All files are `.tsx` / `.ts`** — no `.jsx`/`.js` in `resources/js/`
- `strict: true` must remain on
- Use generics for `apiGet<T>`, `useForm<T>`, etc.
- Use `type PageProps` from `@/types` for `usePage<PageProps>()`
- Avoid `any` — prefer `unknown` then narrow, or explicit interfaces

---

## 7. Pre-coding Checklist (run mentally before every change)

1. **Scan for duplication** — does a Service/Hook/Component already do this?
2. **Location check**:
   - Side-effect (email, push, API)? → **Job**
   - Model lifecycle? → **Observer**
   - Business logic (>5 lines)? → **Service**
   - Validation? → **FormRequest**
   - Client async HTTP? → `apiGet/apiPost` from `@/lib/api`
3. **Inertia v3** — no v2/v1 imports or patterns
4. **No axios** — will break build if imported
5. **Component size** — >150 lines → split now

---

## 8. Running the Application

```bash
# Development (server + queue + vite)
composer run dev

# Build (client + SSR)
npm run build

# Tests
composer run test

# Format PHP
./vendor/bin/pint

# Format JS/TS
npm run format
npm run lint
```

---

## 9. Composer Version Integrity

```json
// composer.json — MUST stay at these constraints:
"inertiajs/inertia-laravel": "3.0",   // exact — do NOT loosen to ^2
"laravel/framework": "^13.0"
```

> **Warning:** Running `composer update` without specifying packages may downgrade inertia-laravel.
> Always run: `composer update laravel/framework` (specific package) or use `--with-all-dependencies` carefully.
