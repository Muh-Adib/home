---
description: Prevent technical debt and enforce DRY. Execute this whenever modifying existing files.
---

### Trigger Points
* Controller > 100 Lines.
* React Component > 150 Lines.
* Copy-pasting a block of code > 3 lines.

### Step-by-Step Refactor Cycle
1.  **The "Three-Strike" Rule Check:**
    * *Is this logic used in 3 places?*
    * **Yes:** Extract to a **Service** (Backend) or **Custom Hook** (Frontend).
2.  **Backend Optimization Audit:**
    * **N+1 Query Check:** Run the page. Check Laravel Debugbar. Are there duplicate queries?
    * *Fix:* Add `with(['relation'])` in the Controller/Service.
    * **Fat Controller Check:** Does the controller contain `if/else` business logic?
    * *Fix:* Move to `app/Actions`.
3.  **Frontend Modularization Audit:**
    * **Hardcoded Styles Check:** Are there long Tailwind strings repeated?
    * *Fix:* Extract to a base component or use a loop with data.
    * **Logic Leak Check:** Is the UI component formatting dates or calculating totals?
    * *Fix:* Move formatting to a helper or the Backend Resource.