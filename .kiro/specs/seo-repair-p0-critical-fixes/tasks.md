# Implementation Plan

## TASK-001 — Property Detail 500s

> ⚠️ **CATATAN PENTING**: Bug ini data-specific — hanya terjadi di production database karena 6 properti tersebut punya kolom `weekend_premium_percent = null` atau `base_rate` bermasalah. Database lokal tidak mereproduksi kondisi ini. Oleh karena itu:
> - **Exploration & preservation tests** menggunakan **unit test dengan mock data** (tidak butuh database prod)
> - **Verifikasi akhir** dilakukan dengan **hit production URL langsung** setelah deploy

- [x] 1. Write bug condition exploration unit test for property detail 500s
  - **Property 1: Bug Condition** - `AvailabilityService::getAvailabilityData()` throws on null/zero rate columns
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: Bug cannot be reproduced via `GET /properties/{slug}` locally because local DB does not have the same null column data as production. Use unit tests with mocked Property models instead.
  - Create `tests/Unit/Services/AvailabilityServiceBugConditionTest.php` using `php artisan make:test --phpunit --unit Services/AvailabilityServiceBugConditionTest`
  - Test case A: create a mock `Property` with `weekend_premium_percent = null` and valid `base_rate`, call `AvailabilityService::getAvailabilityData($property, today(), today()->addDays(3))` — assert it does NOT throw and returns a valid array
  - Test case B: create a mock `Property` with `base_rate = 0` and `weekend_premium_percent = null`, call `getAvailabilityData()` — assert it does NOT throw
  - Test case C: mock `RateCalculationService::calculateRate()` to throw `\TypeError` for a specific date, call `getAvailabilityData()` — assert it does NOT throw and the failing day falls back to `base_rate`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL — confirms `getAvailabilityData()` throws `\TypeError` or `\DivisionByZeroError` when property has null rate columns
  - Document the exception type and message (e.g., `TypeError: Unsupported operand types: null / int`)
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation unit tests for working property data (BEFORE implementing fix)
  - **Property 2: Preservation** - `getAvailabilityData()` produces correct output for valid property data
  - **IMPORTANT**: Follow observation-first methodology — these tests must PASS on unfixed code
  - Create `tests/Unit/Services/AvailabilityServicePreservationTest.php` using `php artisan make:test --phpunit --unit Services/AvailabilityServicePreservationTest`
  - Test case A: mock a `Property` with valid non-null `base_rate = 500000` and `weekend_premium_percent = 20`, call `getAvailabilityData()` for a 3-day range — assert it returns a non-empty `rates` array where each day has a non-null `total_rate`
  - Test case B: mock a `Property` with valid data and no seasonal rates — assert `getAvailabilityData()` returns the same result before and after the fix (preservation)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS — confirms baseline behavior for valid data is preserved
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2_

