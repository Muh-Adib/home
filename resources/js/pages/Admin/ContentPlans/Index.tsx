import React from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Calendar, KanbanSquare, List, Plus, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { apiPut, apiPost } from '@/lib/api';
import { AICalendarModal, CalendarView, KanbanView, CreatePlanModal } from '@/components/ContentPlanner';
import { CalendarEvent } from '@/components/ContentPlanner/CalendarView';

interface ContentPlan {
    id: number;
    uuid: string;
    title: string;
    description: string | null;
    target_keywords: string[];
    target_audience: string | null;
    content_type: string | null;
    status: 'idea' | 'researching' | 'outlining' | 'writing' | 'draft' | 'reviewing' | 'scheduled' | 'published';
    priority: number;
    planned_publish_date: string | null;
    created_at: string;
    creator?: { name: string };
    assignee?: { name: string };
    article?: { id: number; slug: string };
}

interface Stats {
    total: number;
    by_status: Record<string, number>;
    this_month: number;
    next_month: number;
    in_progress: number;
}



interface Props {
    view: 'calendar' | 'kanban' | 'list';
    month: string;
    stats: Stats;
    filters: {
        search?: string;
        status?: string;
        assigned_to?: string;
        content_type?: string;
    };
    users: { id: number; name: string }[];
    events?: CalendarEvent[];
    columns?: Record<string, ContentPlan[]>;
    plans?: { data: ContentPlan[]; links: any; meta: any };
}

