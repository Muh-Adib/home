import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Star, ArrowRight, Crown } from 'lucide-react';
import { type SharedData } from '@/types';
import { Property } from '@/types/property';

// Above-the-fold components
import HeroSlideshow from '@/components/ui/hero-slideshow';
import HeroSearchBar from '@/components/ui/hero-search-bar';
import PropertyCardEnhanced from '@/components/ui/property-card-enhanced';
import ScrollToTop from '@/components/ui/scroll-to-top';

// Below-the-fold — static import for SSR/SEO
import BelowFoldContent from './Welcome/BelowFoldContent';

interface WelcomeProps {
    featuredProperties: Property[];
}

export default function Welcome({ featuredProperties }: WelcomeProps) {
    const { auth } = usePage<SharedData>().props;
    const [searchLoading, setSearchLoading] = useState(false);

    const safeFeaturedProperties: Property[] = Array.isArray(featuredProperties)
        ? featuredProperties
        : [];

    // Hero slideshow: cover image first, then first media
    const slideshowImages = safeFeaturedProperties
        .filter(p => p?.media && p.media.length > 0)
        .slice(0, 5)
        .map(p => {
            const cover = p.media.find((m: any) => m.is_cover);
            const img = cover ?? p.media[0];
            return { url: img.url, alt: p.name, title: p.name };
        });

    const handleQuickSearch = (params: { checkIn: string; checkOut: string; guests: number }) => {
        setSearchLoading(true);
        const qs = new URLSearchParams({
            check_in: params.checkIn,
            check_out: params.checkOut,
            guests: params.guests.toString(),
        });
        router.visit(`/properties?${qs.toString()}`, {
            onFinish: () => setSearchLoading(false),
        });
    };

    // Testimonials — kept here so they can be replaced with DB data later
    const testimonials = [
        {
            name: 'Budi Santoso',
            location: 'Jakarta',
            rating: 5,
            comment: 'Pengalaman menginap yang luar biasa! Homestay dekat Malioboro dengan hospitality yang sangat ramah.',
        },
        {
            name: 'Sari Dewi',
            location: 'Bandung',
            rating: 5,
            comment: 'Fasilitas lengkap dan lokasi strategis. Perfect untuk liburan keluarga di Jogja!',
        },
        {
            name: 'Ahmad Rahman',
            location: 'Surabaya',
            rating: 5,
            comment: 'Suasana yang nyaman dan autentik. Merasa seperti di rumah sendiri.',
        },
    ];

    return (
        <GuestLayout variant="minimal">
            {/* ── SEO: meta tags + all JSON-LD schemas (org, website, webSiteSchema) ── */}
            <SeoHead />
            <SchemaOrg />

            <div className="min-h-screen bg-background">

                {/* ══════════════════════════════════════════════════════════════
                    HERO — Above the fold
                    SEO: H1 contains primary keyword "Homestay Jogja" at start
                ══════════════════════════════════════════════════════════════ */}
                <section
                    aria-label="Hero"
                    className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden"
                    style={{ marginTop: '-10vh' }}
                >
                    <HeroSlideshow
                        images={slideshowImages}
                        autoPlay
                        interval={6000}
                        showControls={false}
                        showIndicators={false}
                        className="absolute inset-0 z-0"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-[1]" />

                    <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center pt-20">
                        <div className="max-w-4xl mx-auto">

                            {/* Trust badge */}
                            <motion.div
                                initial={{ opacity: 0, y: -16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                className="flex justify-center mb-6"
                            >
                                <Badge className="bg-white/15 backdrop-blur-md border border-white/30 text-white px-5 py-2 text-sm font-medium rounded-full shadow-lg gap-2">
                                    <Crown className="h-4 w-4 text-brand-accent" />
                                    Homestay Terpercaya di Jogja Sejak 2020
                                </Badge>
                            </motion.div>

                            {/* H1 — primary keyword at the very start */}
                            <motion.h1
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.1 }}
                                className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-5 leading-tight"
                            >
                                <span className="block">Homestay Jogja</span>
                                <span className="block text-brand-accent">& Villa Murah</span>
                                <span className="block font-light text-3xl md:text-4xl mt-2 text-white/90">
                                    Terbaik di Yogyakarta
                                </span>
                            </motion.h1>

                            {/* Subheading — secondary keywords */}
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.25 }}
                                className="text-base md:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed mb-10"
                            >
                                Temukan <strong className="text-white">penginapan murah Jogja</strong> mulai 150rb/malam.
                                Dari dekat Malioboro hingga Taman Sari — fasilitas lengkap, booking mudah &amp; aman.
                            </motion.p>

                            {/* Search bar */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.4 }}
                                className="max-w-4xl mx-auto mb-8"
                            >
                                <HeroSearchBar onSearch={handleQuickSearch} loading={searchLoading} />
                            </motion.div>

                            {/* Quick trust signals */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.6 }}
                                className="flex flex-wrap items-center justify-center gap-4 text-white/70 text-sm"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    Rating 4.8/5
                                </span>
                                <span className="hidden sm:block text-white/30">·</span>
                                <span>1000+ Properti Terverifikasi</span>
                                <span className="hidden sm:block text-white/30">·</span>
                                <span>50K+ Tamu Puas</span>
                                <span className="hidden sm:block text-white/30">·</span>
                                <span>Booking Instan</span>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════════
                    FEATURED PROPERTIES
                    SEO: H2 with keyword, property cards with structured data
                ══════════════════════════════════════════════════════════════ */}
                {safeFeaturedProperties.length > 0 && (
                    <section aria-label="Properti Unggulan" className="py-16 md:py-20 bg-muted/40">
                        <div className="container mx-auto px-4 sm:px-6">
                            <motion.div
                                className="text-center mb-12"
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                viewport={{ once: true }}
                            >
                                <Badge className="mb-4 bg-background text-brand-primary border border-brand-primary/30 px-4 py-1.5 gap-1.5">
                                    <Star className="h-3.5 w-3.5 fill-brand-primary text-brand-primary" />
                                    Pilihan Terbaik
                                </Badge>
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                                    Homestay &amp; Villa Jogja Terfavorit
                                </h2>
                                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                    Koleksi penginapan dan villa murah Jogja dengan citarasa autentik — dipilih langsung oleh tim kami
                                </p>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                                {safeFeaturedProperties.slice(0, 6).map((property, index) => (
                                    <motion.div
                                        key={property?.id ?? `prop-${index}`}
                                        initial={{ opacity: 0, y: 24 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: index * 0.08 }}
                                        viewport={{ once: true }}
                                    >
                                        <PropertyCardEnhanced
                                            property={property}
                                            showLocationBadge
                                            showRating
                                            priority={index < 2}
                                        />
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div
                                className="text-center mt-12"
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                viewport={{ once: true }}
                            >
                                <Button size="lg" variant="outline" className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition-colors px-8" asChild>
                                    <Link href="/properties">
                                        Jelajahi Semua Homestay &amp; Villa
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Link>
                                </Button>
                            </motion.div>
                        </div>
                    </section>
                )}

                {/* Below-the-fold: stats, features, testimonials, CTA */}
                <BelowFoldContent auth={auth} testimonials={testimonials} />
            </div>

            <ScrollToTop />
        </GuestLayout>
    );
}