- [ ] 3. Fix TASK-001 — per-day rate calculation guard in AvailabilityService

  - [x] 3.1 Implement the try/catch guard in `AvailabilityService::getAvailabilityData()`
    - Open `app/Services/AvailabilityService.php`
    - Locate the `for` loop inside `getAvailabilityData()` that calls `$this->rateCalculationService->calculateRate()`
    - Wrap the `calculateRate()` call and the `$rates[$dateString] = [...]` assignment in a `try/catch (\Throwable $e)` block
    - In the catch block: call `Log::warning('Rate calculation failed for date', ['property_id' => $property->id, 'date' => $dateString, 'error' => $e->getMessage()])` and assign a fallback entry: `$rates[$dateString] = ['base_rate' => $property->base_rate, 'weekend_premium' => $currentDate->isFriday() || $currentDate->isSaturday() || $currentDate->isSunday(), 'seasonal_premium' => 0, 'is_weekend' => $currentDate->isFriday() || $currentDate->isSaturday() || $currentDate->isSunday(), 'seasonal_rate_applied' => null, 'total_rate' => (int) ($property->base_rate ?? 0)]`
    - Add `use Illuminate\Support\Facades\Log;` import if not already present
    - Run `vendor/bin/pint --dirty --format agent` after editing
    - _Bug_Condition: `isBugCondition_001(property)` — `base_rate` IS NULL OR `base_rate` = 0 OR `weekend_premium_percent` IS NULL OR seasonal rate `calculateRate()` throws_
    - _Expected_Behavior: `getAvailabilityData()` completes the loop without throwing; failing days fall back to `base_rate`_
    - _Preservation: Properties with valid `base_rate` and `weekend_premium_percent` produce identical rate arrays before and after the fix_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [x] 3.2 Verify unit tests now pass locally
    - Re-run the SAME tests from tasks 1 and 2
    - Run `php artisan test --compact tests/Unit/Services/AvailabilityServiceBugConditionTest.php tests/Unit/Services/AvailabilityServicePreservationTest.php`
    - **EXPECTED OUTCOME**: All tests PASS — confirms the guard works correctly with mocked data
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [~] 3.3 Verify fix on production after deploy
    - **⚠️ This step requires deployment to production first**
    - After deploying, hit each of the 6 affected production URLs and confirm HTTP 200:
      ```
      curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -A "Mozilla/5.0" https://homsjogja.com/properties/villahoms
      curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -A "Mozilla/5.0" https://homsjogja.com/properties/cubic-villa
      curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -A "Mozilla/5.0" https://homsjogja.com/properties/sun-emerald
      curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -A "Mozilla/5.0" https://homsjogja.com/properties/toscana-malioboro
      curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -A "Mozilla/5.0" https://homsjogja.com/properties/abrenara-malioboro
      curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -A "Mozilla/5.0" https://homsjogja.com/properties/sapphire
      ```
    - All 6 must return `200`
    - Also confirm no new exceptions in `storage/logs/laravel.log` (warnings for fallback days are expected and OK)
    - _Requirements: 2.1, 2.2_

---

## TASK-002 — Articles Index 500

- [x] 4. Write bug condition exploration test for articles index 500
  - **Property 3: Bug Condition** - Articles Index 500 on Corrupt Cache Entry
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the cache corruption bug
  - **Scoped PBT Approach**: Scope to two concrete failing cases: (a) stale `__PHP_Incomplete_Class` cache entry, (b) corrupt non-array cache entry
  - Create `tests/Feature/ArticleController/ArticlesIndex500BugConditionTest.php` using `php artisan make:test --phpunit ArticleController/ArticlesIndex500BugConditionTest`
  - Test case A: compute the cache key `'articles_index_v2_' . md5(json_encode(['page' => null, 'language' => null, 'search' => null]))`, seed it with a non-array corrupt value (e.g. `Cache::put($cacheKey, 'corrupt_string', 3600)`), then call `GET /articles` and assert HTTP 200
  - Test case B: seed the cache key with a serialized object string that would deserialize as `__PHP_Incomplete_Class`, then call `GET /articles` and assert HTTP 200
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL with `\Error` or `\Exception` — confirms the cache retrieval bug
  - Document counterexamples found (e.g., `GET /articles` with corrupt cache → 500, `Error: Cannot use object of type __PHP_Incomplete_Class as array`)
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.3, 1.4_

- [x] 5. Write preservation property tests for articles (BEFORE implementing fix)
  - **Property 4: Preservation** - Article Detail and Admin Index Unaffected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `GET /articles/{slug}` for any published article returns 200 on unfixed code
  - Observe: `GET /admin/articles` returns 200 on unfixed code (authenticated as admin)
  - Observe: `GET /articles` with a valid (non-corrupt) cache entry returns 200 on unfixed code
  - Create `tests/Feature/ArticleController/ArticlesPreservationTest.php` using `php artisan make:test --phpunit ArticleController/ArticlesPreservationTest`
  - Write feature test: `GET /articles/{slug}` for a published article returns HTTP 200 (unaffected by fix)
  - Write feature test: `GET /admin/articles` returns HTTP 200 (authenticated as admin, unaffected by fix)
  - Write feature test: `GET /articles` with a valid pre-seeded cache array returns HTTP 200 and does NOT flush the cache key
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS — confirms baseline behavior to preserve
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.3, 3.4_

