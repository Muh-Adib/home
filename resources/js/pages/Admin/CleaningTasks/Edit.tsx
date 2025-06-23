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
import { Icon } from '@/components/ui/icon';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { CleaningTask, Property, User, Booking } from '@/types';
import { CalendarIcon, X, ArrowLeft, Save } from 'lucide-react';

interface Props {
    task: CleaningTask;
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

export default function CleaningTaskEdit({ 
    task, 
    properties, 
    staff, 
    bookings,
    taskTypes, 
    priorities, 
    cleaningAreas 
}: Props) {
    const { data, setData, put, processing, errors } = useForm<CleaningTaskForm>({
        property_id: task.property_id.toString(),
        booking_id: task.booking_id?.toString() || '',
        assigned_to: task.assigned_to?.toString() || '',
        title: task.title,
        description: task.description || '',
        task_type: task.task_type,
        priority: task.priority,
        scheduled_date: new Date(task.scheduled_date),
        estimated_duration: task.estimated_duration.substring(0, 5),
        deadline: task.deadline ? new Date(task.deadline) : undefined,
        cleaning_areas: task.cleaning_areas || [],
        special_instructions: task.special_instructions || '',
        estimated_cost: task.estimated_cost?.toString() || '',
    });

    const [selectedAreas, setSelectedAreas] = useState<string[]>(task.cleaning_areas || []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const formData = {
            ...data,
            cleaning_areas: selectedAreas,
            scheduled_date: data.scheduled_date ? format(data.scheduled_date, 'yyyy-MM-dd HH:mm:ss') : '',
            deadline: data.deadline ? format(data.deadline, 'yyyy-MM-dd HH:mm:ss') : '',
        };

        put(route('admin.cleaning-tasks.update', task.id), {
            data: formData,
        });
    };

    const handleAreaToggle = (area: string) => {
        const newAreas = selectedAreas.includes(area)
            ? selectedAreas.filter(a => a !== area)
            : [...selectedAreas, area];
        setSelectedAreas(newAreas);
    };

    const canEditBasicInfo = !['in_progress', 'completed', 'cancelled'].includes(task.status);
    const canEditScheduling = !['completed', 'cancelled'].includes(task.status);

    return (
        <AppLayout>
            <Head title={`Edit Task: ${task.title}`} />
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href={route('admin.cleaning-tasks.show', task.id)}>
                            <Button variant="outline" size="sm">
                                <Icon iconNode={ArrowLeft} className="mr-2 h-4 w-4" />
                                Back to Task
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Edit Cleaning Task</h1>
                            <p className="text-muted-foreground">
                                Task #{task.task_number} - {task.status}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
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
                                                onValueChange={(value) => setData('property_id', value)}
                                                disabled={!canEditBasicInfo}
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
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="title">Task Title *</Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Enter task title"
                                            disabled={!canEditBasicInfo}
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
                                </CardContent>
                            </Card>

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
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Current Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>Status:</span>
                                            <Badge variant="outline">{task.status}</Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Progress:</span>
                                            <span>{task.completion_percentage}%</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Assignment</CardTitle>
                                    <CardDescription>
                                        Assign staff member to this task
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
                                        {errors.assigned_to && (
                                            <p className="text-sm text-red-600">{errors.assigned_to}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

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
                                        {processing ? 'Updating...' : 'Update Task'}
                                    </Button>
                                    
                                    <Link href={route('admin.cleaning-tasks.show', task.id)}>
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