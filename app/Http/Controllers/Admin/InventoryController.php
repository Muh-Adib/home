<?php

namespace App\Http\Controllers\Admin;

use App\Exports\InventoryItemsExport;
use App\Exports\InventoryPurchasesExport;
use App\Exports\InventoryUsagesExport;
use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\InventoryStockMovement;
use App\Models\InventoryUsage;
use App\Models\Property;
use App\Models\PropertyExpense;
use App\Models\User;
use App\Models\UserActivityLog;
use App\Services\InventoryService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class InventoryController extends Controller
{
    private function logActivity(Request $request, string $type, ?string $refType, ?int $refId, string $description, ?array $properties = null)
    {
        UserActivityLog::create([
            'user_id' => $request->user()?->id,
            'activity_type' => $type,
            'reference_type' => $refType,
            'reference_id' => $refId,
            'description' => $description,
            'properties' => $properties,
        ]);
    }

    public function itemsIndex(Request $request)
    {
        $sortColumn = $request->input('sort', 'name');
        $sortDirection = $request->input('direction', 'asc');

        $query = InventoryItem::with('assignedUser');

        if (in_array($sortColumn, ['name', 'sku', 'unit', 'min_stock', 'category', 'current_stock'])) {
            if ($sortColumn === 'current_stock') {
                $items = $query->get();
                if ($sortDirection === 'asc') {
                    $items = $items->sortBy('current_stock');
                } else {
                    $items = $items->sortByDesc('current_stock');
                }
            } else {
                $query->orderBy($sortColumn, $sortDirection);
                $items = $query->get();
            }
        } else {
            $items = $query->orderBy('name')->get();
        }

        $staffUsers = User::whereIn('role', ['housekeeping', 'property_manager', 'super_admin', 'front_desk', 'finance'])
            ->orderBy('name')
            ->get(['id', 'name', 'role']);

        return Inertia::render('Admin/Inventory/Items', [
            'items' => $items->map(function ($it) {
                return [
                    'id' => $it->id,
                    'name' => $it->name,
                    'sku' => $it->sku,
                    'unit' => $it->unit,
                    'category' => $it->category,
                    'image_path' => $it->image_path,
                    'min_stock' => (float) $it->min_stock,
                    'selling_price' => (float) $it->selling_price,
                    'current_stock' => (float) $it->current_stock,
                    'is_below_min' => (float) $it->current_stock < (float) $it->min_stock,
                    'assigned_user_id' => $it->assigned_user_id,
                    'assigned_user' => $it->assignedUser ? [
                        'id' => $it->assignedUser->id,
                        'name' => $it->assignedUser->name,
                        'role' => $it->assignedUser->role,
                    ] : null,
                ];
            })->values(),
            'staffUsers' => $staffUsers,
        ]);
    }

    public function itemsStore(Request $request)
    {
        foreach (['sku', 'category', 'min_stock', 'selling_price', 'assigned_user_id'] as $field) {
            if ($request->has($field) && $request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('inventory_items')->whereNull('deleted_at')],
            'unit' => ['required', 'string', 'max:20'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'category' => ['nullable', 'string', 'max:50'],
            'image' => ['nullable', 'image', 'max:4096'],
            'assigned_user_id' => ['nullable', 'exists:users,id'],
        ]);

        if (empty($data['sku'])) {
            $data['sku'] = InventoryItem::generateUniqueSku();
        }

        $path = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('inventory/items', 'public');
        }

        $existingDeleted = InventoryItem::withTrashed()
            ->where('sku', $data['sku'])
            ->whereNotNull('deleted_at')
            ->first();

        if ($existingDeleted) {
            $existingDeleted->restore();
            $existingDeleted->update([
                'name' => $data['name'],
                'unit' => $data['unit'],
                'min_stock' => $data['min_stock'] ?? 0,
                'selling_price' => $data['selling_price'] ?? 0,
                'category' => $data['category'] ?? null,
                'image_path' => $path ?? $existingDeleted->image_path,
                'assigned_user_id' => $data['assigned_user_id'] ?? null,
            ]);

            $this->logActivity($request, 'create_item', 'item', $existingDeleted->id, "Memulihkan & memperbarui item dari tong sampah: {$existingDeleted->name} (SKU: {$existingDeleted->sku})", $existingDeleted->toArray());

            return back()->with('success', 'Item berhasil dipulihkan dan diperbarui (SKU ditemukan di tong sampah)');
        }

        $item = InventoryItem::create([
            'name' => $data['name'],
            'sku' => $data['sku'],
            'unit' => $data['unit'],
            'min_stock' => $data['min_stock'] ?? 0,
            'selling_price' => $data['selling_price'] ?? 0,
            'category' => $data['category'] ?? null,
            'image_path' => $path,
            'assigned_user_id' => $data['assigned_user_id'] ?? null,
        ]);

        $this->logActivity($request, 'create_item', 'item', $item->id, "Menambahkan item baru: {$item->name} (SKU: {$item->sku})", $item->toArray());

        return back()->with('success', 'Item berhasil dibuat');
    }

    public function itemsEdit(InventoryItem $item)
    {
        $this->authorize('update', $item);

        return response()->json([
            'id' => $item->id,
            'name' => $item->name,
            'sku' => $item->sku,
            'unit' => $item->unit,
            'min_stock' => (float) $item->min_stock,
            'selling_price' => (float) $item->selling_price,
            'category' => $item->category,
            'image_path' => $item->image_path,
            'assigned_user_id' => $item->assigned_user_id,
        ]);
    }

    public function itemsUpdate(Request $request, InventoryItem $item)
    {
        $this->authorize('update', $item);

        foreach (['sku', 'category', 'min_stock', 'selling_price', 'assigned_user_id'] as $field) {
            if ($request->has($field) && $request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('inventory_items')->ignore($item->id)->whereNull('deleted_at')],
            'unit' => ['required', 'string', 'max:20'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'category' => ['nullable', 'string', 'max:50'],
            'image' => ['nullable', 'image', 'max:4096'],
            'assigned_user_id' => ['nullable', 'exists:users,id'],
        ]);

        if (empty($data['sku'])) {
            $data['sku'] = InventoryItem::generateUniqueSku();
        }

        $path = $item->image_path;
        if ($request->hasFile('image')) {
            if ($path && \Storage::disk('public')->exists($path)) {
                \Storage::disk('public')->delete($path);
            }
            $path = $request->file('image')->store('inventory/items', 'public');
        }

        $original = $item->toArray();

        $item->update([
            'name' => $data['name'],
            'sku' => $data['sku'],
            'unit' => $data['unit'],
            'min_stock' => $data['min_stock'] ?? 0,
            'selling_price' => $data['selling_price'] ?? 0,
            'category' => $data['category'] ?? null,
            'image_path' => $path,
            'assigned_user_id' => $data['assigned_user_id'] ?? null,
        ]);

        $changes = $item->getChanges();
        if (! empty($changes)) {
            $diffs = [];
            foreach ($changes as $k => $v) {
                if ($k === 'updated_at') {
                    continue;
                }
                $oldVal = $original[$k] ?? 'NULL';
                $diffs[] = "{$k}: '{$oldVal}' → '{$v}'";
            }
            $description = "Memperbarui item {$item->name}: ".implode(', ', $diffs);
            $this->logActivity($request, 'update_item', 'item', $item->id, $description, [
                'old' => $original,
                'new' => $item->toArray(),
            ]);
        }

        return back()->with('success', 'Item berhasil diperbarui');
    }

    public function itemsDestroy(Request $request, InventoryItem $item)
    {
        $this->authorize('delete', $item);

        $hasMovements = InventoryStockMovement::where('inventory_item_id', $item->id)->exists();
        $hasUsages = InventoryUsage::where('inventory_item_id', $item->id)->exists();

        if ($hasMovements || $hasUsages) {
            return back()->withErrors([
                'error' => 'Item tidak dapat dihapus karena masih memiliki riwayat stock movement atau usage. Hapus riwayat terlebih dahulu atau nonaktifkan item.',
            ]);
        }

        $this->logActivity($request, 'delete_item', 'item', $item->id, "Menghapus item: {$item->name} (SKU: {$item->sku})", $item->toArray());

        $item->delete();

        return back()->with('success', 'Item berhasil dihapus');
    }

    public function itemsShow(InventoryItem $item)
    {
        $item->load('assignedUser');

        $movements = InventoryStockMovement::where('inventory_item_id', $item->id)
            ->with(['user', 'property'])
            ->orderBy('movement_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($m) {
                return [
                    'id' => $m->id,
                    'type' => $m->type,
                    'quantity' => (float) $m->quantity,
                    'unit_cost' => (float) $m->unit_cost,
                    'total_cost' => (float) $m->total_cost,
                    'movement_date' => $m->movement_date,
                    'notes' => $m->notes,
                    'user_name' => $m->user?->name ?? 'System',
                    'property_name' => $m->property?->name ?? 'Global/Gudang',
                ];
            });

        $activityLogs = UserActivityLog::where('reference_type', 'item')
            ->where('reference_id', $item->id)
            ->with('user')
            ->latest()
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user_name' => $log->user?->name ?? 'System',
                    'activity_type' => $log->activity_type,
                    'description' => $log->description,
                    'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('Admin/Inventory/ItemDetail', [
            'item' => [
                'id' => $item->id,
                'name' => $item->name,
                'sku' => $item->sku,
                'unit' => $item->unit,
                'category' => $item->category,
                'min_stock' => (float) $item->min_stock,
                'selling_price' => (float) $item->selling_price,
                'current_stock' => (float) $item->current_stock,
                'image_path' => $item->image_path,
                'assigned_user_name' => $item->assignedUser?->name,
            ],
            'ledger' => $movements,
            'activityLogs' => $activityLogs,
        ]);
    }

    public function purchasesIndex(Request $request)
    {
        $items = InventoryItem::with('assignedUser')->orderBy('name')->get(['id', 'name', 'unit', 'category', 'assigned_user_id']);
        $properties = Property::orderBy('name')->get(['id', 'name']);

        $query = InventoryStockMovement::with(['item.assignedUser', 'property'])
            ->where('type', 'purchase');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->whereHas('item', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $sortDirection = $request->input('direction', 'desc');
        $query->orderBy('movement_date', $sortDirection);

        $movements = $query->paginate(20)->withQueryString();

        return Inertia::render('Admin/Inventory/Purchases', [
            'items' => $items,
            'properties' => $properties,
            'purchases' => $movements,
            'filters' => $request->only(['search', 'direction']),
        ]);
    }

    public function purchasesStore(Request $request, InventoryService $service)
    {
        if ($request->has('property_id') && $request->input('property_id') === '') {
            $request->merge(['property_id' => null]);
        }

        $data = $request->validate([
            'inventory_item_id' => ['required', 'exists:inventory_items,id'],
            'property_id' => ['nullable', 'exists:properties,id'],
            'quantity' => ['required', 'numeric', 'min:0.0001'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'movement_date' => ['required', 'date'],
            'vendor_name' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $movement = $service->recordPurchase(
            (int) $data['inventory_item_id'],
            (float) $data['quantity'],
            (float) $data['unit_cost'],
            $data['property_id'] ?? null,
            $data['movement_date'],
            $request->user()->id,
            $data['notes'] ?? null,
            $data['vendor_name'] ?? null
        );

        $this->logActivity(
            $request,
            'create_purchase',
            'item',
            $movement->inventory_item_id,
            "Mencatat pembelian item: {$movement->item->name} sebanyak {$movement->quantity} {$movement->item->unit}",
            $movement->toArray()
        );

        return back()->with('success', 'Pembelian stok dicatat');
    }

    public function purchasesUpdate(Request $request, InventoryStockMovement $purchase)
    {
        if ($purchase->type !== 'purchase') {
            abort(403);
        }

        if ($request->has('property_id') && $request->input('property_id') === '') {
            $request->merge(['property_id' => null]);
        }

        $data = $request->validate([
            'quantity' => ['required', 'numeric', 'min:0.0001'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'movement_date' => ['required', 'date'],
            'vendor_name' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:255'],
            'property_id' => ['nullable', 'exists:properties,id'],
        ]);

        DB::transaction(function () use ($purchase, $data) {
            $totalCost = round($data['quantity'] * $data['unit_cost'], 2);

            $purchase->update([
                'quantity' => $data['quantity'],
                'unit_cost' => $data['unit_cost'],
                'total_cost' => $totalCost,
                'movement_date' => $data['movement_date'],
                'vendor_name' => $data['vendor_name'] ?? null,
                'notes' => $data['notes'] ?? null,
                'property_id' => $data['property_id'] ?? null,
            ]);

            if ($purchase->reference_type === 'expense' && $purchase->reference_id) {
                $expense = PropertyExpense::find($purchase->reference_id);
                if ($expense) {
                    $item = $purchase->item;
                    $expense->update([
                        'amount' => $totalCost,
                        'expense_date' => $data['movement_date'],
                        'vendor_name' => $data['vendor_name'] ?? null,
                        'notes' => $data['notes'] ?? null,
                        'description' => 'Pembelian '.$item->name.' qty '.$data['quantity'].' '.$item->unit,
                    ]);
                }
            }
        });

        $this->logActivity(
            $request,
            'update_purchase',
            'item',
            $purchase->inventory_item_id,
            "Mengubah data pembelian item: {$purchase->item->name} (Qty: {$purchase->quantity}, Unit Cost: {$purchase->unit_cost})",
            $purchase->toArray()
        );

        return back()->with('success', 'Data pembelian diperbarui');
    }

    public function purchasesDestroy(Request $request, InventoryStockMovement $purchase)
    {
        if ($purchase->type !== 'purchase') {
            abort(403);
        }

        $itemId = $purchase->inventory_item_id;
        $purchaseDetails = $purchase->toArray();
        $itemName = $purchase->item?->name;

        DB::transaction(function () use ($purchase) {
            if ($purchase->reference_type === 'expense' && $purchase->reference_id) {
                $expense = PropertyExpense::find($purchase->reference_id);
                if ($expense) {
                    $expense->delete();
                }
            }
            $purchase->delete();
        });

        $this->logActivity(
            $request,
            'delete_purchase',
            'item',
            $itemId,
            "Menghapus riwayat pembelian item: {$itemName} (Qty: {$purchaseDetails['quantity']})",
            $purchaseDetails
        );

        return back()->with('success', 'Data pembelian dihapus');
    }

    public function usagesIndex(Request $request)
    {
        $items = InventoryItem::with('assignedUser')->orderBy('name')->get(['id', 'name', 'unit', 'average_unit_cost', 'selling_price', 'category', 'assigned_user_id']);
        $properties = Property::orderBy('name')->get(['id', 'name']);

        $query = InventoryUsage::with(['item.assignedUser', 'property', 'expense']);

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->whereHas('item', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $sortDirection = $request->input('direction', 'desc');
        $query->orderBy('usage_date', $sortDirection);

        $usages = $query->paginate(20)->withQueryString();

        $startThisMonth = Carbon::now()->startOfMonth();
        $endThisMonth = Carbon::now()->endOfMonth();
        $startLastMonth = Carbon::now()->subMonth()->startOfMonth();
        $endLastMonth = Carbon::now()->subMonth()->endOfMonth();

        $currentUsages = InventoryUsage::whereBetween('usage_date', [$startThisMonth, $endThisMonth])
            ->with(['item', 'property'])
            ->get()
            ->groupBy('property_id');

        $lastUsages = InventoryUsage::whereBetween('usage_date', [$startLastMonth, $endLastMonth])
            ->get()
            ->groupBy('property_id');

        $usageStats = [];

        foreach ($properties as $property) {
            $propCurrent = $currentUsages->get($property->id) ?? collect();
            $propLast = $lastUsages->get($property->id) ?? collect();

            $itemIds = $propCurrent->pluck('inventory_item_id')
                ->merge($propLast->pluck('inventory_item_id'))
                ->unique();

            $propertyStats = [];
            foreach ($itemIds as $itemId) {
                $item = $items->firstWhere('id', $itemId);
                if (! $item) {
                    continue;
                }

                $currentQty = $propCurrent->where('inventory_item_id', $itemId)->sum('quantity_used');
                $lastQty = $propLast->where('inventory_item_id', $itemId)->sum('quantity_used');

                if ($currentQty > 0 || $lastQty > 0) {
                    $propertyStats[] = [
                        'item_name' => $item->name,
                        'unit' => $item->unit,
                        'current_qty' => (float) $currentQty,
                        'last_qty' => (float) $lastQty,
                        'diff' => (float) ($currentQty - $lastQty),
                        'percent_change' => $lastQty > 0 ? round((($currentQty - $lastQty) / $lastQty) * 100, 1) : 100,
                    ];
                }
            }

            if (! empty($propertyStats)) {
                $usageStats[] = [
                    'property_name' => $property->name,
                    'stats' => $propertyStats,
                ];
            }
        }

        return Inertia::render('Admin/Inventory/Usages', [
            'items' => $items,
            'properties' => $properties,
            'usages' => $usages,
            'usageStats' => $usageStats,
            'filters' => $request->only(['search', 'direction']),
        ]);
    }

    public function usagesStore(Request $request, InventoryService $service)
    {
        $data = $request->validate([
            'inventory_item_id' => ['required', 'exists:inventory_items,id'],
            'usage_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
            'usages' => ['required', 'array', 'min:1'],
            'usages.*.property_id' => ['nullable'],
            'usages.*.quantity_used' => ['required', 'numeric', 'min:0.0001'],
        ]);

        DB::transaction(function () use ($data, $service, $request) {
            foreach ($data['usages'] as $usageRow) {
                $propId = (! empty($usageRow['property_id']) && is_numeric($usageRow['property_id'])) ? (int) $usageRow['property_id'] : null;

                $usageRecord = $service->recordUsage(
                    (int) $data['inventory_item_id'],
                    $propId,
                    $data['usage_date'],
                    (float) $usageRow['quantity_used'],
                    $request->user()->id,
                    $data['notes'] ?? null
                );

                $propName = $usageRecord->property?->name ?? 'Global / Dapur & Laundry';
                $this->logActivity(
                    $request,
                    'create_usage',
                    'item',
                    $usageRecord->inventory_item_id,
                    "Mencatat pemakaian item: {$usageRecord->item->name} ({$propName}) sebanyak {$usageRecord->quantity_used} {$usageRecord->item->unit}",
                    $usageRecord->toArray()
                );
            }
        });

        return back()->with('success', 'Pemakaian dicatat');
    }

    public function usagesUpdate(Request $request, InventoryUsage $usage)
    {
        $data = $request->validate([
            'property_id' => ['nullable'],
            'usage_date' => ['required', 'date'],
            'quantity_used' => ['required', 'numeric', 'min:0.0001'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $propId = (! empty($data['property_id']) && is_numeric($data['property_id'])) ? (int) $data['property_id'] : null;

        DB::transaction(function () use ($usage, $data, $propId) {
            $item = $usage->item;
            $unitCost = $item->selling_price > 0 ? (float) $item->selling_price : (float) $item->average_unit_cost;
            $totalCost = round($unitCost * (float) $data['quantity_used'], 2);

            $usage->update([
                'property_id' => $propId,
                'usage_date' => $data['usage_date'],
                'quantity_used' => $data['quantity_used'],
                'total_cost' => $totalCost,
                'notes' => $data['notes'] ?? null,
            ]);

            $movement = InventoryStockMovement::where('reference_type', 'usage')
                ->where('reference_id', $usage->id)
                ->first();

            if ($movement) {
                $movement->update([
                    'property_id' => $propId,
                    'quantity' => $data['quantity_used'],
                    'movement_date' => $data['usage_date'],
                    'total_cost' => $totalCost,
                    'notes' => $data['notes'] ?? null,
                ]);
            }

            if ($usage->expense_id) {
                $expense = PropertyExpense::find($usage->expense_id);
                if ($expense) {
                    $expense->update([
                        'property_id' => $propId,
                        'amount' => $totalCost,
                        'expense_date' => $data['usage_date'],
                        'notes' => $data['notes'] ?? ('Inventory usage: '.$item->name),
                        'description' => "Penggunaan {$item->name} - {$data['quantity_used']} {$item->unit}",
                    ]);
                }
            }
        });

        $this->logActivity(
            $request,
            'update_usage',
            'item',
            $usage->inventory_item_id,
            "Mengubah pemakaian item: {$usage->item->name} di properti {$usage->property?->name} (Qty: {$usage->quantity_used})",
            $usage->toArray()
        );

        return back()->with('success', 'Data pemakaian diperbarui');
    }

    public function usagesDestroy(Request $request, InventoryUsage $usage)
    {
        $itemId = $usage->inventory_item_id;
        $usageDetails = $usage->toArray();
        $itemName = $usage->item?->name;
        $propertyName = $usage->property?->name;

        DB::transaction(function () use ($usage) {
            InventoryStockMovement::where('reference_type', 'usage')
                ->where('reference_id', $usage->id)
                ->delete();

            $expenseId = $usage->expense_id;
            if ($expenseId) {
                $usage->update(['expense_id' => null]);

                $expense = PropertyExpense::find($expenseId);
                if ($expense) {
                    $expense->delete();
                }
            }

            $usage->delete();
        });

        $this->logActivity(
            $request,
            'delete_usage',
            'item',
            $itemId,
            "Menghapus pemakaian item: {$itemName} di properti {$propertyName} (Qty: {$usageDetails['quantity_used']})",
            $usageDetails
        );

        return back()->with('success', 'Data pemakaian dihapus');
    }

    public function exportItems(Request $request)
    {
        $category = $request->input('category');

        return Excel::download(
            new InventoryItemsExport($category),
            'inventory_items_'.now()->format('Y-m-d_His').'.xlsx'
        );
    }

    public function exportPurchases(Request $request)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        return Excel::download(
            new InventoryPurchasesExport($dateFrom, $dateTo),
            'inventory_purchases_'.now()->format('Y-m-d_His').'.xlsx'
        );
    }

    public function exportUsages(Request $request)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        return Excel::download(
            new InventoryUsagesExport($dateFrom, $dateTo),
            'inventory_usages_'.now()->format('Y-m-d_His').'.xlsx'
        );
    }
}
