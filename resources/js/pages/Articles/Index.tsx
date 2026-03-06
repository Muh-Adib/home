import GuestLayout from '@/layouts/guest-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type PaginatedData } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Search, Calendar, Eye, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
    featured_image?: string;
    language: string;
    published_at: string;
    view_count: number;
    author: {
        name: string;
    };
}

interface ArticlesIndexProps {
    articles: PaginatedData<Article>;
    filters: {
        search?: string;
        language?: string;
    };
}

export default function ArticlesPublicIndex({ articles, filters }: ArticlesIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleSearch = () => {
        router.get('/articles', {
            search: searchTerm,
        }, {
            preserveState: true,
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <GuestLayout variant='minimal'>
            <div className="min-h-screen bg-gray-50">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Articles & Guides
                        </h1>
                        <p className="text-xl text-blue-100 mb-8 max-w-2xl">
                            Discover tips, guides, and stories about finding  the perfect place to stay
                        </p>

                        {/* Search */}
                        <div className="max-w-xl">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search articles..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="bg-white text-gray-900"
                                />
                                <Button onClick={handleSearch} variant="secondary">
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Articles Grid */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {articles.data.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {articles.data.map(article => (
                                    <Link key={article.id} href={`/articles/${article.slug}`}>
                                        <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer overflow-hidden">
                                            {/* Featured Image */}
                                            <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
                                                {article.featured_image ? (
                                                    <img
                                                        src={article.featured_image.startsWith('http') ? article.featured_image : `/storage/${article.featured_image}`}
                                                        alt={article.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            // Fallback to placeholder if image fails to load
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-16 w-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <svg className="h-16 w-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            <CardContent className="p-0 flex flex-col h-full">
                                                <div className="p-6 flex-1 flex flex-col">
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                                        <Calendar className="h-4 w-4" />
                                                        {formatDate(article.published_at)}
                                                    </div>

                                                    <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 h-[56px]">
                                                        {article.title}
                                                    </h2>

                                                    {article.excerpt ? (
                                                        <p className="text-gray-600 mb-4 line-clamp-3 text-sm flex-1">
                                                            {article.excerpt}
                                                        </p>
                                                    ) : (
                                                        <div className="flex-1"></div>
                                                    )}
                                                </div>

                                                <div className="px-6 py-4 bg-gray-50 flex items-center justify-between border-t mt-auto">
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <Eye className="h-4 w-4" />
                                                        {article.view_count.toLocaleString()} views
                                                    </div>
                                                    <div className="flex items-center gap-1 text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">
                                                        Read More
                                                        <ArrowRight className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>

                            {/* Pagination */}
                            {articles.last_page > 1 && (
                                <div className="flex items-center justify-center gap-4 mt-12">
                                    {articles.prev_page_url && (
                                        <Link href={articles.prev_page_url}>
                                            <Button variant="outline">
                                                Previous
                                            </Button>
                                        </Link>
                                    )}
                                    <span className="text-gray-600">
                                        Page {articles.current_page} of {articles.last_page}
                                    </span>
                                    {articles.next_page_url && (
                                        <Link href={articles.next_page_url}>
                                            <Button variant="outline">
                                                Next
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <div className="max-w-md mx-auto">
                                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No articles found
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {filters.search ? `No results for "${filters.search}"` : 'Check back soon for new content'}
                                </p>
                                {filters.search && (
                                    <Button onClick={() => router.get('/articles')}>
                                        Clear Search
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GuestLayout>
    );
}
