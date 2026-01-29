import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface AIKeyEditProps {
    aiKey?: {
        id: number;
        name: string;
        provider: string;
        is_active: boolean;
        priority: number;
        requests_per_minute?: number;
        daily_limit?: number;
        auto_rotate: boolean;
        metadata?: Record<string, any>;
        masked_key: string;
    };
    providers: string[];
}

export default function AIKeyEdit({ aiKey, providers }: AIKeyEditProps) {
    const isEdit = !!aiKey;
    const [showApiKey, setShowApiKey] = useState(false);

    const { data, setData, post, put, processing, errors } = useForm({
        name: aiKey?.name || '',
        provider: aiKey?.provider || 'openrouter',
        api_key: '',
        is_active: aiKey?.is_active ?? true,
        priority: aiKey?.priority || 50,
        requests_per_minute: aiKey?.requests_per_minute || null,
        daily_limit: aiKey?.daily_limit || null,
        auto_rotate: aiKey?.auto_rotate ?? true,
        metadata: aiKey?.metadata || {},
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settings', href: '/admin/settings' },
        { title: 'AI Keys', href: '/admin/settings/ai-keys' },
        { title: isEdit ? 'Edit Key' : 'New Key' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEdit && aiKey) {
            put(`/admin/settings/ai-keys/${aiKey.id}`);
        } else {
            post('/admin/settings/ai-keys');
        }
    };

    const getProviderName = (provider: string) => {
        const names: Record<string, string> = {
            openrouter: 'OpenRouter',
            gemini: 'Google Gemini',
            openai: 'OpenAI',
            anthropic: 'Anthropic Claude',
        };
        return names[provider] || provider;
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Edit AI Key' : 'New AI Key'}>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEdit ? 'Edit AI Provider Key' : 'Add New AI Provider Key'}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {isEdit ? `Editing ${aiKey?.name}` : 'Configure a new AI API key for content generation'}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit('/admin/settings/ai-keys')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Saving...' : 'Save Key'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="name">Key Name *</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        placeholder="e.g., Primary OpenRouter Key"
                                        required
                                    />
                                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                                    <p className="text-sm text-gray-500 mt-1">
                                        A friendly name to identify this key
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="provider">Provider *</Label>
                                    <Select value={data.provider} onValueChange={value => setData('provider', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {providers.map(provider => (
                                                <SelectItem key={provider} value={provider}>
                                                    {getProviderName(provider)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.provider && <p className="text-sm text-red-600 mt-1">{errors.provider}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="api_key">
                                        API Key {isEdit && '(leave blank to keep current)'}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="api_key"
                                            type={showApiKey ? 'text' : 'password'}
                                            value={data.api_key}
                                            onChange={e => setData('api_key', e.target.value)}
                                            placeholder={isEdit ? '••••••••••••••••' : 'sk-...'}
                                            required={!isEdit}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {errors.api_key && <p className="text-sm text-red-600 mt-1">{errors.api_key}</p>}
                                    {isEdit && aiKey && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            Current: {aiKey.masked_key}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Rate Limits */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Rate Limits & Quotas</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="requests_per_minute">Requests Per Minute (Optional)</Label>
                                    <Input
                                        id="requests_per_minute"
                                        type="number"
                                        value={data.requests_per_minute || ''}
                                        onChange={e => setData('requests_per_minute', e.target.value ? parseInt(e.target.value) : null)}
                                        placeholder="e.g., 60"
                                        min="1"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Maximum requests allowed per minute
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="daily_limit">Daily Request Limit (Optional)</Label>
                                    <Input
                                        id="daily_limit"
                                        type="number"
                                        value={data.daily_limit || ''}
                                        onChange={e => setData('daily_limit', e.target.value ? parseInt(e.target.value) : null)}
                                        placeholder="e.g., 10000"
                                        min="1"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Maximum requests allowed per day
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="is_active" className="font-medium">Active</Label>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Enable this key for use
                                        </p>
                                    </div>
                                    <input
                                        id="is_active"
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={e => setData('is_active', e.target.checked)}
                                        className="rounded"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="auto_rotate" className="font-medium">Auto-Rotate</Label>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Automatically rotate to this key
                                        </p>
                                    </div>
                                    <input
                                        id="auto_rotate"
                                        type="checkbox"
                                        checked={data.auto_rotate}
                                        onChange={e => setData('auto_rotate', e.target.checked)}
                                        className="rounded"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="priority">Priority</Label>
                                    <Input
                                        id="priority"
                                        type="number"
                                        value={data.priority}
                                        onChange={e => setData('priority', parseInt(e.target.value))}
                                        min="0"
                                        max="100"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Higher priority keys are preferred (0-100)
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Provider Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Provider Info</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Provider:</span>
                                        <Badge>{getProviderName(data.provider)}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <Badge variant={data.is_active ? 'default' : 'destructive'}>
                                            {data.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    {data.auto_rotate && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                            <p className="text-xs text-blue-900">
                                                <strong>Auto-Rotation:</strong> This key will  be automatically selected for AI requests based on least usage.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Security Notice */}
                        <Card className="bg-yellow-50 border-yellow-200">
                            <CardContent className="pt-6">
                                <p className="text-sm text-yellow-900">
                                    <strong>Security:</strong> API keys are encrypted and stored securely. They are never displayed in full after being saved.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}
