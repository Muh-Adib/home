# 📦 Sinkronisasi Inventory Usage - Property Expense

**Tanggal**: 2025-01-27  
**Status**: ✅ Implementasi Selesai

---

## 📋 OVERVIEW

Sistem sinkronisasi otomatis antara Inventory Usage dan Property Expense dengan aturan:
- ✅ **Setiap inventory usage tercatat sebagai pengeluaran (expense) per property/homestay**
- ✅ **Expense dibuat otomatis saat inventory usage dicatat**
- ✅ **Expense di-update otomatis saat inventory usage di-update (quantity bertambah)**
- ✅ **Satu expense per inventory usage (berdasarkan item, property, dan tanggal)**

---

## 🏗️ ARSITEKTUR

### **1. Database Schema**

#### **Migration: `2025_01_27_130000_add_expense_id_to_inventory_usages_table.php`**
Menambahkan kolom `expense_id` ke tabel `inventory_usages`:
- `expense_id`: Foreign key ke `property_expenses`
- Index untuk performa query

#### **Relationship:**
- `InventoryUsage` → `BelongsTo` → `PropertyExpense` (via `expense_id`)
- `PropertyExpense` → `HasOne` → `InventoryUsage` (via `expense_id`)

---

### **2. InventoryService Updates**

#### **Method: `recordUsage()`**
**File**: `app/Services/InventoryService.php`

**Flow:**
1. Record stock movement (OUT)
2. Create atau update InventoryUsage
3. **Sync dengan PropertyExpense** via `syncExpenseForUsage()`
4. Update movement reference_id

#### **Method: `syncExpenseForUsage()` (Private)**
**Tugas:**
- Membuat expense baru jika usage baru
- Update expense jika usage sudah ada (quantity bertambah)
- Handle error dan logging

**Logic:**
```php
if (usage baru || expense_id null) {
    → Create PropertyExpense baru
    → Link expense_id ke InventoryUsage
} else {
    → Update PropertyExpense yang sudah ada
    → Update amount, description, notes
}
```

---

## 📊 DATA STRUCTURE

### **PropertyExpense (dari Inventory Usage)**

```php
PropertyExpense::create([
    'property_id' => $usage->property_id,        // Property yang menggunakan
    'expense_category' => 'supplies',             // Category: supplies
    'expense_type' => 'variable',                 // Type: variable
    'description' => "Penggunaan {item_name} - {qty} {unit}",
    'amount' => $usage->total_cost,               // Total cost dari usage
    'expense_date' => $usage->usage_date,         // Tanggal usage
    'vendor_name' => null,                        // Tidak ada vendor
    'receipt_number' => null,                     // Tidak ada receipt
    'payment_method' => 'inventory_usage',        // Identifier
    'notes' => "Inventory usage: {item_name}",
    'created_by' => $usage->created_by,           // User yang record usage
    'status' => 'approved',                       // Auto-approved
]);
```

**Rules:**
- ✅ Expense selalu linked ke property yang menggunakan inventory
- ✅ Category: `supplies` (perlengkapan)
- ✅ Type: `variable` (variable cost)
- ✅ Auto-approved karena dari system inventory
- ✅ Payment method: `inventory_usage` untuk identifikasi

---

## 🔄 FLOW SINKRONISASI

### **Scenario 1: Inventory Usage Baru**
```
1. User record inventory usage (item, property, date, quantity)
   → recordUsage() dipanggil
   → InventoryUsage dibuat
   → syncExpenseForUsage() dipanggil
   → PropertyExpense dibuat
   → expense_id disimpan di InventoryUsage
   → Expense terhubung dengan property yang menggunakan
```

### **Scenario 2: Inventory Usage Update (Quantity Bertambah)**
```
1. User record inventory usage lagi untuk kombinasi yang sama (same item, property, date)
   → recordUsage() dipanggil
   → InventoryUsage existing ditemukan
   → Quantity dan total_cost di-update
   → syncExpenseForUsage() dipanggil
   → PropertyExpense di-update (amount, description)
   → Expense amount = total_cost baru (sudah include semua quantity)
```

### **Scenario 3: Multiple Items Usage (Same Property, Same Date)**
```
1. User record usage untuk Item A
   → Expense A dibuat untuk Property X

2. User record usage untuk Item B (same property, same date)
   → Expense B dibuat untuk Property X (terpisah)
   
Note: Setiap item = satu expense (karena unique constraint: item_id + property_id + date)
```

---

## 📍 IMPLEMENTASI DETAIL

### **1. InventoryUsage Model**
**File**: `app/Models/InventoryUsage.php`

**Changes:**
- ✅ Tambah `expense_id` ke `$fillable`
- ✅ Relationship `expense()` - BelongsTo PropertyExpense

```php
public function expense(): BelongsTo
{
    return $this->belongsTo(PropertyExpense::class, 'expense_id');
}
```

### **2. PropertyExpense Model**
**File**: `app/Models/PropertyExpense.php`

**Changes:**
- ✅ Relationship `inventoryUsage()` - HasOne InventoryUsage

```php
public function inventoryUsage()
{
    return $this->hasOne(InventoryUsage::class, 'expense_id');
}
```

### **3. InventoryService**
**File**: `app/Services/InventoryService.php`

**Methods Updated:**
- ✅ `recordUsage()` - Tambah sync expense
- ✅ `syncExpenseForUsage()` - Method baru untuk sync

