import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PropertyCardEnhanced from '@/components/ui/property-card-enhanced';
import { motion } from 'framer-motion';
import {
    CheckCircle, MapPin, Home, DollarSign, Star, TrendingUp,
    ArrowRight, Users, Shield, MessageCircle, ChevronUp, Award,
    Sparkles, Search, ChevronDown,
} from 'lucide-react';
import { Property } from '@/types/property';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SeoLandingProps {
    page: {
        slug: string;
        title: string;
        h1: string;
        meta_description: string;
        target_keyword: string;
        filters?: Record<string, unknown>;
    };
    properties: {
        data: Property[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
        per_page: number;
        current_page: number;
    };
    content: {
        intro: string;
        whyChooseUs: string[];
        about: string;
        tips: { title: string; items: string[] };
        locationDescription?: {
            title: string;
            text: string;
            attractions: string[];
        };
    };
    faqs: Array<{ question: string; answer: string }>;
    seo: unknown;
    totalCount: number;
    relatedPages?: Array<{
        id: number;
        title: string;
        slug: string;
        target_keyword: string;
    }>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Inline FAQ accordion — SEO-friendly native <details> element */
function FaqAccordion({ items }: { items: Array<{ question: string; answer: string }> }) {
    if (!items.length) return null;
    return (
        <div className="space-y-3">
            {items.map((faq, i) => (
                <details
                    key={i}
                    className="group border border-border rounded-xl overflow-hidden bg-card"
                >
                    <summary className="w-full flex items-center justify-between gap-4 px-5 py-4 cursor-pointer font-semibold text-foreground hover:bg-muted/40 transition-colors list-none [&::-webkit-details-marker]:hidden">
                        <span className="text-sm md:text-base leading-snug">{faq.question}</span>
                        <ChevronDown
                            className="h-4 w-4 flex-shrink-0 text-brand-primary transition-transform duration-200 group-open:rotate-180"
                        />
                    </summary>
                    <div className="px-5 pb-5 text-sm md:text-base text-muted-foreground leading-relaxed border-t border-border pt-4">
                        {faq.answer}
                    </div>
                </details>
            ))}
        </div>
    );
}

/** Stat card used in hero */
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <Card className="border-white/20 bg-white/10 backdrop-blur-md text-white">
            <CardContent className="pt-4 pb-4 text-center">
                <div className="flex justify-center mb-2 opacity-90">{icon}</div>
                <div className="text-xl md:text-2xl font-bold mb-0.5">{value}</div>
                <div className="text-xs text-white/70">{label}</div>
            </CardContent>
        </Card>
    );
}

