<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\DomCrawler\Crawler;

/**
 * SerpScraperService
 *
 * Mengekstrak Top SERP (Search Engine Results Page) data secara gratis
 * melalui DuckDuckGo Lite version (anti-blockir).
 */
class SerpScraperService
{
    private const BASE_URL = 'https://lite.duckduckgo.com/lite/';

    /**
     * Mengambil Top N competitor titles & snippets untuk suatu keyword
     */
    public function scrapeTopResults(string $keyword, int $limit = 5): array
    {
        try {
            // Menggunakan POST request ke DDG Lite (sering lebih aman dari blokir)
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Content-Type' => 'application/x-www-form-urlencoded',
            ])->asForm()->post(self::BASE_URL, [
                'q' => $keyword,
                'kl' => 'id-id', // Region Indonesia
            ]);

            if (! $response->successful()) {
                Log::warning("[SerpScraperService] Gagal fetch DDG Lite untuk keyword: {$keyword}. Status: {$response->status()}");

                return [];
            }

            $html = $response->body();
            $crawler = new Crawler($html);
            $results = [];

            // Di DDG Lite, struktur tabel digunakan: tr pertama title/url, tr kedua snippet
            $crawler->filter('tr')->each(function (Crawler $node) use (&$results, $limit) {
                if (count($results) >= $limit) {
                    return;
                }

                try {
                    // Cari elemen dengan class result-title
                    $titleNode = $node->filter('.result-title');

                    if ($titleNode->count() > 0) {
                        // Ambil Snippet dari sibling table row (tr) berikutnya
                        $snippetNode = $node->nextAll()->filter('.result-snippet')->first();

                        $title = trim($titleNode->text());
                        $url = $titleNode->attr('href');
                        $snippet = $snippetNode->count() > 0 ? trim($snippetNode->text()) : '';

                        // Hanya simpan jika url valid / tidak empty
                        if (! empty($url) && ! str_contains($url, 'duckduckgo')) {
                            $results[] = [
                                'title' => $title,
                                'snippet' => $snippet,
                                'url' => $url,
                            ];
                        }
                    }
                } catch (\Exception $e) {
                    // Abaikan node yang error saat parsing
                }
            });

            Log::info('[SerpScraperService] Scraped '.count($results)." top results for: {$keyword}");

            return $results;

        } catch (\Exception $e) {
            Log::error('[SerpScraperService] Error scraping SERP: '.$e->getMessage());

            return [];
        }
    }
}
