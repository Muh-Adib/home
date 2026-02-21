import React from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ArrowLeft,
    Edit,
    Trash2,
    Sparkles,
    FileText,
    Calendar,
    User,
    Check,
    X,
    Save,
    MoreHorizontal,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface ContentPlan {
    id: number;
    uuid: string; // Using UUID for routing
    title: string;
    description: string | null;
    target_keywords: string[];
    target_audience: string | null;
    content_type: 'article' | 'guide' | 'tips' | 'comparison' | 'news' | 'review';
    status: 'idea' | 'researching' | 'outlining' | 'writing' | 'reviewing' | 'scheduled' | 'published';
    priority: number;
    planned_publish_date: string | null;
    ai_research_data: any; // Context: { search_intent?, target_audience_analysis?, key_points?, suggested_tone?, abstract? }
    ai_outline: string | null;
    created_at: string;
    creator?: { id: number; name: string };
    assignee?: { id: number; name: string };
    article?: { id: number; title: string; slug: string };
}

interface Props {
    plan: ContentPlan;
    statuses: string[];
    contentTypes: string[];
    users: { id: number; name: string }[];
}

const STATUS_COLORS = {
    idea: 'bg-gray-100 text-gray-700',
    researching: 'bg-blue-100 text-blue-700',
    outlining: 'bg-yellow-100 text-yellow-700',
    writing: 'bg-orange-100 text-orange-700',
    reviewing: 'bg-purple-100 text-purple-700',
    scheduled: 'bg-green-100 text-green-700',
    published: 'bg-teal-100 text-teal-700',
};

