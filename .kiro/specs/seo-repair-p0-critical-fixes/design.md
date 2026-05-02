# SEO Repair P0 Critical Fixes — Bugfix Design

## Overview

Three independent P0 bugs are causing HTTP 500 errors and a broken navigation link that
collectively degrade SEO rankings and user experience on homsjogja.com.

- **TASK-001**: Six property detail pages return 500 because `AvailabilityService::getAvailabilityData()`
  calls `RateCalculationService::calculateRate()` once per day over a 90-day window with no per-iteration
  guard. A null/zero `base_rate`, a null `weekend_premium_percent`, or a malformed seasonal rate record
  on any of the six affected properties causes an unhandled exception that propagates out of the loop
  and re-throws as a 500.

- **TASK-002**: `/articles` returns 500 because `ArticleController::publicIndex()` stores the paginator
  result in the cache. A stale or corrupt cache entry (e.g. a serialised `LengthAwarePaginator` stored
  before the current `toArray()` guard was added, or a missing column referenced in the query) causes
  an unhandled exception on cache retrieval that is not caught.

- **TASK-003**: Every page rendered through `guest-layout.tsx` and `dashboard-layout.tsx` contains
  `<Link href="/contact">` in the mobile nav / footer. The `/contact` route is registered as 410 Gone
  in `routes/web.php`. The fix replaces the internal Inertia `<Link>` with a plain `<a>` pointing to
  the WhatsApp number.

The fix strategy for each bug is minimal and targeted: add the missing guard at the lowest-level
call site, flush the specific cache key on retrieval failure, and swap two link elements in two
layout files. No schema changes, no new dependencies.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs that trigger the defective code path.
- **Property (P)**: The desired observable behavior when the bug condition holds after the fix is applied.
- **Preservation**: All behaviors that must remain identical before and after the fix.
- **`RateCalculationService::calculateRate()`**: `app/Services/RateCalculationService.php` — iterates
  day-by-day over a date range and accumulates rate totals. Throws `\InvalidArgumentException` for
  zero-night stays; may throw `\TypeError` or `\DivisionByZeroError` when property columns are null/zero.
- **`AvailabilityService::getAvailabilityData()`**: `app/Services/AvailabilityService.php` — builds the
  90-day availability + rates array used by `PropertyController::show()`. Calls `calculateRate()` once
  per day with no per-iteration try/catch.
- **`ArticleController::publicIndex()`**: `app/Http/Controllers/ArticleController.php` — caches the
  paginator result under a key derived from query params. The outer `Cache::remember()` call has no
  exception handler.
- **`guest-layout.tsx`** / **`dashboard-layout.tsx`**: `resources/js/layouts/` — shared layout
  components that render the mobile bottom nav and footer. Both contain `<Link href="/contact">`.
- **410 Gone**: HTTP status returned by the `/contact` route in `routes/web.php` via the
  `$legacyStandalone` array.

---

## Bug Details

### TASK-001 — Property Detail 500

#### Bug Condition

The bug manifests when `PropertyController::show()` calls `Cache::remember()` for the availability
block, which in turn calls `AvailabilityService::getAvailabilityData()`. Inside that method, a
`for` loop calls `RateCalculationService::calculateRate()` once per day over a 90-day window.
For the six affected properties, at least one day in that window triggers an unhandled exception
inside `calculateRate()` — most likely a `\TypeError` from casting `null` to `int` on `base_rate`
or `weekend_premium_percent`, or a `\DivisionByZeroError` from `$property->weekend_premium_percent / 100`
when the value is stored as `null` rather than `0`.

```
FUNCTION isBugCondition_001(property)
  INPUT: property — an Eloquent Property model instance
  OUTPUT: boolean

  RETURN property.slug IN [
           'villahoms', 'cubic-villa', 'sun-emerald',
           'toscana-malioboro', 'abrenara-malioboro', 'sapphire'
         ]
  AND (
    property.base_rate IS NULL
    OR property.base_rate = 0
    OR property.weekend_premium_percent IS NULL
    OR EXISTS seasonal_rate WHERE seasonal_rate.calculateRate(base_rate) THROWS
  )
END FUNCTION
```

#### Examples

