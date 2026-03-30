import { useState, useEffect, lazy, Suspense } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
    Star,
    ArrowRight,
    Crown
} from 'lucide-react';
import { type SharedData } from '@/types';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types/property';

// Import above-the-fold components normally
import HeroSlideshow from '@/components/ui/hero-slideshow';
import HeroSearchBar from '@/components/ui/hero-search-bar';
import PropertyCardEnhanced from '@/components/ui/property-card-enhanced';
import ScrollToTop from '@/components/ui/scroll-to-top';

// Static import for SSR (SEO optimization)
import BelowFoldContent from './Welcome/BelowFoldContent';

interface WelcomeProps {
    featuredProperties: Property[];
}

export default function Welcome({ featuredProperties }: WelcomeProps) {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const appName = "Homsjogja";
    const appUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

    // Prepare slideshow images - try not to use heavy format below the fold yet,
    // eager load these via preload if possible
    const slideshowImages = featuredProperties
        .filter(property => property.media && property.media.length > 0)
        .slice(0, 5)
        .map(property => ({
            url: property.media[0].url,
            alt: property.name,
            title: property.name
        }));

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleQuickSearch = async (params: {
        checkIn: string;
        checkOut: string;
        guests: number;
    }) => {
        setSearchLoading(true);

        const searchParams = new URLSearchParams({
            check_in: params.checkIn,
            check_out: params.checkOut,
            guests: params.guests.toString()
        });

        try {
            await router.visit(`/properties?${searchParams.toString()}`);
        } finally {
            setSearchLoading(false);
        }
    };

    // Testimonials data
    const testimonials = [
        {
            name: "Budi Santoso",
            location: "Jakarta",
            rating: 5,
            comment: "Pengalaman menginap yang luar biasa! Homestay dekat Malioboro dengan hospitality yang sangat ramah.",
            avatar: null
        },
        {
            name: "Sari Dewi",
            location: "Bandung",
            rating: 5,
            comment: "Fasilitas lengkap dan lokasi strategis. Perfect untuk liburan keluarga di Jogja!",
            avatar: null
        },
        {
            name: "Ahmad Rahman",
            location: "Surabaya",
            rating: 5,
            comment: "Suasana yang nyaman dan autentik. Merasa seperti di rumah sendiri.",
            avatar: null
        }
    ];

    return (
        <GuestLayout variant="minimal">
            <SeoHead />
            <SchemaOrg />

            <div className="min-h-screen bg-background">
                {/* Hero Section - Above The Fold */}
                <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden" style={{ marginTop: '-10vh' }}>
                    <HeroSlideshow
                        images={slideshowImages}
                        autoPlay={true}
                        interval={6000}
                        showControls={false}
                        showIndicators={false}
                        className="absolute inset-0 z-0"
                    />

                    <div className="container mx-auto px-6 relative z-10 text-center pt-20">
                        <div
                            className="hero-content max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both"
                        >
                            <div
                                className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both"
                            >
                                <Badge className="bg-brand-primary-20 backdrop-blur-md border border-brand-accent-30 text-white px-6 py-2 text-sm font-medium rounded-full shadow-lg">
                                    <Crown className="h-4 w-4 mr-2" />
                                    Homestay Terpercaya di Jogja
                                </Badge>
                            </div>

                            <div
                                className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 fill-mode-both"
                            >
                                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 leading-tight">
                                    <span className="block font-light">Temukan</span>
                                    <span className="block text-brand-accent font-bold">
                                        Homestay Jogja
                                    </span>
                                    <span className="block font-light md:text-5xl">& Villa Murah</span>
                                </h1>

                                <div className="text-xl md:text-2xl text-white/80 font-light tracking-wide">
                                    <span className="block">Pengalaman menginap yang tak terlupakan</span>
                                    <span className="block text-brand-accent">di jantung budaya Jawa</span>
                                </div>
                            </div>

                            <div
                                className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700 fill-mode-both"
                            >
                                <p className="text-lg text-white/90 leading-relaxed text-center">
                                    Dari dekat Malioboro hingga Taman Sari, rasakan kehangatan
                                    <span className="text-brand-accent font-medium"> hospitality Jogja</span> yang autentik.
                                    Jelajahi pilihan <strong>penginapan murah Jogja</strong> dan homestay keluarga dengan fasilitas terlengkap.
                                </p>
                            </div>

                            <div
                                className="max-w-4xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-1000 fill-mode-both"
                            >
                                <HeroSearchBar
                                    onSearch={handleQuickSearch}
                                    loading={searchLoading}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Featured Properties */}
                {featuredProperties.length > 0 && (
                    <motion.section
                        className="py-20 bg-muted"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <div className="container mx-auto px-6">
                            <motion.div
                                className="text-center mb-16"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                viewport={{ once: true }}
                            >
                                <Badge className="mb-6 bg-background text-primary border border-border px-4 py-2">
                                    <Star className="h-4 w-4 mr-2" />
                                    Pilihan Terbaik
                                </Badge>
                                <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                                    Homestay Jogja Terfavorit
                                </h2>
                                <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
                                    Koleksi penginapan dan villa murah Jogja dengan citarasa autentik
                                </p>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                                {featuredProperties.slice(0, 6).map((property, index) => (
                                    <motion.div
                                        key={property.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, delay: index * 0.1 }}
                                        viewport={{ once: true }}
                                    >
                                        <PropertyCardEnhanced
                                            property={property}
                                            showLocationBadge={true}
                                            showRating={true}
                                        />
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div
                                className="text-center mt-16"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                viewport={{ once: true }}
                            >
                                <Link href="/properties">
                                    <Button size="lg" variant="outline" className="border-2 border-primary hover:bg-primary/10 text-primary px-8 py-3">
                                        Jelajahi Semua Homestay
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            </motion.div>
                        </div>
                    </motion.section>
                )}

                {/* Below The Fold Extracted - Statically Loaded for SSR / SEO */}
                <BelowFoldContent auth={auth} testimonials={testimonials} />
            </div>

            <ScrollToTop />
        </GuestLayout>
    );
} 