<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LegalPage;
use Inertia\Inertia;
use Illuminate\Support\Str;

class LegalPageController extends Controller
{
    private array $typeSlugMap = [
        'Terms of Service' => 'tos',
        'Privacy Policy' => 'privacy',
        'Cookies Policy' => 'cookies',
        'Refund Policy' => 'refund-policy',
        'Payment Policy' => 'payment-policy',
        'Copy Rights Policy' => 'copyright-policy',
        'Disclaimer' => 'disclaimer',
    ];

    /**
     * List semua legal pages (versi aktif + max 10 archived per tipe)
     */
    public function index(Request $request)
    {
        // Ambil semua slug aktif (tidak soft deleted)
        $activeSlugs = array_values($this->typeSlugMap);
        
        $legalPages = [];
        
        foreach ($activeSlugs as $slug) {
            // Ambil dokumen aktif (latest)
            $active = LegalPage::where('slug', $slug)
                ->whereNull('deleted_at')
                ->orderByDesc('id')
                ->first();
            
            if ($active) {
                // Ambil archived versions (soft deleted) - max 10
                $archived = LegalPage::onlyTrashed()
                    ->where('slug', 'LIKE', $slug . '-%')
                    ->orderByDesc('id')
                    ->limit(10)
                    ->get();
                
                $legalPages[] = [
                    'active' => $active,
                    'archived' => $archived,
                    'total_archived' => LegalPage::onlyTrashed()
                        ->where('slug', 'LIKE', $slug . '-%')
                        ->count(),
                ];
            }
        }

        return Inertia::render('Admin/Legal/Index', [
            'legalPages' => $legalPages,
            'typeSlugMap' => $this->typeSlugMap,
        ]);
    }

    /**
     * Show create form
     */
    public function create()
    {
        // Ambil types yang belum ada dokumen aktifnya
        $existingSlugs = LegalPage::whereNull('deleted_at')
            ->whereIn('slug', array_values($this->typeSlugMap))
            ->pluck('slug')
            ->toArray();
        
        $availableTypes = [];
        foreach ($this->typeSlugMap as $title => $slug) {
            if (!in_array($slug, $existingSlugs)) {
                $availableTypes[] = $title;
            }
        }

        return inertia('Admin/Legal/Create', [
            'types' => $availableTypes,
        ]);
    }

    /**
     * Store new legal page
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type'  => 'required|string|in:' . implode(',', array_keys($this->typeSlugMap)),
            'content' => 'required|string',
        ]);

        $title = $validated['type'];
        $slug = $this->typeSlugMap[$validated['type']];
        $type = $slug;

        // Cek apakah sudah ada legal page aktif dengan slug ini
        $exists = LegalPage::where('slug', $slug)
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            return redirect()->back()
                ->withErrors(['type' => 'Legal page dengan tipe ini sudah ada. Silakan edit yang sudah ada.']);
        }

        LegalPage::create([
            'title' => $title,
            'slug' => $slug,
            'type' => $type,
            'version' => 'V 1.0.0',
            'content' => $validated['content'],
            'published_at' => now(),
        ]);

        return redirect()->route('admin.legal.index')
            ->with('success', 'Legal page created successfully.');
    }

    /**
     * Show edit form (untuk dokumen aktif)
     */
    public function edit($slug)
    {
        $legalPage = LegalPage::where('slug', $slug)
            ->whereNull('deleted_at')
            ->firstOrFail();

        return inertia('Admin/Legal/Edit', [
            'legalPage' => $legalPage,
        ]);
    }

    /**
     * Update legal page - archive yang lama, buat yang baru
     */
    public function update(Request $request, $slug)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        // Ambil dokumen aktif
        $currentDoc = LegalPage::where('slug', $slug)
            ->whereNull('deleted_at')
            ->firstOrFail();

        // Cek apakah konten berubah
        if ($currentDoc->content === $validated['content']) {
            return redirect()->back()
                ->with('info', 'Tidak ada perubahan pada konten.');
        }

        // Generate version baru
        $newVersion = $this->generateVersion($slug);

        // Archive dokumen lama (soft delete + ubah slug)
        $archivedSlug = $slug . '-' . Str::random(8) . '-' . now()->timestamp;
        $currentDoc->update(['slug' => $archivedSlug]);
        $currentDoc->delete(); // soft delete

        // Buat dokumen baru sebagai active
        LegalPage::create([
            'title' => $currentDoc->title,
            'slug' => $slug, // slug asli
            'type' => $currentDoc->type,
            'version' => $newVersion,
            'content' => $validated['content'],
            'published_at' => now(),
        ]);

