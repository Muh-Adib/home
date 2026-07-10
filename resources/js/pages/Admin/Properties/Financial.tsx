import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type PageProps } from '@/types';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    DollarSign,
    BarChart3,
    Target,
    Percent,
    Home,
    Calendar,
    Users,
    Activity,
    CheckCircle,
    AlertCircle,
    Building2,
    PieChartIcon,
    Minus,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
    if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
    if (Math.abs(n) >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return `Rp ${n}`;
};

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

const COLORS_REVENUE = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
const COLORS_EXPENSE = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#60a5fa', '#c084fc', '#f472b6'];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Property {
    id: number;
    name: string;
    slug: string;
    address?: string;
    status: string;
    base_rate: number;
    ownership_model: string;
    owner_split_pct: number;
    investor_split_pct: number;
    initial_build_capital: number;
    lease_capital: number;
    monthly_rent_cost: number;
    monthly_mortgage_cost: number;
    mortgage_interest_monthly: number;
    owner?: { id: number; name: string };
}

interface MonthlyTrend {
    month: string;
    month_label: string;
    revenue: number;
    expense: number;
    profit: number;
    occupancy: number;
    bookings: number;
}

interface FinancialData {
    period: { from: string; to: string; label: string };
    kpi: { revenue: number; expense: number; net_profit: number; roi: number };
    bep: {
        total_capital: number;
        initial_build_capital: number;
        lease_capital: number;
        cumulative_profit: number;
        bep_pct: number;
        avg_monthly_profit: number;
        remaining_months: number;
        months_since_start: number;
        all_time_income: number;
        all_time_expense: number;
        ownership_model: string;
        monthly_rent_cost: number;
        mortgage_interest_monthly: number;
    };
    monthly_trend: MonthlyTrend[];
    expense_breakdown: { category: string; label: string; amount: number; pct: number }[];
    revenue_breakdown: { source: string; label: string; amount: number; pct: number }[];
    booking_sources: { source: string; label: string; count: number; revenue: number; pct_count: number }[];
    owner_split: { owner_pct: number; investor_pct: number; owner_amount: number; investor_amount: number } | null;
    top_bookings: any[];
    occupancy_summary: { rate_pct: number; booked_nights: number; available_nights: number };
}

interface FinancialPageProps extends PageProps {
    property: Property;
    financial: FinancialData;
    period: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

const KpiCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    colorClass = 'text-slate-800',
    bgClass = 'bg-white',
    borderClass = 'border-l-blue-500',
}: {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ElementType;
    trend?: number;
    colorClass?: string;
    bgClass?: string;
    borderClass?: string;
}) => (
    <Card className={`border-0 border-l-4 ${borderClass} shadow-md ${bgClass} rounded-r-2xl`}>
        <CardContent className="p-5">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                    <p className={`text-xl font-black mt-1 ${colorClass} truncate`}>{value}</p>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                <div className="ml-3 p-2.5 rounded-xl bg-slate-50 shrink-0">
                    <Icon className={`h-5 w-5 ${colorClass}`} />
                </div>
            </div>
            {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-3 text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {fmtPct(trend)} vs periode sebelumnya
                </div>
            )}
        </CardContent>
    </Card>
);

const CustomTooltipCurrency = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-[160px]">
            <p className="font-bold text-slate-700 mb-2">{label}</p>
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-slate-500">{p.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{fmtShort(p.value)}</span>
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
    { value: '1m', label: 'Bulan Ini' },
    { value: '3m', label: '3 Bulan' },
    { value: '6m', label: '6 Bulan' },
    { value: '12m', label: '12 Bulan' },
    { value: 'ytd', label: 'YTD' },
    { value: 'all_time', label: 'All Time' },
];

