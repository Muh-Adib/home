<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Illuminate\Support\Facades\Cache;

class SitemapController extends Controller
{
    /**
     * Generate dynamic sitemap (Next.js style)
     * Cached for 1 hour, auto-clears when properties updated
     */
    public function index()
    {
        return Cache::remember('sitemap.xml', 3600, function () {
            $properties = Property::active()
                ->select('slug', 'updated_at')
                ->get();

            $xml = new \DOMDocument('1.0', 'UTF-8');
            $xml->formatOutput = true;

            $urlset = $xml->createElement('urlset');
            $urlset->setAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');
            $xml->appendChild($urlset);

            $baseUrl = rtrim(config('app.url'), '/');

            // Homepage
            $this->addUrl($xml, $urlset, $baseUrl . '/', now(), 'daily', '1.0');

            // Properties listing
            $this->addUrl($xml, $urlset, $baseUrl . '/properties', now(), 'daily', '0.9');

            // Individual properties
            foreach ($properties as $property) {
                $this->addUrl(
                    $xml, 
                    $urlset, 
                    $baseUrl . '/properties/' . $property->slug,
                    $property->updated_at,
                    'daily',
                    '0.8'
                );
            }

            return response($xml->saveXML(), 200)
                ->header('Content-Type', 'text/xml');
        });
    }

    /**
     * Add URL to sitemap
     */
    private function addUrl($xml, $parent, $loc, $lastmod, $changefreq, $priority)
    {
        $url = $xml->createElement('url');

        // Loc
        $url->appendChild($xml->createElement('loc', $loc));

        // Lastmod
        if ($lastmod instanceof \Carbon\Carbon || $lastmod instanceof \Illuminate\Support\Carbon) {
            $lastmod = $lastmod->toIso8601String();
        }
        $url->appendChild($xml->createElement('lastmod', $lastmod));

        // Changefreq
        $url->appendChild($xml->createElement('changefreq', $changefreq));

        // Priority
        $url->appendChild($xml->createElement('priority', $priority));

        $parent->appendChild($url);
    }

    /**
     * Clear sitemap cache (called after property updates)
     */
    public static function clearCache()
    {
        Cache::forget('sitemap.xml');
    }
}
