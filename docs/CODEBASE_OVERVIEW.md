# Codebase Overview — Homsjogja

Dokumen ini memberikan gambaran akurat tentang struktur codebase Homsjogja per kondisi terkini setelah audit dan cleanup.

---

## Struktur Direktori Utama

```
homsjogja/
├── app/
│   ├── Actions/           # Single-action classes (CreateBookingAction, VerifyPaymentAction, dll)
│   ├── Console/Commands/  # Artisan commands (sync, generate, test notifications, dll)
│   ├── Domain/            # Value objects domain (BookingRequest, RateCalculation)
│   ├── Events/            # Laravel events (BookingCreated, PaymentStatusChanged, dll)
│   ├── Exports/           # Excel export classes (BookingsExport)
│   ├── Helpers/           # Helper utilities (LogParser)
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Admin/     # Controller untuk panel admin
│   │   │   ├── Auth/      # Controller autentikasi
│   │   │   ├── Settings/  # Controller pengaturan profil/password
│   │   │   └── Staff/     # Controller untuk staff (cleaning dashboard)
│   │   ├── Middleware/    # Middleware aplikasi
│   │   └── Requests/      # Form request validation
│   ├── Models/            # Eloquent models
│   ├── Repositories/      # Repository pattern untuk data access
│   └── Services/          # Business logic services
├── database/
│   ├── migrations/        # Database migrations
│   └── seeders/           # Database seeders
├── doc/                   # Dokumentasi teknis dan panduan development
├── docs/                  # Dokumentasi codebase (file ini)
├── resources/
│   ├── js/
│   │   ├── components/    # Komponen React reusable
│   │   ├── layouts/       # Layout components
│   │   └── pages/         # Halaman Inertia.js (Admin, Auth, dll)
│   └── views/             # Blade templates (minimal, sebagian besar via Inertia)
└── routes/
    ├── admin.php          # Route panel admin
    ├── user.php           # Route frontend user
    └── staff.php          # Route panel staff
```

---

## Controller Aktif dan Route-nya

### Admin Controllers (`app/Http/Controllers/Admin/`)

| Controller | Route Prefix | Route Names | Deskripsi |
|---|---|---|---|
| `BookingManagementController` | `admin/bookings` | `admin.bookings.*` | Semua operasi booking: CRUD, verify, reject, cancel, checkin, checkout, import, export, timeline |
| `PropertyManagementController` | `admin/properties` | `admin.properties.*` | Manajemen properti: CRUD, media, analytics, iCal sync |
| `PaymentController` | `admin/payments` | `admin.payments.*` | Manajemen pembayaran: CRUD, verify, reject |
| `FinanceController` | `admin/finance` | `admin.finance.*` | Laporan keuangan, income, expense, wallet |
| `InventoryController` | `admin/inventory` | `admin.inventory.*` | Manajemen inventaris: items, purchases, usages |
| `ReportController` | `admin/reports` | `admin.reports.*` | Laporan: financial, occupancy, property performance |
| `UserController` | `admin/users` | `admin.users.*` | Manajemen user (super_admin only) |
| `PaymentMethodController` | `admin/payment-methods` | `admin.payment-methods.*` | Manajemen metode pembayaran |
| `SettingsController` | `admin/settings` | `admin.settings.*` | Pengaturan aplikasi: general, payment, email, system, booking, property |
| `RateManagementController` | `admin/rate-management` | `admin.rate-management.*` | Manajemen tarif properti dan seasonal rates |
| `PropertySeasonalRateController` | `admin/properties/{property}/seasonal-rates` | `admin.properties.seasonal-rates.*` | Seasonal rates per properti (legacy, backward compat) |
| `CheckInOutController` | `admin/bookings/check-in-out` | `admin.bookings.check-in-out` | Dashboard check-in/check-out |
| `ExtraServiceController` | `admin/extra-services` | `admin.extra-services.*` | Manajemen layanan tambahan |
| `GowaAdminController` | `admin/gowa` | `admin.gowa.*` | Manajemen WhatsApp via GOWA |
| `LegalPageController` | `admin/legal` | `admin.legal.*` | Manajemen halaman legal |
| `AdminSeoLandingController` | `admin/seo-pages` | `admin.seo-pages.*` | Manajemen SEO landing pages |

**Catatan penting:** `BookingManagementController` adalah satu-satunya controller untuk semua operasi booking di panel admin. Route canonical adalah `admin.bookings.*`. Route API terpisah tersedia di prefix `/api/admin/booking-management/` (untuk timeline, search, availability).

### Non-Admin Controllers (`app/Http/Controllers/`)

