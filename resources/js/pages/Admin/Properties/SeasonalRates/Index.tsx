import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Calendar,
    Plus,
    Edit,
    Trash2,
    TrendingUp,
    DollarSign,
    Clock,
    Target,
    CalendarDays
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { type BreadcrumbItem } from '@/types';

interface Property {
    id: number;
    name: string;
    slug: string;
    base_rate: number;
    formatted_base_rate: string;
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

    const formatCurrency = (amount: number) => {
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getRateTypeColor = (type: string) => {
        switch (type) {
            case 'percentage': return 'bg-brand-primary-20 text-brand-primary';
            case 'fixed': return 'bg-brand-secondary-20 text-brand-secondary';
            case 'multiplier': return 'bg-brand-accent-20 text-brand-accent';
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

    const getPriorityColor = (priority: number) => {
        if (priority >= 90) return 'bg-destructive/20 text-destructive';
        if (priority >= 70) return 'bg-brand-accent-30 text-brand-accent';
        if (priority >= 50) return 'bg-brand-secondary-30 text-brand-secondary';
        return 'bg-muted text-muted-foreground';
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

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`Seasonal Rates - ${property.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Seasonal Rates</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage seasonal pricing for {property.name}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.properties.show', property.slug)}>
                            <Button variant="outline">
                                Back to Property
                            </Button>
                        </Link>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Seasonal Rate
                        </Button>
                    </div>
                </div>

                {/* Property Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Property Pricing Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Base Rate</Label>
                                <p className="text-2xl font-bold text-foreground">{property.formatted_base_rate}</p>
                                <p className="text-sm text-muted-foreground">per night</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Active Rates</Label>
                                <p className="text-2xl font-bold text-brand-secondary">
                                    {seasonalRates.filter(r => r.is_active).length}
                                </p>
                                <p className="text-sm text-muted-foreground">seasonal rates</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Upcoming</Label>
                                <p className="text-2xl font-bold text-brand-primary">
                                    {seasonalRates.filter(r => new Date(r.start_date) > new Date()).length}
                                </p>
                                <p className="text-sm text-muted-foreground">future rates</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Peak Seasons</Label>
                                <p className="text-2xl font-bold text-destructive">
                                    {seasonalRates.filter(r => r.priority >= 90).length}
                                </p>
                                <p className="text-sm text-muted-foreground">high priority</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Seasonal Rates List */}
                <div className="space-y-4">
                    {sortedRates.length > 0 ? (
                        sortedRates.map((rate) => (
                            <Card key={rate.id} className={`${!rate.is_active ? 'opacity-60' : ''}`}>
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold">{rate.name}</h3>
                                                <Badge className={getRateTypeColor(rate.rate_type)}>
                                                    {rate.rate_type}
                                                </Badge>
                                                <Badge className={getPriorityColor(rate.priority)}>
                                                    Priority {rate.priority}
                                                </Badge>
                                                {!rate.is_active && (
                                                    <Badge variant="secondary">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">Period</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatDate(rate.start_date)} - {formatDate(rate.end_date)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Target className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">Rate Impact</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatRateValue(rate)} → {formatCurrency(calculateExampleRate(rate))}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">Min Stay</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {rate.min_stay_nights} nights
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {rate.description && (
                                                <p className="text-sm text-muted-foreground mt-3">
                                                    {rate.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(rate)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
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
                        ))
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    No seasonal rates configured
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    Start by creating your first seasonal rate to optimize pricing
                                </p>
                                <Button onClick={() => setShowCreateModal(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Seasonal Rate
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
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRate ? 'Edit Seasonal Rate' : 'Create Seasonal Rate'}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Label htmlFor="name">Rate Name *</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g., Christmas Holiday Premium"
                                        className={errors.name ? 'border-destructive' : ''}
                                    />
                                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Start Date *</Label>
                                        <DatePicker
                                            date={data.start_date ? new Date(data.start_date) : undefined}
                                            onDateChange={(date) => {
                                                setData('start_date', date ? format(date, 'yyyy-MM-dd') : '');
                                            }}
                                            placeholder="Select start date"
                                            className={errors.start_date ? 'border-destructive' : ''}
                                        />
                                        {errors.start_date && (
                                            <p className="text-sm text-destructive mt-1">{errors.start_date}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>End Date *</Label>
                                        <DatePicker
                                            date={data.end_date ? new Date(data.end_date) : undefined}
                                            onDateChange={(date) => {
                                                setData('end_date', date ? format(date, 'yyyy-MM-dd') : '');
                                            }}
                                            placeholder="Select end date"
                                            className={errors.end_date ? 'border-destructive' : ''}
                                        />
                                        {errors.end_date && (
                                            <p className="text-sm text-destructive mt-1">{errors.end_date}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="rate_type">Rate Type *</Label>
                                    <Select value={data.rate_type} onValueChange={(value: any) => setData('rate_type', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (+/-50%)</SelectItem>
                                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                                            <SelectItem value="multiplier">Multiplier (1.5x)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="rate_value">Rate Value *</Label>
                                    <Input
                                        id="rate_value"
                                        type="number"
                                        step="50000"
                                        value={data.rate_value}
                                        onChange={(e) => setData('rate_value', parseFloat(e.target.value) || 0)}
                                        className={errors.rate_value ? 'border-destructive' : ''}
                                    />
                                    {errors.rate_value && <p className="text-sm text-destructive">{errors.rate_value}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="extra_bed_rate">Extra Bed Rate (Optional)</Label>
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
                                        Jika dikosongkan, akan menggunakan extra_bed_rate dari property
                                    </p>
                                    {errors.extra_bed_rate && <p className="text-sm text-destructive">{errors.extra_bed_rate}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="priority">Priority (0-100) *</Label>
                                    <Input
                                        id="priority"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={data.priority}
                                        onChange={(e) => setData('priority', parseInt(e.target.value) || 0)}
                                        className={errors.priority ? 'border-destructive' : ''}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="min_stay_nights">Min Stay (nights) *</Label>
                                    <Input
                                        id="min_stay_nights"
                                        type="number"
                                        min="1"
                                        value={data.min_stay_nights}
                                        onChange={(e) => setData('min_stay_nights', parseInt(e.target.value) || 1)}
                                        className={errors.min_stay_nights ? 'border-destructive' : ''}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Optional description"
                                    />
                                </div>
                            </div>

                            {/* Rate Preview */}
                            {data.rate_value > 0 && (
                                <Alert>
                                    <TrendingUp className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Preview:</strong> Base rate {property.formatted_base_rate} →{' '}
                                        <span className="font-semibold">
                                            {formatCurrency(
                                                data.rate_type === 'percentage'
                                                    ? property.base_rate * (1 + data.rate_value / 100)
                                                    : data.rate_type === 'fixed'
                                                        ? data.rate_value
                                                        : property.base_rate * data.rate_value
                                            )}
                                        </span>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setEditingRate(null);
                                        reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Saving...' : editingRate ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