- `GET /properties/villahoms` → 500. `base_rate` is non-null but `weekend_premium_percent` is `null`;
  `(int) round($baseRate * (null / 100))` throws `\TypeError`.
- `GET /properties/cubic-villa` → 500. A seasonal rate record's `calculateRate()` method throws
  because `rate_value` is stored as an empty string rather than a numeric value.
- `GET /properties/cendana` → 200. All rate columns are valid; the loop completes without error.
- `GET /properties/villahoms` after fix → 200. The per-day guard catches the exception and falls
  back to `base_rate` for that day; the loop continues.

---

### TASK-002 — Articles Index 500

#### Bug Condition

The bug manifests when `ArticleController::publicIndex()` calls `Cache::remember()` and the
deserialized value from the cache store is either a `__PHP_Incomplete_Class` (stale serialized
`LengthAwarePaginator`) or triggers a query exception during re-execution inside the closure.

```
FUNCTION isBugCondition_002(request)
  INPUT: request — an HTTP GET request to /articles
  OUTPUT: boolean

  cacheKey = 'articles_index_v2_' + md5(json_encode(request.only(['page','language','search'])))
  cachedValue = Cache::get(cacheKey)

  RETURN cachedValue IS __PHP_Incomplete_Class
         OR (cachedValue IS NULL AND query THROWS on execution)
END FUNCTION
```

#### Examples

- `GET /articles` with a stale cache entry → 500. `Cache::remember()` returns a
  `__PHP_Incomplete_Class` object; subsequent array access on it throws `\Error`.
- `GET /articles` with no cache entry but a missing DB column → 500. The closure throws a
  `QueryException`; `Cache::remember()` propagates it uncaught.
- `GET /articles/some-slug` → 200. The `show()` method has its own separate cache key and
  is unaffected.
- `GET /articles` after fix → 200. The outer try/catch catches the exception, flushes the
  specific cache key, and re-executes the query fresh.

---

### TASK-003 — Broken /contact Footer Link

#### Bug Condition

The bug manifests on every page load that uses `guest-layout.tsx` or `dashboard-layout.tsx`
because both files render `<Link href="/contact">` which resolves to a 410 Gone route.

```
FUNCTION isBugCondition_003(element)
  INPUT: element — a rendered React element in guest-layout or dashboard-layout
  OUTPUT: boolean

  RETURN element.type = 'Link'
         AND element.props.href = '/contact'
         AND route('/contact') returns HTTP 410
END FUNCTION
```

#### Examples

- Mobile bottom nav in `guest-layout.tsx` (unauthenticated) → clicking "Kontak" returns 410.
- Footer "Contact Us" link in `dashboard-layout.tsx` → clicking returns 410.
- Footer email/phone links (`mailto:`, `tel:`) → unaffected, continue to work.
- After fix: clicking "Kontak" opens `https://wa.me/628112500082` in a new tab.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- `GET /properties/{slug}` for the five working properties (`cendana`, `cakrawala`, `abaia-villa`,
  `pavilo-a-malioboro`, `alvera-malioboro`) must continue to return 200 with correct rate data.
- `GET /properties/{slug}` for any active property with no seasonal rates must continue to
  calculate and display the correct base rate and weekend premium.
- `GET /articles/{slug}` for any published article must continue to return 200.
- `GET /admin/articles` (admin index) must continue to return 200.
- `GET /contact` must continue to return 410 Gone (the route-level 410 is preserved; only the
  frontend links are changed).
- All other footer links (`/about`, `/faq`, `/properties`, `/articles`, legal pages) must
  continue to navigate to their correct destinations.
- The `tel:` and `mailto:` links in both layout footers must remain unchanged.

**Scope:**

- TASK-001 fix is scoped to the per-day loop inside `AvailabilityService::getAvailabilityData()`.
  No changes to `RateCalculationService::calculateRate()` itself, `PropertyController::show()`,
  or any other caller.
- TASK-002 fix is scoped to the `Cache::remember()` call inside `publicIndex()`. No changes to
  the `show()` method, admin index, or any other controller.
- TASK-003 fix is scoped to the two specific `<Link href="/contact">` elements. No other links
  in either layout file are touched.

---

## Hypothesized Root Cause

