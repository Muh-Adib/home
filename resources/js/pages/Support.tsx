import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    HelpCircle, 
    MessageCircle, 
    Phone, 
    Mail, 
    Clock, 
    CheckCircle, 
    AlertCircle,
    Search,
    FileText,
    Users,
    CreditCard,
    Home,
    Settings
} from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
} from 'lucide-react';

export default function Support() {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const faqCategories = [
        {
            id: 'booking',
            title: 'Pemesanan',
            icon: <Home className="h-5 w-5" />,
            color: 'brand-primary',
            questions: [
                {
                    q: 'Bagaimana cara memesan homestay?',
                    a: 'Anda dapat memesan homestay dengan mudah melalui platform kami. Pilih tanggal, jumlah tamu, dan properti yang diinginkan, lalu ikuti langkah-langkah pembayaran.'
                },
                {
                    q: 'Apakah ada biaya tambahan?',
                    a: 'Semua biaya sudah termasuk dalam harga yang ditampilkan. Tidak ada biaya tersembunyi atau biaya tambahan yang akan dikenakan.'
                },
                {
                    q: 'Bagaimana cara membatalkan pemesanan?',
                    a: 'Anda dapat membatalkan pemesanan melalui akun Anda atau menghubungi customer service. Kebijakan pembatalan tergantung pada properti yang dipilih.'
                }
            ]
        },
        {
            id: 'payment',
            title: 'Pembayaran',
            icon: <CreditCard className="h-5 w-5" />,
            color: 'brand-secondary',
            questions: [
                {
                    q: 'Metode pembayaran apa saja yang tersedia?',
                    a: 'Kami menerima bank transfer, e-wallet (GoPay, OVO, DANA), kartu kredit, dan QRIS untuk kemudahan pembayaran Anda.'
                },
                {
                    q: 'Kapan pembayaran akan diproses?',
                    a: 'Pembayaran akan diproses segera setelah Anda menyelesaikan pemesanan. Konfirmasi akan dikirim melalui email dan WhatsApp.'
                },
                {
                    q: 'Bagaimana cara mendapatkan refund?',
                    a: 'Refund akan diproses sesuai dengan kebijakan pembatalan. Dana akan dikembalikan ke rekening asal dalam 3-5 hari kerja.'
                }
            ]
        },
        {
            id: 'account',
            title: 'Akun',
            icon: <Users className="h-5 w-5" />,
            color: 'brand-accent',
            questions: [
                {
                    q: 'Bagaimana cara mendaftar akun?',
                    a: 'Klik tombol "Daftar" di halaman utama, isi informasi yang diperlukan, dan verifikasi email Anda untuk mengaktifkan akun.'
                },
                {
                    q: 'Lupa password, bagaimana cara reset?',
                    a: 'Gunakan fitur "Lupa Password" di halaman login. Kami akan mengirimkan link reset password ke email Anda.'
                },
                {
                    q: 'Bagaimana cara mengubah profil?',
                    a: 'Login ke akun Anda, klik "Profil", dan edit informasi yang ingin diubah. Jangan lupa untuk menyimpan perubahan.'
                }
            ]
        }
    ];

    const supportOptions = [
        {
            title: 'Live Chat',
            description: 'Dapatkan bantuan langsung dari tim kami',
            icon: <MessageCircle className="h-6 w-6" />,
            color: 'brand-primary',
            action: 'Mulai Chat'
        },
        {
            title: 'Email Support',
            description: 'Kirim pertanyaan detail melalui email',
            icon: <Mail className="h-6 w-6" />,
            color: 'brand-secondary',
            action: 'Kirim Email'
        },
        {
            title: 'Telepon',
            description: 'Hubungi kami untuk bantuan langsung',
            icon: <Phone className="h-6 w-6" />,
            color: 'brand-accent',
            action: 'Hubungi Sekarang'
        }
    ];

    const getColorClasses = (color: string) => {
        switch (color) {
            case 'brand-primary':
                return 'bg-brand-primary-20 text-brand-primary border-brand-primary';
            case 'brand-secondary':
                return 'bg-brand-secondary-20 text-brand-secondary border-brand-secondary';
            case 'brand-accent':
                return 'bg-brand-accent-20 text-brand-accent border-brand-accent';
            default:
                return 'bg-brand-primary-20 text-brand-primary border-brand-primary';
        }
    };

    return (
        <GuestLayout>
            <SeoHead />
            <SchemaOrg />
            <Head title="Dukungan - Homsjogja" />
            
            <div className="min-h-screen bg-brand-background">
                <div className="max-w-6xl mx-auto p-4 md:p-6">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-brand-primary-20 rounded-full">
                                <HelpCircle className="h-12 w-12 text-brand-primary" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                            Pusat Bantuan
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Kami siap membantu Anda dengan segala pertanyaan dan kebutuhan terkait layanan Homsjogja
                        </p>
                    </div>

                    {/* Search Bar */}
                    <Card className="bg-card border-border mb-8">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari bantuan atau pertanyaan..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Button className="bg-brand-primary hover:bg-brand-primary-dark text-white">
                                    <Search className="h-4 w-4 mr-2" />
                                    Cari
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Support Options */}
                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        {supportOptions.map((option, index) => (
                            <Card key={index} className="bg-card border-border hover:shadow-lg transition-shadow">
                                <CardContent className="p-6 text-center">
                                    <div className={`w-16 h-16 ${getColorClasses(option.color).split(' ')[0]} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                        {option.icon}
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">{option.title}</h3>
                                    <p className="text-muted-foreground mb-4">{option.description}</p>
                                    <Button 
                                        className={`w-full ${getColorClasses(option.color)}`}
                                        variant="outline"
                                    >
                                        {option.action}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* FAQ Section */}
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold text-center text-foreground mb-8">Pertanyaan yang Sering Diajukan</h2>
                        
                        {/* Category Filter */}
                        <div className="flex flex-wrap gap-2 justify-center mb-8">
                            <Button
                                variant={selectedCategory === '' ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory('')}
                                className={selectedCategory === '' ? 'bg-brand-primary text-white' : 'border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white'}
                            >
                                Semua Kategori
                            </Button>
                            {faqCategories.map((category) => (
                                <Button
                                    key={category.id}
                                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={selectedCategory === category.id ? 'bg-brand-primary text-white' : 'border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white'}
                                >
                                    {category.icon}
                                    <span className="ml-2">{category.title}</span>
                                </Button>
                            ))}
                        </div>

                        {/* FAQ Content */}
                        <div className="space-y-6">
                            {faqCategories
                                .filter(category => selectedCategory === '' || selectedCategory === category.id)
                                .map((category) => (
                                <Card key={category.id} className="bg-card border-border">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-foreground">
                                            <div className={`w-8 h-8 ${getColorClasses(category.color).split(' ')[0]} rounded-full flex items-center justify-center`}>
                                                {category.icon}
                                            </div>
                                            {category.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {category.questions.map((faq, index) => (
                                                <div key={index} className="border-l-4 border-brand-primary-20 pl-4">
                                                    <h4 className="font-semibold text-foreground mb-2">{faq.q}</h4>
                                                    <p className="text-muted-foreground">{faq.a}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Contact Form */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-foreground">
                                <FileText className="h-5 w-5 text-brand-primary" />
                                Kirim Pertanyaan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Nama Lengkap</label>
                                        <Input placeholder="Masukkan nama lengkap" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                                        <Input type="email" placeholder="Masukkan email" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Kategori Pertanyaan</label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="booking">Pemesanan</SelectItem>
                                            <SelectItem value="payment">Pembayaran</SelectItem>
                                            <SelectItem value="account">Akun</SelectItem>
                                            <SelectItem value="technical">Teknis</SelectItem>
                                            <SelectItem value="other">Lainnya</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Pertanyaan</label>
                                    <Textarea 
                                        placeholder="Jelaskan pertanyaan atau masalah Anda secara detail..."
                                        rows={4}
                                    />
                                </div>
                                <Button className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white">
                                    <Mail className="h-4 w-4 mr-2" />
                                    Kirim Pertanyaan
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <div className="mt-12 text-center">
                        <div className="bg-brand-primary-20 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Butuh Bantuan Lebih Lanjut?</h3>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-brand-primary" />
                                    <span className="text-sm text-muted-foreground">24/7 Support</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-brand-primary" />
                                    <span className="text-sm text-muted-foreground">+62 274 123 456</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-brand-primary" />
                                    <span className="text-sm text-muted-foreground">support@homsjogja.com</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
