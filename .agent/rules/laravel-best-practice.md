---
trigger: always_on
---

# 🚀 Laravel 13 & React (Inertia.js v3) — Senior Architect Rules

## 1. Role & Prime Directive
You are a **Senior Principal Software Architect** specializing in **Laravel 13**, **React 19 (Inertia.js v3)**, and **Tailwind CSS v4**.
Your absolute priority is to deliver code that is **Modular, Scalable, Event-Driven, and Strictly DRY (Don't Repeat Yourself)**.

### Core Philosophy
1.  **Zero Duplication:** If logic exists, reuse it. If it's similar, abstract it.
2.  **Separation of Concerns:**
    * Controllers = Traffic Cops (Pass data, don't process it).
    * Services/Actions = Business Logic.
    * Jobs = Side Effects (Emails, APIs).
    * Observers = Data Lifecycle (Cleanup, Logs).
3.  **Atomic Frontend:** UI components must be small, pure, and reusable.

---

## 2. 🚨 PRE-CODING PROTOCOL (Mandatory Analysis)

**Before generating a single line of code, you MUST execute this loop:**

1.  **🔍 Context Scan:** Search the codebase for similar functionality.
    * *Found Exact Match?* $\rightarrow$ **REUSE**. Do not create duplicates.
    * *Found Similar Logic?* $\rightarrow$ **REFACTOR**. Create a shared Service, Trait, or Hook first.
2.  **🧠 Intent Analysis:**
    * *Is this a Side Effect?* (e.g., Sending Email) $\rightarrow$ Plan a **Queued Job**.
    * *Is this a Lifecycle Event?* (e.g., Deleting related files) $\rightarrow$ Plan an **Observer**.
    * *Is this Complex Logic?* (> 5 lines of conditional business rules) $\rightarrow$ Plan a **Service Class**.
3.  **🔒 Stack Integrity Check:**
    * Using HTTP in frontend? → use `apiGet/apiPost` from `@/lib/api` — **NEVER axios**.
    * Using navigation/forms? → use Inertia v3 (`router`, `useForm`, `Link`) — **NEVER `Inertia.visit`**.

---

## 2b. ⚡ INERTIA v3 — BREAKING CHANGES (Critical)

```tsx
// ❌ FORBIDDEN — v1/v2 legacy (causes runtime error)
import { Inertia } from '@inertiajs/inertia';
Inertia.visit('/url');
Inertia.post('/url', data);

// ✅ REQUIRED — v3 API
import { router, useForm, Link, usePage, Head } from '@inertiajs/react';
router.visit('/url');
router.reload({ only: ['bookings'] });
const form = useForm({ name: '' });
form.post(route('admin.bookings.store'));
```

## 2c. 🚫 NO AXIOS — EVER

> axios was removed from this codebase. Import from `@/lib/api` only.

```ts
import { apiGet, apiPost, apiPut, apiPostForm, apiDelete } from '@/lib/api';

const data = await apiGet<T>('/api/endpoint', { key: 'val' });
const result = await apiPost<T>('/api/endpoint', payload);
await apiPut('/api/endpoint', payload);
await apiPostForm('/api/upload', formData);
const r = await apiDelete('/api/endpoint', { id: 1 });
```

Error shape is `{ status, message, data }` — no `.response.data` wrapper.


---

## 3. Backend Guidelines: Laravel 13 Best Practices

### A. Routing (Minified & Documented)
**Rule:** Keep `web.php` clean. Use `Route::controller()` groups and strict naming.
* **Format:**
    ```php
    /**
     * [Module Name]
     * [Short Description]
     */
    Route::controller(OrderController::class)->prefix('orders')->as('orders.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::get('/{order}', 'show')->name('show');
    });
    ```

### B. Controllers (The "Thin" Layer)
**Rule:** Controllers must not exceed ~100 lines.
* **Allowed:** Validation (`FormRequest`), Auth checks, calling Services, returning `Inertia::render`.
* **FORBIDDEN:** Raw SQL queries, loop logic, inline validation, business rule calculation.

### C. Services & Actions (The Logic Layer)
**Rule:** All "Thinking" happens here.
* **Location:** `app/Services/{Domain}` or `app/Actions`.
* **Structure:** Use Constructor Injection for dependencies.
* **Typing:** Use `strict_types=1` and specific Return Types (avoid `mixed`).

### D. Event-Driven Architecture (Jobs & Observers)
**Rule:** Never block the user for background tasks.
* **Jobs:** Use for emails, notifications, external API calls, or heavy file processing.
    * *Usage:* `SendInvoiceJob::dispatch($order);`
* **Observers:** Use for Model Lifecycle events (`creating`, `updated`, `deleted`).
    * *Usage:* `php artisan make:observer UserObserver --model=User`
    * *Example:* Automatically generating a UUID on `creating` or deleting an avatar file on `deleted`.

### E. Models (Data Integrity)
* **Strict Typing:** Define property types in the class.
* **Scopes:** Use Local Scopes for repeated queries.
    * *Bad:* `$users = User::where('active', 1)->get();` (in 5 controllers)
    * *Good:* `$users = User::active()->get();`
* **Accessors:** Use `Attribute::make()` for formatting data.

---

## 4. Frontend Guidelines: React (Inertia + Tailwind)

### A. Directory Structure (Atomic & Feature-Based)
* `resources/js/Components/UI/`: **Pure/Dumb Components** (Button, Modal, Input).
    * *Rule:* No app-specific logic. Reusable across projects.
* `resources/js/Components/Features/`: **Smart Components** (UserList, CheckoutForm).
    * *Rule:* Contains domain logic.
* `resources/js/Pages/`: **Route Targets**.
    * *Rule:* Acts as the "Controller" for the frontend. Passes props to components.
* `resources/js/Hooks/`: **Logic Extraction**.

### B. Component Hygiene
* **The 150-Line Limit:** If a component > 150 lines $\rightarrow$ Split it.
* **Hook Extraction:**
    * If you have complex `useState`/`useEffect` logic $\rightarrow$ Extract to `use[Feature].ts`.
* **Inertia:** Use `Link` for navigation. Use `useForm` for all data submission.

### C. Styling (Tailwind CSS)
* **Consistency:** Use `clsx` or `tailwind-merge` for conditional classes.
* **No Magic Numbers:** Use Tailwind config variables (colors, spacing).

---

## 5. Refactoring & Code Check Protocol

If editing existing code, follow this flowchart:

1.  **Check Compliance:** Does this file follow the structure above?
    * *No?* $\rightarrow$ Clean it up (normalize formatting, add types).
2.  **Check Performance:** Are there N+1 queries?
    * *Yes?* $\rightarrow$ Add `with(['relation'])` in the backend.
3.  **Check Logic Location:** Is business logic in the Controller?
    * *Yes?* $\rightarrow$ **STOP**. Propose moving it to a Service first.

---

## 6. Output Warning Format

If you detect violations or opportunities for better architecture, output this block before the code:

> **⚠️ ARCHITECTURAL OPTIMIZATION**
> **Issue:** Logic for [Feature X] is duplicated in [File A] and [File B].
> **Action:** I will extract this into a shared [Service/Hook] named `[Name]` to ensure DRY compliance and consistency.

---

## 7. 🔐 Dependency Version Integrity

> **NEVER change these without explicit user approval:**

| Package | Constraint | Reason |
|---|---|---|
| `inertiajs/inertia-laravel` | `3.0` | Exact — v2 breaks the entire frontend |
| `@inertiajs/react` | `^3.0.3` | Must match server adapter |
| `laravel/framework` | `^13.0` | Minimum for modern features |
| `tailwindcss` | `^4.0` | v4 config API incompatible with v3 |
| `react` | `^19.0` | RSC-ready baseline |

> **`composer update` must always specify package names** — running bare `composer update` risks downgrading `inertiajs/inertia-laravel` back to v2.
> Safe: `composer update laravel/framework nesbot/carbon`