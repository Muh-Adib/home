# Codebase Overview — Homsjogja

Gambaran akurat struktur codebase Homsjogja per kondisi terkini.

**Stack:** PHP 8.4 · Laravel 13.4 · Inertia.js v3 · React 19 · Tailwind CSS v4 · MySQL

---

## Struktur Direktori Utama

```
homsjogja/
├── app/
│   ├── Actions/                      # Single-action classes
│   │   ├── Booking/CreateBookingAction.php
│   │   ├── Payment/VerifyPaymentAction.php
│   │   └── User/EnsureGuestUserAction.php
│   ├── Console/Commands/             # Artisan commands
│   ├── Domain/Booking/ValueObjects/  # BookingRequest, RateCalculation
│   ├── Events/                       # BookingCreated, BookingStatusChanged, PaymentCreated, PaymentStatusChanged
│   ├── Exceptions/                   # AIGenerationException
│   ├── Exports/                      # BookingsExport
│   ├── Helpers/                      # LogParser
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Admin/                # Panel admin
│   │   │   ├── Auth/                 # Autentikasi
│   │   │   ├── Settings/             # Profil & password
│   │   │   └── Staff/                # Staff (cleaning)
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Models/
│   │   └── Traits/                   # HasBookingStatus, HasCheckinInstructions, HasPaymentManagement
│   ├── Repositories/                 # BookingRepository
│   └── Services/
├── database/
│   ├── migrations/
│   └── seeders/
├── docs/                             # Dokumentasi codebase (file ini)
├── resources/
│   ├── js/
│   │   ├── components/               # Komponen React reusable
│   │   ├── config/                   # api.ts
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── layouts/                  # Layout components
│   │   ├── lib/
│   │   │   └── api/services/         # Typed API service layer
│   │   ├── locales/                  # en.json, id.json
│   │   ├── pages/                    # Halaman Inertia.js
│   │   ├── types/                    # TypeScript type definitions
│   │   └── utils/                    # Utility functions
│   └── views/
└── routes/
    ├── admin.php, auth.php, channels.php
    ├── console.php, settings.php, staff.php
    ├── user.php, web.php
```

---

## Controllers

### Admin — [`app/Http/Controllers/Admin/`](../app/Http/Controllers/Admin/)

| Controller | Route Names | Deskripsi |
|---|---|---|
| [`BookingManagementController`](../app/Http/Controllers/Admin/BookingManagementController.php) | `admin.bookings.*` | CRUD booking, verify, reject, cancel, checkin, checkout, import, export, timeline |
| [`Booking/BookingApiController`](../app/Http/Controllers/Admin/Booking/BookingApiController.php) | `/api/admin/booking-management/*` | API endpoint: timeline, search, availability |
| [`PropertyManagementController`](../app/Http/Controllers/Admin/PropertyManagementController.php) | `admin.properties.*` | CRUD properti, media, analytics, iCal sync |
| [`PaymentController`](../app/Http/Controllers/Admin/PaymentController.php) | `admin.payments.*` | CRUD pembayaran, verify, reject |
| [`FinanceController`](../app/Http/Controllers/Admin/FinanceController.php) | `admin.finance.*` | Laporan keuangan, income, expense, wallet |
| [`InventoryController`](../app/Http/Controllers/Admin/InventoryController.php) | `admin.inventory.*` | Inventaris: items, purchases, usages |
| [`ReportController`](../app/Http/Controllers/Admin/ReportController.php) | `admin.reports.*` | Laporan financial, occupancy, property performance |
| [`UserController`](../app/Http/Controllers/Admin/UserController.php) | `admin.users.*` | Manajemen user (super_admin only) |
| [`PaymentMethodController`](../app/Http/Controllers/Admin/PaymentMethodController.php) | `admin.payment-methods.*` | Metode pembayaran |
| [`SettingsController`](../app/Http/Controllers/Admin/SettingsController.php) | `admin.settings.*` | General, payment, email, system, booking, property settings |
| [`RateManagementController`](../app/Http/Controllers/Admin/RateManagementController.php) | `admin.rate-management.*` | Tarif properti & seasonal rates |
| [`PropertySeasonalRateController`](../app/Http/Controllers/Admin/PropertySeasonalRateController.php) | `admin.properties.seasonal-rates.*` | Seasonal rates per properti (legacy) |
| [`CheckInOutController`](../app/Http/Controllers/Admin/CheckInOutController.php) | `admin.bookings.check-in-out` | Dashboard check-in/check-out |
| [`ExtraServiceController`](../app/Http/Controllers/Admin/ExtraServiceController.php) | `admin.extra-services.*` | Layanan tambahan |
| [`GowaAdminController`](../app/Http/Controllers/Admin/GowaAdminController.php) | `admin.gowa.*` | WhatsApp via GOWA |
| [`LegalPageController`](../app/Http/Controllers/Admin/LegalPageController.php) | `admin.legal.*` | Halaman legal |
| [`AdminSeoLandingController`](../app/Http/Controllers/Admin/AdminSeoLandingController.php) | `admin.seo-pages.*` | SEO landing pages |

