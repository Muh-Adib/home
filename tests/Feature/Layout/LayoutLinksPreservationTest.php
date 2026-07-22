<?php

namespace Tests\Feature\Layout;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Preservation Tests — Task 8 (Bugfix: seo-repair-p0-critical-fixes)
 *
 * Property 6: Preservation — All Other Footer and Nav Links Unaffected
 *
 * IMPORTANT: These tests MUST PASS on unfixed code — they establish the baseline
 * behavior that must be preserved after the /contact link fix is applied.
 *
 * Goal: Confirm that all other links in guest-layout.tsx and dashboard-layout.tsx
 * remain intact and unchanged before and after the fix for TASK-003.
 *
 * Context — Inertia testing limitation:
 *   In Laravel feature tests, Inertia renders only the initial HTML shell with a
 *   `<div id="app" data-page="...">` containing JSON props. React components are NOT
 *   server-side rendered. Therefore we use source-code grep assertions to confirm
 *   the presence of links in the layout files, complemented by HTTP-level route checks.
 *
 * Validates: Requirements 3.5, 3.6, 3.7
 */
class LayoutLinksPreservationTest extends TestCase
{
    use RefreshDatabase;
    // =========================================================================
    // Test Case A — guest-layout.tsx Footer Quick Links Are Present
    // Validates: Requirements 3.7
    // =========================================================================

    /**
     * The guest layout source file MUST contain the key footer navigation links.
     *
     * These links must remain unchanged after the /contact fix — only the
     * `href="/contact"` element is replaced; all other footer links are untouched.
     *
     * Observed links in guest-layout.tsx footer Quick Links section:
     *   - href="/about"       → About page
     *   - href="/properties"  → Browse Properties
     *   - href="/articles"    → Articles
     *   - href="/faq"         → FAQ
     *
     * **Validates: Requirements 3.7**
     */
    #[Test]
    public function guest_layout_footer_contains_key_navigation_links(): void
    {
        $layoutPath = base_path('resources/js/layouts/guest-layout.tsx');

        $this->assertFileExists($layoutPath, 'guest-layout.tsx must exist');

        $source = file_get_contents($layoutPath);

        $this->assertStringContainsString(
            "href: '/about'",
            $source,
            'guest-layout.tsx must contain href: \'/about\' in the footer Quick Links'
        );

        $this->assertStringContainsString(
            "href: '/properties'",
            $source,
            'guest-layout.tsx must contain href: \'/properties\' in the footer Quick Links'
        );

        $this->assertStringContainsString(
            "href: '/articles'",
            $source,
            'guest-layout.tsx must contain href: \'/articles\' in the footer Quick Links'
        );

        $this->assertStringContainsString(
            "href: '/faq'",
            $source,
            'guest-layout.tsx must contain href: \'/faq\' in the footer Quick Links'
        );
    }

    // =========================================================================
    // Test Case B — guest-layout.tsx Contact Detail Links (mailto: / tel:) Are Present
    // Validates: Requirements 3.7
    // =========================================================================

    /**
     * The guest layout source file MUST contain the mailto: and tel: contact links.
     *
     * These are direct contact detail links in the footer Contact section — they are
     * NOT the broken /contact navigation link and must remain completely unchanged.
     *
     * Observed links in guest-layout.tsx footer Contact section:
     *   - href="mailto:contact@homsjogja.com"
     *   - href="tel:+628112500082"
     *
     * **Validates: Requirements 3.7**
     */
    #[Test]
    public function guest_layout_footer_contains_contact_detail_links(): void
    {
        $layoutPath = base_path('resources/js/layouts/guest-layout.tsx');

        $this->assertFileExists($layoutPath, 'guest-layout.tsx must exist');

        $source = file_get_contents($layoutPath);

        $this->assertStringContainsString(
            'mailto:contact@homsjogja.com',
            $source,
            'guest-layout.tsx must contain the mailto: contact link in the footer Contact section'
        );

        $this->assertStringContainsString(
            'tel:+628112500082',
            $source,
            'guest-layout.tsx must contain the tel: contact link in the footer Contact section'
        );
    }

