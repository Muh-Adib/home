<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Property;
use Carbon\Carbon;

class GenerateSitemap extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sitemap:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate the sitemap using native XML writer.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Generating sitemap...');

        $path = public_path('sitemap.xml');
        $baseUrl = config('app.url');

        // Ensure base URL doesn't have trailing slash
        $baseUrl = rtrim($baseUrl, '/');

        $xml = new \DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = true;

        // Create root element
        $urlset = $xml->createElement('urlset');
        $urlset->setAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');
        $xml->appendChild($urlset);

        // Add Homepage
        $this->addUrl($xml, $urlset, $baseUrl . '/', Carbon::now(), 'daily', '1.0');

        // Add Properties
        Property::active()->chunk(100, function ($properties) use ($xml, $urlset, $baseUrl) {
            foreach ($properties as $property) {
                $this->addUrl(
                    $xml, 
                    $urlset, 
                    $baseUrl . "/properties/{$property->slug}", 
                    $property->updated_at, 
                    'weekly', 
                    '0.8'
                );
            }
        });

        // Save file
        $xml->save($path);

        $this->info("Sitemap generated successfully at: {$path}");
    }

    private function addUrl($xml, $parent, $loc, $lastmod, $changefreq, $priority)
    {
        $url = $xml->createElement('url');

        // Loc
        $url->appendChild($xml->createElement('loc', $loc));

        // Lastmod
        if ($lastmod instanceof Carbon) {
            $lastmod = $lastmod->toIso8601String();
        }
        $url->appendChild($xml->createElement('lastmod', $lastmod));

        // Changefreq
        $url->appendChild($xml->createElement('changefreq', $changefreq));

        // Priority
        $url->appendChild($xml->createElement('priority', $priority));

        $parent->appendChild($url);
    }
}
