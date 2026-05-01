<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use League\HTMLToMarkdown\HtmlConverter;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Content negotiation middleware for AI agents.
 *
 * When a request includes `Accept: text/markdown`, converts the HTML response
 * body to Markdown and returns it with `Content-Type: text/markdown`.
 *
 * Browsers sending `Accept: text/html` (or no Accept header) are unaffected.
 *
 * @see https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
 * @see https://www.rfc-editor.org/rfc/rfc9110#section-12 (HTTP content negotiation)
 */
class ServeMarkdownForAgents
{
    /**
     * Routes that should never be converted (admin, API, auth, assets).
     */
    private const EXCLUDED_PREFIXES = [
        'admin', 'staff', 'api', 'dashboard',
        'settings', 'my-bookings', 'my-payments',
        'login', 'register', 'password', 'email',
        '.well-known',
    ];

    public function handle(Request $request, Closure $next): SymfonyResponse
    {
        $response = $next($request);

        // Only act when agent explicitly requests markdown
        if (! $this->wantsMarkdown($request)) {
            return $response;
        }

        if ($this->shouldSkip($request, $response)) {
            return $response;
        }

        $html = $response->getContent();

        if (empty($html)) {
            return $response;
        }

        $markdown = $this->convertToMarkdown($html);

        // Count tokens (rough estimate: ~4 chars per token)
        $tokenEstimate = (int) ceil(mb_strlen($markdown) / 4);

        return response($markdown, $response->getStatusCode())
            ->header('Content-Type', 'text/markdown; charset=UTF-8')
            ->header('X-Markdown-Tokens', (string) $tokenEstimate)
            ->header('Vary', 'Accept');
    }

    private function wantsMarkdown(Request $request): bool
    {
        $accept = $request->header('Accept', '');

        return str_contains($accept, 'text/markdown');
    }

    private function shouldSkip(Request $request, SymfonyResponse $response): bool
    {
        // Only convert successful HTML responses
        if ($response->getStatusCode() >= 300) {
            return true;
        }

        $contentType = $response->headers->get('Content-Type', '');
        if (! str_contains($contentType, 'text/html')) {
            return true;
        }

        // Skip admin/API/auth routes
        foreach (self::EXCLUDED_PREFIXES as $prefix) {
            if ($request->is("{$prefix}/*") || $request->is($prefix)) {
                return true;
            }
        }

        return false;
    }

    private function convertToMarkdown(string $html): string
    {
        try {
            $converter = new HtmlConverter([
                'strip_tags' => true,
                'remove_nodes' => 'head script style noscript nav footer aside .sr-only [aria-hidden="true"]',
                'hard_break' => true,
                'header_style' => 'atx',   // # H1, ## H2, etc.
                'bold_style' => '**',
                'italic_style' => '*',
                'list_item_style' => '-',
                'preserve_comments' => false,
                'use_autolinks' => true,
                'strip_placeholder_links' => false,
            ]);

            $markdown = $converter->convert($html);

            // Clean up excessive blank lines (max 2 consecutive)
            $markdown = preg_replace('/\n{3,}/', "\n\n", $markdown);

            return trim($markdown);
        } catch (\Throwable) {
            // Fallback: strip all tags if converter fails
            return trim(strip_tags($html));
        }
    }
}
