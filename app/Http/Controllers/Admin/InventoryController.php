<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\InventoryStockMovement;
use App\Models\InventoryUsage;
use App\Models\Property;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class InventoryController extends Controller
{
    public function itemsIndex(Request $request)
    {
        $sortColumn = $request->input('sort', 'name');
        $sortDirection = $request->input('direction', 'asc');

        $query = InventoryItem::query();

        if (in_array($sortColumn, ['name', 'sku', 'unit', 'min_stock', 'category', 'current_stock'])) {
             // For virtual/accessor columns or standard columns, handle sorting
             // Note: current_stock is an accessor, so standard database sort might need subquery/join or collection sort.
             // Given the requirements, let's assume direct column sort for now, or collection sort if dataset is small.
             // Since we remove pagination, collection sort is safer for accessors if not too many items.
             // However, for best performance with `get()`, let's try DB sort where possible.
             if ($sortColumn === 'current_stock') {
                 // Sort by current_stock (accessor) requires loading then sorting, or complex query.
                 // Let's load first then sort collection since we expected "all items".
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
                    'current_stock' => (float) $it->current_stock,
                    'is_below_min' => (float) $it->current_stock < (float) $it->min_stock,
                ];
            })->values(), // values() to reset keys after sort if any
        ]);
    }

    public function itemsStore(Request $request)
    {
        $data = $request->validate([
            'name' => ['required','string','max:150'],
            'sku' => ['nullable','string','max:100','unique:inventory_items,sku'],
            'unit' => ['required','string','max:20'],
            'min_stock' => ['nullable','numeric','min:0'],
            'category' => ['nullable','string','max:50'],
            'image' => ['nullable','image','max:4096'],
        ]);

        // !jika ada item dengan sku yang sama berikan opsi untuk restore item dengan alretdialog

        $path = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('inventory/items', 'public');
        }

        // Check for existing soft-deleted item with same SKU
        if (!empty($data['sku'])) {
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
                    'category' => $data['category'] ?? null,
                    'image_path' => $path ?? $existingDeleted->image_path, // Update image only if new one uploaded
                ]);

                 return back()->with('success', 'Item berhasil dipulihkan dan diperbarui (SKU ditemukan di tong sampah)');
            }
        }

        InventoryItem::create([
            'name' => $data['name'],
            'sku' => $data['sku'] ?? null,
            'unit' => $data['unit'],
            'min_stock' => $data['min_stock'] ?? 0,
            'category' => $data['category'] ?? null,
            'image_path' => $path,
        ]);

        return back()->with('success', 'Item berhasil dibuat');
    }

    /**
     * Show the form for editing the specified item.
     * Returns item data for editing (frontend will handle the form)
     */
    public function itemsEdit(InventoryItem $item)
    {
        $this->authorize('update', $item);

        return response()->json([
            'id' => $item->id,
            'name' => $item->name,
            'sku' => $item->sku,
            'unit' => $item->unit,
            'min_stock' => (float) $item->min_stock,
            'category' => $item->category,
            'image_path' => $item->image_path,
        ]);
    }

    /**
     * Update the specified item.
     */
    public function itemsUpdate(Request $request, InventoryItem $item)
    {
        $this->authorize('update', $item);

        $data = $request->validate([
            'name' => ['required','string','max:150'],
            'sku' => ['nullable','string','max:100','unique:inventory_items,sku,' . $item->id],
            'unit' => ['required','string','max:20'],
            'min_stock' => ['nullable','numeric','min:0'],
            'category' => ['nullable','string','max:50'],
            'image' => ['nullable','image','max:4096'],
        ]);

        $path = $item->image_path;
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($path && \Storage::disk('public')->exists($path)) {
                \Storage::disk('public')->delete($path);
            }
            $path = $request->file('image')->store('inventory/items', 'public');
        }

        $item->update([
            'name' => $data['name'],
            'sku' => $data['sku'] ?? null,
            'unit' => $data['unit'],
            'min_stock' => $data['min_stock'] ?? 0,
            'category' => $data['category'] ?? null,
            'image_path' => $path,
        ]);

        \Log::info('Inventory item updated', [
            'item_id' => $item->id,
            'item_name' => $item->name,
            'updated_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Item berhasil diperbarui');
    }

    /**
     * Delete the specified item (soft delete).
     */
    public function itemsDestroy(Request $request, InventoryItem $item)
    {
        $this->authorize('delete', $item);

        // Check if item has stock movements or usages
        $hasMovements = InventoryStockMovement::where('inventory_item_id', $item->id)->exists();
        $hasUsages = InventoryUsage::where('inventory_item_id', $item->id)->exists();

        if ($hasMovements || $hasUsages) {
            return back()->withErrors([
                'error' => 'Item tidak dapat dihapus karena masih memiliki riwayat stock movement atau usage. Hapus riwayat terlebih dahulu atau nonaktifkan item.',
            ]);
        }

        $itemName = $item->name;
        $item->delete();

        \Log::info('Inventory item deleted', [
            'item_id' => $item->id,
            'item_name' => $itemName,
            'deleted_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Item berhasil dihapus');
    }

    /**
     * Item Restore Index
     */

    /**
     * Item Restore 
     */


    public function purchasesIndex(Request $request)
    {
        $items = InventoryItem::orderBy('name')->get(['id','name','unit']);
        $properties = Property::orderBy('name')->get(['id','name']);
        
        $query = InventoryStockMovement::with(['item','property'])
            ->where('type','purchase');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->whereHas('item', function($q) use ($search) {
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
        $data = $request->validate([
            'inventory_item_id' => ['required','exists:inventory_items,id'],
            'property_id' => ['nullable','exists:properties,id'],
            'quantity' => ['required','numeric','min:0.0001'],
            'unit_cost' => ['required','numeric','min:0'],
            'movement_date' => ['required','date'],
            'vendor_name' => ['nullable','string','max:100'],
            'notes' => ['nullable','string','max:255'],
        ]);
        $service->recordPurchase(
            (int)$data['inventory_item_id'],
            (float)$data['quantity'],
            (float)$data['unit_cost'],
            null, // property_id null: expense global
            $data['movement_date'],
            $request->user()->id,
            $data['notes'] ?? null,
            $data['vendor_name'] ?? null
        );
        return back()->with('success', 'Pembelian stok dicatat');
    }

    public function usagesIndex(Request $request)
    {
        $items = InventoryItem::orderBy('name')->get(['id','name','unit','average_unit_cost']);
        $properties = Property::orderBy('name')->get(['id','name']);
        
        $query = InventoryUsage::with(['item','property','expense']);

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->whereHas('item', function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $sortDirection = $request->input('direction', 'desc');
        $query->orderBy('usage_date', $sortDirection);
        
        $usages = $query->paginate(20)->withQueryString();

        // Usage Stats Calculation (Property-based This Month vs Last Month)
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
            
            // Get all unique item IDs involved in both periods for this property
            $itemIds = $propCurrent->pluck('inventory_item_id')
                ->merge($propLast->pluck('inventory_item_id'))
                ->unique();
                
            $propertyStats = [];
            foreach ($itemIds as $itemId) {
                $item = $items->firstWhere('id', $itemId);
                if (!$item) continue;
                
                $currentQty = $propCurrent->where('inventory_item_id', $itemId)->sum('quantity_used');
                $lastQty = $propLast->where('inventory_item_id', $itemId)->sum('quantity_used');
                
                if ($currentQty > 0 || $lastQty > 0) {
                    $propertyStats[] = [
                        'item_name' => $item->name,
                        'unit' => $item->unit,
                        'current_qty' => (float)$currentQty,
                        'last_qty' => (float)$lastQty,
                        'diff' => (float)($currentQty - $lastQty),
                        'percent_change' => $lastQty > 0 ? round((($currentQty - $lastQty) / $lastQty) * 100, 1) : 100,
                    ];
                }
            }
            
            if (!empty($propertyStats)) {
                $usageStats[] = [
                    'property_name' => $property->name,
                    'stats' => $propertyStats
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
            'inventory_item_id' => ['required','exists:inventory_items,id'],
            'property_id' => ['required','exists:properties,id'],
            'usage_date' => ['required','date'],
            'quantity_used' => ['required','numeric','min:0.0001'],
            'notes' => ['nullable','string','max:255'],
        ]);
        $service->recordUsage(
            (int)$data['inventory_item_id'],
            (int)$data['property_id'],
            $data['usage_date'],
            (float)$data['quantity_used'],
            $request->user()->id,
            $data['notes'] ?? null
        );
        return back()->with('success', 'Pemakaian dicatat');
    }

    public function usagesUpdate(Request $request, InventoryUsage $usage)
    {
        $data = $request->validate([
            'property_id' => ['required','exists:properties,id'],
            'usage_date' => ['required','date'],
            'quantity_used' => ['required','numeric','min:0.0001'],
            'notes' => ['nullable','string','max:255'],
        ]);

        // Note: Changing item_id is restricted to simplify logic. Delete and re-create if item is wrong.
        // We only allow updating details.
        
        $usage->update([
            'property_id' => $data['property_id'],
            'usage_date' => $data['usage_date'],
            'quantity_used' => $data['quantity_used'],
            'notes' => $data['notes'] ?? null,
        ]);

        return back()->with('success', 'Data pemakaian diperbarui');
    }

    public function usagesDestroy(InventoryUsage $usage)
    {
        $usage->delete();
        return back()->with('success', 'Data pemakaian dihapus');
    }

    public function purchasesUpdate(Request $request, InventoryStockMovement $purchase) 
    {
        // Only allow updating if it is a purchase
        if ($purchase->type !== 'purchase') {
            abort(403);
        }

        $data = $request->validate([
            'quantity' => ['required','numeric','min:0.0001'],
            'unit_cost' => ['required','numeric','min:0'],
            'movement_date' => ['required','date'],
            'vendor_name' => ['nullable','string','max:100'],
            'notes' => ['nullable','string','max:255'],
            'property_id' => ['nullable','exists:properties,id'],
        ]);

        $purchase->update([
            'quantity' => $data['quantity'],
            'unit_cost' => $data['unit_cost'],
            'movement_date' => $data['movement_date'],
            'vendor_name' => $data['vendor_name'] ?? null,
            'notes' => $data['notes'] ?? null,
            'property_id' => $data['property_id'] ?? null,
        ]);

        return back()->with('success', 'Data pembelian diperbarui');
    }

    public function purchasesDestroy(InventoryStockMovement $purchase)
    {
         if ($purchase->type !== 'purchase') {
            abort(403);
        }
        $purchase->delete();
        return back()->with('success', 'Data pembelian dihapus');
    }
}


