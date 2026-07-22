<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NewsDiscoveryService
{
    /**
     * Fetch trending news from Google News RSS
     *
     * @param  string  $language  (id, en)
     */
    public function fetchTrendingNews(string $keyword, string $language = 'id', int $limit = 5): array
    {
        try {
            // Google News RSS URL
            // ceid=ID:id for Indonesia, US:en for US
            $ceid = $language === 'id' ? 'ID:id' : 'US:en';
            $gl = $language === 'id' ? 'ID' : 'US';
            $hl = $language === 'id' ? 'id-ID' : 'en-US';

            // scoring=n (Newest), scoring=r (Relevance)
            $url = 'https://news.google.com/rss/search?q='.urlencode($keyword)."&hl={$hl}&gl={$gl}&ceid={$ceid}&scoring=n";

            $response = Http::get($url);

            if ($response->failed()) {
                Log::error("Failed to fetch Google News RSS for keyword: {$keyword}. Status: ".$response->status());

                return [];
            }

            $xmlContent = $response->body();

            // Parse XML
            $rss = simplexml_load_string($xmlContent, 'SimpleXMLElement', LIBXML_NOCDATA);

            if (! $rss || ! isset($rss->channel->item)) {
                Log::warning("RSS parsed but no items found for {$keyword}");

                return [];
            }

            $newsItems = [];
            $count = 0;

            foreach ($rss->channel->item as $item) {
                if ($count >= $limit) {
                    break;
                }

                // Extract pubDate
                $pubDate = (string) $item->pubDate;
                $timestamp = strtotime($pubDate);

                // Filter: Only news from last 30 days (2592000 seconds)
                if (time() - $timestamp > 2592000) {
                    continue;
                }

                // Clean title (Google News often adds "- Source Name" at the end)
                $title = (string) $item->title;
                $source = (string) $item->source;
                $cleanTitle = str_replace(" - {$source}", '', $title);

                $newsItems[] = [
                    'title' => $cleanTitle,
                    'original_title' => $title,
                    'link' => (string) $item->link,
                    'pubDate' => $pubDate,
                    'timestamp' => $timestamp,
                    'source' => $source,
                    'description' => strip_tags((string) $item->description),
                ];

                $count++;
            }

            return $newsItems;

        } catch (\Exception $e) {
            Log::error('NewsDiscoveryService Error: '.$e->getMessage());

            return [];
        }
    }
}
