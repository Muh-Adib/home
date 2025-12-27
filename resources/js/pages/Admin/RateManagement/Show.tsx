import React, { useState, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    CalendarDays,
    DollarSign,
    Edit,
    Save,
    Plus,
    Trash2,
    Calendar,
    ArrowLeft,
    Settings,
    TrendingUp
} from 'lucide-react';
import AdminLayout from '@/layouts/admin-layout';
import { Property, PropertySeasonalRate, RateCalendar } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
    property: Property;
    seasonalRates: PropertySeasonalRate[];
    rateCalendar: RateCalendar;
}

export default function RateManagementShow({ property, seasonalRates, rateCalendar }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [editingBaseRates, setEditingBaseRates] = useState({
        base_rate: property.base_rate,
        weekend_premium_percent: property.weekend_premium_percent || 0,
        cleaning_fee: property.cleaning_fee || 0,
        extra_bed_rate: property.extra_bed_rate || 0,
    });
    const [showAddSeasonalRate, setShowAddSeasonalRate] = useState(false);
    const [editingSeasonalRate, setEditingSeasonalRate] = useState<PropertySeasonalRate | null>(null);
    const [newSeasonalRate, setNewSeasonalRate] = useState({
        name: '',
        start_date: '',
        end_date: '',
        rate_type: 'percentage' as 'fixed' | 'percentage' | 'multiplier',
        rate_value: 0,
        extra_bed_rate: null as number | null,
        priority: 50,
        description: '',
        min_stay_nights: 1,
        applies_to_weekends_only: false,
        is_active: true,
    });

    const handleSaveBaseRates = useCallback(async () => {
        try {
            await router.put(route('admin.rate-management.base-rates.update', property.id), editingBaseRates, {
                onSuccess: () => {
                    setIsEditing(false);
                },
            });
        } catch (error) {
            console.error('Failed to update base rates:', error);
        }
    }, [editingBaseRates, property.id]);

    const handleCreateSeasonalRate = useCallback(async () => {
        try {
            await router.post(route('admin.rate-management.seasonal-rates.create', property.id), newSeasonalRate, {
                onSuccess: () => {
                    setShowAddSeasonalRate(false);
                    setNewSeasonalRate({
                        name: '',
                        start_date: '',
                        end_date: '',
                        rate_type: 'percentage',
                        rate_value: 0,
                        extra_bed_rate: null,
                        priority: 50,
                        description: '',
                        min_stay_nights: 1,
                        applies_to_weekends_only: false,
                        is_active: true,
                    });
                    router.reload();
                },
            });
        } catch (error) {
            console.error('Failed to create seasonal rate:', error);
        }
    }, [newSeasonalRate, property.id]);

    const handleDeleteSeasonalRate = useCallback(async (seasonalRateId: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus seasonal rate ini?')) {
            try {
                await router.delete(route('admin.rate-management.seasonal-rates.delete', seasonalRateId), {
                    onSuccess: () => {
                        router.reload();
                    }
                });
            } catch (error) {
                console.error('Failed to delete seasonal rate:', error);
            }
        }
    }, []);

    const handleEditSeasonalRate = useCallback((rate: PropertySeasonalRate) => {
        setEditingSeasonalRate(rate);
        setNewSeasonalRate({
            name: rate.name,
            start_date: rate.start_date,
            end_date: rate.end_date,
            rate_type: rate.rate_type,
            rate_value: rate.rate_value,
            extra_bed_rate: rate.extra_bed_rate ?? null,
            priority: rate.priority ?? 50,
            description: rate.description || '',
            min_stay_nights: rate.min_stay_nights || 1,
            applies_to_weekends_only: rate.applies_to_weekends_only || false,
            is_active: rate.is_active ?? true,
        });
        setShowAddSeasonalRate(true);
    }, []);

    const handleUpdateSeasonalRate = useCallback(async () => {
        if (!editingSeasonalRate) return;

        try {
            await router.put(route('admin.rate-management.seasonal-rates.update', editingSeasonalRate.id), newSeasonalRate, {
                onSuccess: () => {
                    setShowAddSeasonalRate(false);
                    setEditingSeasonalRate(null);
                    setNewSeasonalRate({
                        name: '',
                        start_date: '',
                        end_date: '',
                        rate_type: 'percentage',
                        rate_value: 0,
                        extra_bed_rate: null,
                        priority: 50,
                        description: '',
                        min_stay_nights: 1,
                        applies_to_weekends_only: false,
                        is_active: true,
                    });
                    router.reload();
                },
            });
        } catch (error) {
            console.error('Failed to update seasonal rate:', error);
        }
    }, [newSeasonalRate, editingSeasonalRate]);

    const formatRateValue = (rate: PropertySeasonalRate) => {
        if (rate.rate_type === 'percentage') {
            return `+${rate.rate_value}%`;
        } else if (rate.rate_type === 'multiplier') {
            return `${rate.rate_value}x`;
        }
        return formatCurrency(rate.rate_value);
    };

    const calculateExampleRate = (rate: PropertySeasonalRate) => {
        const baseRate = property.base_rate;
        if (rate.rate_type === 'percentage') {
            return baseRate + (baseRate * rate.rate_value / 100);
        } else if (rate.rate_type === 'multiplier') {
            return baseRate * rate.rate_value;
        }
        return rate.rate_value;
    };

    return (
        <AdminLayout>
            <Head title={`Rate Management - ${property.name}`} />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center space-x-4 mb-2">
                                    <Button variant="ghost" onClick={() => router.visit(route('admin.rate-management.index'))}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Rate Management
                                    </Button>
                                </div>
                                <h1 className="text-2xl font-bold text-foreground">{property.name}</h1>
                                <p className="text-muted-foreground">Manage rates, seasonal pricing, and calendar view</p>
                            </div>
                            <div className="flex space-x-3">
                                <Button variant="outline" onClick={() => router.reload()}>
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Refresh
                                </Button>
                                <Button onClick={() => router.visit(route('admin.properties.edit', property.slug))}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Edit Property
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Property Info */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Property Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <span className="text-sm text-muted-foreground">Address</span>
                                    <div className="font-medium text-foreground">{property.address}</div>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Capacity</span>
                                    <div className="font-medium text-foreground">{property.capacity}-{property.capacity_max} guests</div>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <div>
                                        <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>
                                            {property.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Seasonal Rates</span>
                                    <div className="font-medium text-foreground">{seasonalRates.length} active</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Base Rates */}
                    <Card className="mb-6">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Base Rates</CardTitle>
                                <CardDescription>Fundamental pricing for this property</CardDescription>
                            </div>
                            <Button
                                variant={isEditing ? "default" : "outline"}
                                onClick={() => isEditing ? handleSaveBaseRates() : setIsEditing(true)}
                            >
                                {isEditing ? (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                ) : (
                                    <>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Rates
                                    </>
                                )}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <Label htmlFor="base_rate">Base Rate (per night)</Label>
                                    {isEditing ? (
                                        <Input
                                            id="base_rate"
                                            type="number"
                                            value={editingBaseRates.base_rate}
                                            onChange={(e) => setEditingBaseRates(prev => ({
                                                ...prev,
                                                base_rate: parseInt(e.target.value) || 0
                                            }))}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <div className="text-lg font-semibold mt-1">{formatCurrency(property.base_rate)}</div>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="weekend_premium">Weekend Premium (%)</Label>
                                    {isEditing ? (
                                        <Input
                                            id="weekend_premium"
                                            type="number"
                                            value={editingBaseRates.weekend_premium_percent}
                                            onChange={(e) => setEditingBaseRates(prev => ({
                                                ...prev,
                                                weekend_premium_percent: parseInt(e.target.value) || 0
                                            }))}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <div className="text-lg font-semibold mt-1">{property.weekend_premium_percent || 0}%</div>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="cleaning_fee">Cleaning Fee</Label>
                                    {isEditing ? (
                                        <Input
                                            id="cleaning_fee"
                                            type="number"
                                            value={editingBaseRates.cleaning_fee}
                                            onChange={(e) => setEditingBaseRates(prev => ({
                                                ...prev,
                                                cleaning_fee: parseInt(e.target.value) || 0
                                            }))}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <div className="text-lg font-semibold mt-1">{formatCurrency(property.cleaning_fee || 0)}</div>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="extra_bed_rate">Extra Bed Rate</Label>
                                    {isEditing ? (
                                        <Input
                                            id="extra_bed_rate"
                                            type="number"
                                            value={editingBaseRates.extra_bed_rate}
                                            onChange={(e) => setEditingBaseRates(prev => ({
                                                ...prev,
                                                extra_bed_rate: parseInt(e.target.value) || 0
                                            }))}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <div className="text-lg font-semibold mt-1">{formatCurrency(property.extra_bed_rate || 0)}</div>
                                    )}
                                </div>
                            </div>

                            {isEditing && (
                                <div className="mt-4 flex space-x-2">
                                    <Button onClick={() => setIsEditing(false)} variant="outline">
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Seasonal Rates */}
                    <Card className="mb-6">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Seasonal Rates</CardTitle>
                                <CardDescription>Special pricing for peak seasons and holidays</CardDescription>
                            </div>
                            <Button onClick={() => setShowAddSeasonalRate(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Seasonal Rate
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {(showAddSeasonalRate || editingSeasonalRate) && (
                                <Card className="mb-4 border-dashed">
                                    <CardHeader>
                                        <CardTitle className="text-lg">
                                            {editingSeasonalRate ? 'Edit Seasonal Rate' : 'Add New Seasonal Rate'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="new_name">Rate Name</Label>
                                                <Input
                                                    id="new_name"
                                                    value={newSeasonalRate.name}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="e.g., High Season, Holiday Rate"
                                                    className="mt-1"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="new_rate_type">Rate Type</Label>
                                                <Select
                                                    value={newSeasonalRate.rate_type}
                                                    onValueChange={(value: 'fixed' | 'percentage') => setNewSeasonalRate(prev => ({ ...prev, rate_type: value }))}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="percentage">Percentage</SelectItem>
                                                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label htmlFor="new_start_date">Start Date</Label>
                                                <Input
                                                    id="new_start_date"
                                                    type="date"
                                                    value={newSeasonalRate.start_date}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, start_date: e.target.value }))}
                                                    className="mt-1"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="new_end_date">End Date</Label>
                                                <Input
                                                    id="new_end_date"
                                                    type="date"
                                                    value={newSeasonalRate.end_date}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, end_date: e.target.value }))}
                                                    className="mt-1"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="new_rate_value">
                                                    Rate Value {
                                                        newSeasonalRate.rate_type === 'percentage' ? '(%)' :
                                                            newSeasonalRate.rate_type === 'multiplier' ? '(multiplier)' :
                                                                '(IDR)'
                                                    }
                                                </Label>
                                                <Input
                                                    id="new_rate_value"
                                                    type="number"
                                                    step={newSeasonalRate.rate_type === 'percentage' || newSeasonalRate.rate_type === 'multiplier' ? '0.01' : '1'}
                                                    value={newSeasonalRate.rate_value}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, rate_value: parseFloat(e.target.value) || 0 }))}
                                                    className="mt-1"
                                                    placeholder={newSeasonalRate.rate_type === 'percentage' ? 'e.g., 50 for +50%' : newSeasonalRate.rate_type === 'multiplier' ? 'e.g., 1.5 for 1.5x' : 'e.g., 1000000'}
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="new_extra_bed_rate">Extra Bed Rate (Optional)</Label>
                                                <Input
                                                    id="new_extra_bed_rate"
                                                    type="number"
                                                    step="1"
                                                    value={newSeasonalRate.extra_bed_rate ?? ''}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, extra_bed_rate: e.target.value ? parseFloat(e.target.value) : null }))}
                                                    className="mt-1"
                                                    placeholder="Kosongkan untuk menggunakan tarif property"
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Kosongkan untuk menggunakan extra_bed_rate dari property
                                                </p>
                                            </div>

                                            <div>
                                                <Label htmlFor="new_priority">Priority (0-100)</Label>
                                                <Input
                                                    id="new_priority"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={newSeasonalRate.priority}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, priority: parseInt(e.target.value) || 50 }))}
                                                    className="mt-1"
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Higher priority rates override lower ones
                                                </p>
                                            </div>

                                            <div>
                                                <Label htmlFor="new_min_stay">Minimum Stay (nights)</Label>
                                                <Input
                                                    id="new_min_stay"
                                                    type="number"
                                                    min="1"
                                                    value={newSeasonalRate.min_stay_nights || 1}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, min_stay_nights: parseInt(e.target.value) || 1 }))}
                                                    className="mt-1"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <Label htmlFor="new_description">Description</Label>
                                                <Textarea
                                                    id="new_description"
                                                    value={newSeasonalRate.description}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, description: e.target.value }))}
                                                    className="mt-1"
                                                    placeholder="Optional description for this seasonal rate"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 flex space-x-2">
                                            <Button onClick={editingSeasonalRate ? handleUpdateSeasonalRate : handleCreateSeasonalRate}>
                                                <Save className="w-4 h-4 mr-2" />
                                                {editingSeasonalRate ? 'Update Seasonal Rate' : 'Create Seasonal Rate'}
                                            </Button>
                                            <Button variant="outline" onClick={() => {
                                                setShowAddSeasonalRate(false);
                                                setEditingSeasonalRate(null);
                                                setNewSeasonalRate({
                                                    name: '',
                                                    start_date: '',
                                                    end_date: '',
                                                    rate_type: 'percentage',
                                                    rate_value: 0,
                                                    extra_bed_rate: null,
                                                    priority: 50,
                                                    description: '',
                                                    min_stay_nights: 1,
                                                    applies_to_weekends_only: false,
                                                    is_active: true,
                                                });
                                            }}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="space-y-4">
                                {seasonalRates.map((rate) => (
                                    <Card key={rate.id} className="border-l-4 border-l-brand-primary">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <h4 className="font-semibold">{rate.name}</h4>
                                                        <Badge variant={rate.is_active ? 'default' : 'secondary'}>
                                                            {rate.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {rate.rate_type === 'percentage' ? 'Percentage' :
                                                                rate.rate_type === 'multiplier' ? 'Multiplier' : 'Fixed'}
                                                        </Badge>
                                                        {rate.priority && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                Priority: {rate.priority}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground">Period:</span>
                                                            <div className="font-medium text-foreground">
                                                                {new Date(rate.start_date).toLocaleDateString('id-ID')} - {new Date(rate.end_date).toLocaleDateString('id-ID')}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Rate Value:</span>
                                                            <div className="font-medium text-foreground">{formatRateValue(rate)}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Example Rate:</span>
                                                            <div className="font-medium text-foreground">{formatCurrency(calculateExampleRate(rate))}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Extra Bed Rate:</span>
                                                            <div className="font-medium text-foreground">
                                                                {rate.extra_bed_rate ? formatCurrency(rate.extra_bed_rate) : `Default: ${formatCurrency(property.extra_bed_rate || 0)}`}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Min Stay:</span>
                                                            <div className="font-medium text-foreground">{rate.min_stay_nights || 'No limit'} nights</div>
                                                        </div>
                                                    </div>

                                                    {rate.description && (
                                                        <div className="mt-2 text-sm text-muted-foreground">
                                                            {rate.description}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-2 ml-4">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditSeasonalRate(rate)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteSeasonalRate(rate.id)}
                                                        className="text-destructive hover:text-destructive/80"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {seasonalRates.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <CalendarDays className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                                        <h3 className="text-lg font-medium text-foreground mb-2">No seasonal rates configured</h3>
                                        <p className="text-sm">Add seasonal rates to apply special pricing during peak periods.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rate Calendar */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Rate Calendar</CardTitle>
                            <CardDescription>Visual overview of rates throughout the year</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                                <h3 className="text-lg font-medium text-foreground mb-2">Rate Calendar</h3>
                                <p className="text-sm">Calendar view will be implemented here showing daily rates with seasonal rate overlays.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}