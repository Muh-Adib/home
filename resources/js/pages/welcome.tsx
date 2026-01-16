import { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
    MapPin,
    Star,
    ArrowRight,
    Search,
    Shield,
    Sparkles,
    Award,
    Crown,
    Quote,
    User
} from 'lucide-react';
import { type SharedData } from '@/types';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types/property';

// Import new components
import HeroSlideshow from '@/components/ui/hero-slideshow';
import HeroSearchBar from '@/components/ui/hero-search-bar';
import PropertyCardEnhanced from '@/components/ui/property-card-enhanced';
import ScrollToTop from '@/components/ui/scroll-to-top';

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

    // Prepare slideshow images
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
            <Head>
                <title>{`${t('welcome_page.title')} - ${appName}`}</title>
                <meta name="description" content="Temukan homestay terbaik di Jogja dengan harga terjangkau. Homsjogja menyediakan penginapan nyaman, aman, dan strategis dekat Malioboro." />
                <link rel="canonical" href={appUrl} />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content={appUrl} />
                <meta property="og:title" content={`${t('welcome_page.title')} - ${appName}`} />
                <meta property="og:description" content="Temukan homestay terbaik di Jogja dengan harga terjangkau. Homsjogja menyediakan penginapan nyaman, aman, dan strategis dekat Malioboro." />
                <meta property="og:image" content={`${appUrl}/og-image.jpg`} />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={appUrl} />
                <meta property="twitter:title" content={`${t('welcome_page.title')} - ${appName}`} />
                <meta property="twitter:description" content="Temukan homestay terbaik di Jogja dengan harga terjangkau. Homsjogja menyediakan penginapan nyaman, aman, dan strategis dekat Malioboro." />
                <meta property="twitter:image" content={`${appUrl}/og-image.jpg`} />
            </Head>

            <div className="min-h-screen bg-background">
                {/* Hero Section - Enhanced with Swiper */}
                <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden" style={{ marginTop: '-10vh' }}>
                    {/* Background Slideshow - Z-index 0 (paling belakang) */}
                    <HeroSlideshow
                        images={slideshowImages}
                        autoPlay={true}
                        interval={6000}
                        showControls={false}
                        showIndicators={false}
                        className="absolute inset-0 z-0"
                    />

                    {/* Content Container - Z-index 10 (di atas slideshow) */}
                    <div className="container mx-auto px-6 relative z-10 text-center pt-20">
                        <motion.div
                            className="hero-content max-w-4xl mx-auto"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >

                            {/* Modern Badge */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                className="flex justify-center mb-8"
                            >
                                <Badge className="bg-brand-primary-20 backdrop-blur-md border border-brand-accent-30 text-white px-6 py-2 text-sm font-medium rounded-full shadow-lg">
                                    <Crown className="h-4 w-4 mr-2" />
                                    Homestay Terpercaya di Jogja
                                </Badge>
                            </motion.div>

                            {/* Modern Typography */}
                            <motion.div
                                className="text-center mb-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.6 }}
                            >
                                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 leading-tight">
                                    <span className="block font-light">Temukan</span>
                                    <span className="block text-brand-accent font-bold">
                                        Homestay
                                    </span>
                                    <span className="block font-light">Impian Anda</span>
                                </h1>

                                {/* Subtitle */}
                                <div className="text-xl md:text-2xl text-white/80 font-light tracking-wide">
                                    <span className="block">Pengalaman menginap yang tak terlupakan</span>
                                    <span className="block text-brand-accent">di jantung budaya Jawa</span>
                                </div>
                            </motion.div>

                            {/* Enhanced Description */}
                            <motion.div
                                className="max-w-3xl mx-auto mb-12"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.8 }}
                            >
                                <p className="text-lg text-white/90 leading-relaxed text-center">
                                    Dari dekat Malioboro hingga Taman Sari, rasakan kehangatan
                                    <span className="text-brand-accent font-medium"> hospitality Jogja</span> yang autentik.
                                    Setiap homestay menawarkan pengalaman unik yang tak terlupakan.
                                </p>
                            </motion.div>

                            {/* Modern Search Form */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 1.0 }}
                                className="max-w-4xl mx-auto mb-8"
                            >
                                <HeroSearchBar
                                    onSearch={handleQuickSearch}
                                    loading={searchLoading}
                                />
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* Featured Properties - Enhanced with new cards */}
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
                                    Homestay Terfavorit
                                </h2>
                                <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
                                    Koleksi terbaik homestay dengan citarasa Jogja yang autentik
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

                {/* Stats Section - Enhanced with animations */}
                <motion.section
                    className="py-20 bg-brand-accent-50"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                            {[
                                { value: "1000+", label: "Homestay Terdaftar", color: "text-primary" },
                                { value: "50K+", label: "Tamu Puas", color: "text-primary" },
                                { value: "98%", label: "Rating Positif", color: "text-primary" },
                                { value: "24/7", label: "Dukungan", color: "text-primary" }
                            ].map((stat, index) => (
                                <motion.div
                                    key={index}
                                    className="space-y-3"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <div className={`text-4xl font-bold ${stat.color}`}>{stat.value}</div>
                                    <div className="text-muted-foreground font-medium">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* Features Section - Enhanced with scroll animations */}
                <motion.section
                    className="py-20 bg-background"
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
                            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                                Kenapa Pilih Homsjogja?
                            </h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
                                Pengalaman menginap dengan cita rasa Jogja yang autentik dan pelayanan modern
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-3 gap-12">
                            {[
                                {
                                    icon: Search,
                                    title: "Pencarian Cerdas",
                                    description: "Temukan homestay impian dengan mudah. Dari dekat Kraton hingga Malioboro, semua dalam genggaman Anda.",
                                    color: "from-blue-100 to-indigo-100",
                                    iconColor: "text-blue-600"
                                },
                                {
                                    icon: Shield,
                                    title: "Aman & Terpercaya",
                                    description: "Keamanan transaksi terjamin dengan teknologi modern. Booking mudah, hati tenang seperti di rumah sendiri.",
                                    color: "from-indigo-100 to-purple-100",
                                    iconColor: "text-indigo-600"
                                },
                                {
                                    icon: Award,
                                    title: "Kualitas Istimewa",
                                    description: "Setiap homestay dipilih dengan standar tinggi. Hospitality Jogja yang hangat, fasilitas modern yang lengkap.",
                                    color: "from-purple-100 to-pink-100",
                                    iconColor: "text-purple-600"
                                }
                            ].map((feature, index) => (
                                <motion.div
                                    key={index}
                                    className="text-center space-y-6"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.2 }}
                                    viewport={{ once: true }}
                                >
                                    <div className={`w-20 h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mx-auto`}>
                                        <feature.icon className={`h-10 w-10 ${feature.iconColor}`} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-foreground">
                                        {feature.title}
                                    </h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* Testimonials Section - New */}
                <motion.section
                    className="py-20 bg-brand-accent-50"
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
                            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                                Apa Kata Mereka?
                            </h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
                                Pengalaman nyata dari tamu-tamu kami yang telah merasakan kehangatan hospitality Jogja
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {testimonials.map((testimonial, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.2 }}
                                    viewport={{ once: true }}
                                >
                                    <Card className="h-full p-6 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                                        <CardContent className="p-0">
                                            <div className="flex items-center gap-1 mb-4">
                                                {[...Array(testimonial.rating)].map((_, i) => (
                                                    <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                                                ))}
                                            </div>
                                            <Quote className="h-8 w-8 text-primary/30 mb-4" />
                                            <p className="text-muted-foreground mb-6 italic">
                                                "{testimonial.comment}"
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-foreground">{testimonial.name}</div>
                                                    <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* CTA Section - Enhanced with background illustration */}
                <motion.section
                    className="py-20 bg-brand-primary text-white relative overflow-hidden"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full"></div>
                        <div className="absolute top-20 right-20 w-24 h-24 bg-white rounded-full"></div>
                        <div className="absolute bottom-10 left-1/4 w-16 h-16 bg-white rounded-full"></div>
                        <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-white rounded-full"></div>
                    </div>

                    <div className="container mx-auto px-6 text-center relative z-10">
                        <motion.div
                            className="max-w-4xl mx-auto"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                        >
                            <Badge className="mb-8 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                                <Sparkles className="h-4 w-4 mr-2" />
                                Temukan Kenyamanan Ala Jogja
                            </Badge>

                            <h2 className="text-4xl md:text-6xl font-bold mb-8">
                                Dari Homestay ke Villa,
                                <span className="block mt-2">Semua Ada di Homsjogja</span>
                            </h2>

                            <p className="text-xl mb-12 opacity-90 leading-relaxed max-w-2xl mx-auto">
                                Setiap tempat membawa cerita, setiap inap menghadirkan kehangatan.
                                Bersama Homsjogja, rasakan keramahan Jogja di setiap perjalanan Anda.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                {!auth.user ? (
                                    <>
                                        <Link href="/register">
                                            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
                                                Mulai Petualangan Jogja
                                                <ArrowRight className="ml-2 h-5 w-5" />
                                            </Button>
                                        </Link>
                                        <Link href="/properties">
                                            <Button size="lg" variant="outline" className="border-white bg-brand-secondary text-white hover:bg-brand-primary px-8 py-3">
                                                Jelajahi Dulu
                                                <Search className="ml-2 h-5 w-5" />
                                            </Button>
                                        </Link>
                                    </>
                                ) : (
                                    <Link href="/properties">
                                        <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
                                            Temukan Homestay Impian
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </motion.section>
            </div>

            {/* Scroll to Top Button */}
            <ScrollToTop />
        </GuestLayout>
    );
} 