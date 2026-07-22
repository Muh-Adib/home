<?php

namespace App\Http\Controllers;

use App\Models\LegalPage;
use Inertia\Inertia;

class LegalViewController extends Controller
{
    /**
     * Show detail legal page by slug
     */
    public function show(string $slug)
    {
        $legalPage = LegalPage::where('slug', $slug)
            ->whereNull('deleted_at')
            ->firstOrFail(); // bisa null

        return Inertia::render('Legal', [
            'legalPage' => $legalPage, // null atau model
        ]);
    }
}
