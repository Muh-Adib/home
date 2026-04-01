<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\SeoLandingPage;
use App\Models\Article;
use Illuminate\Support\Facades\Cache;

class SitemapController extends Controller
{
    private const PSEO_CHUNK_SIZE = 5000;

    /**
     * Generate dynamic sitemap index pointing to sub-sitemaps.
     */
    public function index()
    {
        return Cache::remember('sitemap.index.xml', 3600, function () {
            $xml = new \DOMDocument('1.0', 'UTF-8');
            $xml->formatOutput = true;

            $sitemapindex = $xml->createElement('sitemapindex');
            $sitemapindex->setAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');
            $xml->appendChild($sitemapindex);

            $baseUrl = rtrim(config('app.url'), '/');

            // 1. Core Web Sitemap (Properties & Homepage)
            $this->addSitemapIndexNode($xml, $sitemapindex, $baseUrl . '/sitemap-core.xml', now());
            
            // 2. Articles Sitemap
            $this->addSitemapIndexNode($xml, $sitemapindex, $baseUrl . '/sitemap-articles.xml', now());

            // 3. PSEO Chunks
            $totalPseo = SeoLandingPage::forSitemap()->count();
            if ($totalPseo > 0) {
                // Calculate how many chunky sitemaps we need
                $chunks = (int) ceil($totalPseo / self::PSEO_CHUNK_SIZE);
                for ($i = 1; $i <= $chunks; $i++) {
                    $this->addSitemapIndexNode($xml, $sitemapindex, $baseUrl . '/sitemap-pseo-' . $i . '.xml', now());
                }
            }

            return response($xml->saveXML(), 200)->header('Content-Type', 'text/xml');
        });
    }

    /**
     * Generate Core Sitemap (Home & Properties)
     */
    public function core()
    {
        return Cache::remember('sitemap.core.xml', 3600, function () {
            $properties = Property::active()->select('slug', 'updated_at')->get();

            $xml = $this->createBaseSitemapXml();
            $urlset = $xml->documentElement;
            $baseUrl = rtrim(config('app.url'), '/');

            // Homepage
            $this->addUrl($xml, $urlset, $baseUrl . '/', now(), 'daily', '1.0');
            // Properties listing
            $this->addUrl($xml, $urlset, $baseUrl . '/properties', now(), 'daily', '0.9');

            // Properties
            foreach ($properties as $property) {
                $this->addUrl($xml, $urlset, $baseUrl . '/properties/' . $property->slug, $property->updated_at, 'daily', '0.8');
            }

            return response($xml->saveXML(), 200)->header('Content-Type', 'text/xml');
        });
    }

    /**
     * Generate Articles Sitemap
     */
    public function articles()
    {
        return Cache::remember('sitemap.articles.xml', 3600, function () {
            $articles = Article::published()->orderBy('updated_at', 'desc')->get(['slug', 'updated_at']);

            $xml = $this->createBaseSitemapXml();
            $urlset = $xml->documentElement;
            $baseUrl = rtrim(config('app.url'), '/');

            foreach ($articles as $article) {
                $this->addUrl($xml, $urlset, $baseUrl . '/articles/' . $article->slug, $article->updated_at, 'weekly', '0.8');
            }

            return response($xml->saveXML(), 200)->header('Content-Type', 'text/xml');
        });
    }

    /**
     * Generate specific PSEO chunk
     */
    public function pseo($chunk)
    {
        $chunk = max(1, (int)$chunk); // Ensure 1 minimum
        
        return Cache::remember("sitemap.pseo.{$chunk}.xml", 3600, function () use ($chunk) {
            $offset = ($chunk - 1) * self::PSEO_CHUNK_SIZE;
            
            $pages = SeoLandingPage::forSitemap()
                ->select('slug', 'sitemap_priority', 'sitemap_changefreq', 'updated_at')
                ->skip($offset)
                ->take(self::PSEO_CHUNK_SIZE)
                ->get();

            // If user requests a chunk too high, return 404
            if ($pages->count() === 0 && $chunk > 1) {
                abort(404);
            }

            $xml = $this->createBaseSitemapXml();
            $urlset = $xml->documentElement;
            $baseUrl = rtrim(config('app.url'), '/');

            foreach ($pages as $page) {
                $this->addUrl(
                    $xml,
                    $urlset,
                    $baseUrl . '/s/' . $page->slug,
                    $page->updated_at,
                    $page->sitemap_changefreq ?? 'weekly',
                    (string) ($page->sitemap_priority ?? '0.5')
                );
            }

            return response($xml->saveXML(), 200)->header('Content-Type', 'text/xml');
        });
    }

    /**
     * Helper to add node to sitemapindex
     */
    private function addSitemapIndexNode($xml, $parent, $loc, $lastmod)
    {
        $sitemap = $xml->createElement('sitemap');
        $sitemap->appendChild($xml->createElement('loc', $loc));
        $sitemap->appendChild($xml->createElement('lastmod', $lastmod->toIso8601String()));
        $parent->appendChild($sitemap);
    }

    /**
     * Create base XML structure for sub-sitemaps
     */
    private function createBaseSitemapXml(): \DOMDocument
    {
        $xml = new \DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = true;
        $urlset = $xml->createElement('urlset');
        $urlset->setAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');
        $xml->appendChild($urlset);
        return $xml;
    }

    /**
     * Add URL to sitemap
     */
    private function addUrl($xml, $parent, $loc, $lastmod, $changefreq, $priority)
    {
        $url = $xml->createElement('url');

        $url->appendChild($xml->createElement('loc', $loc));

        if ($lastmod instanceof \Carbon\Carbon || $lastmod instanceof \Illuminate\Support\Carbon || $lastmod instanceof \DateTimeInterface) {
            $lastmod = $lastmod->toIso8601String();
        } else {
            $lastmod = now()->toIso8601String();
        }
        $url->appendChild($xml->createElement('lastmod', $lastmod));
        $url->appendChild($xml->createElement('changefreq', $changefreq));
        $url->appendChild($xml->createElement('priority', $priority));

        $parent->appendChild($url);
    }

    /**
     * Clear sitemap cache (called after property updates)
     */
    public static function clearCache()
    {
        Cache::forget('sitemap.index.xml');
        Cache::forget('sitemap.core.xml');
        Cache::forget('sitemap.articles.xml');
        
        // Clearing PSEO chunks. Assume safe limit up to 50 iterations (50 * 5k = 250k pages)
        for ($i = 1; $i <= 50; $i++) {
             Cache::forget("sitemap.pseo.{$i}.xml");
        }
    }
}
