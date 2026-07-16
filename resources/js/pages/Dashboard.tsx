import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    MapPin,
    Eye,
    Building2,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Users,
    Percent,
    BarChart3,
    ArrowUpRight,
    Share2,
    Wrench,
    Clock,
    Activity,
    Globe,
    FilePenLine,
    ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/layouts/admin-layout';
import { BreadcrumbItem, PageProps, User } from '@/types';
import { ChartRevenue } from '@/components/charts/ChartRevenue';
import { ChartBookingTrends } from '@/components/charts/ChartBookingTrends';
import { PropertiesMap } from '@/components/ui/properties-map';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { TodayAgenda } from '@/components/dashboard/TodayAgenda';
import { RevenueBreakdownCard } from '@/components/dashboard/RevenueBreakdownCard';
import { DashboardData, PropertyPerformance } from '@/types/dashboard';

interface DashboardProps extends DashboardData {
    contentCreatorData?: {
        site_traffic: {
            total: number;
            articles: number;
            seo_pages: number;
        };
        newly_published_articles: Array<{
            id: number;
            title: string;
            slug: string;
            published_at: string;
            view_count: number;
            author?: { name: string };
        }>;
        content_planner: Array<{
            id: number;
            uuid: string;
            title: string;
            description: string;
            status: string;
            planned_publish_date: string;
            priority: number;
        }>;
        scheduled_articles: Array<{
            id: number;
            title: string;
            slug: string;
            scheduled_at: string;
        }>;
    } | null;
    adminRoleData?: {
        site_traffic: {
            total: number;
            articles: number;
            seo_pages: number;
        };
        damage_reports: Array<{
            id: number;
            uuid: string;
            title: string;
            description: string;
            status: string;
            created_at: string;
            property: { name: string };
            reporter: { name: string };
        }>;
        lost_and_founds: Array<{
            id: number;
            item_name: string;
            description: string;
            found_date: string;
            status: string;
            property: { name: string };
            booking?: { booking_number: string };
        }>;
    } | null;
}