### TASK-001

1. **Null `weekend_premium_percent`**: The column has no `NOT NULL` constraint or default in the
   migration. For the six affected properties it was never set, so it is `null`. The expression
   `(int) round($baseRate * ($property->weekend_premium_percent / 100))` evaluates
   `null / 100 = null`, then `round(null)` returns `0.0` in PHP 8 but `$baseRate * null` emits a
   deprecation in PHP 8.1 and throws `\TypeError` in PHP 8.4 strict mode.

2. **Null or zero `base_rate`**: `(int) $property->base_rate` is `0` for some properties. The
   `RateCalculation` value object constructor or downstream division (`totalAmount / $nights`)
   may produce a `\DivisionByZeroError` if `$nights` is also 0 (which can happen if `addDay()`
   produces equal start/end dates due to DST transitions).

3. **Malformed seasonal rate `rate_value`**: `PropertySeasonalRate::calculateRate()` is called
   with a non-numeric `rate_value` (empty string or `null`), causing a `\TypeError` when it
   attempts arithmetic.

4. **No per-iteration guard in the loop**: `AvailabilityService::getAvailabilityData()` calls
   `calculateRate()` inside a bare `for` loop with no try/catch. A single bad day throws and
   unwinds the entire stack, bypassing `PropertyController::show()`'s outer catch (which
   re-throws anyway).

### TASK-002

1. **Stale serialized `LengthAwarePaginator`**: Before the `toArray()` guard was added to
   `publicIndex()`, the cache stored a serialized `LengthAwarePaginator` object. When PHP
   deserializes it without the class autoloaded in the correct context, it becomes
   `__PHP_Incomplete_Class`. Accessing it as an array throws `\Error`.

2. **Missing column or scope change**: If the `Article::published()` scope references a column
   that was renamed or dropped, the query inside the `Cache::remember()` closure throws a
   `QueryException` that propagates uncaught.

### TASK-003

1. **Route registered as 410 before link was updated**: The `/contact` route was added to the
   `$legacyStandalone` 410 array when the contact page was retired, but the two layout files
   were not updated to remove the internal `<Link href="/contact">`.

---

## Correctness Properties

Property 1: Bug Condition — Property Detail Pages Return 200

_For any_ property whose slug is in `['villahoms', 'cubic-villa', 'sun-emerald',
'toscana-malioboro', 'abrenara-malioboro', 'sapphire']` (i.e. `isBugCondition_001` returns
true), the fixed `AvailabilityService::getAvailabilityData()` SHALL complete the 90-day loop
without throwing, returning a valid availability array, so that `PropertyController::show()`
returns HTTP 200.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Working Properties Unaffected

_For any_ property whose slug is NOT in the six affected slugs (i.e. `isBugCondition_001`
returns false), the fixed `AvailabilityService::getAvailabilityData()` SHALL produce the same
result as the original function, preserving all rate and availability data for working properties.

**Validates: Requirements 3.1, 3.2**

Property 3: Bug Condition — Articles Index Returns 200

_For any_ HTTP GET request to `/articles` where the cache entry is stale, corrupt, or absent
(i.e. `isBugCondition_002` returns true), the fixed `ArticleController::publicIndex()` SHALL
flush the bad cache key, re-execute the query, and return HTTP 200 with a valid paginated
article list.

**Validates: Requirements 2.3, 2.4**

Property 4: Preservation — Article Detail and Admin Index Unaffected

_For any_ request to `/articles/{slug}` or `/admin/articles` (i.e. `isBugCondition_002`
returns false), the fixed code SHALL produce the same response as the original code, preserving
all article detail and admin index behavior.

**Validates: Requirements 3.3, 3.4**

Property 5: Bug Condition — Contact Link Opens WhatsApp

_For any_ rendered instance of `<Link href="/contact">` in `guest-layout.tsx` or
`dashboard-layout.tsx` (i.e. `isBugCondition_003` returns true), the fixed layout SHALL render
`<a href="https://wa.me/628112500082" target="_blank" rel="noopener noreferrer">` instead,
opening WhatsApp in a new tab rather than navigating to the 410 route.

**Validates: Requirements 2.5, 2.6**

Property 6: Preservation — All Other Links Unaffected

