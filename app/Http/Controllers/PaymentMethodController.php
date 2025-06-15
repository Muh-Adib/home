<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Gate;

class PaymentMethodController extends Controller
{
    /**
     * Display a listing of payment methods (Admin)
     */
    public function index(Request $request): Response
    {
        $this->authorize('managePaymentMethods', PaymentMethod::class);
        
        $query = PaymentMethod::query();

        // Search
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by type
        if ($request->filled('type')) {
            $query->where('type', $request->get('type'));
        }

        // Filter by status
        if ($request->filled('status')) {
            $status = $request->get('status') === 'active';
            $query->where('is_active', $status);
        }

        $paymentMethods = $query->orderBy('sort_order')
                               ->orderBy('name')
                               ->paginate(20);

        // Stats
        $stats = [
            'total' => PaymentMethod::count(),
            'active' => PaymentMethod::where('is_active', true)->count(),
            'bank_transfers' => PaymentMethod::where('type', 'bank_transfer')->count(),
            'e_wallets' => PaymentMethod::where('type', 'e_wallet')->count(),
        ];

        return Inertia::render('Admin/PaymentMethods/Index', [
            'paymentMethods' => $paymentMethods,
            'stats' => $stats,
            'filters' => [
                'search' => $request->get('search'),
                'type' => $request->get('type'),
                'status' => $request->get('status'),
            ]
        ]);
    }

    /**
     * Show the form for creating a new payment method
     */
    public function create(): Response
    {
        $this->authorize('managePaymentMethods', Payment::class);
        
        return Inertia::render('Admin/PaymentMethods/Create');
    }

    /**
     * Store a newly created payment method
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('managePaymentMethods', Payment::class);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50|unique:payment_methods,code',
            'type' => 'required|in:bank_transfer,e_wallet,credit_card,cash',
            'icon' => 'nullable|string|max:10',
            'description' => 'nullable|string',
            'account_number' => 'nullable|string|max:100',
            'account_name' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'qr_code' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'instructions' => 'nullable|array',
            'instructions.*' => 'string|max:500',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0|max:999',
        ]);

        // Handle QR code upload
        if ($request->hasFile('qr_code')) {
            $validated['qr_code'] = $request->file('qr_code')->store('payment-methods/qr-codes', 'public');
        }

        PaymentMethod::create($validated);

        return redirect()->route('admin.payment-methods.index')
            ->with('success', 'Payment method created successfully.');
    }

    /**
     * Display the specified payment method
     */
    public function show(PaymentMethod $paymentMethod): Response
    {
        $this->authorize('managePaymentMethods', PaymentMethod::class);

        $paymentMethod->load(['payments' => function ($query) {
            $query->latest()->limit(10);
        }]);

        // Stats for this payment method
        $stats = [
            'total_payments' => $paymentMethod->payments()->count(),
            'verified_payments' => $paymentMethod->payments()->where('payment_status', 'verified')->count(),
            'total_amount' => $paymentMethod->payments()
                                           ->where('payment_status', 'verified')
                                           ->sum('amount'),
            'last_used' => $paymentMethod->payments()->latest()->first()?->created_at,
        ];

        return Inertia::render('Admin/PaymentMethods/Show', [
            'paymentMethod' => $paymentMethod,
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for editing the specified payment method
     */
    public function edit(PaymentMethod $paymentMethod): Response
    {
        $this->authorize('managePaymentMethods', Payment::class);

        return Inertia::render('Admin/PaymentMethods/Edit', [
            'paymentMethod' => $paymentMethod,
        ]);
    }

    /**
     * Update the specified payment method
     */
    public function update(Request $request, PaymentMethod $paymentMethod): RedirectResponse
    {
        $this->authorize('managePaymentMethods', Payment::class);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50|unique:payment_methods,code,' . $paymentMethod->id,
            'type' => 'required|in:bank_transfer,e_wallet,credit_card,cash',
            'icon' => 'nullable|string|max:10',
            'description' => 'nullable|string',
            'account_number' => 'nullable|string|max:100',
            'account_name' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'qr_code' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'instructions' => 'nullable|array',
            'instructions.*' => 'string|max:500',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0|max:999',
        ]);

        // Handle QR code upload
        if ($request->hasFile('qr_code')) {
            // Delete old QR code if exists
            if ($paymentMethod->qr_code) {
                Storage::disk('public')->delete($paymentMethod->qr_code);
            }
            $validated['qr_code'] = $request->file('qr_code')->store('payment-methods/qr-codes', 'public');
        }

        $paymentMethod->update($validated);

        return redirect()->route('admin.payment-methods.index')
            ->with('success', 'Payment method updated successfully.');
    }

    /**
     * Remove the specified payment method
     */
    public function destroy(PaymentMethod $paymentMethod): RedirectResponse
    {
        $this->authorize('managePaymentMethods', Payment::class);

        // Check if payment method is being used
        if ($paymentMethod->payments()->exists()) {
            return redirect()->back()
                ->with('error', 'Cannot delete payment method that has been used in payments.');
        }

        // Delete QR code file if exists
        if ($paymentMethod->qr_code) {
            Storage::disk('public')->delete($paymentMethod->qr_code);
        }

        $paymentMethod->delete();

        return redirect()->route('admin.payment-methods.index')
            ->with('success', 'Payment method deleted successfully.');
    }

    /**
     * Toggle payment method status
     */
    public function toggle(PaymentMethod $paymentMethod): RedirectResponse
    {
        $this->authorize('managePaymentMethods', Payment::class);

        $paymentMethod->update([
            'is_active' => !$paymentMethod->is_active
        ]);

        $status = $paymentMethod->is_active ? 'activated' : 'deactivated';

        return redirect()->back()
            ->with('success', "Payment method {$status} successfully.");
    }

    /**
     * Update sort order of payment methods
     */
    public function updateOrder(Request $request): RedirectResponse
    {
        $this->authorize('managePaymentMethods', Payment::class);

        $validated = $request->validate([
            'payment_methods' => 'required|array',
            'payment_methods.*.id' => 'required|exists:payment_methods,id',
            'payment_methods.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($validated['payment_methods'] as $methodData) {
            PaymentMethod::where('id', $methodData['id'])
                        ->update(['sort_order' => $methodData['sort_order']]);
        }

        return redirect()->back()
            ->with('success', 'Payment methods order updated successfully.');
    }
}