### Non-Admin — [`app/Http/Controllers/`](../app/Http/Controllers/)

| Controller | Deskripsi |
|---|---|
| [`BookingController`](../app/Http/Controllers/BookingController.php) | Booking flow user/tamu (frontend) |
| [`PropertyController`](../app/Http/Controllers/PropertyController.php) | Tampilan properti user/tamu |
| [`PaymentController`](../app/Http/Controllers/PaymentController.php) | Payment flow user/tamu |
| [`PaymentGatewayController`](../app/Http/Controllers/PaymentGatewayController.php) | Integrasi iPaymu |
| [`PaymentMethodController`](../app/Http/Controllers/PaymentMethodController.php) | Metode pembayaran (frontend) |
| [`ArticleController`](../app/Http/Controllers/ArticleController.php) | Manajemen artikel |
| [`ArticleAIController`](../app/Http/Controllers/ArticleAIController.php) | AI assistance artikel |
| [`ContentPlanController`](../app/Http/Controllers/ContentPlanController.php) | Content planning dengan AI |
| [`AIProviderKeyController`](../app/Http/Controllers/AIProviderKeyController.php) | API keys AI provider |
| [`DashboardController`](../app/Http/Controllers/DashboardController.php) | Dashboard (admin & user) |
| [`ICalController`](../app/Http/Controllers/ICalController.php) | Sinkronisasi kalender iCal |
| [`MediaController`](../app/Http/Controllers/MediaController.php) | Upload & manajemen media |
| [`AmenityController`](../app/Http/Controllers/AmenityController.php) | Amenitas properti |
| [`ReviewController`](../app/Http/Controllers/ReviewController.php) | Ulasan properti |
| [`ReportController`](../app/Http/Controllers/ReportController.php) | Laporan user |
| [`NotificationController`](../app/Http/Controllers/NotificationController.php) | Notifikasi in-app |
| [`SeoLandingController`](../app/Http/Controllers/SeoLandingController.php) | SEO landing pages (frontend) |
| [`SitemapController`](../app/Http/Controllers/SitemapController.php) | Sitemap XML |
| [`LegalViewController`](../app/Http/Controllers/LegalViewController.php) | Halaman legal (frontend) |
| [`StaticPageController`](../app/Http/Controllers/StaticPageController.php) | Halaman statis (About, FAQ, Support) |

### Auth — [`app/Http/Controllers/Auth/`](../app/Http/Controllers/Auth/)

`AuthenticatedSessionController`, `RegisteredUserController`, `PasswordResetLinkController`, `NewPasswordController`, `VerifyEmailController`, `WhatsappAuthController`, dll.

### Settings — [`app/Http/Controllers/Settings/`](../app/Http/Controllers/Settings/)

`ProfileController`, `PasswordController`

### Staff — [`app/Http/Controllers/Staff/`](../app/Http/Controllers/Staff/)

[`CleaningDashboardController`](../app/Http/Controllers/Staff/CleaningDashboardController.php)

---

## Services — [`app/Services/`](../app/Services/)

### Booking & Availability

| Service | Tanggung Jawab |
|---|---|
| [`BookingService`](../app/Services/BookingService.php) | Orkestrasi pembuatan & update booking, validasi ketersediaan, kalkulasi rate |
| [`AdminBookingService`](../app/Services/AdminBookingService.php) | Operasi booking dari panel admin |
| [`BookingQueryService`](../app/Services/BookingQueryService.php) | Query & filtering data booking |
| [`BookingExtraServiceSyncService`](../app/Services/BookingExtraServiceSyncService.php) | Sync extra services pada booking |
| [`BookingDailyRevenueService`](../app/Services/BookingDailyRevenueService.php) | Sinkronisasi pendapatan harian per booking |
| [`AvailabilityService`](../app/Services/AvailabilityService.php) | Pengecekan ketersediaan properti |

