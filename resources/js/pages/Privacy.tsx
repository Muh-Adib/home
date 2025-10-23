import React from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, Lock, Database, UserCheck, FileText } from 'lucide-react';

export default function Privacy() {
    return (
        <GuestLayout>
            <Head title="Kebijakan Privasi - Homsjogja" />
            
            <div className="min-h-screen bg-brand-background">
                <div className="max-w-4xl mx-auto p-4 md:p-6">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-brand-primary-20 rounded-full">
                                <Shield className="h-8 w-8 text-brand-primary" />
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            Kebijakan Privasi
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Kami menghormati privasi Anda dan berkomitmen melindungi data pribadi Anda
                        </p>
                        <Badge className="mt-4 bg-brand-accent-20 text-brand-accent">
                            Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}
                        </Badge>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {/* Pengumpulan Data */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Database className="h-5 w-5 text-brand-primary" />
                                    Informasi yang Kami Kumpulkan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Data Pribadi</h4>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                        <li>Nama lengkap dan informasi kontak</li>
                                        <li>Alamat email dan nomor telepon</li>
                                        <li>Informasi identitas (KTP, Passport)</li>
                                        <li>Data pembayaran (diamankan dengan enkripsi)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Data Penggunaan</h4>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                        <li>Riwayat pemesanan dan preferensi</li>
                                        <li>Data lokasi (dengan izin Anda)</li>
                                        <li>Informasi perangkat dan browser</li>
                                        <li>Cookies dan teknologi serupa</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Penggunaan Data */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Eye className="h-5 w-5 text-brand-primary" />
                                    Bagaimana Kami Menggunakan Data Anda
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-foreground">Layanan Utama</h4>
                                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                            <li>Memproses pemesanan homestay</li>
                                            <li>Mengelola akun pengguna</li>
                                            <li>Memberikan dukungan pelanggan</li>
                                            <li>Mengirim konfirmasi dan notifikasi</li>
                                        </ul>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-foreground">Peningkatan Layanan</h4>
                                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                            <li>Menganalisis preferensi pengguna</li>
                                            <li>Mengembangkan fitur baru</li>
                                            <li>Meningkatkan keamanan platform</li>
                                            <li>Personalisasi pengalaman pengguna</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Keamanan Data */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Lock className="h-5 w-5 text-brand-primary" />
                                    Keamanan Data
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-brand-primary-20 rounded-lg">
                                        <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Lock className="h-6 w-6 text-white" />
                                        </div>
                                        <h4 className="font-semibold text-foreground mb-2">Enkripsi SSL</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Semua data dikirim melalui koneksi terenkripsi SSL/TLS
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-brand-secondary-20 rounded-lg">
                                        <div className="w-12 h-12 bg-brand-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Database className="h-6 w-6 text-white" />
                                        </div>
                                        <h4 className="font-semibold text-foreground mb-2">Database Aman</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Data disimpan di server dengan keamanan tingkat enterprise
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-brand-accent-20 rounded-lg">
                                        <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-3">
                                            <UserCheck className="h-6 w-6 text-white" />
                                        </div>
                                        <h4 className="font-semibold text-foreground mb-2">Akses Terbatas</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Hanya personel yang berwenang yang dapat mengakses data
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Hak Pengguna */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <UserCheck className="h-5 w-5 text-brand-primary" />
                                    Hak Anda
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-3">Akses dan Kontrol</h4>
                                        <ul className="space-y-2 text-muted-foreground">
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Mengakses data pribadi Anda</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Memperbarui informasi yang tidak akurat</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Menghapus akun dan data terkait</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-3">Privasi dan Keamanan</h4>
                                        <ul className="space-y-2 text-muted-foreground">
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-secondary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Mengontrol preferensi komunikasi</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-secondary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Menolak pemrosesan data tertentu</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-secondary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Melaporkan masalah keamanan</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Kontak */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <FileText className="h-5 w-5 text-brand-primary" />
                                    Hubungi Kami
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-brand-primary-20 p-6 rounded-lg">
                                    <h4 className="font-semibold text-foreground mb-4">Pertanyaan tentang Privasi?</h4>
                                    <p className="text-muted-foreground mb-4">
                                        Jika Anda memiliki pertanyaan tentang kebijakan privasi ini atau ingin menggunakan hak Anda, 
                                        silakan hubungi tim kami.
                                    </p>
                                    <div className="space-y-2">
                                        <p className="text-sm">
                                            <span className="font-medium text-foreground">Email:</span> 
                                            <span className="text-brand-primary ml-2">privacy@homsjogja.com</span>
                                        </p>
                                        <p className="text-sm">
                                            <span className="font-medium text-foreground">Telepon:</span> 
                                            <span className="text-brand-primary ml-2">+62 274 123 456</span>
                                        </p>
                                        <p className="text-sm">
                                            <span className="font-medium text-foreground">Alamat:</span> 
                                            <span className="text-muted-foreground ml-2">
                                                Jl. Malioboro No. 123, Yogyakarta 55100
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
