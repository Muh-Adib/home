<?php

namespace Tests\Feature\Layout;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Bug Condition Exploration Tests — Task 7 (Bugfix: seo-repair-p0-critical-fixes)
 *
 * CRITICAL: These tests MUST FAIL on unfixed code — failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 *
 * Goal: Surface counterexamples that demonstrate `href="/contact"` is present in the
 * layout source files, and that the `/contact` route returns 410 Gone — confirming
 * every page using these layouts contains a broken navigation link.
 *
 * Context — Inertia testing limitation:
 *   In Laravel feature tests, Inertia renders only the initial HTML shell with a
 *   `<div id="app" data-page="...">` containing JSON props. React components (including
 *   layout files) are NOT server-side rendered. Therefore `href="/contact"` from
 *   `<Link href="/contact">` will NOT appear in the HTTP response HTML.
 *
 *   Instead, we confirm the bug via two complementary assertions:
 *     A) Source-code grep: the layout files contain `href="/contact"` — confirming the
 *        broken link exists in the shipped code.
 *     B) Route check: `GET /contact` returns HTTP 410 — confirming the link target is
 *        a dead route, making every click a broken navigation.
 *
 *   Together these two facts prove the bug condition: a link pointing to a 410 route
 *   is present in both layout files and will be rendered to every visitor.
 *
 * Validates: Requirements 1.5, 1.6
 */
class ContactLinkBugConditionTest extends TestCase
{
    // =========================================================================
    // Test Case A — Layout Source Files Contain href="/contact"
    // Validates: Requirements 1.6
    // =========================================================================

    /**
     * The guest layout source file MUST NOT contain `href="/contact"` after the fix.
     *
     * On UNFIXED code this test FAILS because `guest-layout.tsx` contains:
     *   <Link href="/contact" ...>
     * in the mobile bottom nav (unauthenticated branch), which Inertia renders as
     * `<a href="/contact">` — a link pointing to a 410 Gone route.
     *
     * Counterexample documented:
     *   resources/js/layouts/guest-layout.tsx contains `href="/contact"`
     *   → every unauthenticated page load includes a broken "Kontak" link
     *
     * **Validates: Requirements 1.5, 1.6**
     */
    #[Test]
    public function guest_layout_source_does_not_contain_contact_href(): void
    {
        $layoutPath = base_path('resources/js/layouts/guest-layout.tsx');

        $this->assertFileExists($layoutPath, 'guest-layout.tsx must exist');

        $source = file_get_contents($layoutPath);

        // On unfixed code this assertion FAILS — confirming the bug exists in source.
        $this->assertStringNotContainsString(
            'href="/contact"',
            $source,
            'guest-layout.tsx must not contain href="/contact" — the /contact route returns 410 Gone'
        );
    }

    /**
     * The dashboard layout source file MUST NOT contain `href="/contact"` after the fix.
     *
     * On UNFIXED code this test FAILS because `dashboard-layout.tsx` contains:
     *   <Link href="/contact" ...>
     * in the footer Quick Links section, which Inertia renders as `<a href="/contact">`
     * — a link pointing to a 410 Gone route visible to all authenticated users.
     *
     * Counterexample documented:
     *   resources/js/layouts/dashboard-layout.tsx contains `href="/contact"`
     *   → every authenticated dashboard page load includes a broken "Contact Us" link
     *
     * **Validates: Requirements 1.5, 1.6**
     */
    #[Test]
    public function dashboard_layout_source_does_not_contain_contact_href(): void
    {
        $layoutPath = base_path('resources/js/layouts/dashboard-layout.tsx');

        $this->assertFileExists($layoutPath, 'dashboard-layout.tsx must exist');

        $source = file_get_contents($layoutPath);

        // On unfixed code this assertion FAILS — confirming the bug exists in source.
        $this->assertStringNotContainsString(
            'href="/contact"',
            $source,
            'dashboard-layout.tsx must not contain href="/contact" — the /contact route returns 410 Gone'
        );
    }

    // =========================================================================
    // Test Case B — GET /contact Returns HTTP 410 (Confirming the Link is Broken)
    // Validates: Requirements 1.5
    // =========================================================================

    /**
     * GET /contact MUST return HTTP 410 Gone.
     *
     * This test PASSES on both unfixed and fixed code — it confirms the route-level 410
     * is intentionally preserved (requirement 3.6). Combined with Test Case A, it proves
     * the bug: the layout files link to a route that is permanently gone.
     *
     * After the fix, Test Case A will also pass (no `href="/contact"` in source), and
     * this test continues to pass (the 410 route is preserved), together confirming:
     *   - The broken link has been removed from the layouts
     *   - The 410 route itself is still correctly returning 410
     *
     * **Validates: Requirements 1.5**
     */
    #[Test]
    public function contact_route_returns_410_gone(): void
    {
        $response = $this->get('/contact');

        $response->assertStatus(410);
    }
}