export default function Show({ plan, statuses, contentTypes, users }: Props) {
    const [loading, setLoading] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [isEditingOutline, setIsEditingOutline] = React.useState(false);
    const [editedOutline, setEditedOutline] = React.useState(plan.ai_outline || '');
    const [showConvertModal, setShowConvertModal] = React.useState(false);
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [deleteLoading, setDeleteLoading] = React.useState(false);

    const { data, setData, put, processing, errors } = useForm({
        title: plan.title || '',
        description: plan.description || '',
        status: plan.status || 'idea',
        priority: plan.priority || 3,
        content_type: plan.content_type || 'article',
        target_audience: plan.target_audience || '',
        target_keywords: plan.target_keywords || [],
        planned_publish_date: plan.planned_publish_date || '',
        assigned_to: plan.assignee?.id?.toString() || '',
    });

    const [keywordInput, setKeywordInput] = React.useState('');

    const handleUpdatePlan = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.content-plans.update', plan.uuid), {
            onSuccess: () => {
                setIsEditing(false);
                toast.success('Plan updated successfully');
            },
            onError: () => {
                toast.error('Failed to update plan');
            }
        });
    };

    const handleUpdateOutline = async () => {
        setLoading(true);
        try {
            await axios.put(route('admin.content-plans.update', plan.uuid), {
                ai_outline: editedOutline
            });
            setIsEditingOutline(false);
            toast.success('Outline updated successfully');
            router.reload({ only: ['plan'] });
        } catch (error: any) {
            toast.error('Failed to update outline');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        setDeleteLoading(true);
        router.delete(route('admin.content-plans.destroy', plan.uuid), {
            onSuccess: () => {
                toast.success('Content plan deleted successfully');
                // The backend should redirect, but we can ensure it here if needed
            },
            onFinish: () => {
                setDeleteLoading(false);
                setShowDeleteModal(false);
            },
            onError: () => {
                setDeleteLoading(false);
                toast.error('Failed to delete plan');
            }
        });
    };

    const handleAIResearch = async () => {
        setLoading(true);
        try {
            await axios.post(route('admin.content-plans.ai-research', plan.uuid));
            toast.success('AI research completed!');
            router.reload({ only: ['plan'] });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to research topic');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateOutline = async () => {
        setLoading(true);
        try {
            await axios.post(route('admin.content-plans.generate-outline', plan.uuid));
            toast.success('Outline generated successfully!');
            router.reload({ only: ['plan'] });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to generate outline');
        } finally {
            setLoading(false);
        }
    };

    const handleConvertToArticle = () => {
        setShowConvertModal(true);
    };

    const processConversion = async () => {
        setLoading(true);
        try {
            const response = await axios.post(route('admin.content-plans.convert-to-article', plan.uuid));
            toast.success('Article created successfully!');

            if (response.data.redirect) {
                window.location.href = response.data.redirect;
            } else {
                setShowConvertModal(false);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to convert to article');
            setShowConvertModal(false);
        } finally {
            setLoading(false);
        }
    };

    const addKeyword = () => {
        if (keywordInput.trim() && !data.target_keywords.includes(keywordInput.trim())) {
            setData('target_keywords', [...data.target_keywords, keywordInput.trim()]);
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setData('target_keywords', data.target_keywords.filter(k => k !== keyword));
    };

    return (
        <AdminLayout>
            <Head title={`Plan: ${plan.title || 'Untitled'}`} />

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full"
                            onClick={() => router.get(route('admin.content-plans.index'))}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                    {plan.title || 'Untitled Plan'}
                                </h1>
                                <Badge className={`${STATUS_COLORS[plan.status as keyof typeof STATUS_COLORS]} border-none px-3 py-1 uppercase text-[10px] font-bold tracking-widest`}>
                                    {plan.status}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    <Calendar className="w-3 h-3" />
                                    {plan.planned_publish_date ? new Date(plan.planned_publish_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date set'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {plan.article && (
                            <Button
                                onClick={() => router.get(route('admin.articles.edit', plan.article!.slug))}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm"
                            >
                                <FileText className="w-4 h-4" />
                                Edit Article
                            </Button>
                        )}

                        {!isEditing ? (
                            <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2 shadow-sm">
                                <Edit className="w-4 h-4" />
                                Edit Plan
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button onClick={handleUpdatePlan} disabled={processing} className="gap-2 shadow-md bg-blue-600 hover:bg-blue-700">
                                    <Check className="w-4 h-4" />
                                    Save
                                </Button>
                                <Button onClick={() => setIsEditing(false)} variant="ghost" className="gap-2">
                                    <X className="w-4 h-4" />
                                    Cancel
                                </Button>
                            </div>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <MoreHorizontal className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {!plan.article && (
                                    <DropdownMenuItem onClick={handleConvertToArticle} className="text-blue-600 font-medium">
                                        <FileText className="w-4 h-4 mr-2" />
                                        Convert to Article
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleAIResearch}>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    AI Research
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleGenerateOutline}>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Re-generate Outline
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Plan
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Details & Edit Form */}
                    <div className="lg:col-span-8 space-y-8">
                        {isEditing ? (
                            <Card className="border-2 border-blue-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                                <CardHeader className="bg-blue-50/50 pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                                        <Edit className="w-5 h-5" />
                                        Edit Content Plan
                                    </CardTitle>
                                    <CardDescription>Perbarui informasi rencana konten Anda</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 pt-8">
                                    <form className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="title" className="text-xs uppercase font-bold text-gray-500">Judul Konten</Label>
                                                <Input
                                                    id="title"
                                                    value={data.title}
                                                    onChange={e => setData('title', e.target.value)}
                                                    className="font-semibold text-lg py-6 border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                                                />
                                                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="description" className="text-xs uppercase font-bold text-gray-500">Deskripsi</Label>
                                                <Textarea
                                                    id="description"
                                                    value={data.description}
                                                    onChange={e => setData('description', e.target.value)}
                                                    className="min-h-[100px] border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="status" className="text-xs uppercase font-bold text-gray-500">Status</Label>
                                                <Select value={data.status} onValueChange={val => setData('status', val)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="priority" className="text-xs uppercase font-bold text-gray-500">Prioritas (1-5)</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    value={data.priority}
                                                    onChange={e => setData('priority', parseInt(e.target.value))}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="content_type" className="text-xs uppercase font-bold text-gray-500">Tipe Konten</Label>
                                                <Select value={data.content_type} onValueChange={val => setData('content_type', val)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {contentTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="planned_publish_date" className="text-xs uppercase font-bold text-gray-500">Tanggal Publikasi</Label>
                                                <Input
                                                    type="date"
                                                    value={data.planned_publish_date}
                                                    onChange={e => setData('planned_publish_date', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t">
                                            <Label className="text-xs uppercase font-bold text-gray-500">Target Keywords</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={keywordInput}
                                                    onChange={e => setKeywordInput(e.target.value)}
                                                    placeholder="Tambah kata kunci..."
                                                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                                />
                                                <Button type="button" variant="secondary" onClick={addKeyword}>Tambah</Button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {data.target_keywords.map(kw => (
                                                    <Badge key={kw} variant="secondary" className="pl-3 pr-1 py-1 gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-none transition-all">
                                                        {kw}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="w-4 h-4 rounded-full p-0 h-auto hover:bg-gray-300"
                                                            onClick={() => removeKeyword(kw)}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-8">
                                {/* Description Card */}
                                <div className="prose max-w-none">
                                    <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 border-b pb-3 border-gray-100">
                                        <FileText className="w-5 h-5 text-gray-400" />
                                        Deskripsi Konten
                                    </h3>
                                    <p className="text-lg text-gray-600 leading-relaxed italic">
                                        {plan.description || 'Tidak ada deskripsi yang tersedia.'}
                                    </p>
                                </div>

                                {/* AI Outline Section */}
                                <Card className="border-none shadow-sm bg-indigo-50/30 overflow-hidden ring-1 ring-indigo-100">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-6 bg-white/50 border-b border-indigo-100">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-indigo-600" />
                                            <CardTitle className="text-lg font-bold text-indigo-950">AI Generated Outline</CardTitle>
                                        </div>
                                        {!isEditingOutline ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditedOutline(plan.ai_outline || '');
                                                    setIsEditingOutline(true);
                                                }}
                                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/50"
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit Outline
                                            </Button>
                                        ) : (
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsEditingOutline(false)}
                                                    className="w-8 h-8 rounded-full p-0 text-gray-500"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {isEditingOutline ? (
                                            <div className="p-4 space-y-4">
                                                <Textarea
                                                    value={editedOutline}
                                                    onChange={e => setEditedOutline(e.target.value)}
                                                    className="min-h-[400px] text-base font-mono bg-white border-indigo-200 focus:ring-indigo-200"
                                                    placeholder="Tulis atau edit outline di sini..."
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        onClick={handleUpdateOutline}
                                                        disabled={loading}
                                                        className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
                                                    >
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Simpan Perubahan
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-6">
                                                {plan.ai_outline ? (
                                                    <div className="bg-white rounded-xl p-8 shadow-inner border border-indigo-50 min-h-[200px] whitespace-pre-wrap font-sans text-gray-800 leading-loose">
                                                        {plan.ai_outline}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white/50">
                                                        {loading ? (
                                                            <>
                                                                <Loader2 className="w-12 h-12 mb-4 text-indigo-500 animate-spin" />
                                                                <p className="text-sm font-medium text-indigo-600">Generating Outline with AI...</p>
                                                                <p className="text-xs text-gray-400 mt-2">This may take a few seconds.</p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                                                                <p className="text-sm">Gunakan tombol AI Research & Outline untuk memulai</p>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="mt-6 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                                    onClick={handleGenerateOutline}
                                                                    disabled={loading}
                                                                >
                                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                                    Generate Outline
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Sidebar Stats & Info */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Summary Widget */}
                        <Card className="border-none bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xl">
                            <CardContent className="p-6 pt-8 text-center space-y-6">
                                <div className="space-y-1">
                                    <div className="text-indigo-100 text-[10px] uppercase font-bold tracking-[0.2em] opacity-80 mb-2">Target Audience</div>
                                    <h4 className="text-xl font-bold">{plan.target_audience || 'Semua Orang'}</h4>
                                </div>
                                <div className="flex justify-center flex-wrap gap-2">
                                    {plan.target_keywords && plan.target_keywords.map(kw => (
                                        <Badge key={kw} variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20 transition-colors">
                                            #{kw}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-8">
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase opacity-60 mb-1">Priority</div>
                                        <div className="text-2xl font-black">P{plan.priority}</div>
                                    </div>
                                    <div className="w-px h-8 bg-white/20" />
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase opacity-60 mb-1">Type</div>
                                        <div className="text-lg font-bold capitalize">{plan.content_type || 'Article'}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Assignment Card */}
                        <Card className="border-gray-100 shadow-sm overflow-hidden">
                            <CardHeader className="py-4 px-6 border-b border-gray-50 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">PIC & Workflow</CardTitle>
                                <User className="w-4 h-4 text-gray-300" />
                            </CardHeader>
                            <CardContent className="p-6 space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 ring-4 ring-blue-50">
                                        {plan.assignee?.name?.charAt(0) || plan.creator?.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase text-gray-400 font-bold leading-none mb-1">Assigned To</div>
                                        <div className="text-sm font-bold text-gray-900">{plan.assignee?.name || plan.creator?.name || 'Unassigned'}</div>
                                    </div>
                                </div>

                                <div className="pt-5 border-t border-gray-50 space-y-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-medium">Internal Hash ID</span>
                                        <span className="font-mono text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500">{plan.uuid.split('-')[0]}...</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-medium">Created</span>
                                        <span className="font-medium text-gray-700">{new Date(plan.created_at).toLocaleDateString('id-ID')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Linked Article Card */}
                        {plan.article && (
                            <Card className="border-2 border-emerald-100 bg-emerald-50/30 overflow-hidden ring-1 ring-emerald-100">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-emerald-500 rounded-lg text-white">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest leading-none mb-1">Published Article</h4>
                                            <p className="text-sm font-bold text-emerald-950 line-clamp-1">{plan.article.title}</p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => router.get(route('admin.articles.edit', plan.article!.slug))}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm shadow-emerald-200"
                                        size="sm"
                                    >
                                        Edit Article Content
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* AI Research Data Card */}
                        {(plan.ai_research_data?.search_intent || plan.ai_research_data?.abstract || loading) && (
                            <Card className="border-none shadow-sm bg-purple-50 ring-1 ring-purple-100 p-6 space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-purple-100">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    <h4 className="text-[10px] font-black text-purple-900 uppercase tracking-[0.2em] leading-none">Deep Analysis</h4>
                                </div>

                                {loading && !plan.ai_research_data ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-purple-400">
                                        <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                                        <span className="text-xs">Analyzing topic...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* New Deep Analysis Display */}
                                        {plan.ai_research_data?.search_intent ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Search Intent</div>
                                                    <p className="text-sm font-semibold text-purple-900">{plan.ai_research_data.search_intent}</p>
                                                </div>

                                                <div>
                                                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Target Audience</div>
                                                    <p className="text-sm text-purple-800">{plan.ai_research_data.target_audience_analysis}</p>
                                                </div>

                                                <div>
                                                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Key Points</div>
                                                    <ul className="list-disc pl-4 space-y-1">
                                                        {plan.ai_research_data.key_points?.map((point: string, idx: number) => (
                                                            <li key={idx} className="text-xs text-purple-800 leading-relaxed">{point}</li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {plan.ai_research_data.suggested_tone && (
                                                    <div className="flex items-center gap-2 pt-2">
                                                        <span className="text-[10px] font-bold text-purple-400 uppercase">Tone:</span>
                                                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-100/50">
                                                            {plan.ai_research_data.suggested_tone}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Legacy/Fallback Abstract Display */
                                            <>
                                                <p className="text-sm text-purple-900/70 leading-relaxed line-clamp-6 italic mb-4">
                                                    "{plan.ai_research_data?.abstract}"
                                                </p>
                                                {plan.ai_research_data?.url && (
                                                    <a
                                                        href={plan.ai_research_data.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-bold text-purple-600 hover:underline flex items-center justify-end"
                                                    >
                                                        Read Full Source →
                                                    </a>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showConvertModal}
                onClose={() => setShowConvertModal(false)}
                onConfirm={processConversion}
                title="Convert to Article?"
                description="This will create a new article draft based on this content plan. You will be redirected to the article editor."
                confirmText="Yes, Convert"
                loading={loading}
            />
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title={`Delete "${plan.title || 'Untitled'}"?`}
                description="Are you sure you want to delete this content plan? This action cannot be undone."
                confirmText="Yes, Delete"
                cancelText="Cancel"
                variant="destructive"
                loading={deleteLoading}
            />
        </AdminLayout>
    );
}

