import React from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

interface User {
    id: number;
    name: string;
}

interface Props {
    statuses: string[];
    contentTypes: string[];
    users?: User[];
    initialDate?: string | null;
}

export default function Create({ statuses, contentTypes, users = [], initialDate = '' }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        target_keywords: [] as string[],
        target_audience: '',
        content_type: 'article',
        status: 'idea',
        priority: 3,
        planned_publish_date: initialDate || '',
        assigned_to: '',
    });

    const [keywordInput, setKeywordInput] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.content-plans.store'), {
            onSuccess: () => {
                toast.success('Content plan created successfully!');
                router.get(route('admin.content-plans.index'));
            },
            onError: (errors) => {
                toast.error('Failed to create content plan');
                console.error(errors);
            },
        });
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
            <Head title="Create Content Plan" />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.get(route('admin.content-plans.index'))}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Content Plan</h1>
                        <p className="text-gray-600 mt-1">
                            Rencanakan konten baru untuk blog Anda
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="max-w-3xl">
                    <div className="bg-white rounded-lg shadow p-6 space-y-6">
                        {/* Title */}
                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                placeholder="e.g. 10 Tips Memilih Villa di Jogja"
                                className="mt-1"
                            />
                            {errors.title && (
                                <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Brief description of the content plan..."
                                rows={3}
                                className="mt-1"
                            />
                            {errors.description && (
                                <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                            )}
                        </div>

                        {/* Keywords */}
                        <div>
                            <Label htmlFor="keywords">Target Keywords</Label>
                            <div className="mt-1 space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        id="keywords"
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addKeyword();
                                            }
                                        }}
                                        placeholder="Add keyword and press Enter..."
                                    />
                                    <Button type="button" onClick={addKeyword}>
                                        Add
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {data.target_keywords.map((keyword) => (
                                        <span
                                            key={keyword}
                                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                                        >
                                            {keyword}
                                            <button
                                                type="button"
                                                onClick={() => removeKeyword(keyword)}
                                                className="hover:text-blue-900"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Row: Content Type & Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="content_type">Content Type</Label>
                                <Select
                                    value={data.content_type}
                                    onValueChange={(value) => setData('content_type', value)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contentTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={data.status}
                                    onValueChange={(value) => setData('status', value)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row: Priority & Publish Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="priority">Priority (1-5)</Label>
                                <Input
                                    id="priority"
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={data.priority}
                                    onChange={(e) => setData('priority', parseInt(e.target.value))}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="planned_publish_date">Planned Publish Date</Label>
                                <Input
                                    id="planned_publish_date"
                                    type="date"
                                    value={data.planned_publish_date}
                                    onChange={(e) => setData('planned_publish_date', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Target Audience */}
                        <div>
                            <Label htmlFor="target_audience">Target Audience</Label>
                            <Input
                                id="target_audience"
                                value={data.target_audience}
                                onChange={(e) => setData('target_audience', e.target.value)}
                                placeholder="e.g. property renters, travelers, students"
                                className="mt-1"
                            />
                        </div>

                        {/* Assign To */}
                        {users && users.length > 0 && (
                            <div>
                                <Label htmlFor="assigned_to">Assign To (Optional)</Label>
                                <Select
                                    value={data.assigned_to || undefined}
                                    onValueChange={(value) => setData('assigned_to', value)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Unassigned - Click to assign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">Leave unassigned if not yet determined</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t">
                            <Button type="submit" disabled={processing} className="gap-2">
                                <Save className="w-4 h-4" />
                                {processing ? 'Saving...' : 'Create Plan'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.get(route('admin.content-plans.index'))}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
