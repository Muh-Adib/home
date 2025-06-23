<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InventoryStock;
use App\Models\InventoryItem;
use App\Models\Property;
use App\Models\InventoryTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class InventoryStockController extends Controller
{
    /**
     * Display a listing of inventory stocks
     */
    public function index(Request $request): Response
    {
        $query = InventoryStock::with(['item', 'property', 'transactions']);

        // Apply filters
        if ($request->filled('property_id')) {
            $query->where('property_id', $request->property_id);
        }

        if ($request->filled('item_id')) {
            $query->where('item_id', $request->item_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('condition')) {
            $query->where('condition_status', $request->condition);
        }

        if ($request->filled('location')) {
            $query->where('location', 'like', "%{$request->location}%");
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('item', function($subQ) use ($search) {
                    $subQ->where('name', 'like', "%{$search}%")
                         ->orWhere('item_code', 'like', "%{$search}%");
                })
                ->orWhere('serial_number', 'like', "%{$search}%")
                ->orWhere('location', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort', 'created_at');
        $sortDirection = $request->get('direction', 'desc');
        
        if (in_array($sortBy, ['quantity', 'status', 'condition_status', 'created_at'])) {
            $query->orderBy($sortBy, $sortDirection);
        }

        $stocks = $query->paginate(20)->withQueryString();

        // Get filter options
        $properties = Property::select('id', 'name')->where('status', 'active')->get();
        $items = InventoryItem::select('id', 'name', 'item_code')->where('status', 'active')->get();

        // Get statistics
        $stats = [
            'total_stocks' => InventoryStock::count(),
            'in_stock' => InventoryStock::where('status', 'in_stock')->count(),
            'reserved' => InventoryStock::where('status', 'reserved')->count(),
            'maintenance' => InventoryStock::where('status', 'maintenance')->count(),
            'low_stock_items' => InventoryStock::whereHas('item', function($q) {
                $q->whereRaw('inventory_items.total_stock <= inventory_items.min_stock_level');
            })->distinct('item_id')->count(),
        ];

        return Inertia::render('Admin/InventoryStocks/Index', [
            'stocks' => $stocks,
            'properties' => $properties,
            'items' => $items,
            'stats' => $stats,
            'filters' => $request->only(['property_id', 'item_id', 'status', 'condition', 'location', 'search']),
            'statuses' => InventoryStock::STATUSES,
            'conditions' => InventoryStock::CONDITION_STATUSES,
        ]);
    }

    /**
     * Store a newly created stock record
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'item_id' => 'required|exists:inventory_items,id',
            'property_id' => 'required|exists:properties,id',
            'quantity' => 'required|integer|min:1',
            'location' => 'required|string|max:255',
            'condition_status' => 'required|in:' . implode(',', array_keys(InventoryStock::CONDITION_STATUSES)),
            'purchase_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after:today',
            'serial_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = 'in_stock';

        $stock = InventoryStock::create($validated);

        // Update item total stock
        $stock->item->updateTotalStock();

        // Create stock-in transaction
        InventoryTransaction::create([
            'item_id' => $stock->item_id,
            'property_id' => $stock->property_id,
            'stock_id' => $stock->id,
            'transaction_number' => InventoryTransaction::generateTransactionNumber(),
            'transaction_type' => 'stock_in',
            'quantity' => $stock->quantity,
            'quantity_before' => 0,
            'quantity_after' => $stock->quantity,
            'unit_cost' => $stock->item->unit_cost,
            'total_cost' => $stock->quantity * $stock->item->unit_cost,
            'reason' => 'Initial stock',
            'created_by' => auth()->id(),
            'status' => 'completed',
        ]);

        return redirect()->route('admin.inventory-stocks.show', $stock)
            ->with('success', 'Stock record created successfully.');
    }

    /**
     * Display the specified stock
     */
    public function show(InventoryStock $inventoryStock): Response
    {
        $inventoryStock->load(['item', 'property', 'transactions.createdByUser']);

        return Inertia::render('Admin/InventoryStocks/Show', [
            'stock' => $inventoryStock,
            'canEdit' => auth()->user()->can('update', $inventoryStock),
            'canManage' => auth()->user()->can('manage', $inventoryStock),
        ]);
    }

    /**
     * Reserve stock
     */
    public function reserve(Request $request, InventoryStock $inventoryStock): RedirectResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1|max:' . $inventoryStock->quantity,
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($inventoryStock->status !== 'in_stock') {
            return back()->withErrors(['error' => 'Can only reserve available stock.']);
        }

        // Create reservation transaction
        InventoryTransaction::create([
            'item_id' => $inventoryStock->item_id,
            'property_id' => $inventoryStock->property_id,
            'stock_id' => $inventoryStock->id,
            'transaction_number' => InventoryTransaction::generateTransactionNumber(),
            'transaction_type' => 'reservation',
            'quantity' => $validated['quantity'],
            'quantity_before' => $inventoryStock->quantity,
            'quantity_after' => $inventoryStock->quantity - $validated['quantity'],
            'unit_cost' => $inventoryStock->item->unit_cost,
            'total_cost' => $validated['quantity'] * $inventoryStock->item->unit_cost,
            'reason' => $validated['reason'],
            'notes' => $validated['notes'],
            'created_by' => auth()->id(),
            'status' => 'completed',
        ]);

        // Update stock
        $inventoryStock->update([
            'quantity' => $inventoryStock->quantity - $validated['quantity'],
            'status' => $inventoryStock->quantity - $validated['quantity'] > 0 ? 'in_stock' : 'reserved'
        ]);

        $inventoryStock->item->updateTotalStock();

        return back()->with('success', 'Stock reserved successfully.');
    }

    /**
     * Add stock
     */
    public function addStock(Request $request, InventoryStock $inventoryStock): RedirectResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $quantityBefore = $inventoryStock->quantity;

        // Create stock-in transaction
        InventoryTransaction::create([
            'item_id' => $inventoryStock->item_id,
            'property_id' => $inventoryStock->property_id,
            'stock_id' => $inventoryStock->id,
            'transaction_number' => InventoryTransaction::generateTransactionNumber(),
            'transaction_type' => 'stock_in',
            'quantity' => $validated['quantity'],
            'quantity_before' => $quantityBefore,
            'quantity_after' => $quantityBefore + $validated['quantity'],
            'unit_cost' => $inventoryStock->item->unit_cost,
            'total_cost' => $validated['quantity'] * $inventoryStock->item->unit_cost,
            'reason' => $validated['reason'],
            'notes' => $validated['notes'],
            'created_by' => auth()->id(),
            'status' => 'completed',
        ]);

        // Update stock
        $inventoryStock->update([
            'quantity' => $quantityBefore + $validated['quantity'],
            'status' => 'in_stock'
        ]);

        $inventoryStock->item->updateTotalStock();

        return back()->with('success', 'Stock added successfully.');
    }

    /**
     * Use stock
     */
    public function useStock(Request $request, InventoryStock $inventoryStock): RedirectResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1|max:' . $inventoryStock->quantity,
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($inventoryStock->status !== 'in_stock') {
            return back()->withErrors(['error' => 'Can only use available stock.']);
        }

        $quantityBefore = $inventoryStock->quantity;

        // Create stock-out transaction
        InventoryTransaction::create([
            'item_id' => $inventoryStock->item_id,
            'property_id' => $inventoryStock->property_id,
            'stock_id' => $inventoryStock->id,
            'transaction_number' => InventoryTransaction::generateTransactionNumber(),
            'transaction_type' => 'stock_out',
            'quantity' => $validated['quantity'],
            'quantity_before' => $quantityBefore,
            'quantity_after' => $quantityBefore - $validated['quantity'],
            'unit_cost' => $inventoryStock->item->unit_cost,
            'total_cost' => $validated['quantity'] * $inventoryStock->item->unit_cost,
            'reason' => $validated['reason'],
            'notes' => $validated['notes'],
            'created_by' => auth()->id(),
            'status' => 'completed',
        ]);

        // Update stock
        $newQuantity = $quantityBefore - $validated['quantity'];
        $inventoryStock->update([
            'quantity' => $newQuantity,
            'status' => $newQuantity > 0 ? 'in_stock' : 'out_of_stock'
        ]);

        $inventoryStock->item->updateTotalStock();

        return back()->with('success', 'Stock used successfully.');
    }

    /**
     * Update condition
     */
    public function updateCondition(Request $request, InventoryStock $inventoryStock): RedirectResponse
    {
        $validated = $request->validate([
            'condition_status' => 'required|in:' . implode(',', array_keys(InventoryStock::CONDITION_STATUSES)),
            'notes' => 'nullable|string',
        ]);

        $oldCondition = $inventoryStock->condition_status;
        $inventoryStock->update($validated);

        // Log condition change if maintenance related
        if (in_array($validated['condition_status'], ['needs_repair', 'damaged', 'under_maintenance'])) {
            $inventoryStock->update(['status' => 'maintenance']);
        } elseif ($validated['condition_status'] === 'excellent' && $inventoryStock->status === 'maintenance') {
            $inventoryStock->update(['status' => 'in_stock']);
        }

        return back()->with('success', 'Condition updated successfully.');
    }

    /**
     * Schedule maintenance
     */
    public function scheduleMaintenance(Request $request, InventoryStock $inventoryStock): RedirectResponse
    {
        $validated = $request->validate([
            'maintenance_date' => 'required|date|after_or_equal:today',
            'notes' => 'nullable|string',
        ]);

        $inventoryStock->update([
            'status' => 'maintenance',
            'next_maintenance_date' => $validated['maintenance_date'],
            'notes' => $validated['notes']
        ]);

        return back()->with('success', 'Maintenance scheduled successfully.');
    }

    /**
     * Complete maintenance
     */
    public function completeMaintenance(Request $request, InventoryStock $inventoryStock): RedirectResponse
    {
        $validated = $request->validate([
            'condition_status' => 'required|in:' . implode(',', array_keys(InventoryStock::CONDITION_STATUSES)),
            'notes' => 'nullable|string',
        ]);

        $inventoryStock->update([
            'status' => 'in_stock',
            'condition_status' => $validated['condition_status'],
            'last_maintenance_date' => now(),
            'next_maintenance_date' => $inventoryStock->item->requires_maintenance 
                ? now()->addDays($inventoryStock->item->maintenance_interval_days)
                : null,
            'notes' => $validated['notes']
        ]);

        return back()->with('success', 'Maintenance completed successfully.');
    }

    /**
     * Get alerts for stock
     */
    public function getAlerts(InventoryStock $inventoryStock): JsonResponse
    {
        $alerts = [];

        // Low stock alert
        if ($inventoryStock->quantity <= $inventoryStock->item->min_stock_level) {
            $alerts[] = [
                'type' => 'low_stock',
                'message' => 'Stock level is below minimum threshold',
                'severity' => 'warning'
            ];
        }

        // Expiry alert
        if ($inventoryStock->expiry_date && $inventoryStock->expiry_date <= now()->addDays(30)) {
            $alerts[] = [
                'type' => 'expiry',
                'message' => 'Item expires within 30 days',
                'severity' => $inventoryStock->expiry_date <= now()->addDays(7) ? 'danger' : 'warning',
                'expiry_date' => $inventoryStock->expiry_date
            ];
        }

        // Maintenance alert
        if ($inventoryStock->next_maintenance_date && $inventoryStock->next_maintenance_date <= now()->addDays(7)) {
            $alerts[] = [
                'type' => 'maintenance',
                'message' => 'Maintenance due within 7 days',
                'severity' => 'info',
                'maintenance_date' => $inventoryStock->next_maintenance_date
            ];
        }

        return response()->json($alerts);
    }
}
