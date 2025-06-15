import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    Sparkles
} from 'lucide-react';
import { type SharedData } from '@/types';

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

    // Default dates - today and tomorrow, adjustable based on minimum stay
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
        <>
            <Head title="Welcome - Property Management System" />

            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
                {/* Header Navigation */}
                <nav className="bg-white shadow-sm border-b">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center space-x-8">
                                <Link href="/" className="text-xl font-bold text-blue-600">
                                    PropertyMS
                                </Link>
                                <div className="hidden md:flex space-x-6">
                                    <Link 
                                        href="/properties" 
                                        className="text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        Browse Properties
                                    </Link>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                {auth.user ? (
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm text-gray-600">
                                            Welcome, {auth.user.name}
                                        </span>
                                        {auth.user.role === 'guest' && (
                                            <Link href="/my-bookings">
                                                <Button variant="outline" size="sm">
                                                    My Bookings
                                                </Button>
                                            </Link>
                                        )}
                                        <Link href="/dashboard">
                                            <Button size="sm">Dashboard</Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <Link href="/login">
                                            <Button variant="outline" size="sm">
                                                Login
                                            </Button>
                                        </Link>
                                        <Link href="/register">
                                            <Button size="sm">
                                                Register
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="py-20">
                    <div className="container mx-auto px-4 text-center">
                        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                            Find Your Perfect
                            <span className="text-blue-600 block mt-2">Getaway</span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                            Discover amazing properties for your next vacation. From cozy villas to luxury homestays, 
                            we have the perfect accommodation for your needs.
                        </p>

                        {/* Quick Search Form */}
                        <div className="max-w-4xl mx-auto mb-8">
                            <Card className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="text-left">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Check-in
                                        </label>
                                        <input
                                            type="date"
                                            value={searchDates.checkIn}
                                            onChange={(e) => setSearchDates(prev => ({ ...prev, checkIn: e.target.value }))}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="text-left">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Check-out
                                        </label>
                                        <input
                                            type="date"
                                            value={searchDates.checkOut}
                                            onChange={(e) => setSearchDates(prev => ({ ...prev, checkOut: e.target.value }))}
                                            min={searchDates.checkIn}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="text-left">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Guests
                                        </label>
                                        <select
                                            value={guests}
                                            onChange={(e) => setGuests(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {[...Array(20)].map((_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    {i + 1} Guest{i + 1 > 1 ? 's' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Button 
                                            onClick={handleQuickSearch}
                                            size="lg" 
                                            className="w-full px-8 py-3 flex items-center gap-2"
                                        >
                                            <Search className="h-5 w-5" />
                                            Search Properties
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/properties">
                                <Button variant="outline" size="lg" className="flex items-center gap-2">
                                    <Search className="h-5 w-5" />
                                    Browse All Properties
                                </Button>
                            </Link>
                            {!auth.user && (
                                <Link href="/register">
                                    <Button variant="outline" size="lg" className="flex items-center gap-2">
                                        <Star className="h-5 w-5" />
                                        Join as Host
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-16 bg-white">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                Why Choose PropertyMS?
                            </h2>
                            <p className="text-gray-600 max-w-2xl mx-auto">
                                We provide a comprehensive platform for property management and bookings 
                                with modern features and secure payment processing.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <Card className="text-center">
                                <CardContent className="pt-6">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                        <Calendar className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
                                    <p className="text-gray-600">
                                        Simple and intuitive booking process with instant confirmation 
                                        and flexible payment options.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="text-center">
                                <CardContent className="pt-6">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                        <Shield className="h-6 w-6 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
                                    <p className="text-gray-600">
                                        Multiple payment methods with secure processing and 
                                        tokenized payment links for your safety.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="text-center">
                                <CardContent className="pt-6">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                        <Sparkles className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Premium Experience</h3>
                                    <p className="text-gray-600">
                                        Curated properties with detailed guest information management 
                                        and exceptional customer service.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Featured Properties */}
                {featuredProperties.length > 0 && (
                    <section className="py-16 bg-slate-50">
                        <div className="container mx-auto px-4">
                            <div className="flex items-center justify-between mb-12">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                        Featured Properties
                                    </h2>
                                    <p className="text-gray-600">
                                        Handpicked accommodations for an exceptional stay
                                    </p>
                                </div>
                                <Link href="/properties">
                                    <Button variant="outline" className="flex items-center gap-2">
                                        View All
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {featuredProperties.map((property) => (
                                    <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                        <div className="aspect-video bg-slate-200 relative">
                                            {property.cover_image ? (
                                                <img
                                                    src={property.cover_image}
                                                    alt={property.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                    <Building2 className="h-12 w-12 text-blue-400" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2">
                                                <Badge className="bg-yellow-500 text-white">
                                                    <Star className="h-3 w-3 mr-1" />
                                                    Featured
                                                </Badge>
                                            </div>
                                        </div>

                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg line-clamp-1">{property.name}</CardTitle>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <MapPin className="h-4 w-4 mr-1" />
                                                <span className="line-clamp-1">{property.address}</span>
                                            </div>
                                        </CardHeader>

                                        <CardContent>
                                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                                {property.description}
                                            </p>

                                            <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-3">
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
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-2xl font-bold text-blue-600">
                                                        {property.formatted_base_rate}
                                                    </span>
                                                    <span className="text-sm text-gray-600 ml-1">/night</span>
                                                </div>
                                                <Link href={`/properties/${property.slug}`}>
                                                    <Button size="sm">
                                                        View Details
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* CTA Section */}
                <section className="py-16 bg-blue-600 text-white">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold mb-4">
                            Ready to Start Your Journey?
                        </h2>
                        <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
                            Join thousands of satisfied guests who have found their perfect accommodations through our platform.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/properties">
                                <Button size="lg" variant="secondary" className="flex items-center gap-2">
                                    <Search className="h-5 w-5" />
                                    Browse Properties
                                </Button>
                            </Link>
                            {!auth.user && (
                                <Link href="/register">
                                    <Button size="lg" variant="outline" className="flex items-center gap-2 text-white border-white hover:bg-white hover:text-blue-600">
                                        <CreditCard className="h-5 w-5" />
                                        Sign Up Now
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-gray-900 text-white py-12">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-3 gap-8">
                            <div>
                                <h3 className="text-xl font-bold mb-4">PropertyMS</h3>
                                <p className="text-gray-400">
                                    Your trusted platform for property management and vacation rentals. 
                                    Connecting hosts and guests for memorable experiences.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">Quick Links</h4>
                                <div className="space-y-2">
                                    <Link href="/properties" className="block text-gray-400 hover:text-white transition-colors">
                                        Browse Properties
                                    </Link>
                                    {auth.user && (
                                        <>
                                            <Link href="/dashboard" className="block text-gray-400 hover:text-white transition-colors">
                                                Dashboard
                                            </Link>
                                            {auth.user.role === 'guest' && (
                                                <Link href="/my-bookings" className="block text-gray-400 hover:text-white transition-colors">
                                                    My Bookings
                                                </Link>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">Contact</h4>
                                <div className="space-y-2 text-gray-400">
                                    <p>Email: support@propertyms.com</p>
                                    <p>Phone: +62 123 456 7890</p>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                            <p>&copy; 2024 PropertyMS. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
