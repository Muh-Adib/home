import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type BreadcrumbItem, type PageProps } from '@/types';
import {
    Building2,
    Calendar,
    DollarSign,
    TrendingUp,
    Download,
    Filter,
    ChevronRight,
    Sparkles,
    ChevronDown,
    Globe,
    Users,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    ArrowUpDown,
    Search,
    BookOpen,
    CreditCard
} from 'lucide-react';
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface Property {
    id: number;
    name: string;
}

interface OverviewStats {
    totalRevenue: number;
    totalBookings: number;
    occupancyRate: number;
    adr: number;
    revpar: number;
}

interface DailyChartItem {
    date: string;
    day: string;
    total: number;
    base_amount: number;
    weekend_premium: number;
    seasonal_premium: number;
    extra_bed_amount: number;
    [propertyName: string]: any;
}

interface PropertyPerformanceItem {
    id: number;
    name: string;
    total_revenue: number;
    total_bookings: number;
    occupancy_rate: number;
    adr: number;
    revpar: number;
}

interface BookingSourceItem {
    source: string;
    count: number;
    revenue: number;
    percentage: number;
}

interface DailyBreakdownItem {
    date: string;
    property_name: string;
    booking_number: string;
    guest_name: string;
    amount: number;
    base_amount: number;
    weekend_premium: number;
    seasonal_premium: number;
    extra_bed_amount: number;
    extra_services_amount: number;
    is_weekend: boolean;
    rate_type: string;
    rate_name: string | null;
}

interface OverallBookingItem {
    booking_number: string;
    property_name: string;
    guest_name: string;
    check_in: string;
    check_out: string;
    nights: number;
    room_charge: number;
    extra_services: number;
    total_amount: number;
    booking_status: string;
}

interface PropertyPerformanceProps extends PageProps {
    properties: Property[];
    filters: {
        date_from?: string;
        date_to?: string;
        property_id: string;
        period: string;
    };
    data: {
        overview: OverviewStats;
        dailyRevenueChart: DailyChartItem[];
        propertyPerformance: PropertyPerformanceItem[];
        bookingSources: BookingSourceItem[];
        dailyBreakdown: DailyBreakdownItem[];
        overallBookings: OverallBookingItem[];
    };
}

const PROPERTY_COLORS = [
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f43f5e', // Rose
    '#6366f1', // Indigo
];

