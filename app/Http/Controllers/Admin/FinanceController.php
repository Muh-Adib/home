<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Income;
use App\Models\PropertyExpense;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Property;
use App\Models\PaymentMethod;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Admin/Finance/Index', [
            'summary' => [
                'totalIncome' => (float) Income::whereYear('income_date', now()->year)->sum('amount'),
                'totalExpense' => (float) PropertyExpense::whereYear('expense_date', now()->year)->sum('amount'),
            ],
        ]);
    }

    public function incomes(Request $request)
    {
        $incomes = Income::with(['property', 'booking', 'wallet'])
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
        $query = PropertyExpense::with(['property', 'creator', 'approver']);

        // Apply filters
        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where(function($q) use ($search) {
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

        if ($request->filled('property_id')) {
            if ($request->input('property_id') === 'null' || $request->input('property_id') === '') {
                $query->whereNull('property_id');
            } else {
                $query->where('property_id', $request->input('property_id'));
            }
        }

        if ($request->filled('is_inventory') && $request->input('is_inventory') === 'true') {
            $query->where('payment_method', 'inventory_usage');
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
        $properties = Property::select('id', 'name')->orderBy('name')->get();
        
        // Get wallets untuk dropdown (filtered by user visibility)
        $user = $request->user();
        $wallets = Wallet::visibleToUser($user->id, $user->role)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Finance/Expenses', [
            'expenses' => $expenses,
            'expenseCategories' => $categories,
            'expenseTypes' => $types,
            'properties' => $properties,
            'wallets' => $wallets,
            'totalByProperty' => $totalByProperty,
            'totalGeneral' => $totalGeneral,
            'totalAll' => $totalAll,
        ]);
    }

    public function wallets(Request $request)
    {
        $user = $request->user();
        
        // Filter wallets berdasarkan created_by untuk user biasa
        // Finance/Super Admin tetap bisa lihat semua
        $wallets = Wallet::visibleToUser($user->id, $user->role)
            ->withCount('transactions')
            ->with(['property:id,name', 'creator:id,name'])
            ->orderBy('name')
            ->get();

        $properties = Property::select('id', 'name')->orderBy('name')->get();
        $paymentMethods = PaymentMethod::select('id', 'name', 'type', 'bank_name', 'wallet_id')->orderBy('name')->get();

        return Inertia::render('Admin/Finance/Wallets', [
            'wallets' => $wallets,
            'properties' => $properties,
            'paymentMethods' => $paymentMethods,
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

        if (!empty($validated['wallet_id'])) {
            $this->recordWallet($validated['wallet_id'], 'in', $validated['amount'], $validated['income_date'], 'income', $income->id, $validated['description'] ?? '');
        }

        return redirect()->back()->with('success', 'Income berhasil disimpan');
    }

    public function storeExpense(Request $request)
    {
        $validated = $request->validate([
            'property_id' => ['nullable', 'exists:properties,id'],
            'expense_category' => ['required', 'in:'.implode(',', array_keys(config('finance.expense_categories')))],
            'expense_type' => ['required', 'in:'.implode(',', array_keys(config('finance.expense_types')))],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'expense_date' => ['required', 'date'],
            'vendor_name' => ['nullable', 'string', 'max:100'],
            'receipt_number' => ['nullable', 'string', 'max:100'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:255'],
            'wallet_id' => ['nullable', 'exists:wallets,id'],
        ]);

        $expense = PropertyExpense::create([
            'property_id' => $validated['property_id'] ?? null,
            'expense_category' => $validated['expense_category'],
            'expense_type' => $validated['expense_type'],
            'description' => $validated['description'] ?? null,
            'amount' => $validated['amount'],
            'expense_date' => $validated['expense_date'],
            'vendor_name' => $validated['vendor_name'] ?? null,
            'receipt_number' => $validated['receipt_number'] ?? null,
            'payment_method' => $validated['payment_method'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $request->user()->id,
            'status' => 'approved',
        ]);

        if (!empty($validated['wallet_id'])) {
            $this->recordWallet($validated['wallet_id'], 'out', $validated['amount'], $validated['expense_date'], 'expense', $expense->id, $validated['description'] ?? '');
        }

        return redirect()->back()->with('success', 'Pengeluaran berhasil disimpan');
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
        ]);

        // Coalesce nulls ke default agar tidak melanggar NOT NULL (SQLite tidak menerapkan default jika nilai null dikirim)
        $validated['property_id'] = $validated['property_id'] ?? null;
        $validated['is_savings'] = (bool)($validated['is_savings'] ?? false);
        $validated['auto_deduct_from_monthly_report'] = (bool)($validated['auto_deduct_from_monthly_report'] ?? false);
        $validated['savings_monthly_amount'] = $validated['savings_monthly_amount'] ?? 0;
        $validated['target_amount'] = $validated['target_amount'] ?? null;
        $validated['target_date'] = $validated['target_date'] ?? null;
        
        // Set created_by to current user
        $validated['created_by'] = $request->user()->id;

        $wallet = Wallet::create($validated);
        return redirect()->back()->with('success', 'Wallet berhasil dibuat');
    }

    public function mapPaymentMethodToWallet(Request $request, PaymentMethod $paymentMethod)
    {
        $this->authorize('update', $paymentMethod);
        $validated = $request->validate([
            'wallet_id' => ['nullable', 'exists:wallets,id'],
        ]);
        $paymentMethod->update([
            'wallet_id' => $validated['wallet_id'] ?? null,
        ]);
        return back()->with('success', 'Payment method berhasil dihubungkan ke wallet');
    }

    public function storeWalletTransaction(Request $request, Wallet $wallet)
    {
        // Authorization: user harus creator wallet atau admin/finance
        $user = $request->user();
        if ($wallet->created_by !== $user->id && !in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized to perform transaction on this wallet');
        }

        $validated = $request->validate([
            'direction' => ['required', 'in:in,out'],
            'amount' => ['required', 'numeric', 'min:0'],
            'transaction_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        // Check balance untuk transaction OUT
        if ($validated['direction'] === 'out') {
            $currentBalance = $wallet->fresh()->balance;
            if ($currentBalance < $validated['amount']) {
                return redirect()->back()->withErrors([
                    'amount' => 'Saldo tidak cukup. Saldo saat ini: Rp ' . number_format($currentBalance, 0, ',', '.')
                ]);
            }
        }

        try {
        $this->recordWallet($wallet->id, $validated['direction'], $validated['amount'], $validated['transaction_date'], 'manual', null, $validated['description'] ?? '');
        return redirect()->back()->with('success', 'Transaksi wallet berhasil disimpan');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'error' => 'Gagal menyimpan transaksi: ' . $e->getMessage()
            ]);
        }
    }

    public function walletReport(Request $request, Wallet $wallet)
    {
        // Authorization: user harus creator wallet atau admin/finance
        $user = $request->user();
        if ($wallet->created_by !== $user->id && !in_array($user->role, ['super_admin', 'finance'])) {
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

        return Inertia::render('Admin/Finance/WalletReport', [
            'wallet' => $walletData,
            'transactions' => $transactions,
            'totalIn' => $totalIn,
            'totalOut' => $totalOut,
            'netAmount' => $netAmount,
            'filterFrom' => $request->input('from'),
            'filterTo' => $request->input('to'),
        ]);
    }

    private function recordWallet(int $walletId, string $direction, float $amount, string $date, string $refType, ?int $refId, string $description): void
    {
        $wallet = Wallet::findOrFail($walletId);

        WalletTransaction::create([
            'wallet_id' => $walletId,
            'direction' => $direction,
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
                'error' => $e->getMessage()
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

        // Get all properties for filter
        $properties = Property::select('id', 'name')->orderBy('name')->get();

        // Build query for incomes
        $incomesQuery = Income::whereBetween('income_date', [$startDate, $endDate]);
        if ($propertyId) {
            if ($propertyId === 'null') {
                $incomesQuery->whereNull('property_id');
            } else {
                $incomesQuery->where('property_id', $propertyId);
            }
        }

        // Build query for expenses
        $expensesQuery = PropertyExpense::whereBetween('expense_date', [$startDate, $endDate]);
        if ($propertyId) {
            if ($propertyId === 'null') {
                $expensesQuery->whereNull('property_id');
            } else {
                $expensesQuery->where('property_id', $propertyId);
            }
        }

        $incomes = $incomesQuery->with(['property', 'booking'])->get();
        $expenses = $expensesQuery->with(['property'])->get();

        // Calculate totals
        $totalIncome = $incomes->sum('amount');
        $totalExpense = $expenses->sum('amount');
        $netProfit = $totalIncome - $totalExpense;

        // Group by property
        $byProperty = [];
        
        // Income by property
        $incomeByProperty = $incomes->groupBy(function ($item) {
            return $item->property_id ?? 'global';
        })->map(function ($group) {
            return $group->sum('amount');
        });

        // Expense by property
        $expenseByProperty = $expenses->groupBy(function ($item) {
            return $item->property_id ?? 'global';
        })->map(function ($group) {
            return $group->sum('amount');
        });

        // Combine for each property
        $propertyIds = $incomeByProperty->keys()->merge($expenseByProperty->keys())->unique();
        
        foreach ($propertyIds as $propId) {
            $property = $propId === 'global' ? null : Property::find($propId);
            $propIncome = $incomeByProperty->get($propId, 0);
            $propExpense = $expenseByProperty->get($propId, 0);
            
            $byProperty[] = [
                'property_id' => $propId,
                'property_name' => $property ? $property->name : 'Perusahaan (Global)',
                'total_income' => $propIncome,
                'total_expense' => $propExpense,
                'net_profit' => $propIncome - $propExpense,
            ];
        }

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

        return Inertia::render('Admin/Finance/Report', [
            'startDate' => $startDate,
            'endDate' => $endDate,
            'selectedPropertyId' => $propertyId,
            'properties' => $properties,
            'totalIncome' => $totalIncome,
            'totalExpense' => $totalExpense,
            'netProfit' => $netProfit,
            'byProperty' => $byProperty,
            'expensesByCategory' => $expensesByCategory,
            'incomesBySource' => $incomesBySource,
            'incomes' => $incomes,
            'expenses' => $expenses,
        ]);
    }
}


