import React from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Scale, Users, CreditCard, Home, Shield } from 'lucide-react';

export default function Terms() {
    return (
        <GuestLayout>
            <Head title="Ketentuan Layanan - Homsjogja" />
            
            <div className="min-h-screen bg-brand-background">
                <div className="max-w-4xl mx-auto p-4 md:p-6">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-brand-secondary-20 rounded-full">
                                <Scale className="h-8 w-8 text-brand-secondary" />
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            Ketentuan Layanan
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Syarat dan ketentuan penggunaan platform Homsjogja
                        </p>
                        <Badge className="mt-4 bg-brand-accent-20 text-brand-accent">
                            Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}
                        </Badge>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {/* Penerimaan Ketentuan */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <FileText className="h-5 w-5 text-brand-primary" />
                                    Penerimaan Ketentuan
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-4">
                                    Dengan menggunakan platform Homsjogja, Anda menyetujui untuk terikat oleh ketentuan 
                                    layanan ini. Jika Anda tidak menyetujui ketentuan ini, harap tidak menggunakan layanan kami.
                                </p>
                                <div className="bg-brand-primary-20 p-4 rounded-lg">
                                    <h4 className="font-semibold text-foreground mb-2">Penting</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Ketentuan ini dapat berubah sewaktu-waktu. Perubahan akan diberitahukan melalui 
                                        platform atau email. Penggunaan berkelanjutan setelah perubahan dianggap sebagai 
                                        persetujuan terhadap ketentuan baru.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Definisi Layanan */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Home className="h-5 w-5 text-brand-primary" />
                                    Definisi Layanan
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-2">Platform Homsjogja</h4>
                                        <p className="text-muted-foreground">
                                            Platform online yang memfasilitasi pemesanan homestay, villa, dan akomodasi 
                                            lainnya di Yogyakarta dan sekitarnya.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-2">Layanan yang Disediakan</h4>
                                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                            <li>Pencarian dan pemesanan akomodasi</li>
                                            <li>Manajemen pembayaran online</li>
                                            <li>Dukungan pelanggan 24/7</li>
                                            <li>Informasi destinasi wisata</li>
                                            <li>Sistem review dan rating</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Kewajiban Pengguna */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Users className="h-5 w-5 text-brand-primary" />
                                    Kewajiban Pengguna
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-3">Informasi Akurat</h4>
                                        <ul className="space-y-2 text-muted-foreground">
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Memberikan informasi yang benar dan akurat</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Memperbarui data jika ada perubahan</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Menggunakan akun pribadi sendiri</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-3">Perilaku yang Bertanggung Jawab</h4>
                                        <ul className="space-y-2 text-muted-foreground">
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-secondary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Menghormati properti dan pemilik</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-secondary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Mematuhi aturan properti</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-brand-secondary rounded-full mt-2 flex-shrink-0"></div>
                                                <span>Tidak melakukan aktivitas ilegal</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pembayaran dan Pembatalan */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <CreditCard className="h-5 w-5 text-brand-primary" />
                                    Pembayaran dan Pembatalan
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-2">Metode Pembayaran</h4>
                                        <p className="text-muted-foreground mb-3">
                                            Kami menerima berbagai metode pembayaran yang aman dan terpercaya.
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="p-3 bg-brand-primary-20 rounded-lg text-center">
                                                <div className="text-sm font-medium text-brand-primary">Bank Transfer</div>
                                            </div>
                                            <div className="p-3 bg-brand-secondary-20 rounded-lg text-center">
                                                <div className="text-sm font-medium text-brand-secondary">E-Wallet</div>
                                            </div>
                                            <div className="p-3 bg-brand-accent-20 rounded-lg text-center">
                                                <div className="text-sm font-medium text-brand-accent">Credit Card</div>
                                            </div>
                                            <div className="p-3 bg-brand-primary-20 rounded-lg text-center">
                                                <div className="text-sm font-medium text-brand-primary">QRIS</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-2">Kebijakan Pembatalan</h4>
                                        <div className="bg-brand-accent-20 p-4 rounded-lg">
                                            <ul className="space-y-2 text-sm text-muted-foreground">
                                                <li>• Pembatalan gratis hingga 24 jam sebelum check-in</li>
                                                <li>• Pembatalan 12-24 jam: biaya 50% dari total</li>
                                                <li>• Pembatalan kurang dari 12 jam: tidak dapat dibatalkan</li>
                                                <li>• Refund akan diproses dalam 3-5 hari kerja</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Batasan Tanggung Jawab */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Shield className="h-5 w-5 text-brand-primary" />
                                    Batasan Tanggung Jawab
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="bg-brand-secondary-20 p-4 rounded-lg">
                                        <h4 className="font-semibold text-foreground mb-2">Disclaimer</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Homsjogja bertindak sebagai perantara antara tamu dan pemilik properti. 
                                            Kami tidak bertanggung jawab atas kondisi fisik properti, layanan pemilik, 
                                            atau kejadian di luar kendali kami.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-2">Tanggung Jawab Pengguna</h4>
                                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                            <li>Memeriksa kondisi properti saat check-in</li>
                                            <li>Melaporkan masalah kepada pemilik properti</li>
                                            <li>Mematuhi aturan dan regulasi setempat</li>
                                            <li>Mengasuransikan barang berharga pribadi</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Kontak dan Sengketa */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <FileText className="h-5 w-5 text-brand-primary" />
                                    Penyelesaian Sengketa
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-brand-primary-20 p-6 rounded-lg">
                                    <h4 className="font-semibold text-foreground mb-4">Penyelesaian Sengketa</h4>
                                    <p className="text-muted-foreground mb-4">
                                        Segala sengketa yang timbul akan diselesaikan melalui mediasi terlebih dahulu. 
                                        Jika mediasi tidak berhasil, sengketa akan diselesaikan di Pengadilan Negeri 
                                        Yogyakarta sesuai hukum Republik Indonesia.
                                    </p>
                                    <div className="space-y-2">
                                        <p className="text-sm">
                                            <span className="font-medium text-foreground">Email:</span> 
                                            <span className="text-brand-primary ml-2">legal@homsjogja.com</span>
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
