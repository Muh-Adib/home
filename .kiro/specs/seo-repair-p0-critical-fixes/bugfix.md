# Bugfix Requirements Document

## Introduction

Three P0 critical bugs are degrading SEO and user experience on homsjogja.com:

1. **TASK-001 — Property detail 500s**: Six specific property slugs (`villahoms`, `cubic-villa`, `sun-emerald`, `toscana-malioboro`, `abrenara-malioboro`, `sapphire`) return HTTP 500. Five other slugs return 200 normally. The affected properties share a pattern of varying prices across pages, pointing to a failure inside `AvailabilityService::getAvailabilityData()` — which calls `RateCalculationService::calculateRate()` in a per-day loop over a 90-day window. A null, zero, or malformed value on a property-specific column (e.g. `base_rate`, `weekend_premium_percent`, `min_stay_weekday`, or a seasonal rate record) causes an unhandled exception that propagates through the outer `try/catch` and re-throws as a 500.

2. **TASK-002 — Articles index 500**: `GET /articles` returns HTTP 500 while individual `GET /articles/{slug}` pages work fine. The `publicIndex` method caches the paginator result under a key derived from query params. A stale or corrupt cache entry (e.g. a serialised `LengthAwarePaginator` object stored before the current guard was added, or a missing column referenced in the `Article::published()` scope) causes an unhandled exception on cache retrieval or query execution.

3. **TASK-003 — Broken /contact footer link**: Every page rendered through `guest-layout.tsx` and `dashboard-layout.tsx` contains `<Link href="/contact">`. The `/contact` route is explicitly registered as a `410 Gone` in `routes/web.php` (`$legacyStandalone` array). This causes every footer "Kontak" link to return 410, breaking navigation and signalling a dead page to search engines.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a visitor navigates to `/properties/villahoms`, `/properties/cubic-villa`, `/properties/sun-emerald`, `/properties/toscana-malioboro`, `/properties/abrenara-malioboro`, or `/properties/sapphire` THEN the system returns HTTP 500 and logs an unhandled exception from `PropertyController::show()`

1.2 WHEN `AvailabilityService::getAvailabilityData()` iterates over a 90-day window and calls `RateCalculationService::calculateRate()` for a property whose data causes a division, null-access, or type error THEN the system throws an uncaught `\Throwable` that bypasses the inner `try/catch` in `PropertyController::show()` and re-throws as a 500

1.3 WHEN a visitor navigates to `/articles` THEN the system returns HTTP 500 (while `/articles/{slug}` pages return 200)

1.4 WHEN `ArticleController::publicIndex()` attempts to retrieve or use a stale or corrupt cache entry for the articles paginator THEN the system throws an unhandled exception resulting in a 500

1.5 WHEN a visitor clicks the "Kontak" link in the site footer or mobile navigation THEN the system returns HTTP 410 Gone

1.6 WHEN any page rendered via `guest-layout.tsx` or `dashboard-layout.tsx` is loaded THEN the footer and mobile nav contain `<Link href="/contact">` which resolves to a 410 Gone route

---

### Expected Behavior (Correct)

2.1 WHEN a visitor navigates to `/properties/villahoms`, `/properties/cubic-villa`, `/properties/sun-emerald`, `/properties/toscana-malioboro`, `/properties/abrenara-malioboro`, or `/properties/sapphire` THEN the system SHALL return HTTP 200 with the property detail page rendered correctly

2.2 WHEN `AvailabilityService::getAvailabilityData()` encounters a property whose data causes an exception inside the per-day rate calculation loop THEN the system SHALL gracefully fall back to the property's `base_rate` for that day and continue rendering the page without a 500

2.3 WHEN a visitor navigates to `/articles` THEN the system SHALL return HTTP 200 with a paginated list of published articles

2.4 WHEN `ArticleController::publicIndex()` encounters a stale, corrupt, or unserializable cache entry THEN the system SHALL invalidate that cache entry, re-execute the query, and return a valid response without a 500

2.5 WHEN a visitor clicks the "Kontak" link in the site footer or mobile navigation THEN the system SHALL open `https://wa.me/628112500082` (WhatsApp) instead of navigating to `/contact`

2.6 WHEN any page rendered via `guest-layout.tsx` or `dashboard-layout.tsx` is loaded THEN the footer and mobile nav SHALL contain no `href="/contact"` — the link SHALL point to `https://wa.me/628112500082`

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a visitor navigates to any of the five working property slugs (`cendana`, `cakrawala`, `abaia-villa`, `pavilo-a-malioboro`, `alvera-malioboro`) THEN the system SHALL CONTINUE TO return HTTP 200 with the full property detail page

3.2 WHEN a visitor navigates to `/properties/{slug}` for any active property that has no seasonal rates THEN the system SHALL CONTINUE TO calculate and display the correct base rate and weekend premium

3.3 WHEN a visitor navigates to `/articles/{slug}` for any published article THEN the system SHALL CONTINUE TO return HTTP 200 with the article detail page

3.4 WHEN the admin navigates to the admin articles index (`/admin/articles`) THEN the system SHALL CONTINUE TO return HTTP 200 with the full admin article management interface

3.5 WHEN a visitor navigates to any legacy URL registered as 410 (e.g. `/home`, `/tentang-kami`, `/terms`) THEN the system SHALL CONTINUE TO return HTTP 410 Gone

3.6 WHEN a visitor navigates to `/contact` directly THEN the system SHALL CONTINUE TO return HTTP 410 Gone (the route-level 410 is preserved; only the frontend links are changed)

3.7 WHEN any other footer links (e.g. `/about`, `/faq`, `/properties`, `/articles`, legal pages) are clicked THEN the system SHALL CONTINUE TO navigate to their correct destinations without change
