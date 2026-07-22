<?php

return [
    'expense_scopes' => [
        'operational' => 'Operasional Harian',
        'unit' => 'Per Unit (Kamar/Villa)',
        'house' => 'Rumah (Pusat/Pojok)',
        'kitchen' => 'Dapur (Pusat)',
        'laundry' => 'Laundry (Pusat)',
        'capital' => 'Belanja Besar / CAPEX',
        'prive' => 'Prive (Penarikan Pribadi)',
    ],

    'expense_categories' => [
        // Operasional Harian
        'supplies_small' => 'Pengadaan Kecil (Galon, Tisu, dll)',
        'fuel' => 'BBM / Bensin',
        'transportation' => 'Transportasi',
        'utilities' => 'Utilitas (Listrik, Air, Internet)',
        'waste' => 'Kebersihan / Sampah',
        'staff' => 'SDM (Satpam/HK/FD)',
        // Per Unit
        'maintenance' => 'Pemeliharaan / Perbaikan',
        'supplies' => 'Perlengkapan Kamar',
        'amenities' => 'Amenities Tamu',
        // Dapur & Laundry
        'kitchen_supplies' => 'Perlengkapan Dapur',
        'food_beverage' => 'Bahan Makanan & Minuman',
        'laundry_supplies' => 'Perlengkapan Laundry (Deterjen, Dll)',
        'laundry_service' => 'Jasa Laundry External',
        // CAPEX
        'furniture' => 'Perabotan (Kasur, Meja, dll)',
        'renovation' => 'Renovasi',
        'equipment' => 'Peralatan / Elektronik',
        // Prive
        'prive' => 'Penarikan Pribadi',
        // Lainnya
        'marketing' => 'Marketing',
        'insurance' => 'Asuransi',
        'taxes' => 'Pajak',
        'savings' => 'Tabungan / Alokasi',
        'other' => 'Lainnya',
    ],

    'expense_types' => [
        'fixed' => 'Beban Fix',
        'variable' => 'Beban Variabel',
        'additional' => 'Beban Tambahan',
    ],

    // Scope to default categories mapping
    'scope_categories' => [
        'operational' => ['supplies_small', 'fuel', 'transportation', 'utilities', 'waste', 'staff', 'other'],
        'unit' => ['maintenance', 'supplies', 'amenities', 'other'],
        'house' => ['maintenance', 'utilities', 'supplies', 'other'],
        'kitchen' => ['kitchen_supplies', 'food_beverage', 'other'],
        'laundry' => ['laundry_supplies', 'laundry_service', 'other'],
        'capital' => ['furniture', 'renovation', 'equipment', 'other'],
        'prive' => ['prive'],
    ],

    'wallet_purposes' => [
        'petty_cash' => 'Kas Harian',
        'main_account' => 'Rekening Utama',
        'reserve_account' => 'Rekening Cadangan',
        'expense_account' => 'Rekening Pengeluaran',
        'savings' => 'Tabungan',
        'general' => 'Umum',
    ],

    'wallet_transaction_categories' => [
        'revenue' => 'Pendapatan',
        'expense' => 'Pengeluaran',
        'transfer' => 'Transfer',
        'adjustment' => 'Penyesuaian Saldo',
        'top_up' => 'Isi Kas',
        'prive' => 'Prive',
        'savings' => 'Tabungan',
        'withdrawal' => 'Penarikan',
        'investment' => 'Investasi',
        'refund' => 'Pengembalian Dana',
        'loan' => 'Pinjaman',
        'payment' => 'Pembayaran',
        'other' => 'Lainnya',
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Wallet untuk Pembelian Inventaris
    |--------------------------------------------------------------------------
    |
    | Wallet dengan purpose ini akan otomatis digunakan sebagai sumber dana
    | saat staff mencatat pembelian inventaris. Super admin dapat mengubah
    | wallet mana yang digunakan dengan mengubah purpose wallet terkait.
    |
    */
    'inventory_purchase_wallet_purpose' => 'expense_account',
];