- [ ] 6. Fix TASK-002 — cache corruption guard in `ArticleController::publicIndex()`

  - [x] 6.1 Implement the try/catch wrapper around `Cache::remember()` in `publicIndex()`
    - Open `app/Http/Controllers/ArticleController.php`
    - Locate the `$articlesData = Cache::remember($cacheKey, 3600, ...)` call in `publicIndex()`
    - Wrap the entire `Cache::remember()` call in a `try/catch (\Throwable $e)` block
    - In the catch block: call `Log::warning('Articles index cache corrupt, flushing', ['key' => $cacheKey, 'error' => $e->getMessage()])`, then `Cache::forget($cacheKey)`, then re-execute the query directly: `$articlesData = $query->paginate(12)->toArray()`
    - Add `use Illuminate\Support\Facades\Log;` import if not already present (check existing imports first)
    - Run `vendor/bin/pint --dirty --format agent` after editing
    - _Bug_Condition: `isBugCondition_002(request)` — cache entry for `articles_index_v2_{md5}` is `__PHP_Incomplete_Class` OR cache entry is non-array OR query inside closure throws `QueryException`_
    - _Expected_Behavior: `publicIndex()` flushes the corrupt cache key, re-executes the query, and returns HTTP 200 with a valid paginated article list_
    - _Preservation: Requests to `/articles/{slug}` and `/admin/articles` are unaffected; valid cache entries are not flushed_
    - _Requirements: 2.3, 2.4, 3.3, 3.4_

  - [x] 6.2 Verify bug condition exploration test now passes
    - **Property 3: Expected Behavior** - Articles Index 500 on Corrupt Cache Entry
    - **IMPORTANT**: Re-run the SAME tests from task 4 — do NOT write new tests
    - Run `php artisan test --compact tests/Feature/ArticleController/ArticlesIndex500BugConditionTest.php`
    - **EXPECTED OUTCOME**: Tests PASS — confirms `/articles` returns 200 with corrupt cache and that the cache key is flushed
    - _Requirements: 2.3, 2.4_

  - [x] 6.3 Verify preservation tests still pass
    - **Property 4: Preservation** - Article Detail and Admin Index Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 5 — do NOT write new tests
    - Run `php artisan test --compact tests/Feature/ArticleController/ArticlesPreservationTest.php`
    - **EXPECTED OUTCOME**: Tests PASS — confirms article detail, admin index, and valid-cache paths are unaffected

---

## TASK-003 — Broken /contact Footer Link

- [x] 7. Write bug condition exploration test for broken /contact link
  - **Property 5: Bug Condition** - Contact Link Resolves to 410 Gone
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate `href="/contact"` is present in rendered HTML
  - **Scoped PBT Approach**: Scope to the two concrete failing locations: mobile bottom nav in `guest-layout.tsx` (unauthenticated) and footer Quick Links in `dashboard-layout.tsx`
  - Create `tests/Feature/Layout/ContactLinkBugConditionTest.php` using `php artisan make:test --phpunit Layout/ContactLinkBugConditionTest`
  - Test case A: call `GET /` (or any guest page) and assert the response HTML does NOT contain `href="/contact"` — this will FAIL on unfixed code because Inertia renders `<Link href="/contact">` as `<a href="/contact">`
  - Test case B: call `GET /dashboard` (authenticated) and assert the response HTML does NOT contain `href="/contact"` — this will FAIL on unfixed code
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL — confirms `href="/contact"` is present in rendered HTML
  - Document counterexamples found (e.g., response HTML contains `<a href="/contact"`)
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.5, 1.6_

- [x] 8. Write preservation property tests for other layout links (BEFORE implementing fix)
  - **Property 6: Preservation** - All Other Footer and Nav Links Unaffected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: footer links `/about`, `/faq`, `/properties`, `/articles`, `/privacy`, `/tos` are present and correct on unfixed code
  - Observe: `tel:` and `mailto:` links are present and correct on unfixed code
  - Observe: `GET /contact` returns HTTP 410 on unfixed code (route-level 410 must be preserved)
  - Create `tests/Feature/Layout/LayoutLinksPreservationTest.php` using `php artisan make:test --phpunit Layout/LayoutLinksPreservationTest`
  - Write feature test: `GET /` response HTML contains `href="/about"`, `href="/properties"`, `href="/articles"`, `href="/faq"` (guest layout footer links are intact)
  - Write feature test: `GET /` response HTML contains `href="mailto:contact@homsjogja.com"` and `href="tel:+628112500082"` (contact detail links unchanged)
  - Write feature test: `GET /contact` returns HTTP 410 (route-level 410 preserved)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS — confirms baseline behavior to preserve
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.5, 3.6, 3.7_

