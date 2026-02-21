<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Schedule::command('sitemap:generate')->daily();
Schedule::command('ical:sync')->everyTwoHours();

// Automated Trending Articles (Yogyakarta Focus)
Schedule::job(new \App\Jobs\GenerateTrendingArticleJob)
    ->dailyAt('10:00')
    ->timezone('Asia/Jakarta');

Schedule::job(new \App\Jobs\GenerateTrendingArticleJob)
    ->dailyAt('15:00')
    ->timezone('Asia/Jakarta');

// Auto-Publish Articles
Schedule::command('articles:auto-publish')->hourly();
