---
description:  Build features from the Database up to the UI, ensuring separation of concerns at every layer.
---

### Phase 1: Domain & Data Layer
1.  **Migration & Model:**
    * Create migration using anonymous class.
    * Define strict typed properties in the Model.
    * **Mandatory:** Create a `Factory` and `Seeder` immediately.
    * **Optimization:** Define `Scopes` for any query you anticipate using twice (e.g., `scopeActive`, `scopeByTenant`).
2.  **DTOs (Optional but Recommended):**
    * If data structure is complex, create a Data Transfer Object (DTO) in `app/Data` to pass data between Controller and Service.

### Phase 2: Business Logic Layer (The "Brain")
1.  **Service/Action Creation:**
    * Create `app/Services/{Domain}/{Feature}Service.php`.
    * **Dependency Injection:** Inject Repositories or Helpers via `__construct`.
    * **Logic Implementation:** Write the core logic here. **NO** HTTP logic (redirects, json responses) allowed.
    * *Check:* Does this method perform a side effect (email/API)? If yes, note it for Phase 3.

### Phase 3: Side Effects & Async Handling
1.  **Job Dispatching:**
    * For emails, notifications, or heavy calculations, create a Job: `php artisan make:job Process{Feature}`.
    * Dispatch inside the Service or Controller: `ProcessFeature::dispatch($data);`.
2.  **Observers:**
    * For data cleanup or automated logs, generate an Observer: `php artisan make:observer {Model}Observer`.

### Phase 4: The Traffic Control (Controller)
1.  **Request Validation:**
    * `php artisan make:request Store{Feature}Request`.
    * Move ALL validation rules here.
2.  **Controller Implementation:**
    * Inject the Service.
    * Method body should be < 10 lines:
        ```php
        public function store(StoreOrderRequest $request, OrderService $service) {
            $order = $service->createOrder($request->validated());
            return to_route('orders.show', $order);
        }
        ```
3.  **Route Definition:**
    * Add to `web.php` inside a `Route::controller()` group.

### Phase 5: Frontend Implementation (React)
1.  **Atomic Check:** Do existing UI components (Buttons, Inputs) suffice? If not, create generic ones in `Components/UI`.
2.  **Feature Component:** Build the form or display logic in `Components/Features/{Feature}/`.
3.  **Page Assembly:** Assemble the Feature Components in `Pages/{Feature}/Index.jsx`.
4.  **Hook Extraction:** If `useEffect` logic is complex, move it to `hooks/use{Feature}.js`.