    // =========================================================================
    // Test Case C — dashboard-layout.tsx Contains Key Navigation Links
    // Validates: Requirements 3.7
    // =========================================================================

    /**
     * The dashboard layout source file MUST contain its key navigation links.
     *
     * These links must remain unchanged after the /contact fix — only the
     * `href="/contact"` element in the footer Quick Links is replaced.
     *
     * Observed links in dashboard-layout.tsx:
     *   - href="/properties"  → Browse Properties (footer Quick Links + sidebar nav)
     *   - href="/help"        → Help Center (footer Quick Links)
     *   - href="mailto:contact@homsjogja.com"  → footer Contact section
     *   - href="tel:+628112500082"              → footer Contact section
     *   - href="/privacy"     → footer legal links
     *   - href="/terms"       → footer legal links
     *
     * **Validates: Requirements 3.7**
     */
    #[Test]
    public function dashboard_layout_contains_key_navigation_links(): void
    {
        $layoutPath = base_path('resources/js/layouts/dashboard-layout.tsx');

        $this->assertFileExists($layoutPath, 'dashboard-layout.tsx must exist');

        $source = file_get_contents($layoutPath);

        $this->assertStringContainsString(
            'href="/properties"',
            $source,
            'dashboard-layout.tsx must contain href="/properties" in the navigation'
        );

        $this->assertStringContainsString(
            'href="/help"',
            $source,
            'dashboard-layout.tsx must contain href="/help" in the footer Quick Links'
        );

        $this->assertStringContainsString(
            'mailto:contact@homsjogja.com',
            $source,
            'dashboard-layout.tsx must contain the mailto: contact link in the footer Contact section'
        );

        $this->assertStringContainsString(
            'tel:+628112500082',
            $source,
            'dashboard-layout.tsx must contain the tel: contact link in the footer Contact section'
        );

        $this->assertStringContainsString(
            'href="/privacy"',
            $source,
            'dashboard-layout.tsx must contain href="/privacy" in the footer legal links'
        );

        $this->assertStringContainsString(
            'href="/terms"',
            $source,
            'dashboard-layout.tsx must contain href="/terms" in the footer legal links'
        );
    }

    // =========================================================================
    // Test Case D — GET /contact Returns HTTP 410 (Route-Level 410 Preserved)
    // Validates: Requirements 3.5, 3.6
    // =========================================================================

    /**
     * GET /contact MUST continue to return HTTP 410 Gone after the fix.
     *
     * Requirement 3.6 explicitly states: "WHEN a visitor navigates to /contact directly
     * THEN the system SHALL CONTINUE TO return HTTP 410 Gone — the route-level 410 is
     * preserved; only the frontend links are changed."
     *
     * This preservation test confirms the fix does NOT alter routes/web.php — the 410
     * route entry for /contact in the $legacyStandalone array must remain intact.
     *
     * Also validates requirement 3.5: other legacy 410 routes (e.g. /home, /terms) are
     * unaffected — the fix is scoped only to the two layout link elements.
     *
     * **Validates: Requirements 3.5, 3.6**
     */
    #[Test]
    public function contact_route_continues_to_return_410_gone(): void
    {
        $response = $this->get('/contact');

        $response->assertStatus(410);
    }

    /**
     * Other legacy 410 routes must continue to return HTTP 410 Gone.
     *
     * The fix is scoped to two link elements in two layout files. It must NOT touch
     * routes/web.php or alter any other 410 route registrations.
     *
     * **Validates: Requirements 3.5**
     */
    #[Test]
    public function other_legacy_routes_continue_to_return_410_gone(): void
    {
        $this->get('/home')->assertStatus(410);
        $this->get('/tentang-kami')->assertStatus(410);
        $this->get('/terms')->assertStatus(410);
    }
}