_For any_ link element in either layout file that does NOT have `href="/contact"` (i.e.
`isBugCondition_003` returns false), the fixed layout SHALL render the element identically to
the original, preserving all other navigation behavior.

**Validates: Requirements 3.5, 3.6, 3.7**

---

## Fix Implementation

### TASK-001 — `app/Services/AvailabilityService.php`

**Function**: `getAvailabilityData()`

**Specific Changes**:

1. **Wrap the per-day `calculateRate()` call in a try/catch**: Inside the `for` loop, catch
   `\Throwable` and fall back to a minimal rate array using `$property->base_rate` directly.
   This mirrors the existing fallback pattern already used in `PropertyController::show()` and
   `PropertyController::index()`.

2. **Guard `base_rate` and `weekend_premium_percent` before arithmetic**: Before calling
   `calculateRate()`, ensure `$property->base_rate` is cast to `(int)` and is `> 0`; if not,
   use `0` as the fallback. This prevents `\DivisionByZeroError` in the value object.

**Pseudocode for the loop body after fix:**
```
FOR each $currentDate IN [$startDate, $endDate):
  TRY
    $calculation = $this->rateCalculationService->calculateRate(
      $property, $dateString, $nextDateString, $property->capacity
    )
    $rates[$dateString] = buildRateEntry($calculation)
  CATCH \Throwable $e
    Log::warning('Rate calculation failed for date', [...])
    $rates[$dateString] = buildFallbackRateEntry($property->base_rate, $currentDate)
  END TRY
END FOR
```

**No changes** to `RateCalculationService::calculateRate()` itself — the fix is at the call
site, consistent with the existing fallback pattern in the controller layer.

---

### TASK-002 — `app/Http/Controllers/ArticleController.php`

**Function**: `publicIndex()`

**Specific Changes**:

1. **Wrap `Cache::remember()` in a try/catch**: Catch `\Throwable`. On exception, call
   `Cache::forget($cacheKey)` to flush the corrupt entry, then re-execute the query directly
   (without caching) to return a valid response.

2. **Keep the existing `toArray()` guard**: The current code already calls `$paginator->toArray()`
   inside the closure. The new outer try/catch handles the case where the cached value itself
   is already corrupt (stored before the guard existed).

**Pseudocode after fix:**
```
TRY
  $articlesData = Cache::remember($cacheKey, 3600, fn() => $query->paginate(12)->toArray())
CATCH \Throwable $e
  Log::warning('Articles index cache corrupt, flushing', ['key' => $cacheKey, 'error' => $e->getMessage()])
  Cache::forget($cacheKey)
  $articlesData = $query->paginate(12)->toArray()
END TRY
```

---

### TASK-003 — Layout Files

**Files**:
- `resources/js/layouts/guest-layout.tsx` — mobile bottom nav (line ~176)
- `resources/js/layouts/dashboard-layout.tsx` — footer Quick Links (line ~285)

**Specific Changes**:

1. **`guest-layout.tsx`**: Replace the `<Link href="/contact">` element in the mobile bottom
   nav with:
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

2. **`dashboard-layout.tsx`**: Replace the `<Link href="/contact">` element in the footer
   Quick Links section with:
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

3. **No route changes**: The `/contact` 410 route in `routes/web.php` is intentionally preserved
   per requirement 3.6.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
each bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm
or refute the root cause analysis.

**Test Plan**:

- **TASK-001**: Write a feature test that calls `GET /properties/villahoms` (or any of the six
  affected slugs) on unfixed code and asserts the response is 200. It will fail with 500,
  confirming the bug. Inspect the exception message to confirm the null/zero column hypothesis.

- **TASK-002**: Write a feature test that seeds a corrupt cache entry for the articles index key
  and then calls `GET /articles`. It will fail with 500 on unfixed code, confirming the cache
  retrieval bug.

- **TASK-003**: Write a React component test (or a DOM assertion in a feature test) that renders
  `guest-layout.tsx` and asserts no element has `href="/contact"`. It will fail on unfixed code.

**Expected Counterexamples**:
- TASK-001: `TypeError` or `DivisionByZeroError` originating from `RateCalculationService::calculateRate()`
  called from `AvailabilityService::getAvailabilityData()`.
