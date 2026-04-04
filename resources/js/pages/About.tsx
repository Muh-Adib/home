import React from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Users, Home, Star, MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';

export default function About() {
    return (
        <GuestLayout>
            <SeoHead />
            <SchemaOrg />
            <Head title="Tentang Kami - Homsjogja" />
            
            <div className="min-h-screen bg-brand-background">
                <div className="max-w-6xl mx-auto p-4 md:p-6">
                    {/* Hero Section */}
                    <div className="text-center mb-12">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-brand-primary-20 rounded-full">
                                <Heart className="h-12 w-12 text-brand-primary" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                            Tentang Homsjogja
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Menghubungkan Anda dengan kehangatan dan keramahan Jogja melalui pengalaman menginap yang autentik
                        </p>
                    </div>

                    {/* Story Section */}
                    <div className="grid lg:grid-cols-2 gap-8 mb-12">
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Home className="h-5 w-5 text-brand-primary" />
                                    Cerita Kami
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-muted-foreground">
                                    Homsjogja lahir dari kecintaan kami terhadap Yogyakarta dan keinginan untuk 
                                    menghubungkan wisatawan dengan pengalaman menginap yang autentik. Kami percaya 
                                    bahwa setiap perjalanan dimulai dari tempat menginap yang tepat.
                                </p>
                                <p className="text-muted-foreground">
                                    Sejak 2020, kami telah membantu ribuan tamu menemukan homestay, villa, dan 
                                    akomodasi unik yang mencerminkan kehangatan dan keramahan khas Jogja. 
                                    Setiap properti yang kami tawarkan dipilih dengan cermat untuk memastikan 
                                    pengalaman terbaik bagi tamu kami.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Star className="h-5 w-5 text-brand-accent" />
                                    Misi Kami
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
                                        <p className="text-muted-foreground">
                                            <span className="font-semibold text-foreground">Menghubungkan:</span> 
                                            Menyatukan tamu dengan pemilik properti yang berkualitas
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-brand-secondary rounded-full mt-2 flex-shrink-0"></div>
                                        <p className="text-muted-foreground">
                                            <span className="font-semibold text-foreground">Memfasilitasi:</span> 
                                            Memberikan platform yang mudah dan aman untuk pemesanan
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-brand-accent rounded-full mt-2 flex-shrink-0"></div>
                                        <p className="text-muted-foreground">
                                            <span className="font-semibold text-foreground">Mempromosikan:</span> 
                                            Memperkenalkan keindahan dan budaya Jogja kepada dunia
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                        <Card className="bg-brand-primary-20 border-brand-primary">
                            <CardContent className="text-center p-6">
                                <div className="text-3xl font-bold text-brand-primary mb-2">500+</div>
                                <div className="text-sm text-brand-primary">Properti Terdaftar</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-brand-secondary-20 border-brand-secondary">
                            <CardContent className="text-center p-6">
                                <div className="text-3xl font-bold text-brand-secondary mb-2">10K+</div>
                                <div className="text-sm text-brand-secondary">Tamu Puas</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-brand-accent-20 border-brand-accent">
                            <CardContent className="text-center p-6">
                                <div className="text-3xl font-bold text-brand-accent mb-2">4.8</div>
                                <div className="text-sm text-brand-accent">Rating Rata-rata</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-brand-primary-20 border-brand-primary">
                            <CardContent className="text-center p-6">
                                <div className="text-3xl font-bold text-brand-primary mb-2">24/7</div>
                                <div className="text-sm text-brand-primary">Dukungan Pelanggan</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Values Section */}
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold text-center text-foreground mb-8">Nilai-Nilai Kami</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <Card className="bg-card border-border text-center">
                                <CardContent className="p-6">
                                    <div className="w-16 h-16 bg-brand-primary-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Heart className="h-8 w-8 text-brand-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-3">Keramahan</h3>
                                    <p className="text-muted-foreground">
                                        Kami menghadirkan kehangatan dan keramahan khas Jogja dalam setiap interaksi
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-card border-border text-center">
                                <CardContent className="p-6">
                                    <div className="w-16 h-16 bg-brand-secondary-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Users className="h-8 w-8 text-brand-secondary" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-3">Komunitas</h3>
                                    <p className="text-muted-foreground">
                                        Membangun komunitas yang saling mendukung antara tamu dan pemilik properti
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-card border-border text-center">
                                <CardContent className="p-6">
                                    <div className="w-16 h-16 bg-brand-accent-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Star className="h-8 w-8 text-brand-accent" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-3">Kualitas</h3>
                                    <p className="text-muted-foreground">
                                        Menjaga standar kualitas tinggi dalam setiap layanan yang kami berikan
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Team Section */}
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold text-center text-foreground mb-8">Tim Kami</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <Card className="bg-card border-border text-center">
                                <CardContent className="p-6">
                                    <div className="w-20 h-20 bg-brand-primary-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Users className="h-10 w-10 text-brand-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">Tim Teknologi</h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Mengembangkan platform yang user-friendly dan aman
                                    </p>
                                    <Badge className="bg-brand-primary-20 text-brand-primary">5 Anggota</Badge>
                                </CardContent>
                            </Card>
                            <Card className="bg-card border-border text-center">
                                <CardContent className="p-6">
                                    <div className="w-20 h-20 bg-brand-secondary-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Heart className="h-10 w-10 text-brand-secondary" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">Tim Customer Service</h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Memberikan dukungan terbaik untuk pengalaman tamu
                                    </p>
                                    <Badge className="bg-brand-secondary-20 text-brand-secondary">8 Anggota</Badge>
                                </CardContent>
                            </Card>
                            <Card className="bg-card border-border text-center">
                                <CardContent className="p-6">
                                    <div className="w-20 h-20 bg-brand-accent-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MapPin className="h-10 w-10 text-brand-accent" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">Tim Partnership</h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Membangun jaringan properti berkualitas di Jogja
                                    </p>
                                    <Badge className="bg-brand-accent-20 text-brand-accent">6 Anggota</Badge>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Contact Section */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-center text-2xl text-foreground">Hubungi Kami</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-foreground">Informasi Kontak</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-primary-20 rounded-full flex items-center justify-center">
                                                <Phone className="h-5 w-5 text-brand-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">Telepon</p>
                                                <p className="text-sm text-muted-foreground">+62 274 123 456</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-secondary-20 rounded-full flex items-center justify-center">
                                                <Mail className="h-5 w-5 text-brand-secondary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">Email</p>
                                                <p className="text-sm text-muted-foreground">info@homsjogja.com</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-accent-20 rounded-full flex items-center justify-center">
                                                <MapPin className="h-5 w-5 text-brand-accent" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">Alamat</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Jl. Malioboro No. 123<br />
                                                    Yogyakarta 55100
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-foreground">Media Sosial</h3>
                                    <div className="flex gap-4">
                                        <Button variant="outline" className="flex items-center gap-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white">
                                            <Instagram className="h-4 w-4" />
                                            Instagram
                                        </Button>
                                        <Button variant="outline" className="flex items-center gap-2 border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-white">
                                            <Facebook className="h-4 w-4" />
                                            Facebook
                                        </Button>
                                    </div>
                                    <div className="bg-brand-primary-20 p-4 rounded-lg">
                                        <p className="text-sm text-muted-foreground">
                                            Ikuti kami di media sosial untuk mendapatkan update terbaru tentang 
                                            properti baru, tips wisata Jogja, dan penawaran khusus!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </GuestLayout>
    );
}
