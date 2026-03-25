import GuestLayout from '@/layouts/guest-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Calendar, User, Eye, ArrowLeft, Share2 } from 'lucide-react';
import { useEffect } from 'react';
import { ArticleContent } from '@/components/Article/ArticleContent';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';

interface Property {
    id: number;
    name: string;
    slug: string;
    address: string;
    base_rate: number;
    media: Array<{
        id: number;
        file_path: string;
        url: string;
    }>;
}

interface Article {
    id: number;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    featured_image?: string;
    language: string;
    published_at: string;
    view_count: number;
    author: {
        id: number;
        name: string;
    };
    properties: Property[];
}

interface ArticleShowProps {
    article: Article;
    relatedArticles: Article[];
}

export default function ArticleShow({ article, relatedArticles }: ArticleShowProps) {
    const page = usePage<PageProps>();

    useEffect(() => {
        // Update page title for SEO
        document.title = article.title;
    }, [article.title]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <GuestLayout variant='minimal'>
            {/* SEO: Head tags and JSON-LD Schema */}
            <SeoHead />
            <SchemaOrg />

            <div className="min-h-screen bg-gray-50">
                {/* Enhanced Hero section - Edge to Edge */}
                <div className="relative w-full min-h-[50vh] flex flex-col justify-end overflow-hidden bg-gray-900 mt-[-2rem]">
                    {/* Background Image */}
                    {article.featured_image ? (
                        <>
                            <img
                                src={article.featured_image.startsWith('http') ? article.featured_image : `/storage/${article.featured_image}`}
                                alt={article.title}
                                className="absolute inset-0 w-full h-full object-cover opacity-60"
                            />
                            {/* Gradient Overlay for Text Readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
                        </>
                    ) : (
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-800 to-indigo-900"></div>
                    )}

                    {/* Header Content overlaying image map */}
                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full pt-32">
                        <Link href="/articles" className="inline-flex items-center text-sm text-gray-300 hover:text-white mb-6 transition-colors">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Articles
                        </Link>

                        <div className="space-y-4">
                            <Badge variant="outline" className="border-white/40 text-white bg-black/20 backdrop-blur-sm">
                                {article.language === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English'}
                            </Badge>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight drop-shadow-md max-w-4xl">
                                {article.title}
                            </h1>

                            {article.excerpt && (
                                <p className="text-xl text-gray-200 leading-relaxed max-w-3xl drop-shadow">
                                    {article.excerpt}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300 pt-4">
                                <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                    <User className="h-4 w-4 text-brand-accent-30" />
                                    <span className="font-medium text-white">{article.author.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-brand-accent-30" />
                                    {formatDate(article.published_at)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4 text-brand-accent-30" />
                                    {article.view_count.toLocaleString()} views
                                </div>

                                <Button variant="outline" size="sm" className="ml-auto bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Main Content */}
                        <div className="lg:col-span-2">
                            <ArticleContent content={article.content} />

                            {/* Related Articles */}
                            {relatedArticles.length > 0 && (
                                <div className="mt-12">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
                                    <div className="grid gap-6">
                                        {relatedArticles.map(related => (
                                            <Link key={related.id} href={`/articles/${related.slug}`}>
                                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                                    <CardContent className="p-6">
                                                        <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600">
                                                            {related.title}
                                                        </h3>
                                                        {related.excerpt && (
                                                            <p className="text-gray-600 line-clamp-2">
                                                                {related.excerpt}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                                                            <span>{formatDate(related.published_at)}</span>
                                                            <span>•</span>
                                                            <span>{related.view_count} views</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 space-y-6">
                                {/* Featured Properties */}
                                {article.properties.length > 0 && (
                                    <Card>
                                        <CardContent className="p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                                Featured Properties
                                            </h3>
                                            <div className="space-y-4">
                                                {article.properties.map(property => (
                                                    <Link
                                                        key={property.id}
                                                        href={`/properties/${property.slug}`}
                                                        className="block group"
                                                    >
                                                        <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                                            {property.media.length > 0 && (
                                                                <img
                                                                    src={property.media[0].url}
                                                                    alt={property.name}
                                                                    className="w-full h-32 object-cover"
                                                                    loading="lazy"
                                                                />
                                                            )}
                                                            <div className="p-3">
                                                                <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-1">
                                                                    {property.name}
                                                                </h4>
                                                                <p className="text-sm text-gray-600 line-clamp-1">
                                                                    {property.address}
                                                                </p>
                                                                <p className="text-sm font-semibold text-blue-600 mt-2">
                                                                    Mulai Rp {property.base_rate.toLocaleString()}/malam
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* CTA */}
                                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                    <CardContent className="p-6">
                                        <h3 className="text-lg font-semibold mb-2">
                                            Cari Penginapan Murah di Jogja
                                        </h3>
                                        <p className="text-blue-100 mb-4 text-sm">
                                            Temukan villa, homestay, gapuesthouse, dan hotel murah di Jogja
                                        </p>
                                        <Link href="/properties">
                                            <Button variant="secondary" className="w-full">
                                                Lihat Semua Penginapan
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