### Rate & Pricing

| Service | Tanggung Jawab |
|---|---|
| [`RateCalculationService`](../app/Services/RateCalculationService.php) | Kalkulasi tarif: base rate, weekend premium, seasonal rate, extra bed |
| [`RateService`](../app/Services/RateService.php) | Manajemen tarif properti |
| [`RateOverrideLogService`](../app/Services/RateOverrideLogService.php) | Logging perubahan tarif manual |
| [`PropertyBusinessRulesService`](../app/Services/PropertyBusinessRulesService.php) | Validasi aturan bisnis properti (minimum stay, dll) |

### Payment & Finance

| Service | Tanggung Jawab |
|---|---|
| [`PaymentService`](../app/Services/PaymentService.php) | Pemrosesan pembayaran, verifikasi, status update |
| [`PaymentGatewayService`](../app/Services/PaymentGatewayService.php) | Integrasi payment gateway eksternal |
| [`IpaymuService`](../app/Services/IpaymuService.php) | Integrasi spesifik iPaymu |
| [`PaymentIncomeSyncService`](../app/Services/PaymentIncomeSyncService.php) | Sinkronisasi income dari pembayaran ke laporan |
| [`WalletService`](../app/Services/WalletService.php) | Manajemen wallet internal |
| [`WalletAllocationService`](../app/Services/WalletAllocationService.php) | Alokasi dana ke wallet |

### Content & AI

| Service | Tanggung Jawab |
|---|---|
| [`ArticleService`](../app/Services/ArticleService.php) | CRUD artikel, publish, schedule |
| [`AIArticleService`](../app/Services/AIArticleService.php) | Generasi konten artikel via AI |
| [`ArticleAnalysisService`](../app/Services/ArticleAnalysisService.php) | Analisis SEO & kualitas artikel |
| [`ArticleFeaturedImageService`](../app/Services/ArticleFeaturedImageService.php) | Manajemen gambar featured artikel |
| [`ArticleImageService`](../app/Services/ArticleImageService.php) | Upload & optimasi gambar artikel |
| [`ArticlePromptService`](../app/Services/ArticlePromptService.php) | Manajemen prompt AI article generation |
| [`ContentPlanService`](../app/Services/ContentPlanService.php) | Content plan dengan AI assistance |
| [`AIProviderSyncService`](../app/Services/AIProviderSyncService.php) | Sinkronisasi konfigurasi AI provider |
| [`NewsDiscoveryService`](../app/Services/NewsDiscoveryService.php) | Penemuan topik untuk content planning |
| [`SerpScraperService`](../app/Services/SerpScraperService.php) | Scraping SERP untuk analisis SEO |
| [`GoogleIndexingService`](../app/Services/GoogleIndexingService.php) | Submit URL ke Google Indexing API |
| [`SeoService`](../app/Services/SeoService.php) | Utilitas SEO umum |

### Infrastructure & Utilities

| Service | Tanggung Jawab |
|---|---|
| [`ImageService`](../app/Services/ImageService.php) | Upload, resize, optimasi gambar |
| [`ICalService`](../app/Services/ICalService.php) | Parsing & generasi file iCal |
| [`GowaService`](../app/Services/GowaService.php) | Integrasi WhatsApp via GOWA |
| [`WhatsappAuthService`](../app/Services/WhatsappAuthService.php) | Autentikasi via WhatsApp OTP |
| [`CleaningService`](../app/Services/CleaningService.php) | Manajemen jadwal cleaning |
| [`InventoryService`](../app/Services/InventoryService.php) | Manajemen inventaris operasional |
| [`GuestCountService`](../app/Services/GuestCountService.php) | Kalkulasi & validasi jumlah tamu |
| [`DashboardRouteService`](../app/Services/DashboardRouteService.php) | Routing dashboard berdasarkan role |

---

## Models — [`app/Models/`](../app/Models/)

