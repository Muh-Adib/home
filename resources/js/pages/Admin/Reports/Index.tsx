import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Users,
    Building2,
    CreditCard,
    Download,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Sparkles,
    Zap,
    Target,
    Globe,
    ChevronDown,
    FileSpreadsheet,
    BarChart3,
} from 'lucide-react';
import { DateRange } from '@/components/ui/date-range';

interface ReportsOverview {
    totalRevenue: number;
    totalExpenses?: number;
    netProfit?: number;
    totalBookings: number;
    averageBookingValue: number;
    occupancyRate: number;
    revenueGrowth: number;
    bookingsGrowth: number;
    occupancyGrowth: number;
}

interface RevenueByMonth {
    month: string;
    revenue: number;
    bookings: number;
}

interface TopProperty {
    id: number;
    name: string;
    revenue: number;
    bookings: number;
    occupancyRate: number;
}

interface BookingByStatus {
    status: string;
    count: number;
    percentage: number;
}

interface PaymentMethod {
    method: string;
    count: number;
    amount: number;
    percentage: number;
}

interface GuestCountry {
    country: string;
    count: number;
    percentage: number;
}

interface ReportsData {
    overview: ReportsOverview;
    revenueByMonth: RevenueByMonth[];
    topProperties: TopProperty[];
    bookingsByStatus: BookingByStatus[];
    paymentMethods: PaymentMethod[];
    guestCountries: GuestCountry[];
}

interface Property {
    id: number;
    name: string;
}

interface ReportsIndexProps extends PageProps {
    data: ReportsData;
    properties: Property[];
    filters: {
        date_from?: string;
        date_to?: string;
        property_id?: string;
        report_type?: string;
        period?: string;
    };
}

