import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
    Search, 
    Filter, 
    X,
    Calendar,
    Building2,
    Users,
    DollarSign
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { type Property } from '@/types';

interface BookingFiltersProps {
    filters: {
        search?: string;
        status?: string;
        payment_status?: string;
        property_id?: string;
        sort?: string;
        date_from?: string;
        date_to?: string;
    };
    properties: Property[];
    totalBookings: number;
    onFiltersChange: (filters: any) => void;
}

export default function BookingFilters({ 
    filters, 
    properties, 
    totalBookings,
    onFiltersChange 
}: BookingFiltersProps) {
    const [localFilters, setLocalFilters] = useState(filters);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
    };

    const handleApplyFilters = () => {
        onFiltersChange(localFilters);
    };

    const handleClearFilters = () => {
        const clearedFilters = {
            search: '',
            status: 'all',
            payment_status: 'all',
            property_id: 'all',
            sort: 'latest',
            date_from: '',
            date_to: ''
        };
        setLocalFilters(clearedFilters);
        onFiltersChange(clearedFilters);
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (localFilters.search) count++;
        if (localFilters.status && localFilters.status !== 'all') count++;
        if (localFilters.payment_status && localFilters.payment_status !== 'all') count++;
        if (localFilters.property_id && localFilters.property_id !== 'all') count++;
        if (localFilters.date_from) count++;
        if (localFilters.date_to) count++;
        return count;
    };

    const activeFiltersCount = getActiveFiltersCount();

    return (
        <Card className="mb-6">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters & Search
                        </CardTitle>
                        {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {activeFiltersCount} active
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? 'Hide' : 'Show'} Advanced
                        </Button>
                        {activeFiltersCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearFilters}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear All
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {/* Quick Search */}
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search bookings by guest name, email, or booking number..."
                            value={localFilters.search || ''}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={handleApplyFilters} className="px-6">
                        Search
                    </Button>
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap gap-2">
                    <Select 
                        value={localFilters.status || 'all'} 
                        onValueChange={(value) => handleFilterChange('status', value)}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending_verification">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="checked_in">Checked In</SelectItem>
                            <SelectItem value="checked_out">Checked Out</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select 
                        value={localFilters.payment_status || 'all'} 
                        onValueChange={(value) => handleFilterChange('payment_status', value)}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Payment" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Payments</SelectItem>
                            <SelectItem value="dp_pending">DP Pending</SelectItem>
                            <SelectItem value="dp_paid">DP Paid</SelectItem>
                            <SelectItem value="fully_paid">Fully Paid</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select 
                        value={localFilters.property_id || 'all'} 
                        onValueChange={(value) => handleFilterChange('property_id', value)}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Property" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Properties</SelectItem>
                            {properties.map((property) => (
                                <SelectItem key={property.id} value={property.id.toString()}>
                                    {property.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select 
                        value={localFilters.sort || 'latest'} 
                        onValueChange={(value) => handleFilterChange('sort', value)}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="latest">Latest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="check_in">Check-in Date</SelectItem>
                            <SelectItem value="amount">Amount</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Advanced Filters */}
                {isExpanded && (
                    <div className="pt-4 border-t space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Date From
                                </label>
                                <Input
                                    type="date"
                                    value={localFilters.date_from || ''}
                                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Date To
                                </label>
                                <Input
                                    type="date"
                                    value={localFilters.date_to || ''}
                                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing {totalBookings} bookings
                            </div>
                            <Button onClick={handleApplyFilters} className="px-6">
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 