### Traits — [`app/Models/Traits/`](../app/Models/Traits/)

| Trait | Deskripsi |
|---|---|
| [`HasBookingStatus`](../app/Models/Traits/HasBookingStatus.php) | Status workflow booking |
| [`HasCheckinInstructions`](../app/Models/Traits/HasCheckinInstructions.php) | Instruksi check-in |
| [`HasPaymentManagement`](../app/Models/Traits/HasPaymentManagement.php) | Manajemen pembayaran pada booking |

### Core Booking

| Model | Tabel | File |
|---|---|---|
| `Booking` | `bookings` | [`Booking.php`](../app/Models/Booking.php) |
| `BookingService` | `booking_services` | [`BookingService.php`](../app/Models/BookingService.php) |
| `BookingGuest` | `booking_guests` | [`BookingGuest.php`](../app/Models/BookingGuest.php) |
| `BookingWorkflow` | `booking_workflows` | [`BookingWorkflow.php`](../app/Models/BookingWorkflow.php) |
| `BookingDailyRevenue` | `booking_daily_revenues` | [`BookingDailyRevenue.php`](../app/Models/BookingDailyRevenue.php) |

### Property

| Model | Tabel | File |
|---|---|---|
| `Property` | `properties` | [`Property.php`](../app/Models/Property.php) |
| `PropertyMedia` | `property_media` | [`PropertyMedia.php`](../app/Models/PropertyMedia.php) |
| `PropertyExpense` | `property_expenses` | [`PropertyExpense.php`](../app/Models/PropertyExpense.php) |
| `PropertySeasonalRate` | `property_seasonal_rates` | [`PropertySeasonalRate.php`](../app/Models/PropertySeasonalRate.php) |
| `Amenity` | `amenities` | [`Amenity.php`](../app/Models/Amenity.php) |
| `ServiceMaster` | `service_masters` | [`ServiceMaster.php`](../app/Models/ServiceMaster.php) |

### Payment & Finance

| Model | Tabel | File |
|---|---|---|
| `Payment` | `payments` | [`Payment.php`](../app/Models/Payment.php) |
| `PaymentMethod` | `payment_methods` | [`PaymentMethod.php`](../app/Models/PaymentMethod.php) |
| `Income` | `incomes` | [`Income.php`](../app/Models/Income.php) |
| `FinancialReport` | `financial_reports` | [`FinancialReport.php`](../app/Models/FinancialReport.php) |
| `Wallet` | `wallets` | [`Wallet.php`](../app/Models/Wallet.php) |
| `WalletTransaction` | `wallet_transactions` | [`WalletTransaction.php`](../app/Models/WalletTransaction.php) |
| `WalletAllocationRule` | `wallet_allocation_rules` | [`WalletAllocationRule.php`](../app/Models/WalletAllocationRule.php) |

### User & Auth

| Model | Tabel | File |
|---|---|---|
| `User` | `users` | [`User.php`](../app/Models/User.php) |
| `UserProfile` | `user_profiles` | [`UserProfile.php`](../app/Models/UserProfile.php) |
| `WhatsappOtp` | `whatsapp_otps` | [`WhatsappOtp.php`](../app/Models/WhatsappOtp.php) |

### Content

| Model | Tabel | File |
|---|---|---|
| `Article` | `articles` | [`Article.php`](../app/Models/Article.php) |
| `ContentPlan` | `content_plans` | [`ContentPlan.php`](../app/Models/ContentPlan.php) |
| `Review` | `reviews` | [`Review.php`](../app/Models/Review.php) |
| `SeoLandingPage` | `seo_landing_pages` | [`SeoLandingPage.php`](../app/Models/SeoLandingPage.php) |
| `LegalPage` | `legal_pages` | [`LegalPage.php`](../app/Models/LegalPage.php) |

### Operational

| Model | Tabel | File |
|---|---|---|
| `InventoryItem` | `inventory_items` | [`InventoryItem.php`](../app/Models/InventoryItem.php) |
| `InventoryStockMovement` | `inventory_stock_movements` | [`InventoryStockMovement.php`](../app/Models/InventoryStockMovement.php) |
| `InventoryUsage` | `inventory_usages` | [`InventoryUsage.php`](../app/Models/InventoryUsage.php) |
| `GowaConfig` | `gowa_configs` | [`GowaConfig.php`](../app/Models/GowaConfig.php) |
| `AIProviderKey` | `ai_provider_keys` | [`AIProviderKey.php`](../app/Models/AIProviderKey.php) |

