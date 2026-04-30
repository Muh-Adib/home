import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Star, ArrowRight, Search, Shield, Award, Quote, User, Sparkles,
    MapPin, Clock, CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Testimonial {
    name: string;
    location: string;
    rating: number;
    comment: string;
}

interface Props {
    auth: { user?: { name: string } } | null | undefined;
    testimonials: Testimonial[];
}

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number = 0) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.55, delay: i * 0.1 },
    }),
};

export default function BelowFoldContent({ auth, testimonials }: Props) {
    return (
        <>
            {/* ══════════════════════════════════════════════════════════════
                STATS — Social proof numbers
                SEO: Reinforces E-E-A-T (authority signals)
            ══════════════════════════════════════════════════════════════ */}
            <section aria-label="Statistik Homsjogja" className="py-14 md:py-20 bg-brand-primary">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
                        {[
                            { value: '1.000+', label: 'Properti Terverifikasi' },
                            { value: '50K+',   label: 'Tamu Puas' },
                            { value: '4.8/5',  label: 'Rating Rata-rata' },
                            { value: '24/7',   label: 'Dukungan Pelanggan' },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                custom={i}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUp}
                                className="space-y-2"
                            >
                                <div className="text-3xl md:text-4xl font-bold text-white">{stat.value}</div>
                                <div className="text-sm md:text-base text-white/75 font-medium">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                WHY CHOOSE US
                SEO: H2 with keyword, structured feature list
            ══════════════════════════════════════════════════════════════ */}
            <section aria-label="Keunggulan Homsjogja" className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4 sm:px-6">
                    <motion.div
                        className="text-center mb-14"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <Badge className="mb-4 bg-brand-primary/10 text-brand-primary border-brand-primary/20 px-4 py-1.5">
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            Keunggulan Kami
                        </Badge>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                            Kenapa Pilih Homsjogja?
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Platform booking homestay &amp; villa Jogja terpercaya dengan pengalaman menginap autentik
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8 md:gap-10">
                        {[
                            {
                                icon: Search,
                                title: 'Pencarian Cerdas',
                                desc: 'Temukan homestay impian dengan mudah. Dari dekat Kraton hingga Malioboro, semua dalam genggaman Anda.',
                                color: 'bg-blue-50 text-blue-600',
                            },
                            {
                                icon: Shield,
                                title: 'Aman &amp; Terpercaya',
                                desc: 'Keamanan transaksi terjamin. Booking mudah, hati tenang — semua properti sudah terverifikasi tim kami.',
                                color: 'bg-indigo-50 text-indigo-600',
                            },
                            {
                                icon: Award,
                                title: 'Kualitas Istimewa',
                                desc: 'Setiap homestay dipilih dengan standar tinggi. Hospitality Jogja yang hangat, fasilitas modern yang lengkap.',
                                color: 'bg-purple-50 text-purple-600',
                            },
                        ].map((f, i) => (
                            <motion.div
                                key={i}
                                custom={i}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUp}
                                className="text-center space-y-5"
                            >
                                <div className={`w-18 h-18 w-[72px] h-[72px] ${f.color} rounded-2xl flex items-center justify-center mx-auto`}>
                                    <f.icon className="h-9 w-9" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground" dangerouslySetInnerHTML={{ __html: f.title }} />
                                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Feature checklist — extra SEO content */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                        className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                        {[
                            { icon: CheckCircle, text: 'Foto properti asli & terverifikasi' },
                            { icon: MapPin,       text: 'Lokasi strategis dekat wisata Jogja' },
                            { icon: Clock,        text: 'Konfirmasi booking instan' },
                            { icon: Star,         text: 'Review dari tamu asli' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                                <item.icon className="h-5 w-5 text-brand-primary flex-shrink-0" />
                                <span className="text-sm text-foreground font-medium">{item.text}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                TESTIMONIALS
                SEO: Review schema signals, EEAT trust
            ══════════════════════════════════════════════════════════════ */}
            <section aria-label="Testimoni Tamu" className="py-16 md:py-24 bg-muted/30">
                <div className="container mx-auto px-4 sm:px-6">
                    <motion.div
                        className="text-center mb-14"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                            Apa Kata Tamu Kami?
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Pengalaman nyata dari ribuan tamu yang telah merasakan kehangatan hospitality Jogja bersama Homsjogja
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {testimonials.map((t, i) => (
                            <motion.div
                                key={i}
                                custom={i}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUp}
                            >
                                <Card className="h-full border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-white">
                                    <CardContent className="p-6">
                                        {/* Stars */}
                                        <div className="flex items-center gap-0.5 mb-4">
                                            {Array.from({ length: t.rating }).map((_, si) => (
                                                <Star key={si} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                            ))}
                                        </div>
                                        <Quote className="h-7 w-7 text-brand-primary/25 mb-3" />
                                        <p className="text-muted-foreground leading-relaxed mb-6 italic text-sm md:text-base">
                                            "{t.comment}"
                                        </p>
                                        <div className="flex items-center gap-3 pt-4 border-t border-border">
                                            <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                <User className="h-5 w-5 text-brand-primary" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-foreground text-sm">{t.name}</div>
                                                <div className="text-xs text-muted-foreground">{t.location}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                CTA BANNER
                SEO: Internal link to /properties and /register
            ══════════════════════════════════════════════════════════════ */}
            <section
                aria-label="Call to Action"
                className="py-16 md:py-24 bg-brand-primary text-white relative overflow-hidden"
            >
                {/* ── Decorative background ── */}
                {/* Diagonal stripe overlay */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `repeating-linear-gradient(
                            -45deg,
                            transparent,
                            transparent 40px,
                            rgba(255,255,255,0.03) 40px,
                            rgba(255,255,255,0.03) 80px
                        )`,
                    }}
                />
                {/* Top-left accent blob */}
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-accent/20 blur-3xl pointer-events-none" />
                {/* Bottom-right accent blob */}
                <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                {/* Floating icon shapes */}
                <div className="absolute top-8 right-12 w-14 h-14 rounded-2xl border border-white/15 rotate-12 pointer-events-none" />
                <div className="absolute top-16 right-32 w-8 h-8 rounded-xl border border-brand-accent/40 -rotate-6 pointer-events-none" />
                <div className="absolute bottom-10 left-16 w-10 h-10 rounded-full border border-white/20 pointer-events-none" />
                <div className="absolute bottom-20 left-40 w-6 h-6 rounded-lg border border-white/15 rotate-45 pointer-events-none" />
                {/* Center glow */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[600px] h-[300px] bg-brand-accent/10 rounded-full blur-3xl" />
                </div>

                <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
                    <motion.div
                        className="max-w-3xl mx-auto"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <Badge className="mb-6 bg-white/15 text-white border-white/30 backdrop-blur-sm px-4 py-1.5 gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            Temukan Kenyamanan Ala Jogja
                        </Badge>

                        <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                            Dari Homestay hingga Villa Murah Jogja,
                            <span className="block mt-1 text-brand-accent">Semua Ada di Homsjogja</span>
                        </h2>

                        <p className="text-lg md:text-xl mb-10 text-white/85 leading-relaxed max-w-2xl mx-auto">
                            Setiap tempat membawa cerita, setiap inap menghadirkan kehangatan.
                            Bersama Homsjogja, rasakan keramahan Jogja di setiap perjalanan Anda.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {!auth?.user ? (
                                <>
                                    <Button
                                        size="lg"
                                        className="bg-white text-brand-primary hover:bg-white/90 font-semibold px-8 shadow-lg"
                                        asChild
                                    >
                                        <Link href="/register">
                                            Mulai Petualangan Jogja
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="border-white/50 bg-white/10 text-white hover:bg-white/20 px-8"
                                        asChild
                                    >
                                        <Link href="/properties">
                                            Jelajahi Properti
                                            <Search className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    size="lg"
                                    className="bg-white text-brand-primary hover:bg-white/90 font-semibold px-8 shadow-lg"
                                    asChild
                                >
                                    <Link href="/properties">
                                        Temukan Homestay Impian
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    );
}
