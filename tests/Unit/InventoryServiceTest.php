<?php

namespace Tests\Unit;

use App\Models\InventoryItem;
use App\Models\InventoryStockMovement;
use App\Models\InventoryUsage;
use App\Models\Property;
use App\Models\PropertyExpense;
use App\Models\User;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryServiceTest extends TestCase
{
    use RefreshDatabase;

    protected InventoryService $service;

    protected User $user;

    protected Property $property;

    protected InventoryItem $item;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new InventoryService;

        // Create test user
        $this->user = User::factory()->create([
            'role' => 'super_admin',
        ]);

        // Create test property
        $this->property = Property::factory()->create([
            'name' => 'Test Villa',
            'capacity' => 8,
        ]);

        // Create test inventory item
        $this->item = InventoryItem::create([
            'name' => 'Sabun Mandi',
            'sku' => 'SOAP-001',
            'unit' => 'pcs',
            'category' => 'supplies',
            'average_unit_cost' => 5000,
            'last_unit_cost' => 5000,
            'min_stock' => 10,
        ]);
    }

    /**
     * Test recording a purchase creates movement and updates costs
     */
    public function test_record_purchase_creates_movement_and_updates_costs(): void
    {
        $quantity = 50;
        $unitCost = 5500;
        $date = now()->toDateString();

        $movement = $this->service->recordPurchase(
            $this->item->id,
            $quantity,
            $unitCost,
            null, // property_id null for general stock
            $date,
            $this->user->id,
            'Test purchase'
        );

        // Assert movement created
        $this->assertInstanceOf(InventoryStockMovement::class, $movement);
        $this->assertEquals('purchase', $movement->type);
        $this->assertEquals($quantity, $movement->quantity);
        $this->assertEquals($unitCost, $movement->unit_cost);
        $this->assertEquals($quantity * $unitCost, $movement->total_cost);

        // Assert item costs updated
        $this->item->refresh();
        $this->assertEquals($unitCost, $this->item->last_unit_cost);
        // Average cost should be updated based on weighted average
        $this->assertGreaterThan(0, $this->item->average_unit_cost);
    }

    /**
     * Test recording usage creates movement and inventory usage
     */
    public function test_record_usage_creates_movement_and_usage(): void
    {
        // First, add some stock
        $this->service->recordPurchase(
            $this->item->id,
            100,
            5000,
            null,
            now()->toDateString(),
            $this->user->id
        );

        // Now record usage
        $quantity = 10;
        $date = now()->toDateString();

        $usage = $this->service->recordUsage(
            $this->item->id,
            $this->property->id,
            $date,
            $quantity,
            $this->user->id,
            'Test usage'
        );

        // Assert usage created
        $this->assertInstanceOf(InventoryUsage::class, $usage);
        $this->assertEquals($this->item->id, $usage->inventory_item_id);
        $this->assertEquals($this->property->id, $usage->property_id);
        $this->assertEquals($quantity, $usage->quantity_used);
        $this->assertGreaterThan(0, $usage->total_cost);

        // Assert movement created
        $movement = InventoryStockMovement::where('type', 'out')
            ->where('inventory_item_id', $this->item->id)
            ->latest()
            ->first();

        $this->assertNotNull($movement);
        $this->assertEquals('out', $movement->type);
        $this->assertEquals($quantity, $movement->quantity);
    }

    /**
     * Test usage automatically creates expense
     */
    public function test_usage_automatically_creates_expense(): void
    {
        // Add stock first
        $this->service->recordPurchase(
            $this->item->id,
            100,
            5000,
            null,
            now()->toDateString(),
            $this->user->id
        );

        // Record usage
        $quantity = 15;
        $date = now()->toDateString();

        $usage = $this->service->recordUsage(
            $this->item->id,
            $this->property->id,
            $date,
            $quantity,
            $this->user->id,
            'Test usage for expense sync'
        );

        // Assert expense was created and linked
        $this->assertNotNull($usage->expense_id);

        $expense = PropertyExpense::find($usage->expense_id);
        $this->assertNotNull($expense);
        $this->assertEquals('supplies', $expense->expense_category);
        $this->assertEquals('variable', $expense->expense_type);
        $this->assertEquals('inventory_usage', $expense->payment_method);
        $this->assertEquals('approved', $expense->status);
        $this->assertEquals($usage->total_cost, $expense->amount);
        $this->assertEquals($this->property->id, $expense->property_id);
    }

    /**
     * Test duplicate usage (same item, property, date) merges quantity
     */
    public function test_duplicate_usage_merges_quantity_and_updates_expense(): void
    {
        // Add stock
        $this->service->recordPurchase(
            $this->item->id,
            100,
            5000,
            null,
            now()->toDateString(),
            $this->user->id
        );

        $date = now()->toDateString();

        // First usage
        $usage1 = $this->service->recordUsage(
            $this->item->id,
            $this->property->id,
            $date,
            10,
            $this->user->id,
            'First usage'
        );

        $firstExpenseId = $usage1->expense_id;
        $firstTotalCost = $usage1->total_cost;
        $firstExpenseAmount = $usage1->expense->amount;

        // Second usage (same item, property, date)
        $usage2 = $this->service->recordUsage(
            $this->item->id,
            $this->property->id,
            $date,
            5,
            $this->user->id,
            'Second usage'
        );

        // Assert it's the same usage record (merged)
        $this->assertEquals($usage1->id, $usage2->id);

        // Assert quantity is summed
        $this->assertEquals(15, $usage2->quantity_used);

        // Assert total cost is updated
        $this->assertGreaterThan($firstTotalCost, $usage2->total_cost);

        // Assert expense is updated (same expense_id)
        $this->assertEquals($firstExpenseId, $usage2->expense_id);

        $updatedExpense = PropertyExpense::find($firstExpenseId);
        $this->assertGreaterThan($firstExpenseAmount, $updatedExpense->amount);
        $this->assertEquals($usage2->total_cost, $updatedExpense->amount);
    }

    /**
     * Test multiple items create separate expenses
     */
    public function test_multiple_items_create_separate_expenses(): void
    {
        // Create second item
        $item2 = InventoryItem::create([
            'name' => 'Shampoo',
            'sku' => 'SHAMPOO-001',
            'unit' => 'pcs',
            'category' => 'supplies',
            'average_unit_cost' => 8000,
            'last_unit_cost' => 8000,
            'min_stock' => 5,
        ]);

        // Add stock for both items
        $this->service->recordPurchase($this->item->id, 100, 5000, null, now()->toDateString(), $this->user->id);
        $this->service->recordPurchase($item2->id, 50, 8000, null, now()->toDateString(), $this->user->id);

        $date = now()->toDateString();

        // Record usage for item 1
        $usage1 = $this->service->recordUsage(
            $this->item->id,
            $this->property->id,
            $date,
            10,
            $this->user->id
        );

        // Record usage for item 2 (same property, same date)
        $usage2 = $this->service->recordUsage(
            $item2->id,
            $this->property->id,
            $date,
            5,
            $this->user->id
        );

        // Assert different usage records
        $this->assertNotEquals($usage1->id, $usage2->id);

        // Assert different expenses
        $this->assertNotNull($usage1->expense_id);
        $this->assertNotNull($usage2->expense_id);
        $this->assertNotEquals($usage1->expense_id, $usage2->expense_id);

        // Verify both expenses exist
        $expense1 = PropertyExpense::find($usage1->expense_id);
        $expense2 = PropertyExpense::find($usage2->expense_id);

        $this->assertNotNull($expense1);
        $this->assertNotNull($expense2);
        $this->assertStringContainsString('Sabun Mandi', $expense1->description);
        $this->assertStringContainsString('Shampoo', $expense2->description);
    }

    /**
     * Test expense description format
     */
    public function test_expense_description_format(): void
    {
        $this->service->recordPurchase($this->item->id, 100, 5000, null, now()->toDateString(), $this->user->id);

        $usage = $this->service->recordUsage(
            $this->item->id,
            $this->property->id,
            now()->toDateString(),
            12,
            $this->user->id
        );

        $expense = $usage->expense;

        // Check description format: "Penggunaan {item_name} - {qty} {unit}"
        $expectedDescription = 'Penggunaan Sabun Mandi - 12 pcs';
        $this->assertEquals($expectedDescription, $expense->description);
    }

    /**
     * Test expense properties are correct
     */
    public function test_expense_properties_are_correct(): void
    {
        $this->service->recordPurchase($this->item->id, 100, 5000, null, now()->toDateString(), $this->user->id);

        $usage = $this->service->recordUsage(
            $this->item->id,
            $this->property->id,
            now()->toDateString(),
            10,
            $this->user->id,
            'Test notes'
        );

        $expense = $usage->expense;

        $this->assertEquals($this->property->id, $expense->property_id);
        $this->assertEquals('supplies', $expense->expense_category);
        $this->assertEquals('variable', $expense->expense_type);
        $this->assertEquals('inventory_usage', $expense->payment_method);
        $this->assertEquals('approved', $expense->status);
        $this->assertEquals($usage->usage_date->toDateString(), $expense->expense_date->toDateString());
        $this->assertEquals($usage->total_cost, $expense->amount);
        $this->assertEquals($this->user->id, $expense->created_by);
        $this->assertNull($expense->vendor_name);
        $this->assertNull($expense->receipt_number);
    }

    /**
     * Test stock calculation is correct
     */
    public function test_stock_calculation_is_correct(): void
    {
        // Purchase 100 units
        $this->service->recordPurchase($this->item->id, 100, 5000, null, now()->toDateString(), $this->user->id);

        // Use 30 units
        $this->service->recordUsage($this->item->id, $this->property->id, now()->toDateString(), 30, $this->user->id);

        // Check current stock
        $this->item->refresh();
        $currentStock = $this->item->current_stock;

        $this->assertEquals(70, $currentStock);
    }

    /**
     * Test transaction rollback on error
     */
    public function test_transaction_rolls_back_on_error(): void
    {
        $this->service->recordPurchase($this->item->id, 100, 5000, null, now()->toDateString(), $this->user->id);

        // Try to record usage with invalid property_id (should fail)
        try {
            $this->service->recordUsage(
                $this->item->id,
                999999, // Invalid property ID
                now()->toDateString(),
                10,
                $this->user->id
            );
            $this->fail('Expected exception was not thrown');
        } catch (\Exception $e) {
            // Exception expected
        }

        // Verify no usage was created
        $usageCount = InventoryUsage::count();
        $this->assertEquals(0, $usageCount);

        // Verify no expense was created
        $expenseCount = PropertyExpense::where('payment_method', 'inventory_usage')->count();
        $this->assertEquals(0, $expenseCount);
    }

    /**
     * Test usage-expense relationship is bidirectional
     */
    public function test_usage_expense_relationship_is_bidirectional(): void
    {
        $this->service->recordPurchase($this->item->id, 100, 5000, null, now()->toDateString(), $this->user->id);

        $usage = $this->service->recordUsage(
            $this->item->id,
            $this->property->id,
            now()->toDateString(),
            10,
            $this->user->id
        );

        // Test usage -> expense
        $expenseFromUsage = $usage->expense;
        $this->assertNotNull($expenseFromUsage);
        $this->assertInstanceOf(PropertyExpense::class, $expenseFromUsage);

        // Test expense -> usage
        $usageFromExpense = $expenseFromUsage->inventoryUsage;
        $this->assertNotNull($usageFromExpense);
        $this->assertInstanceOf(InventoryUsage::class, $usageFromExpense);
        $this->assertEquals($usage->id, $usageFromExpense->id);
    }
}
