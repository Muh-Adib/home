import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Key,
    Plus,
    MoreHorizontal,
    Edit,
    Trash2,
    BarChart,
    Power,
    RefreshCw,
    DollarSign,
    Activity
} from 'lucide-react';

interface AIKey {
    id: number;
    name: string;
    provider: string;
    is_active: boolean;
    priority: number;
    requests_count: number;
    tokens_used: number;
    total_cost: number;
    last_used_at?: string;
    requests_per_minute?: number;
    daily_limit?: number;
    auto_rotate: boolean;
    masked_key: string;
    created_at: string;
}

interface Stats {
    total_keys: number;
    active_keys: number;
    total_requests: number;
    total_cost: number;
    providers: string[];
}

interface AIKeysIndexProps {
    keys: AIKey[];
    stats: Stats;
}

export default function AIKeysIndex({ keys, stats }: AIKeysIndexProps) {
    const page = usePage<PageProps>();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settings', href: '/admin/settings' },
        { title: 'AI Provider Keys' },
    ];

    const handleDelete = (key: AIKey) => {
        if (confirm(`Delete AI key "${key.name}"? This action cannot be undone.`)) {
            router.delete(`/admin/settings/ai-keys/${key.id}`, {
                preserveScroll: true,
            });
        }
    };

    const handleToggleActive = (key: AIKey) => {
        router.post(`/admin/settings/ai-keys/${key.id}/toggle-active`, {}, {
            preserveScroll: true,
        });
    };

    const handleResetStats = (key: AIKey) => {
        if (confirm(`Reset usage statistics for "${key.name}"?`)) {
            router.post(`/admin/settings/ai-keys/${key.id}/reset-stats`, {}, {
                preserveScroll: true,
            });
        }
    };

    const getProviderBadge = (provider: string) => {
        const colors: Record<string, string> = {
            openrouter: 'bg-purple-100 text-purple-800',
            gemini: 'bg-blue-100 text-blue-800',
            openai: 'bg-green-100 text-green-800',
            anthropic: 'bg-orange-100 text-orange-800',
        };
        return (
            <Badge className={colors[provider] || 'bg-gray-100 text-gray-800'}>
                {provider.toUpperCase()}
            </Badge>
        );
    };

    const formatCost = (cost: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(cost);
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="AI Provider Keys">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            AI Provider Keys
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Manage API keys for AI content generation with auto-rotation and usage tracking
                        </p>
                    </div>

                    <Link href="/admin/settings/ai-keys/create">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Add API Key
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
                            <Key className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_keys}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.active_keys} active
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Providers</CardTitle>
                            <Activity className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.providers.length}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.providers.join(', ')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                            <BarChart className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.total_requests.toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                All time
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                            <DollarSign className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCost(stats.total_cost)}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                All time
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Keys Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            API Keys ({keys.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {keys.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Provider</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Requests</TableHead>
                                            <TableHead>Tokens</TableHead>
                                            <TableHead>Cost</TableHead>
                                            <TableHead>Last Used</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {keys.map((key) => (
                                            <TableRow key={key.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {key.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500 font-mono">
                                                            {key.masked_key}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getProviderBadge(key.provider)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={key.is_active ? 'default' : 'destructive'}>
                                                            {key.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        {key.auto_rotate && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Auto-rotate
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{key.priority}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {key.requests_count.toLocaleString()}
                                                        {key.daily_limit && (
                                                            <span className="text-gray-500">
                                                                /{key.daily_limit.toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {key.tokens_used.toLocaleString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium">
                                                        {formatCost(key.total_cost)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-gray-500">
                                                        {key.last_used_at
                                                            ? new Date(key.last_used_at).toLocaleDateString()
                                                            : 'Never'
                                                        }
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/admin/settings/ai-keys/${key.id}/edit`}>
                                                                    <Edit className="h-4 w-4 mr-2" />
                                                                    Edit
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleToggleActive(key)}>
                                                                <Power className="h-4 w-4 mr-2" />
                                                                {key.is_active ? 'Deactivate' : 'Activate'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleResetStats(key)}>
                                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                                Reset Stats
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(key)}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No API keys configured
                                </h3>
                                <p className="text-gray-500 mb-6">
                                    Add your first AI provider API key to enable content generation
                                </p>
                                <Link href="/admin/settings/ai-keys/create">
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Your First Key
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