| Controller | Deskripsi |
|---|---|
| `BookingController` | Booking flow untuk user/tamu (frontend) |
| `PropertyController` | Tampilan properti untuk user/tamu |
| `PaymentController` | Payment flow untuk user/tamu |
| `PaymentGatewayController` | Integrasi payment gateway (iPaymu) |
| `ArticleController` | Manajemen artikel (juga digunakan di admin) |
| `ArticleAIController` | AI assistance untuk pembuatan artikel |
| `ContentPlanController` | Content planning dengan AI |
| `AIProviderKeyController` | Manajemen API keys AI provider |
| `DashboardController` | Dashboard (admin dan user) |
| `ICalController` | Sinkronisasi kalender iCal |
| `MediaController` | Upload dan manajemen media |
| `AmenityController` | Manajemen amenitas properti |
| `ReviewController` | Ulasan properti |
| `ReportController` | Laporan untuk user |
| `NotificationController` | Notifikasi in-app |
| `SeoLandingController` | SEO landing pages (frontend) |
| `SitemapController` | Sitemap XML |
| `LegalViewController` | Tampilan halaman legal (frontend) |

---

## Services dan Tanggung Jawabnya

### Booking & Availability

| Service | Tanggung Jawab |
|---|---|
| `BookingService` | Orkestrasi pembuatan dan update booking, validasi ketersediaan, kalkulasi rate |
| `AdminBookingService` | Operasi booking dari panel admin: create, update, verify, reject, cancel, checkin, checkout |
| `BookingExtraServiceSyncService` | Sync extra services (layanan tambahan) pada booking, kalkulasi total services amount |
| `BookingDailyRevenueService` | Sinkronisasi pendapatan harian per booking untuk laporan |
| `AvailabilityService` | Pengecekan ketersediaan properti untuk rentang tanggal tertentu |

### Rate & Pricing

| Service | Tanggung Jawab |
|---|---|
| `RateCalculationService` | Kalkulasi tarif menginap: base rate, weekend premium, seasonal rate, extra bed |
| `RateService` | Manajemen tarif properti |
| `RateOverrideLogService` | Logging perubahan tarif manual |
| `PropertyBusinessRulesService` | Validasi aturan bisnis properti (minimum stay, dll) |

### Payment & Finance

| Service | Tanggung Jawab |
|---|---|
| `PaymentService` | Pemrosesan pembayaran, verifikasi, status update |
| `PaymentGatewayService` | Integrasi dengan payment gateway eksternal |
| `IpaymuService` | Integrasi spesifik dengan iPaymu |
| `PaymentIncomeSyncService` | Sinkronisasi income dari pembayaran ke laporan keuangan |
| `WalletService` | Manajemen wallet internal |
| `WalletAllocationService` | Alokasi dana ke wallet berdasarkan aturan |

### Content & AI

| Service | Tanggung Jawab |
|---|---|
| `ArticleService` | Manajemen artikel: CRUD, publish, schedule |
| `AIArticleService` | Generasi konten artikel menggunakan AI |
| `ArticleAnalysisService` | Analisis SEO dan kualitas artikel |
| `ArticleFeaturedImageService` | Manajemen gambar featured artikel |
| `ArticleImageService` | Upload dan optimasi gambar artikel |
| `ArticlePromptService` | Manajemen prompt untuk AI article generation |
| `ContentPlanService` | Manajemen content plan dengan AI assistance |
| `AIProviderSyncService` | Sinkronisasi konfigurasi AI provider |
| `NewsDiscoveryService` | Penemuan berita/topik untuk content planning |
| `SerpScraperService` | Scraping SERP untuk analisis SEO |
| `GoogleIndexingService` | Submit URL ke Google Indexing API |
| `SeoService` | Utilitas SEO umum |

### Infrastructure & Utilities

| Service | Tanggung Jawab |
|---|---|
| `ImageService` | Upload, resize, optimasi gambar |
| `ICalService` | Parsing dan generasi file iCal |
| `GowaService` | Integrasi WhatsApp via GOWA |
| `WhatsappAuthService` | Autentikasi via WhatsApp OTP |
| `CleaningService` | Manajemen jadwal cleaning |
| `InventoryService` | Manajemen inventaris operasional |
| `GuestCountService` | Kalkulasi dan validasi jumlah tamu |
| `DashboardRouteService` | Routing dashboard berdasarkan role user |

---

## Models dan Status Implementasi

Semua model berikut sudah **fully implemented** dengan relasi, scopes, dan business logic yang lengkap.

### Core Booking Models

| Model | Tabel | Deskripsi |
|---|---|---|
| `Booking` | `bookings` | Model utama booking dengan status workflow, relasi ke property, user, payments, services |
| `BookingService` | `booking_services` | Extra services yang dipesan dalam booking |
| `BookingGuest` | `booking_guests` | Data tamu tambahan dalam booking |
| `BookingWorkflow` | `booking_workflows` | Log perubahan status booking |
| `BookingDailyRevenue` | `booking_daily_revenues` | Breakdown pendapatan harian per booking |

### Property Models

| Model | Tabel | Deskripsi |
|---|---|---|
| `Property` | `properties` | Properti dengan detail, kapasitas, tarif dasar, relasi ke media, amenitas |
| `PropertyMedia` | `property_media` | Foto dan media properti |
| `PropertyExpense` | `property_expenses` | Pengeluaran operasional properti |
| `PropertySeasonalRate` | `property_seasonal_rates` | Tarif musiman properti |
| `Amenity` | `amenities` | Fasilitas/amenitas yang tersedia |
| `ServiceMaster` | `service_masters` | Master data layanan tambahan |

