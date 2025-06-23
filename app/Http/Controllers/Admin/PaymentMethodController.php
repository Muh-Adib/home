<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Http\Requests\StorePaymentMethodRequest;
use App\Http\Requests\UpdatePaymentMethodRequest;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;

/**
 * Payment Method Controller
 * 
 * This controller handles the payment method process for admin bookings.
 * It includes methods for creating, storing, and managing payment methods.
 * 
 * @package App\Http\Controllers\Admin
 * @author Muhammad Adib Aulia Hanif <adwk.project@gmail.com>
 */

class PaymentMethodController extends Controller
{
    /**
     * Display a listing of payment methods.
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
     * Show the form for creating a new payment method.
     */
    public function create(): Response
    {
        $this->authorize('managePaymentMethods', PaymentMethod::class);

        return Inertia::render('Admin/PaymentMethods/Create');
    }

    /**
     * Store a newly created payment method.
     */
    public function store(StorePaymentMethodRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // Handle QR code upload
        if ($request->hasFile('qr_code')) {
            $validated['qr_code'] = $request->file('qr_code')->store('payment-methods/qr-codes', 'public');
        }

        // Set sort order
        $validated['sort_order'] = PaymentMethod::max('sort_order') + 1;

        PaymentMethod::create($validated);

        return redirect()->route('admin.payment-methods.index')
            ->with('success', 'Payment method created successfully.');
    }

    /**
     * Display the specified payment method.
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
     * Show the form for editing the specified payment method.
     */
    public function edit(PaymentMethod $paymentMethod): Response
    {
        $this->authorize('managePaymentMethods', PaymentMethod::class);

        return Inertia::render('Admin/PaymentMethods/Edit', [
            'paymentMethod' => $paymentMethod,
        ]);
    }

    /**
     * Update the specified payment method.
     */
    public function update(UpdatePaymentMethodRequest $request, PaymentMethod $paymentMethod): RedirectResponse
    {
        $validated = $request->validated();

        // Handle QR code upload
        if ($request->hasFile('qr_code')) {
            // Delete old QR code
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
     * Remove the specified payment method.
     */
    public function destroy(PaymentMethod $paymentMethod): RedirectResponse
    {
        $this->authorize('managePaymentMethods', PaymentMethod::class);

        // Check if payment method is used in any payments
        if ($paymentMethod->payments()->exists()) {
            return back()->withErrors([
                'error' => 'Cannot delete payment method that has been used in payments.'
            ]);
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
     * Toggle payment method active status.
     */
    public function toggle(PaymentMethod $paymentMethod): RedirectResponse
    {
        $this->authorize('managePaymentMethods', PaymentMethod::class);

        $paymentMethod->update([
            'is_active' => !$paymentMethod->is_active
        ]);

        $status = $paymentMethod->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "Payment method {$status} successfully.");
    }

    /**
     * Update sort order of payment methods.
     */
    public function updateOrder(Request $request): RedirectResponse
    {
        $this->authorize('managePaymentMethods', PaymentMethod::class);

        $validated = $request->validate([
            'payment_methods' => 'required|array',
            'payment_methods.*.id' => 'required|exists:payment_methods,id',
            'payment_methods.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($validated['payment_methods'] as $item) {
            PaymentMethod::where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return back()->with('success', 'Payment methods order updated successfully.');
    }
} 