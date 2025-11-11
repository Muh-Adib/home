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

class InventoryController extends Controller
{
    public function itemsIndex(Request $request)
    {
        $items = InventoryItem::orderBy('name')->paginate(20)->withQueryString();
        // Map tambahan info current_stock & is_below_min di client side dengan accessor current_stock
        return Inertia::render('Admin/Inventory/Items', [
            'items' => $items->through(function ($it) {
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
            }),
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

        $path = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('inventory/items', 'public');
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

    public function purchasesIndex(Request $request)
    {
        $items = InventoryItem::orderBy('name')->get(['id','name','unit']);
        $properties = Property::orderBy('name')->get(['id','name']);
        $movements = InventoryStockMovement::with(['item','property'])
            ->where('type','purchase')
            ->orderByDesc('movement_date')
            ->paginate(20);
        return Inertia::render('Admin/Inventory/Purchases', [
            'items' => $items,
            'properties' => $properties,
            'purchases' => $movements,
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
        $usages = InventoryUsage::with(['item','property','expense'])->orderByDesc('usage_date')->paginate(20);
        return Inertia::render('Admin/Inventory/Usages', [
            'items' => $items,
            'properties' => $properties,
            'usages' => $usages,
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
}


