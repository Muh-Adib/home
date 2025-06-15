import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    CreditCard,
    DollarSign,
    Clock,
    Shield,
    Settings,
    Save,
    RotateCcw,
    Info,
    AlertTriangle
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface PaymentSettings {
    default_dp_percentage: number;
    payment_deadline_hours: number;
    auto_cancel_hours: number;
    enable_online_payment: boolean;
    enable_manual_payment: boolean;
    payment_confirmation_required: boolean;
    minimum_booking_amount: number;
    maximum_booking_amount?: number;
    service_fee_percentage: number;
    tax_percentage: number;
}

interface PaymentMethod {
    id: number;
    name: string;
    type: string;
    is_active: boolean;
    display_order: number;
}

interface PaymentSettingsProps {
    settings: PaymentSettings;
    paymentMethods: PaymentMethod[];
}
export default function PaymentSettings({ settings, paymentMethods }: PaymentSettingsProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        default_dp_percentage: settings.default_dp_percentage,
        payment_deadline_hours: settings.payment_deadline_hours,
        auto_cancel_hours: settings.auto_cancel_hours,
        enable_online_payment: settings.enable_online_payment,
        enable_manual_payment: settings.enable_manual_payment,
        payment_confirmation_required: settings.payment_confirmation_required,
        minimum_booking_amount: settings.minimum_booking_amount,
        maximum_booking_amount: settings.maximum_booking_amount,
        service_fee_percentage: settings.service_fee_percentage,
        tax_percentage: settings.tax_percentage,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settings', href: '/admin/settings' },
        { title: 'Payment', href: '#' },
    ];

    const dpOptions = [
        { value: 30, label: '30%' },
        { value: 50, label: '50%' },
        { value: 70, label: '70%' },
    ];

    const deadlineOptions = [
        { value: 1, label: '1 Jam' },
        { value: 2, label: '2 Jam' },
        { value: 6, label: '6 Jam' },
        { value: 12, label: '12 Jam' },
        { value: 24, label: '24 Jam' },
        { value: 48, label: '48 Jam' },
        { value: 72, label: '72 Jam' },
        { value: 168, label: '1 Minggu' },
    ];

    const cancelOptions = [
        { value: 24, label: '24 Jam' },
        { value: 48, label: '48 Jam' },
        { value: 72, label: '72 Jam' },
        { value: 168, label: '1 Minggu' },
        { value: 336, label: '2 Minggu' },
        { value: 720, label: '1 Bulan' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/settings/payment');
    };

    const handleReset = () => {
        reset();
    };

    const getPaymentMethodTypeColor = (type: string) => {
        switch (type) {
            case 'bank_transfer': return 'bg-blue-100 text-blue-800';
            case 'e_wallet': return 'bg-green-100 text-green-800';
            case 'cash': return 'bg-yellow-100 text-yellow-800';
            case 'credit_card': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount: number) => {
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payment Settings - Admin Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <CreditCard className="h-8 w-8 text-blue-600" />
                            Payment Settings
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Konfigurasi metode pembayaran, biaya, dan kebijakan transaksi
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <a href="/admin/payment-methods">
                            <Settings className="h-4 w-4 mr-2" />
                            Kelola Metode Pembayaran
                        </a>
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Down Payment Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Pengaturan Down Payment
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Konfigurasi opsi down payment default dan kebijakan
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="default_dp_percentage">Persentase DP Default *</Label>
                                    <Select 
                                        value={data.default_dp_percentage.toString()} 
                                        onValueChange={(value) => setData('default_dp_percentage', parseInt(value))}
                                    >
                                        <SelectTrigger className={errors.default_dp_percentage ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Pilih DP default" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {dpOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value.toString()}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.default_dp_percentage && (
                                        <p className="text-sm text-red-600 mt-1">{errors.default_dp_percentage}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="minimum_booking_amount">Jumlah Booking Minimum *</Label>
                                    <Input
                                        id="minimum_booking_amount"
                                        type="number"
                                        value={data.minimum_booking_amount}
                                        onChange={(e) => setData('minimum_booking_amount', parseFloat(e.target.value) || 0)}
                                        className={errors.minimum_booking_amount ? 'border-red-500' : ''}
                                        placeholder="100000"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Saat ini: {formatCurrency(data.minimum_booking_amount)}
                                    </p>
                                    {errors.minimum_booking_amount && (
                                        <p className="text-sm text-red-600 mt-1">{errors.minimum_booking_amount}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="maximum_booking_amount">Jumlah Booking Maksimum (Opsional)</Label>
                                    <Input
                                        id="maximum_booking_amount"
                                        type="number"
                                        value={data.maximum_booking_amount || ''}
                                        onChange={(e) => setData('maximum_booking_amount', parseFloat(e.target.value) || undefined)}
                                        className={errors.maximum_booking_amount ? 'border-red-500' : ''}
                                        placeholder="50000000"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Kosongkan untuk tanpa batas
                                    </p>
                                    {errors.maximum_booking_amount && (
                                        <p className="text-sm text-red-600 mt-1">{errors.maximum_booking_amount}</p>
                                    )}
                                </div>

                                <div>
                                    <Label>Konfirmasi Pembayaran Diperlukan</Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Switch
                                            checked={data.payment_confirmation_required}
                                            onCheckedChange={(checked) => setData('payment_confirmation_required', checked)}
                                        />
                                        <span className="text-sm text-gray-600">
                                            Perlu konfirmasi admin untuk pembayaran
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Timing */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Waktu Pembayaran
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Konfigurasi deadline pembayaran dan kebijakan auto-cancel
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="payment_deadline_hours">Deadline Pembayaran *</Label>
                                    <Select 
                                        value={data.payment_deadline_hours.toString()} 
                                        onValueChange={(value) => setData('payment_deadline_hours', parseInt(value))}
                                    >
                                        <SelectTrigger className={errors.payment_deadline_hours ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Pilih deadline" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {deadlineOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value.toString()}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Batas waktu untuk pembayaran setelah verifikasi booking
                                    </p>
                                    {errors.payment_deadline_hours && (
                                        <p className="text-sm text-red-600 mt-1">{errors.payment_deadline_hours}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="auto_cancel_hours">Auto-Cancel Setelah *</Label>
                                    <Select 
                                        value={data.auto_cancel_hours.toString()} 
                                        onValueChange={(value) => setData('auto_cancel_hours', parseInt(value))}
                                    >
                                        <SelectTrigger className={errors.auto_cancel_hours ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Pilih waktu auto-cancel" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cancelOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value.toString()}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Otomatis membatalkan booking yang belum dibayar setelah waktu ini
                                    </p>
                                    {errors.auto_cancel_hours && (
                                        <p className="text-sm text-red-600 mt-1">{errors.auto_cancel_hours}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Methods */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Opsi Pembayaran
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Aktifkan atau nonaktifkan jenis metode pembayaran
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label>Pembayaran Online</Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Switch
                                            checked={data.enable_online_payment}
                                            onCheckedChange={(checked) => setData('enable_online_payment', checked)}
                                        />
                                        <span className="text-sm text-gray-600">
                                            Aktifkan pembayaran kartu kredit dan e-wallet
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label>Pembayaran Manual</Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Switch
                                            checked={data.enable_manual_payment}
                                            onCheckedChange={(checked) => setData('enable_manual_payment', checked)}
                                        />
                                        <span className="text-sm text-gray-600">
                                            Aktifkan transfer bank dan pembayaran tunai
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Active Payment Methods */}
                            <div>
                                <Label className="text-base font-semibold">Metode Pembayaran Aktif</Label>
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {paymentMethods.map((method) => (
                                        <div
                                            key={method.id}
                                            className={`p-3 rounded-lg border-2 ${
                                                method.is_active 
                                                    ? 'border-green-200 bg-green-50' 
                                                    : 'border-gray-200 bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge className={getPaymentMethodTypeColor(method.type)}>
                                                    {method.type.replace('_', ' ')}
                                                </Badge>
                                                <div className={`w-2 h-2 rounded-full ${
                                                    method.is_active ? 'bg-green-500' : 'bg-gray-400'
                                                }`} />
                                            </div>
                                            <p className="text-sm font-medium">{method.name}</p>
                                            <p className="text-xs text-gray-500">Urutan: {method.display_order}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Fees and Taxes */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Biaya dan Pajak
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Konfigurasi biaya layanan dan tarif pajak
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="service_fee_percentage">Persentase Biaya Layanan *</Label>
                                    <div className="relative">
                                        <Input
                                            id="service_fee_percentage"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={data.service_fee_percentage}
                                            onChange={(e) => setData('service_fee_percentage', parseFloat(e.target.value) || 0)}
                                            className={`pr-8 ${errors.service_fee_percentage ? 'border-red-500' : ''}`}
                                            placeholder="5.00"
                                        />
                                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Biaya yang dikenakan di atas tarif properti
                                    </p>
                                    {errors.service_fee_percentage && (
                                        <p className="text-sm text-red-600 mt-1">{errors.service_fee_percentage}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="tax_percentage">Persentase Pajak *</Label>
                                    <div className="relative">
                                        <Input
                                            id="tax_percentage"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={data.tax_percentage}
                                            onChange={(e) => setData('tax_percentage', parseFloat(e.target.value) || 0)}
                                            className={`pr-8 ${errors.tax_percentage ? 'border-red-500' : ''}`}
                                            placeholder="10.00"
                                        />
                                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Tarif pajak pemerintah (VAT/GST)
                                    </p>
                                    {errors.tax_percentage && (
                                        <p className="text-sm text-red-600 mt-1">{errors.tax_percentage}</p>
                                    )}
                                </div>
                            </div>

                            {/* Fee Preview */}
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Contoh perhitungan:</strong> Untuk booking Rp 1.000.000 dengan pengaturan saat ini:
                                    <br />
                                    • Jumlah dasar: Rp 1.000.000
                                    <br />
                                    • Biaya layanan ({data.service_fee_percentage}%): Rp {(1000000 * data.service_fee_percentage / 100).toLocaleString()}
                                    <br />
                                    • Pajak ({data.tax_percentage}%): Rp {(1000000 * data.tax_percentage / 100).toLocaleString()}
                                    <br />
                                    • <strong>Total: Rp {(1000000 * (1 + (data.service_fee_percentage + data.tax_percentage) / 100)).toLocaleString()}</strong>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Warning Alert */}
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Perubahan pada payment settings akan berpengaruh pada booking baru secara langsung. 
                            Booking yang sudah ada akan tetap menggunakan ketentuan pembayaran aslinya. 
                            Harap tinjau semua pengaturan dengan teliti sebelum menyimpan.
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