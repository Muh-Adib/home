<?php

namespace App\Http\Controllers;

use App\Models\AIProviderKey;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AIProviderKeyController extends Controller
{
    /**
     * Display a listing of AI provider keys.
     */
    public function index()
    {
        $keys = AIProviderKey::orderBy('provider')
            ->orderBy('priority', 'desc')
            ->get()
            ->map(function ($key) {
                return [
                    'id' => $key->id,
                    'name' => $key->name,
                    'provider' => $key->provider,
                    'is_active' => $key->is_active,
                    'priority' => $key->priority,
                    'requests_count' => $key->requests_count,
                    'tokens_used' => $key->tokens_used,
                    'total_cost' => $key->total_cost,
                    'last_used_at' => $key->last_used_at,
                    'requests_per_minute' => $key->requests_per_minute,
                    'daily_limit' => $key->daily_limit,
                    'auto_rotate' => $key->auto_rotate,
                    'masked_key' => $key->masked_api_key,
                    'created_at' => $key->created_at->toISOString(),
                ];
            });

        $stats = [
            'total_keys' => AIProviderKey::count(),
            'active_keys' => AIProviderKey::where('is_active', true)->count(),
            'total_requests' => AIProviderKey::sum('requests_count'),
            'total_cost' => AIProviderKey::sum('total_cost'),
            'providers' => AIProviderKey::distinct('provider')->pluck('provider'),
        ];

        return Inertia::render('Admin/Settings/AIKeys/Index', [
            'keys' => $keys,
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for creating a new AI provider key.
     */
    public function create()
    {
        return Inertia::render('Admin/Settings/AIKeys/Edit', [
            'providers' => ['openrouter', 'gemini', 'openai', 'anthropic'],
        ]);
    }

    /**
     * Store a newly created AI provider key.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'provider' => 'required|string|in:openrouter,gemini,openai,anthropic',
            'api_key' => 'required|string',
            'is_active' => 'boolean',
            'priority' => 'integer|min:0|max:100',
            'requests_per_minute' => 'nullable|integer|min:1',
            'daily_limit' => 'nullable|integer|min:1',
            'auto_rotate' => 'boolean',
            'metadata' => 'nullable|array',
        ]);

        AIProviderKey::create($validated);

        return redirect()->route('admin.ai-keys.index')
            ->with('success', 'AI Provider key added successfully');
    }

    /**
     * Show the form for editing an AI provider key.
     */
    public function edit(AIProviderKey $aiKey)
    {
        return Inertia::render('Admin/Settings/AIKeys/Edit', [
            'aiKey' => [
                'id' => $aiKey->id,
                'name' => $aiKey->name,
                'provider' => $aiKey->provider,
                'is_active' => $aiKey->is_active,
                'priority' => $aiKey->priority,
                'requests_per_minute' => $aiKey->requests_per_minute,
                'daily_limit' => $aiKey->daily_limit,
                'auto_rotate' => $aiKey->auto_rotate,
                'metadata' => $aiKey->metadata,
                'masked_key' => $aiKey->masked_api_key,
            ],
            'providers' => ['openrouter', 'gemini', 'openai', 'anthropic'],
        ]);
    }

    /**
     * Update an AI provider key.
     */
    public function update(Request $request, AIProviderKey $aiKey)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'provider' => 'required|string|in:openrouter,gemini,openai,anthropic',
            'api_key' => 'nullable|string', // Optional on update
            'is_active' => 'boolean',
            'priority' => 'integer|min:0|max:100',
            'requests_per_minute' => 'nullable|integer|min:1',
            'daily_limit' => 'nullable|integer|min:1',
            'auto_rotate' => 'boolean',
            'metadata' => 'nullable|array',
        ]);

        // Only update API key if provided
        if (empty($validated['api_key'])) {
            unset($validated['api_key']);
        }

        $aiKey->update($validated);

        return redirect()->route('admin.ai-keys.index')
            ->with('success', 'AI Provider key updated successfully');
    }

    /**
     * Remove an AI provider key.
     */
    public function destroy(AIProviderKey $aiKey)
    {
        $aiKey->delete();

        return redirect()->route('admin.ai-keys.index')
            ->with('success', 'AI Provider key deleted successfully');
    }

    /**
     * Reset usage statistics for an AI provider key.
     */
    public function resetStats(AIProviderKey $aiKey)
    {
        $aiKey->update([
            'requests_count' => 0,
            'tokens_used' => 0,
            'total_cost' => 0,
            'last_used_at' => null,
        ]);

        return back()->with('success', 'Statistics reset successfully');
    }

    /**
     * Toggle active status of an AI provider key.
     */
    public function toggleActive(AIProviderKey $aiKey)
    {
        $aiKey->update(['is_active' => !$aiKey->is_active]);

        return back()->with('success', 'Key status updated successfully');
    }
}