---

## Frontend — [`resources/js/`](../resources/js/)

### Pages — [`resources/js/pages/`](../resources/js/pages/)

| Folder | Halaman |
|---|---|
| `Admin/Bookings/` | Index, Show, Create, Edit, BookingForm, CalendarTimeline, CheckInOut, DailyOperations |
| `Admin/Properties/` | Index, Show, Create, Edit, Media, SeasonalRates/Index |
| `Admin/Payments/` | Index, Show, Create, Edit, CreateAdditional, CreateForBooking, ManualPayment |
| `Admin/Finance/` | Index, Incomes, Expenses, Report, Wallets, WalletReport |
| `Admin/Inventory/` | Items, Purchases, Usages |
| `Admin/InventoryItems/` | Index |
| `Admin/InventoryCategories/` | Index |
| `Admin/ContentPlans/` | Index, Show, Create, Edit |
| `Admin/Articles/` | Index, Create, Edit |
| `Admin/Legal/` | Index, Show, Create, Edit, Archive, ViewArchived, History, Trash |
| `Admin/Settings/` | General, Booking, Email, Payment, Property, System, SystemLogs, Index, AIKeys/Index+Edit, Seo/Index |
| `Admin/Users/` | Index, Show, Create, Edit |
| `Admin/RateManagement/` | Index, Show |
| `Admin/Reports/` | Index |
| `Admin/Gowa/` | GowaManagement |
| `Admin/Amenities/` | Index, Create, Edit |
| `Admin/ExtraServices/` | Index, Create, Edit |
| `Admin/PaymentMethods/` | Index, Create, Edit |
| `Admin/CleaningSchedules/` | Index |
| `Admin/CleaningStaff/` | Index |
| `Admin/CleaningTasks/` | Index, Show, Create, Edit |
| `Booking/` | Create, Confirmation |
| `Payment/` | Create, SecurePayment, Success |
| `Properties/` | Index, Show |
| `Articles/` | Index, Show |
| `Guest/` | Dashboard, Booking/Show |
| `Staff/` | CleaningDashboard |
| `auth/` | login, register, forgot-password, reset-password, verify-email, confirm-password, set-password, ChangePassword |
| `settings/` | profile, password, appearance |
| Root pages | Dashboard, welcome, About, FAQ, Legal, SeoLanding, Support |

### Components — [`resources/js/components/`](../resources/js/components/)

| Folder | Isi |
|---|---|
| `booking/` | BookingTimeline, BookingFilters, BookingDetailModal, RateCalculationCard, GuestInformationForm, dll (34 komponen) |
| `property/` | PropertyGallery, BookingSidebar, PropertyTabs, ChartPerformance, dll |
| `dashboard/` | DashboardStats, TodayAgenda, RevenueBreakdownCard, QuickActions, RecentActivity |
| `charts/` | ChartRevenue, ChartBookingTrends, ChartPropertyPerformance |
| `ContentPlanner/` | CalendarView, KanbanView, AICalendarModal, CreatePlanModal |
| `Article/` | ArticleContent |
| `notifications/` | notification-bell |
| `seo/` | SeoHead, SchemaOrg, FAQSection |
| `Features/` | PropertyForm |
| `ui/` | shadcn/ui components + custom (50+ komponen) |

### Hooks — [`resources/js/hooks/`](../resources/js/hooks/)

`useAdminBookingAvailability`, `useBookingTimeline`, `useBookingFormState`, `useRateCalculator`, `useAvailability`, `usePropertyAvailability`, `usePropertyMinimumStay`, `usePropertyState`, `usePropertyStats`, `useAIGenerator`, `usePaymentForm`, `useNotifications`, `useImageGallery`, `useAppearance`, `useMobile`, dll.

### Layouts — [`resources/js/layouts/`](../resources/js/layouts/)

`admin-layout`, `app-layout`, `auth-layout`, `dashboard-layout`, `guest-layout`

### API Service Layer — [`resources/js/lib/api/`](../resources/js/lib/api/)

`client.ts` + services: `bookings.service.ts`, `payments.service.ts`, `properties.service.ts`, `notifications.service.ts`

