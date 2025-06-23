import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/icon';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { CleaningTask } from '@/types';
import { ArrowLeft, Edit, Play, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
    task: CleaningTask;
    canEdit: boolean;
    canComplete: boolean;
}

export default function CleaningTaskShow({ task, canEdit, canComplete }: Props) {
    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'outline',
            assigned: 'secondary',
            in_progress: 'default',
            completed: 'default',
            cancelled: 'destructive',
        };
        
        return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
    };

    const handleTaskAction = (action: string) => {
        const urls: Record<string, string> = {
            start: route('admin.cleaning-tasks.start', task.id),
            complete: route('admin.cleaning-tasks.complete', task.id),
        };

        if (urls[action]) {
            router.post(urls[action]);
        }
    };

    return (
        <AppLayout>
            <Head title={`Task: ${task.title}`} />
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href={route('admin.cleaning-tasks.index')}>
                            <Button variant="outline" size="sm">
                                <Icon iconNode={ArrowLeft} className="mr-2 h-4 w-4" />
                                Back to Tasks
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
                            <p className="text-muted-foreground">Task #{task.task_number}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {task.is_overdue && (
                            <Badge variant="destructive">
                                <Icon iconNode={AlertTriangle} className="mr-1 h-3 w-3" />
                                OVERDUE
                            </Badge>
                        )}
                        {getStatusBadge(task.status)}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Task Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Property</label>
                                        <p className="font-medium">{task.property?.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Scheduled Date</label>
                                        <p className="font-medium">
                                            {format(new Date(task.scheduled_date), 'PPP p', { locale: id })}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Duration</label>
                                        <p className="font-medium">{task.estimated_duration}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Cost</label>
                                        <p className="font-medium">Rp {task.estimated_cost?.toLocaleString('id-ID') || '0'}</p>
                                    </div>
                                </div>

                                {task.description && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                                        <p className="mt-1">{task.description}</p>
                                    </div>
                                )}

                                {task.cleaning_areas && task.cleaning_areas.length > 0 && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Cleaning Areas</label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {task.cleaning_areas.map((area, index) => (
                                                <Badge key={index} variant="outline">{area}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Completion</span>
                                        <span>{task.completion_percentage}%</span>
                                    </div>
                                    <Progress value={task.completion_percentage} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {canEdit && (
                                    <Link href={route('admin.cleaning-tasks.edit', task.id)}>
                                        <Button variant="outline" className="w-full">
                                            <Icon iconNode={Edit} className="mr-2 h-4 w-4" />
                                            Edit Task
                                        </Button>
                                    </Link>
                                )}

                                {task.status === 'assigned' && canComplete && (
                                    <Button 
                                        onClick={() => handleTaskAction('start')}
                                        className="w-full"
                                    >
                                        <Icon iconNode={Play} className="mr-2 h-4 w-4" />
                                        Start Task
                                    </Button>
                                )}

                                {task.status === 'in_progress' && canComplete && (
                                    <Button 
                                        onClick={() => handleTaskAction('complete')}
                                        className="w-full"
                                    >
                                        <Icon iconNode={CheckCircle} className="mr-2 h-4 w-4" />
                                        Complete Task
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Assignment</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                                    <p className="font-medium">{task.assigned_to_user?.name || 'Unassigned'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Created By</label>
                                    <p className="font-medium">{task.created_by_user?.name}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}