export default function PropertyFinancial({ property, financial, period }: FinancialPageProps) {
    const { kpi, bep, monthly_trend, expense_breakdown, revenue_breakdown, booking_sources, owner_split, top_bookings, occupancy_summary } = financial;

    const [activePeriod, setActivePeriod] = useState(period);

    const breadcrumbs = [
        { title: 'Dashboard', href: '/admin/dashboard' },
        { title: 'Properti', href: '/admin/properties' },
        { title: property.name, href: `/admin/properties/${property.slug}` },
        { title: 'Dashboard Keuangan', href: '' },
    ];

    const handlePeriodChange = (p: string) => {
        setActivePeriod(p);
        router.get(`/admin/properties/${property.slug}/financial`, { period: p }, { preserveState: true, preserveScroll: true });
    };

    const bepProgress = Math.min(100, Math.max(0, bep.bep_pct));
    const bepReached = bep.bep_pct >= 100;

    const ownershipLabel: Record<string, string> = {
        rented: 'Sewa Properti',
        owned: 'Properti Milik Sendiri',
        partnership: 'Kemitraan / Partnership',
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`Dashboard Keuangan — ${property.name}`} />

            <div className="space-y-6">
                {/* ── HEADER ─────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" asChild className="shrink-0">
                            <Link href={`/admin/properties/${property.slug}`}>
                                <ArrowLeft className="h-4 w-4 mr-1.5" />
                                Kembali
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">{property.name}</h1>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Building2 className="h-3 w-3" />
                                {property.address}
                                <span className="mx-1">·</span>
                                <span className="font-medium text-blue-600">{ownershipLabel[property.ownership_model] ?? property.ownership_model}</span>
                            </p>
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                        {PERIOD_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handlePeriodChange(opt.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activePeriod === opt.value
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── PERIOD BADGE ───────────────────────────────────────── */}
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-semibold text-slate-600">Periode: {financial.period.label}</span>
                    <span className="text-xs text-slate-400">({financial.period.from} — {financial.period.to})</span>
                </div>

                {/* ── KPI CARDS ─────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        title="Total Pendapatan"
                        value={fmtShort(kpi.revenue)}
                        subtitle={fmt(kpi.revenue)}
                        icon={DollarSign}
                        colorClass="text-emerald-600"
                        borderClass="border-l-emerald-500"
                    />
                    <KpiCard
                        title="Total Pengeluaran"
                        value={fmtShort(kpi.expense)}
                        subtitle={fmt(kpi.expense)}
                        icon={TrendingDown}
                        colorClass="text-red-500"
                        borderClass="border-l-red-400"
                    />
                    <KpiCard
                        title={kpi.net_profit >= 0 ? 'Net Profit' : 'Net Loss'}
                        value={fmtShort(Math.abs(kpi.net_profit))}
                        subtitle={fmt(kpi.net_profit)}
                        icon={kpi.net_profit >= 0 ? TrendingUp : TrendingDown}
                        colorClass={kpi.net_profit >= 0 ? 'text-blue-600' : 'text-red-500'}
                        borderClass={kpi.net_profit >= 0 ? 'border-l-blue-500' : 'border-l-red-400'}
                    />
                    <KpiCard
                        title="ROI (All Time)"
                        value={`${bep.bep_pct.toFixed(1)}%`}
                        subtitle={`Modal: ${fmtShort(bep.total_capital)}`}
                        icon={Percent}
                        colorClass={bep.bep_pct >= 0 ? 'text-indigo-600' : 'text-red-500'}
                        borderClass={bep.bep_pct >= 0 ? 'border-l-indigo-500' : 'border-l-red-400'}
                    />
                </div>

                {/* ── BEP PROGRESS CARD ─────────────────────────────────── */}
                <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white overflow-hidden">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-white text-base">
                                    <Target className="h-5 w-5 text-amber-400" />
                                    Break-Even Point (BEP) — Pemulihan Modal
                                </CardTitle>
                                <p className="text-xs text-slate-400 mt-1">
                                    Progress total profit kumulatif dibandingkan total modal yang diinvestasikan
                                </p>
                            </div>
                            <Badge className={`${bepReached ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'} font-bold text-xs px-3 py-1.5 shrink-0`}>
                                {bepReached ? '✅ BEP TERCAPAI' : `⏳ ${bep.bep_pct.toFixed(1)}% dari BEP`}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Progress Bar */}
                        <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-2">
                                <span>0%</span>
                                <span className="text-amber-400 font-bold">{bep.bep_pct.toFixed(1)}% tercapai</span>
                                <span>100% (BEP)</span>
                            </div>
                            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${bepReached ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                                    style={{ width: `${bepProgress}%` }}
                                />
                            </div>
                        </div>

                        {/* BEP Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[
                                { label: 'Modal Build/Setup', value: fmtShort(bep.initial_build_capital), color: 'text-slate-300' },
                                { label: 'Modal Sewa/Lease', value: fmtShort(bep.lease_capital), color: 'text-slate-300' },
                                { label: 'Total Modal', value: fmtShort(bep.total_capital), color: 'text-white font-black' },
                                { label: 'Profit Kumulatif', value: fmtShort(bep.cumulative_profit), color: bep.cumulative_profit >= 0 ? 'text-emerald-400' : 'text-red-400' },
                                { label: 'Rata-rata/Bulan', value: fmtShort(bep.avg_monthly_profit), color: bep.avg_monthly_profit >= 0 ? 'text-blue-400' : 'text-red-400' },
                            ].map((item, i) => (
                                <div key={i} className="bg-slate-700/50 rounded-xl p-3 text-center">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase">{item.label}</p>
                                    <p className={`text-sm font-black mt-1 ${item.color}`}>{item.value}</p>
                                </div>
                            ))}
                        </div>

                        {!bepReached && bep.remaining_months > 0 && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                                <Activity className="h-5 w-5 text-amber-400 shrink-0" />
                                <p className="text-xs text-amber-300">
                                    Estimasi BEP tercapai dalam <strong className="text-amber-400">{bep.remaining_months} bulan</strong> lagi
                                    (sekitar {Math.ceil(bep.remaining_months / 12)} tahun) berdasarkan rata-rata profit bulanan saat ini.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── REVENUE VS EXPENSE TREND ─────────────────────────── */}
                <Card className="border-0 shadow-md bg-white">
                    <CardHeader className="border-b border-slate-100 pb-3">
                        <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            Tren Pendapatan & Pengeluaran
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthly_trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month_label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={fmtShort} width={70} />
                                    <Tooltip content={<CustomTooltipCurrency />} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRevenue)" dot={{ r: 3 }} />
                                    <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#f87171" strokeWidth={2} fill="url(#colorExpense)" dot={{ r: 3 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* ── OCCUPANCY & PROFIT TREND ─────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Occupancy Bar Chart */}
                    <Card className="border-0 shadow-md bg-white">
                        <CardHeader className="border-b border-slate-100 pb-3">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                <Home className="h-5 w-5 text-emerald-600" />
                                Tingkat Hunian per Bulan
                            </CardTitle>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="text-slate-500">Periode ini:</span>
                                <span className="font-bold text-emerald-600">{occupancy_summary.rate_pct}%</span>
                                <span className="text-slate-400 text-xs">({occupancy_summary.booked_nights}/{occupancy_summary.available_nights} malam)</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="h-60 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthly_trend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month_label" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" domain={[0, 100]} />
                                        <Tooltip formatter={(v: any) => [`${v}%`, 'Occupancy']} />
                                        <Bar dataKey="occupancy" name="Occupancy" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Monthly Profit Bars */}
                    <Card className="border-0 shadow-md bg-white">
                        <CardHeader className="border-b border-slate-100 pb-3">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                <TrendingUp className="h-5 w-5 text-indigo-600" />
                                Profit / Loss per Bulan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="h-60 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthly_trend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month_label" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={fmtShort} width={70} />
                                        <Tooltip content={<CustomTooltipCurrency />} />
                                        <Bar dataKey="profit" name="Profit/Loss" radius={[4, 4, 0, 0]}>
                                            {monthly_trend.map((entry, index) => (
                                                <Cell key={index} fill={entry.profit >= 0 ? '#6366f1' : '#f87171'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── BREAKDOWN PENDAPATAN & PENGELUARAN ───────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Revenue Breakdown */}
                    <Card className="border-0 shadow-md bg-white">
                        <CardHeader className="border-b border-slate-100 pb-3">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                <PieChartIcon className="h-5 w-5 text-blue-600" />
                                Breakdown Sumber Pendapatan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {revenue_breakdown.length > 0 ? (
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="h-48 w-full sm:w-48 shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={revenue_breakdown} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                                                    {revenue_breakdown.map((_, i) => (
                                                        <Cell key={i} fill={COLORS_REVENUE[i % COLORS_REVENUE.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v: any) => fmtShort(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-2 w-full">
                                        {revenue_breakdown.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS_REVENUE[i % COLORS_REVENUE.length] }} />
                                                    <span className="text-slate-600 truncate">{item.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    <span className="font-bold text-slate-800">{fmtShort(item.amount)}</span>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{item.pct}%</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                    <Minus className="h-8 w-8 mb-2" />
                                    <p className="text-sm">Tidak ada data pendapatan untuk periode ini</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Expense Breakdown */}
                    <Card className="border-0 shadow-md bg-white">
                        <CardHeader className="border-b border-slate-100 pb-3">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                <PieChartIcon className="h-5 w-5 text-red-500" />
                                Breakdown Kategori Pengeluaran
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {expense_breakdown.length > 0 ? (
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="h-48 w-full sm:w-48 shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={expense_breakdown} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                                                    {expense_breakdown.map((_, i) => (
                                                        <Cell key={i} fill={COLORS_EXPENSE[i % COLORS_EXPENSE.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v: any) => fmtShort(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-2 w-full">
                                        {expense_breakdown.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS_EXPENSE[i % COLORS_EXPENSE.length] }} />
                                                    <span className="text-slate-600 truncate">{item.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    <span className="font-bold text-slate-800">{fmtShort(item.amount)}</span>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{item.pct}%</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                    <Minus className="h-8 w-8 mb-2" />
                                    <p className="text-sm">Tidak ada data pengeluaran untuk periode ini</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── BOOKING SOURCE & OWNER SPLIT ─────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Booking Source */}
                    <Card className="border-0 shadow-md bg-white">
                        <CardHeader className="border-b border-slate-100 pb-3">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                <Users className="h-5 w-5 text-purple-600" />
                                Sumber Booking
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            {booking_sources.length > 0 ? booking_sources.map((src, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-slate-700">{src.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">{src.count} booking</span>
                                            <span className="font-bold text-slate-800">{fmtShort(src.revenue)}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-purple-500 transition-all"
                                            style={{ width: `${src.pct_count}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-right">{src.pct_count}% dari total booking</p>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                                    <Minus className="h-8 w-8 mb-2" />
                                    <p className="text-sm">Tidak ada data booking untuk periode ini</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Owner Split / Kepemilikan Info */}
                    <Card className="border-0 shadow-md bg-white">
                        <CardHeader className="border-b border-slate-100 pb-3">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                <Percent className="h-5 w-5 text-amber-600" />
                                Info Kepemilikan & Bagi Hasil
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {/* Ownership model badge */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-sm text-slate-600">Model Kepemilikan</span>
                                <Badge className="bg-slate-700 text-white hover:bg-slate-700 text-xs">
                                    {ownershipLabel[property.ownership_model] ?? property.ownership_model}
                                </Badge>
                            </div>

                            {property.ownership_model === 'rented' && (
                                <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl space-y-2">
                                    <p className="text-xs font-bold text-orange-700 uppercase">Biaya Sewa Bulanan</p>
                                    <p className="text-lg font-black text-orange-800">{fmt(property.monthly_rent_cost)}/bulan</p>
                                    <p className="text-xs text-orange-600">Biaya sewa sudah termasuk dalam kalkulasi pengeluaran</p>
                                </div>
                            )}

                            {property.ownership_model === 'owned' && (
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                                    <p className="text-xs font-bold text-blue-700 uppercase">Bunga KPR Bulanan</p>
                                    <p className="text-lg font-black text-blue-800">{fmt(property.mortgage_interest_monthly)}/bulan</p>
                                    <p className="text-xs text-blue-600">Biaya bunga KPR sudah termasuk dalam kalkulasi pengeluaran</p>
                                </div>
                            )}

                            {owner_split ? (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Bagi Hasil (dari Net Profit Periode Ini)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                                            <p className="text-xs font-bold text-blue-600">Owner ({property.owner_split_pct}%)</p>
                                            <p className="text-base font-black text-blue-800 mt-1">{fmtShort(owner_split.owner_amount)}</p>
                                            <p className="text-[10px] text-blue-500">{property.owner?.name}</p>
                                        </div>
                                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                                            <p className="text-xs font-bold text-indigo-600">Investor ({property.investor_split_pct}%)</p>
                                            <p className="text-base font-black text-indigo-800 mt-1">{fmtShort(owner_split.investor_amount)}</p>
                                        </div>
                                    </div>
                                    {kpi.net_profit < 0 && (
                                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex items-center gap-1.5">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            Bagi hasil tidak berlaku karena net profit negatif pada periode ini.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic text-center py-2">
                                    Bagi hasil hanya berlaku untuk model kepemilikan Kemitraan (Partnership).
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── MONTHLY SUMMARY TABLE ────────────────────────────── */}
                <Card className="border-0 shadow-md bg-white">
                    <CardHeader className="border-b border-slate-100 pb-3">
                        <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                            <Calendar className="h-5 w-5 text-teal-600" />
                            Ringkasan Keuangan Bulanan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {['Bulan', 'Booking', 'Pendapatan', 'Pengeluaran', 'Profit/Loss', 'Occupancy'].map((h) => (
                                        <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase pb-2 pr-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {monthly_trend.length > 0 ? monthly_trend.map((row, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                                        <td className="py-2.5 pr-4 font-semibold text-slate-700">{row.month_label}</td>
                                        <td className="py-2.5 pr-4 text-slate-600">{row.bookings}</td>
                                        <td className="py-2.5 pr-4 text-emerald-600 font-medium">{fmtShort(row.revenue)}</td>
                                        <td className="py-2.5 pr-4 text-red-500 font-medium">{fmtShort(row.expense)}</td>
                                        <td className="py-2.5 pr-4">
                                            <span className={`font-bold ${row.profit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                                {row.profit >= 0 ? '+' : ''}{fmtShort(row.profit)}
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.occupancy}%` }} />
                                                </div>
                                                <span className="text-slate-600">{row.occupancy}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-slate-400">Tidak ada data untuk periode ini</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* ── TOP BOOKINGS ─────────────────────────────────────── */}
                {top_bookings.length > 0 && (
                    <Card className="border-0 shadow-md bg-white">
                        <CardHeader className="border-b border-slate-100 pb-3">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Top 10 Booking Terbesar
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 overflow-x-auto">
                            <table className="w-full text-sm min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        {['Booking', 'Tamu', 'Check-in', 'Check-out', 'Malam', 'Nilai', 'Platform', 'Status'].map((h) => (
                                            <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase pb-2 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {top_bookings.map((bk, i) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                                            <td className="py-2.5 pr-4">
                                                <Link href={`/admin/bookings/${bk.booking_number}`} className="font-mono text-xs text-blue-600 hover:underline">
                                                    {bk.booking_number}
                                                </Link>
                                            </td>
                                            <td className="py-2.5 pr-4 font-medium text-slate-700">{bk.guest_name}</td>
                                            <td className="py-2.5 pr-4 text-slate-500 text-xs">{bk.check_in}</td>
                                            <td className="py-2.5 pr-4 text-slate-500 text-xs">{bk.check_out}</td>
                                            <td className="py-2.5 pr-4 text-slate-600">{bk.nights}m</td>
                                            <td className="py-2.5 pr-4 font-bold text-emerald-600">{fmtShort(bk.total_amount)}</td>
                                            <td className="py-2.5 pr-4">
                                                <Badge variant="outline" className="text-[10px] capitalize">{bk.source || 'direct'}</Badge>
                                            </td>
                                            <td className="py-2.5 pr-4">
                                                <Badge className={`text-[10px] capitalize ${bk.booking_status === 'checked_out' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                                                        bk.booking_status === 'checked_in' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                                                            'bg-slate-100 text-slate-700 hover:bg-slate-100'
                                                    }`}>
                                                    {bk.booking_status.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
}
