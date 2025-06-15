<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Artisan;

class SettingsController extends Controller
{
    /**
     * Display settings overview
     */
    public function index(): Response
    {
        $this->authorize('manageSettings');

        $settings = [
            'general' => $this->getGeneralSettings(),
            'payment' => $this->getPaymentSettings(),
            'email' => $this->getEmailSettings(),
            'system' => $this->getSystemSettings(),
            'booking' => $this->getBookingSettings(),
            'property' => $this->getPropertySettings(),
        ];

        return Inertia::render('Admin/Settings/Index', [
            'settings' => $settings,
            'stats' => $this->getSystemStats(),
        ]);
    }

    /**
     * Display general settings
     */
    public function general(): Response
    {
        $this->authorize('manageSettings');

        return Inertia::render('Admin/Settings/General', [
            'settings' => $this->getGeneralSettings(),
        ]);
    }

    /**
     * Update general settings
     */
    public function updateGeneral(Request $request): RedirectResponse
    {
        $this->authorize('manageSettings');

        $validated = $request->validate([
            'site_name' => 'required|string|max:255',
            'site_description' => 'required|string|max:500',
            'contact_email' => 'required|email|max:255',
            'contact_phone' => 'required|string|max:20',
            'contact_address' => 'required|string|max:500',
            'timezone' => 'required|string|max:50',
            'currency' => 'required|string|max:3',
            'language' => 'required|string|max:5',
            'logo' => 'nullable|image|max:2048',
            'favicon' => 'nullable|image|max:512',
        ]);

        // Handle file uploads
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('settings', 'public');
            $validated['logo_path'] = $logoPath;
        }

        if ($request->hasFile('favicon')) {
            $faviconPath = $request->file('favicon')->store('settings', 'public');
            $validated['favicon_path'] = $faviconPath;
        }

        $this->updateSettings('general', $validated);

