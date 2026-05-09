import GuestLayout from '@/layouts/guest-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { Calendar, User, Eye, ArrowLeft, Share2 } from 'lucide-react';
import { ArticleContent } from '@/components/Article/ArticleContent';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <GuestLayout variant="minimal">
            <SeoHead />
            <SchemaOrg />

            <div className="min-h-screen bg-background">
                {/* ── Hero Section ─────────────────────────────────── */}
                <div className="relative w-full min-h-[55vh] flex flex-col justify-end overflow-hidden">
                    {/* Background: image or brand gradient */}
                    {article.featured_image ? (
                        <img
                            src={
                                article.featured_image.startsWith('http')
                                    ? article.featured_image
                                    : `/storage/${article.featured_image}`
                            }
                            alt={article.title}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-brand-primary" />
                    )}

                    {/* Strong gradient overlay — always dark at bottom for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

                    {/* Content */}
                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full pt-24">
                        <Link
                            href="/articles"
                            className="inline-flex items-center text-sm text-white/70 hover:text-white mb-6 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1.5" />
                            {t('articles.back_to_articles', 'Kembali ke Artikel')}
                        </Link>

                        <div className="space-y-4">
                            <Badge
                                variant="outline"
                                className="border-white/30 text-white bg-white/10 backdrop-blur-sm"
                            >
                                {article.language === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English'}
                            </Badge>

                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight drop-shadow-md max-w-4xl">
                                {article.title}
                            </h1>

                            {article.excerpt && (
                                <p className="text-lg text-white/85 leading-relaxed max-w-3xl drop-shadow">
                                    {article.excerpt}
                                </p>
                            )}

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                    <User className="h-3.5 w-3.5 text-white/70" />
                                    <span className="text-sm font-medium text-white">{article.author.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-white/70">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatDate(article.published_at)}
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-white/70">
                                    <Eye className="h-3.5 w-3.5" />
                                    {article.view_count.toLocaleString()} {t('articles.views', 'views')}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-auto bg-white/10 text-white border-white/25 hover:bg-white/20 hover:text-white backdrop-blur-sm"
                                    onClick={async () => {
                                        if (navigator.share) {
                                            try {
                                                await navigator.share({
                                                    title: article.title,
                                                    text: article.excerpt || article.title,
                                                    url: window.location.href,
                                                });
                                            } catch {
                                                // User cancelled
                                            }
                                        } else {
                                            await navigator.clipboard.writeText(window.location.href);
                                        }
                                    }}
                                >
                                    <Share2 className="h-4 w-4 mr-2" />
                                    {t('common.share', 'Bagikan')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content ──────────────────────────────────────── */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                        {/* Main Content */}
                        <div className="lg:col-span-2">
                            <ArticleContent content={article.content} />

                            {/* Related Articles */}
                            {relatedArticles.length > 0 && (
                                <div className="mt-12">
                                    <h2 className="text-2xl font-bold text-foreground mb-6">
                                        {t('articles.related_articles', 'Artikel Terkait')}
                                    </h2>
                                    <div className="grid gap-4">
                                        {relatedArticles.map((related) => (
                                            <Link key={related.id} href={`/articles/${related.slug}`}>
                                                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border">
                                                    <CardContent className="p-5">
                                                        <h3 className="text-lg font-semibold text-foreground mb-1.5 hover:text-brand-primary transition-colors">
                                                            {related.title}
                                                        </h3>
                                                        {related.excerpt && (
                                                            <p className="text-muted-foreground line-clamp-2 text-sm">
                                                                {related.excerpt}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                                                            <span>{formatDate(related.published_at)}</span>
                                                            <span>·</span>
                                                            <span>{related.view_count.toLocaleString()} {t('articles.views', 'views')}</span>
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
                                    <Card className="border-border">
                                        <CardContent className="p-6">
                                            <h3 className="text-base font-semibold text-foreground mb-4">
                                                {t('articles.featured_properties', 'Properti Terkait')}
                                            </h3>
                                            <div className="space-y-4">
                                                {article.properties.map((property) => (
                                                    <Link
                                                        key={property.id}
                                                        href={`/properties/${property.slug}`}
                                                        className="block group"
                                                    >
                                                        <div className="border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-card">
                                                            {property.media.length > 0 && (
                                                                <img
                                                                    src={property.media[0].url}
                                                                    alt={property.name}
                                                                    className="w-full h-32 object-cover"
                                                                    loading="lazy"
                                                                />
                                                            )}
                                                            <div className="p-3">
                                                                <h4 className="font-semibold text-foreground group-hover:text-brand-primary transition-colors mb-1 text-sm">
                                                                    {property.name}
                                                                </h4>
                                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                                    {property.address}
                                                                </p>
                                                                <p className="text-sm font-semibold text-brand-primary mt-2">
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

                                {/* CTA Card */}
                                <Card className="overflow-hidden border-0">
                                    <div className="bg-brand-primary p-6">
                                        {/* Subtle overlay for depth */}
                                        <div className="relative">
                                            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                                            <h3 className="text-base font-bold text-white mb-2 relative">
                                                {t('articles.cta_title', 'Cari Penginapan di Jogja')}
                                            </h3>
                                            <p className="text-white/80 mb-4 text-sm relative">
                                                {t('articles.cta_desc', 'Temukan villa, homestay, dan guesthouse terbaik di Jogja.')}
                                            </p>
                                            <Link href="/properties">
                                                <Button
                                                    className="w-full bg-white text-brand-primary hover:bg-white/90 font-semibold"
                                                >
                                                    {t('articles.cta_button', 'Lihat Semua Penginapan')}
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
