# ⚡ Quick Guide - Wallet Transfer & Financial Report

**Untuk**: Finance Staff & Admin  
**Tanggal**: 2025-11-01  
**Status**: ✅ Siap Digunakan

---

## 🔄 TRANSFER ANTAR WALLET

### Langkah-langkah:

1. **Buka halaman Wallet**
   ```
   Admin → Finance → Wallet
   ```

2. **Lihat section "Transfer Antar Wallet"** (paling atas)

3. **Isi form transfer:**
   - **Dari Wallet**: Pilih wallet sumber (akan muncul saldo)
   - **Ke Wallet**: Pilih wallet tujuan
   - **Nominal**: Masukkan jumlah transfer
   - **Tanggal**: Pilih tanggal transaksi
   - **Keterangan**: Isi deskripsi (opsional)

4. **Click tombol "Transfer"**

5. **Verifikasi:**
   - Cek saldo wallet sumber berkurang
   - Cek saldo wallet tujuan bertambah
   - Lihat transaksi di masing-masing wallet

### Contoh:
```
Transfer dari "Kas Villa A" (Rp 5.000.000)
           ke "Kas Villa B" (Rp 2.000.000)
Nominal: Rp 1.000.000

Hasil:
- Kas Villa A: Rp 4.000.000
- Kas Villa B: Rp 3.000.000
```

### Tips:
- ✅ Double-check wallet sebelum transfer
- ✅ Gunakan deskripsi yang jelas
- ✅ Pastikan saldo cukup
- ❌ Jangan transfer ke wallet yang sama

---

## 📊 LAPORAN KEUANGAN

### Cara Akses:

1. **Buka halaman Laporan**
   ```
   Admin → Finance → Laporan Keuangan
   ```
   
   Atau langsung ke: `/admin/finance/report`

2. **Set Filter:**
   - **Dari Tanggal**: Contoh: 2025-11-01
   - **Sampai Tanggal**: Contoh: 2025-11-30
   - **Property**: 
     - "Semua Property" = Laporan keseluruhan
     - "Perusahaan (Global)" = Hanya pengeluaran global (bukan per property)
     - "Villa A" = Hanya Villa A

3. **Click "Filter"**

4. **Lihat Laporan:**
   - **Cards atas**: Summary (Income, Expense, Net Profit)
   - **Tabel**: Breakdown per property
   - **Cards bawah**: Breakdown per kategori & sumber

### Apa yang Ditampilkan:

**Summary Cards:**
```
┌─────────────────────┐
│ Total Pendapatan    │
│ Rp 50.000.000      │
│ [Icon Naik]        │
└─────────────────────┘
```

**Tabel Per Property:**
```
Property          | Pendapatan    | Pengeluaran   | Laba/Rugi
Villa A           | Rp 20.000.000 | Rp 12.000.000 | Rp 8.000.000
Villa B           | Rp 15.000.000 | Rp 10.000.000 | Rp 5.000.000
Perusahaan (Glb)  | Rp 15.000.000 | Rp 8.000.000  | Rp 7.000.000
─────────────────────────────────────────────────────────────────
TOTAL             | Rp 50.000.000 | Rp 30.000.000 | Rp 20.000.000
```

**Breakdown Pengeluaran:**
```
Utilitas              Rp 5.000.000  (15 transaksi)
Pemeliharaan          Rp 8.000.000  (8 transaksi)
Staff                 Rp 10.000.000 (3 transaksi)
```

### Tips Reporting:
- ✅ Review laporan setiap bulan
- ✅ Bandingkan dengan bulan sebelumnya
- ✅ Cek property mana yang paling profitable
- ✅ Monitor kategori expense yang paling besar

---

## 🎨 VISUAL INDICATORS

### Warna:
- 🟢 **Hijau**: Pendapatan, Profit
- 🔴 **Merah**: Pengeluaran, Loss
- 🔵 **Biru**: Transfer, Netral

### Icons:
- **↑** (TrendingUp): Pendapatan
- **↓** (TrendingDown): Pengeluaran
- **$** (DollarSign): Laba/Rugi
- **🔄** (ArrowLeftRight): Transfer
- **📊** (PieChart): Breakdown

---

## ❓ FAQ

### Transfer

**Q: Apakah transfer bisa dibatalkan?**  
A: Tidak. Transfer bersifat final. Jika salah, buat transfer balik.

**Q: Apakah saya bisa transfer ke wallet yang sama?**  
A: Tidak. System akan reject transfer ke wallet yang sama.

**Q: Bagaimana cara melihat history transfer?**  
A: Buka "Cetak Laporan" di masing-masing wallet untuk lihat semua transaksi.

**Q: Apakah ada limit transfer?**  
A: Ya, tidak bisa transfer lebih dari saldo yang tersedia.

### Laporan

**Q: Apakah laporan real-time?**  
A: Ya, data diambil langsung dari database saat filter diterapkan.

**Q: Bisa export ke Excel?**  
A: Fitur export akan ditambahkan di update mendatang.

**Q: Apa bedanya "Semua Property" vs "Perusahaan (Global)"?**  
A:
- "Semua Property": Menampilkan semua data (per property + global)
- "Perusahaan (Global)": Hanya menampilkan pengeluaran tanpa property (property_id = NULL)

**Q: Kenapa angka total tidak cocok?**  
A: Pastikan filter tanggal sudah benar. Cek juga apakah semua transaksi sudah tercatat.

---

## 🆘 TROUBLESHOOTING

### Transfer Error

**Error: "Insufficient balance"**
- **Cause**: Saldo tidak cukup
- **Fix**: Cek saldo wallet sumber, transfer amount yang lebih kecil

**Error: "Cannot transfer to the same wallet"**
- **Cause**: Pilih wallet sumber dan tujuan yang sama
- **Fix**: Pilih wallet tujuan yang berbeda

**Error: "Wallet not found"**
- **Cause**: Wallet tidak ada atau sudah dihapus
- **Fix**: Refresh page, pilih wallet yang valid

### Report Error

**"Tidak ada data"**
- **Cause**: Tidak ada transaksi di periode tersebut
- **Fix**: 
  1. Ganti date range
  2. Cek filter property
  3. Pastikan ada transaksi di periode tersebut

**Angka tidak masuk akal**
- **Cause**: Data salah input
- **Fix**:
  1. Cek transaksi income & expense
  2. Verifikasi tanggal transaksi
  3. Review kategori expense

---

## 📞 SUPPORT

**Jika ada masalah:**
1. Screenshot error message
2. Catat langkah-langkah yang dilakukan
3. Hubungi Admin / IT Support
4. Referensikan dokumen ini

**Dokumentasi Lengkap:**
- `WALLET_TRANSFER_AND_FINANCIAL_REPORT_SUMMARY.md` - Technical details
- `COMPLETE_FIX_SUMMARY.md` - Inventory & Finance fixes

---

## ✅ CHECKLIST HARIAN

### Finance Staff:
- [ ] Cek saldo semua wallet
- [ ] Verify transfer hari ini
- [ ] Review laporan harian
- [ ] Cross-check dengan data booking

### End of Month:
- [ ] Generate laporan bulanan (bulan penuh)
- [ ] Review per property profitability
- [ ] Bandingkan dengan bulan lalu
- [ ] Export data untuk accounting

---

**Last Updated**: 2025-11-01  
**Version**: 1.0  
**Status**: ✅ Ready to Use

**🎉 Selamat Menggunakan Fitur Baru! 🎉**