        return redirect()->route('admin.legal.index')
            ->with('success', 'Legal page updated successfully. Previous version archived.');
    }

    /**
     * Generate version string based on last version
     */
    private function generateVersion(string $slug): string
    {
        // Ambil versi terbaru dari dokumen aktif atau archived
        $last = LegalPage::withTrashed()
            ->where(function($query) use ($slug) {
                $query->where('slug', $slug)
                    ->orWhere('slug', 'LIKE', $slug . '-%');
            })
            ->orderByDesc('id')
            ->first();

        if (!$last) {
            return 'V 1.0.0';
        }

        $parts = explode('.', str_replace('V ', '', $last->version));

        if (count($parts) !== 3) {
            return 'V 1.0.0';
        }

        $major = (int)$parts[0];
        $minor = (int)$parts[1];
        $patch = (int)$parts[2];

        $patch++;
        if ($patch > 9) {
            $patch = 0;
            $minor++;
            if ($minor > 9) {
                $minor = 0;
                $major++;
            }
        }

        return sprintf('V %d.%d.%d', $major, $minor, $patch);
    }

    /**
     * Show detail legal page untuk public (versi aktif)
     */
    public function show($slug)
    {
        $legalPage = LegalPage::where('slug', $slug)
            ->whereNull('deleted_at')
            ->firstOrFail();

        return Inertia::render('Legal', [
            'legalPage' => $legalPage
        ]);
    }

    /**
     * Tampilkan semua history/archive untuk satu tipe
     */
    public function history($slug)
    {
        // Ambil dokumen aktif
        $active = LegalPage::where('slug', $slug)
            ->whereNull('deleted_at')
            ->firstOrFail();

        // Ambil semua archived versions
        $archived = LegalPage::onlyTrashed()
            ->where('slug', 'LIKE', $slug . '-%')
            ->orderByDesc('id')
            ->paginate(20);

        return Inertia::render('Admin/Legal/History', [
            'active' => $active,
            'archived' => $archived,
            'slug' => $slug,
        ]);
    }

    /**
     * View archived version
     */
    public function showArchived($id)
    {
        $archivedDoc = LegalPage::onlyTrashed()->findOrFail($id);

        return Inertia::render('Admin/Legal/ViewArchived', [
            'legalPage' => $archivedDoc,
        ]);
    }

    /**
     * Restore dari archived version (buat jadi active, archive yang current)
     */
    public function restore($id)
    {
        $archivedDoc = LegalPage::onlyTrashed()->findOrFail($id);
        
        // Extract original slug dari archived slug
        $originalSlug = explode('-', $archivedDoc->slug)[0];

        // Ambil dokumen aktif saat ini
        $currentDoc = LegalPage::where('slug', $originalSlug)
            ->whereNull('deleted_at')
            ->first();

        if ($currentDoc) {
            // Archive dokumen aktif saat ini
            $archivedSlug = $originalSlug . '-' . Str::random(8) . '-' . now()->timestamp;
            $currentDoc->update(['slug' => $archivedSlug]);
            $currentDoc->delete(); // soft delete
        }

        // Generate version baru
        $newVersion = $this->generateVersion($originalSlug);

        // Buat dokumen baru dari archived version
        LegalPage::create([
            'title' => $archivedDoc->title,
            'slug' => $originalSlug, // slug asli
            'type' => $archivedDoc->type,
            'version' => $newVersion,
            'content' => $archivedDoc->content,
            'published_at' => now(),
        ]);

        return redirect()->route('admin.legal.index')
            ->with('success', 'Legal page restored from version ' . $archivedDoc->version);
    }

    /**
     * Soft delete dokumen aktif (archive tanpa replacement)
     */
    public function archive($slug)
    {
        $legalPage = LegalPage::where('slug', $slug)
            ->whereNull('deleted_at')
            ->firstOrFail();

        // Ubah slug dan soft delete
        $archivedSlug = $slug . '-' . Str::random(8) . '-' . now()->timestamp;
        $legalPage->update(['slug' => $archivedSlug]);
        $legalPage->delete();

        return redirect()->route('admin.legal.index')
            ->with('success', 'Legal page archived successfully.');
    }

    /**
     * Permanent delete archived version
     */
    public function forceDelete($id)
    {
        $archivedDoc = LegalPage::onlyTrashed()->findOrFail($id);
        $archivedDoc->forceDelete();

        return redirect()->back()
            ->with('success', 'Archived version permanently deleted.');
    }

    /**
     * Delete seluruh legal page (active + semua archived)
     */
    public function destroyAll($slug)
    {
        // Delete active
        $active = LegalPage::where('slug', $slug)
            ->whereNull('deleted_at')
            ->first();
        
        if ($active) {
            $archivedSlug = $slug . '-' . Str::random(8) . '-' . now()->timestamp;
            $active->update(['slug' => $archivedSlug]);
            $active->delete();
        }

        // Force delete semua archived
        LegalPage::onlyTrashed()
            ->where('slug', 'LIKE', $slug . '-%')
            ->forceDelete();

        return redirect()->route('admin.legal.index')
            ->with('success', 'Legal page and all versions permanently deleted.');
    }

    /**
     * Tampilkan trash/archive page
     */
    public function trash()
    {
        $trashedPages = LegalPage::onlyTrashed()
            ->orderByDesc('deleted_at')
            ->paginate(20);

        return Inertia::render('Admin/Legal/Trash', [
            'trashedPages' => $trashedPages,
        ]);
    }
}