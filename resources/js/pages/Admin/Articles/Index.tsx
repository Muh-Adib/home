import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type BreadcrumbItem, type PaginatedData, type PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    FileText,
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Edit,
    Eye,
    Trash2,
    Calendar,
    BarChart,
    Copy,
    Send,
    Kanban
} from 'lucide-react';
import { useState } from 'react';

interface Article {
    id: number;
    title: string;
    slug: string;
    status: 'draft' | 'scheduled' | 'published' | 'archived' | 'reviewing';
    language: string;
    published_at?: string;
    scheduled_at?: string;
    author: {
        id: number;
        name: string;
    };
    view_count: number;
    properties_count: number;
    created_at: string;
    content_plan_id?: number;
}

interface ArticlesIndexProps {
    articles: PaginatedData<Article>;
    filters: {
        search?: string;
        status?: string;
        language?: string;
    };
    languages: string[];
}

export default function ArticlesIndex({ articles, filters, languages }: ArticlesIndexProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [languageFilter, setLanguageFilter] = useState(filters.language || 'all');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Articles' },
    ];

    const handleSearch = () => {
        router.get('/admin/articles', {
            search: searchTerm,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            language: languageFilter !== 'all' ? languageFilter : undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDelete = (article: Article) => {
        if (confirm(`Delete article "${article.title}"?`)) {
            router.delete(`/admin/articles/${article.slug}`, {
                preserveScroll: true,
            });
        }
    };

    const handlePublish = (article: Article) => {
        router.post(`/admin/articles/${article.slug}/publish`, {}, {
            preserveScroll: true,
        });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
            draft: { variant: 'secondary', label: 'Draft' },
            scheduled: { variant: 'outline', label: 'Scheduled' },
            published: { variant: 'default', label: 'Published' },
            archived: { variant: 'destructive', label: 'Archived' },
            reviewing: { variant: 'secondary', label: 'In Review' },
        };

        const config = statusConfig[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    // Check permissions
    const canCreate = auth.user.role !== 'guest';
    const canEdit = (article: Article) => {
        if (auth.user.role === 'super_admin') return true;
        if (article.author.id === auth.user.id) return true;
        return ['property_manager'].includes(auth.user.role);
    };
    const canDelete = (article: Article) => {
        if (auth.user.role === 'super_admin') return true;
        return article.author.id === auth.user.id;
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Articles">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Articles & Content
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Manage articles for SEO and property promotion
                        </p>
                    </div>

                    {canCreate && (
                        <div className="flex gap-2">
                            <Link href="/admin/content-plans">
                                <Button variant="outline" className="gap-2">
                                    <Kanban className="h-4 w-4" />
                                    Content Planner
                                </Button>
                            </Link>
                            <Link href="/admin/articles/create">
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Article
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Search
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Search articles..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                    <Button onClick={handleSearch} variant="outline">
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Status
                                </label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="reviewing">In Review</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Language
                                </label>
                                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Languages</SelectItem>
                                        {languages.map(lang => (
                                            <SelectItem key={lang} value={lang}>
                                                {lang === 'id' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end">
                                <Button onClick={handleSearch} className="w-full">
                                    Apply Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Articles Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            All Articles ({articles.total})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {articles.data.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Language</TableHead>
                                            <TableHead>Author</TableHead>
                                            <TableHead>Views</TableHead>
                                            <TableHead>Properties</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {articles.data.map((article) => (
                                            <TableRow
                                                key={article.id}
                                                className="cursor-pointer hover:bg-gray-50"
                                                onClick={() => router.visit(`/admin/articles/${article.slug}/edit`)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                            <FileText className="h-5 w-5 text-gray-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900 flex items-center gap-2">
                                                                {article.title}
                                                                {article.content_plan_id && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        <Kanban className="h-3 w-3 mr-1" />
                                                                        From Plan
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                /{article.slug}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(article.status)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">
                                                        {article.language === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-gray-900">{article.author.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <BarChart className="h-4 w-4 mr-1" />
                                                        {article.view_count}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-gray-500">
                                                        {article.properties_count} linked
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-gray-500">
                                                        {article.published_at
                                                            ? new Date(article.published_at).toLocaleDateString()
                                                            : new Date(article.created_at).toLocaleDateString()
                                                        }
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {article.status === 'published' && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/articles/${article.slug}`} target="_blank">
                                                                        <Eye className="h-4 w-4 mr-2" />
                                                                        View Published
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canEdit(article) && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/admin/articles/${article.slug}/edit`}>
                                                                        <Edit className="h-4 w-4 mr-2" />
                                                                        Edit
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canEdit(article) && (article.status === 'draft' || article.status === 'reviewing') && (
                                                                <DropdownMenuItem onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePublish(article);
                                                                }}>
                                                                    <Send className="h-4 w-4 mr-2" />
                                                                    Publish Now
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canEdit(article) && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/admin/articles/${article.slug}/duplicate`} method="post">
                                                                        <Copy className="h-4 w-4 mr-2" />
                                                                        Duplicate
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canDelete(article) && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDelete(article);
                                                                        }}
                                                                        className="text-red-600"
                                                                    >
                                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
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
                                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No articles yet
                                </h3>
                                <p className="text-gray-500 mb-6">
                                    Start creating articles to improve SEO and showcase properties
                                </p>
                                {canCreate && (
                                    <Link href="/admin/articles/create">
                                        <Button>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Your First Article
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {articles.data.length > 0 && articles.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Showing {articles.from} - {articles.to} of {articles.total}
                        </div>
                        <div className="flex space-x-2">
                            {articles.prev_page_url && (
                                <Link href={articles.prev_page_url}>
                                    <Button variant="outline" size="sm">
                                        Previous
                                    </Button>
                                </Link>
                            )}
                            {articles.next_page_url && (
                                <Link href={articles.next_page_url}>
                                    <Button variant="outline" size="sm">
                                        Next
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
