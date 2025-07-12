import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { CleaningTask, Property, User, PaginatedData } from '@/types';
import { 
    Plus, 
    CalendarIcon, 
    Filter, 
    X, 
    MoreHorizontal, 
    Eye, 
    Edit, 
    Play, 
    CheckCircle, 
    ThumbsUp, 
    SearchX,
    AlertCircle,
    Clock,
    CheckSquare,
    Square
} from 'lucide-react';

interface CleaningStats {
    total: number;
    pending: number;
    in_progress: number;
    completed_today: number;
    overdue: number;
}

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
    const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
    const [isBulkActioning, setIsBulkActioning] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Filter states
    const [selectedProperty, setSelectedProperty] = useState(filters.property_id?.toString() || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [selectedTaskType, setSelectedTaskType] = useState(filters.task_type || '');
    const [selectedPriority, setSelectedPriority] = useState(filters.priority || '');
    const [selectedStaff, setSelectedStaff] = useState(filters.assigned_to?.toString() || '');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState<Date | undefined>(
        filters.date_from ? new Date(filters.date_from) : undefined
    );
    const [dateTo, setDateTo] = useState<Date | undefined>(
        filters.date_to ? new Date(filters.date_to) : undefined
    );

    const handleFilter = () => {
        const params = new URLSearchParams();
        
        if (selectedProperty) params.append('property_id', selectedProperty);
        if (selectedStatus) params.append('status', selectedStatus);
        if (selectedTaskType) params.append('task_type', selectedTaskType);
        if (selectedPriority) params.append('priority', selectedPriority);
        if (selectedStaff) params.append('assigned_to', selectedStaff);
        if (searchTerm) params.append('search', searchTerm);
        if (dateFrom) params.append('date_from', format(dateFrom, 'yyyy-MM-dd'));
        if (dateTo) params.append('date_to', format(dateTo, 'yyyy-MM-dd'));

        router.get(route('admin.cleaning-tasks.index'), params.toString());
    };

    const clearFilters = () => {
        setSelectedProperty('');
        setSelectedStatus('');
        setSelectedTaskType('');
        setSelectedPriority('');
        setSelectedStaff('');
        setSearchTerm('');
        setDateFrom(undefined);
        setDateTo(undefined);
        router.get(route('admin.cleaning-tasks.index'));
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
            assigned: { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' },
            in_progress: { variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800' },
            review_required: { variant: 'secondary' as const, className: 'bg-purple-100 text-purple-800' },
            completed: { variant: 'secondary' as const, className: 'bg-green-100 text-green-800' },
            cancelled: { variant: 'secondary' as const, className: 'bg-red-100 text-red-800' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

        return (
            <Badge variant={config.variant} className={config.className}>
                {statuses[status] || status}
            </Badge>
        );
    };

    const getPriorityBadge = (priority: string, isOverdue: boolean = false) => {
        const priorityConfig = {
            low: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800' },
            normal: { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' },
            high: { variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800' },
            urgent: { variant: 'secondary' as const, className: 'bg-red-100 text-red-800' },
        };

        const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;

        return (
            <Badge variant={config.variant} className={config.className}>
                {priorities[priority] || priority}
                {isOverdue && <Clock className="ml-1 h-3 w-3" />}
            </Badge>
        );
    };

    const handleTaskAction = async (taskId: number, action: string) => {
        try {
            setErrorMessage('');
            setSuccessMessage('');

            const urls: Record<string, string> = {
                start: route('admin.cleaning-tasks.start', taskId),
                complete: route('admin.cleaning-tasks.complete', taskId),
                approve: route('admin.cleaning-tasks.approve', taskId),
            };

            if (urls[action]) {
                await router.post(urls[action], {}, {
                    onSuccess: () => {
                        setSuccessMessage(`Task ${action}ed successfully!`);
                        setTimeout(() => setSuccessMessage(''), 3000);
                    },
                    onError: (errors) => {
                        setErrorMessage(errors.error || `Failed to ${action} task`);
                        setTimeout(() => setErrorMessage(''), 5000);
                    }
                });
            }
        } catch (error) {
            console.error('Error handling task action:', error);
            setErrorMessage('An error occurred while processing the action');
            setTimeout(() => setErrorMessage(''), 5000);
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedTasks.length === 0) {
            setErrorMessage('Please select tasks to perform bulk action');
            return;
        }

        setIsBulkActioning(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            await router.post(route('admin.cleaning-tasks.bulk-action'), {
                task_ids: selectedTasks,
                action: action
            }, {
                onSuccess: () => {
                    setSuccessMessage(`Bulk ${action} completed successfully!`);
                    setSelectedTasks([]);
                    setTimeout(() => setSuccessMessage(''), 3000);
                },
                onError: (errors) => {
                    setErrorMessage(errors.error || `Failed to perform bulk ${action}`);
                    setTimeout(() => setErrorMessage(''), 5000);
                }
            });
        } catch (error) {
            console.error('Error handling bulk action:', error);
            setErrorMessage('An error occurred while processing bulk action');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setIsBulkActioning(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedTasks.length === tasks.data.length) {
            setSelectedTasks([]);
        } else {
            setSelectedTasks(tasks.data.map(task => task.id));
        }
    };

    const handleSelectTask = (taskId: number) => {
        setSelectedTasks(prev => 
            prev.includes(taskId) 
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
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

                {/* Messages */}
                {errorMessage && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}

                {successMessage && (
                    <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
                    </Alert>
                )}

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                            <Icon iconNode={CheckSquare} className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending</CardTitle>
                            <Icon iconNode={Clock} className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pending}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                            <Icon iconNode={Play} className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.in_progress}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                            <Icon iconNode={CheckCircle} className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.completed_today}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                            <Icon iconNode={AlertCircle} className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.overdue}</div>
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
                                <Label htmlFor="search">Search</Label>
                                <Input
                                    id="search"
                                    placeholder="Search tasks..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="property">Property</Label>
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
                                <Label htmlFor="status">Status</Label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Statuses</SelectItem>
                                        {Object.entries(statuses).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                {value}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Priorities" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Priorities</SelectItem>
                                        {Object.entries(priorities).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                {value}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="task_type">Task Type</Label>
                                <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Types</SelectItem>
                                        {Object.entries(taskTypes).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                {value}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="assigned_to">Assigned To</Label>
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
                                <Label htmlFor="date_from">Date From</Label>
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
                                <Label htmlFor="date_to">Date To</Label>
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

                {/* Bulk Actions */}
                {selectedTasks.length > 0 && (
                    <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <CheckSquare className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                        {selectedTasks.length} task(s) selected
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBulkAction('assign')}
                                        disabled={isBulkActioning}
                                    >
                                        Assign
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBulkAction('start')}
                                        disabled={isBulkActioning}
                                    >
                                        Start
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBulkAction('complete')}
                                        disabled={isBulkActioning}
                                    >
                                        Complete
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedTasks([])}
                                    >
                                        Clear Selection
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

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
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedTasks.length === tasks.data.length && tasks.data.length > 0}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
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
                                            <Checkbox
                                                checked={selectedTasks.includes(task.id)}
                                                onCheckedChange={() => handleSelectTask(task.id)}
                                            />
                                        </TableCell>
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