// KPI Card Component
function KPICard({ 
    title, 
    value, 
    change, 
    trend, 
    icon: Icon, 
    prefix = '',
    suffix = '',
    color = 'emerald'
}: { 
    title: string; 
    value: number | string; 
    change?: number; 
    trend?: 'up' | 'down';
    icon: any;
    prefix?: string;
    suffix?: string;
    color?: string;
}) {
    const formatValue = (val: number | string) => {
        const numVal = typeof val === 'string' ? parseFloat(val) : val;
        
        if (!isNaN(numVal) && val !== null && val !== '') {
            if (prefix === 'Rp') {
                return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(numVal);
            }
            if (suffix === '%') {
                return new Intl.NumberFormat('id-ID', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                }).format(numVal);
            }
            return new Intl.NumberFormat('id-ID', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(numVal);
        }
        return val;
    };

    const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600', icon: 'bg-emerald-100 dark:bg-emerald-900' },
        blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600', icon: 'bg-blue-100 dark:bg-blue-900' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600', icon: 'bg-purple-100 dark:bg-purple-900' },
        orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-600', icon: 'bg-orange-100 dark:bg-orange-900' },
    };

    const colors = colorClasses[color] || colorClasses.emerald;

    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                            {title}
                        </p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                            {formatValue(value)}{suffix}
                        </p>
                        {change !== undefined && (
                            <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                {trend === 'up' ? (
                                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                                <span>{Math.abs(change)}%</span>
                                <span className="text-muted-foreground font-normal">vs last month</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-2 sm:p-3 rounded-xl ${colors.icon}`}>
                        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${colors.text}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Property Performance Card Component
function PropertyPerformanceCard({ data }: { data: PropertyPerformance[] }) {
    const formatCurrency = (amount: number) => {
        if (amount >= 1000000) {
            return `Rp ${(amount / 1000000).toFixed(1)}M`;
        }
        if (amount >= 1000) {
            return `Rp ${(amount / 1000).toFixed(0)}K`;
        }
        return `Rp ${amount}`;
    };

    const maxRevenue = Math.max(...data.map(p => p.total_revenue || 0), 1);

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Property Performance
                        </CardTitle>
                        <CardDescription>This month's top performers</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/admin/reports">
                            View All
                            <ArrowUpRight className="h-4 w-4 ml-1" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {data && data.length > 0 ? (
                    data.map((property, index) => (
                        <div key={property.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        index === 0 ? 'bg-amber-100 text-amber-700' :
                                        index === 1 ? 'bg-gray-100 text-gray-700' :
                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                        'bg-blue-50 text-blue-600'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <span className="font-medium text-sm truncate">{property.name}</span>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                    <p className="font-semibold text-sm">{formatCurrency(property.total_revenue || 0)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {property.total_bookings} bookings
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Progress 
                                    value={((property.total_revenue || 0) / maxRevenue) * 100} 
                                    className="h-2 flex-1" 
                                />
                                <Badge variant="outline" className="text-xs">
                                    {property.occupancy_rate}%
                                </Badge>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No property data available</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function Dashboard({
    kpis,
    recentActivity,
    todaysAgenda,
    quickStats,
    revenueChart,
    revenueBreakdown,
    bookingTrends,
    propertyPerformance,
    upcomingBookings,
    contentCreatorData,
    adminRoleData
}: DashboardProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/dashboard' },
        { title: 'Dashboard' },
    ];

    const getRoleDisplayName = (role: User['role']) => {
        const roleNames: Record<User['role'], string> = {
            super_admin: 'Super Administrator',
            admin: 'Administrator',
            property_owner: 'Property Owner',
            property_manager: 'Property Manager',
            front_desk: 'Front Desk',
            finance: 'Finance',
            housekeeping: 'Housekeeping',
            guest: 'Guest',
            content_creator: 'Content Creator',
        };
        return roleNames[role] || role;
    };

    const isStandardAdminRole = ['super_admin', 'property_manager', 'property_owner', 'finance'].includes(auth.user.role);
    const isCustomAdminRole = auth.user.role === 'admin';
    const isContentCreator = auth.user.role === 'content_creator';
    const isGuestRole = auth.user.role === 'guest';

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Dashboard">
            <Head title="Dashboard - Homsjogja" />

            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Welcome back, {auth.user.name}!
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                {getRoleDisplayName(auth.user.role)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                {new Date().toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* CONTENT CREATOR VIEW */}
                {isContentCreator && contentCreatorData && (
                    <div className="space-y-6">
                        {/* Traffic KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 dark:from-indigo-950/20 dark:to-blue-950/20">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total Traffic Situs</p>
                                        <h3 className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                                            {new Intl.NumberFormat('id-ID').format(contentCreatorData.site_traffic.total)}
                                        </h3>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Activity className="h-6 w-6" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 dark:from-emerald-950/20 dark:to-teal-950/20">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Views Artikel</p>
                                        <h3 className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                                            {new Intl.NumberFormat('id-ID').format(contentCreatorData.site_traffic.articles)}
                                        </h3>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <FilePenLine className="h-6 w-6" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 dark:from-amber-950/20 dark:to-orange-950/20">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Views Halaman SEO</p>
                                        <h3 className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                                            {new Intl.NumberFormat('id-ID').format(contentCreatorData.site_traffic.seo_pages)}
                                        </h3>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <Globe className="h-6 w-6" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Newly Published Articles */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Artikel Baru di Publish</CardTitle>
                                <CardDescription>Daftar artikel yang baru saja diterbitkan di situs</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {contentCreatorData.newly_published_articles.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-4 text-center">Belum ada artikel yang dipublish.</p>
                                    ) : (
                                        contentCreatorData.newly_published_articles.map((article) => (
                                            <div key={article.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                                <div className="space-y-1 pr-4">
                                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm md:text-base">{article.title}</h4>
                                                    <p className="text-xs text-slate-500">
                                                        Dipublish oleh: {article.author?.name || 'Sistem'} • {new Date(article.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • {article.view_count} views
                                                    </p>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/articles/${article.slug}`;
                                                        navigator.clipboard.writeText(url);
                                                        toast.success('Link artikel berhasil disalin!');
                                                    }}
                                                    className="flex items-center gap-1.5 shrink-0"
                                                >
                                                    <Share2 className="h-3.5 w-3.5" /> Share
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Content Planner & Schedule Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Content Planner */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Konten Planner</CardTitle>
                                    <CardDescription>Rencana publikasi konten mendatang</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {contentCreatorData.content_planner.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada rencana konten aktif.</p>
                                        ) : (
                                            contentCreatorData.content_planner.map((plan) => (
                                                <div key={plan.id} className="p-3 border rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-900/50 hover:shadow-sm transition-shadow">
                                                    <div className="flex items-start justify-between">
                                                        <h5 className="font-medium text-sm text-slate-900 dark:text-slate-100">{plan.title}</h5>
                                                        <Badge variant="secondary" className="capitalize text-[10px]">
                                                            {plan.status.replace('_', ' ')}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-2">{plan.description || 'Tidak ada deskripsi.'}</p>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                        <span>Priority: {plan.priority}</span>
                                                        <span>Target: {plan.planned_publish_date ? new Date(plan.planned_publish_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Scheduled Articles */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Schedule Artikel</CardTitle>
                                    <CardDescription>Artikel yang dijadwalkan untuk rilis otomatis</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {contentCreatorData.scheduled_articles.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada artikel yang dijadwalkan.</p>
                                        ) : (
                                            contentCreatorData.scheduled_articles.map((article) => (
                                                <div key={article.id} className="flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                    <div className="space-y-1">
                                                        <h5 className="font-medium text-sm text-slate-900 dark:text-slate-100">{article.title}</h5>
                                                        <p className="text-[10px] text-slate-400">
                                                            Rilis pada: {new Date(article.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <Clock className="h-4 w-4 text-amber-500" />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ADMINISTRATOR VIEW */}
                {isCustomAdminRole && adminRoleData && (
                    <div className="space-y-6">
                        {/* Administrator KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 dark:from-indigo-950/20 dark:to-blue-950/20">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total Traffic Situs</p>
                                        <h3 className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                                            {new Intl.NumberFormat('id-ID').format(adminRoleData.site_traffic.total)}
                                        </h3>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Activity className="h-6 w-6" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100 dark:from-purple-950/20 dark:to-indigo-950/20">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Okupansi Bulan Ini</p>
                                        <h3 className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                                            {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(kpis?.occupancy?.value || 0)}%
                                        </h3>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                        <Percent className="h-6 w-6" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100 dark:from-blue-950/20 dark:to-cyan-950/20">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Jumlah Properti</p>
                                        <h3 className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                                            {quickStats?.total_properties || 0}
                                        </h3>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Property Location Map */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-indigo-500" /> Lokasi Properti
                                </CardTitle>
                                <CardDescription>Peta interaktif lokasi unit properti Anda</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PropertiesMap height="400px" />
                            </CardContent>
                        </Card>

                        {/* Damage Reports & Lost and Found Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Damage Reports (Laporan Kerusakan) */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Wrench className="h-5 w-5 text-rose-500" /> Laporan Kerusakan
                                    </CardTitle>
                                    <CardDescription>Daftar laporan kerusakan unit terbaru</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {adminRoleData.damage_reports.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada laporan kerusakan aktif.</p>
                                        ) : (
                                            adminRoleData.damage_reports.map((report) => (
                                                <div key={report.id} className="p-3 border rounded-xl space-y-1 bg-slate-50/50 dark:bg-slate-900/50 hover:shadow-sm transition-shadow">
                                                    <div className="flex items-start justify-between">
                                                        <h5 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{report.title}</h5>
                                                        <Badge variant="secondary" className="capitalize text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                                            {report.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{report.description}</p>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                                        <span>Properti: {report.property?.name || '-'}</span>
                                                        <span>Dilaporkan oleh: {report.reporter?.name || '-'}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Lost and Found (Laporan Barang Tertinggal) */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ClipboardList className="h-5 w-5 text-amber-500" /> Barang Tertinggal (Lost & Found)
                                    </CardTitle>
                                    <CardDescription>Daftar penemuan barang tertinggal terbaru</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {adminRoleData.lost_and_founds.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada laporan penemuan barang.</p>
                                        ) : (
                                            adminRoleData.lost_and_founds.map((item) => (
                                                <div key={item.id} className="p-3 border rounded-xl space-y-1 bg-slate-50/50 dark:bg-slate-900/50 hover:shadow-sm transition-shadow">
                                                    <div className="flex items-start justify-between">
                                                        <h5 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{item.item_name}</h5>
                                                        <Badge variant="secondary" className="capitalize text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                                            {item.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{item.description || 'Tidak ada deskripsi.'}</p>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                                        <span>Properti: {item.property?.name || '-'}</span>
                                                        <span>Tanggal: {item.found_date ? new Date(item.found_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* STANDARD ADMIN VIEW */}
                {isStandardAdminRole && kpis && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <KPICard
                            title="Monthly Revenue"
                            value={kpis.revenue?.value || 0}
                            change={kpis.revenue?.change}
                            trend={kpis.revenue?.trend}
                            icon={DollarSign}
                            prefix="Rp"
                            color="emerald"
                        />
                        <KPICard
                            title="Total Bookings"
                            value={kpis.bookings?.value || 0}
                            change={kpis.bookings?.change}
                            trend={kpis.bookings?.trend}
                            icon={Calendar}
                            color="blue"
                        />
                        <KPICard
                            title="Occupancy Rate"
                            value={kpis.occupancy?.value || 0}
                            change={kpis.occupancy?.change}
                            trend={kpis.occupancy?.trend}
                            icon={Percent}
                            suffix="%"
                            color="purple"
                        />
                        <KPICard
                            title="Pending Actions"
                            value={kpis.pending_actions?.value || 0}
                            icon={Users}
                            color="orange"
                        />
                    </div>
                )}

                {/* Quick Stats for non-admin standard roles (like housekeeping / front desk when needed) */}
                {!isStandardAdminRole && !isCustomAdminRole && !isContentCreator && !isGuestRole && quickStats && (
                    <div className="grid grid-cols-2 gap-3">
                        <KPICard
                            title="Active Properties"
                            value={quickStats.active_properties || 0}
                            icon={Building2}
                            color="blue"
                        />
                        <KPICard
                            title="Upcoming Arrivals"
                            value={quickStats.upcoming_arrivals || 0}
                            icon={Calendar}
                            color="emerald"
                        />
                    </div>
                )}

                {/* Main Content Grid - Standard Admin View */}
                {isStandardAdminRole && (
                    <>
                        {/* Charts Row - Revenue & Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                            <div className="lg:col-span-2">
                                <Card className="h-[350px] sm:h-[400px]">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base sm:text-lg">Revenue Trend</CardTitle>
                                        <CardDescription>Last 12 months</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[280px] sm:h-[320px]">
                                        <ChartRevenue data={revenueChart || []} />
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="lg:col-span-1">
                                <RevenueBreakdownCard data={revenueBreakdown} />
                            </div>
                        </div>

                        {/* Second Row - Bookings & Property Performance */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            <Card className="h-[350px] sm:h-[400px]">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base sm:text-lg">Booking Trends</CardTitle>
                                    <CardDescription>Last 30 days</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[280px] sm:h-[320px]">
                                    <ChartBookingTrends data={bookingTrends || []} />
                                </CardContent>
                            </Card>
                            <PropertyPerformanceCard data={propertyPerformance || []} />
                        </div>

                        {/* Third Row - Quick Actions, Activity, Agenda */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                            <QuickActions user={auth.user} />
                            {auth.user.role !== 'housekeeping' && (
                                <RecentActivity activities={recentActivity || []} />
                            )}
                            <TodayAgenda agenda={todaysAgenda || []} />
                        </div>
                    </>
                )}

                {/* Non-admin standard content */}
                {!isStandardAdminRole && !isCustomAdminRole && !isContentCreator && !isGuestRole && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <QuickActions user={auth.user} />
                        {auth.user.role === 'front_desk' && (
                            <TodayAgenda agenda={todaysAgenda || []} />
                        )}
                    </div>
                )}

                {/* Properties Map - Standard Admin only */}
                {isStandardAdminRole && ['super_admin', 'property_manager', 'property_owner'].includes(auth.user.role) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Properties Location
                            </CardTitle>
                            <CardDescription>
                                View all property locations on an interactive map
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PropertiesMap height="400px" />
                        </CardContent>
                    </Card>
                )}

                {/* Guest-specific content */}
                {isGuestRole && upcomingBookings && upcomingBookings.length > 0 && (
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle className="text-blue-900">Upcoming Bookings</CardTitle>
                            <CardDescription>Your next stays with check-in instructions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {upcomingBookings.map((booking) => (
                                    <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl hover:shadow-sm transition-shadow bg-white">
                                        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                                <Building2 className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{booking.property.name}</h4>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <span>{new Date(booking.check_in).toLocaleDateString("id-ID")}</span>
                                                    <span>-</span>
                                                    <span>{new Date(booking.check_out).toLocaleDateString("id-ID")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" className="shrink-0">
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Details
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isGuestRole && (!upcomingBookings || upcomingBookings.length === 0) && (
                    <Card className="bg-gray-50/50 border-dashed">
                        <CardContent className="text-center py-12">
                            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-semibold mb-2 text-gray-900">No Upcoming Bookings</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                You don't have any upcoming bookings with check-in instructions available.
                            </p>
                            <Button asChild className="rounded-full px-8">
                                <Link href="/properties">
                                    Browse Properties
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
}
