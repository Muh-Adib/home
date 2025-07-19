import React, { useState, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
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
    const [newSeasonalRate, setNewSeasonalRate] = useState({
        name: '',
        start_date: '',
        end_date: '',
        rate_type: 'percentage' as 'fixed' | 'percentage',
        rate_value: 0,
        description: '',
        min_stay_nights: null as number | null,
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
                        description: '',
                        min_stay_nights: null,
                        applies_to_weekends_only: false,
                        is_active: true,
                    });
                },
            });
        } catch (error) {
            console.error('Failed to create seasonal rate:', error);
        }
    }, [newSeasonalRate, property.id]);

    const handleDeleteSeasonalRate = useCallback(async (seasonalRateId: number) => {
        if (confirm('Are you sure you want to delete this seasonal rate?')) {
            try {
                await router.delete(route('admin.rate-management.seasonal-rates.delete', seasonalRateId));
            } catch (error) {
                console.error('Failed to delete seasonal rate:', error);
            }
        }
    }, []);

    const formatRateValue = (rate: PropertySeasonalRate) => {
        return rate.rate_type === 'percentage' 
            ? `${rate.rate_value}%`
            : formatCurrency(rate.rate_value);
    };

    const calculateExampleRate = (rate: PropertySeasonalRate) => {
        const baseRate = property.base_rate;
        if (rate.rate_type === 'percentage') {
            return baseRate + (baseRate * rate.rate_value / 100);
        }
        return rate.rate_value;
    };

    return (
        <AuthenticatedLayout>
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
                                <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                                <p className="text-gray-600">Manage rates, seasonal pricing, and calendar view</p>
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
                                    <span className="text-sm text-gray-500">Address</span>
                                    <div className="font-medium">{property.address}</div>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Capacity</span>
                                    <div className="font-medium">{property.capacity}-{property.capacity_max} guests</div>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Status</span>
                                    <div>
                                        <Badge variant={property.status === 'active' ? 'success' : 'secondary'}>
                                            {property.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Seasonal Rates</span>
                                    <div className="font-medium">{seasonalRates.length} active</div>
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
                            {showAddSeasonalRate && (
                                <Card className="mb-4 border-dashed">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Add New Seasonal Rate</CardTitle>
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
                                                <select
                                                    id="new_rate_type"
                                                    value={newSeasonalRate.rate_type}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, rate_type: e.target.value as 'fixed' | 'percentage' }))}
                                                    className="w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                >
                                                    <option value="percentage">Percentage</option>
                                                    <option value="fixed">Fixed Amount</option>
                                                </select>
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
                                                    Rate Value {newSeasonalRate.rate_type === 'percentage' ? '(%)' : '(IDR)'}
                                                </Label>
                                                <Input
                                                    id="new_rate_value"
                                                    type="number"
                                                    value={newSeasonalRate.rate_value}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, rate_value: parseFloat(e.target.value) || 0 }))}
                                                    className="mt-1"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="new_min_stay">Minimum Stay (nights)</Label>
                                                <Input
                                                    id="new_min_stay"
                                                    type="number"
                                                    value={newSeasonalRate.min_stay_nights || ''}
                                                    onChange={(e) => setNewSeasonalRate(prev => ({ ...prev, min_stay_nights: e.target.value ? parseInt(e.target.value) : null }))}
                                                    className="mt-1"
                                                    placeholder="Optional"
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
                                            <Button onClick={handleCreateSeasonalRate}>
                                                <Save className="w-4 h-4 mr-2" />
                                                Create Seasonal Rate
                                            </Button>
                                            <Button variant="outline" onClick={() => setShowAddSeasonalRate(false)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="space-y-4">
                                {seasonalRates.map((rate) => (
                                    <Card key={rate.id} className="border-l-4 border-l-blue-500">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <h4 className="font-semibold">{rate.name}</h4>
                                                        <Badge variant={rate.is_active ? 'success' : 'secondary'}>
                                                            {rate.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {rate.rate_type === 'percentage' ? 'Percentage' : 'Fixed'}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-500">Period:</span>
                                                            <div className="font-medium">
                                                                {new Date(rate.start_date).toLocaleDateString()} - {new Date(rate.end_date).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Rate Value:</span>
                                                            <div className="font-medium">{formatRateValue(rate)}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Example Rate:</span>
                                                            <div className="font-medium">{formatCurrency(calculateExampleRate(rate))}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Min Stay:</span>
                                                            <div className="font-medium">{rate.min_stay_nights || 'No limit'}</div>
                                                        </div>
                                                    </div>

                                                    {rate.description && (
                                                        <div className="mt-2 text-sm text-gray-600">
                                                            {rate.description}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center space-x-2 ml-4">
                                                    <Button variant="outline" size="sm">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => handleDeleteSeasonalRate(rate.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {seasonalRates.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-lg font-medium mb-2">No seasonal rates configured</h3>
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
                            <div className="text-center py-8 text-gray-500">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-medium mb-2">Rate Calendar</h3>
                                <p className="text-sm">Calendar view will be implemented here showing daily rates with seasonal rate overlays.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}