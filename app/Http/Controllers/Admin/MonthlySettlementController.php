<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MonthlyPropertySettlement;
use App\Models\Property;
use App\Models\Wallet;
use App\Services\MonthlySettlementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MonthlySettlementController extends Controller
{
    /**
     * Display a listing of monthly property settlements
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance', 'property_manager'])) {
            abort(403, 'Unauthorized.');
        }

        $query = MonthlyPropertySettlement::with(['property', 'createdBy', 'finalizedBy', 'targetWallet'])
            ->orderBy('period_month', 'desc')
            ->orderBy('property_id');

        if ($request->has('property_id') && $request->input('property_id') !== '') {
            $query->where('property_id', $request->input('property_id'));
        }

        if ($request->has('period_month') && $request->input('period_month') !== '') {
            $query->where('period_month', $request->input('period_month'));
        }

        $settlements = $query->paginate(20)->withQueryString();
        $properties = Property::active()->orderBy('name')->get(['id', 'name']);
        $wallets = Wallet::orderBy('name')->get(['id', 'name', 'balance']);

        return Inertia::render('Admin/Finance/MonthlySettlements/Index', [
            'settlements' => $settlements,
            'properties' => $properties,
            'wallets' => $wallets,
            'filters' => $request->only(['property_id', 'period_month']),
        ]);
    }

    /**
     * Generate or re-generate draft settlement
     */
    public function generate(Request $request, MonthlySettlementService $service): RedirectResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'period_month' => 'required|string|regex:/^\d{4}-\d{2}$/',
        ]);

        $property = Property::findOrFail($validated['property_id']);
        $settlement = $service->generateSettlement($property, $validated['period_month'], $user);

        return redirect()->route('admin.finance.settlements.show', $settlement->id)
            ->with('success', 'Laporan settlement bulan ini berhasil dibuat dalam status draft.');
    }

    /**
     * Show detailed monthly settlement report
     */
    public function show(Request $request, MonthlyPropertySettlement $settlement): Response
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance', 'property_manager'])) {
            abort(403, 'Unauthorized.');
        }

        $settlement->load(['property', 'items', 'createdBy', 'finalizedBy', 'targetWallet']);
        $wallets = Wallet::orderBy('name')->get(['id', 'name', 'balance']);

        return Inertia::render('Admin/Finance/MonthlySettlements/Show', [
            'settlement' => $settlement,
            'wallets' => $wallets,
            'canEdit' => in_array($user->role, ['super_admin', 'finance']) && $settlement->status === 'draft',
            'canFinalize' => $user->role === 'super_admin' && $settlement->status === 'draft',
        ]);
    }

    /**
     * Update draft settlement line items and percentages
     */
    public function update(Request $request, MonthlyPropertySettlement $settlement, MonthlySettlementService $service): RedirectResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'ops_fee_per_night' => 'nullable|numeric|min:0',
            'investor_share_percent' => 'nullable|numeric|min:0|max:100',
            'management_share_percent' => 'nullable|numeric|min:0|max:100',
            'zakat_percent' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:1000',
            'items' => 'nullable|array',
            'items.*.type' => 'required|in:omset,fix_cost,add_cost,var_cost',
            'items.*.date' => 'nullable|date',
            'items.*.item_name' => 'required|string|max:150',
            'items.*.amount' => 'required|numeric',
            'items.*.notes' => 'nullable|string|max:255',
        ]);

        $service->updateSettlement($settlement, $validated);

        return redirect()->back()->with('success', 'Laporan settlement berhasil diperbarui.');
    }

    /**
     * Finalize settlement (Tutup Buku) and transfer net profit/loss to target wallet
     */
    public function finalize(Request $request, MonthlyPropertySettlement $settlement, MonthlySettlementService $service): RedirectResponse
    {
        $user = $request->user();
        if ($user->role !== 'super_admin') {
            abort(403, 'Hanya Super Admin yang dapat melakukan Tutup Buku.');
        }

        $validated = $request->validate([
            'target_wallet_id' => 'required|exists:wallets,id',
        ]);

        $service->finalizeAndClose($settlement, (int) $validated['target_wallet_id'], $user);

        return redirect()->back()->with('success', 'Tutup Buku akhir bulan berhasil dilakukan. Saldo hasil usaha telah dimutasi ke wallet tujuan.');
    }
}
