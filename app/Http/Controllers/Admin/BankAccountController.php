<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\PaymentMethod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Bank Account Controller
 *
 * Mengelola rekening bank properti secara terpusat untuk checkout & link pembayaran.
 */
class BankAccountController extends Controller
{
    private function checkAccess(Request $request): void
    {
        if (! in_array($request->user()->role, ['super_admin', 'property_manager', 'finance'])) {
            abort(403, 'Unauthorized action.');
        }
    }

    /**
     * Display a listing of bank accounts.
     */
    public function index(Request $request): Response
    {
        $this->checkAccess($request);

        $query = BankAccount::query();

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('bank_name', 'like', "%{$search}%")
                    ->orWhere('account_number', 'like', "%{$search}%")
                    ->orWhere('account_holder', 'like', "%{$search}%")
                    ->orWhere('label', 'like', "%{$search}%");
            });
        }

        $bankAccounts = $query->orderBy('bank_name')
            ->orderBy('label')
            ->paginate(20);

        // Stats
        $stats = [
            'total' => BankAccount::count(),
        ];

        return Inertia::render('Admin/BankAccounts/Index', [
            'bankAccounts' => $bankAccounts,
            'stats' => $stats,
            'filters' => [
                'search' => $request->input('search'),
            ],
        ]);
    }

    /**
     * Show the form for creating a new bank account.
     */
    public function create(Request $request): Response
    {
        $this->checkAccess($request);

        return Inertia::render('Admin/BankAccounts/Create', [
            'paymentMethods' => PaymentMethod::where('type', 'bank_transfer')->active()->get(),
        ]);
    }

    /**
     * Store a newly created bank account.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->checkAccess($request);

        $validated = $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'account_number' => 'required|string|max:50|unique:bank_accounts,account_number',
            'account_holder' => 'required|string|max:255',
            'label' => 'required|string|max:255',
        ]);

        $pm = PaymentMethod::findOrFail($request->input('payment_method_id'));
        $validated['bank_name'] = $pm->name;
        $validated['bank_code'] = $pm->code;

        BankAccount::create($validated);

        return redirect()->route('admin.bank-accounts.index')
            ->with('success', 'Rekening bank berhasil ditambahkan.');
    }

    /**
     * Show the form for editing the specified bank account.
     */
    public function edit(Request $request, BankAccount $bankAccount): Response
    {
        $this->checkAccess($request);

        return Inertia::render('Admin/BankAccounts/Edit', [
            'bankAccount' => $bankAccount,
            'paymentMethods' => PaymentMethod::where('type', 'bank_transfer')->active()->get(),
        ]);
    }

    /**
     * Update the specified bank account in storage.
     */
    public function update(Request $request, BankAccount $bankAccount): RedirectResponse
    {
        $this->checkAccess($request);

        $validated = $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'account_number' => 'required|string|max:50|unique:bank_accounts,account_number,'.$bankAccount->id,
            'account_holder' => 'required|string|max:255',
            'label' => 'required|string|max:255',
        ]);

        $pm = PaymentMethod::findOrFail($request->input('payment_method_id'));
        $validated['bank_name'] = $pm->name;
        $validated['bank_code'] = $pm->code;

        $bankAccount->update($validated);

        return redirect()->route('admin.bank-accounts.index')
            ->with('success', 'Rekening bank berhasil diperbarui.');
    }

    /**
     * Remove the specified bank account from storage.
     */
    public function destroy(Request $request, BankAccount $bankAccount): RedirectResponse
    {
        $this->checkAccess($request);

        // Check if bank account has properties
        if ($bankAccount->properties()->exists()) {
            return back()->with('error', 'Rekening bank tidak dapat dihapus karena masih digunakan oleh beberapa properti.');
        }

        $bankAccount->delete();

        return redirect()->route('admin.bank-accounts.index')
            ->with('success', 'Rekening bank berhasil dihapus.');
    }
}
