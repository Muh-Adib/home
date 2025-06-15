import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Server,
    Shield,
    Database,
    HardDrive,
    Activity,
    AlertTriangle,
    Save,
    RotateCcw,
    RefreshCw,
    Download,
    Trash2
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface SystemSettings {
    enable_registration: boolean;
    enable_guest_booking: boolean;
    require_email_verification: boolean;
    enable_maintenance_mode: boolean;
    maintenance_message?: string;
    max_upload_size: number;
    allowed_file_types: string;
    enable_cache: boolean;
    cache_duration: number;
    enable_debug: boolean;
    log_level: string;
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

interface SystemSettingsProps {
    settings: SystemSettings;
    stats: SystemStats;
    logs: string[];
}

export default function SystemSettings({ settings, stats, logs }: SystemSettingsProps) {
    const { data, setData, post, processing, errors, reset } = useForm<SystemSettings>({
        enable_registration: settings.enable_registration,
        enable_guest_booking: settings.enable_guest_booking,
        require_email_verification: settings.require_email_verification,
        enable_maintenance_mode: settings.enable_maintenance_mode,
        maintenance_message: settings.maintenance_message,
        max_upload_size: settings.max_upload_size,
        allowed_file_types: settings.allowed_file_types,
        enable_cache: settings.enable_cache,
        cache_duration: settings.cache_duration,
        enable_debug: settings.enable_debug,
        log_level: settings.log_level,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settings', href: '/admin/settings' },
        { title: 'System', href: '#' },
    ];

    const logLevels = [
        { value: 'emergency', label: 'Emergency' },
        { value: 'alert', label: 'Alert' },
        { value: 'critical', label: 'Critical' },
        { value: 'error', label: 'Error' },
        { value: 'warning', label: 'Warning' },
        { value: 'notice', label: 'Notice' },
        { value: 'info', label: 'Info' },
        { value: 'debug', label: 'Debug' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/settings/system');
    };

    const handleReset = () => {
        reset();
    };

    const handleClearCache = () => {
        if (confirm('Apakah Anda yakin ingin membersihkan cache?')) {
            Link.post('/admin/settings/system/clear-cache');
        }
    };

    const handleBackup = () => {
        if (confirm('Apakah Anda yakin ingin membuat backup database?')) {
            Link.post('/admin/settings/system/backup');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Settings - Admin Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Server className="h-8 w-8 text-blue-600" />
                            System Settings
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Konfigurasi keamanan, maintenance, dan pengaturan sistem
                        </p>
                    </div>
                </div>

                {/* System Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Versi Sistem
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">PHP</span>
                                <Badge variant="secondary">{stats.php_version}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Laravel</span>
                                <Badge variant="secondary">{stats.laravel_version}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Storage & Database
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Database</span>
                                <Badge variant="secondary">{stats.database_size}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Storage</span>
                                <Badge variant="secondary">{stats.storage_used}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Services
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Cache</span>
                                <Badge variant={stats.cache_status === 'Enabled' ? 'default' : 'secondary'}>
                                    {stats.cache_status}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Queue</span>
                                <Badge variant={stats.queue_status.includes('failed') ? 'destructive' : 'default'}>
                                    {stats.queue_status}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Maintenance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Last Backup</span>
                                <Badge variant="secondary">{stats.last_backup}</Badge>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={handleClearCache}>
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Clear Cache
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleBackup}>
                                    <Download className="h-3 w-3 mr-1" />
                                    Backup
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Security Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Pengaturan Keamanan
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Konfigurasi keamanan dan akses sistem
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label>Registrasi Pengguna</Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Switch
                                            checked={data.enable_registration}
                                            onCheckedChange={(checked) => setData('enable_registration', checked)}
                                        />
                                        <span className="text-sm text-gray-600">
                                            Izinkan registrasi pengguna baru
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label>Booking Tamu</Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Switch
                                            checked={data.enable_guest_booking}
                                            onCheckedChange={(checked) => setData('enable_guest_booking', checked)}
                                        />
                                        <span className="text-sm text-gray-600">
                                            Izinkan booking tanpa registrasi
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label>Verifikasi Email</Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Switch
                                            checked={data.require_email_verification}
                                            onCheckedChange={(checked) => setData('require_email_verification', checked)}
                                        />
                                        <span className="text-sm text-gray-600">
                                            Wajibkan verifikasi email
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label>Debug Mode</Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Switch
                                            checked={data.enable_debug}
                                            onCheckedChange={(checked) => setData('enable_debug', checked)}
                                        />
                                        <span className="text-sm text-gray-600">
                                            Aktifkan mode debug
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Maintenance Mode */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Mode Maintenance
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Konfigurasi mode maintenance untuk sistem
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label>Aktifkan Mode Maintenance</Label>
                                <div className="flex items-center space-x-2 mt-2">
                                    <Switch
                                        checked={data.enable_maintenance_mode}
                                        onCheckedChange={(checked) => setData('enable_maintenance_mode', checked)}
                                    />
                                    <span className="text-sm text-gray-600">
                                        Sistem akan tidak dapat diakses oleh pengguna
                                    </span>
                                </div>
                            </div>

                            {data.enable_maintenance_mode && (
                                <div>
                                    <Label htmlFor="maintenance_message">Pesan Maintenance</Label>
                                    <Textarea
                                        id="maintenance_message"
                                        value={data.maintenance_message || ''}
                                        onChange={(e) => setData('maintenance_message', e.target.value)}
                                        placeholder="Sistem sedang dalam maintenance. Silakan coba lagi nanti."
                                        rows={3}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* File Upload Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HardDrive className="h-5 w-5" />
                                Pengaturan File Upload
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Konfigurasi upload file dan media
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="max_upload_size">Ukuran Upload Maksimum (MB) *</Label>
                                    <Input
                                        id="max_upload_size"
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={data.max_upload_size}
                                        onChange={(e) => setData('max_upload_size', parseInt(e.target.value) || 1)}
                                        className={errors.max_upload_size ? 'border-red-500' : ''}
                                    />
                                    {errors.max_upload_size && (
                                        <p className="text-sm text-red-600 mt-1">{errors.max_upload_size}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="allowed_file_types">Tipe File yang Diizinkan *</Label>
                                    <Input
                                        id="allowed_file_types"
                                        value={data.allowed_file_types}
                                        onChange={(e) => setData('allowed_file_types', e.target.value)}
                                        className={errors.allowed_file_types ? 'border-red-500' : ''}
                                        placeholder="jpg,jpeg,png,gif,pdf"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Pisahkan dengan koma (,)
                                    </p>
                                    {errors.allowed_file_types && (
                                        <p className="text-sm text-red-600 mt-1">{errors.allowed_file_types}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cache & Performance */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Cache & Performance
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Konfigurasi cache dan optimasi performa
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label>Aktifkan Cache</Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Switch
                                            checked={data.enable_cache}
                                            onCheckedChange={(checked) => setData('enable_cache', checked)}
                                        />
                                        <span className="text-sm text-gray-600">
                                            Meningkatkan performa aplikasi
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="cache_duration">Durasi Cache (menit) *</Label>
                                    <Input
                                        id="cache_duration"
                                        type="number"
                                        min="1"
                                        max="1440"
                                        value={data.cache_duration}
                                        onChange={(e) => setData('cache_duration', parseInt(e.target.value) || 1)}
                                        className={errors.cache_duration ? 'border-red-500' : ''}
                                    />
                                    {errors.cache_duration && (
                                        <p className="text-sm text-red-600 mt-1">{errors.cache_duration}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logging */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Logging
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Konfigurasi level logging sistem
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="log_level">Level Log *</Label>
                                <Select value={data.log_level} onValueChange={(value) => setData('log_level', value)}>
                                    <SelectTrigger className={errors.log_level ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Pilih level log" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {logLevels.map(level => (
                                            <SelectItem key={level.value} value={level.value}>
                                                {level.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.log_level && (
                                    <p className="text-sm text-red-600 mt-1">{errors.log_level}</p>
                                )}
                            </div>

                            {/* Recent Logs */}
                            {logs.length > 0 && (
                                <div>
                                    <Label className="text-base font-semibold">Log Terbaru</Label>
                                    <div className="mt-3 bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                            {logs.slice(-10).join('\n')}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Warning Alert */}
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Perubahan pada system settings dapat mempengaruhi stabilitas dan keamanan sistem. 
                            Pastikan Anda memahami dampak dari setiap perubahan sebelum menyimpan.
                        </AlertDescription>
                    </Alert>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            disabled={processing}
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 