export default function Index({ view, month, stats, filters, users, events = [], columns = {}, plans }: Props) {
    const [showCalendarModal, setShowCalendarModal] = React.useState(false);
    const [showCreateModal, setShowCreateModal] = React.useState(false);
    const [selectedView, setSelectedView] = React.useState<'calendar' | 'kanban' | 'list'>(view);

    // Handle show_create from query params
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('show_create')) {
            setShowCreateModal(true);
        }
    }, []);
    const [loading, setLoading] = React.useState(false);

    // Filters state
    const [search, setSearch] = React.useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = React.useState(filters?.status || 'all');
    const [assigneeFilter, setAssigneeFilter] = React.useState(filters?.assigned_to || 'all');

    const handleFilter = () => {
        router.get(route('admin.content-plans.index'), {
            view: selectedView,
            month: month,
            search: search || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter,
            assigned_to: assigneeFilter === 'all' ? undefined : assigneeFilter,
        }, { preserveState: true, preserveScroll: true });
    };

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters?.search || '')) {
                handleFilter();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const switchView = (newView: 'calendar' | 'kanban' | 'list') => {
        setSelectedView(newView);
        router.get(route('admin.content-plans.index'), {
            view: newView,
            month: month,
            search: search || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter,
            assigned_to: assigneeFilter === 'all' ? undefined : assigneeFilter,
        });
    };

    const handleEventClick = (event: any) => {
        const uuid = event.event.id;
        router.get(route('admin.content-plans.show', uuid));
    };

    const handleDateClick = (date: Date) => {
        setShowCreateModal(true);
        // We could also pass the date as a prop if we wanted to pre-fill it
    };

    const handleEventDrop = async (event: any) => {
        const uuid = event.event.id;
        const newDate = event.event.startStr;
        try {
            await apiPut(route('admin.content-plans.update', uuid), {
                planned_publish_date: newDate,
            });
            toast.success('Plan rescheduled successfully');
            router.reload({ only: ['events'] });
        } catch (error: any) {
            toast.error('Failed to reschedule plan');
            console.error(error);
        }
    };

    const handleStatusChange = async (planUuid: string, newStatus: string) => {
        try {
            await apiPut(route('admin.content-plans.update', planUuid), {
                status: newStatus,
            });
            toast.success('Status updated successfully');
            router.reload({ only: ['columns'] });
        } catch (error: any) {
            toast.error('Failed to update status');
            console.error(error);
        }
    };

    const handleConvertToArticle = async (planUuid: string) => {
        if (!confirm('Convert this plan to an article?')) return;

        setLoading(true);
        try {
            const result = await apiPost<{ redirect?: string }>(route('admin.content-plans.convert-to-article', planUuid));
            toast.success('Article created successfully!');

            // Redirect to article editor
            if (result.redirect) {
                window.location.href = result.redirect;
            }
        } catch (error: any) {
            toast.error(error?.data?.error || 'Failed to convert to article');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCalendar = async (formData: any) => {
        setLoading(true);
        try {
            const result = await apiPost<{ job_started?: boolean; message?: string; count?: number }>(route('admin.content-plans.generate-calendar'), formData);

            if (result.job_started) {
                toast.success(result.message || 'Calendar generation started in background.');
                toast.info('You will receive a notification when it is complete.');
            } else {
                toast.success(`Successfully generated ${result.count} content plans!`);
            }

            setShowCalendarModal(false);
            // We don't reload immediately because it's a background job
            // But we can reload to clear any stale state if needed
            router.reload();
        } catch (error: any) {
            toast.error(error?.data?.error || 'Failed to start generation job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="Content Planner" />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Content Planner</h1>
                        <p className="text-gray-600 mt-1">
                            Rencanakan, kelola, dan lacak konten Anda dengan AI
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => setShowCalendarModal(true)}
                            variant="outline"
                            className="gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate Calendar
                        </Button>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Plan
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-600">Total Plans</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-600">This Month</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{stats.this_month}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-600">Next Month</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{stats.next_month}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-600">In Progress</p>
                        <p className="text-2xl font-bold text-orange-600 mt-1">
                            {stats.in_progress || 0}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <Label className="text-xs text-gray-500 mb-1 block">Search Plans</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by title, description, or keywords..."
                                    className="pl-10 h-9"
                                />
                            </div>
                        </div>

                        <div className="w-full md:w-48">
                            <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
                            <Select
                                value={statusFilter}
                                onValueChange={(val) => {
                                    setStatusFilter(val);
                                    router.get(route('admin.content-plans.index'), {
                                        view: selectedView,
                                        month,
                                        search,
                                        status: val === 'all' ? undefined : val,
                                        assigned_to: assigneeFilter === 'all' ? undefined : assigneeFilter,
                                    }, { preserveState: true });
                                }}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="idea">Idea</SelectItem>
                                    <SelectItem value="researching">Researching</SelectItem>
                                    <SelectItem value="outlining">Outlining</SelectItem>
                                    <SelectItem value="writing">Writing</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="reviewing">Reviewing</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Content */}
            {selectedView === 'calendar' && (
                <CalendarView
                    events={events}
                    onEventClick={handleEventClick}
                    onDateClick={handleDateClick}
                    onEventDrop={handleEventDrop}
                />
            )}

            {selectedView === 'kanban' && (
                <KanbanView
                    columns={columns}
                    onStatusChange={handleStatusChange}
                    onConvertToArticle={handleConvertToArticle}
                    onCardClick={(uuid) => router.get(route('admin.content-plans.show', uuid))}
                />
            )}

            {selectedView === 'list' && (
                <div className="space-y-4">
                    {plans?.data && plans.data.length > 0 ? (
                        plans.data.map((plan) => (
                            <div
                                key={plan.uuid}
                                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col md:flex-row gap-4 justify-between"
                                onClick={() => router.get(route('admin.content-plans.show', plan.uuid))}
                            >
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900">{plan.title || 'Untitled Plan'}</h3>
                                        <span className={cn(
                                            'px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider',
                                            plan.status === 'idea' && 'bg-gray-100 text-gray-700',
                                            plan.status === 'researching' && 'bg-blue-100 text-blue-700',
                                            plan.status === 'outlining' && 'bg-yellow-100 text-yellow-700',
                                            plan.status === 'writing' && 'bg-orange-100 text-orange-700',
                                            plan.status === 'draft' && 'bg-orange-100 text-orange-700',
                                            plan.status === 'reviewing' && 'bg-purple-100 text-purple-700',
                                            plan.status === 'scheduled' && 'bg-green-100 text-green-700',
                                            plan.status === 'published' && 'bg-teal-100 text-teal-700',
                                        )}>
                                            {plan.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-2">{plan.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        {plan.planned_publish_date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(plan.planned_publish_date).toLocaleDateString()}
                                            </span>
                                        )}
                                        {plan.target_audience && (
                                            <span>Target: {plan.target_audience}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {plan.article ? (
                                        <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 bg-emerald-50 pointer-events-none">
                                            Article Linked
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleConvertToArticle(plan.uuid);
                                            }}
                                        >
                                            Convert to Article
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                            <p className="text-gray-500">Tidak ada content plan ditemukan</p>
                            <Button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4"
                                variant="outline"
                            >
                                Buat Rencana Konten Pertama
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* AI Calendar Generator Modal */}
            <AICalendarModal
                isOpen={showCalendarModal}
                onClose={() => setShowCalendarModal(false)}
                onGenerate={handleGenerateCalendar}
                loading={loading}
            />

            {/* Create Plan Modal */}
            <CreatePlanModal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    // Clear the query param if it exists
                    if (window.location.search.includes('show_create')) {
                        router.visit(route('admin.content-plans.index'), { preserveScroll: true, preserveState: true });
                    }
                }}
                users={users}
                statuses={['idea', 'researching', 'outlining', 'writing', 'reviewing', 'scheduled']}
                contentTypes={['article', 'guide', 'tips', 'comparison', 'news', 'review']}
            />
        </AdminLayout>
    );
}
