import React, { useState, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    CalendarDays, 
    DollarSign, 
    TrendingUp, 
    Settings,
    Search,
    Eye,
    Edit,
    Plus
} from 'lucide-react';
import AdminLayout from '@/layouts/admin-layout';
import { Property, PropertySeasonalRate } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
    properties: {
        data: Array<Property & {
            seasonal_rates?: PropertySeasonalRate[];
            active_seasonal_rates_count?: number;
            upcoming_seasonal_rates_count?: number;
            current_seasonal_rate?: PropertySeasonalRate;
        }>;
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export default function RateManagementIndex({ properties }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'with_seasonal' | 'without_seasonal'>('all');

    const filteredProperties = properties.data.filter(property => {
        const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             property.address.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFilter = statusFilter === 'all' ||
                             (statusFilter === 'active' && property.status === 'active') ||
                             (statusFilter === 'with_seasonal' && (property.active_seasonal_rates_count || 0) > 0) ||
                             (statusFilter === 'without_seasonal' && (property.active_seasonal_rates_count || 0) === 0);
        
        return matchesSearch && matchesFilter;
    });

    const handleViewRates = useCallback((property: Property & { id: number }) => {
        router.visit(`/admin/rate-management/properties/${property.id}`);
    }, []);

    const handleEditProperty = useCallback((property: Property) => {
        router.visit(route('admin.properties.edit', property.slug));
    }, []);

    const getSeasonalRateStatus = (property: Property & { current_seasonal_rate?: PropertySeasonalRate; active_seasonal_rates_count?: number }) => {
        if (property.current_seasonal_rate) {
            return {
                text: 'Active Season',
                variant: 'success' as const,
                description: property.current_seasonal_rate.name
            };
        }
        
        if ((property.active_seasonal_rates_count || 0) > 0) {
            return {
                text: 'Has Seasonal Rates',
                variant: 'secondary' as const,
                description: `${property.active_seasonal_rates_count} active rates`
            };
        }
        
        return {
            text: 'Base Rate Only',
            variant: 'outline' as const,
            description: 'No seasonal rates configured'
        };
    };

    return (
        <AdminLayout>
            <Head title="Rate Management" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Rate Management</h1>
                                <p className="text-muted-foreground">Manage property rates, seasonal pricing, and rate calendars</p>
                            </div>
                            <div className="flex space-x-3">
                                <Button variant="outline" onClick={() => router.reload()}>
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Refresh Data
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                                <Settings className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{properties.total}</div>
                                <p className="text-xs text-muted-foreground">Properties under management</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">With Seasonal Rates</CardTitle>
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {properties.data.filter(p => (p.active_seasonal_rates_count || 0) > 0).length}
                                </div>
                                <p className="text-xs text-muted-foreground">Properties with active seasonal rates</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Base Rate Only</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {properties.data.filter(p => (p.active_seasonal_rates_count || 0) === 0).length}
                                </div>
                                <p className="text-xs text-muted-foreground">Properties without seasonal rates</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Seasons</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {properties.data.filter(p => p.current_seasonal_rate).length}
                                </div>
                                <p className="text-xs text-muted-foreground">Properties in active season</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-lg">Search & Filter Properties</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                        <Input
                                            type="text"
                                            placeholder="Search properties..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <div className="sm:w-48">
                                    <Select
                                        value={statusFilter}
                                        onValueChange={(value: 'all' | 'active' | 'with_seasonal' | 'without_seasonal') => setStatusFilter(value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Properties</SelectItem>
                                            <SelectItem value="active">Active Properties</SelectItem>
                                            <SelectItem value="with_seasonal">With Seasonal Rates</SelectItem>
                                            <SelectItem value="without_seasonal">Base Rate Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Properties List */}
                    <div className="grid gap-4">
                        {filteredProperties.map((property) => {
                            const seasonalStatus = getSeasonalRateStatus(property);
                            
                            return (
                                <Card key={property.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-foreground">
                                                        {property.name}
                                                    </h3>
                                                    <Badge 
                                                        variant={property.status === 'active' ? 'default' : 'secondary'}
                                                    >
                                                        {property.status}
                                                    </Badge>
                                                    <Badge variant={seasonalStatus.variant === 'success' ? 'default' : seasonalStatus.variant}>
                                                        {seasonalStatus.text}
                                                    </Badge>
                                                </div>
                                                
                                                <p className="text-muted-foreground text-sm mb-3">{property.address}</p>
                                                
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Base Rate:</span>
                                                        <div className="font-semibold text-foreground">{formatCurrency(property.base_rate)}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Weekend Premium:</span>
                                                        <div className="font-semibold text-foreground">{property.weekend_premium_percent || 0}%</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Active Rates:</span>
                                                        <div className="font-semibold text-foreground">{property.active_seasonal_rates_count || 0}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Capacity:</span>
                                                        <div className="font-semibold text-foreground">{property.capacity}-{property.capacity_max} guests</div>
                                                    </div>
                                                </div>

                                                {seasonalStatus.description && (
                                                    <div className="mt-2 text-sm text-muted-foreground">
                                                        {seasonalStatus.description}
                                                    </div>
                                                )}

                                                {/* Show seasonal rates list if available */}
                                                {property.seasonal_rates && property.seasonal_rates.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <div className="text-xs text-muted-foreground mb-2">Seasonal Rates:</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {property.seasonal_rates.slice(0, 3).map((rate) => (
                                                                <Badge 
                                                                    key={rate.id} 
                                                                    variant={rate.is_active ? 'default' : 'secondary'}
                                                                    className="text-xs"
                                                                >
                                                                    {rate.name} ({rate.start_date} - {rate.end_date})
                                                                </Badge>
                                                            ))}
                                                            {property.seasonal_rates.length > 3 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    +{property.seasonal_rates.length - 3} more
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center space-x-2 ml-4">
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleViewRates(property)}
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Manage Rates
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditProperty(property)}
                                                >
                                                    <Edit className="w-4 h-4 mr-1" />
                                                    Edit Property
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {filteredProperties.length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground mb-2">No properties found</h3>
                                <p className="text-muted-foreground">
                                    {searchTerm ? 'Try adjusting your search criteria.' : 'No properties match the selected filter.'}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pagination */}
                    {properties.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing {((properties.current_page - 1) * properties.per_page) + 1} to{' '}
                                {Math.min(properties.current_page * properties.per_page, properties.total)} of{' '}
                                {properties.total} results
                            </div>
                            
                            <div className="flex space-x-2">
                                {properties.current_page > 1 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => router.visit(route('admin.rate-management.index', { page: properties.current_page - 1 }))}
                                    >
                                        Previous
                                    </Button>
                                )}
                                
                                {properties.current_page < properties.last_page && (
                                    <Button
                                        variant="outline"
                                        onClick={() => router.visit(route('admin.rate-management.index', { page: properties.current_page + 1 }))}
                                    >
                                        Next
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}