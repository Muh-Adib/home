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
    Kanban,
    AlertTriangle,
    CheckCircle,
    Activity,
    Clock
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    completeness_score?: number;
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
    const [isLoading, setIsLoading] = useState(false);
    const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

    // Effect to clear loading state when articles prop changes
    useEffect(() => {
        setIsLoading(false);
    }, [articles]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Articles' },
    ];

    const handleSearch = () => {
        setIsLoading(true);
        router.get('/admin/articles', {
            search: searchTerm,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            language: languageFilter !== 'all' ? languageFilter : undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['articles', 'filters'],
            onFinish: () => setIsLoading(false)
        });
    };

    const handleDelete = (article: Article) => {
        setArticleToDelete(article);
    };

    const confirmDelete = () => {
        if (articleToDelete) {
            router.delete(`/admin/articles/${articleToDelete.slug}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setArticleToDelete(null);
                }
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
        return <Badge variant={config.variant as any}>{config.label}</Badge>;
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

                {/* Top KPI Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-600">Total Articles</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{articles.total}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-600">Total Views</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">
                            {articles.data.reduce((acc, curr) => acc + curr.view_count, 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-600">Avg Completeness</p>
                        <p className="text-2xl font-bold text-indigo-600 mt-1">
                            {articles.data.length > 0
                                ? Math.round(articles.data.reduce((acc, curr) => acc + (curr.completeness_score || 0), 0) / articles.data.length)
                                : 0}%
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-600">Need Attention</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">
                            {articles.data.filter(a => (a.completeness_score || 0) < 50 && a.status === 'published').length}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs text-gray-500 mb-1 block">Search Articles</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search by title or slug..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        // Debounce search
                                        const timer = setTimeout(() => {
                                             setIsLoading(true);
                                             router.get('/admin/articles', {
                                                search: e.target.value,
                                                status: statusFilter !== 'all' ? statusFilter : undefined,
                                                language: languageFilter !== 'all' ? languageFilter : undefined,
                                             }, { preserveState: true, only: ['articles', 'filters'], onFinish: () => setIsLoading(false) });
                                        }, 500);
                                        return () => clearTimeout(timer);
                                    }}
                                    className="pl-10 h-9"
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                        </div>

                        <div className="w-full md:w-48">
                            <label className="text-xs text-gray-500 mb-1 block">Status</label>
                            <Select 
                                value={statusFilter} 
                                onValueChange={(val) => {
                                    setStatusFilter(val);
                                    setIsLoading(true);
                                    router.get('/admin/articles', {
                                        search: searchTerm,
                                        status: val !== 'all' ? val : undefined,
                                        language: languageFilter !== 'all' ? languageFilter : undefined,
                                    }, { preserveState: true, preserveScroll: true, only: ['articles', 'filters'], onFinish: () => setIsLoading(false) });
                                }}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Status" />
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

                        <div className="w-full md:w-48">
                            <label className="text-xs text-gray-500 mb-1 block">Language</label>
                            <Select 
                                value={languageFilter} 
                                onValueChange={(val) => {
                                    setLanguageFilter(val);
                                    setIsLoading(true);
                                    router.get('/admin/articles', {
                                        search: searchTerm,
                                        status: statusFilter !== 'all' ? statusFilter : undefined,
                                        language: val !== 'all' ? val : undefined,
                                    }, { preserveState: true, preserveScroll: true, only: ['articles', 'filters'], onFinish: () => setIsLoading(false) });
                                }}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Languages" />
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
                    </div>
                </div>

                {/* Articles List / Table view removed */}
                <div className="space-y-4">
                    <div className="mb-2 text-sm text-gray-500">
                        All Articles ({articles.total})
                    </div>
                    
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <ArticleSkeleton key={i} />
                            ))}
                        </div>
                    ) : articles.data.length > 0 ? (
                        articles.data.map((article) => (
                            <ArticleCard 
                                key={article.id} 
                                article={article} 
                                getStatusBadge={getStatusBadge}
                                onPublish={handlePublish}
                                onDelete={handleDelete}
                                canEdit={canEdit(article)}
                                canDelete={canDelete(article)}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
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
                </div>

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

                {/* Delete Confirmation Modal */}
                <Dialog open={articleToDelete !== null} onOpenChange={(open) => !open && setArticleToDelete(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-black text-xl text-slate-800 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Hapus Artikel
                            </DialogTitle>
                            <DialogDescription className="text-slate-600 mt-2">
                                Apakah Anda yakin ingin menghapus artikel <strong>"{articleToDelete?.title}"</strong>? Tindakan ini tidak dapat dibatalkan.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="pt-4 flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setArticleToDelete(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={confirmDelete}
                                className="font-bold"
                            >
                                Hapus
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}

// Subcomponents
const ArticleSkeleton = () => (
    <div className="bg-white border rounded-lg p-5 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-64 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-80 rounded-md" />
            <div className="flex items-center gap-4 pt-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
            </div>
        </div>
        <div className="w-8">
            <Skeleton className="h-8 w-8 rounded-md" />
        </div>
    </div>
);

interface ArticleCardProps {
    article: Article;
    getStatusBadge: (status: string) => React.ReactNode;
    onPublish: (article: Article) => void;
    onDelete: (article: Article) => void;
    canEdit: boolean;
    canDelete: boolean;
}

const ArticleCard = React.memo(({ article, getStatusBadge, onPublish, onDelete, canEdit, canDelete }: ArticleCardProps) => {
    return (
        <div
            className="group bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col md:flex-row gap-4 justify-between"
            onClick={() => router.visit(`/admin/articles/${article.slug}/edit`)}
        >
            <div className="flex-1 space-y-2">
                <div className="flex items-start gap-2 max-w-[90%]">
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1">{article.title}</h3>
                    {getStatusBadge(article.status)}
                    {article.content_plan_id && (
                        <div className="text-[10px] hidden sm:flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium tracking-wide">
                            <Kanban className="h-3 w-3 mr-1" />
                            From Plan
                        </div>
                    )}
                </div>
                
                <div className="flex items-center text-sm text-gray-500 gap-2">
                    <span className="font-mono text-xs bg-gray-50 px-1.5 py-0.5 rounded border">/{article.slug}</span>
                    <span className="hidden sm:inline-block text-gray-300">•</span>
                    <span>By {article.author.name}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 pt-1">
                    <span className="flex items-center line-clamp-1">
                         {article.language === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
                    </span>
                    
                    <span className="flex items-center">
                        <BarChart className="h-3.5 w-3.5 mr-1" />
                        {article.view_count} views
                    </span>
                    
                    <span>{article.properties_count} properties linked</span>

                    <span className="flex items-center">
                        {article.status === 'scheduled' && article.scheduled_at ? (
                            <>
                                <Clock className="h-3.5 w-3.5 mr-1 text-amber-500" />
                                <span className="text-amber-600 font-medium">Auto-publishes {new Date(article.scheduled_at).toLocaleDateString()}</span>
                            </>
                        ) : (
                            <>
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                {article.published_at
                                    ? new Date(article.published_at).toLocaleDateString()
                                    : new Date(article.created_at).toLocaleDateString()
                                }
                            </>
                        )}
                    </span>
                    
                    {/* Completeness logic simplified for the card */}
                    <div className="flex items-center ml-auto">
                        <span className={cn(
                            "font-medium mr-1.5",
                            (article.completeness_score || 0) >= 80 ? 'text-green-600' :
                                (article.completeness_score || 0) >= 50 ? 'text-amber-600' : 'text-red-500'
                        )}>
                            Score: {article.completeness_score || 0}%
                        </span>
                        {(article.completeness_score || 0) < 50 && article.status === 'published' && (
                            <span title="Needs attention">
                                <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                            </span>
                        )}
                        {(article.completeness_score || 0) >= 80 && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
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
                        {canEdit && (
                            <DropdownMenuItem asChild>
                                <Link href={`/admin/articles/${article.slug}/edit`}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Article
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {canEdit && (article.status === 'draft' || article.status === 'reviewing') && (
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onPublish(article);
                            }}>
                                <Send className="h-4 w-4 mr-2 text-blue-600" />
                                <span className="text-blue-600 font-medium">Publish Now</span>
                            </DropdownMenuItem>
                        )}
                        {canEdit && (
                            <DropdownMenuItem asChild>
                                <Link href={`/admin/articles/${article.slug}/duplicate`} method="post">
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {canDelete && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(article);
                                    }}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
});