### Localization — [`resources/js/locales/`](../resources/js/locales/)

`en.json`, `id.json` — i18n via `resources/js/lib/i18n.ts`

---

## Middleware — [`app/Http/Middleware/`](../app/Http/Middleware/)

| Middleware | Deskripsi |
|---|---|
| [`RoleMiddleware`](../app/Http/Middleware/RoleMiddleware.php) | Role-based access control |
| [`HandleInertiaRequests`](../app/Http/Middleware/HandleInertiaRequests.php) | Share data global ke Inertia |
| [`HandleAppearance`](../app/Http/Middleware/HandleAppearance.php) | Dark/light mode |
| [`SetLocale`](../app/Http/Middleware/SetLocale.php) | Bahasa aplikasi |
| [`ApiResponseFormatter`](../app/Http/Middleware/ApiResponseFormatter.php) | Format response API |
| [`EnsureEmailVerificationSignature`](../app/Http/Middleware/EnsureEmailVerificationSignature.php) | Verifikasi email |
| [`ThrottleRequests`](../app/Http/Middleware/ThrottleRequests.php) | Rate limiting |
| [`TrustProxies`](../app/Http/Middleware/TrustProxies.php) | Trust proxy headers |

---

## Artisan Commands — [`app/Console/Commands/`](../app/Console/Commands/)

| Command | Deskripsi |
|---|---|
| `AutoPublishArticles` | Auto-publish artikel terjadwal |
| `CheckImageSupport` | Cek dukungan format gambar |
| `CreateSampleBooking` | Buat sample booking untuk testing |
| `GenerateICalTokensCommand` | Generate token iCal |
| `ICalSyncCommand` / `SyncICalCommand` | Sinkronisasi kalender iCal |
| `SyncBookingDailyRevenue` | Sync pendapatan harian booking |
| `SyncPaymentIncome` | Sync income dari pembayaran |
| `TestBookingNotifications` / `TestNotifications` / `TestPaymentNotifications` | Testing notifikasi |
| `UpdateMyBookingsFeature` | Update fitur my bookings |

---

## Konvensi Penamaan

### PHP / Laravel

| Kategori | Konvensi | Contoh |
|---|---|---|
| Controller | `PascalCase` + `Controller` | `BookingManagementController` |
| Service | `PascalCase` + `Service` | `BookingExtraServiceSyncService` |
| Model | `PascalCase` singular | `Booking`, `Property` |
| Action | `PascalCase` + `Action` | `CreateBookingAction` |
| Repository | `PascalCase` + `Repository` | `BookingRepository` |
| Request | `PascalCase` + `Request` | `CreateBookingRequest` |
| Event | `PascalCase` past tense | `BookingCreated` |
| Route name | `dot.notation` | `admin.bookings.index` |

### TypeScript / React

| Kategori | Konvensi | Contoh |
|---|---|---|
| Component | `PascalCase` | `BookingForm`, `CalendarTimeline` |
| Hook | `camelCase` + `use` prefix | `useBookingTimeline` |
| Service | `camelCase` + `.service.ts` | `bookings.service.ts` |
| Page | `PascalCase` dalam folder | `pages/Admin/Bookings/Index.tsx` |
| Type/Interface | `PascalCase` | `BookingData`, `PropertyProps` |

### Database

| Kategori | Konvensi | Contoh |
|---|---|---|
| Tabel | `snake_case` plural | `bookings`, `property_media` |
| Kolom | `snake_case` | `booking_number`, `check_in` |
| Foreign key | `{model}_id` | `booking_id`, `property_id` |
| Pivot table | alphabetical | `amenity_property` |

---

## Catatan Penting

- **Route canonical booking admin**: `admin.bookings.*` via `BookingManagementController`
- **API route booking**: `/api/admin/booking-management/*` via `BookingApiController` — untuk timeline, search, availability
- **`BookingQueryService`**: service baru untuk query & filtering booking (tidak ada di versi overview sebelumnya)
- **`StaticPageController`**: controller baru untuk halaman statis (About, FAQ, Support)
- **`ImageUploadResult`**: value object di `app/Services/ImageUploadResult.php`
- **Roles user**: `super_admin`, `property_manager`, `property_owner`, `front_desk`, `housekeeping`, `finance`, `guest`