export default function PropertyPerformance({ properties, filters, data }: PropertyPerformanceProps) {
    const [selectedProperty, setSelectedProperty] = useState(filters.property_id);
    const [selectedPeriod, setSelectedPeriod] = useState(filters.period);
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const months = [
        { value: '01', label: 'Januari' },
        { value: '02', label: 'Februari' },
        { value: '03', label: 'Maret' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Mei' },
        { value: '06', label: 'Juni' },
        { value: '07', label: 'Juli' },
        { value: '08', label: 'Agustus' },
        { value: '09', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 3 + i).toString());

    // Safely extract initial values from filters.date_from
    const initialMonth = filters.date_from && filters.date_from.includes('-')
        ? filters.date_from.split('-')[1]
        : (new Date().getMonth() + 1).toString().padStart(2, '0');
    const initialYear = filters.date_from && filters.date_from.includes('-')
        ? filters.date_from.split('-')[0]
        : new Date().getFullYear().toString();

    const [selectedMonth, setSelectedMonth] = useState(initialMonth);
    const [selectedYear, setSelectedYear] = useState(initialYear);

    // Keep dropdown selections synchronized when dateFrom is changed via date pickers or period quick filters
    useEffect(() => {
        if (dateFrom && dateFrom.includes('-')) {
            const parts = dateFrom.split('-');
            setSelectedMonth(parts[1]);
            setSelectedYear(parts[0]);
        }
    }, [dateFrom]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

    const handleMonthYearChange = (m: string, y: string) => {
        const lastDay = getDaysInMonth(parseInt(y), parseInt(m));
        const fromDate = `${y}-${m}-01`;
        const toDate = `${y}-${m}-${lastDay.toString().padStart(2, '0')}`;
        setDateFrom(fromDate);
        setDateTo(toDate);
        setSelectedPeriod('custom');
        handleFilterChange({
            period: 'custom',
            date_from: fromDate,
            date_to: toDate,
        });
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/admin/reports/export';

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (csrfToken) {
                const tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = '_token';
                tokenInput.value = csrfToken;
                form.appendChild(tokenInput);
            }

            const fields = {
                type: 'property_performance',
                format: 'excel',
                date_from: dateFrom,
                date_to: dateTo,
                property_id: selectedProperty,
                period: selectedPeriod,
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
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setTimeout(() => setIsExporting(false), 2000);
        }
    };

    // Flat breakdown table state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<keyof DailyBreakdownItem>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Laporan & Analitik', href: '/admin/reports' },
        { title: 'Pendapatan Properti Harian' },
    ];

    const handleFilterChange = (updates: Record<string, string>) => {
        const queryParams = {
            period: updates.period !== undefined ? updates.period : selectedPeriod,
            property_id: updates.property_id !== undefined ? updates.property_id : selectedProperty,
            date_from: updates.date_from !== undefined ? updates.date_from : dateFrom,
            date_to: updates.date_to !== undefined ? updates.date_to : dateTo,
        };

        // If switching period to anything but custom, clear dates
        if (updates.period && updates.period !== 'custom') {
            queryParams.date_from = '';
            queryParams.date_to = '';
            setDateFrom('');
            setDateTo('');
        }

        router.get('/admin/reports/property-performance', queryParams, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSort = (field: keyof DailyBreakdownItem) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
        setCurrentPage(1);
    };

    // Client-side filtering & sorting for the detailed table
    const filteredBreakdown = useMemo(() => {
        let result = [...data.dailyBreakdown];

        // Search filter
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            result = result.filter(item => 
                item.property_name.toLowerCase().includes(term) ||
                item.booking_number.toLowerCase().includes(term) ||
                item.guest_name.toLowerCase().includes(term) ||
                item.date.includes(term)
            );
        }

        // Sorting
        result.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDirection === 'asc' 
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }

            // Numeric comparison
            return sortDirection === 'asc' 
                ? (valA as number) - (valB as number)
                : (valB as number) - (valA as number);
        });

        return result;
    }, [data.dailyBreakdown, searchTerm, sortField, sortDirection]);

    // Pagination
    const paginatedBreakdown = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredBreakdown.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredBreakdown, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredBreakdown.length / itemsPerPage);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    const formatShort = (value: number) => {
        if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)} M`;
        if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)} Jt`;
        if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)} Rb`;
        return `Rp ${value.toLocaleString('id-ID')}`;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'confirmed': 'bg-emerald-500',
            'pending_verification': 'bg-amber-500',
            'checked_in': 'bg-blue-500',
            'checked_out': 'bg-slate-500',
            'cancelled': 'bg-red-500',
        };
        return colors[status] || 'bg-gray-400';
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 text-white border-0 rounded-xl shadow-2xl p-4 text-xs font-sans max-w-sm">
                    <p className="font-bold text-sm mb-2 border-b border-white/20 pb-1">{label}</p>
                    <div className="space-y-1.5">
                        {payload.map((entry: any, index: number) => {
                            if (entry.value === 0) return null;
                            return (
                                <div key={index} className="flex justify-between items-center gap-6">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }} />
                                        {entry.name === 'base_amount' ? 'Tarif Dasar' :
                                         entry.name === 'weekend_premium' ? 'Weekend Premium' :
                                         entry.name === 'seasonal_premium' ? 'Seasonal Premium' :
                                         entry.name === 'extra_bed_amount' ? 'Extra Bed' :
                                         entry.name === 'total' ? 'Total Gabungan' : entry.name}
                                    </span>
                                    <span className="font-bold text-emerald-400">
                                        {formatCurrency(entry.value)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen pb-20 p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
                {/* Hero Header */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 -mx-4 sm:-mx-6 px-4 sm:px-6 py-6 sm:py-8 mb-2 rounded-b-3xl shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 tracking-tight">
                                <Building2 className="h-7 w-7 text-indigo-400" />
                                Analitik Pendapatan Harian Properti
                            </h1>
                            <p className="text-indigo-200 mt-1.5 text-sm sm:text-base font-medium opacity-90">
                                Visualisasi rincian pendapatan harian, performa akomodasi, dan rincian transaksi per properti.
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Fast Period Selector */}
                            <div className="flex bg-white/10 rounded-full p-1 border border-white/15">
                                {[
                                    { key: 'week', label: 'Minggu' },
                                    { key: 'month', label: 'Bulan' },
                                    { key: 'quarter', label: 'Kuartal' },
                                    { key: 'year', label: 'Tahun' },
                                ].map((p) => (
                                    <button
                                        key={p.key}
                                        onClick={() => {
                                            setSelectedPeriod(p.key);
                                            handleFilterChange({ period: p.key });
                                        }}
                                        className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full transition-all ${
                                            selectedPeriod === p.key
                                                ? 'bg-white text-indigo-950 shadow-md scale-105'
                                                : 'text-white/80 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <Button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-full px-4 py-1.5 h-auto text-xs sm:text-sm border border-white/15 cursor-pointer disabled:opacity-50"
                            >
                                <Download className="h-4 w-4 mr-2 inline" />
                                {isExporting ? 'Mengekspor...' : 'Ekspor XLSX'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Property Selector */}
                            <div className="flex flex-col gap-1.5 min-w-[200px]">
                                <label className="text-xs font-semibold text-slate-500">Pilih Properti</label>
                                <Select
                                    value={selectedProperty}
                                    onValueChange={(val) => {
                                        setSelectedProperty(val);
                                        handleFilterChange({ property_id: val });
                                    }}
                                >
                                    <SelectTrigger className="w-full sm:w-[240px] font-bold border-slate-200 focus:ring-indigo-500 rounded-xl">
                                        <SelectValue placeholder="Pilih Properti" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="font-bold text-slate-800">
                                            🌟 Semua Properti
                                        </SelectItem>
                                        {properties.map((prop) => (
                                            <SelectItem key={prop.id} value={prop.id.toString()} className="font-medium">
                                                {prop.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Month & Year Selectors */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-500">Pilih Bulan & Tahun</label>
                                <div className="flex gap-2">
                                    <Select
                                        value={selectedMonth}
                                        onValueChange={(val) => {
                                            setSelectedMonth(val);
                                            handleMonthYearChange(val, selectedYear);
                                        }}
                                    >
                                        <SelectTrigger className="w-[140px] font-bold border-slate-200 focus:ring-indigo-500 rounded-xl">
                                            <SelectValue placeholder="Bulan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {months.map((m) => (
                                                <SelectItem key={m.value} value={m.value} className="font-medium">
                                                    {m.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={selectedYear}
                                        onValueChange={(val) => {
                                            setSelectedYear(val);
                                            handleMonthYearChange(selectedMonth, val);
                                        }}
                                    >
                                        <SelectTrigger className="w-[100px] font-bold border-slate-200 focus:ring-indigo-500 rounded-xl">
                                            <SelectValue placeholder="Tahun" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map((y) => (
                                                <SelectItem key={y} value={y} className="font-medium">
                                                    {y}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Date Picker Trigger / Indicator */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-500">Filter Tanggal</label>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={`flex items-center gap-2 border-slate-200 rounded-xl hover:bg-slate-50 ${
                                        showAdvancedFilters || selectedPeriod === 'custom' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : ''
                                    }`}
                                >
                                    <Calendar className="h-4 w-4" />
                                    <span>Rentang Tanggal</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                                </Button>
                            </div>
                        </div>

                        {/* Reset Filter Button */}
                        <div className="flex items-end h-full">
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                    setSelectedProperty('all');
                                    setSelectedPeriod('month');
                                    handleFilterChange({ property_id: 'all', period: 'month' });
                                }}
                                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                            >
                                Reset Filter
                            </Button>
                        </div>
                    </div>

                    {/* Advanced Date Filters Dropdown */}
                    {(showAdvancedFilters || selectedPeriod === 'custom') && (
                        <div className="border-t border-slate-100 pt-4 mt-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end animate-fadeIn">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-500">Tanggal Mulai</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-500">Tanggal Selesai</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <Button
                                    onClick={() => {
                                        setSelectedPeriod('custom');
                                        handleFilterChange({ period: 'custom', date_from: dateFrom, date_to: dateTo });
                                    }}
                                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                                    disabled={!dateFrom || !dateTo}
                                >
                                    Terapkan Tanggal Kustom
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* KPI Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Revenue Card */}
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-white/80 uppercase">Total Pendapatan</p>
                                <p className="text-2xl font-black">{formatShort(data.overview.totalRevenue)}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/20">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs text-white/90 font-medium">
                            <TrendingUp className="h-4 w-4" />
                            <span>Berdasarkan rincian per malam</span>
                        </div>
                    </div>

                    {/* Bookings Card */}
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-white/80 uppercase">Total Booking</p>
                                <p className="text-2xl font-black">{data.overview.totalBookings}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/20">
                                <Calendar className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs text-white/90 font-medium">
                            <span>Booking aktif pada periode</span>
                        </div>
                    </div>

                    {/* Occupancy Card */}
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-white/80 uppercase">Okupansi Properti</p>
                                <p className="text-2xl font-black">{data.overview.occupancyRate}%</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/20">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div className="mt-3.5">
                            <Progress value={data.overview.occupancyRate} className="h-1.5 bg-white/20" />
                        </div>
                    </div>

                    {/* ADR Card */}
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-white/80 uppercase">Rerata Tarif Harian (ADR)</p>
                                <p className="text-xl font-black">{formatShort(data.overview.adr)}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/20">
                                <Building2 className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs text-white/90 font-medium">
                            <span>Total Revenue / Hari Okupansi</span>
                        </div>
                    </div>

                    {/* RevPAR Card */}
                    <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-white/80 uppercase">RevPAR</p>
                                <p className="text-xl font-black">{formatShort(data.overview.revpar)}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/20">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs text-white/90 font-medium">
                            <span>Pendapatan per Kamar Tersedia</span>
                        </div>
                    </div>
                </div>

                {/* Primary Daily Chart */}
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                                    Grafik Pendapatan Harian
                                </CardTitle>
                                <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                                    {selectedProperty === 'all' 
                                        ? 'Perbandingan tren pendapatan harian untuk semua properti aktif'
                                        : `Rincian tren harian dan breakdown tarif properti terpilih`}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[350px] w-full">
                            {selectedProperty === 'all' ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.dailyRevenueChart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                        <YAxis tickFormatter={formatShort} stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 500 }} />
                                        
                                        {/* Total Line */}
                                        <Line type="monotone" dataKey="total" name="Total Gabungan" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                        
                                        {/* Property Lines */}
                                        {properties.map((prop, idx) => (
                                            <Line
                                                key={prop.id}
                                                type="monotone"
                                                dataKey={prop.name}
                                                name={prop.name}
                                                stroke={PROPERTY_COLORS[idx % PROPERTY_COLORS.length]}
                                                strokeWidth={1.5}
                                                dot={false}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.dailyRevenueChart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="weekendGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="seasonalGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="extraGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                        <YAxis tickFormatter={formatShort} stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 500 }} />
                                        
                                        <Area type="monotone" dataKey="base_amount" name="base_amount" stroke="#10b981" strokeWidth={2} fill="url(#baseGrad)" stackId="1" />
                                        <Area type="monotone" dataKey="weekend_premium" name="weekend_premium" stroke="#3b82f6" strokeWidth={2} fill="url(#weekendGrad)" stackId="1" />
                                        <Area type="monotone" dataKey="seasonal_premium" name="seasonal_premium" stroke="#8b5cf6" strokeWidth={2} fill="url(#seasonalGrad)" stackId="1" />
                                        <Area type="monotone" dataKey="extra_bed_amount" name="extra_bed_amount" stroke="#f59e0b" strokeWidth={2} fill="url(#extraGrad)" stackId="1" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Sub reports: Booking Sources and Property Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Property performance breakdown table list */}
                    <Card className="lg:col-span-2 border-0 shadow-lg rounded-2xl">
                        <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100 p-5">
                            <CardTitle className="text-lg font-bold text-slate-800">Performa per Properti</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500">Summary performa properti pada periode ini</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                            <th className="text-left py-4 px-5">Nama Properti</th>
                                            <th className="text-right py-4 px-5">Total Revenue</th>
                                            <th className="text-center py-4 px-5">Bookings</th>
                                            <th className="text-center py-4 px-5">Okupansi</th>
                                            <th className="text-right py-4 px-5">ADR</th>
                                            <th className="text-right py-4 px-5">RevPAR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                                        {data.propertyPerformance.map((p) => (
                                            <tr 
                                                key={p.id} 
                                                onClick={() => {
                                                    setSelectedProperty(p.id.toString());
                                                    handleFilterChange({ property_id: p.id.toString() });
                                                }}
                                                className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                                                    selectedProperty === p.id.toString() ? 'bg-indigo-50/40 hover:bg-indigo-50/60 font-semibold' : ''
                                                }`}
                                            >
                                                <td className="py-4 px-5 font-bold text-slate-800 flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                                    {p.name}
                                                </td>
                                                <td className="text-right py-4 px-5 text-emerald-600 font-bold">{formatCurrency(p.total_revenue)}</td>
                                                <td className="text-center py-4 px-5"><Badge variant="secondary">{p.total_bookings} booking</Badge></td>
                                                <td className="text-center py-4 px-5">{p.occupancy_rate}%</td>
                                                <td className="text-right py-4 px-5 text-slate-600">{formatShort(p.adr)}</td>
                                                <td className="text-right py-4 px-5 text-slate-600">{formatShort(p.revpar)}</td>
                                            </tr>
                                        ))}
                                        {data.propertyPerformance.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">Tidak ada data performa properti</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Booking Attribution Sources */}
                    <Card className="border-0 shadow-lg rounded-2xl">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                            <CardTitle className="text-lg font-bold text-slate-800">Sumber Booking</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500">Distribusi booking berdasarkan channel</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            {data.bookingSources.map((source) => (
                                <div key={source.source} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                        <span className="capitalize">{source.source.replace('_', '.')}</span>
                                        <span className="text-slate-500">{source.count} Bookings ({source.percentage}%)</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Progress value={source.percentage} className="h-2 flex-1" />
                                        <span className="text-xs font-semibold text-emerald-600 min-w-[70px] text-right">{formatShort(source.revenue)}</span>
                                    </div>
                                </div>
                            ))}
                            {data.bookingSources.length === 0 && (
                                <div className="text-center py-10 text-slate-400 font-medium">Tidak ada data channel booking</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Tabular detailed breakdown section */}
                <Card id="rincian-harian" className="border-0 shadow-lg rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                                    Rincian Pendapatan Harian per Properti & Tanggal
                                </CardTitle>
                                <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                                    Audit rinci per booking-day untuk mencocokkan breakdown tarif dasar, weekend, seasonal, dan extra bed.
                                </CardDescription>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                {/* Search Input */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Cari properti, booking, tamu..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium w-full sm:w-[220px] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
                                        <th className="text-left py-3.5 px-5 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('date')}>
                                            Tanggal <ArrowUpDown className="inline-block h-3.5 w-3.5 ml-1" />
                                        </th>
                                        <th className="text-left py-3.5 px-5 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('property_name')}>
                                            Properti <ArrowUpDown className="inline-block h-3.5 w-3.5 ml-1" />
                                        </th>
                                        <th className="text-left py-3.5 px-5">Ref Booking</th>
                                        <th className="text-left py-3.5 px-5">Tamu</th>
                                        <th className="text-right py-3.5 px-5">Dasar (Base)</th>
                                        <th className="text-right py-3.5 px-5">Weekend</th>
                                        <th className="text-right py-3.5 px-5">Musiman (Seasonal)</th>
                                        <th className="text-right py-3.5 px-5">Extra Bed</th>
                                        <th className="text-right py-3.5 px-5">Layanan Extra</th>
                                        <th className="text-right py-3.5 px-5 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('amount')}>
                                            Total <ArrowUpDown className="inline-block h-3.5 w-3.5 ml-1" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                                    {paginatedBreakdown.map((item, idx) => (
                                        <tr key={`${item.date}-${item.booking_number}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3.5 px-5 font-bold text-slate-800">{item.date}</td>
                                            <td className="py-3.5 px-5 font-semibold">{item.property_name}</td>
                                            <td className="py-3.5 px-5">
                                                <Link 
                                                    href={`/admin/bookings/${item.booking_number}`}
                                                    className="text-indigo-600 hover:text-indigo-800 hover:underline font-bold"
                                                >
                                                    {item.booking_number}
                                                </Link>
                                            </td>
                                            <td className="py-3.5 px-5 text-slate-700 font-bold">{item.guest_name}</td>
                                            <td className="text-right py-3.5 px-5">{formatCurrency(item.base_amount)}</td>
                                            <td className="text-right py-3.5 px-5 text-blue-600 font-semibold">{item.weekend_premium > 0 ? formatCurrency(item.weekend_premium) : '-'}</td>
                                            <td className="text-right py-3.5 px-5 text-purple-600 font-semibold">{item.seasonal_premium > 0 ? formatCurrency(item.seasonal_premium) : '-'}</td>
                                            <td className="text-right py-3.5 px-5 text-amber-600">{item.extra_bed_amount > 0 ? formatCurrency(item.extra_bed_amount) : '-'}</td>
                                            <td className="text-right py-3.5 px-5 text-indigo-600 font-semibold">{item.extra_services_amount > 0 ? formatCurrency(item.extra_services_amount) : '-'}</td>
                                            <td className="text-right py-3.5 px-5 text-emerald-600 font-bold text-sm">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                    {paginatedBreakdown.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="text-center py-10 text-slate-400 font-bold text-sm">Tidak ada rincian data harian</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination footer */}
                        {totalPages > 1 && (
                            <div className="border-t border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-semibold text-slate-500">
                                <div>
                                    Menampilkan {Math.min(filteredBreakdown.length, (currentPage - 1) * itemsPerPage + 1)} sampai{' '}
                                    {Math.min(filteredBreakdown.length, currentPage * itemsPerPage)} dari {filteredBreakdown.length} data
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 border-slate-200"
                                    >
                                        Sebelumnya
                                    </Button>
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                                            return (
                                                <Button
                                                    key={page}
                                                    variant={currentPage === page ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-8 h-8 ${currentPage === page ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border-slate-200'}`}
                                                >
                                                    {page}
                                                </Button>
                                            );
                                        }
                                        if (page === 2 || page === totalPages - 1) {
                                            return <span key={page} className="px-1 text-slate-300">...</span>;
                                        }
                                        return null;
                                    })}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 border-slate-200"
                                    >
                                        Selanjutnya
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Overall Bookings Details */}
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-indigo-600" />
                            Daftar Booking Terkait Pada Periode
                        </CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-500">
                            Semua data booking yang terkait dengan rincian pendapatan harian dalam periode terpilih
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                        <th className="text-left py-4 px-5">Ref Booking</th>
                                        <th className="text-left py-4 px-5">Nama Properti</th>
                                        <th className="text-left py-4 px-5">Nama Tamu</th>
                                        <th className="text-center py-4 px-5">Check In - Out</th>
                                        <th className="text-center py-4 px-5">Durasi</th>
                                        <th className="text-right py-4 px-5">Tarif Kamar</th>
                                        <th className="text-right py-4 px-5">Layanan Extra</th>
                                        <th className="text-right py-4 px-5 font-extrabold text-slate-800">Total Pembayaran</th>
                                        <th className="text-center py-4 px-5">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                                    {data.overallBookings.map((b) => (
                                        <tr key={b.booking_number} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-5">
                                                <Link 
                                                    href={`/admin/bookings/${b.booking_number}`}
                                                    className="text-indigo-600 hover:text-indigo-800 hover:underline font-bold"
                                                >
                                                    {b.booking_number}
                                                </Link>
                                            </td>
                                            <td className="py-4 px-5 font-semibold text-slate-800">{b.property_name}</td>
                                            <td className="py-4 px-5">{b.guest_name}</td>
                                            <td className="text-center py-4 px-5 text-slate-600 font-semibold">{b.check_in} s/d {b.check_out}</td>
                                            <td className="text-center py-4 px-5"><Badge variant="secondary">{b.nights} malam</Badge></td>
                                            <td className="text-right py-4 px-5 text-slate-600">{formatCurrency(b.room_charge)}</td>
                                            <td className="text-right py-4 px-5 text-indigo-600">{b.extra_services > 0 ? formatCurrency(b.extra_services) : '-'}</td>
                                            <td className="text-right py-4 px-5 font-bold text-slate-800">{formatCurrency(b.total_amount)}</td>
                                            <td className="text-center py-4 px-5">
                                                <Badge className={`${getStatusColor(b.booking_status)} text-white hover:${getStatusColor(b.booking_status)} border-none font-bold text-xs uppercase px-2.5 py-0.5`}>
                                                    {b.booking_status.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {data.overallBookings.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="text-center py-10 text-slate-400 font-bold">Tidak ada data booking pada periode ini</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
