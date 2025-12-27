import React, { useState, useMemo, useRef } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    CalendarDays,
    DollarSign,
    TrendingUp,
    Search,
    ChevronLeft,
    ChevronRight,
    Bed,
    Sparkles,
    RefreshCcw
} from 'lucide-react';
import AdminLayout from '@/layouts/admin-layout';
import { formatCurrency } from '@/lib/utils';

interface RateDay {
    date: string;
    day: number;
    dow: number; // 0=Sunday
    is_weekend: boolean;
    is_today: boolean;
    rate: number;
    rate_source: 'base' | 'weekend' | 'seasonal';
    rate_name: string | null;
    extra_bed_rate: number | null;
}

interface PropertyRate {
    id: number;
    name: string;
    slug: string;
    address: string;
    status: string;
    base_rate: number;
    extra_bed_rate: number | null;
    weekend_premium_percent: number;
    capacity: number;
    capacity_max: number;
    active_seasonal_rates_count: number;
    current_seasonal_rate: {
        id: number;
        name: string;
        start_date: string;
        end_date: string;
        rate_type: string;
        rate_value: number;
        extra_bed_rate: number | null;
    } | null;
    rate_calendar: RateDay[];
}

interface Props {
    properties: PropertyRate[];
    dateRange: {
        start: string;
        end: string;
        today: string;
    };
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function RateManagementIndex({ properties, dateRange }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const filteredProperties = useMemo(() => {
        return properties.filter(property =>
            property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            property.address.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [properties, searchTerm]);

    // Get unique dates for header
    const dates = useMemo(() => {
        if (properties.length === 0 || !properties[0].rate_calendar) return [];
        return properties[0].rate_calendar;
    }, [properties]);

    // Group dates by month for header
    const monthGroups = useMemo(() => {
        const groups: { month: string; days: RateDay[] }[] = [];
        let currentMonth = '';

        dates.forEach(date => {
            const d = new Date(date.date);
            const monthKey = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

            if (monthKey !== currentMonth) {
                currentMonth = monthKey;
                groups.push({ month: monthKey, days: [] });
            }
            groups[groups.length - 1].days.push(date);
        });

        return groups;
    }, [dates]);

    const scrollCalendar = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 300;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const scrollToToday = () => {
        if (scrollRef.current) {
            const todayIndex = dates.findIndex(d => d.is_today);
            if (todayIndex !== -1) {
                const cellWidth = 56; // w-14
                const containerWidth = scrollRef.current.clientWidth;
                const scrollPosition = (todayIndex * cellWidth) - (containerWidth / 2) + (cellWidth / 2);
                scrollRef.current.scrollTo({
                    left: Math.max(0, scrollPosition),
                    behavior: 'smooth'
                });
            }
        }
    };

    const formatCompactCurrency = (amount: number) => {
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}jt`;
        }
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(0)}rb`;
        }
        return amount.toString();
    };

    // Using universal semantic classes
    const getRateClasses = (source: string) => {
        switch (source) {
            case 'seasonal':
                return 'bg-info text-info border-info';
            case 'weekend':
                return 'bg-warning text-warning border-warning';
            default:
                return 'bg-surface text-surface border-surface';
        }
    };

    const getTodayRing = (isToday: boolean) => {
        return isToday ? 'ring-2 ring-primary' : '';
    };

    // Stats
    const stats = useMemo(() => ({
        total: properties.length,
        withSeasonal: properties.filter(p => p.active_seasonal_rates_count > 0).length,
        inActiveSeason: properties.filter(p => p.current_seasonal_rate).length,
    }), [properties]);

    return (
        <AdminLayout title="Rate Management - Kalender Harga">
            <div className="space-y-4 md:space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kalender Harga</h1>
                        <p className="text-sm md:text-base text-muted-foreground">
                            Lihat dan kelola harga semua properti dalam 60 hari
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.reload()}>
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Stats Cards - Using universal classes */}
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <Card>
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <CalendarDays className="h-4 w-4 text-primary" />
                                <span className="text-xs text-primary font-medium">Total</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold text-foreground">{stats.total}</p>
                            <p className="text-xs text-muted-foreground">properti aktif</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-info">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="h-4 w-4 text-info" />
                                <span className="text-xs text-info font-medium">Seasonal</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold text-info">{stats.withSeasonal}</p>
                            <p className="text-xs text-muted-foreground">punya tarif seasonal</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-success">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="h-4 w-4 text-success" />
                                <span className="text-xs text-success font-medium">Aktif</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold text-success">{stats.inActiveSeason}</p>
                            <p className="text-xs text-muted-foreground">dalam musim aktif</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Controls */}
                <Card>
                    <CardContent className="p-3 md:p-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Cari properti..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => scrollCalendar('left')}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="default" size="sm" onClick={scrollToToday}>
                                    Hari Ini
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => scrollCalendar('right')}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 mt-3 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded bg-surface border border-border" />
                                <span className="text-muted-foreground">Harga Dasar</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded bg-warning border border-border" />
                                <span className="text-muted-foreground">Weekend</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded bg-info border border-border" />
                                <span className="text-muted-foreground">Seasonal</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded ring-2 ring-primary" />
                                <span className="text-muted-foreground">Hari Ini</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Calendar Grid */}
                <Card>
                    <CardContent className="p-0 overflow-hidden">
                        <div className="relative">
                            {/* Scrollable Container */}
                            <div
                                ref={scrollRef}
                                className="overflow-x-auto"
                            >
                                <table className="w-max min-w-full border-collapse">
                                    {/* Month Header */}
                                    <thead>
                                        <tr className="bg-muted">
                                            <th className="sticky left-0 z-20 bg-muted min-w-[180px] md:min-w-[220px] p-2 text-left text-sm font-medium border-b border-r border-border">
                                                Properti
                                            </th>
                                            {monthGroups.map((group, idx) => (
                                                <th
                                                    key={idx}
                                                    colSpan={group.days.length}
                                                    className="p-2 text-center text-sm font-medium border-b border-border bg-muted"
                                                >
                                                    {group.month}
                                                </th>
                                            ))}
                                        </tr>
                                        {/* Day Names & Dates */}
                                        <tr className="bg-card">
                                            <th className="sticky left-0 z-20 bg-card min-w-[180px] md:min-w-[220px] p-2 text-left text-xs font-normal text-muted-foreground border-b border-r border-border">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-3.5 w-3.5" />
                                                    <span>Base Rate</span>
                                                </div>
                                            </th>
                                            {dates.map((date, idx) => (
                                                <th
                                                    key={idx}
                                                    className={`w-14 p-1 text-center text-xs border-b border-border ${date.is_today ? 'bg-primary/10' :
                                                            date.is_weekend ? 'bg-warning' : ''
                                                        }`}
                                                >
                                                    <div className={`font-medium ${date.is_today ? 'text-primary' : 'text-foreground'}`}>
                                                        {DAY_NAMES[date.dow]}
                                                    </div>
                                                    <div className={`${date.is_today ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                                                        {date.day}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProperties.map((property) => (
                                            <tr key={property.id} className="hover:bg-muted/50">
                                                {/* Property Info - Sticky */}
                                                <td className="sticky left-0 z-10 bg-card min-w-[180px] md:min-w-[220px] p-2 border-b border-r border-border">
                                                    <Link
                                                        href={`/admin/properties/${property.slug}/seasonal-rates`}
                                                        className="block hover:text-primary transition-colors"
                                                    >
                                                        <div className="font-medium text-sm truncate text-foreground">{property.name}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatCurrency(property.base_rate)}
                                                            </span>
                                                            {property.extra_bed_rate && (
                                                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                                    <Bed className="h-2.5 w-2.5 mr-0.5" />
                                                                    {formatCompactCurrency(property.extra_bed_rate)}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {property.current_seasonal_rate && (
                                                            <Badge className="mt-1 text-[10px] bg-info text-info">
                                                                <Sparkles className="h-2.5 w-2.5 mr-1" />
                                                                {property.current_seasonal_rate.name}
                                                            </Badge>
                                                        )}
                                                    </Link>
                                                </td>

                                                {/* Rate Cells */}
                                                {property.rate_calendar.map((day, idx) => (
                                                    <td
                                                        key={idx}
                                                        className={`w-14 p-0.5 border-b border-border text-center ${day.is_today ? 'bg-primary/5' : ''
                                                            }`}
                                                    >
                                                        <div
                                                            className={`
                                                                rounded px-1 py-1.5 text-xs font-medium border
                                                                ${getRateClasses(day.rate_source)}
                                                                ${getTodayRing(day.is_today)}
                                                            `}
                                                            title={`${day.date}: ${formatCurrency(day.rate)}${day.rate_name ? ` (${day.rate_name})` : ''}`}
                                                        >
                                                            <div>{formatCompactCurrency(day.rate)}</div>
                                                            {day.extra_bed_rate && day.extra_bed_rate !== property.extra_bed_rate && (
                                                                <div className="text-[9px] opacity-75 mt-0.5">
                                                                    +{formatCompactCurrency(day.extra_bed_rate)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {filteredProperties.length === 0 && (
                            <div className="py-12 text-center">
                                <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground mb-2">Tidak ada properti ditemukan</h3>
                                <p className="text-muted-foreground">
                                    {searchTerm ? 'Coba sesuaikan kata kunci pencarian.' : 'Belum ada properti aktif.'}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Mobile Tip */}
                <div className="md:hidden text-center text-xs text-muted-foreground">
                    <span>👆 Geser ke kanan/kiri untuk melihat kalender lengkap</span>
                </div>
            </div>
        </AdminLayout>
    );
}