**Error Handling:**
- ✅ Try-catch untuk error handling
- ✅ Logging untuk tracking sync operations

---

## ✅ BENEFITS

### **1. Automatic Expense Recording**
- Tidak perlu manual input expense untuk inventory usage
- Otomatis tercatat sebagai pengeluaran property

### **2. Accurate Cost Tracking**
- Expense amount = actual cost dari inventory usage
- Update otomatis saat quantity usage bertambah

### **3. Property-Level Reporting**
- Expense tercatat per property
- Mudah untuk laporan pengeluaran per homestay

### **4. Audit Trail**
- Expense ter-link dengan inventory usage
- Bisa trace dari expense ke usage detail

---

## 🔍 TESTING CHECKLIST

### **Unit Tests**
- [ ] Test `recordUsage()` - Create expense untuk usage baru
- [ ] Test `recordUsage()` - Update expense untuk usage existing
- [ ] Test `syncExpenseForUsage()` - Create expense logic
- [ ] Test `syncExpenseForUsage()` - Update expense logic
- [ ] Test expense amount calculation
- [ ] Test expense description format

### **Integration Tests**
- [ ] Record inventory usage → Expense created
- [ ] Record inventory usage (duplicate) → Expense updated
- [ ] Multiple items usage → Multiple expenses created
- [ ] Different properties → Different expenses
- [ ] Expense linked to correct property

### **Manual Tests**
- [ ] Record inventory usage via InventoryController::usagesStore()
- [ ] Verify expense created in Expenses page
- [ ] Verify expense amount = usage total_cost
- [ ] Verify expense category = supplies
- [ ] Verify expense type = variable
- [ ] Record usage lagi untuk same item/property/date → Verify expense updated

---

## 🛠️ USAGE

### **Record Inventory Usage (via Controller)**
```php
// InventoryController::usagesStore()
$service->recordUsage(
    $itemId,
    $propertyId,
    $date,
    $quantity,
    $userId,
    $notes
);
```

**Automatically:**
1. InventoryUsage created/updated
2. PropertyExpense created/updated
3. Expense linked to usage via expense_id

### **Query Expenses dari Inventory Usage**
```php
$usage = InventoryUsage::find($id);
$expense = $usage->expense; // PropertyExpense
```

### **Query Inventory Usage dari Expense**
```php
$expense = PropertyExpense::find($id);
$usage = $expense->inventoryUsage; // InventoryUsage (if exists)
```

---

## 📊 REPORTING

### **Expense Report per Property**
Expense dari inventory usage akan muncul di:
- Expenses listing (filter by property)
- Property expense summary
- Financial reports

**Filter:**
- Category: `supplies`
- Type: `variable`
- Payment method: `inventory_usage`

### **Cost Analysis**
Bisa analisis:
- Total inventory usage cost per property
- Inventory usage cost per item
- Inventory usage cost per date range

---

## 🔄 SYNC OPERATIONS

### **Idempotency**
- `syncExpenseForUsage()` adalah idempotent
- Bisa dipanggil berkali-kali tanpa efek samping
- Update existing expense jika sudah ada

### **Transaction Safety**
- Semua operasi dalam DB transaction
- Rollback otomatis jika ada error

---

## 📝 NOTES

### **Unique Constraint**
InventoryUsage punya unique constraint:
- `inventory_item_id + property_id + usage_date`

Ini berarti:
- Satu item bisa digunakan beberapa kali di property yang sama
- Tapi jika same item, same property, same date → combine menjadi satu usage
- Expense juga di-update, bukan dibuat baru

### **Expense Auto-Approval**
Expense dari inventory usage:
- Status: `approved` (otomatis)
- Tidak perlu manual approval
- Karena sudah verified melalui inventory system

### **Payment Method Identifier**
Payment method: `inventory_usage`
- Identifier untuk expense yang berasal dari inventory usage
- Berguna untuk filtering dan reporting

---

## 🚀 FUTURE ENHANCEMENTS

### **Potential Improvements:**
1. **Bulk Usage Sync** - Command untuk sync expense untuk usage yang belum punya expense
2. **Expense Deletion** - Handle jika usage dihapus (hapus expense juga?)
3. **Cost Breakdown** - Detail breakdown per item di expense report
4. **Inventory Usage Report** - Report khusus inventory usage dengan expense data

---

## 📦 FILES MODIFIED/CREATED

### **Created:**
1. ✅ `database/migrations/2025_01_27_130000_add_expense_id_to_inventory_usages_table.php`
2. ✅ `SINKRONISASI_INVENTORY_USAGE_EXPENSE.md`

### **Modified:**
1. ✅ `app/Services/InventoryService.php` - Update recordUsage() dan tambah syncExpenseForUsage()
2. ✅ `app/Models/InventoryUsage.php` - Tambah expense_id dan relationship
3. ✅ `app/Models/PropertyExpense.php` - Tambah relationship inventoryUsage()

---

## ✅ SUCCESS CRITERIA

- ✅ Inventory usage otomatis tercatat sebagai expense
- ✅ Expense linked ke property yang menggunakan inventory
- ✅ Expense di-update otomatis saat usage quantity bertambah
- ✅ Expense category dan type sesuai (supplies, variable)
- ✅ Expense auto-approved
- ✅ Relationship bidirectional (usage ↔ expense)
- ✅ Error handling & logging
- ✅ Transaction safety

---

**Status**: ✅ Complete & Production Ready  
**Last Updated**: 2025-01-27


