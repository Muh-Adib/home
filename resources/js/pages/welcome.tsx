import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DateRangePicker from '@/components/ui/date-range-picker';
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
    Camera
} from 'lucide-react';
import { type SharedData, type BreadcrumbItem } from '@/types';
import { useTranslation } from 'react-i18next';

interface Property {
    id: number;
    name: string;
    slug: string;
    description: string;
    address: string;
    base_rate: number;
    formatted_base_rate: string;
    capacity: number;
    capacity_max: number;
    bedroom_count: number;
    bathroom_count: number;
    is_featured: boolean;
    cover_image?: string;
}

interface WelcomeProps {
    featuredProperties: Property[];
}

export default function Welcome({ featuredProperties }: WelcomeProps) {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [currentSlogan, setCurrentSlogan] = useState(0);

    const jogjaSlogans = [
        "Istimewa seperti Jogja",
        "Hati Selalu di Jogja",
        "Gudeg, Batik & Homestay",
        "Ngayogyakarto Hadiningrat"
    ];

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
        const interval = setInterval(() => {
            setCurrentSlogan((prev) => (prev + 1) % jogjaSlogans.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

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

            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-orange-300/30 rounded-full animate-pulse"></div>
                    <div className="absolute top-32 right-20 w-24 h-24 bg-gradient-to-br from-red-200/30 to-pink-300/30 rounded-full animate-bounce" style={{ animationDelay: '2s' }}></div>
                    <div className="absolute bottom-20 left-32 w-40 h-40 bg-gradient-to-br from-yellow-200/20 to-amber-300/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                    
                    {/* Jogja Pattern Elements */}
                    <div className="absolute top-1/4 right-1/4 text-6xl opacity-10 animate-spin" style={{ animationDuration: '20s' }}>🏛️</div>
                    <div className="absolute bottom-1/4 left-1/4 text-4xl opacity-10 animate-bounce" style={{ animationDelay: '3s' }}>👑</div>
                </div>

                {/* Hero Section with Jogja Vibes */}
                <section className="py-20 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-orange-500/15 to-red-500/20"></div>
                    <div className="container mx-auto px-4 text-center relative z-10">
                        <div className={`max-w-4xl mx-auto transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                            <Badge className="mb-6 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 hover:from-amber-200 hover:to-orange-200 border-amber-300 animate-pulse">
                                <Crown className="h-3 w-3 mr-1" />
                                Istimewa & Terpercaya di Ngayogyakarto
                            </Badge>
                            
                            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                                <span className="block">Selamat Datang di</span>
                                <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent block mt-2 animate-pulse">
                                    Homsjogja
                                </span>
                            </h1>

                            {/* Rotating Jogja Slogans */}
                            <div className="h-8 mb-6">
                                <p className={`text-xl text-amber-700 font-medium transition-all duration-500 ${currentSlogan >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    "{jogjaSlogans[currentSlogan]}"
                                </p>
                            </div>

                            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                                Temukan pengalaman menginap yang tak terlupakan di jantung budaya Jawa. 
                                Dari dekat Malioboro hingga Taman Sari, rasakan kehangatan hospitality Jogja yang legendaris.
                            </p>

                            {/* Enhanced Quick Search Form with Jogja Touch */}
                            <div className="max-w-5xl mx-auto mb-8">
                                <Card className="p-6 shadow-2xl border-0 bg-white/95 backdrop-blur-sm border-amber-200 transform hover:scale-105 transition-all duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div className="text-left group">
                                            <label className="block text-sm font-medium text-amber-700 mb-2">
                                                <Calendar className="h-4 w-4 inline mr-2 text-orange-600 group-hover:animate-bounce" />
                                                Pilih Tanggal Menginap
                                            </label>
                                            <DateRangePicker
                                                checkIn={searchDates.checkIn}
                                                checkOut={searchDates.checkOut}
                                                onCheckInChange={(date) => setSearchDates(prev => ({ ...prev, checkIn: date }))}
                                                onCheckOutChange={(date) => setSearchDates(prev => ({ ...prev, checkOut: date }))}
                                                className="bg-white border-amber-200 hover:bg-amber-50 focus:ring-amber-500 transition-all"
                                            />
                                        </div>
                                        <div className="text-left group">
                                            <label className="block text-sm font-medium text-amber-700 mb-2">
                                                <Users className="h-4 w-4 inline mr-2 text-orange-600 group-hover:animate-bounce" />
                                                Jumlah Tamu
                                            </label>
                                            <select
                                                value={guests}
                                                onChange={(e) => setGuests(parseInt(e.target.value))}
                                                className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white hover:bg-amber-50"
                                            >
                                                {[...Array(20)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>
                                                        {i + 1} Tamu
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Button 
                                                onClick={handleQuickSearch}
                                                size="lg" 
                                                className="w-full px-8 py-3 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-700 hover:via-orange-700 hover:to-red-700 flex items-center gap-2 shadow-lg text-white transform hover:scale-105 transition-all duration-300"
                                            >
                                                <Search className="h-5 w-5 animate-pulse" />
                                                Cari Homestay
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/properties">
                                    <Button variant="outline" size="lg" className="flex items-center gap-2 border-2 border-amber-400 hover:bg-amber-50 text-amber-700 group">
                                        <Building2 className="h-5 w-5 group-hover:animate-bounce" />
                                        Jelajahi Semua Property
                                    </Button>
                                </Link>
                                {!auth.user && (
                                    <Link href="/register">
                                        <Button variant="outline" size="lg" className="flex items-center gap-2 border-2 border-orange-400 hover:bg-orange-50 text-orange-700 group">
                                            <Crown className="h-5 w-5 group-hover:animate-spin" />
                                            Bergabung Jadi Host Jogja
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Enhanced Stats Section with Jogja Pride */}
                <section className="py-12 bg-white/80 backdrop-blur-sm border-t border-amber-200">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            <div className="space-y-2 group cursor-pointer">
                                <div className="text-3xl font-bold text-amber-600 group-hover:scale-110 transition-transform">1000+</div>
                                <div className="text-sm text-gray-600">Homestay Istimewa</div>
                            </div>
                            <div className="space-y-2 group cursor-pointer">
                                <div className="text-3xl font-bold text-orange-600 group-hover:scale-110 transition-transform">50K+</div>
                                <div className="text-sm text-gray-600">Tamu Bahagia</div>
                            </div>
                            <div className="space-y-2 group cursor-pointer">
                                <div className="text-3xl font-bold text-red-600 group-hover:scale-110 transition-transform">98%</div>
                                <div className="text-sm text-gray-600">Kepuasan Tinggi</div>
                            </div>
                            <div className="space-y-2 group cursor-pointer">
                                <div className="text-3xl font-bold text-amber-600 group-hover:scale-110 transition-transform">24/7</div>
                                <div className="text-sm text-gray-600">Pelayanan Prima</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section with Jogja Cultural Elements */}
                <section className="py-16 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                Kenapa Pilih Homsjogja?
                            </h2>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                Pengalaman menginap dengan cita rasa Jogja yang autentik dan pelayanan modern
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <Card className="p-6 hover:shadow-2xl transition-all duration-500 group border-0 shadow-md bg-white/90 backdrop-blur-sm hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 mx-auto">
                                    <Search className="h-8 w-8 text-amber-600 group-hover:animate-pulse" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                                    Pencarian Cerdas
                                </h3>
                                <p className="text-gray-600 text-center">
                                    Temukan homestay impian dengan mudah. Dari dekat Kraton hingga Malioboro, 
                                    semua dalam genggaman Anda.
                                </p>
                            </Card>

                            <Card className="p-6 hover:shadow-2xl transition-all duration-500 group border-0 shadow-md bg-white/90 backdrop-blur-sm hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 mx-auto">
                                    <Shield className="h-8 w-8 text-orange-600 group-hover:animate-pulse" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                                    Aman & Terpercaya
                                </h3>
                                <p className="text-gray-600 text-center">
                                    Keamanan transaksi terjamin dengan teknologi modern. 
                                    Booking mudah, hati tenang seperti di rumah sendiri.
                                </p>
                            </Card>

                            <Card className="p-6 hover:shadow-2xl transition-all duration-500 group border-0 shadow-md bg-white/90 backdrop-blur-sm hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-amber-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 mx-auto">
                                    <Award className="h-8 w-8 text-red-600 group-hover:animate-pulse" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                                    Kualitas Istimewa
                                </h3>
                                <p className="text-gray-600 text-center">
                                    Setiap homestay dipilih dengan standar tinggi. 
                                    Hospitality Jogja yang hangat, fasilitas modern yang lengkap.
                                </p>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Enhanced Featured Properties with Jogja Styling */}
                {featuredProperties.length > 0 && (
                    <section className="py-16 bg-gradient-to-br from-orange-50 via-red-50 to-amber-50">
                        <div className="container mx-auto px-4">
                            <div className="text-center mb-16">
                                <Badge className="mb-4 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-300">
                                    <Star className="h-3 w-3 mr-1 animate-spin" />
                                    Pilihan Istimewa
                                </Badge>
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    Homestay Terfavorit di Jogja
                                </h2>
                                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                    Koleksi terbaik homestay dengan citarasa Jogja yang autentik dan fasilitas modern
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {featuredProperties.slice(0, 6).map((property, index) => (
                                    <Card 
                                        key={property.id} 
                                        className="overflow-hidden hover:shadow-2xl transition-all duration-500 group border-0 shadow-lg bg-white/95 backdrop-blur-sm hover:-translate-y-3 animate-fade-in"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="aspect-video bg-gradient-to-br from-amber-100 via-orange-100 to-red-100 relative overflow-hidden">
                                            {property.cover_image ? (
                                                <img 
                                                    src={property.cover_image} 
                                                    alt={property.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Building2 className="h-12 w-12 text-amber-500 group-hover:animate-bounce" />
                                                </div>
                                            )}
                                            
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/30 transition-all duration-300"></div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-3 right-3 bg-white/90 hover:bg-white shadow-lg group-hover:scale-110 transition-all duration-300"
                                            >
                                                <Heart className="h-4 w-4 text-red-500 hover:animate-pulse" />
                                            </Button>

                                            {property.is_featured && (
                                                <Badge className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 animate-pulse">
                                                    <Crown className="h-3 w-3 mr-1" />
                                                    Istimewa
                                                </Badge>
                                            )}

                                            <div className="absolute bottom-3 left-3 right-3">
                                                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                    <div className="flex items-center justify-between text-xs text-gray-700">
                                                        <span className="flex items-center">
                                                            <Camera className="h-3 w-3 mr-1" />
                                                            Lihat Virtual Tour
                                                        </span>
                                                        <span className="flex items-center">
                                                            <Coffee className="h-3 w-3 mr-1" />
                                                            Free Kopi Joss
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg line-clamp-1 group-hover:text-amber-700 transition-colors">
                                                {property.name}
                                            </CardTitle>
                                            <div className="flex items-center text-gray-600">
                                                <MapPin className="h-4 w-4 mr-1 flex-shrink-0 text-amber-600" />
                                                <span className="line-clamp-1 text-sm">{property.address}</span>
                                            </div>
                                        </CardHeader>
                                        
                                        <CardContent className="space-y-4">
                                            <p className="text-gray-600 text-sm line-clamp-2">
                                                {property.description}
                                            </p>
                                            
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <div className="flex items-center bg-amber-50 px-2 py-1 rounded">
                                                    <Bed className="h-4 w-4 mr-1 text-amber-600" />
                                                    {property.bedroom_count}
                                                </div>
                                                <div className="flex items-center bg-orange-50 px-2 py-1 rounded">
                                                    <Bath className="h-4 w-4 mr-1 text-orange-600" />
                                                    {property.bathroom_count}
                                                </div>
                                                <div className="flex items-center bg-red-50 px-2 py-1 rounded">
                                                    <Users className="h-4 w-4 mr-1 text-red-600" />
                                                    {property.capacity}-{property.capacity_max}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between pt-2 border-t border-amber-100">
                                                <div>
                                                    <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                                        {property.formatted_base_rate}
                                                    </span>
                                                    <span className="text-gray-500 text-sm ml-1">/malam</span>
                                                </div>
                                                
                                                <Link href={`/properties/${property.slug}`}>
                                                    <Button size="sm" className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-700 hover:via-orange-700 hover:to-red-700 text-white group-hover:scale-105 transition-all duration-300">
                                                        Lihat Detail
                                                        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="text-center mt-12">
                                <Link href="/properties">
                                    <Button size="lg" variant="outline" className="border-2 border-amber-400 hover:bg-amber-50 text-amber-700 group px-8 py-3">
                                        Jelajahi Semua Homestay Jogja
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                {/* Enhanced CTA Section with Jogja Royal Touch */}
                <section className="py-20 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute top-10 left-10 text-8xl opacity-10">👑</div>
                    <div className="absolute bottom-10 right-10 text-6xl opacity-10">🏛️</div>
                    
                    <div className="container mx-auto px-4 text-center relative z-10">
                        <div className="max-w-3xl mx-auto">
                            <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                                <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                                Bergabunglah dengan Komunitas Homestay Jogja
                            </Badge>
                            
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">
                                Rasakan Kehangatan
                                <span className="block mt-2">Hospitality Jogja</span>
                            </h2>
                            <p className="text-xl mb-8 opacity-90 leading-relaxed">
                                Dari gudeg hangat di pagi hari hingga cerita malam di pendopo. 
                                Setiap homestay menawarkan pengalaman autentik yang tak terlupakan.
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                {!auth.user ? (
                                    <>
                                        <Link href="/register">
                                            <Button size="lg" variant="secondary" className="bg-white text-amber-600 hover:bg-gray-100 px-8 py-3 group">
                                                Mulai Petualangan Jogja
                                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </Link>
                                        <Link href="/properties">
                                            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20 px-8 py-3 group backdrop-blur-sm">
                                                Jelajahi Dulu
                                                <Search className="ml-2 h-5 w-5 group-hover:animate-pulse" />
                                            </Button>
                                        </Link>
                                    </>
                                ) : (
                                    <Link href="/properties">
                                        <Button size="lg" variant="secondary" className="bg-white text-amber-600 hover:bg-gray-100 px-8 py-3 group">
                                            Temukan Homestay Impian
                                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                )}
                            </div>

                            <div className="mt-8 text-center">
                                <p className="text-white/80 text-sm">
                                    "Jogja Istimewa, Pengalaman Tak Terlupakan"
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Enhanced Footer with Jogja Cultural Elements */}
                <footer className="bg-gradient-to-br from-gray-900 via-amber-900 to-gray-900 text-white py-16 relative">
                    <div className="absolute inset-0 bg-black/50"></div>
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="grid md:grid-cols-4 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Crown className="h-6 w-6 text-amber-400" />
                                    <h3 className="text-lg font-semibold">Homsjogja</h3>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed">
                                    Platform homestay terpercaya di Ngayogyakarto Hadiningrat. 
                                    Menyajikan pengalaman menginap dengan citarasa budaya Jawa yang autentik.
                                </p>
                                <div className="flex space-x-2">
                                    <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform cursor-pointer">IG</div>
                                    <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform cursor-pointer">FB</div>
                                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform cursor-pointer">TW</div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-amber-300 flex items-center">
                                    <Building2 className="h-4 w-4 mr-2" />
                                    Tentang Kami
                                </h3>
                                <div className="space-y-2 text-sm text-gray-300">
                                    <Link href="/about" className="block hover:text-amber-300 transition-colors hover:translate-x-1 duration-200">
                                        Cerita Homsjogja
                                    </Link>
                                    <Link href="/careers" className="block hover:text-amber-300 transition-colors hover:translate-x-1 duration-200">
                                        Bergabung dengan Tim
                                    </Link>
                                    <Link href="/press" className="block hover:text-amber-300 transition-colors hover:translate-x-1 duration-200">
                                        Media & Pers
                                    </Link>
                                    <Link href="/culture" className="block hover:text-amber-300 transition-colors hover:translate-x-1 duration-200">
                                        Budaya Jogja
                                    </Link>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-orange-300 flex items-center">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Bantuan & Dukungan
                                </h3>
                                <div className="space-y-2 text-sm text-gray-300">
                                    <Link href="/help" className="block hover:text-orange-300 transition-colors hover:translate-x-1 duration-200">
                                        Pusat Bantuan
                                    </Link>
                                    <Link href="/contact" className="block hover:text-orange-300 transition-colors hover:translate-x-1 duration-200">
                                        Hubungi Kami
                                    </Link>
                                    <Link href="/safety" className="block hover:text-orange-300 transition-colors hover:translate-x-1 duration-200">
                                        Keamanan & Privasi
                                    </Link>
                                    <Link href="/faq" className="block hover:text-orange-300 transition-colors hover:translate-x-1 duration-200">
                                        FAQ Jogja
                                    </Link>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-red-300 flex items-center">
                                    <Crown className="h-4 w-4 mr-2" />
                                    Jadi Host Istimewa
                                </h3>
                                <div className="space-y-2 text-sm text-gray-300">
                                    <Link href="/host" className="block hover:text-red-300 transition-colors hover:translate-x-1 duration-200">
                                        Daftar Jadi Host
                                    </Link>
                                    <Link href="/host-resources" className="block hover:text-red-300 transition-colors hover:translate-x-1 duration-200">
                                        Panduan Host
                                    </Link>
                                    <Link href="/community" className="block hover:text-red-300 transition-colors hover:translate-x-1 duration-200">
                                        Komunitas Host
                                    </Link>
                                    <Link href="/success-stories" className="block hover:text-red-300 transition-colors hover:translate-x-1 duration-200">
                                        Kisah Sukses
                                    </Link>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-700 mt-12 pt-8">
                            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                                <div className="text-center md:text-left">
                                    <p className="text-sm text-gray-400">
                                        &copy; 2025 Homsjogja - Platform Homestay Istimewa di Ngayogyakarto
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        "Hamangku Buwono, Hospitality Jogja untuk Dunia"
                                    </p>
                                </div>
                                <div className="flex items-center space-x-6 text-sm text-gray-400">
                                    <Link href="/privacy" className="hover:text-amber-300 transition-colors">
                                        Kebijakan Privasi
                                    </Link>
                                    <Link href="/terms" className="hover:text-amber-300 transition-colors">
                                        Syarat & Ketentuan
                                    </Link>
                                    <div className="flex items-center space-x-1">
                                        <Coffee className="h-4 w-4 text-amber-400" />
                                        <span>Made with ❤️ in Jogja</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Jogja Cultural Footer Elements */}
                        <div className="mt-8 text-center border-t border-gray-700 pt-6">
                            <div className="flex justify-center items-center space-x-8 text-gray-400">
                                <div className="flex items-center space-x-2 group cursor-pointer">
                                    <span className="text-2xl group-hover:animate-bounce">🏛️</span>
                                    <span className="text-xs">Kraton</span>
                                </div>
                                <div className="flex items-center space-x-2 group cursor-pointer">
                                    <span className="text-2xl group-hover:animate-bounce">🍛</span>
                                    <span className="text-xs">Gudeg</span>
                                </div>
                                <div className="flex items-center space-x-2 group cursor-pointer">
                                    <span className="text-2xl group-hover:animate-bounce">🎭</span>
                                    <span className="text-xs">Batik</span>
                                </div>
                                <div className="flex items-center space-x-2 group cursor-pointer">
                                    <span className="text-2xl group-hover:animate-bounce">🏫</span>
                                    <span className="text-xs">Malioboro</span>
                                </div>
                                <div className="flex items-center space-x-2 group cursor-pointer">
                                    <span className="text-2xl group-hover:animate-bounce">👑</span>
                                    <span className="text-xs">Istimewa</span>
                                </div>
                            </div>
                            
                            <div className="mt-4">
                                <p className="text-xs text-gray-500 italic">
                                    "Jogja ora ngapak-ngapak, nanging istimewa" - Pengalaman menginap yang tak terlupakan di tanah Gudeg
                                </p>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>

           
        </AppLayout>
    );
}