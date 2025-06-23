import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { CleaningSchedule, Property, User, PaginatedData } from '@/types';
import { 
    Calendar, 
    Clock, 
    Play, 
    Pause, 
    Plus, 
    MoreHorizontal, 
    Edit, 
    Eye, 
    Trash, 
    Settings,
    Filter,
    X,
    Search,
    PlayCircle,
    PauseCircle,
    CheckCircle
} from 'lucide-react';

interface Props {
    schedules: PaginatedData<CleaningSchedule>;
    properties: Property[];
    staff: User[];
    stats: {
        total_schedules: number;
        active_schedules: number;
        due_for_generation: number;
        auto_generate_enabled: number;
        expired_schedules: number;
    };
    filters: {
        property_id?: number;
        schedule_type?: string;
        frequency?: string;
        status?: string;
        search?: string;
    };
    scheduleTypes: Record<string, string>;
    frequencies: Record<string, string>;
    priorities: Record<string, string>;
}

export default function CleaningSchedulesIndex({ 
    schedules, 
    properties, 
    staff, 
    stats, 
    filters, 
    scheduleTypes, 
    frequencies, 
    priorities 
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedProperty, setSelectedProperty] = useState(filters.property_id?.toString() || '');
    const [selectedType, setSelectedType] = useState(filters.schedule_type || '');
    const [selectedFrequency, setSelectedFrequency] = useState(filters.frequency || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');

    const handleFilter = () => {
        const params = new URLSearchParams();
        
        if (search) params.append('search', search);
        if (selectedProperty) params.append('property_id', selectedProperty);
        if (selectedType) params.append('schedule_type', selectedType);
        if (selectedFrequency) params.append('frequency', selectedFrequency);
        if (selectedStatus) params.append('status', selectedStatus);
        
        router.get(route('admin.cleaning-schedules.index'), Object.fromEntries(params));
    };

    const clearFilters = () => {
        setSearch('');
        setSelectedProperty('');
        setSelectedType('');
        setSelectedFrequency('');
        setSelectedStatus('');
        router.get(route('admin.cleaning-schedules.index'));
    };

    const getStatusBadge = (schedule: CleaningSchedule) => {
        if (schedule.status === 'inactive') {
            return <Badge variant="secondary">Inactive</Badge>;
        }
        
        if (schedule.status === 'completed') {
            return <Badge variant="destructive">Expired</Badge>;
        }
        
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
    };

    const getFrequencyBadge = (frequency: string) => {
        const colors: Record<string, string> = {
            daily: 'bg-blue-100 text-blue-800',
            weekly: 'bg-green-100 text-green-800',
            biweekly: 'bg-yellow-100 text-yellow-800',
            monthly: 'bg-purple-100 text-purple-800',
            quarterly: 'bg-orange-100 text-orange-800',
            yearly: 'bg-red-100 text-red-800',
        };

        return (
            <Badge variant="outline" className={colors[frequency]}>
                {frequencies[frequency] || frequency}
            </Badge>
        );
    };

    const handleScheduleAction = (scheduleId: number, action: string) => {
        const urls: Record<string, string> = {
            activate: route('admin.cleaning-schedules.activate', scheduleId),
            deactivate: route('admin.cleaning-schedules.deactivate', scheduleId),
        };

        if (urls[action]) {
            router.post(urls[action]);
        }
    };

    const handleGenerateTasks = (scheduleId: number) => {
        router.post(route('admin.cleaning-schedules.generate-tasks', scheduleId), {
            days: 30, // Generate for next 30 days
        });
    };

    return (
        <AppLayout>
            <Head title="Cleaning Schedules" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Cleaning Schedules</h1>
                        <p className="text-muted-foreground">
                            Manage automated cleaning schedules and task generation
                        </p>
                    </div>
                    <Link href={route('admin.cleaning-schedules.create')}>
                        <Button>
                            <Icon iconNode={Plus} className="mr-2 h-4 w-4" />
                            New Schedule
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
                            <Icon iconNode={Calendar} className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_schedules}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active</CardTitle>
                            <Icon iconNode={PlayCircle} className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.active_schedules}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Auto-Generate</CardTitle>
                            <Icon iconNode={Settings} className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{stats.auto_generate_enabled}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Due Generation</CardTitle>
                            <Icon iconNode={Clock} className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{stats.due_for_generation}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Expired</CardTitle>
                            <Icon iconNode={PauseCircle} className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.expired_schedules}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                        <CardDescription>Filter schedules by various criteria</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Search</label>
                                <Input
                                    placeholder="Search schedules..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Property</label>
                                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Properties" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Properties</SelectItem>
                                        {properties.map((property) => (
                                            <SelectItem key={property.id} value={property.id.toString()}>
                                                {property.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Schedule Type</label>
                                <Select value={selectedType} onValueChange={setSelectedType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Types</SelectItem>
                                        {Object.entries(scheduleTypes).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Frequency</label>
                                <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Frequencies" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Frequencies</SelectItem>
                                        {Object.entries(frequencies).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Statuses</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-4">
                            <Button onClick={handleFilter}>
                                <Icon iconNode={Filter} className="mr-2 h-4 w-4" />
                                Apply
                            </Button>
                            <Button variant="outline" onClick={clearFilters}>
                                <Icon iconNode={X} className="mr-2 h-4 w-4" />
                                Clear
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Schedules Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Schedules</CardTitle>
                        <CardDescription>
                            Showing {schedules.from} to {schedules.to} of {schedules.total} schedules
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Schedule</TableHead>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Type & Frequency</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Next Generation</TableHead>
                                    <TableHead>Auto Generate</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schedules.data.map((schedule) => (
                                    <TableRow key={schedule.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{schedule.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {schedule.description}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{schedule.property?.name}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <Badge variant="outline">{schedule.schedule_type_name}</Badge>
                                                {schedule.frequency && getFrequencyBadge(schedule.frequency)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(schedule)}
                                        </TableCell>
                                        <TableCell>
                                            {schedule.next_generation_date ? (
                                                <div className="text-sm">
                                                    {format(new Date(schedule.next_generation_date), 'PPP', { locale: id })}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={schedule.auto_generate_tasks ? "default" : "secondary"}>
                                                {schedule.auto_generate_tasks ? "Yes" : "No"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <Icon iconNode={MoreHorizontal} className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('admin.cleaning-schedules.show', schedule.id)}>
                                                            <Icon iconNode={Eye} className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('admin.cleaning-schedules.edit', schedule.id)}>
                                                            <Icon iconNode={Edit} className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    
                                                    {schedule.is_active ? (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleScheduleAction(schedule.id, 'deactivate')}
                                                        >
                                                            <Icon iconNode={Pause} className="mr-2 h-4 w-4" />
                                                            Deactivate
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleScheduleAction(schedule.id, 'activate')}
                                                        >
                                                            <Icon iconNode={Play} className="mr-2 h-4 w-4" />
                                                            Activate
                                                        </DropdownMenuItem>
                                                    )}
                                                    
                                                    <DropdownMenuItem 
                                                        onClick={() => handleGenerateTasks(schedule.id)}
                                                    >
                                                        <Icon iconNode={CheckCircle} className="mr-2 h-4 w-4" />
                                                        Generate Tasks
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {schedules.data.length === 0 && (
                            <div className="text-center py-8">
                                <Icon iconNode={Search} className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900">No schedules found</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Try adjusting your search criteria or create a new schedule.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
} 