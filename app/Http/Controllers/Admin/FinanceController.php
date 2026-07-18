<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Booking;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanPayment;
use App\Models\Income;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\PropertyExpense;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\ExpenseService;
use App\Services\WalletService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FinanceController extends Controller
{
    public function index(Request $request, WalletService $walletService)
    {
        $user = $request->user();

        // Pastikan setiap rekening bank memiliki wallet/dompet kas masing-masing
        $walletService->ensureEveryBankAccountHasWallet($user->id);

        // Saldo masing-masing rekening
        $wallets = Wallet::visibleToUser($user->id, $user->role)
            ->with(['property:id,name', 'bankAccount'])
            ->orderBy('name')
            ->get();

        $bankAccounts = BankAccount::with('wallet')
            ->orderBy('label')
            ->get();

        $totalIncome = (float) Income::whereYear('income_date', now()->year)->sum('amount');
        $totalExpense = (float) PropertyExpense::whereYear('expense_date', now()->year)->sum('amount');

        // Scope breakdown for chart
        $scopeBreakdown = PropertyExpense::whereYear('expense_date', now()->year)
            ->selectRaw('expense_scope, SUM(amount) as total')
            ->groupBy('expense_scope')
            ->get()
            ->pluck('total', 'expense_scope')
            ->toArray();

        return Inertia::render('Admin/Finance/Index', [
            'wallets' => $wallets,
            'bankAccounts' => $bankAccounts,
            'summary' => [
                'totalIncome' => $totalIncome,
                'totalExpense' => $totalExpense,
                'netProfit' => $totalIncome - $totalExpense,
            ],
            'scopeBreakdown' => $scopeBreakdown,
            'expenseScopes' => config('finance.expense_scopes'),
        ]);
    }

    public function incomes(Request $request)
    {
        $incomes = Income::with(['property', 'booking', 'wallet', 'payment'])
            ->orderByDesc('income_date')
            ->paginate(20)
            ->withQueryString();

        $properties = Property::select('id', 'name')->orderBy('name')->get();
        $user = $request->user();
        $wallets = Wallet::visibleToUser($user->id, $user->role)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Finance/Incomes', [
            'incomes' => $incomes,
            'properties' => $properties,
            'wallets' => $wallets,
        ]);
    }

    public function expenses(Request $request)
    {
        $query = PropertyExpense::with(['property', 'creator', 'approver', 'wallet', 'booking', 'inventoryUsage.item', 'stockMovement.item']);

        // Apply filters
        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('vendor_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('from')) {
            $query->whereDate('expense_date', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('expense_date', '<=', $request->input('to'));
        }

        if ($request->filled('type')) {
            $query->where('expense_type', $request->input('type'));
        }

        if ($request->filled('category')) {
            $query->where('expense_category', $request->input('category'));
        }

        if ($request->filled('scope')) {
            $query->where('expense_scope', $request->input('scope'));
        }

        if ($request->filled('wallet_id')) {
            $query->where('wallet_id', $request->input('wallet_id'));
        }

        if ($request->filled('property_id')) {
            if ($request->input('property_id') === 'null' || $request->input('property_id') === '') {
                $query->whereNull('property_id');
            } else {
                $query->where('property_id', $request->input('property_id'));
            }
        }

        if ($request->filled('is_inventory') && $request->input('is_inventory') === 'true') {
            // Filter expenses yang terkait dengan inventory usage via relasi
            $query->whereHas('inventoryUsage');
        }

        $expenses = $query->orderByDesc('expense_date')
            ->paginate(20)
            ->withQueryString();

        // Calculate summaries
        $totalByProperty = PropertyExpense::selectRaw('property_id, SUM(amount) as total')
            ->groupBy('property_id')
            ->get()
            ->keyBy('property_id');

        $totalGeneral = PropertyExpense::whereNull('property_id')->sum('amount');
        $totalAll = PropertyExpense::sum('amount');

        $categories = config('finance.expense_categories');
        $types = config('finance.expense_types');
        $scopes = config('finance.expense_scopes');
        $scopeCategories = config('finance.scope_categories');
        $properties = Property::select('id', 'name', 'ownership_model', 'investor_split_pct')->orderBy('name')->get();

        // Get wallets untuk dropdown (filtered by user visibility)
        $user = $request->user();
        $wallets = Wallet::visibleToUser($user->id, $user->role)
            ->select('id', 'name', 'balance')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Finance/Expenses', [
            'expenses' => $expenses,
            'expenseCategories' => $categories,
            'expenseTypes' => $types,
            'expenseScopes' => $scopes,
            'scopeCategories' => $scopeCategories,
            'properties' => $properties,
            'wallets' => $wallets,
            'totalByProperty' => $totalByProperty,
            'totalGeneral' => $totalGeneral,
            'totalAll' => $totalAll,
        ]);
    }

    public function wallets(Request $request, WalletService $walletService)
    {
        $user = $request->user();

        // Pastikan setiap rekening bank memiliki wallet/dompet kas masing-masing
        $walletService->ensureEveryBankAccountHasWallet($user->id);

        // Filter wallets berdasarkan created_by untuk user biasa
        // Finance/Super Admin tetap bisa lihat semua
        $wallets = Wallet::visibleToUser($user->id, $user->role)
            ->withCount('transactions')
            ->with(['property:id,name', 'creator:id,name'])
            ->orderBy('name')
            ->get();

        $properties = Property::select('id', 'name')->orderBy('name')->get();
        $paymentMethods = PaymentMethod::select('id', 'name', 'type', 'bank_name', 'wallet_id')->orderBy('name')->get();
        $walletCategories = config('finance.wallet_transaction_categories', []);
        $walletPurposes = config('finance.wallet_purposes', []);

        return Inertia::render('Admin/Finance/Wallets', [
            'wallets' => $wallets,
            'properties' => $properties,
            'paymentMethods' => $paymentMethods,
            'walletCategories' => $walletCategories,
            'walletPurposes' => $walletPurposes,
        ]);
    }

    public function storeIncome(Request $request)
    {
        $validated = $request->validate([
            'property_id' => ['nullable', 'exists:properties,id'],
            'booking_id' => ['nullable', 'exists:bookings,id'],
            'source' => ['required', 'string'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'income_date' => ['required', 'date'],
            'wallet_id' => ['nullable', 'exists:wallets,id'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['created_by'] = $request->user()->id;
        $income = Income::create($validated);

        if (! empty($validated['wallet_id'])) {
            $this->recordWallet($validated['wallet_id'], 'in', $validated['amount'], $validated['income_date'], 'income', $income->id, $validated['description'] ?? '');
        }

        return redirect()->back()->with('success', 'Income berhasil disimpan');
    }

    public function storeExpense(Request $request, ExpenseService $expenseService)
    {
        $validated = $request->validate([
            'property_id' => ['nullable', 'exists:properties,id'],
            'booking_id' => ['nullable', 'exists:bookings,id'],
            'expense_category' => ['required', 'string', 'max:50'],
            'expense_type' => ['required', 'string', 'max:50'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'expense_date' => ['required', 'date'],
            'vendor_name' => ['nullable', 'string', 'max:100'],
            'receipt_number' => ['nullable', 'string', 'max:100'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:255'],
            'wallet_id' => ['nullable', 'exists:wallets,id'],
            'expense_scope' => ['required', 'string', 'in:operational,unit,house,kitchen,capital,prive'],
            'capital_split_investor_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        try {
            $expense = $expenseService->recordExpense($validated, $request->user()->id);

            // Handle receipt image upload if present
            if ($request->hasFile('receipt_image')) {
                $expenseService->uploadReceipt($expense, $request->file('receipt_image'));
            }

            return redirect()->back()->with('success', 'Pengeluaran berhasil disimpan');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function updateExpense(Request $request, PropertyExpense $expense, ExpenseService $expenseService)
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'property_manager'])) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'property_id' => ['nullable', 'exists:properties,id'],
            'booking_id' => ['nullable', 'exists:bookings,id'],
            'expense_category' => ['required', 'string', 'max:50'],
            'expense_type' => ['required', 'string', 'max:50'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'expense_date' => ['required', 'date'],
            'vendor_name' => ['nullable', 'string', 'max:100'],
            'receipt_number' => ['nullable', 'string', 'max:100'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:255'],
            'wallet_id' => ['nullable', 'exists:wallets,id'],
            'expense_scope' => ['required', 'string', 'in:operational,unit,house,kitchen,capital,prive'],
            'capital_split_investor_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        try {
            $expenseService->updateExpense($expense, $validated, $user->id);

            // Handle receipt image upload if present
            if ($request->hasFile('receipt_image')) {
                $expenseService->uploadReceipt($expense, $request->file('receipt_image'));
            }

            return redirect()->back()->with('success', 'Pengeluaran berhasil diperbarui');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function adjustBalance(Request $request, Wallet $wallet, ExpenseService $expenseService)
    {
        $user = $request->user();
        if ($wallet->created_by !== $user->id && ! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized to perform adjustment on this wallet');
        }

        $validated = $request->validate([
            'new_balance' => ['required', 'numeric', 'min:0'],
            'reason' => ['required', 'string', 'max:255'],
            'transaction_date' => ['required', 'date'],
        ]);

        try {
            $expenseService->adjustBalance(
                $wallet->id,
                (float) $validated['new_balance'],
                $validated['reason'],
                $validated['transaction_date'],
                $user->id
            );

            return redirect()->back()->with('success', 'Saldo berhasil disesuaikan');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function storeExpenseReceipt(Request $request, PropertyExpense $expense, ExpenseService $expenseService)
    {
        $request->validate([
            'receipt_image' => ['required', 'image', 'max:4096'],
        ]);

        try {
            $expenseService->uploadReceipt($expense, $request->file('receipt_image'));

            return redirect()->back()->with('success', 'Foto nota berhasil diunggah');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function storeWallet(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'in:property_linked,standalone_savings'],
            'property_id' => ['nullable', 'exists:properties,id'],
            'is_savings' => ['boolean'],
            'auto_deduct_from_monthly_report' => ['boolean'],
            'savings_monthly_amount' => ['nullable', 'numeric', 'min:0'],
            'target_amount' => ['nullable', 'numeric', 'min:0'],
            'target_date' => ['nullable', 'date', 'after_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:255'],
            'purpose' => ['required', 'string', 'max:50'],
        ]);

        // Coalesce nulls ke default agar tidak melanggar NOT NULL (SQLite tidak menerapkan default jika nilai null dikirim)
        $validated['property_id'] = $validated['property_id'] ?? null;
        $validated['is_savings'] = (bool) ($validated['is_savings'] ?? false);
        $validated['auto_deduct_from_monthly_report'] = (bool) ($validated['auto_deduct_from_monthly_report'] ?? false);
        $validated['savings_monthly_amount'] = $validated['savings_monthly_amount'] ?? 0;
        $validated['target_amount'] = $validated['target_amount'] ?? null;
        $validated['target_date'] = $validated['target_date'] ?? null;
        $validated['purpose'] = $validated['purpose'] ?? 'general';

        // Set created_by to current user
        $validated['created_by'] = $request->user()->id;

        $wallet = Wallet::create($validated);

        return redirect()->back()->with('success', 'Wallet berhasil dibuat');
    }

    public function updateWallet(Request $request, Wallet $wallet)
    {
        $user = $request->user();
        if ($wallet->created_by !== $user->id && ! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized to update this wallet');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'in:property_linked,standalone_savings'],
            'property_id' => ['nullable', 'exists:properties,id'],
            'is_savings' => ['boolean'],
            'auto_deduct_from_monthly_report' => ['boolean'],
            'savings_monthly_amount' => ['nullable', 'numeric', 'min:0'],
            'target_amount' => ['nullable', 'numeric', 'min:0'],
            'target_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
            'purpose' => ['required', 'string', 'max:50'],
        ]);

        $validated['property_id'] = $validated['property_id'] ?? null;
        $validated['is_savings'] = (bool) ($validated['is_savings'] ?? false);
        $validated['auto_deduct_from_monthly_report'] = (bool) ($validated['auto_deduct_from_monthly_report'] ?? false);
        $validated['savings_monthly_amount'] = $validated['savings_monthly_amount'] ?? 0;
        $validated['target_amount'] = $validated['target_amount'] ?? null;
        $validated['target_date'] = $validated['target_date'] ?? null;

        $wallet->update($validated);

        return redirect()->back()->with('success', 'Wallet berhasil diperbarui');
    }

    public function destroyWallet(Request $request, Wallet $wallet)
    {
        $user = $request->user();
        if ($wallet->created_by !== $user->id && ! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized to delete this wallet');
        }

        if ($wallet->transactions()->count() > 0) {
            return redirect()->back()->withErrors(['error' => 'Tidak dapat menghapus wallet yang sudah memiliki transaksi.']);
        }

        $wallet->delete();

        return redirect()->back()->with('success', 'Wallet berhasil dihapus');
    }

    public function mapPaymentMethodToWallet(Request $request, PaymentMethod $paymentMethod, WalletService $walletService)
    {
        $this->authorize('update', $paymentMethod);
        $validated = $request->validate([
            'wallet_id' => ['nullable', 'exists:wallets,id'],
        ]);
        $paymentMethod->update([
            'wallet_id' => $validated['wallet_id'] ?? null,
        ]);

        $walletService->syncAll();

        return back()->with('success', 'Payment method berhasil dihubungkan ke wallet');
    }

    public function storeWalletTransaction(Request $request, Wallet $wallet)
    {
        // Authorization: user harus creator wallet atau admin/finance
        $user = $request->user();
        if ($wallet->created_by !== $user->id && ! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized to perform transaction on this wallet');
        }

        $walletCategories = array_keys(config('finance.wallet_transaction_categories', []));

        // Build validation rules
        $validationRules = [
            'direction' => ['required', 'in:in,out'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transaction_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:255'],
        ];

        // Only add 'in' validation if categories are available
        if (! empty($walletCategories)) {
            $validationRules['category'] = ['required', 'in:'.implode(',', $walletCategories)];
        } else {
            // If no categories configured, just require category to be a string
            $validationRules['category'] = ['required', 'string', 'max:50'];
        }

        $validated = $request->validate($validationRules);

        // Check balance untuk transaction OUT
        if ($validated['direction'] === 'out') {
            $currentBalance = $wallet->fresh()->balance;
            if ($currentBalance < $validated['amount']) {
                return redirect()->back()->withErrors([
                    'amount' => 'Saldo tidak cukup. Saldo saat ini: Rp '.number_format($currentBalance, 0, ',', '.'),
                ]);
            }
        }

        try {
            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'direction' => $validated['direction'],
                'category' => $validated['category'],
                'amount' => $validated['amount'],
                'transaction_date' => $validated['transaction_date'],
                'reference_type' => 'manual',
                'reference_id' => null,
                'description' => $validated['description'] ?? '',
                'created_by' => $user->id,
            ]);

            // Update wallet balance
            if ($validated['direction'] === 'in') {
                $wallet->increment('balance', $validated['amount']);
            } else {
                $wallet->decrement('balance', $validated['amount']);
            }

            return redirect()->back()->with('success', 'Transaksi wallet berhasil disimpan');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'error' => 'Gagal menyimpan transaksi: '.$e->getMessage(),
            ]);
        }
    }

    public function walletReport(Request $request, Wallet $wallet)
    {
        // Authorization: user harus creator wallet atau admin/finance
        $user = $request->user();
        if ($wallet->created_by !== $user->id && ! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized to view this wallet report');
        }

        // Get transactions with filters
        $query = $wallet->transactions()->with('creator')->orderByDesc('transaction_date');

        if ($request->filled('from')) {
            $query->whereDate('transaction_date', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('transaction_date', '<=', $request->input('to'));
        }

        $transactions = $query->get();

        // Calculate summary
        $totalIn = $transactions->where('direction', 'in')->sum('amount');
        $totalOut = $transactions->where('direction', 'out')->sum('amount');
        $netAmount = $totalIn - $totalOut;

        $walletData = $wallet->load(['property', 'creator']);

        // Add computed properties for frontend
        $walletData->has_target = $walletData->hasTarget();
        $walletData->progress_percentage = $walletData->getProgressPercentage();
        $walletData->days_remaining = $walletData->getDaysRemaining();
        $walletData->is_target_achieved = $walletData->isTargetAchieved();

        $walletCategories = config('finance.wallet_transaction_categories', []);

        return Inertia::render('Admin/Finance/WalletReport', [
            'wallet' => $walletData,
            'transactions' => $transactions,
            'totalIn' => $totalIn,
            'totalOut' => $totalOut,
            'netAmount' => $netAmount,
            'filterFrom' => $request->input('from'),
            'filterTo' => $request->input('to'),
            'walletCategories' => $walletCategories,
        ]);
    }

    private function recordWallet(int $walletId, string $direction, float $amount, string $date, string $refType, ?int $refId, string $description): void
    {
        $wallet = Wallet::findOrFail($walletId);

        // Map reference type to category for consistency with WalletService
        $category = match ($refType) {
            'income' => 'income',
            'expense' => 'expense',
            'manual' => 'manual',
            'transfer' => 'transfer',
            default => null,
        };

        WalletTransaction::create([
            'wallet_id' => $walletId,
            'direction' => $direction,
            'category' => $category,
            'amount' => $amount,
            'transaction_date' => $date,
            'reference_type' => $refType,
            'reference_id' => $refId,
            'description' => $description,
            'created_by' => auth()->id(),
        ]);

        if ($direction === 'in') {
            $wallet->increment('balance', $amount);
        } else {
            $wallet->decrement('balance', $amount);
        }
    }

    /**
     * Transfer between wallets
     */
    public function transferWallet(Request $request, WalletService $walletService)
    {
        $validated = $request->validate([
            'from_wallet_id' => ['required', 'exists:wallets,id'],
            'to_wallet_id' => ['required', 'exists:wallets,id', 'different:from_wallet_id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transaction_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $result = $walletService->transfer(
                $validated['from_wallet_id'],
                $validated['to_wallet_id'],
                $validated['amount'],
                $validated['transaction_date'],
                $request->user()->id,
                $validated['description'] ?? null
            );

            return redirect()->back()->with('success', 'Transfer berhasil dilakukan');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Financial Report - Comprehensive
     */
    public function financialReport(Request $request)
    {
        $startDate = $request->input('from', now()->startOfMonth()->toDateString());
        $endDate = $request->input('to', now()->endOfMonth()->toDateString());
        $propertyId = $request->input('property_id');

        // Calculate days and month factor for scaling sewa/cicilan
        $days = Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate)) + 1;
        $monthFactor = max(0.1, round($days / 30.0, 4));

        // Get all properties
        $properties = Property::select('id', 'name', 'slug', 'type', 'ownership_model', 'owner_split_pct', 'investor_split_pct', 'monthly_rent_cost', 'monthly_mortgage_cost', 'mortgage_interest_monthly', 'initial_build_capital', 'lease_capital', 'capacity_max')
            ->orderBy('name')
            ->get();

        // Build query for incomes
        $incomesQuery = Income::whereBetween('income_date', [$startDate, $endDate]);
        if ($propertyId) {
            if ($propertyId === 'null') {
                $incomesQuery->whereNull('property_id');
            } else {
                $incomesQuery->where('property_id', $propertyId);
            }
        }
        $incomes = $incomesQuery->with(['property', 'booking'])->get();

        // Build query for expenses
        $expensesQuery = PropertyExpense::whereBetween('expense_date', [$startDate, $endDate]);
        if ($propertyId) {
            if ($propertyId === 'null') {
                $expensesQuery->whereNull('property_id');
            } else {
                $expensesQuery->where('property_id', $propertyId);
            }
        }
        $expenses = $expensesQuery->with(['property'])->get();

        // Calculate totals
        $totalIncome = $incomes->sum('amount');
        $totalExpense = $expenses->sum('amount');

        // Calculations by property
        $byProperty = [];
        $totalOwnerShare = 0;
        $totalInvestorShare = 0;
        $totalRentCost = 0;
        $totalInterestCost = 0;

        foreach ($properties as $property) {
            if ($propertyId && $propertyId !== 'null' && $property->id != $propertyId) {
                continue;
            }

            // Incomes for this property
            $propIncomes = $incomes->where('property_id', $property->id);
            $propNetRoomIncome = 0;
            $propOtherIncome = 0;

            foreach ($propIncomes as $income) {
                if ($income->booking_id && $income->booking && $income->source === 'booking') {
                    // Subtract commission
                    $commPct = $income->booking->commission_pct ?? ($income->booking->source === 'ota' ? 15.00 : 0.00);
                    $propNetRoomIncome += $income->amount * (1 - ($commPct / 100.0));
                } else {
                    $propOtherIncome += $income->amount;
                }
            }

            // Direct expenses for this property (exclude CAPEX and prive from operational costs)
            $propExpenses = $expenses->where('property_id', $property->id);
            $operationalExpenses = $propExpenses->whereNotIn('expense_scope', ['capital', 'prive']);
            $directCosts = $operationalExpenses->sum('amount');

            // Capital/CAPEX expenses in this period
            $propCapexExpenses = $propExpenses->where('expense_scope', 'capital');
            $periodCapex = $propCapexExpenses->sum('amount');

            // Prive in this period
            $periodPrive = $propExpenses->where('expense_scope', 'prive')->sum('amount');

            // Operational profit
            $labaOperasional = ($propNetRoomIncome + $propOtherIncome) - $directCosts;

            // Split calculation
            $investorShare = 0;
            $ownerShare = 0;

            if ($property->ownership_model === 'partnership') {
                // Calculate investor's and owner's shares of CAPEX
                $periodInvestorCapex = $propCapexExpenses->sum(function ($exp) use ($property) {
                    $pct = $exp->capital_split_investor_pct ?? $property->investor_split_pct;

                    return $exp->amount * ($pct / 100.0);
                });
                $periodOwnerCapex = $propCapexExpenses->sum(function ($exp) use ($property) {
                    $pct = isset($exp->capital_split_investor_pct) ? (100 - $exp->capital_split_investor_pct) : $property->owner_split_pct;

                    return $exp->amount * ($pct / 100.0);
                });

                $investorShare = ($labaOperasional * ($property->investor_split_pct / 100.0)) - $periodInvestorCapex;
                $ownerShare = ($labaOperasional * ($property->owner_split_pct / 100.0)) - $periodOwnerCapex - $periodPrive;
            } elseif ($property->ownership_model === 'rented') {
                $rent = $property->monthly_rent_cost * $monthFactor;
                $ownerShare = $labaOperasional - $rent - $periodCapex - $periodPrive;
                $investorShare = 0;
                $totalRentCost += $rent;
            } else { // owned
                $interest = $property->mortgage_interest_monthly * $monthFactor;
                $ownerShare = $labaOperasional - $periodCapex - $periodPrive;
                $investorShare = 0;
                $totalInterestCost += $interest;
            }

            $totalOwnerShare += $ownerShare;
            $totalInvestorShare += $investorShare;

            // Calculate booked nights / occupancy
            $bookedNights = $this->getBookedNightsForProperty($property->id, $startDate, $endDate);
            $occupancyRate = ($monthFactor * 30 > 0) ? ($bookedNights / ($monthFactor * 30)) * 100 : 0;
            $lowOccupancyAlert = $bookedNights < (25 * $monthFactor);

            // Cumulative net profit BEP calculations including capital expenses
            $allTimeIncome = Income::where('property_id', $property->id)->sum('amount');

            // All-time operational expenses (exclude CAPEX and prive)
            $allTimeExpense = PropertyExpense::where('property_id', $property->id)
                ->whereNotIn('expense_scope', ['capital', 'prive'])
                ->sum('amount');

            $firstTxDate = Income::where('property_id', $property->id)->min('income_date') ?? (optional($property->created_at)->toDateString() ?? now()->toDateString());
            $monthsSinceStart = max(1, round(Carbon::parse($firstTxDate)->diffInMonths(now())));

            $allTimeRentOrInterest = 0;
            if ($property->ownership_model === 'rented') {
                $allTimeRentOrInterest = $property->monthly_rent_cost * $monthsSinceStart;
            } elseif ($property->ownership_model === 'owned') {
                $allTimeRentOrInterest = $property->mortgage_interest_monthly * $monthsSinceStart;
            }

            // Cumulative approved CAPEX
            $allTimeCapex = PropertyExpense::where('property_id', $property->id)
                ->where('expense_scope', 'capital')
                ->where('status', 'approved')
                ->sum('amount');

            // Cumulative Prive
            $allTimePrive = PropertyExpense::where('property_id', $property->id)
                ->where('expense_scope', 'prive')
                ->where('status', 'approved')
                ->sum('amount');

            $cumulativeProfit = $allTimeIncome - $allTimeExpense - $allTimeRentOrInterest - $allTimePrive;

            // Total Capital includes initial capital + all-time CAPEX
            $capital = $property->initial_build_capital + $property->lease_capital + $allTimeCapex;
            $bepPct = $capital > 0 ? ($cumulativeProfit / $capital) * 100 : 0;
            $avgMonthlyProfit = $monthsSinceStart > 0 ? ($cumulativeProfit / $monthsSinceStart) : 0;
            $remainingMonths = ($avgMonthlyProfit > 0 && $cumulativeProfit < $capital) ? round(($capital - $cumulativeProfit) / $avgMonthlyProfit, 1) : 0;

            $byProperty[] = [
                'property_id' => $property->id,
                'property_name' => $property->name,
                'ownership_model' => $property->ownership_model,
                'total_income' => $propIncomes->sum('amount'),
                'total_expense' => $directCosts,
                'total_capex' => $periodCapex,
                'total_prive' => $periodPrive,
                'laba_operasional' => $labaOperasional,
                'investor_share' => $investorShare,
                'owner_share' => $ownerShare,
                'booked_nights' => $bookedNights,
                'occupancy_rate' => round($occupancyRate, 1),
                'low_occupancy_alert' => $lowOccupancyAlert,
                'bep_percentage' => round($bepPct, 1),
                'remaining_months' => $remainingMonths,
                'cumulative_profit' => $cumulativeProfit,
                'capital' => $capital,
            ];
        }

        // Group overhead
        // Expenses where property_id is null OR pointing to operational properties
        $groupOverhead = $expenses->filter(function ($exp) {
            return is_null($exp->property_id) || ($exp->property && $exp->property->type === 'operational');
        })->sum('amount');

        // Net profit owner after overhead & mortgage interest
        $netProfitOwner = $totalOwnerShare - $groupOverhead - $totalInterestCost;
        $zakat = $netProfitOwner > 0 ? $netProfitOwner * 0.025 : 0;

        // Group expenses by category
        $expensesByCategory = $expenses->groupBy('expense_category')->map(function ($group, $category) {
            return [
                'category' => $category,
                'label' => config("finance.expense_categories.{$category}", ucfirst($category)),
                'total' => $group->sum('amount'),
                'count' => $group->count(),
            ];
        })->values();

        // Group incomes by source
        $incomesBySource = $incomes->groupBy('source')->map(function ($group, $source) {
            return [
                'source' => $source,
                'total' => $group->sum('amount'),
                'count' => $group->count(),
            ];
        })->values();

        // Employee loans summary
        $loanDisbursements = EmployeeLoan::whereBetween('disbursed_at', [$startDate, $endDate])->sum('amount');
        $loanRepayments = EmployeeLoanPayment::whereBetween('paid_at', [$startDate, $endDate])->sum('amount');
        $outstandingLoans = EmployeeLoan::where('status', 'active')->sum('amount') - EmployeeLoanPayment::sum('amount');

        return Inertia::render('Admin/Finance/Report', [
            'startDate' => $startDate,
            'endDate' => $endDate,
            'selectedPropertyId' => $propertyId,
            'properties' => $properties,
            'totalIncome' => $totalIncome,
            'totalExpense' => $totalExpense,
            'byProperty' => $byProperty,
            'expensesByCategory' => $expensesByCategory,
            'incomesBySource' => $incomesBySource,
            'incomes' => $incomes,
            'expenses' => $expenses,
            'groupOverhead' => $groupOverhead,
            'totalRentCost' => $totalRentCost,
            'totalInterestCost' => $totalInterestCost,
            'netProfitOwner' => $netProfitOwner,
            'totalInvestorShare' => $totalInvestorShare,
            'zakat' => $zakat,
            'loanDisbursements' => $loanDisbursements,
            'loanRepayments' => $loanRepayments,
            'outstandingLoans' => $outstandingLoans,
        ]);
    }

    /**
     * Helper to calculate nights booked for a property in date range
     */
    private function getBookedNightsForProperty($propertyId, $startDate, $endDate): int
    {
        $bookings = Booking::where('property_id', $propertyId)
            ->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
            ->where('check_in', '<', $endDate)
            ->where('check_out', '>', $startDate)
            ->get(['check_in', 'check_out']);

        $totalNights = 0;
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        foreach ($bookings as $booking) {
            $checkIn = Carbon::parse($booking->check_in);
            $checkOut = Carbon::parse($booking->check_out);

            $overlapStart = $checkIn->max($start);
            $overlapEnd = $checkOut->min($end);

            if ($overlapStart->lt($overlapEnd)) {
                $totalNights += $overlapStart->diffInDays($overlapEnd);
            }
        }

        return $totalNights;
    }

    /**
     * Display employee loans (casbon) dashboard
     */
    public function loans(Request $request)
    {
        $loans = EmployeeLoan::with(['employee', 'creator', 'payments'])
            ->orderByDesc('disbursed_at')
            ->get();

        // Get all staff users for dropdown
        $employees = User::whereIn('role', ['property_manager', 'front_desk', 'housekeeping', 'finance'])->get(['id', 'name', 'role']);

        return Inertia::render('Admin/Finance/Loans', [
            'loans' => $loans,
            'employees' => $employees,
        ]);
    }

    /**
     * Store employee loan
     */
    public function storeLoan(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => ['required', 'exists:users,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'disbursed_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['status'] = 'active';
        $validated['created_by'] = $request->user()->id;

        EmployeeLoan::create($validated);

        return redirect()->back()->with('success', 'Casbon berhasil dicatat');
    }

    /**
     * Store loan payment
     */
    public function storeLoanPayment(Request $request, EmployeeLoan $loan)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
            'paid_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['employee_loan_id'] = $loan->id;
        $validated['created_by'] = $request->user()->id;

        EmployeeLoanPayment::create($validated);

        // Check if fully paid
        $totalPaid = $loan->payments()->sum('amount');
        if ($totalPaid >= $loan->amount) {
            $loan->update(['status' => 'paid']);
        }

        return redirect()->back()->with('success', 'Cicilan casbon berhasil dicatat');
    }
}
