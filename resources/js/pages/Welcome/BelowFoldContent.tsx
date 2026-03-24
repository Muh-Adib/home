import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Star,
    ArrowRight,
    Search,
    Shield,
    Sparkles,
    Award,
    Quote,
    User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
    auth: any;
    testimonials: any[];
}

export default function BelowFoldContent({ auth, testimonials }: Props) {
    return (
        <>
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
                            Dari Homestay hingga Villa Murah Jogja,
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
        </>
    );
}