// Modern KPI Card
function KPICard({
    title,
    value,
    growth,
    icon: Icon,
    gradient,
    prefix = '',
    suffix = ''
}: {
    title: string;
    value: number | string;
    growth?: number;
    icon: any;
    gradient: string;
    prefix?: string;
    suffix?: string;
}) {
    const formatValue = (val: number | string) => {
        if (typeof val === 'number') {
            if (prefix === 'Rp') {
                if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} M`; // Milyar
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)} Jt`; // Juta
                if (val >= 1000) return `${(val / 1000).toFixed(0)} Rb`; // Ribu
            }
            return val.toLocaleString('id-ID');
        }
        return val;
    };

    return (
        <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 ${gradient}`}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-white/80">{title}</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                        {prefix && prefix !== 'Rp' && prefix}{formatValue(value)}{suffix}
                    </p>
                    {growth !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${growth >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                            {growth >= 0 ? (
                                <ArrowUpRight className="h-3 w-3" />
                            ) : (
                                <ArrowDownRight className="h-3 w-3" />
                            )}
                            <span>{Math.abs(growth)}%</span>
                        </div>
                    )}
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-white/20">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full bg-white/10" />
        </div>
    );
}

// Circular Progress Ring
function CircularProgress({ value, size = 80, color = '#8b5cf6' }: { value: number; size?: number; color?: string }) {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="w-full h-full -rotate-90">
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke="#e5e7eb" strokeWidth="6" fill="none"
                />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke={color} strokeWidth="6" fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                {value}%
            </span>
        </div>
    );
}

export default function ReportsIndex({ data, properties, filters }: ReportsIndexProps) {
    const { data: filterData, setData: setFilterData, get: getFilter } = useForm({
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
        property_id: filters.property_id || 'all',
    });

    const [selectedPeriod, setSelectedPeriod] = useState(filters.period || 'month');
    const [isExporting, setIsExporting] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Reports' },
    ];

    const handlePeriodChange = (newPeriod: string) => {
        setSelectedPeriod(newPeriod);
        router.get('/admin/reports', { period: newPeriod }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleExport = async (type: string) => {
        setIsExporting(true);
        try {
            // Create form with hidden fields for POST data
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/admin/reports/export';

            // Add CSRF token
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (csrfToken) {
                const tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = '_token';
                tokenInput.value = csrfToken;
                form.appendChild(tokenInput);
            }

            // Add form fields
            const fields = {
                type: type,
                format: 'csv',
                date_from: filterData.date_from || '',
                date_to: filterData.date_to || '',
                property_id: filterData.property_id === 'all' ? '' : filterData.property_id,
            };

            Object.entries(fields).forEach(([name, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = value;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        } finally {
            setTimeout(() => setIsExporting(false), 2000);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    const formatShort = (value: number) => {
        if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)} M`; // Milyar
        if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)} Jt`; // Juta
        if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)} Rb`; // Ribu
        return `Rp ${value.toLocaleString('id-ID')}`;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'confirmed': 'bg-emerald-500',
            'pending_verification': 'bg-amber-500',
            'checked_in': 'bg-blue-500',
            'checked_out': 'bg-gray-500',
            'cancelled': 'bg-red-500',
        };
        return colors[status] || 'bg-gray-400';
    };

    const maxRevenue = Math.max(...(data.topProperties?.map(p => p.revenue) || [0]), 1);

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Laporan - Admin" />

            <div className="min-h-screen pb-20">
                {/* Hero Header */}
                <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 -mx-4 sm:-mx-6 px-4 sm:px-6 py-6 sm:py-8 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="h-6 w-6 text-yellow-400" />
                                Laporan & Analitik
                            </h1>
                            <p className="text-purple-200 mt-1 text-sm sm:text-base">
                                Pantau performa bisnis secara real-time
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {/* Period Pills */}
                            <div className="flex gap-1 bg-white/10 rounded-full p-1">
                                {[{ key: 'week', label: 'Minggu' }, { key: 'month', label: 'Bulan' }, { key: 'quarter', label: 'Kuartal' }, { key: 'year', label: 'Tahun' }].map((period) => (
                                    <button
                                        key={period.key}
                                        onClick={() => handlePeriodChange(period.key)}
                                        className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all ${selectedPeriod === period.key
                                            ? 'bg-white text-slate-900'
                                            : 'text-white/80 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        {period.label}
                                    </button>
                                ))}
                            </div>

                            {/* Mobile Filter Button */}
                            <Sheet open={showFilters} onOpenChange={setShowFilters}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="sm" className="sm:hidden bg-white/10 border-white/20 text-white">
                                        <Filter className="h-4 w-4" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
                                    <div className="px-2">
                                        <SheetHeader className="pb-4 border-b">
                                            <SheetTitle className="text-lg">Filter Laporan</SheetTitle>
                                        </SheetHeader>
                                        <div className="space-y-5 pt-5 pb-8">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Properti</Label>
                                                <Select value={filterData.property_id} onValueChange={(v) => setFilterData('property_id', v)}>
                                                    <SelectTrigger className="h-12">
                                                        <SelectValue placeholder="Semua Properti" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Semua Properti</SelectItem>
                                                        {properties?.map((p) => (
                                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Periode Tanggal</Label>
                                                <DateRange
                                                    startDate={filterData.date_from}
                                                    endDate={filterData.date_to}
                                                    onDateChange={(s, e) => {
                                                        setFilterData('date_from', s);
                                                        setFilterData('date_to', e);
                                                    }}
                                                    adminMode={true}
                                                    startLabel="Dari"
                                                    endLabel="Sampai"
                                                />
                                            </div>
                                            <Button
                                                onClick={() => { getFilter('/admin/reports'); setShowFilters(false); }}
                                                className="w-full h-12 text-base"
                                            >
                                                Terapkan Filter
                                            </Button>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>

                            {/* Export Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" className="bg-white text-slate-900 hover:bg-white/90">
                                        <Download className="h-4 w-4 mr-1.5" />
                                        <span className="hidden sm:inline">Export</span>
                                        <ChevronDown className="h-4 w-4 ml-1" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Export Laporan</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleExport('revenue')}>
                                        <DollarSign className="h-4 w-4 mr-2" /> Pendapatan
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('bookings')}>
                                        <Calendar className="h-4 w-4 mr-2" /> Booking
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('occupancy')}>
                                        <Building2 className="h-4 w-4 mr-2" /> Okupansi
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('daily_breakdown')}>
                                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Detail Harian
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mt-6">
                        <KPICard
                            title="Total Pendapatan"
                            value={data.overview.totalRevenue}
                            growth={data.overview.revenueGrowth}
                            icon={DollarSign}
                            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                            prefix="Rp"
                        />
                        <KPICard
                            title="Total Pengeluaran"
                            value={data.overview.totalExpenses ?? 0}
                            icon={CreditCard}
                            gradient="bg-gradient-to-br from-rose-500 to-red-600"
                            prefix="Rp"
                        />
                        <KPICard
                            title="Laba Bersih (Net)"
                            value={data.overview.netProfit ?? (data.overview.totalRevenue - (data.overview.totalExpenses ?? 0))}
                            icon={Sparkles}
                            gradient="bg-gradient-to-br from-cyan-600 to-blue-700"
                            prefix="Rp"
                        />
                        <KPICard
                            title="Total Booking"
                            value={data.overview.totalBookings}
                            growth={data.overview.bookingsGrowth}
                            icon={Calendar}
                            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                        />
                        <KPICard
                            title="Okupansi Portfolio"
                            value={data.overview.occupancyRate}
                            growth={data.overview.occupancyGrowth}
                            icon={Target}
                            gradient="bg-gradient-to-br from-purple-500 to-pink-600"
                            suffix="%"
                        />
                    </div>
                </div>

                {/* Master Report Modules Navigator */}
                <div className="px-1 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-indigo-600" />
                                Modul Laporan Utama
                            </h2>
                            <p className="text-xs font-medium text-slate-500">Pilih modul laporan mendalam di bawah ini untuk melihat detail lengkap</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Property Performance Report Card */}
                        <Link href="/admin/reports/property-performance" className="group">
                            <Card className="h-full border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl group-hover:-translate-y-1 overflow-hidden relative">
                                <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
                                <CardHeader className="p-5 pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <Building2 className="h-6 w-6" />
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <CardTitle className="text-base font-bold text-slate-800 mt-3 group-hover:text-emerald-700 transition-colors">
                                        Pendapatan Harian Properti
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500 leading-relaxed mt-1">
                                        Visualisasi harian, rincian pengeluaran per properti, laba bersih, & rincian tarif per malam.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 pt-0 mt-2">
                                    <span className="text-xs font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                                        Buka Laporan Performance →
                                    </span>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 2. Financial Overview Report Card */}
                        <Link href="/admin/reports/financial" className="group">
                            <Card className="h-full border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl group-hover:-translate-y-1 overflow-hidden relative">
                                <div className="h-2 bg-gradient-to-r from-blue-400 to-indigo-500" />
                                <CardHeader className="p-5 pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <DollarSign className="h-6 w-6" />
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <CardTitle className="text-base font-bold text-slate-800 mt-3 group-hover:text-blue-700 transition-colors">
                                        Laporan Keuangan
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500 leading-relaxed mt-1">
                                        Rincian penerimaan, cash flow, pembayaran pending, & estimasi bagi hasil per pemilik.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 pt-0 mt-2">
                                    <span className="text-xs font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                                        Buka Laporan Keuangan →
                                    </span>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 3. Occupancy Report Card */}
                        <Link href="/admin/reports/occupancy" className="group">
                            <Card className="h-full border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl group-hover:-translate-y-1 overflow-hidden relative">
                                <div className="h-2 bg-gradient-to-r from-purple-400 to-pink-500" />
                                <CardHeader className="p-5 pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Calendar className="h-6 w-6" />
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <CardTitle className="text-base font-bold text-slate-800 mt-3 group-hover:text-purple-700 transition-colors">
                                        Laporan Okupansi
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500 leading-relaxed mt-1">
                                        Tingkat hunian malam, pencapaian target 25 malam per unit, & sisa potensi malam terisi.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 pt-0 mt-2">
                                    <span className="text-xs font-bold text-purple-600 group-hover:underline flex items-center gap-1">
                                        Buka Laporan Okupansi →
                                    </span>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 4. Staff Performance Card */}
                        <Link href="/admin/reports/staff-performance" className="group">
                            <Card className="h-full border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl group-hover:-translate-y-1 overflow-hidden relative">
                                <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
                                <CardHeader className="p-5 pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                            <Users className="h-6 w-6" />
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <CardTitle className="text-base font-bold text-slate-800 mt-3 group-hover:text-amber-700 transition-colors">
                                        Kinerja Staf & HK
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500 leading-relaxed mt-1">
                                        Poin kebersihan housekeeping, rekap kehadiran absensi, & pembagian bonus bulanan.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 pt-0 mt-2">
                                    <span className="text-xs font-bold text-amber-600 group-hover:underline flex items-center gap-1">
                                        Buka Kinerja Staf →
                                    </span>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6 px-1">
                    {/* Revenue Trend */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                                        Tren Pendapatan
                                    </CardTitle>
                                    <CardDescription>Performa bulanan</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.revenueByMonth?.slice(-6).map((month, i) => {
                                    const width = (month.revenue / Math.max(...data.revenueByMonth.map(m => m.revenue), 1)) * 100;
                                    return (
                                        <div key={month.month} className="group">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-sm font-medium">{month.month}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-xs">{month.bookings} booking</Badge>
                                                    <span className="font-semibold text-emerald-600">{formatShort(month.revenue)}</span>
                                                </div>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500 group-hover:from-emerald-500 group-hover:to-teal-600"
                                                    style={{ width: `${width}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Property Performance */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-blue-500" />
                                        Top Properti
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href="/admin/properties">Lihat Semua <ChevronRight className="h-4 w-4 ml-1" /></Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {data.topProperties?.slice(0, 5).map((property, i) => (
                                    <div key={property.id} className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' :
                                            i === 1 ? 'bg-gray-100 text-gray-700' :
                                                i === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-blue-50 text-blue-600'
                                            }`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{property.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Progress value={(property.revenue / maxRevenue) * 100} className="h-1.5 flex-1" />
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">{property.occupancyRate}%</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-sm text-emerald-600">{formatShort(property.revenue)}</p>
                                            <p className="text-xs text-muted-foreground">{property.bookings} bookings</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Booking Status */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-purple-500" />
                                    Booking Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex h-4 rounded-full overflow-hidden mb-4">
                                    {data.bookingsByStatus?.map((status) => (
                                        <div
                                            key={status.status}
                                            className={`${getStatusColor(status.status)} transition-all`}
                                            style={{ width: `${status.percentage}%` }}
                                            title={`${status.status}: ${status.percentage}%`}
                                        />
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {data.bookingsByStatus?.map((status) => (
                                        <div key={status.status} className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate capitalize">
                                                    {status.status.replace(/_/g, ' ')}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-xs">{status.count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bottom Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Payment Methods */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-indigo-500" />
                                    Metode Pembayaran
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {data.paymentMethods?.map((method) => (
                                    <div key={method.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="font-medium text-sm">{method.method}</p>
                                            <p className="text-xs text-muted-foreground">{method.count} transaksi</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">{formatShort(method.amount)}</p>
                                            <p className="text-xs text-muted-foreground">{method.percentage}%</p>
                                        </div>
                                    </div>
                                ))}
                                {(!data.paymentMethods || data.paymentMethods.length === 0) && (
                                    <p className="text-center text-muted-foreground py-4">Tidak ada data pembayaran</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Guest Origins */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-teal-500" />
                                    Asal Negara Tamu
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {data.guestCountries?.slice(0, 5).map((country, i) => (
                                    <div key={country.country} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{country.country}</p>
                                            <Progress value={country.percentage} className="h-1.5 mt-1" />
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-sm">{country.count}</p>
                                            <p className="text-xs text-muted-foreground">{country.percentage}%</p>
                                        </div>
                                    </div>
                                ))}
                                {(!data.guestCountries || data.guestCountries.length === 0) && (
                                    <p className="text-center text-muted-foreground py-4">Tidak ada data tamu</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