### Payment & Finance Models

| Model | Tabel | Deskripsi |
|---|---|---|
| `Payment` | `payments` | Pembayaran dengan status, metode, bukti transfer |
| `PaymentMethod` | `payment_methods` | Metode pembayaran yang tersedia |
| `Income` | `incomes` | Catatan pemasukan |
| `FinancialReport` | `financial_reports` | Laporan keuangan periodik |
| `Wallet` | `wallets` | Wallet internal untuk alokasi dana |
| `WalletTransaction` | `wallet_transactions` | Transaksi wallet |
| `WalletAllocationRule` | `wallet_allocation_rules` | Aturan alokasi otomatis ke wallet |

### User & Auth Models

| Model | Tabel | Deskripsi |
|---|---|---|
| `User` | `users` | User dengan role-based access (super_admin, property_manager, property_owner, front_desk, housekeeping, finance, guest) |
| `UserProfile` | `user_profiles` | Profil detail user |
| `WhatsappOtp` | `whatsapp_otps` | OTP untuk autentikasi via WhatsApp |

### Content Models

| Model | Tabel | Deskripsi |
|---|---|---|
| `Article` | `articles` | Artikel blog dengan SEO metadata, status publish |
| `ContentPlan` | `content_plans` | Rencana konten dengan AI assistance |
| `Review` | `reviews` | Ulasan tamu untuk properti |
| `SeoLandingPage` | `seo_landing_pages` | Halaman landing SEO |
| `LegalPage` | `legal_pages` | Halaman legal (syarat & ketentuan, privasi, dll) |

### Operational Models

| Model | Tabel | Deskripsi |
|---|---|---|
| `InventoryItem` | `inventory_items` | Item inventaris operasional |
| `InventoryStockMovement` | `inventory_stock_movements` | Pergerakan stok inventaris |
| `InventoryUsage` | `inventory_usages` | Penggunaan inventaris |
| `GowaConfig` | `gowa_configs` | Konfigurasi WhatsApp GOWA |
| `AIProviderKey` | `ai_provider_keys` | API keys untuk AI provider |

---

## Konvensi Penamaan

### PHP / Laravel

| Kategori | Konvensi | Contoh |
|---|---|---|
| Controller | `PascalCase` + `Controller` suffix | `BookingManagementController` |
| Service | `PascalCase` + `Service` suffix | `BookingExtraServiceSyncService` |
| Model | `PascalCase` singular | `Booking`, `Property` |
| Action | `PascalCase` + `Action` suffix | `CreateBookingAction` |
| Repository | `PascalCase` + `Repository` suffix | `BookingRepository` |
| Request | `PascalCase` + `Request` suffix | `CreateBookingRequest` |
| Event | `PascalCase` past tense | `BookingCreated`, `PaymentStatusChanged` |
| Command | `PascalCase` + `Command` suffix (opsional) | `SyncBookingDailyRevenue`, `ICalSyncCommand` |
| Migration | `snake_case` dengan timestamp prefix | `2025_10_30_000004_alter_payment_methods_add_wallet_id.php` |
| Route name | `dot.notation` dengan prefix resource | `admin.bookings.index`, `admin.payments.verify` |

### TypeScript / React

| Kategori | Konvensi | Contoh |
|---|---|---|
| Component | `PascalCase` | `BookingForm`, `CalendarTimeline` |
| Hook | `camelCase` dengan `use` prefix | `useBookingTimeline`, `useAdminBookingAvailability` |
| Service (TS) | `camelCase` + `.service.ts` suffix | `bookings.service.ts` |
| Page | `PascalCase` dalam folder resource | `pages/Admin/Bookings/Index.tsx` |
| Type/Interface | `PascalCase` | `BookingData`, `PropertyProps` |

### Database

| Kategori | Konvensi | Contoh |
|---|---|---|
| Tabel | `snake_case` plural | `bookings`, `property_media` |
| Kolom | `snake_case` | `booking_number`, `check_in`, `total_amount` |
| Foreign key | `{model}_id` | `booking_id`, `property_id` |
| Pivot table | `{model1}_{model2}` alphabetical | `amenity_property` |
| Timestamp kolom | `created_at`, `updated_at` | — |
| Soft delete | `deleted_at` | — |

---

## Catatan Penting

- **Route canonical booking admin**: `admin.bookings.*` — satu-satunya set route untuk operasi booking di panel admin
- **API route booking**: `/api/admin/booking-management/*` — route terpisah untuk operasi API (timeline, search, availability), bukan duplikat
- **BookingExtraServiceSyncService**: Menangani sync extra services pada booking (sebelumnya bernama `BookingServiceSyncService`, di-rename untuk menghindari ambiguitas dengan `BookingService`)
- **Dokumentasi teknis**: Tersedia di direktori `doc/` (panduan deployment, debug guides, API docs, dll)
