import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, CreditCard, Star, ArrowRight, MapPin, Calendar, Wifi } from 'lucide-react';

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
    featuredProperties?: Property[];
}

export default function Welcome({ featuredProperties = [] }: WelcomeProps) {
    return (
        <>
            <Head title="Property Management System - Villa & Homestay Booking" />
            
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
                {/* Navigation */}
                <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Building2 className="h-8 w-8 text-blue-600" />
                                <span className="text-xl font-bold text-gray-900">PropertyMS</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <Link href="/properties" className="text-gray-600 hover:text-gray-900">
                                    Properties
                                </Link>
                                <Link href="/login">
                                    <Button variant="outline">Login</Button>
                                </Link>
                                <Link href="/register">
                                    <Button>Get Started</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="py-20">
                    <div className="container mx-auto px-4 text-center">
                        <h1 className="text-5xl font-bold text-gray-900 mb-6">
                            Find Your Perfect
                            <span className="text-blue-600"> Villa & Homestay</span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                            Discover amazing whole property rentals across Indonesia. 
                            From luxury villas in Bali to heritage houses in Yogyakarta.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/properties">
                                <Button size="lg" className="min-w-[200px]">
                                    Browse Properties
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="/dashboard">
                                <Button variant="outline" size="lg" className="min-w-[200px]">
                                    Owner Dashboard
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-16 bg-slate-50">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-12">Why Choose PropertyMS?</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            <Card>
                                <CardHeader>
                                    <Building2 className="h-10 w-10 text-blue-600 mb-2" />
                                    <CardTitle>Whole Property Rentals</CardTitle>
                                    <CardDescription>
                                        Rent entire villas, houses, and homestays with complete privacy
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <Users className="h-10 w-10 text-green-600 mb-2" />
                                    <CardTitle>Guest Management</CardTitle>
                                    <CardDescription>
                                        Advanced guest breakdown tracking and relationship management
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CreditCard className="h-10 w-10 text-purple-600 mb-2" />
                                    <CardTitle>Flexible DP Options</CardTitle>
                                    <CardDescription>
                                        Choose from 30%, 50%, or 70% down payment options
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Featured Properties */}
                {featuredProperties.length > 0 && (
                    <section className="py-16">
                        <div className="container mx-auto px-4">
                            <div className="flex items-center justify-between mb-12">
                                <h2 className="text-3xl font-bold">Featured Properties</h2>
                                <Link href="/properties">
                                    <Button variant="outline">
                                        View All
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {featuredProperties.slice(0, 6).map((property) => (
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
                                            {property.is_featured && (
                                                <Badge className="absolute top-2 left-2">
                                                    <Star className="h-3 w-3 mr-1" />
                                                    Featured
                                                </Badge>
                                            )}
                                        </div>
                                        <CardHeader>
                                            <CardTitle className="text-lg">{property.name}</CardTitle>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <MapPin className="h-4 w-4 mr-1" />
                                                {property.address}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                                {property.description}
                                            </p>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                    <span>{property.bedroom_count} bed</span>
                                                    <span>{property.bathroom_count} bath</span>
                                                    <span>{property.capacity}-{property.capacity_max} guests</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-2xl font-bold text-blue-600">
                                                        {property.formatted_base_rate}
                                                    </span>
                                                    <span className="text-sm text-gray-600">/night</span>
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
                        <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
                        <p className="text-xl mb-8 opacity-90">
                            Join thousands of travelers who trust PropertyMS for their accommodation needs
                        </p>
                        <Link href="/properties">
                            <Button size="lg" variant="secondary">
                                Explore Properties Now
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-gray-900 text-white py-12">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-4 gap-8">
                            <div>
                                <div className="flex items-center space-x-2 mb-4">
                                    <Building2 className="h-6 w-6" />
                                    <span className="text-lg font-bold">PropertyMS</span>
                                </div>
                                <p className="text-gray-400 text-sm">
                                    The leading platform for whole property rentals in Indonesia.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">Properties</h4>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li><Link href="/properties" className="hover:text-white">Browse All</Link></li>
                                    <li><Link href="/properties?featured=1" className="hover:text-white">Featured</Link></li>
                                    <li><Link href="/properties?sort=price_low" className="hover:text-white">Budget Friendly</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">Support</h4>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                                    <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
                                    <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">For Owners</h4>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li><Link href="/dashboard" className="hover:text-white">Owner Dashboard</Link></li>
                                    <li><Link href="/register" className="hover:text-white">List Your Property</Link></li>
                                    <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                                </ul>
                            </div>
                        </div>
                        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
                            <p>&copy; 2025 PropertyMS. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
