import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { 
    Building2, 
    MapPin, 
    Users, 
    Star,
    Search,
    Calendar,
    ArrowRight,
    Sparkles,
    Shield,
    Clock,
    Heart,
    TrendingUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRange } from '@/components/ui/date-range';
import { formatDate } from '@/lib/date-utils';
import { useTranslation, formatCurrencyByLanguage } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { PageProps } from '@/types';

interface Property {
    id: number;
    name: string;
    slug: string;
    description: string;
    address: string;
    capacity: number;
    bedroom_count: number;
    bathroom_count: number;
    base_rate: number;
    formatted_base_rate: string;
    is_featured: boolean;
    media: Array<{
        id: number;
        file_path: string;
        is_cover: boolean;
    }>;
}

interface WelcomeProps {
    featuredProperties: Property[];
}

export default function Welcome({ featuredProperties = [] }: WelcomeProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const { t, currentLanguage } = useTranslation();
    const [checkIn, setCheckIn] = useState<Date | undefined>();
    const [checkOut, setCheckOut] = useState<Date | undefined>();
    const [guests, setGuests] = useState(2);

    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const getDefaultDates = () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        
        return {
            checkIn: tomorrow,
            checkOut: dayAfterTomorrow
        };
    };

    const handleQuickSearch = () => {
        const dates = getDefaultDates();
        const params = new URLSearchParams({
            check_in: formatDate(checkIn || dates.checkIn),
            check_out: formatDate(checkOut || dates.checkOut),
            guests: guests.toString()
        });
        router.visit(`/properties?${params.toString()}`);
    };

    const formatCurrency = (amount: number) => {
        return formatCurrencyByLanguage(amount, currentLanguage);
    };

    return (
        <>
            <Head title={t('hero.title')} />
            
            {/* Hero Section */}
            <div className="relative min-h-screen hero-gradient overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
                
                {/* Floating Elements */}
                <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl floating-element"></div>
                <div className="absolute top-40 right-20 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl floating-element" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl floating-element" style={{ animationDelay: '4s' }}></div>

                <div className="relative z-10">
                    {/* Navigation */}
                    <nav className="nav-glass sticky top-0 z-50">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-16">
                                <div className="flex items-center">
                                    <Link href="/" className="flex items-center">
                                        <Building2 className="h-8 w-8 text-primary-500 mr-2" />
                                        <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">PMS</span>
                                    </Link>
                                </div>
                                
                                {/* Desktop Navigation */}
                                <div className="hidden md:flex items-center space-x-8">
                                    <Link href="/properties" className="text-gray-700 hover:text-primary-600 transition-colors">
                                        {t('nav.properties')}
                                    </Link>
                                    <Link href="#" className="text-gray-700 hover:text-primary-600 transition-colors">
                                        {t('nav.aboutUs')}
                                    </Link>
                                    <Link href="#" className="text-gray-700 hover:text-primary-600 transition-colors">
                                        {t('nav.contact')}
                                    </Link>
                                    <Link href="#" className="text-gray-700 hover:text-primary-600 transition-colors">
                                        {t('nav.support')}
                                    </Link>
                                </div>
                                
                                <div className="flex items-center space-x-4">
                                    <LanguageSwitcher />
                                    {auth.user ? (
                                        <>
                                            <Link href="/dashboard">
                                                <Button variant="ghost" size="sm">
                                                    {t('nav.dashboard')}
                                                </Button>
                                            </Link>
                                            <Link href="/my-bookings">
                                                <Button variant="default" size="sm">
                                                    {t('nav.myBookings')}
                                                </Button>
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            <Link href="/login">
                                                <Button variant="ghost" size="sm">
                                                    {t('nav.login')}
                                                </Button>
                                            </Link>
                                            <Link href="/register">
                                                <Button variant="default" size="sm" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                                                    {t('nav.register')}
                                                </Button>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </nav>

                    {/* Hero Content */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
                        <div className="text-center">
                            <div className="flex items-center justify-center mb-6">
                                <Sparkles className="h-8 w-8 text-secondary-500 mr-3" />
                                <span className="text-lg font-medium text-secondary-600">{t('hero.discover')}</span>
                                <Sparkles className="h-8 w-8 text-secondary-500 ml-3" />
                            </div>
                            
                            <h1 className="text-5xl md:text-7xl font-bold mb-6">
                                <span className="text-gradient-primary">{t('hero.title')}</span>
                                <br />
                                <span className="text-gray-800">{t('hero.subtitle')}</span>
                            </h1>
                            
                            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                                {t('hero.description')}
                            </p>

                            {/* Search Card */}
                            <Card className="max-w-4xl mx-auto mb-12 search-card-glass">
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div className="text-left">
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <Calendar className="h-4 w-4 mr-2 text-primary-500" />
                                                {t('search.checkin')}
                                            </label>
                                            <input
                                                type="date"
                                                value={formatDate(checkIn || getDefaultDates().checkIn)}
                                                onChange={(e) => setCheckIn(new Date(e.target.value))}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                                            />
                                        </div>
                                        <div className="text-left">
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <Calendar className="h-4 w-4 mr-2 text-primary-500" />
                                                {t('search.checkout')}
                                            </label>
                                            <input
                                                type="date"
                                                value={formatDate(checkOut || getDefaultDates().checkOut)}
                                                onChange={(e) => setCheckOut(new Date(e.target.value))}
                                                min={formatDate(checkIn || getDefaultDates().checkIn)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                                            />
                                        </div>
                                        <div className="text-left">
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <Users className="h-4 w-4 mr-2 text-primary-500" />
                                                {t('search.guests')}
                                            </label>
                                            <select
                                                value={guests}
                                                onChange={(e) => setGuests(parseInt(e.target.value))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                                            >
                                                {[1,2,3,4,5,6,7,8,9,10].map(num => (
                                                    <option key={num} value={num}>
                                                        {num} {num === 1 ? t('search.guest') : t('search.guests_plural')}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Button 
                                                size="lg"
                                                onClick={handleQuickSearch}
                                                className="w-full btn-gradient-secondary text-white"
                                            >
                                                <Search className="h-5 w-5 mr-2" />
                                                {t('search.button')}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Stats Section */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-primary-600 mb-2">100+</div>
                                    <div className="text-gray-600">{t('stats.properties')}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-primary-600 mb-2">5000+</div>
                                    <div className="text-gray-600">{t('stats.guests')}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-secondary-600 mb-2">98%</div>
                                    <div className="text-gray-600">{t('stats.satisfaction')}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-secondary-600 mb-2">24/7</div>
                                    <div className="text-gray-600">{t('stats.support')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">{t('features.title')}</span>
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            {t('features.description')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="text-center feature-card-gradient text-white border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <CardContent className="p-6">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Shield className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{t('features.secure.title')}</h3>
                                <p className="text-white/90">{t('features.secure.description')}</p>
                            </CardContent>
                        </Card>

                        <Card className="text-center feature-card-gradient text-white border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <CardContent className="p-6">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{t('features.support.title')}</h3>
                                <p className="text-white/90">{t('features.support.description')}</p>
                            </CardContent>
                        </Card>

                        <Card className="text-center feature-card-gradient text-white border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <CardContent className="p-6">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Heart className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{t('features.quality.title')}</h3>
                                <p className="text-white/90">{t('features.quality.description')}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Featured Properties */}
            <div className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">{t('properties.title')}</span>
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            {t('properties.description')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredProperties && featuredProperties.length > 0 ? featuredProperties.map((property) => (
                            <Card key={property.id} className="overflow-hidden property-card-hover">
                                <div className="relative h-48 mb-4">
                                    <img
                                        src={property.media?.find(m => m.is_cover)?.file_path || '/images/placeholder-property.jpg'}
                                        alt={property.name}
                                        className="w-full h-full object-cover rounded-lg"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '/images/placeholder-property.jpg';
                                        }}
                                    />
                                    {property.is_featured && (
                                        <div className="absolute top-3 left-3">
                                            <span className="bg-secondary-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                                {t('properties.featured')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-semibold mb-2 text-gray-800">{property.name}</h3>
                                    <p className="text-gray-600 mb-4 line-clamp-2">{property.description}</p>
                                    
                                    <div className="flex items-center text-gray-500 mb-4">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        <span className="text-sm">{property.address}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            <span className="flex items-center">
                                                <Users className="h-4 w-4 mr-1" />
                                                {property.capacity} {t('search.guests_plural')}
                                            </span>
                                            <span className="flex items-center">
                                                <Building2 className="h-4 w-4 mr-1" />
                                                {property.bedroom_count} {t('properties.beds')}
                                            </span>
                                        </div>
                                        <div className="flex items-center">
                                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                            <span className="text-sm font-medium ml-1">4.8</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-2xl font-bold text-primary">
                                                {formatCurrency(property.base_rate)}
                                            </span>
                                            <span className="text-gray-500 text-sm">{t('properties.night')}</span>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="border-primary text-primary hover:bg-primary hover:text-white"
                                        >
                                            {t('properties.viewDetails')}
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="col-span-full text-center py-12">
                                <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-medium text-gray-600 mb-2">{t('properties.noProperties')}</h3>
                                <p className="text-gray-500">{t('properties.checkLater')}</p>
                            </div>
                        )}
                    </div>

                    <div className="text-center mt-12">
                        <Button 
                            size="lg"
                            className="btn-gradient-secondary text-white px-8"
                        >
                            <TrendingUp className="h-5 w-5 mr-2" />
                            {t('properties.viewAll')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gradient-to-r from-primary-900 to-secondary-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center mb-4">
                                <Building2 className="h-8 w-8 text-white mr-2" />
                                <span className="text-xl font-bold text-white">PMS</span>
                            </div>
                            <p className="text-gray-300">
                                {t('footer.description')}
                            </p>
                        </div>
                        
                        <div>
                            <h3 className="text-white font-semibold mb-4">{t('footer.quickLinks')}</h3>
                            <ul className="space-y-2 text-gray-300">
                                <li><Link href="/properties" className="hover:text-white transition-colors">{t('nav.properties')}</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">{t('nav.aboutUs')}</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">{t('nav.contact')}</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">{t('nav.support')}</Link></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h3 className="text-white font-semibold mb-4">{t('footer.support')}</h3>
                            <ul className="space-y-2 text-gray-300">
                                <li><Link href="#" className="hover:text-white transition-colors">{t('footer.helpCenter')}</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">{t('footer.bookingGuide')}</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">{t('footer.cancellationPolicy')}</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">{t('footer.privacyPolicy')}</Link></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h3 className="text-white font-semibold mb-4">{t('footer.contact')}</h3>
                            <ul className="space-y-2 text-gray-300">
                                <li>{t('footer.email')}</li>
                                <li>{t('footer.phone')}</li>
                                <li>{t('footer.address')}</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
                        <p>{t('footer.copyright')}</p>
                    </div>
                </div>
            </footer>
        </>
    );
}