        return back()->with('success', 'General settings berhasil diperbarui.');
    }

    /**
     * Display payment settings
     */
    public function payment(): Response
    {
        $this->authorize('manageSettings');

        return Inertia::render('Admin/Settings/Payment', [
            'settings' => $this->getPaymentSettings(),
            'paymentMethods' => \App\Models\PaymentMethod::orderBy('display_order')->get(),
        ]);
    }

    /**
     * Update payment settings
     */
    public function updatePayment(Request $request): RedirectResponse
    {
        $this->authorize('manageSettings');

        $validated = $request->validate([
            'default_dp_percentage' => 'required|integer|in:30,50,70',
            'payment_deadline_hours' => 'required|integer|min:1|max:168',
            'auto_cancel_hours' => 'required|integer|min:1|max:720',
            'enable_online_payment' => 'boolean',
            'enable_manual_payment' => 'boolean',
            'payment_confirmation_required' => 'boolean',
            'minimum_booking_amount' => 'required|numeric|min:0',
            'maximum_booking_amount' => 'nullable|numeric|min:0',
            'service_fee_percentage' => 'required|numeric|min:0|max:100',
            'tax_percentage' => 'required|numeric|min:0|max:100',
        ]);

        $this->updateSettings('payment', $validated);

        return back()->with('success', 'Payment settings berhasil diperbarui.');
    }

    /**
     * Display email settings
     */
    public function email(): Response
    {
        $this->authorize('manageSettings');

        return Inertia::render('Admin/Settings/Email', [
            'settings' => $this->getEmailSettings(),
        ]);
    }

    /**
     * Update email settings
     */
    public function updateEmail(Request $request): RedirectResponse
    {
        $this->authorize('manageSettings');

        $validated = $request->validate([
            'mail_driver' => 'required|string|in:smtp,sendmail,mailgun,ses,postmark',
            'mail_host' => 'required_if:mail_driver,smtp|string|max:255',
            'mail_port' => 'required_if:mail_driver,smtp|integer|min:1|max:65535',
            'mail_username' => 'nullable|string|max:255',
            'mail_password' => 'nullable|string|max:255',
            'mail_encryption' => 'nullable|string|in:tls,ssl',
            'mail_from_address' => 'required|email|max:255',
            'mail_from_name' => 'required|string|max:255',
            'send_booking_confirmation' => 'boolean',
            'send_payment_reminder' => 'boolean',
            'send_check_in_reminder' => 'boolean',
            'send_review_request' => 'boolean',
            'notification_emails' => 'nullable|string',
        ]);

        $this->updateSettings('email', $validated);

        return back()->with('success', 'Email settings berhasil diperbarui.');
    }

    /**
     * Display system settings
     */
    public function system(): Response
    {
        $this->authorize('manageSettings');

        return Inertia::render('Admin/Settings/System', [
            'settings' => $this->getSystemSettings(),
            'stats' => $this->getSystemStats(),
            'logs' => $this->getRecentLogs(),
        ]);
    }

    /**
     * Update system settings
     */
    public function updateSystem(Request $request): RedirectResponse
    {
        $this->authorize('manageSettings');

        $validated = $request->validate([
            'enable_registration' => 'boolean',
            'enable_guest_booking' => 'boolean',
            'require_email_verification' => 'boolean',
            'enable_maintenance_mode' => 'boolean',
            'maintenance_message' => 'nullable|string|max:500',
            'max_upload_size' => 'required|integer|min:1|max:100',
            'allowed_file_types' => 'required|string',
            'enable_cache' => 'boolean',
            'cache_duration' => 'required|integer|min:1|max:1440',
            'enable_debug' => 'boolean',
            'log_level' => 'required|string|in:emergency,alert,critical,error,warning,notice,info,debug',
        ]);

        $this->updateSettings('system', $validated);

        // Handle maintenance mode
        if ($validated['enable_maintenance_mode']) {
            Artisan::call('down', ['--message' => $validated['maintenance_message'] ?? 'Site under maintenance']);
        } else {
            Artisan::call('up');
        }

        return back()->with('success', 'System settings berhasil diperbarui.');
    }

    /**
     * Display booking settings
     */
    public function booking(): Response
    {
        $this->authorize('manageSettings');

        return Inertia::render('Admin/Settings/Booking', [
            'settings' => $this->getBookingSettings(),
        ]);
    }

    /**
     * Update booking settings
     */
    public function updateBooking(Request $request): RedirectResponse
    {
        $this->authorize('manageSettings');

        $validated = $request->validate([
            'require_admin_verification' => 'boolean',
            'auto_confirm_bookings' => 'boolean',
            'minimum_advance_booking_hours' => 'required|integer|min:1|max:8760',
            'maximum_advance_booking_days' => 'required|integer|min:1|max:365',
            'default_check_in_time' => 'required|date_format:H:i',
            'default_check_out_time' => 'required|date_format:H:i',
            'allow_same_day_booking' => 'boolean',
            'allow_past_date_booking' => 'boolean',
            'require_guest_details' => 'boolean',
            'max_guests_per_booking' => 'required|integer|min:1|max:50',
            'enable_guest_reviews' => 'boolean',
            'enable_host_reviews' => 'boolean',
            'booking_modification_deadline_hours' => 'required|integer|min:1|max:720',
            'cancellation_policy' => 'required|string|in:flexible,moderate,strict',
        ]);

        $this->updateSettings('booking', $validated);

        return back()->with('success', 'Booking settings berhasil diperbarui.');
    }

    /**
     * Display property settings
     */
    public function property(): Response
    {
        $this->authorize('manageSettings');

        return Inertia::render('Admin/Settings/Property', [
            'settings' => $this->getPropertySettings(),
            'amenities' => \App\Models\Amenity::orderBy('category', 'asc')->orderBy('name', 'asc')->get(),
        ]);
    }

    /**
     * Update property settings
     */
    public function updateProperty(Request $request): RedirectResponse
    {
        $this->authorize('manageSettings');

        $validated = $request->validate([
            'require_property_approval' => 'boolean',
            'auto_publish_properties' => 'boolean',
            'max_images_per_property' => 'required|integer|min:1|max:50',
            'image_max_size_mb' => 'required|integer|min:1|max:20',
            'allowed_image_types' => 'required|string',
            'require_property_verification' => 'boolean',
            'enable_seasonal_pricing' => 'boolean',
            'enable_weekend_pricing' => 'boolean',
            'default_weekend_premium' => 'required|numeric|min:0|max:100',
            'enable_extra_bed_pricing' => 'boolean',
            'enable_cleaning_fee' => 'boolean',
            'minimum_property_rate' => 'required|numeric|min:0',
            'maximum_property_rate' => 'nullable|numeric|min:0',
            'enable_property_reviews' => 'boolean',
            'require_house_rules' => 'boolean',
        ]);

        $this->updateSettings('property', $validated);

        return back()->with('success', 'Property settings berhasil diperbarui.');
    }

    /**
     * Test email configuration
     */
    public function testEmail(Request $request): RedirectResponse
    {
        $this->authorize('manageSettings');

        $validated = $request->validate([
            'test_email' => 'required|email|max:255',
        ]);

        try {
            \Mail::raw('This is a test email from Property Management System.', function ($message) use ($validated) {
                $message->to($validated['test_email'])
                        ->subject('Test Email - Property Management System');
            });

            return back()->with('success', 'Test email berhasil dikirim ke ' . $validated['test_email']);
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal mengirim test email: ' . $e->getMessage());
        }
    }

    /**
     * Clear cache
     */
    public function clearCache(): RedirectResponse
    {
        $this->authorize('manageSettings');

        try {
            Artisan::call('cache:clear');
            Artisan::call('config:clear');
            Artisan::call('view:clear');
            Artisan::call('route:clear');

            return back()->with('success', 'Cache berhasil dibersihkan.');
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal membersihkan cache: ' . $e->getMessage());
        }
    }

    /**
     * Backup database
     */
    public function backupDatabase(): RedirectResponse
    {
        $this->authorize('manageSettings');

        try {
            Artisan::call('backup:run', ['--only-db' => true]);
            return back()->with('success', 'Database backup berhasil dibuat.');
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal membuat database backup: ' . $e->getMessage());
        }
    }

    /**
     * Get general settings
     */
    private function getGeneralSettings(): array
    {
        return [
            'site_name' => config('app.name', 'Property Management System'),
            'site_description' => config('app.description', 'Modern property management and booking system'),
            'contact_email' => config('mail.from.address', 'contact@propertyms.com'),
            'contact_phone' => config('app.contact_phone', '+62 123 456 7890'),
            'contact_address' => config('app.contact_address', 'Jakarta, Indonesia'),
            'timezone' => config('app.timezone', 'Asia/Jakarta'),
            'currency' => config('app.currency', 'IDR'),
            'language' => config('app.locale', 'en'),
            'logo_path' => config('app.logo_path'),
            'favicon_path' => config('app.favicon_path'),
        ];
    }

    /**
     * Get payment settings
     */
    private function getPaymentSettings(): array
    {
        return [
            'default_dp_percentage' => config('payment.default_dp_percentage', 30),
            'payment_deadline_hours' => config('payment.deadline_hours', 24),
            'auto_cancel_hours' => config('payment.auto_cancel_hours', 72),
            'enable_online_payment' => config('payment.enable_online', true),
            'enable_manual_payment' => config('payment.enable_manual', true),
            'payment_confirmation_required' => config('payment.confirmation_required', true),
            'minimum_booking_amount' => config('payment.minimum_amount', 100000),
            'maximum_booking_amount' => config('payment.maximum_amount'),
            'service_fee_percentage' => config('payment.service_fee_percentage', 5),
            'tax_percentage' => config('payment.tax_percentage', 10),
        ];
    }

    /**
     * Get email settings
     */
    private function getEmailSettings(): array
    {
        return [
            'mail_driver' => config('mail.default', 'smtp'),
            'mail_host' => config('mail.mailers.smtp.host'),
            'mail_port' => config('mail.mailers.smtp.port'),
            'mail_username' => config('mail.mailers.smtp.username'),
            'mail_encryption' => config('mail.mailers.smtp.encryption'),
            'mail_from_address' => config('mail.from.address'),
            'mail_from_name' => config('mail.from.name'),
            'send_booking_confirmation' => config('notifications.booking_confirmation', true),
            'send_payment_reminder' => config('notifications.payment_reminder', true),
            'send_check_in_reminder' => config('notifications.check_in_reminder', true),
            'send_review_request' => config('notifications.review_request', true),
            'notification_emails' => config('notifications.admin_emails'),
        ];
    }

    /**
     * Get system settings
     */
    private function getSystemSettings(): array
    {
        return [
            'enable_registration' => config('app.enable_registration', true),
            'enable_guest_booking' => config('app.enable_guest_booking', true),
            'require_email_verification' => config('app.require_email_verification', true),
            'enable_maintenance_mode' => app()->isDownForMaintenance(),
            'maintenance_message' => config('app.maintenance_message'),
            'max_upload_size' => config('app.max_upload_size', 10),
            'allowed_file_types' => config('app.allowed_file_types', 'jpg,jpeg,png,gif,pdf'),
            'enable_cache' => config('cache.enable', true),
            'cache_duration' => config('cache.duration', 60),
            'enable_debug' => config('app.debug', false),
            'log_level' => config('logging.level', 'info'),
        ];
    }

    /**
     * Get booking settings
     */
    private function getBookingSettings(): array
    {
        return [
            'require_admin_verification' => config('booking.require_verification', true),
            'auto_confirm_bookings' => config('booking.auto_confirm', false),
            'minimum_advance_booking_hours' => config('booking.minimum_advance_hours', 2),
            'maximum_advance_booking_days' => config('booking.maximum_advance_days', 365),
            'default_check_in_time' => config('booking.default_check_in', '15:00'),
            'default_check_out_time' => config('booking.default_check_out', '11:00'),
            'allow_same_day_booking' => config('booking.allow_same_day', false),
            'allow_past_date_booking' => config('booking.allow_past_date', false),
            'require_guest_details' => config('booking.require_guest_details', true),
            'max_guests_per_booking' => config('booking.max_guests', 20),
            'enable_guest_reviews' => config('booking.enable_guest_reviews', true),
            'enable_host_reviews' => config('booking.enable_host_reviews', true),
            'booking_modification_deadline_hours' => config('booking.modification_deadline', 24),
            'cancellation_policy' => config('booking.cancellation_policy', 'moderate'),
        ];
    }

    /**
     * Get property settings
     */
    private function getPropertySettings(): array
    {
        return [
            'require_property_approval' => config('property.require_approval', true),
            'auto_publish_properties' => config('property.auto_publish', false),
            'max_images_per_property' => config('property.max_images', 20),
            'image_max_size_mb' => config('property.image_max_size', 5),
            'allowed_image_types' => config('property.allowed_image_types', 'jpg,jpeg,png'),
            'require_property_verification' => config('property.require_verification', true),
            'enable_seasonal_pricing' => config('property.enable_seasonal_pricing', true),
            'enable_weekend_pricing' => config('property.enable_weekend_pricing', true),
            'default_weekend_premium' => config('property.default_weekend_premium', 25),
            'enable_extra_bed_pricing' => config('property.enable_extra_bed', true),
            'enable_cleaning_fee' => config('property.enable_cleaning_fee', true),
            'minimum_property_rate' => config('property.minimum_rate', 50000),
            'maximum_property_rate' => config('property.maximum_rate'),
            'enable_property_reviews' => config('property.enable_reviews', true),
            'require_house_rules' => config('property.require_house_rules', false),
        ];
    }

    /**
     * Get system stats
     */
    private function getSystemStats(): array
    {
        return [
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'database_size' => $this->getDatabaseSize(),
            'storage_used' => $this->getStorageUsed(),
            'cache_status' => Cache::getStore() instanceof \Illuminate\Cache\NullStore ? 'Disabled' : 'Enabled',
            'queue_status' => $this->getQueueStatus(),
            'last_backup' => $this->getLastBackupDate(),
        ];
    }

    /**
     * Get recent logs
     */
    private function getRecentLogs(): array
    {
        $logFile = storage_path('logs/laravel.log');
        
        if (!file_exists($logFile)) {
            return [];
        }

        $lines = file($logFile);
        $recentLines = array_slice($lines, -20);
        
        return array_map('trim', $recentLines);
    }

    /**
     * Update settings in config
     */
    private function updateSettings(string $category, array $settings): void
    {
        foreach ($settings as $key => $value) {
            config(["$category.$key" => $value]);
        }

        // Cache settings for performance
        Cache::put("settings.$category", $settings, 3600);
    }

    /**
     * Get database size
     */
    private function getDatabaseSize(): string
    {
        try {
            $size = \DB::select("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'DB Size in MB' FROM information_schema.tables WHERE table_schema = DATABASE()")[0];
            return $size->{'DB Size in MB'} . ' MB';
        } catch (\Exception $e) {
            return 'Unknown';
        }
    }

    /**
     * Get storage used
     */
    private function getStorageUsed(): string
    {
        try {
            $bytes = 0;
            $path = storage_path();
            
            if (is_dir($path)) {
                foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path)) as $file) {
                    $bytes += $file->getSize();
                }
            }
            
            return $this->formatBytes($bytes);
        } catch (\Exception $e) {
            return 'Unknown';
        }
    }

    /**
     * Get queue status
     */
    private function getQueueStatus(): string
    {
        try {
            $failedJobs = \DB::table('failed_jobs')->count();
            return $failedJobs > 0 ? "Running ($failedJobs failed)" : 'Running';
        } catch (\Exception $e) {
            return 'Unknown';
        }
    }

    /**
     * Get last backup date
     */
    private function getLastBackupDate(): string
    {
        try {
            $backupPath = storage_path('app/backups');
            if (!is_dir($backupPath)) {
                return 'Never';
            }
            
            $files = glob($backupPath . '/*.sql');
            if (empty($files)) {
                return 'Never';
            }
            
            $latest = max(array_map('filemtime', $files));
            return date('Y-m-d H:i:s', $latest);
        } catch (\Exception $e) {
            return 'Unknown';
        }
    }

    /**
     * Format bytes to human readable format
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }
} 