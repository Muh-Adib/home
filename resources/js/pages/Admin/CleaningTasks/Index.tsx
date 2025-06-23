import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { CleaningTask, Property, User, PaginatedData, CleaningStats } from '@/types';
import { CheckCircle, Edit, Eye, MoreHorizontal, ThumbsUp, Play, SearchX, Filter, X, Clock, ListChecks, Plus, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
    tasks: PaginatedData<CleaningTask>;
    properties: Property[];
    staff: User[];
    stats: CleaningStats;
    filters: {
        property_id?: number;
        status?: string;
        task_type?: string;
        priority?: string;
        assigned_to?: number;
        date_from?: string;
        date_to?: string;
        search?: string;
    };
    taskTypes: Record<string, string>;
    priorities: Record<string, string>;
    statuses: Record<string, string>;
}

export default function CleaningTasksIndex({ 
    tasks, 
    properties, 
    staff, 
    stats, 
    filters, 
    taskTypes, 
    priorities, 
    statuses 
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedProperty, setSelectedProperty] = useState(filters.property_id?.toString() || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [selectedPriority, setSelectedPriority] = useState(filters.priority || '');
    const [selectedStaff, setSelectedStaff] = useState(filters.assigned_to?.toString() || '');
    const [dateFrom, setDateFrom] = useState<Date | undefined>(
        filters.date_from ? new Date(filters.date_from) : undefined
    );
    const [dateTo, setDateTo] = useState<Date | undefined>(
        filters.date_to ? new Date(filters.date_to) : undefined
    );

    const handleFilter = () => {
        const params = new URLSearchParams();
        
        if (search) params.append('search', search);
        if (selectedProperty) params.append('property_id', selectedProperty);
        if (selectedStatus) params.append('status', selectedStatus);
        if (selectedPriority) params.append('priority', selectedPriority);
        if (selectedStaff) params.append('assigned_to', selectedStaff);
        if (dateFrom) params.append('date_from', format(dateFrom, 'yyyy-MM-dd'));
        if (dateTo) params.append('date_to', format(dateTo, 'yyyy-MM-dd'));
        
        router.get(route('admin.cleaning-tasks.index'), Object.fromEntries(params));
    };

    const clearFilters = () => {
        setSearch('');
        setSelectedProperty('');
        setSelectedStatus('');
        setSelectedPriority('');
        setSelectedStaff('');
        setDateFrom(undefined);
        setDateTo(undefined);
        router.get(route('admin.cleaning-tasks.index'));
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'outline',
            assigned: 'secondary',
            in_progress: 'default',
            review_required: 'secondary',
            completed: 'default',
            cancelled: 'destructive',
        };
        
        const colors: Record<string, string> = {
            pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
            assigned: 'text-blue-700 bg-blue-50 border-blue-200',
            in_progress: 'text-orange-700 bg-orange-50 border-orange-200',
            review_required: 'text-purple-700 bg-purple-50 border-purple-200',
            completed: 'text-green-700 bg-green-50 border-green-200',
            cancelled: 'text-red-700 bg-red-50 border-red-200',
        };

        return (
            <Badge variant={variants[status] || 'outline'} className={colors[status]}>
                {statuses[status] || status}
            </Badge>
        );
    };

    const getPriorityBadge = (priority: string, isOverdue: boolean = false) => {
        if (isOverdue) {
            return <Badge variant="destructive" className="animate-pulse">OVERDUE</Badge>;
        }

        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            low: 'outline',
            normal: 'secondary',
            high: 'default',
            urgent: 'destructive',
        };

        return (
            <Badge variant={variants[priority] || 'outline'}>
                {priorities[priority] || priority}
            </Badge>
        );
    };

    const handleTaskAction = (taskId: number, action: string) => {
        const urls: Record<string, string> = {
            start: route('admin.cleaning-tasks.start', taskId),
            complete: route('admin.cleaning-tasks.complete', taskId),
            approve: route('admin.cleaning-tasks.approve', taskId),
        };

        if (urls[action]) {
            router.post(urls[action]);
        }
    };

    return (
        <AppLayout>
            <Head title="Cleaning Tasks" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Cleaning Tasks</h1>
                        <p className="text-muted-foreground">
                            Manage cleaning tasks and schedules across properties
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Link href={route('admin.cleaning-schedules.index')}>
                            <Button variant="outline">
                                <Icon iconNode={CalendarIcon} className="mr-2 h-4 w-4" />
                                Schedules
                            </Button>
                        </Link>
                        <Link href={route('admin.cleaning-tasks.create')}>
                            <Button>
                                <Icon iconNode={Plus} className="mr-2 h-4 w-4" />
                                New Task
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                            <Icon iconNode={ListChecks} className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_tasks}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending</CardTitle>
                            <Icon iconNode={Clock} className="h-4 w-4 text-yellow-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{stats.pending_tasks}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                            <Icon iconNode={Play} className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{stats.in_progress_tasks}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                            <Icon iconNode={CheckCircle} className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.completed_today}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                            <Icon iconNode={AlertTriangle} className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.overdue_tasks}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                        <CardDescription>Filter tasks by various criteria</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Search</label>
                                <Input
                                    placeholder="Search tasks..."
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
                                <label className="text-sm font-medium">Status</label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Statuses</SelectItem>
                                        {Object.entries(statuses).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Priority</label>
                                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Priorities" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Priorities</SelectItem>
                                        {Object.entries(priorities).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Assigned To</label>
                                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Staff" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Staff</SelectItem>
                                        {staff.map((member) => (
                                            <SelectItem key={member.id} value={member.id.toString()}>
                                                {member.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date From</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <Icon iconNode={CalendarIcon} className="mr-2 h-4 w-4" />
                                            {dateFrom ? format(dateFrom, 'PPP', { locale: id }) : 'Pick a date'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateFrom}
                                            onSelect={setDateFrom}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date To</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <Icon iconNode={CalendarIcon} className="mr-2 h-4 w-4" />
                                            {dateTo ? format(dateTo, 'PPP', { locale: id }) : 'Pick a date'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateTo}
                                            onSelect={setDateTo}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            
                            <div className="flex items-end space-x-2">
                                <Button onClick={handleFilter}>
                                    <Icon iconNode={Filter} className="mr-2 h-4 w-4" />
                                    Apply
                                </Button>
                                <Button variant="outline" onClick={clearFilters}>
                                    <Icon iconNode={X} className="mr-2 h-4 w-4" />
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tasks Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tasks</CardTitle>
                        <CardDescription>
                            Showing {tasks.from} to {tasks.to} of {tasks.total} tasks
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                    <TableHead>Scheduled</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.data.map((task) => (
                                    <TableRow key={task.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{task.title}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {task.task_number} • {taskTypes[task.task_type]}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{task.property?.name}</div>
                                        </TableCell>
                                        <TableCell>
                                            {task.assigned_to_user?.name || 'Unassigned'}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">
                                                    {format(new Date(task.scheduled_date), 'PPP', { locale: id })}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {format(new Date(task.scheduled_date), 'p', { locale: id })}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getPriorityBadge(task.priority, task.is_overdue)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(task.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-600 h-2 rounded-full" 
                                                        style={{ width: `${task.completion_percentage || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {task.completion_percentage || 0}%
                                                </span>
                                            </div>
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
                                                        <Link href={route('admin.cleaning-tasks.show', task.id)}>
                                                            <Icon iconNode={Eye} className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    
                                                    {task.status === 'assigned' && (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleTaskAction(task.id, 'start')}
                                                        >
                                                            <Icon iconNode={Play} className="mr-2 h-4 w-4" />
                                                            Start Task
                                                        </DropdownMenuItem>
                                                    )}
                                                    
                                                    {task.status === 'in_progress' && (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleTaskAction(task.id, 'complete')}
                                                        >
                                                            <Icon iconNode={CheckCircle} className="mr-2 h-4 w-4" />
                                                            Complete Task
                                                        </DropdownMenuItem>
                                                    )}
                                                    
                                                    {task.status === 'review_required' && (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleTaskAction(task.id, 'approve')}
                                                        >
                                                            <Icon iconNode={ThumbsUp} className="mr-2 h-4 w-4" />
                                                            Approve Task
                                                        </DropdownMenuItem>
                                                    )}
                                                    
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('admin.cleaning-tasks.edit', task.id)}>
                                                            <Icon iconNode={Edit} className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {tasks.data.length === 0 && (
                            <div className="text-center py-8">
                                <Icon iconNode={SearchX} className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900">No tasks found</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Try adjusting your search criteria or create a new task.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}