- TASK-002: `Error: Cannot use object of type __PHP_Incomplete_Class as array` or a `QueryException`.
- TASK-003: DOM contains `<a href="/contact">` (Inertia renders `<Link>` as `<a>`).

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the
expected behavior.

**Pseudocode:**
```
FOR ALL property WHERE isBugCondition_001(property) DO
  response := GET /properties/{property.slug}
  ASSERT response.status = 200
  ASSERT response.body contains availability data with base_rate fallback
END FOR

FOR ALL request WHERE isBugCondition_002(request) DO
  seed corrupt cache entry for request.cacheKey
  response := GET /articles
  ASSERT response.status = 200
  ASSERT Cache::has(request.cacheKey) = false OR Cache::get(request.cacheKey) is valid array
END FOR

FOR ALL element WHERE isBugCondition_003(element) DO
  ASSERT element.href = 'https://wa.me/628112500082'
  ASSERT element.target = '_blank'
  ASSERT element.rel contains 'noopener noreferrer'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code
produces the same result as the original.

**Pseudocode:**
```
FOR ALL property WHERE NOT isBugCondition_001(property) DO
  ASSERT getAvailabilityData_original(property) = getAvailabilityData_fixed(property)
END FOR

FOR ALL request WHERE NOT isBugCondition_002(request) DO
  ASSERT publicIndex_original(request) = publicIndex_fixed(request)
END FOR

FOR ALL element WHERE NOT isBugCondition_003(element) DO
  ASSERT element_original = element_fixed
END FOR
```

**Testing Approach**: Property-based testing is recommended for TASK-001 preservation checking
because the rate calculation loop has many input combinations (date ranges, weekend/weekday
splits, seasonal rate presence). PBT can generate random valid property configurations and
assert that the fixed loop produces identical output to the original for properties with
well-formed data.

### Unit Tests

- **TASK-001**: Test `AvailabilityService::getAvailabilityData()` with a mock property where
  `weekend_premium_percent` is `null` — assert it returns a valid array with `base_rate` fallback.
- **TASK-001**: Test with `base_rate = 0` — assert no division-by-zero exception.
- **TASK-001**: Test with a seasonal rate whose `calculateRate()` throws — assert the loop
  continues and the day falls back to `base_rate`.
- **TASK-002**: Test `ArticleController::publicIndex()` with a seeded corrupt cache entry —
  assert HTTP 200 and that the cache key is flushed.
- **TASK-002**: Test with a valid cache entry — assert the cache is NOT flushed (no unnecessary
  invalidation).
- **TASK-003**: Assert `guest-layout.tsx` renders no `href="/contact"` elements.
- **TASK-003**: Assert `dashboard-layout.tsx` renders no `href="/contact"` elements.

### Property-Based Tests

- **TASK-001 Preservation**: Generate random `Property` instances with valid (non-null, non-zero)
  `base_rate` and `weekend_premium_percent`. Assert that `getAvailabilityData()` returns the same
  result before and after the fix for these inputs.
- **TASK-001 Fix**: Generate `Property` instances with null/zero `base_rate` or
  `weekend_premium_percent`. Assert that `getAvailabilityData()` always returns HTTP 200 (no
  exception) and that every day entry in the rates array has a non-null `total_rate`.
- **TASK-002 Preservation**: Generate random valid paginator arrays stored in cache. Assert that
  `publicIndex()` returns them unchanged and does not flush the cache key.

### Integration Tests

- **TASK-001**: `GET /properties/villahoms` → assert 200 and that `availabilityData.availability_data.rates`
  is a non-empty array.
- **TASK-001**: `GET /properties/cendana` (working property) → assert 200 and that rate data is
  unchanged from pre-fix behavior.
- **TASK-002**: `GET /articles` with no cache → assert 200 and paginated article list.
- **TASK-002**: `GET /articles` with corrupt cache → assert 200 and that the corrupt key is gone.
- **TASK-002**: `GET /articles/{slug}` → assert 200 (unaffected by fix).
- **TASK-003**: Full page render of any guest page → assert footer and mobile nav contain no
  `href="/contact"` and that the WhatsApp link is present with correct `target` and `rel`.
