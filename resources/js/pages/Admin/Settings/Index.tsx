import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Settings,
    Globe,
    CreditCard,
    Mail,
    Server,
    Calendar,
    Building2,
    Users,
    Database,
    HardDrive,
    Cpu,
    Shield,
    ChevronRight,
    CheckCircle,
    AlertTriangle,
    Activity
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface SettingsCategory {
    general: any;
    payment: any;
    email: any;
    system: any;
    booking: any;
    property: any;
}

interface SystemStats {
    php_version: string;
    laravel_version: string;
    database_size: string;
    storage_used: string;
    cache_status: string;
    queue_status: string;
    last_backup: string;
}

interface SettingsIndexProps {
    settings: SettingsCategory;
    stats: SystemStats;
}

export default function SettingsIndex({ settings, stats }: SettingsIndexProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settings', href: '#' },
    ];

    const settingsCards = [
        {
            title: 'General Settings',
            description: 'Informasi situs, kontak, dan konfigurasi dasar',
            icon: Globe,
            href: '/admin/settings/general',
            color: 'bg-blue-500',
            items: [
                { label: 'Nama Situs', value: settings.general.site_name },
                { label: 'Email Kontak', value: settings.general.contact_email },
                { label: 'Timezone', value: settings.general.timezone },
            ]
        },
        {
            title: 'Payment Settings',
            description: 'Metode pembayaran, biaya, dan konfigurasi transaksi',
            icon: CreditCard,
            href: '/admin/settings/payment',
            color: 'bg-green-500',
            items: [
                { label: 'Default DP', value: `${settings.payment.default_dp_percentage}%` },
                { label: 'Service Fee', value: `${settings.payment.service_fee_percentage}%` },
                { label: 'Tax Rate', value: `${settings.payment.tax_percentage}%` },
            ]
        },
        {
            title: 'Email Settings',
            description: 'Konfigurasi SMTP dan preferensi notifikasi',
            icon: Mail,
            href: '/admin/settings/email',
            color: 'bg-purple-500',
            items: [
                { label: 'Mail Driver', value: settings.email.mail_driver },
                { label: 'From Address', value: settings.email.mail_from_address },
                { label: 'Notifikasi', value: settings.email.send_booking_confirmation ? 'Aktif' : 'Nonaktif' },
            ]
        },
        {
            title: 'System Settings',
            description: 'Keamanan, maintenance, dan konfigurasi sistem',
            icon: Server,
            href: '/admin/settings/system',
            color: 'bg-red-500',
            items: [
                { label: 'Registrasi', value: settings.system.enable_registration ? 'Aktif' : 'Nonaktif' },
                { label: 'Cache', value: settings.system.enable_cache ? 'Aktif' : 'Nonaktif' },
                { label: 'Debug Mode', value: settings.system.enable_debug ? 'On' : 'Off' },
            ]
        },
        {
            title: 'Booking Settings',
            description: 'Aturan booking, kebijakan, dan konfigurasi workflow',
            icon: Calendar,
            href: '/admin/settings/booking',
            color: 'bg-orange-500',
            items: [
                { label: 'Verifikasi Admin', value: settings.booking.require_admin_verification ? 'Diperlukan' : 'Opsional' },
                { label: 'Max Tamu', value: settings.booking.max_guests_per_booking.toString() },
                { label: 'Kebijakan Batal', value: settings.booking.cancellation_policy },
            ]
        },
        {
            title: 'Property Settings',
            description: 'Manajemen properti, pricing, dan konfigurasi media',
            icon: Building2,
            href: '/admin/settings/property',
            color: 'bg-indigo-500',
            items: [
                { label: 'Persetujuan Diperlukan', value: settings.property.require_property_approval ? 'Ya' : 'Tidak' },
                { label: 'Max Gambar', value: settings.property.max_images_per_property.toString() },
                { label: 'Seasonal Pricing', value: settings.property.enable_seasonal_pricing ? 'Aktif' : 'Nonaktif' },
            ]
        },
    ];

    const systemStatsCards = [
        {
            title: 'Versi Sistem',
            items: [
                { label: 'PHP Version', value: stats.php_version, icon: Cpu },
                { label: 'Laravel Version', value: stats.laravel_version, icon: Shield },
            ]
        },
        {
            title: 'Storage & Database',
            items: [
                { label: 'Database Size', value: stats.database_size, icon: Database },
                { label: 'Storage Used', value: stats.storage_used, icon: HardDrive },
            ]
        },
        {
            title: 'Status Services',
            items: [
                { 
                    label: 'Cache Status', 
                    value: stats.cache_status, 
                    icon: Activity,
                    status: stats.cache_status === 'Enabled' ? 'success' : 'warning'
                },
                { 
                    label: 'Queue Status', 
                    value: stats.queue_status, 
                    icon: Activity,
                    status: stats.queue_status.includes('failed') ? 'error' : 'success'
                },
            ]
        },
        {
            title: 'Maintenance',
            items: [
                { label: 'Last Backup', value: stats.last_backup, icon: Database },
            ]
        },
    ];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default: return <Activity className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings - Admin Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                        <p className="text-gray-600 mt-1">
                            Kelola konfigurasi aplikasi dan preferensi Anda
                        </p>
                    </div>
                    <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Quick Setup
                    </Button>
                </div>

                {/* System Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {systemStatsCards.map((statsCard, index) => (
                        <Card key={index}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-gray-600">
                                    {statsCard.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {statsCard.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <item.icon className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {item.status && getStatusIcon(item.status)}
                                            <span className="text-sm font-medium">{item.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Settings Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settingsCards.map((card, index) => (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${card.color}`}>
                                        <card.icon className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{card.title}</CardTitle>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {card.description}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {card.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="flex items-center justify-between py-1">
                                        <span className="text-sm text-gray-600">{item.label}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {item.value}
                                        </Badge>
                                    </div>
                                ))}
                                <div className="pt-3 border-t">
                                    <Link href={card.href}>
                                        <Button variant="outline" size="sm" className="w-full">
                                            Konfigurasi
                                            <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <p className="text-sm text-gray-600">
                            Tugas maintenance dan konfigurasi yang umum dilakukan
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Link href="/admin/settings/email/test">
                                <Button variant="outline" className="w-full">
                                    <Mail className="h-4 w-4 mr-2" />
                                    Test Email
                                </Button>
                            </Link>
                            <Link href="/admin/settings/system/clear-cache" method="post">
                                <Button variant="outline" className="w-full">
                                    <Database className="h-4 w-4 mr-2" />
                                    Clear Cache
                                </Button>
                            </Link>
                            <Link href="/admin/settings/system/backup" method="post">
                                <Button variant="outline" className="w-full">
                                    <HardDrive className="h-4 w-4 mr-2" />
                                    Backup Database
                                </Button>
                            </Link>
                            <Link href="/admin/users">
                                <Button variant="outline" className="w-full">
                                    <Users className="h-4 w-4 mr-2" />
                                    Manage Users
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
} 