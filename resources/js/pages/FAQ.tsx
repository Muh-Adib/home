import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    HelpCircle, 
    Search,
    ChevronDown,
    Mail,
    Phone,
    MessageCircle
} from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';

export default function FAQ() {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFAQ, setExpandedFAQ] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');

    const faqData = [
        {
            id: 'pemesanan',
            title: 'Pemesanan & Alur Reservasi',
            color: 'bg-blue-100',
            questions: [
                {
                    q: 'Bagaimana alur pemesanan di Homs Jogja?',
                    a: 'Alur pemesanan adalah: (1) Kunjungi halaman property dan pilih properti yang diinginkan. (2) Pilih unit yang tersedia dan tentukan tanggal menginap. (3) Isi data detail tamu pada formulir booking (nama, nomor WhatsApp, email, dsb.). (4) Tekan tombol Submit Booking untuk mengirim permintaan booking. (5) Tunggu admin menghubungi Anda melalui WhatsApp menggunakan nomor yang Anda cantumkan. (6) Setelah admin mengonfirmasi, lakukan pembayaran. (7) Setelah pembayaran dikonfirmasi, booking Anda menjadi terkonfirmasi dan akan tercatat di Dashboard Anda.'
                },
                {
                    q: 'Apakah booking langsung otomatis terkonfirmasi setelah submit?',
                    a: 'Tidak. Submit booking mengirim permintaan. Admin akan memeriksa ketersediaan dan kemudian menghubungi untuk konfirmasi dan instruksi pembayaran.'
                },
                {
                    q: 'Berapa lama menunggu konfirmasi dari admin?',
                    a: 'Waktu konfirmasi dapat bervariasi tergantung jam operasional. Jika belum mendapat balasan dalam waktu wajar, silakan hubungi kami via support atau WhatsApp ke 08112500082.'
                }
            ]
        },
        {
            id: 'login',
            title: 'Login, Registrasi & Dashboard',
            color: 'bg-green-100',
            questions: [
                {
                    q: 'Apakah saya harus membuat akun untuk memesan?',
                    a: 'Tidak wajib. Sistem Homs Jogja mendukung booking tanpa login untuk pelanggan baru agar proses lebih cepat.'
                },
                {
                    q: 'Apa keuntungan membuat akun?',
                    a: 'Dengan akun Anda bisa mengecek riwayat booking, status booking lebih cepat via Dashboard, dan tidak perlu mengisi data berulang saat melakukan booking berikutnya.'
                },
                {
                    q: 'Saya pernah booking tetapi tidak bisa masuk — apa yang harus dilakukan?',
                    a: 'Silakan gunakan fitur forgot-password untuk mereset kata sandi. Jika tetap tidak berhasil, hubungi support kami.'
                },
                {
                    q: 'Bagaimana cara mengecek status booking saya?',
                    a: 'Login ke Dashboard (menu Dashboard setelah login) untuk melihat status booking, detail pembayaran, dan bukti konfirmasi.'
                }
            ]
        },
        {
            id: 'pembayaran',
            title: 'Konfirmasi & Pembayaran',
            color: 'bg-purple-100',
            questions: [
                {
                    q: 'Bagaimana cara melakukan pembayaran?',
                    a: 'Setelah admin mengonfirmasi ketersediaan unit, Anda dapat melakukan pembayaran melalui transfer/instruksi pembayaran yang diberikan admin melalui WhatsApp (08112500082) atau pembayaran langsung via website jika opsi pembayaran online tersedia.'
                },
                {
                    q: 'Apa bukti pembayaran yang diterima?',
                    a: 'Bukti transfer (struk bank/screenshot e-wallet) yang dikirimkan ke admin via WhatsApp atau bukti pembayaran otomatis dari website.'
                },
                {
                    q: 'Apa yang harus saya lakukan setelah melakukan pembayaran?',
                    a: 'Kirim bukti pembayaran ke admin via WhatsApp. Admin akan memverifikasi pembayaran dan mengirimkan konfirmasi akhir beserta invoice jika diperlukan.'
                },
                {
                    q: 'Apakah Homs Jogja menyimpan data pembayaran saya?',
                    a: 'Kami menyimpan catatan transaksi yang relevan untuk keperluan konfirmasi booking dan administrasi. Informasi sensitif disimpan sesuai kebijakan privasi kami.'
                }
            ]
        },
        {
            id: 'pembatalan',
            title: 'Pembatalan, Perubahan & Refund',
            color: 'bg-red-100',
            questions: [
                {
                    q: 'Bisakah saya membatalkan booking?',
                    a: 'Permintaan pembatalan harus dikomunikasikan kepada admin. Ketentuan pembatalan, penalti, atau refund akan bergantung pada kebijakan pada saat booking dan jenis kesalahan yang terjadi.'
                },
                {
                    q: 'Apakah ada refund jika saya membatalkan?',
                    a: 'Tidak ada refund untuk kesalahan dari tamu. Jika pembatalan disebabkan oleh kesalahan tamu (mis. salah tanggal, salah pemesanan), maka refund tidak diberikan, kecuali ada kebijakan khusus yang disepakati oleh admin.'
                },
                {
                    q: 'Bagaimana jika saya ingin mengubah tanggal atau unit?',
                    a: 'Perubahan dapat dilakukan dengan menghubungi admin. Perubahan bergantung pada ketersediaan unit dan kebijakan manajemen. Perubahan mendadak dapat dikenai biaya administrasi.'
                }
            ]
        },
        {
            id: 'checkin',
            title: 'Check-in, Check-out & Identitas',
            color: 'bg-yellow-100',
            questions: [
                {
                    q: 'Jam berapa check-in dan check-out?',
                    a: 'Jam check-in dan check-out dapat berbeda per unit. Silakan lihat informasi jam pada halaman unit yang Anda pesan. Untuk permintaan check-in dini atau check-out larut, hubungi admin terlebih dahulu.'
                },
                {
                    q: 'Apakah saya harus membawa identitas saat check-in?',
                    a: 'Ya. Untuk verifikasi keamanan, tamu diminta menunjukkan identitas resmi (KTP, SIM, atau paspor) sesuai kebijakan unit.'
                },
                {
                    q: 'Apa yang terjadi jika tamu datang lebih awal atau pulang terlambat?',
                    a: 'Kedatangan dini atau keterlambatan check-out harus dikomunikasikan ke admin. Bisa dikenai biaya tambahan jika mengganggu jadwal bersih-bersih atau booking berikutnya.'
                }
            ]
        },
        {
            id: 'peraturan',
            title: 'Peraturan Unit & Aturan Menginap',
            color: 'bg-indigo-100',
            questions: [
                {
                    q: 'Apakah aturan menginap sama untuk semua unit?',
                    a: 'Tidak. Setiap unit memiliki peraturan khusus (kapasitas maksimal, larangan membawa hewan, apakah mengizinkan merokok, fasilitas, dsb.). Harap membaca peraturan pada halaman unit sebelum booking.'
                },
                {
                    q: 'Apakah merokok diperbolehkan?',
                    a: 'Merokok hanya diperbolehkan di area yang diberi tanda khusus "Boleh Merokok". Merokok di luar area yang ditentukan akan dikenai denda sesuai kebijakan.'
                },
                {
                    q: 'Bolehkah membawa hewan peliharaan?',
                    a: 'Kebijakan hewan peliharaan berbeda per unit. Silakan baca halaman unit atau tanyakan ke admin sebelum booking.'
                },
                {
                    q: 'Berapa kapasitas maksimal tiap unit?',
                    a: 'Kapasitas maksimal tercantum pada halaman unit. Menambah jumlah tamu tanpa konfirmasi akan dikenai denda.'
                }
            ]
        },
        {
            id: 'layanan',
            title: 'Layanan Tambahan & Permintaan Khusus',
            color: 'bg-cyan-100',
            questions: [
                {
                    q: 'Layanan apa saja yang bisa disediakan?',
                    a: 'Kami dapat membantu layanan tambahan seperti kasur ekstra, layanan bayi, sewa kendaraan, antar-jemput, dan rekomendasi wisata berdasar permintaan. Semua layanan tambahan perlu dikonfirmasi melalui admin.'
                },
                {
                    q: 'Bagaimana cara meminta layanan tambahan?',
                    a: 'Hubungi admin melalui halaman support atau WhatsApp 08112500082. Sertakan detail permintaan dan tanggal layanan.'
                },
                {
                    q: 'Apakah layanan tambahan berbayar?',
                    a: 'Ya. Beberapa layanan tambahan berbayar tergantung jenis layanan dan penyedia layanan. Biaya akan diinformasikan sebelum konfirmasi.'
                }
            ]
        },
        {
            id: 'pelanggaran',
            title: 'Pelanggaran, Denda & Kerusakan',
            color: 'bg-orange-100',
            questions: [
                {
                    q: 'Apa konsekuensi jika melanggar peraturan?',
                    a: 'Pelanggaran terhadap peraturan unit atau rumah (mis. merokok di kamar, membawa tamu tambahan tanpa izin, merusak fasilitas) dapat mengakibatkan denda, pemutusan masa inap, atau tuntutan ganti rugi.'
                },
                {
                    q: 'Bagaimana proses ganti rugi kerusakan?',
                    a: 'Jika terdapat kerusakan yang disebabkan oleh tamu, manajemen akan menilai kerusakan dan meminta penggantian biaya sesuai perbaikan atau nilai penggantian. Bukti dan estimasi biaya akan disampaikan kepada tamu.'
                },
                {
                    q: 'Apa yang terjadi jika menambah tamu tanpa izin?',
                    a: 'Menambah tamu tanpa konfirmasi akan dikenai denda sesuai ketentuan. Dalam kasus ekstrem, manajemen berhak menolak tamu tambahan dan/atau mengakhiri masa inap.'
                }
            ]
        },
        {
            id: 'force-majeure',
            title: 'Force Majeure & Pembatasan Tanggung Jawab',
            color: 'bg-pink-100',
            questions: [
                {
                    q: 'Apa yang terjadi jika ada keadaan di luar kendali (force majeure)?',
                    a: 'Jika terjadi force majeure (bencana alam, kejadian darurat, kebijakan pemerintah yang melarang perjalanan, dsb.), manajemen akan menginformasikan tamu dan menawarkan solusi seperti reschedule, voucher, atau opsi lain sesuai kebijakan manajemen.'
                },
                {
                    q: 'Apakah Homs Jogja bertanggung jawab atas barang hilang di properti?',
                    a: 'Homs Jogja tidak bertanggung jawab atas kehilangan barang pribadi akibat kelalaian tamu. Tamu dianjurkan menjaga barang berharga dan menggunakan fasilitas penyimpanan jika tersedia.'
                }
            ]
        }
    ];

    const filteredFAQ = selectedCategory === 'all' 
        ? faqData 
        : faqData.filter(cat => cat.id === selectedCategory);

    const searchedFAQ = filteredFAQ.map(category => ({
        ...category,
        questions: category.questions.filter(q => 
            q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.questions.length > 0);

    const toggleFAQ = (index) => {
        setExpandedFAQ(expandedFAQ === index ? null : index);
    };

    return (
        <GuestLayout>
            <SeoHead />
            <SchemaOrg />
            <Head title="FAQ - Homsjogja" />
            
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
                <div className="max-w-6xl mx-auto p-4 md:p-8">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-blue-100 rounded-full">
                                <HelpCircle className="h-12 w-12 text-blue-600" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                            Pertanyaan yang Sering Diajukan
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Temukan jawaban atas pertanyaan umum tentang pemesanan, pembayaran, dan layanan kami
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-8">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input
                                    placeholder="Cari pertanyaan atau jawaban..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 py-3 text-base"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="mb-8 flex flex-wrap gap-2">
                        <Button
                            variant={selectedCategory === 'all' ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory('all')}
                            className={selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'border-blue-600 text-blue-600'}
                        >
                            Semua Kategori
                        </Button>
                        {faqData.map((category) => (
                            <Button
                                key={category.id}
                                variant={selectedCategory === category.id ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(category.id)}
                                className={selectedCategory === category.id ? 'bg-blue-600 text-white' : 'border-slate-300 text-slate-700 hover:border-blue-600'}
                            >
                                {category.title.split(' ')[0]}
                            </Button>
                        ))}
                    </div>

                    {/* FAQ Content */}
                    <div className="space-y-6">
                        {searchedFAQ.length > 0 ? (
                            searchedFAQ.map((category) => (
                                <Card key={category.id} className="border-slate-200">
                                    <CardHeader className={`${category.color} rounded-t-lg`}>
                                        <CardTitle className="text-slate-900">
                                            {category.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-200">
                                            {category.questions.map((faq, idx) => {
                                                const faqId = `${category.id}-${idx}`;
                                                const isExpanded = expandedFAQ === faqId;
                                                
                                                return (
                                                    <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                                                        <button
                                                            onClick={() => toggleFAQ(faqId)}
                                                            className="w-full flex items-start justify-between gap-4 text-left"
                                                        >
                                                            <h4 className="font-semibold text-slate-900 flex-1 text-base">
                                                                {faq.q}
                                                            </h4>
                                                            <ChevronDown 
                                                                className={`h-5 w-5 text-slate-500 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                            />
                                                        </button>
                                                        {isExpanded && (
                                                            <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                                                                {faq.a}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Card className="border-slate-200">
                                <CardContent className="p-12 text-center">
                                    <p className="text-slate-500 text-lg">
                                        Tidak ada pertanyaan yang cocok dengan pencarian "{searchQuery}"
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Contact Section */}
                    <div className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-lg border border-blue-200">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
                            Belum menemukan jawaban yang Anda cari?
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <a href="https://wa.me/628112500082" className="flex flex-col items-center text-center p-4 hover:bg-white rounded-lg transition-colors">
                                <MessageCircle className="h-8 w-8 text-blue-600 mb-2" />
                                <h3 className="font-semibold text-slate-900 mb-1">WhatsApp</h3>
                                <p className="text-sm text-slate-600">08112500082</p>
                            </a>
                            <a href="mailto:support@homsjogja.com" className="flex flex-col items-center text-center p-4 hover:bg-white rounded-lg transition-colors">
                                <Mail className="h-8 w-8 text-blue-600 mb-2" />
                                <h3 className="font-semibold text-slate-900 mb-1">Email</h3>
                                <p className="text-sm text-slate-600">support@homsjogja.com</p>
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </GuestLayout>
    );
}