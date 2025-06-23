import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/icon';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { Property, User, Booking } from '@/types';
import { CalendarIcon, Plus, X, ArrowLeft, Save } from 'lucide-react';

interface Props {
    properties: Property[];
    staff: User[];
    bookings: Booking[];
    taskTypes: Record<string, string>;
    priorities: Record<string, string>;
    cleaningAreas: string[];
}

interface CleaningTaskForm {
    property_id: string;
    booking_id: string;
    assigned_to: string;
    title: string;
    description: string;
    task_type: string;
    priority: string;
    scheduled_date: Date | undefined;
    estimated_duration: string;
    deadline: Date | undefined;
    cleaning_areas: string[];
    special_instructions: string;
    estimated_cost: string;
}

export default function CleaningTaskCreate({ 
    properties, 
    staff, 
    bookings, 
    taskTypes, 
    priorities, 
    cleaningAreas 
}: Props) {
    const { data, setData, post, processing, errors } = useForm<CleaningTaskForm>({
        property_id: '',
        booking_id: '',
        assigned_to: '',
        title: '',
        description: '',
        task_type: '',
        priority: 'normal',
        scheduled_date: undefined,
        estimated_duration: '02:00',
        deadline: undefined,
        cleaning_areas: [],
        special_instructions: '',
        estimated_cost: '',
    });

    const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const formData = {
            ...data,
            cleaning_areas: selectedAreas,
            scheduled_date: data.scheduled_date ? format(data.scheduled_date, 'yyyy-MM-dd HH:mm:ss') : '',
            deadline: data.deadline ? format(data.deadline, 'yyyy-MM-dd HH:mm:ss') : '',
        };

        post(route('admin.cleaning-tasks.store'), {
            data: formData,
        });
    };

    const handleAreaToggle = (area: string) => {
        const newAreas = selectedAreas.includes(area)
            ? selectedAreas.filter(a => a !== area)
            : [...selectedAreas, area];
        setSelectedAreas(newAreas);
    };

    const generateTitleFromType = (taskType: string, propertyId: string) => {
        const property = properties.find(p => p.id.toString() === propertyId);
        if (property && taskType) {
            const typeLabel = taskTypes[taskType];
            setData('title', `${typeLabel} - ${property.name}`);
        }
    };

    return (
        <AppLayout>
            <Head title="Create Cleaning Task" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href={route('admin.cleaning-tasks.index')}>
                            <Button variant="outline" size="sm">
                                <Icon iconNode={ArrowLeft} className="mr-2 h-4 w-4" />
                                Back to Tasks
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Create Cleaning Task</h1>
                            <p className="text-muted-foreground">
                                Create a new cleaning task for property maintenance
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Main Information */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Task Information</CardTitle>
                                    <CardDescription>
                                        Basic details about the cleaning task
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="property_id">Property *</Label>
                                            <Select
                                                value={data.property_id}
                                                onValueChange={(value) => {
                                                    setData('property_id', value);
                                                    if (data.task_type) {
                                                        generateTitleFromType(data.task_type, value);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select property" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {properties.map((property) => (
                                                        <SelectItem key={property.id} value={property.id.toString()}>
                                                            {property.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.property_id && (
                                                <p className="text-sm text-red-600">{errors.property_id}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="task_type">Task Type *</Label>
                                            <Select
                                                value={data.task_type}
                                                onValueChange={(value) => {
                                                    setData('task_type', value);
                                                    if (data.property_id) {
                                                        generateTitleFromType(value, data.property_id);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select task type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(taskTypes).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.task_type && (
                                                <p className="text-sm text-red-600">{errors.task_type}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="title">Task Title *</Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Enter task title"
                                        />
                                        {errors.title && (
                                            <p className="text-sm text-red-600">{errors.title}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Describe the cleaning task requirements"
                                            rows={3}
                                        />
                                        {errors.description && (
                                            <p className="text-sm text-red-600">{errors.description}</p>
                                        )}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="priority">Priority *</Label>
                                            <Select
                                                value={data.priority}
                                                onValueChange={(value) => setData('priority', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(priorities).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.priority && (
                                                <p className="text-sm text-red-600">{errors.priority}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="estimated_cost">Estimated Cost (IDR)</Label>
                                            <Input
                                                id="estimated_cost"
                                                type="number"
                                                value={data.estimated_cost}
                                                onChange={(e) => setData('estimated_cost', e.target.value)}
                                                placeholder="0"
                                                min="0"
                                                step="1000"
                                            />
                                            {errors.estimated_cost && (
                                                <p className="text-sm text-red-600">{errors.estimated_cost}</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Scheduling */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Scheduling</CardTitle>
                                    <CardDescription>
                                        Set the schedule and timeline for this task
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Scheduled Date *</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        className="w-full justify-start text-left font-normal"
                                                    >
                                                        <Icon iconNode={CalendarIcon} className="mr-2 h-4 w-4" />
                                                        {data.scheduled_date 
                                                            ? format(data.scheduled_date, 'PPP', { locale: id })
                                                            : 'Pick a date'
                                                        }
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={data.scheduled_date}
                                                        onSelect={(date) => setData('scheduled_date', date)}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {errors.scheduled_date && (
                                                <p className="text-sm text-red-600">{errors.scheduled_date}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Deadline</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        className="w-full justify-start text-left font-normal"
                                                    >
                                                        <Icon iconNode={CalendarIcon} className="mr-2 h-4 w-4" />
                                                        {data.deadline 
                                                            ? format(data.deadline, 'PPP', { locale: id })
                                                            : 'Pick a date'
                                                        }
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={data.deadline}
                                                        onSelect={(date) => setData('deadline', date)}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {errors.deadline && (
                                                <p className="text-sm text-red-600">{errors.deadline}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="estimated_duration">Estimated Duration (HH:MM) *</Label>
                                        <Input
                                            id="estimated_duration"
                                            type="time"
                                            value={data.estimated_duration}
                                            onChange={(e) => setData('estimated_duration', e.target.value)}
                                        />
                                        {errors.estimated_duration && (
                                            <p className="text-sm text-red-600">{errors.estimated_duration}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Cleaning Areas */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cleaning Areas</CardTitle>
                                    <CardDescription>
                                        Select areas that need to be cleaned
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                        {cleaningAreas.map((area) => (
                                            <div
                                                key={area}
                                                className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-50"
                                                onClick={() => handleAreaToggle(area)}
                                            >
                                                <Checkbox
                                                    checked={selectedAreas.includes(area)}
                                                    onChange={() => handleAreaToggle(area)}
                                                />
                                                <Label className="cursor-pointer">{area}</Label>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedAreas.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm font-medium mb-2">Selected Areas:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedAreas.map((area) => (
                                                    <Badge key={area} variant="secondary">
                                                        {area}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAreaToggle(area)}
                                                            className="ml-2 hover:text-red-600"
                                                        >
                                                            <Icon iconNode={X} className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Special Instructions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Special Instructions</CardTitle>
                                    <CardDescription>
                                        Additional instructions or requirements
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        value={data.special_instructions}
                                        onChange={(e) => setData('special_instructions', e.target.value)}
                                        placeholder="Enter any special instructions or requirements for this cleaning task"
                                        rows={4}
                                    />
                                    {errors.special_instructions && (
                                        <p className="text-sm text-red-600">{errors.special_instructions}</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Assignment & Booking */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Assignment</CardTitle>
                                    <CardDescription>
                                        Assign staff and link to booking
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="assigned_to">Assign To</Label>
                                        <Select
                                            value={data.assigned_to}
                                            onValueChange={(value) => setData('assigned_to', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select staff member" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Unassigned</SelectItem>
                                                {staff.map((member) => (
                                                    <SelectItem key={member.id} value={member.id.toString()}>
                                                        {member.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Leave empty to assign later
                                        </p>
                                        {errors.assigned_to && (
                                            <p className="text-sm text-red-600">{errors.assigned_to}</p>
                                        )}
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <Label htmlFor="booking_id">Related Booking</Label>
                                        <Select
                                            value={data.booking_id}
                                            onValueChange={(value) => setData('booking_id', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select booking" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">No booking</SelectItem>
                                                {bookings.map((booking) => (
                                                    <SelectItem key={booking.id} value={booking.id.toString()}>
                                                        {booking.booking_number} - {booking.guest_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Link this task to a specific booking
                                        </p>
                                        {errors.booking_id && (
                                            <p className="text-sm text-red-600">{errors.booking_id}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button 
                                        type="submit" 
                                        className="w-full" 
                                        disabled={processing}
                                    >
                                        <Icon iconNode={Save} className="mr-2 h-4 w-4" />
                                        {processing ? 'Creating...' : 'Create Task'}
                                    </Button>
                                    
                                    <Link href={route('admin.cleaning-tasks.index')}>
                                        <Button type="button" variant="outline" className="w-full">
                                            Cancel
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 