/** WhatsApp SVG icon */
const WaIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SeoLanding({
    page,
    properties,
    content,
    faqs,
    totalCount,
    relatedPages = [],
}: SeoLandingProps) {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showStickyCta, setShowStickyCta] = useState(false);

    // Scroll listeners
    React.useEffect(() => {
        const onScroll = () => {
            setShowScrollTop(window.scrollY > 500);
            setShowStickyCta(window.scrollY > 900);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Hero background: first property cover image or fallback
    const heroBg =
        properties.data.length > 0 && properties.data[0].media?.length > 0
            ? properties.data[0].media[0].url
            : 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=2070&auto=format&fit=crop';

    const fadeUp = {
        hidden: { opacity: 0, y: 24 },
        visible: (i: number = 0) => ({
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, delay: i * 0.08 },
        }),
    };

    return (
        <GuestLayout>
            {/* ── SEO ── */}
            <SeoHead />
            <SchemaOrg />

            {/* ══════════════════════════════════════════════════════════════
                HERO
            ══════════════════════════════════════════════════════════════ */}
            <section className="relative min-h-[520px] md:min-h-[600px] flex items-center overflow-hidden">
                {/* Background */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${heroBg})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/80" />
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-accent/15 rounded-full blur-3xl pointer-events-none" />

                <div className="container mx-auto px-4 sm:px-6 relative z-10 py-16 md:py-24">
                    {/* Trust badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center md:justify-start mb-5"
                    >
                        <Badge className="gap-2 py-1.5 px-4 bg-white/90 text-gray-900 backdrop-blur-sm border-0 shadow-md">
                            <Award className="h-3.5 w-3.5 text-brand-primary" />
                            <span className="text-xs font-semibold">Terpercaya Sejak 2020</span>
                            <span className="mx-1 text-gray-300">·</span>
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-bold">4.8</span>
                        </Badge>
                    </motion.div>

                    {/* Breadcrumb */}
                    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-white/60 mb-4 justify-center md:justify-start">
                        <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
                        <span>/</span>
                        <span className="text-white/90">{page.target_keyword}</span>
                    </nav>

                    {/* H1 */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 text-center md:text-left max-w-3xl"
                    >
                        {page.h1}
                    </motion.h1>

                    {/* Intro */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="text-base md:text-lg text-white/85 max-w-2xl leading-relaxed mb-8 text-center md:text-left mx-auto md:mx-0"
                    >
                        {content.intro}
                    </motion.p>

                    {/* CTA buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mb-10"
                    >
                        <Button size="lg" className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg" asChild>
                            <Link href="/properties">
                                Lihat Semua Properti
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="border-white/40 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                            asChild
                        >
                            <a href="https://wa.me/628112500082" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                <WaIcon />
                                Tanya via WhatsApp
                            </a>
                        </Button>
                    </motion.div>

                    {/* Stat cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl md:max-w-none"
                    >
                        <StatCard icon={<Home className="h-5 w-5" />} value={`${totalCount}+`} label="Pilihan" />
                        <StatCard icon={<DollarSign className="h-5 w-5" />} value="100rb" label="Mulai Dari" />
                        <StatCard icon={<Star className="h-5 w-5 fill-yellow-300 text-yellow-300" />} value="4.8" label="Rating" />
                        <StatCard icon={<Users className="h-5 w-5" />} value="5k+" label="Tamu Puas" />
                    </motion.div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                PROPERTY GRID
            ══════════════════════════════════════════════════════════════ */}
            <section className="py-10 md:py-14 bg-muted/30" id="properties">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                                Pilihan {page.target_keyword}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Menampilkan {properties.data.length} dari {totalCount} properti
                            </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/properties">Lihat Semua</Link>
                        </Button>
                    </div>

                    {properties.data.length > 0 ? (
                        <>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                                {properties.data.map((property, index) => (
                                    <motion.div
                                        key={property.id}
                                        custom={index}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true }}
                                        variants={fadeUp}
                                    >
                                        <PropertyCardEnhanced property={property} priority={index < 3} />
                                    </motion.div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {properties.links && properties.links.length > 3 && (
                                <div className="flex justify-center gap-2 flex-wrap">
                                    {properties.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => link.url && router.visit(link.url)}
                                            disabled={!link.url}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className="min-w-[40px]"
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <Home className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">Properti sedang dalam proses update</p>
                            <Button asChild>
                                <Link href="/properties">Lihat Semua Properti</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                WHY CHOOSE US
            ══════════════════════════════════════════════════════════════ */}
            <section className="py-10 md:py-14">
                <div className="container mx-auto px-4 sm:px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-5 w-5 text-brand-primary" />
                            <span className="text-sm font-semibold text-brand-primary uppercase tracking-wide">Keunggulan Kami</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
                            Mengapa Pilih {page.target_keyword}?
                        </h2>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                        {content.whyChooseUs.map((benefit, index) => (
                            <motion.div
                                key={index}
                                custom={index}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUp}
                                className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-white to-brand-primary/5 border border-brand-primary/10 hover:shadow-md transition-shadow"
                            >
                                <CheckCircle className="h-5 w-5 text-brand-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm md:text-base text-foreground leading-relaxed">
                                    {benefit.replace(/^✓\s*/, '')}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                ABOUT
            ══════════════════════════════════════════════════════════════ */}
            <section className="py-10 md:py-14 bg-muted/20">
                <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                            Tentang {page.target_keyword}
                        </h2>
                        <p className="text-base text-muted-foreground leading-relaxed">
                            {content.about}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                LOCATION DESCRIPTION (conditional)
            ══════════════════════════════════════════════════════════════ */}
            {content.locationDescription && (
                <section className="py-10 md:py-14">
                    <div className="container mx-auto px-4 sm:px-6">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeUp}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-5 w-5 text-brand-primary" />
                                <span className="text-sm font-semibold text-brand-primary uppercase tracking-wide">Lokasi</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                                {content.locationDescription.title}
                            </h2>
                            <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-3xl">
                                {content.locationDescription.text}
                            </p>

                            {content.locationDescription.attractions.length > 0 && (
                                <>
                                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-brand-primary" />
                                        Tempat Wisata Terdekat
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-2 md:gap-3">
                                        {content.locationDescription.attractions.map((attraction, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-white border border-border hover:border-brand-primary/30 hover:shadow-sm transition-all"
                                            >
                                                <div className="h-2 w-2 rounded-full bg-brand-primary flex-shrink-0" />
                                                <span className="text-sm text-foreground">{attraction}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════════════════════════════
                LOCATION BENEFITS (always shown)
            ══════════════════════════════════════════════════════════════ */}
            <section className="py-10 md:py-14 bg-muted/30">
                <div className="container mx-auto px-4 sm:px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
                            Keunggulan Lokasi Yogyakarta
                        </h2>
                    </motion.div>
                    <div className="grid sm:grid-cols-3 gap-4">
                        {[
                            {
                                icon: <MapPin className="h-8 w-8 text-brand-primary" />,
                                title: 'Lokasi Strategis',
                                desc: 'Dekat wisata populer, pusat kota, dan transportasi umum',
                            },
                            {
                                icon: <Shield className="h-8 w-8 text-brand-primary" />,
                                title: 'Aman & Nyaman',
                                desc: 'Lingkungan aman, ramah keluarga, kebersihan terjaga',
                            },
                            {
                                icon: <Users className="h-8 w-8 text-brand-primary" />,
                                title: 'Fasilitas Lengkap',
                                desc: 'WiFi gratis, AC, air panas, parkir, dapur tersedia',
                            },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                custom={i}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUp}
                            >
                                <Card className="h-full border-brand-primary/15 hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="mb-3">{item.icon}</div>
                                        <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                BOOKING TIPS
            ══════════════════════════════════════════════════════════════ */}
            <section className="py-10 md:py-14">
                <div className="container mx-auto px-4 sm:px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
                            {content.tips.title}
                        </h2>
                    </motion.div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {content.tips.items.map((tip, index) => (
                            <motion.div
                                key={index}
                                custom={index}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUp}
                            >
                                <Card className="h-full border-brand-primary/15 hover:border-brand-primary/40 hover:shadow-md transition-all">
                                    <CardContent className="pt-5">
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                FAQ
            ══════════════════════════════════════════════════════════════ */}
            {faqs.length > 0 && (
                <section className="py-10 md:py-14 bg-muted/20">
                    <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeUp}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-brand-primary uppercase tracking-wide">FAQ</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
                                Pertanyaan yang Sering Diajukan
                            </h2>
                        </motion.div>
                        <FaqAccordion items={faqs} />
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════════════════════════════
                RELATED PAGES — internal linking
            ══════════════════════════════════════════════════════════════ */}
            {relatedPages.length > 0 && (
                <section className="py-10 md:py-14 border-t border-border">
                    <div className="container mx-auto px-4 sm:px-6">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeUp}
                        >
                            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                                <Search className="h-5 w-5 text-brand-primary" />
                                Pencarian Terkait
                            </h2>
                        </motion.div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {relatedPages.map((rp) => (
                                <Link
                                    key={rp.id}
                                    href={`/s/${rp.slug}`}
                                    className="group flex items-center gap-3 p-4 bg-white border border-border rounded-xl hover:border-brand-primary/50 hover:shadow-md transition-all"
                                >
                                    <div className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary transition-colors flex-shrink-0">
                                        <MapPin className="h-4 w-4 text-brand-primary group-hover:text-white" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-brand-primary transition-colors">
                                            {rp.target_keyword || rp.title}
                                        </p>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            Jelajahi <ArrowRight className="h-3 w-3" />
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════════════════════════════
                CTA BANNER
            ══════════════════════════════════════════════════════════════ */}
            <section className="relative py-14 md:py-20 overflow-hidden bg-brand-primary">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/20 via-transparent to-brand-accent/10 pointer-events-none" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <Shield className="h-12 w-12 text-white/80 mx-auto mb-5" />
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            Siap Booking {page.target_keyword}?
                        </h2>
                        <p className="text-white/80 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                            Booking sekarang dan nikmati pengalaman menginap terbaik. Customer service kami siap membantu 24/7!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button size="lg" variant="secondary" className="shadow-lg" asChild>
                                <Link href="/properties">
                                    Lihat Semua Properti
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                                asChild
                            >
                                <a href="https://wa.me/628112500082" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                    <WaIcon />
                                    Hubungi via WhatsApp
                                </a>
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                FLOATING ELEMENTS
            ══════════════════════════════════════════════════════════════ */}

            {/* Sticky mobile CTA */}
            {showStickyCta && (
                <motion.div
                    initial={{ y: 80 }}
                    animate={{ y: 0 }}
                    className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl p-3 z-40 lg:hidden"
                >
                    <div className="container mx-auto flex gap-2">
                        <Button className="flex-1" asChild>
                            <Link href="/properties">Lihat Properti</Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-green-500 hover:bg-green-600 border-green-500 text-white px-4"
                            asChild
                        >
                            <a href="https://wa.me/628112500082" target="_blank" rel="noopener noreferrer">
                                <WaIcon />
                            </a>
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Floating WhatsApp — desktop */}
            <a
                href="https://wa.me/628112500082"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-xl transition-all z-50 hidden lg:flex items-center justify-center"
                aria-label="Hubungi via WhatsApp"
            >
                <WaIcon />
            </a>

            {/* Scroll to top */}
            {showScrollTop && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-6 right-20 lg:right-24 bg-brand-primary text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
                    aria-label="Kembali ke atas"
                >
                    <ChevronUp className="h-5 w-5" />
                </motion.button>
            )}
        </GuestLayout>
    );
}
