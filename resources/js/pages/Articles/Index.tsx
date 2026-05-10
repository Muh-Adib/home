import GuestLayout from '@/layouts/guest-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type PaginatedData } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Search, Calendar, Eye, ArrowRight, FileText } from 'lucide-react';
import { useState } from 'react';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleSearch = () => {
        router.get(
            '/articles',
            {
                search: searchTerm,
            },
            {
                preserveState: true,
            },
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <GuestLayout variant="minimal">
            <SeoHead
                title="Artikel & Tips Wisata Yogyakarta"
                description="Baca tips menginap, panduan wisata Jogja, dan cerita inspiratif dari Homsjogja. Temukan rekomendasi homestay dan villa terbaik di Yogyakarta."
            />
            <SchemaOrg />
            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <div className="relative overflow-hidden bg-brand-primary">
                    {/* Dark overlay gradient for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-transparent pointer-events-none" />
                    {/* Decorative blobs */}
                    <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />

                    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 mb-6">
                            <FileText className="h-3.5 w-3.5 text-white" />
                            <span className="text-xs font-semibold text-white tracking-wide uppercase">{t('nav.articles')}</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-sm">
                            {t('nav.articles')}
                        </h1>
                        <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl leading-relaxed">
                            {t('articles.hero_subtitle', 'Temukan tips, panduan, dan cerita tentang penginapan terbaik di Jogja.')}
                        </p>

                        {/* Search */}
                        <div className="max-w-xl">
                            <div className="flex gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-1.5">
                                <Input
                                    placeholder={t('articles.search_placeholder', 'Cari artikel...')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="bg-transparent border-0 text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                                />
                                <Button
                                    onClick={handleSearch}
                                    className="bg-white text-brand-primary hover:bg-white/90 rounded-xl shrink-0 font-semibold px-5"
                                >
                                    <Search className="h-4 w-4 mr-2" />
                                    {t('common.search')}
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
                                {articles.data.map((article) => (
                                    <motion.div
                                        key={article.id}
                                        whileHover={{ y: -4 }}
                                        transition={{ duration: 0.25, ease: 'easeOut' }}
                                    >
                                        <Link href={`/articles/${article.slug}`}>
                                            <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer overflow-hidden">
                                                {/* Featured Image */}
                                                <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-brand-primary/5 to-brand-primary/10">
                                                    {article.featured_image ? (
                                                        <img
                                                            src={
                                                                article.featured_image.startsWith('http')
                                                                    ? article.featured_image
                                                                    : `/storage/${article.featured_image}`
                                                            }
                                                            alt={article.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                // Fallback to placeholder if image fails to load
                                                                e.currentTarget.style.display = 'none';
                                                                e.currentTarget.parentElement!.innerHTML =
                                                                    '<div class="w-full h-full flex items-center justify-center"><svg class="h-16 w-16 text-brand-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <svg
                                                                className="h-16 w-16 text-brand-primary/40"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>

                                                <CardContent className="p-0 flex flex-col h-full">
                                                    <div className="p-6 flex-1 flex flex-col">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                                            <Calendar className="h-4 w-4" />
                                                            {formatDate(article.published_at)}
                                                        </div>

                                                        <h2 className="text-xl font-bold text-foreground mb-3 group-hover:text-brand-primary transition-colors line-clamp-2 h-[56px]">
                                                            {article.title}
                                                        </h2>

                                                        {article.excerpt ? (
                                                            <p className="text-muted-foreground mb-4 line-clamp-3 text-sm flex-1">
                                                                {article.excerpt}
                                                            </p>
                                                        ) : (
                                                            <div className="flex-1"></div>
                                                        )}
                                                    </div>

                                                    <div className="px-6 py-4 bg-background flex items-center justify-between border-t mt-auto">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Eye className="h-4 w-4" />
                                                            {article.view_count.toLocaleString()} views
                                                        </div>
                                                        <div className="flex items-center gap-1 text-brand-primary font-medium text-sm group-hover:gap-2 transition-all">
                                                            {t('articles.read_more', 'Baca Selengkapnya')}
                                                            <ArrowRight className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {articles.last_page > 1 && (
                                <div className="flex items-center justify-center gap-4 mt-12">
                                    {articles.prev_page_url && (
                                        <Link href={articles.prev_page_url}>
                                            <Button variant="outline">{t('Previous')}</Button>
                                        </Link>
                                    )}
                                    <span className="text-muted-foreground">
                                        {t('Page')} {articles.current_page} {t('of')} {articles.last_page}
                                    </span>
                                    {articles.next_page_url && (
                                        <Link href={articles.next_page_url}>
                                            <Button variant="outline">{t('Next')}</Button>
                                        </Link>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <div className="max-w-md mx-auto">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">{t('articles.no_articles', 'Tidak ada artikel ditemukan')}</h3>
                                <p className="text-muted-foreground mb-6">
                                    {filters.search
                                        ? t('articles.no_results_for', 'Tidak ada hasil untuk "{{term}}"', { term: filters.search })
                                        : t('articles.check_back', 'Nantikan konten terbaru kami')}
                                </p>
                                {filters.search && (
                                    <Button onClick={() => router.get('/articles')}>{t('Clear Filters')}</Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GuestLayout>
    );
}
