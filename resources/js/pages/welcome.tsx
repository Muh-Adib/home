import React, { useState } from 'react';
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
    Moon
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

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-blue-100">
                {/* Hero Section */}
                <section className="py-20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-yellow-400/20"></div>
                    <div className="container mx-auto px-4 text-center relative z-10">
                        <div className="max-w-4xl mx-auto">
                            <Badge className="mb-6 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300">
                                <Star className="h-3 w-3 mr-1" />
                                {t('welcome_page.trusted_platform')}
                            </Badge>
                            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                                {t('welcome_page.hero.title')}
                                <span className="bg-gradient-to-r from-blue-600 to-yellow-500 bg-clip-text text-transparent block mt-2">
                                    {t('welcome_page.hero.subtitle')}
                                </span>
                            </h1>
                            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                                {t('welcome_page.hero.description')}
                            </p>

                            {/* Quick Search Form */}
                            <div className="max-w-5xl mx-auto mb-8">
                                <Card className="p-6 shadow-xl border-0 bg-white/95 backdrop-blur-sm border-yellow-200">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div className="text-left">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <Calendar className="h-4 w-4 inline mr-2 text-blue-600" />
                                                {t('welcome_page.search.date_range')}
                                            </label>
                                            <DateRangePicker
                                                checkIn={searchDates.checkIn}
                                                checkOut={searchDates.checkOut}
                                                onCheckInChange={(date) => setSearchDates(prev => ({ ...prev, checkIn: date }))}
                                                onCheckOutChange={(date) => setSearchDates(prev => ({ ...prev, checkOut: date }))}
                                                className="bg-white border-blue-200 hover:bg-blue-50"
                                            />
                                        </div>
                                        <div className="text-left">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <Users className="h-4 w-4 inline mr-2 text-blue-600" />
                                                {t('welcome_page.search.guests')}
                                            </label>
                                            <select
                                                value={guests}
                                                onChange={(e) => setGuests(parseInt(e.target.value))}
                                                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                {[...Array(20)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>
                                                        {i + 1} {t('welcome_page.search.guest_count', { count: i + 1 })}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Button 
                                                onClick={handleQuickSearch}
                                                size="lg" 
                                                className="w-full px-8 py-3 bg-gradient-to-r from-blue-600 to-yellow-500 hover:from-blue-700 hover:to-yellow-600 flex items-center gap-2 shadow-lg text-white"
                                            >
                                                <Search className="h-5 w-5" />
                                                {t('welcome_page.search.button')}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/properties">
                                    <Button variant="outline" size="lg" className="flex items-center gap-2 border-2 border-blue-300 hover:bg-blue-50 text-blue-700">
                                        <Building2 className="h-5 w-5" />
                                        {t('welcome_page.actions.browse_all')}
                                    </Button>
                                </Link>
                                {!auth.user && (
                                    <Link href="/register">
                                        <Button variant="outline" size="lg" className="flex items-center gap-2 border-2 border-yellow-300 hover:bg-yellow-50 text-yellow-700">
                                            <Star className="h-5 w-5" />
                                            {t('welcome_page.actions.join_host')}
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-12 bg-white/70 backdrop-blur-sm">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            <div className="space-y-2">
                                <div className="text-3xl font-bold text-blue-600">1000+</div>
                                <div className="text-sm text-gray-600">{t('welcome_page.stats.properties')}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-3xl font-bold text-yellow-600">50K+</div>
                                <div className="text-sm text-gray-600">{t('welcome_page.stats.guests')}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-3xl font-bold text-blue-600">98%</div>
                                <div className="text-sm text-gray-600">{t('welcome_page.stats.satisfaction')}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-3xl font-bold text-yellow-600">24/7</div>
                                <div className="text-sm text-gray-600">{t('welcome_page.stats.support')}</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-16 bg-gradient-to-br from-blue-50 to-yellow-50">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                {t('welcome_page.features.title')}
                            </h2>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                {t('welcome_page.features.subtitle')}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <Card className="p-6 hover:shadow-lg transition-all duration-300 group border-0 shadow-md bg-white/80 backdrop-blur-sm">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                                    <Search className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    {t('welcome_page.features.smart_search.title')}
                                </h3>
                                <p className="text-gray-600">
                                    {t('welcome_page.features.smart_search.description')}
                                </p>
                            </Card>

                            <Card className="p-6 hover:shadow-lg transition-all duration-300 group border-0 shadow-md bg-white/80 backdrop-blur-sm">
                                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-200 transition-colors">
                                    <Shield className="h-6 w-6 text-yellow-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    {t('welcome_page.features.secure_booking.title')}
                                </h3>
                                <p className="text-gray-600">
                                    {t('welcome_page.features.secure_booking.description')}
                                </p>
                            </Card>

                            <Card className="p-6 hover:shadow-lg transition-all duration-300 group border-0 shadow-md bg-white/80 backdrop-blur-sm">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                                    <Award className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    {t('welcome_page.features.quality_assurance.title')}
                                </h3>
                                <p className="text-gray-600">
                                    {t('welcome_page.features.quality_assurance.description')}
                                </p>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Featured Properties Section */}
                {featuredProperties.length > 0 && (
                    <section className="py-16 bg-gradient-to-br from-yellow-50 to-blue-50">
                        <div className="container mx-auto px-4">
                            <div className="text-center mb-16">
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    {t('welcome_page.featured.title')}
                                </h2>
                                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                    {t('welcome_page.featured.subtitle')}
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {featuredProperties.slice(0, 6).map((property) => (
                                    <Card key={property.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-0 shadow-md bg-white/90 backdrop-blur-sm">
                                        <div className="aspect-video bg-gradient-to-br from-blue-100 to-yellow-100 relative overflow-hidden">
                                            {property.cover_image ? (
                                                <img 
                                                    src={property.cover_image} 
                                                    alt={property.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Building2 className="h-12 w-12 text-blue-400" />
                                                </div>
                                            )}
                                            
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-3 right-3 bg-white/80 hover:bg-white shadow-lg"
                                            >
                                                <Heart className="h-4 w-4" />
                                            </Button>

                                            {property.is_featured && (
                                                <Badge className="absolute top-3 left-3 bg-yellow-500 text-white border-yellow-600">
                                                    <Star className="h-3 w-3 mr-1" />
                                                    {t('properties.featured')}
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg line-clamp-1">
                                                {property.name}
                                            </CardTitle>
                                            <div className="flex items-center text-gray-600">
                                                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                                                <span className="line-clamp-1 text-sm">{property.address}</span>
                                            </div>
                                        </CardHeader>
                                        
                                        <CardContent className="space-y-4">
                                            <p className="text-gray-600 text-sm line-clamp-2">
                                                {property.description}
                                            </p>
                                            
                                            <div className="flex items-center gap-3 text-sm text-gray-600">
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
                                            
                                            <div className="flex items-center justify-between pt-2">
                                                <div>
                                                    <span className="text-xl font-bold text-blue-600">
                                                        {property.formatted_base_rate}
                                                    </span>
                                                    <span className="text-gray-600 text-sm ml-1">/{t('properties.night')}</span>
                                                </div>
                                                
                                                <Link href={`/properties/${property.slug}`}>
                                                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-yellow-500 hover:from-blue-700 hover:to-yellow-600 text-white">
                                                        {t('properties.view')}
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="text-center mt-12">
                                <Link href="/properties">
                                    <Button size="lg" variant="outline" className="border-2 border-blue-300 hover:bg-blue-50 text-blue-700">
                                        {t('welcome_page.featured.view_all')}
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                {/* CTA Section */}
                <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-500 to-yellow-500 text-white">
                    <div className="container mx-auto px-4 text-center">
                        <div className="max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                {t('welcome_page.cta.title')}
                            </h2>
                            <p className="text-xl mb-8 opacity-90">
                                {t('welcome_page.cta.description')}
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                {!auth.user ? (
                                    <>
                                        <Link href="/register">
                                            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                                                {t('welcome_page.cta.get_started')}
                                                <ArrowRight className="ml-2 h-5 w-5" />
                                            </Button>
                                        </Link>
                                        <Link href="/properties">
                                            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                                                {t('welcome_page.cta.explore_first')}
                                            </Button>
                                        </Link>
                                    </>
                                ) : (
                                    <Link href="/properties">
                                        <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                                            {t('welcome_page.cta.explore_properties')}
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-gray-900 text-white py-12">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-4 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">{t('welcome_page.footer.company')}</h3>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <Link href="/about" className="block hover:text-white transition-colors">
                                        {t('welcome_page.footer.about')}
                                    </Link>
                                    <Link href="/careers" className="block hover:text-white transition-colors">
                                        {t('welcome_page.footer.careers')}
                                    </Link>
                                    <Link href="/press" className="block hover:text-white transition-colors">
                                        {t('welcome_page.footer.press')}
                                    </Link>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">{t('welcome_page.footer.support')}</h3>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <Link href="/help" className="block hover:text-white transition-colors">
                                        {t('welcome_page.footer.help_center')}
                                    </Link>
                                    <Link href="/contact" className="block hover:text-white transition-colors">
                                        {t('welcome_page.footer.contact')}
                                    </Link>
                                    <Link href="/safety" className="block hover:text-white transition-colors">
                                        {t('welcome_page.footer.safety')}
                                    </Link>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">{t('welcome_page.footer.hosting')}</h3>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <Link href="/host" className="block hover:text-white transition-colors">
                                        {t('welcome_page.footer.become_host')}
                                    </Link>
                                    <Link href="/host-resources" className="block hover:text-white transition-colors">
                                        {t('welcome_page.footer.host_resources')}
                                    </Link>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">{t('welcome_page.footer.contact')}</h3>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <div className="flex items-center">
                                        <span className="mr-2">📧</span>
                                        <span>info@homsjogja.com</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="mr-2">📞</span>
                                        <span>+62 21 1234 5678</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
                            <p>&copy; 2025 Homsjogja. {t('welcome_page.footer.rights_reserved')}</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}
