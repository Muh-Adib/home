import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FAQSection } from '@/components/seo/FAQSection';
import PropertyCardEnhanced from '@/components/ui/property-card-enhanced';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
    CheckCircle,
    MapPin,
    Home,
    DollarSign,
    Star,
    TrendingUp,
    ArrowRight,
    Users,
    Shield,
    Phone,
    MessageCircle,
    ChevronUp,
    Award,
    Sparkles,
    Search,
} from 'lucide-react';
import { Property } from '@/types/property';

interface SeoLandingProps {
    page: {
        slug: string;
        title: string;
        h1: string;
        meta_description: string;
        target_keyword: string;
        filters?: Record<string, any>;
    };
    properties: {
        data: Property[];
        links: any[];
        total: number;
        per_page: number;
        current_page: number;
    };
    content: {
        intro: string;
        whyChooseUs: string[];
        about: string;
        tips: {
            title: string;
            items: string[];
        };
        locationDescription?: {
            title: string;
            text: string;
            attractions: string[];
        };
    };
    faqs: Array<{
        question: string;
        answer: string;
    }>;
    seo: any;
    totalCount: number;
    relatedPages?: Array<{
        id: number;
        title: string;
        slug: string;
        target_keyword: string;
    }>;
}

export default function SeoLanding({
    page,
    properties,
    content,
    faqs,
    seo,
    totalCount,
    relatedPages = []
}: SeoLandingProps) {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showStickyCTA, setShowStickyCTA] = useState(false);
    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

    // Show/hide scroll to top button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
            setShowStickyCTA(window.scrollY > 800);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    return (
        <GuestLayout>
            {/* SEO Meta Tags — single source of truth, no duplicate <Head> */}
            <SeoHead />
            <SchemaOrg />


            {/* Animated Hero Section with Background Image */}
            <motion.section
                style={{ opacity: heroOpacity }}
                className="relative py-8 md:py-16 overflow-hidden"
            >
                {/* Background Image - Dynamic from Properties */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: properties.data.length > 0 && properties.data[0].media?.length > 0
                            ? `url(${properties.data[0].media[0].url})`
                            : 'url(https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=2070&auto=format&fit=crop)',
                    }}
                ></div>

                {/* Dark Overlay for text readability - DARKER */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/80 to-black/85"></div>

                {/* Accent gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/15 via-brand-accent/10 to-transparent"></div>

                {/* Animated background pattern */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl"></div>

                <div className="container mx-auto px-4 sm:px-6 relative z-10">
                    {/* Trust Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center mb-4"
                    >
                        <Badge variant="secondary" className="gap-2 py-2 px-4 bg-white/90 backdrop-blur-sm">
                            <Award className="h-4 w-4 text-brand-primary" />
                            <span className="text-sm font-medium text-gray-900">Terpercaya Sejak 2020</span>
                            <div className="flex items-center gap-1 ml-2">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-semibold text-gray-900">4.8</span>
                            </div>
                        </Badge>
                    </motion.div>

                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-white/80 mb-4 justify-center md:justify-start">
                        <Link href="/" className="hover:text-brand-accent transition-colors">
                            Home
                        </Link>
                        <span>›</span>
                        <span className="text-brand-accent font-medium">{page.target_keyword}</span>
                    </nav>

                    {/* Main Heading - SOLID WHITE */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-center md:text-left"
                        style={{
                            textShadow: '2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)'
                        }}
                    >
                        <span className="text-white">
                            {page.h1}
                        </span>
                    </motion.h1>

                    {/* Intro Text - SOLID WHITE */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-base md:text-lg text-white mb-8 max-w-2xl leading-relaxed text-center md:text-left mx-auto md:mx-0"
                        style={{
                            textShadow: '1px 1px 6px rgba(0,0,0,0.8)'
                        }}
                    >
                        {content.intro}
                    </motion.p>

                    {/* Stat Cards - Mobile 2x2, Desktop 4 columns */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-4 gap-3 md:gap-4 shink-0"
                    >
                        <motion.div variants={itemVariants}>
                            <Card className="border-brand-primary/20 hover:border-brand-primary/40 hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm">
                                <CardContent className="pt-4 pb-4 text-center">
                                    <Home className="h-6 w-6 md:h-8 md:w-8 text-brand-primary mx-auto mb-2" />
                                    <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-1">
                                        {totalCount}+
                                    </div>
                                    <div className="text-xs md:text-sm text-muted-foreground">
                                        Pilihan
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Card className="border-brand-primary/20 hover:border-brand-primary/40 hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm">
                                <CardContent className="pt-4 pb-4 text-center">
                                    <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-brand-primary mx-auto mb-2" />
                                    <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-1">
                                        100rb
                                    </div>
                                    <div className="text-xs md:text-sm text-muted-foreground">
                                        Mulai Dari
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Card className="border-brand-primary/20 hover:border-brand-primary/40 hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm">
                                <CardContent className="pt-4 pb-4 text-center">
                                    <Star className="h-6 w-6 md:h-8 md:w-8 text-yellow-400 mx-auto mb-2 fill-yellow-400" />
                                    <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-1">
                                        4.8
                                    </div>
                                    <div className="text-xs md:text-sm text-muted-foreground">
                                        Rating
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Card className="border-brand-primary/20 hover:border-brand-primary/40 hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm">
                                <CardContent className="pt-4 pb-4 text-center">
                                    <Users className="h-6 w-6 md:h-8 md:w-8 text-brand-primary mx-auto mb-2" />
                                    <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-1">
                                        5k+
                                    </div>
                                    <div className="text-xs md:text-sm text-muted-foreground">
                                        Tamu Puas
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.section>

            {/* Property Grid - Staggered Animation */}
            <section className="py-8 md:py-12 bg-muted/30">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between mb-6 md:mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                            Pilihan Terbaik
                        </h2>
                        <div className="text-xs md:text-sm text-muted-foreground">
                            {properties.data.length} dari {totalCount}
                        </div>
                    </div>

                    {/* Property Cards */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8"
                    >
                        {properties.data.map((property, index) => (
                            <motion.div
                                key={property.id}
                                variants={itemVariants}
                                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                            >
                                <PropertyCardEnhanced property={property} />
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* No Results */}
                    {properties.data.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-12 md:py-16"
                        >
                            <Home className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-base md:text-lg text-muted-foreground mb-4">
                                Properti sedang dalam proses update
                            </p>
                            <Button asChild>
                                <Link href="/properties">Lihat Semua Properti</Link>
                            </Button>
                        </motion.div>
                    )}

                    {/* Pagination */}
                    {properties.links && properties.links.length > 3 && (
                        <div className="flex justify-center gap-2 flex-wrap">
                            {properties.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={link.active ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => link.url && router.visit(link.url)}
                                    disabled={!link.url}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className="min-w-[40px]"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Why Choose Us - With Animation */}
            <section className="py-8 md:py-12">
                <div className="container mx-auto px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-brand-primary" />
                            Mengapa Pilih {page.target_keyword}?
                        </h2>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                        {content.whyChooseUs.map((benefit, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                className="flex items-start gap-3 p-3 md:p-4 rounded-xl bg-gradient-to-br from-white to-brand-primary/5 hover:shadow-md transition-all duration-300 border border-brand-primary/10"
                            >
                                <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-brand-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm md:text-base text-foreground leading-relaxed">{benefit}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section - Always Show */}
            <section className="py-8 md:py-12">
                <div className="container mx-auto px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 md:mb-6">
                            Tentang {page.target_keyword}
                        </h2>
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-4xl">
                            {content.about}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Location Description - Conditional */}
            {content.locationDescription && (
                <section className="py-8 md:py-12 bg-muted/30">
                    <div className="container mx-auto px-4 sm:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 md:mb-6 flex items-center gap-2">
                                <MapPin className="h-6 w-6 text-brand-primary" />
                                {content.locationDescription.title}
                            </h2>
                            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6 md:mb-8">
                                {content.locationDescription.text}
                            </p>

                            {content.locationDescription.attractions.length > 0 && (
                                <div>
                                    <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-brand-primary" />
                                        Tempat Wisata Terdekat
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-2 md:gap-3">
                                        {content.locationDescription.attractions.map((attraction, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -10 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: index * 0.1 }}
                                                className="flex items-center gap-2 text-sm md:text-base text-foreground p-2 md:p-3 rounded-lg bg-white hover:shadow-sm transition-shadow"
                                            >
                                                <div className="h-2 w-2 rounded-full bg-brand-primary"></div>
                                                <span>{attraction}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </section>
            )}

            {/* General Location Benefits - Always Show */}
            <section className="py-8 md:py-12">
                <div className="container mx-auto px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                            Keunggulan Lokasi Yogyakarta
                        </h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card className="border-brand-accent/30">
                                <CardContent className="pt-6">
                                    <MapPin className="h-10 w-10 text-brand-accent mb-3" />
                                    <h3 className="font-semibold text-foreground mb-2">Lokasi Strategis</h3>
                                    <p className="text-sm text-muted-foreground">Dekat dengan tempat wisata populer, pusat kota, dan transportasi umum</p>
                                </CardContent>
                            </Card>
                            <Card className="border-brand-accent/30">
                                <CardContent className="pt-6">
                                    <Home className="h-10 w-10 text-brand-accent mb-3" />
                                    <h3 className="font-semibold text-foreground mb-2">Fasilitas Lengkap</h3>
                                    <p className="text-sm text-muted-foreground">WiFi gratis, AC, air panas, parkir, dapur - semua tersedia</p>
                                </CardContent>
                            </Card>
                            <Card className="border-brand-accent/30">
                                <CardContent className="pt-6">
                                    <Shield className="h-10 w-10 text-brand-accent mb-3" />
                                    <h3 className="font-semibold text-foreground mb-2">Aman & Nyaman</h3>
                                    <p className="text-sm text-muted-foreground">Lingkungan aman, ramah keluarga, kebersihan terjaga</p>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Booking Tips */}
            <section className="py-8 md:py-12 bg-muted/30">
                <div className="container mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8">
                        {content.tips.title}
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {content.tips.items.map((tip, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="h-full border-brand-primary/20 hover:border-brand-primary/40 hover:shadow-lg transition-all duration-300">
                                    <CardContent className="pt-4 md:pt-6">
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-brand-primary flex items-center justify-center shadow-md">
                                                <span className="text-white font-bold text-base md:text-lg">{index + 1}</span>
                                            </div>
                                            <p className="text-xs md:text-sm text-foreground leading-relaxed">{tip}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQs */}
            <section className="py-8 md:py-12">
                <div className="container mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8">
                        Pertanyaan Umum
                    </h2>
                    <FAQSection items={faqs} />
                </div>
            </section>

            {/* Related PSEO Pages (Internal Linking) */}
            {relatedPages.length > 0 && (
                <section className="py-8 md:py-12 bg-muted/20 border-t border-border">
                    <div className="container mx-auto px-4 sm:px-6">
                        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 md:mb-6 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-brand-primary" />
                            Pilihan Lain Disekitar Anda
                        </h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {relatedPages.map((relatedPage) => (
                                <Link 
                                    key={relatedPage.id} 
                                    href={`/s/${relatedPage.slug}`}
                                    className="group flex flex-col justify-center p-4 bg-white border border-border rounded-xl hover:border-brand-primary/50 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary transition-colors flex-shrink-0">
                                            <Search className="h-5 w-5 text-brand-primary group-hover:text-white" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-brand-primary transition-colors">
                                                {relatedPage.target_keyword || relatedPage.title}
                                            </h3>
                                            <span className="text-xs text-brand-primary flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0">
                                                Jelajahi <ArrowRight className="h-3 w-3" />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CTA Section */}
            <section className="relative py-12 md:py-16 overflow-hidden">
                {/* CTA Background Gradient */}
                <div className="absolute inset-0 bg-brand-primary"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/30 via-transparent to-brand-accent/20"></div>
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]"></div>

                <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
                    <Shield className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 md:mb-6 opacity-90 text-white" />
                    <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-white">
                        Siap Booking {page.target_keyword}?
                    </h2>
                    <p className="text-sm md:text-lg opacity-90 mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed text-white">
                        Booking sekarang dan nikmati pengalaman menginap terbaik. Customer service kami siap membantu 24/7!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                        <Button size="lg" variant="secondary" className="group w-full sm:w-auto" asChild>
                            <Link href="/properties">
                                Lihat Semua Properti
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="bg-white/10 border-white/30 hover:bg-white/20 text-white w-full sm:w-auto"
                            asChild
                        >
                            <a href="https://wa.me/628112500082" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                                <MessageCircle className="h-5 w-5" />
                                Hubungi via WhatsApp
                            </a>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Sticky CTA Bar - Mobile Optimized */}
            {showStickyCTA && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    className="fixed bottom-10 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-3 md:p-4 z-40 lg:hidden"
                >
                    <div className="container mx-auto flex gap-2">
                        <Button className="flex-1" asChild>
                            <Link href="/properties">Lihat Properti</Link>
                        </Button>
                        <Button variant="outline" className="bg-green-500 hover:bg-green-600 border-green-500 text-white" asChild>
                            <a href="https://wa.me/628112500082" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                            </a>
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Floating WhatsApp Button */}
            <motion.a
                href="https://wa.me/628112500082"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-20 md:bottom-6 right-4 md:right-6 bg-green-500 text-white p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50 hidden lg:flex items-center justify-center"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3,
                    }}
                    className="absolute inset-0 bg-green-500 rounded-full opacity-50"
                />
            </motion.a>

            {/* Scroll to Top Button */}
            {showScrollTop && (
                <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    onClick={scrollToTop}
                    className="fixed bottom-28 md:bottom-8 right-4 md:right-6 lg:right-24 bg-brand-primary text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
                >
                    <ChevronUp className="h-5 w-5 md:h-6 md:w-6" />
                </motion.button>
            )}
        </GuestLayout>
    );
}
