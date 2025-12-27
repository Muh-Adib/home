import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
    Calendar,
    Plus,
    Edit,
    Trash2,
    TrendingUp,
    DollarSign,
    Clock,
    Target,
    CalendarDays,
    Bed,
    ArrowLeft,
    CheckCircle,
    XCircle,
    ChevronRight,
    Sun,
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { type BreadcrumbItem } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface Property {
    id: number;
    name: string;
    slug: string;
    base_rate: number;
    formatted_base_rate?: string;
    extra_bed_rate?: number;
}

interface SeasonalRate {
    id: number;
    property_id: number;
    name: string;
    start_date: string;
    end_date: string;
    rate_type: 'percentage' | 'fixed' | 'multiplier';
    rate_value: number;
    extra_bed_rate?: number | null;
    min_stay_nights: number;
    applies_to_weekends_only: boolean;
    is_active: boolean;
    priority: number;
    description?: string;
}

interface SeasonalRatesIndexProps {
    property: Property;
    seasonalRates: SeasonalRate[];
}

export default function SeasonalRatesIndex({ property, seasonalRates }: SeasonalRatesIndexProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingRate, setEditingRate] = useState<SeasonalRate | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm<{
        name: string;
        start_date: string;
        end_date: string;
        rate_type: 'percentage' | 'fixed' | 'multiplier';
        rate_value: number;
        extra_bed_rate?: number | null;
        min_stay_nights: number;
        applies_to_weekends_only: boolean;
        is_active: boolean;
        priority: number;
        description: string;
    }>({
        name: '',
        start_date: '',
        end_date: '',
        rate_type: 'fixed',
        rate_value: 0,
        extra_bed_rate: null,
        min_stay_nights: 1,
        applies_to_weekends_only: false,
        is_active: true,
        priority: 50,
        description: '',
    });

    // Use formatted_base_rate if available, otherwise format from base_rate
    const displayBaseRate = property.formatted_base_rate || formatCurrency(property.base_rate);

    const formatShortDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short'
        });
    };

    const getRateTypeLabel = (type: string) => {
        switch (type) {
            case 'percentage': return 'Persentase';
            case 'fixed': return 'Harga Tetap';
            case 'multiplier': return 'Pengali';
            default: return type;
        }
    };

    const getRateTypeClass = (type: string) => {
        switch (type) {
            case 'percentage': return 'bg-info text-info';
            case 'fixed': return 'bg-success text-success';
            case 'multiplier': return 'bg-warning text-warning';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const formatRateValue = (rate: SeasonalRate) => {
        switch (rate.rate_type) {
            case 'percentage':
                return `${rate.rate_value > 0 ? '+' : ''}${rate.rate_value}%`;
            case 'fixed':
                return formatCurrency(rate.rate_value);
            case 'multiplier':
                return `${rate.rate_value}x`;
            default:
                return rate.rate_value.toString();
        }
    };

    const calculateExampleRate = (rate: SeasonalRate) => {
        const baseRate = property.base_rate;
        switch (rate.rate_type) {
            case 'percentage':
                return baseRate * (1 + rate.rate_value / 100);
            case 'fixed':
                return rate.rate_value;
            case 'multiplier':
                return baseRate * rate.rate_value;
            default:
                return baseRate;
        }
    };

    const getPriorityClass = (priority: number) => {
        if (priority >= 90) return 'bg-destructive/20 text-destructive';
        if (priority >= 70) return 'bg-warning text-warning';
        return 'bg-muted text-muted-foreground';
    };

    const isRateActive = (rate: SeasonalRate) => {
        const now = new Date();
        const start = new Date(rate.start_date);
        const end = new Date(rate.end_date);
        return rate.is_active && now >= start && now <= end;
    };

    const isRateUpcoming = (rate: SeasonalRate) => {
        const now = new Date();
        const start = new Date(rate.start_date);
        return rate.is_active && now < start;
    };

    const isRatePast = (rate: SeasonalRate) => {
        const now = new Date();
        const end = new Date(rate.end_date);
        return now > end;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingRate) {
            put(route('admin.properties.seasonal-rates.update', [property.slug, editingRate.id]), {
                onSuccess: () => {
                    setEditingRate(null);
                    reset();
                }
            });
        } else {
            post(route('admin.properties.seasonal-rates.store', property.slug), {
                onSuccess: () => {
                    setShowCreateModal(false);
                    reset();
                }
            });
        }
    };

    const handleEdit = (rate: SeasonalRate) => {
        setData({
            name: rate.name,
            start_date: rate.start_date,
            end_date: rate.end_date,
            rate_type: rate.rate_type,
            rate_value: rate.rate_value,
            min_stay_nights: rate.min_stay_nights,
            applies_to_weekends_only: rate.applies_to_weekends_only,
            is_active: rate.is_active,
            priority: rate.priority,
            description: rate.description || '',
            extra_bed_rate: rate.extra_bed_rate ?? null,
        });
        setEditingRate(rate);
    };

    const handleDelete = (rate: SeasonalRate) => {
        if (confirm(`Apakah Anda yakin ingin menghapus seasonal rate "${rate.name}"?`)) {
            router.delete(route('admin.properties.seasonal-rates.destroy', [property.slug, rate.id]));
        }
    };

    const sortedRates = seasonalRates.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Properties', href: '/admin/properties' },
        { title: property.name, href: `/admin/properties/${property.slug}` },
        { title: 'Seasonal Rates', href: '#' },
    ];

    const activeRates = seasonalRates.filter(r => isRateActive(r));
    const upcomingRates = seasonalRates.filter(r => isRateUpcoming(r));

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`Seasonal Rates - ${property.name}`} />

            <div className="space-y-4 md:space-y-6">
                {/* Mobile-First Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Link href={route('admin.properties.show', property.slug)} className="md:hidden">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tarif Musiman</h1>
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground">
                            Atur harga spesial untuk {property.name}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.properties.show', property.slug)} className="hidden md:block">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Kembali
                            </Button>
                        </Link>
                        <Button onClick={() => setShowCreateModal(true)} className="flex-1 sm:flex-none">
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Tarif
                        </Button>
                    </div>
                </div>

                {/* Stats Cards - Using universal semantic classes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <Card className="bg-info">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="h-4 w-4 text-info" />
                                <span className="text-xs text-info font-medium">Base Rate</span>
                            </div>
                            <p className="text-lg md:text-xl font-bold text-info">{displayBaseRate}</p>
                            <p className="text-xs text-muted-foreground">/malam</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-success">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-success" />
                                <span className="text-xs text-success font-medium">Aktif</span>
                            </div>
                            <p className="text-lg md:text-xl font-bold text-success">{activeRates.length}</p>
                            <p className="text-xs text-muted-foreground">tarif berlaku</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-warning">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-warning" />
                                <span className="text-xs text-warning font-medium">Mendatang</span>
                            </div>
                            <p className="text-lg md:text-xl font-bold text-warning">{upcomingRates.length}</p>
                            <p className="text-xs text-muted-foreground">dijadwalkan</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground font-medium">Total</span>
                            </div>
                            <p className="text-lg md:text-xl font-bold text-foreground">{seasonalRates.length}</p>
                            <p className="text-xs text-muted-foreground">tarif</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Rates List */}
                <div className="space-y-3">
                    {sortedRates.length > 0 ? (
                        sortedRates.map((rate) => {
                            const isCurrentlyActive = isRateActive(rate);
                            const isUpcoming = isRateUpcoming(rate);
                            const isPast = isRatePast(rate);

                            return (
                                <Card
                                    key={rate.id}
                                    className={`overflow-hidden transition-all duration-200 ${isPast ? 'opacity-60' : ''
                                        } ${isCurrentlyActive ? 'ring-2 ring-primary' : ''}`}
                                >
                                    <CardContent className="p-0">
                                        {/* Status Bar */}
                                        <div className={`h-1 ${isCurrentlyActive ? 'bg-primary' :
                                                isUpcoming ? 'bg-warning' :
                                                    isPast ? 'bg-muted-foreground/50' :
                                                        !rate.is_active ? 'bg-destructive' : 'bg-muted'
                                            }`} />

                                        <div className="p-4">
                                            {/* Header Row */}
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <h3 className="font-semibold text-base md:text-lg truncate">{rate.name}</h3>
                                                        {isCurrentlyActive && (
                                                            <Badge className="bg-success text-success whitespace-nowrap">
                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                Aktif
                                                            </Badge>
                                                        )}
                                                        {isUpcoming && (
                                                            <Badge className="bg-warning text-warning whitespace-nowrap">
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                Mendatang
                                                            </Badge>
                                                        )}
                                                        {isPast && (
                                                            <Badge className="bg-surface text-surface whitespace-nowrap">
                                                                Berakhir
                                                            </Badge>
                                                        )}
                                                        {!rate.is_active && (
                                                            <Badge variant="destructive" className="whitespace-nowrap">
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                Nonaktif
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <CalendarDays className="h-3.5 w-3.5" />
                                                        <span>{formatShortDate(rate.start_date)}</span>
                                                        <ChevronRight className="h-3 w-3" />
                                                        <span>{formatShortDate(rate.end_date)}</span>
                                                    </div>
                                                </div>

                                                {/* Actions - Desktop */}
                                                <div className="hidden sm:flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(rate)}
                                                        className="h-8 w-8"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(rate)}
                                                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Info Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3">
                                                {/* Rate Type & Value */}
                                                <div className="bg-muted rounded-lg p-2.5 md:p-3">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground font-medium">Tarif</span>
                                                    </div>
                                                    <p className="font-semibold text-sm md:text-base text-foreground">{formatRateValue(rate)}</p>
                                                    <Badge className={`${getRateTypeClass(rate.rate_type)} text-xs mt-1`}>
                                                        {getRateTypeLabel(rate.rate_type)}
                                                    </Badge>
                                                </div>

                                                {/* Calculated Rate */}
                                                <div className="bg-muted rounded-lg p-2.5 md:p-3">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground font-medium">Hasil</span>
                                                    </div>
                                                    <p className="font-semibold text-sm md:text-base text-primary">
                                                        {formatCurrency(calculateExampleRate(rate))}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">/malam</p>
                                                </div>

                                                {/* Extra Bed Rate */}
                                                <div className="bg-muted rounded-lg p-2.5 md:p-3">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground font-medium">Extra Bed</span>
                                                    </div>
                                                    {rate.extra_bed_rate ? (
                                                        <>
                                                            <p className="font-semibold text-sm md:text-base text-warning">
                                                                {formatCurrency(rate.extra_bed_rate)}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">/malam</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="font-semibold text-sm md:text-base text-muted-foreground">
                                                                {property.extra_bed_rate ? formatCurrency(property.extra_bed_rate) : '-'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">dari property</p>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Min Stay & Priority */}
                                                <div className="bg-muted rounded-lg p-2.5 md:p-3">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground font-medium">Min. Inap</span>
                                                    </div>
                                                    <p className="font-semibold text-sm md:text-base text-foreground">{rate.min_stay_nights} malam</p>
                                                    <Badge className={`${getPriorityClass(rate.priority)} text-xs mt-1`}>
                                                        P{rate.priority}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Additional Info */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                {rate.applies_to_weekends_only && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Sun className="h-3 w-3 mr-1" />
                                                        Weekend Only
                                                    </Badge>
                                                )}
                                                {rate.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                                        {rate.description}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Mobile Actions */}
                                            <div className="flex sm:hidden items-center gap-2 mt-3 pt-3 border-t">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(rate)}
                                                    className="flex-1"
                                                >
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(rate)}
                                                    className="text-destructive hover:text-destructive/80"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    Belum ada tarif musiman
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                                    Buat tarif musiman untuk mengoptimalkan harga property Anda di periode tertentu
                                </p>
                                <Button onClick={() => setShowCreateModal(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tambah Tarif Musiman
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Create/Edit Modal */}
                <Dialog open={showCreateModal || !!editingRate} onOpenChange={(open) => {
                    if (!open) {
                        setShowCreateModal(false);
                        setEditingRate(null);
                        reset();
                    }
                }}>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {editingRate ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                {editingRate ? 'Edit Tarif Musiman' : 'Tambah Tarif Musiman'}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <div>
                                <Label htmlFor="name">Nama Tarif *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Contoh: Libur Natal, High Season"
                                    className={errors.name ? 'border-destructive' : ''}
                                />
                                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Tanggal Mulai *</Label>
                                    <DatePicker
                                        date={data.start_date ? new Date(data.start_date) : undefined}
                                        onDateChange={(date) => {
                                            setData('start_date', date ? format(date, 'yyyy-MM-dd') : '');
                                        }}
                                        placeholder="Pilih tanggal"
                                        className={errors.start_date ? 'border-destructive' : ''}
                                    />
                                    {errors.start_date && (
                                        <p className="text-sm text-destructive mt-1">{errors.start_date}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Tanggal Selesai *</Label>
                                    <DatePicker
                                        date={data.end_date ? new Date(data.end_date) : undefined}
                                        onDateChange={(date) => {
                                            setData('end_date', date ? format(date, 'yyyy-MM-dd') : '');
                                        }}
                                        placeholder="Pilih tanggal"
                                        className={errors.end_date ? 'border-destructive' : ''}
                                    />
                                    {errors.end_date && (
                                        <p className="text-sm text-destructive mt-1">{errors.end_date}</p>
                                    )}
                                </div>
                            </div>

                            {/* Rate Type & Value */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="rate_type">Tipe Tarif *</Label>
                                    <Select value={data.rate_type} onValueChange={(value: any) => setData('rate_type', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fixed">Harga Tetap (Rp)</SelectItem>
                                            <SelectItem value="percentage">Persentase (+/-)</SelectItem>
                                            <SelectItem value="multiplier">Pengali (1.5x)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="rate_value">Nilai Tarif *</Label>
                                    <Input
                                        id="rate_value"
                                        type="number"
                                        step={data.rate_type === 'fixed' ? '50000' : '0.1'}
                                        value={data.rate_value}
                                        onChange={(e) => setData('rate_value', parseFloat(e.target.value) || 0)}
                                        className={errors.rate_value ? 'border-destructive' : ''}
                                    />
                                    {errors.rate_value && <p className="text-sm text-destructive mt-1">{errors.rate_value}</p>}
                                </div>
                            </div>

                            {/* Extra Bed Rate */}
                            <div>
                                <Label htmlFor="extra_bed_rate" className="flex items-center gap-2">
                                    <Bed className="h-4 w-4" />
                                    Extra Bed Rate
                                </Label>
                                <Input
                                    id="extra_bed_rate"
                                    type="number"
                                    step="5000"
                                    value={data.extra_bed_rate ?? ''}
                                    onChange={(e) => setData('extra_bed_rate', e.target.value ? parseFloat(e.target.value) : null)}
                                    placeholder="Kosongkan untuk menggunakan tarif property"
                                    className={errors.extra_bed_rate ? 'border-destructive' : ''}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Tarif property: {property.extra_bed_rate ? formatCurrency(property.extra_bed_rate) : 'Belum diatur'}
                                </p>
                                {errors.extra_bed_rate && <p className="text-sm text-destructive">{errors.extra_bed_rate}</p>}
                            </div>

                            {/* Priority & Min Stay */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="priority">Prioritas (0-100) *</Label>
                                    <Input
                                        id="priority"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={data.priority}
                                        onChange={(e) => setData('priority', parseInt(e.target.value) || 0)}
                                        className={errors.priority ? 'border-destructive' : ''}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Semakin tinggi, semakin diprioritaskan
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="min_stay_nights">Min. Menginap *</Label>
                                    <Input
                                        id="min_stay_nights"
                                        type="number"
                                        min="1"
                                        value={data.min_stay_nights}
                                        onChange={(e) => setData('min_stay_nights', parseInt(e.target.value) || 1)}
                                        className={errors.min_stay_nights ? 'border-destructive' : ''}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">malam</p>
                                </div>
                            </div>

                            {/* Switches */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Aktif</Label>
                                        <p className="text-xs text-muted-foreground">Tarif berlaku saat diaktifkan</p>
                                    </div>
                                    <Switch
                                        checked={data.is_active}
                                        onCheckedChange={(checked) => setData('is_active', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2">
                                            <Sun className="h-4 w-4" />
                                            Weekend Only
                                        </Label>
                                        <p className="text-xs text-muted-foreground">Hanya berlaku Jumat-Minggu</p>
                                    </div>
                                    <Switch
                                        checked={data.applies_to_weekends_only}
                                        onCheckedChange={(checked) => setData('applies_to_weekends_only', checked)}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <Label htmlFor="description">Deskripsi</Label>
                                <Input
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Catatan tambahan (opsional)"
                                />
                            </div>

                            {/* Rate Preview */}
                            {data.rate_value > 0 && (
                                <Alert className="bg-muted">
                                    <TrendingUp className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Preview:</strong> {displayBaseRate} →{' '}
                                        <span className="font-semibold text-primary">
                                            {formatCurrency(
                                                data.rate_type === 'percentage'
                                                    ? property.base_rate * (1 + data.rate_value / 100)
                                                    : data.rate_type === 'fixed'
                                                        ? data.rate_value
                                                        : property.base_rate * data.rate_value
                                            )}
                                        </span>
                                        {data.extra_bed_rate && (
                                            <span className="text-warning ml-2">
                                                (Extra Bed: {formatCurrency(data.extra_bed_rate)})
                                            </span>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Form Actions */}
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setEditingRate(null);
                                        reset();
                                    }}
                                    className="w-full sm:w-auto"
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                                    {processing ? 'Menyimpan...' : editingRate ? 'Perbarui' : 'Simpan'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