- [ ] 9. Fix TASK-003 — replace `<Link href="/contact">` with WhatsApp `<a>` in both layout files

  - [x] 9.1 Update `guest-layout.tsx` mobile bottom nav
    - Open `resources/js/layouts/guest-layout.tsx`
    - Locate the `<Link href="/contact">` element inside the mobile bottom nav (the unauthenticated branch of the `<nav className="md:hidden ...">` block)
    - Replace it with:
      ```tsx
      <a
        href="https://wa.me/628112500082"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center py-1 px-2 text-xs text-muted-foreground hover:text-brand-primary transition-colors"
      >
        <Phone className="h-4 w-4 mb-0.5" />
        <span className="font-medium text-[10px] leading-tight">{t('nav.contact')}</span>
      </a>
      ```
    - Do NOT touch any other links in the file
    - _Bug_Condition: `isBugCondition_003(element)` — element is `<Link href="/contact">` in `guest-layout.tsx` mobile nav_
    - _Expected_Behavior: element renders as `<a href="https://wa.me/628112500082" target="_blank" rel="noopener noreferrer">` opening WhatsApp in a new tab_
    - _Preservation: All other links in `guest-layout.tsx` (footer Quick Links, Legal, Contact section `mailto:`/`tel:`) remain unchanged_
    - _Requirements: 2.5, 2.6, 3.5, 3.6, 3.7_

  - [x] 9.2 Update `dashboard-layout.tsx` footer Quick Links
    - Open `resources/js/layouts/dashboard-layout.tsx`
    - Locate the `<Link href="/contact">` element inside the footer Quick Links `<ul>` block
    - Replace it with:
      ```tsx
      <a
        href="https://wa.me/628112500082"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-primary transition-colors"
      >
        Contact Us
      </a>
      ```
    - Do NOT touch any other links in the file
    - _Bug_Condition: `isBugCondition_003(element)` — element is `<Link href="/contact">` in `dashboard-layout.tsx` footer_
    - _Expected_Behavior: element renders as `<a href="https://wa.me/628112500082" target="_blank" rel="noopener noreferrer">` opening WhatsApp in a new tab_
    - _Preservation: All other links in `dashboard-layout.tsx` (Browse Properties, Help Center, `mailto:`, `tel:`) remain unchanged_
    - _Requirements: 2.5, 2.6, 3.5, 3.6, 3.7_

  - [x] 9.3 Verify bug condition exploration test now passes
    - **Property 5: Expected Behavior** - Contact Link Resolves to 410 Gone
    - **IMPORTANT**: Re-run the SAME tests from task 7 — do NOT write new tests
    - Run `php artisan test --compact tests/Feature/Layout/ContactLinkBugConditionTest.php`
    - **EXPECTED OUTCOME**: Tests PASS — confirms no `href="/contact"` in rendered HTML and WhatsApp link is present with correct `target` and `rel` attributes
    - _Requirements: 2.5, 2.6_

  - [x] 9.4 Verify preservation tests still pass
    - **Property 6: Preservation** - All Other Footer and Nav Links Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 8 — do NOT write new tests
    - Run `php artisan test --compact tests/Feature/Layout/LayoutLinksPreservationTest.php`
    - **EXPECTED OUTCOME**: Tests PASS — confirms all other footer links, `mailto:`/`tel:` links, and the `/contact` 410 route are unaffected

---

## Checkpoint

- [x] 10. Checkpoint — Ensure all tests pass
  - Run the full test suite for all three bug fixes: `php artisan test --compact tests/Feature/AvailabilityService/ tests/Feature/ArticleController/ tests/Feature/Layout/`
  - Ensure all six test files pass: `PropertyDetail500BugConditionTest`, `PropertyDetailPreservationTest`, `ArticlesIndex500BugConditionTest`, `ArticlesPreservationTest`, `ContactLinkBugConditionTest`, `LayoutLinksPreservationTest`
  - If any test fails, diagnose and fix before marking complete
  - Ask the user if they would like to run the full test suite (`php artisan test --compact`) to confirm no regressions across the entire application
