import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DateRange from '@/components/ui/date-range';
import {
    Building2,
    MapPin,
    Users,
    Bed,
    Bath,
    Star,
    ArrowRight,
    Search,
    Calendar,
    CreditCard,
    Shield,
    Sparkles,
    Heart,
    Award,
    CheckCircle,
    TrendingUp,
    Sun,
    Moon,
    Crown,
    Coffee,
    Camera,
    Play,
    Clock,
    Wifi,
    Car,
    Utensils
} from 'lucide-react';
import { type SharedData, type BreadcrumbItem } from '@/types';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types/property';
import { formatCurrency } from '@/utils/formatCurrency';


interface WelcomeProps {
    featuredProperties: Property[];
}

export default function Welcome({ featuredProperties }: WelcomeProps) {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [currentSlogan, setCurrentSlogan] = useState(0);
    const [currentSlide, setCurrentSlide] = useState(0);

    console.log(featuredProperties);
    const jogjaSlogans = [
        "Istimewa seperti Jogja",
        "Hati Selalu di Jogja",
        "Gudeg, Batik & Homestay",
        "Ngayogyakarto Hadiningrat"
    ];

    // Get featured properties with cover images for slideshow
    const slideshowImages = featuredProperties
        .filter(property => property.media && property.media.length > 0)
        .slice(0, 5); // Limit to 5 images

    // Breadcrumbs setup for welcome page
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: route('home') || '/' }
    ];

    // Default dates - today and tomorrow
    const getDefaultDates = () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        return {
            checkIn: today.toISOString().split('T')[0],
            checkOut: tomorrow.toISOString().split('T')[0]
        };
    };

    const [searchDates, setSearchDates] = useState(getDefaultDates());
    const [guests, setGuests] = useState(2);

    useEffect(() => {
        setIsVisible(true);
        
        // Slogan rotation
        const sloganInterval = setInterval(() => {
            setCurrentSlogan((prev) => (prev + 1) % jogjaSlogans.length);
        }, 4000);

        // Slideshow rotation
        const slideshowInterval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % Math.max(slideshowImages.length, 1));
        }, 6000);

        return () => {
            clearInterval(sloganInterval);
            clearInterval(slideshowInterval);
        };
    }, [jogjaSlogans.length, slideshowImages.length]);

    const handleQuickSearch = () => {
        const params = new URLSearchParams({
            check_in: searchDates.checkIn,
            check_out: searchDates.checkOut,
            guests: guests.toString()
        });
        
        router.visit(`/properties?${params.toString()}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('welcome_page.title')} - Homsjogja`} />

            <div className="min-h-screen bg-white">
                {/* Hero Section - Clean & Modern with Slideshow Background */}
                <section className="hero-section" style={{marginTop: '-10vh'}}>
                    {/* Background Slideshow */}
                    <div className="absolute inset-0">
                        {slideshowImages.length > 0 ? (
                            <>
                                {/* Current slide */}
                                <div 
                                    className="absolute inset-0 slideshow-background"
                                    style={{
                                        backgroundImage: `url(${slideshowImages[currentSlide]?.media[0]?.url})`,
                                    }}
                                />
                                {/* Next slide for smooth transition */}
                                <div 
                                    className="absolute inset-0 slideshow-background opacity-0 transition-opacity duration-1000 ease-in-out"
                                    style={{
                                        backgroundImage: `url(${slideshowImages[(currentSlide + 1) % slideshowImages.length]?.media[0]?.url})`,
                                    }}
                                />
                            </>
                        ) : (
                            // Fallback gradient if no images
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"></div>
                        )}
                        
                        {/* Overlay for better text readability */}
                        <div className="absolute inset-0 bg-black/40"></div>
                        
                        {/* Subtle gradient overlay */}
                        <div className="absolute inset-0 slideshow-overlay"></div>
                    </div>
                    
                    {/* Floating elements */}
                    <div className="absolute inset-0 pointer-events-none z-1000">
                        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-blue-100/20 to-indigo-200/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-indigo-100/15 to-purple-200/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                    </div>

                    <div className="container mx-auto px-6 relative z-10">
                        <div className={`hero-content transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                            
                            {/* Badge */}
                            <Badge className="mb-8 bg-white/90 backdrop-blur-sm border border-blue-200 text-blue-700 px-4 py-2 text-sm font-medium shadow-lg mt-10">
                                <Crown className="h-4 w-4 mr-2" />
                                Platform Homestay Terpercaya di Jogja
                            </Badge>
                            
                            {/* Main Heading */}
                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight hero-text-shadow-lg">
                                <span className="block">Temukan</span>
                                <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent drop-shadow-lg">
                                    Homestay
                                </span>
                                <span className="block">Impian</span>
                            </h1>

                            {/* Rotating Slogan */}
                            <div className="h-12 mb-12">
                                <p className={`text-2xl text-white/90 font-light transition-all duration-700 hero-text-shadow ${currentSlogan >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    "{jogjaSlogans[currentSlogan]}"
                                </p>
                            </div>

                            {/* Description */}
                            <p className="text-xl text-white/80 mb-16 max-w-3xl mx-auto leading-relaxed font-light hero-text-shadow">
                                Pengalaman menginap yang tak terlupakan di jantung budaya Jawa. 
                                Dari dekat Malioboro hingga Taman Sari, rasakan kehangatan hospitality Jogja.
                            </p>

                            {/* Enhanced Search Form */}
                            <div className="max-w-4xl mx-auto mb-16">
                                <Card className="p-8 shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <Calendar className="h-4 w-4 inline mr-2 text-blue-600" />
                                                Tanggal Menginap
                                            </label>
                                            <DateRange
                                                startDate={searchDates.checkIn}
                                                endDate={searchDates.checkOut}
                                                onDateChange={(start, end) => setSearchDates({ checkIn: start, checkOut: end })}
                                                className="bg-white border-gray-200 hover:border-blue-300 focus:ring-blue-500"
                                                size="lg"
                                                compact={false}
                                            />
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <Users className="h-4 w-4 inline mr-2 text-blue-600" />
                                                Jumlah Tamu
                                            </label>
                                            <select
                                                value={guests}
                                                onChange={(e) => setGuests(parseInt(e.target.value))}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white hover:bg-gray-50 text-gray-700"
                                            >
                                                {[...Array(20)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>
                                                        {i + 1} Tamu
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Button 
                                                onClick={handleQuickSearch}
                                                size="lg" 
                                                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                                            >
                                                <Search className="h-5 w-5 mr-2" />
                                                Cari Homestay
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            
                        </div>
                    </div>

                    {/* Slideshow Indicators */}
                    {slideshowImages.length > 1 && (
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
                            {slideshowImages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`w-3 h-3 rounded-full slideshow-indicator ${
                                        index === currentSlide 
                                            ? 'bg-white active' 
                                            : 'bg-white/50 hover:bg-white/75'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Stats Section - Minimalist */}
                <section className="py-20 bg-gray-50">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                            <div className="space-y-3">
                                <div className="text-4xl font-bold text-blue-600">1000+</div>
                                <div className="text-gray-600 font-medium">Homestay Terdaftar</div>
                            </div>
                            <div className="space-y-3">
                                <div className="text-4xl font-bold text-indigo-600">50K+</div>
                                <div className="text-gray-600 font-medium">Tamu Puas</div>
                            </div>
                            <div className="space-y-3">
                                <div className="text-4xl font-bold text-purple-600">98%</div>
                                <div className="text-gray-600 font-medium">Rating Positif</div>
                            </div>
                            <div className="space-y-3">
                                <div className="text-4xl font-bold text-blue-600">24/7</div>
                                <div className="text-gray-600 font-medium">Dukungan</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section - Clean Grid */}
                <section className="py-20 bg-white">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                                Kenapa Pilih Homsjogja?
                            </h2>
                            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light">
                                Pengalaman menginap dengan cita rasa Jogja yang autentik dan pelayanan modern
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12">
                            <div className="text-center space-y-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
                                    <Search className="h-10 w-10 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    Pencarian Cerdas
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Temukan homestay impian dengan mudah. Dari dekat Kraton hingga Malioboro, 
                                    semua dalam genggaman Anda.
                                </p>
                            </div>

                            <div className="text-center space-y-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto">
                                    <Shield className="h-10 w-10 text-indigo-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    Aman & Terpercaya
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Keamanan transaksi terjamin dengan teknologi modern. 
                                    Booking mudah, hati tenang seperti di rumah sendiri.
                                </p>
                            </div>

                            <div className="text-center space-y-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto">
                                    <Award className="h-10 w-10 text-purple-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    Kualitas Istimewa
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Setiap homestay dipilih dengan standar tinggi. 
                                    Hospitality Jogja yang hangat, fasilitas modern yang lengkap.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Featured Properties - Modern Grid */}
                {featuredProperties.length > 0 && (
                    <section className="py-20 bg-gray-50">
                        <div className="container mx-auto px-6">
                            <div className="text-center mb-16">
                                <Badge className="mb-6 bg-white text-blue-700 border border-blue-200 px-4 py-2">
                                    <Star className="h-4 w-4 mr-2" />
                                    Pilihan Terbaik
                                </Badge>
                                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                                    Homestay Terfavorit
                                </h2>
                                <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light">
                                    Koleksi terbaik homestay dengan citarasa Jogja yang autentik
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {featuredProperties.slice(0, 6).map((property, index) => (
                                    <Card 
                                        key={property.id} 
                                        className="overflow-hidden hover:shadow-2xl transition-all duration-500 group border-0 shadow-lg bg-white hover:-translate-y-2"
                                    >
                                        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                            {property.media && property.media.length > 0 && property.media[0]?.url ? (
                                                <img 
                                                    src={property.media[0].url} 
                                                    alt={property.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                                                    <Building2 className="h-16 w-16 text-blue-400" />
                                                </div>
                                            )}
                                            
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/30 transition-all duration-300"></div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-4 right-4 bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                                            >
                                                <Heart className="h-4 w-4 text-red-500" />
                                            </Button>

                                            {property.is_featured && (
                                                <Badge className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
                                                    <Crown className="h-3 w-3 mr-1" />
                                                    Featured
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <CardContent className="p-6">
                                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                {property.name}
                                            </h3>
                                            
                                            <div className="flex items-center text-gray-500 mb-4">
                                                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                                                <span className="text-sm truncate">{property.address}</span>
                                            </div>
                                            
                                            <p className="text-gray-600 text-sm mb-6 line-clamp-2">
                                                {property.description}
                                            </p>
                                            
                                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                                                <div className="flex items-center">
                                                    <Bed className="h-4 w-4 mr-1" />
                                                    {property.bedroom_count}
                                                </div>
                                                <div className="flex items-center">
                                                    <Bath className="h-4 w-4 mr-1" />
                                                    {property.bathroom_count}
                                                </div>
                                                <div className="flex items-center">
                                                    <Users className="h-4 w-4 mr-1" />
                                                    {property.capacity}-{property.capacity_max}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                                <div>
                                                    <span className="text-2xl font-bold text-gray-900">
                                                        {formatCurrency(property.base_rate)}
                                                    </span>
                                                    <span className="text-gray-500 text-sm ml-1">/malam</span>
                                                </div>
                                                
                                                <Link href={`/properties/${property.slug}`}>
                                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white group-hover:scale-105 transition-all duration-300">
                                                        Lihat Detail
                                                        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="text-center mt-16">
                                <Link href="/properties">
                                    <Button size="lg" variant="outline" className="border-2 border-blue-600 hover:bg-blue-50 text-blue-600 px-8 py-3">
                                        Jelajahi Semua Homestay
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                {/* CTA Section - Clean & Modern */}
                <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="container mx-auto px-6 text-center">
                        <div className="max-w-4xl mx-auto">
                            <Badge className="mb-8 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                                <Sparkles className="h-4 w-4 mr-2" />
                                Bergabunglah dengan Komunitas Homestay Jogja
                            </Badge>
                            
                            <h2 className="text-4xl md:text-6xl font-bold mb-8">
                                Rasakan Kehangatan
                                <span className="block mt-2">Hospitality Jogja</span>
                            </h2>
                            <p className="text-xl mb-12 opacity-90 leading-relaxed max-w-2xl mx-auto">
                                Dari gudeg hangat di pagi hari hingga cerita malam di pendopo. 
                                Setiap homestay menawarkan pengalaman autentik yang tak terlupakan.
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
                                            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20 px-8 py-3">
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
                        </div>
                    </div>
                </section>

                {/* Footer - Minimalist */}
                <footer className="bg-gray-900 text-white py-16">
                    <div className="container mx-auto px-6">
                        <div className="grid md:grid-cols-4 gap-12">
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3">
                                    <Crown className="h-8 w-8 text-blue-400" />
                                    <h3 className="text-2xl font-bold">Homsjogja</h3>
                                </div>
                                <p className="text-gray-400 leading-relaxed">
                                    Platform homestay terpercaya di Ngayogyakarto Hadiningrat. 
                                    Menyajikan pengalaman menginap dengan citarasa budaya Jawa yang autentik.
                                </p>
                            </div>
                            
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-blue-300">Tentang Kami</h3>
                                <div className="space-y-3 text-gray-400">
                                    <Link href="/about" className="block hover:text-blue-300 transition-colors">Cerita Homsjogja</Link>
                                    <Link href="/careers" className="block hover:text-blue-300 transition-colors">Bergabung dengan Tim</Link>
                                    <Link href="/press" className="block hover:text-blue-300 transition-colors">Media & Pers</Link>
                                    <Link href="/culture" className="block hover:text-blue-300 transition-colors">Budaya Jogja</Link>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-indigo-300">Bantuan & Dukungan</h3>
                                <div className="space-y-3 text-gray-400">
                                    <Link href="/help" className="block hover:text-indigo-300 transition-colors">Pusat Bantuan</Link>
                                    <Link href="/contact" className="block hover:text-indigo-300 transition-colors">Hubungi Kami</Link>
                                    <Link href="/safety" className="block hover:text-indigo-300 transition-colors">Keamanan & Privasi</Link>
                                    <Link href="/faq" className="block hover:text-indigo-300 transition-colors">FAQ</Link>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-purple-300">Jadi Host</h3>
                                <div className="space-y-3 text-gray-400">
                                    <Link href="/host" className="block hover:text-purple-300 transition-colors">Daftar Jadi Host</Link>
                                    <Link href="/host-resources" className="block hover:text-purple-300 transition-colors">Panduan Host</Link>
                                    <Link href="/community" className="block hover:text-purple-300 transition-colors">Komunitas Host</Link>
                                    <Link href="/success-stories" className="block hover:text-purple-300 transition-colors">Kisah Sukses</Link>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-800 mt-12 pt-8">
                            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                                <div className="text-center md:text-left">
                                    <p className="text-gray-400">
                                        &copy; 2025 Homsjogja - Platform Homestay Istimewa di Ngayogyakarto
                                    </p>
                                </div>
                                <div className="flex items-center space-x-6 text-gray-400">
                                    <Link href="/privacy" className="hover:text-blue-300 transition-colors">Privasi</Link>
                                    <Link href="/terms" className="hover:text-blue-300 transition-colors">Ketentuan</Link>
                                    <div className="flex items-center space-x-2">
                                        <Coffee className="h-4 w-4 text-blue-400" />
                                        <span>Made with ❤️ in Jogja</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
} 