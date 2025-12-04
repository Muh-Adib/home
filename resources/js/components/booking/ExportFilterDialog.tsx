import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { type Property } from '@/types';

interface ExportFilterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    properties: Property[];
    onExport: (filters: ExportFilters) => void;
}

export interface ExportFilters {
    date_from?: string;
    date_to?: string;
    property_id?: string;
    status?: string;
}

export function ExportFilterDialog({ open, onOpenChange, properties, onExport }: ExportFilterDialogProps) {
    const [dateFrom, setDateFrom] = useState<Date>();
    const [dateTo, setDateTo] = useState<Date>();
    const [propertyId, setPropertyId] = useState<string>('all');
    const [status, setStatus] = useState<string>('all');

    const handleExport = () => {
        const filters: ExportFilters = {};

        if (dateFrom) {
            filters.date_from = format(dateFrom, 'yyyy-MM-dd');
        }
        if (dateTo) {
            filters.date_to = format(dateTo, 'yyyy-MM-dd');
        }
        if (propertyId !== 'all') {
            filters.property_id = propertyId;
        }
        if (status !== 'all') {
            filters.status = status;
        }

        onExport(filters);
        onOpenChange(false);
    };

    const handleReset = () => {
        setDateFrom(undefined);
        setDateTo(undefined);
        setPropertyId('all');
        setStatus('all');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Export Bookings</DialogTitle>
                    <DialogDescription>
                        Select filters to export bookings. Leave filters empty to export all bookings.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Date Range */}
                    <div className="grid gap-2">
                        <Label>Date Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'justify-start text-left font-normal',
                                            !dateFrom && 'text-muted-foreground'
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateFrom ? format(dateFrom, 'PPP') : 'From date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dateFrom}
                                        onSelect={setDateFrom}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'justify-start text-left font-normal',
                                            !dateTo && 'text-muted-foreground'
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateTo ? format(dateTo, 'PPP') : 'To date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dateTo}
                                        onSelect={setDateTo}
                                        initialFocus
                                        disabled={(date) => dateFrom ? date < dateFrom : false}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Property Filter */}
                    <div className="grid gap-2">
                        <Label htmlFor="property">Property</Label>
                        <Select value={propertyId} onValueChange={setPropertyId}>
                            <SelectTrigger id="property">
                                <SelectValue placeholder="All Properties" />
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
                    </div>

                    {/* Status Filter */}
                    <div className="grid gap-2">
                        <Label htmlFor="status">Booking Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending_verification">Pending Verification</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="checked_in">Checked In</SelectItem>
                                <SelectItem value="checked_out">Checked Out</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleReset}>
                        Reset Filters
                    </Button>
                    <Button type="button" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export to Excel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
