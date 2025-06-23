import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Language types
export type Language = 'id' | 'en';

// Translation interface
interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

// Translation store interface
interface LanguageStore {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Translations data
const translations: Translations = {
  // Navigation
  'nav.login': {
    id: 'Masuk',
    en: 'Login'
  },
  'nav.register': {
    id: 'Daftar',
    en: 'Register'
  },
  'nav.dashboard': {
    id: 'Dashboard',
    en: 'Dashboard'
  },
  'nav.myBookings': {
    id: 'Booking Saya',
    en: 'My Bookings'
  },
  'nav.properties': {
    id: 'Properti',
    en: 'Properties'
  },
  'nav.aboutUs': {
    id: 'Tentang Kami',
    en: 'About Us'
  },
  'nav.contact': {
    id: 'Kontak',
    en: 'Contact'
  },
  'nav.support': {
    id: 'Dukungan',
    en: 'Support'
  },

  // Hero Section
  'hero.discover': {
    id: 'Temukan Properti Menakjubkan',
    en: 'Discover Amazing Properties'
  },
  'hero.title': {
    id: 'Temukan Tempat Menginap Sempurna Anda',
    en: 'Find Your Perfect Stay'
  },
  'hero.subtitle': {
    id: 'Hari Ini',
    en: 'Today'
  },
  'hero.description': {
    id: 'Rasakan kemewahan dan kenyamanan dengan koleksi properti premium yang telah kami kurasi dengan cermat. Dari villa yang nyaman hingga rumah tepi pantai yang menakjubkan, kami memiliki akomodasi sempurna untuk petualangan Anda berikutnya.',
    en: 'Experience luxury and comfort with our carefully curated selection of premium properties. From cozy villas to stunning beachfront homes, we have the perfect accommodation for your next adventure.'
  },

  // Search Form
  'search.checkin': {
    id: 'Check-in',
    en: 'Check-in'
  },
  'search.checkout': {
    id: 'Check-out',
    en: 'Check-out'
  },
  'search.guests': {
    id: 'Tamu',
    en: 'Guests'
  },
  'search.button': {
    id: 'Cari Properti',
    en: 'Search Properties'
  },
  'search.guest': {
    id: 'tamu',
    en: 'guest'
  },
  'search.guests_plural': {
    id: 'tamu',
    en: 'guests'
  },

  // Stats Section
  'stats.properties': {
    id: 'Properti',
    en: 'Properties'
  },
  'stats.guests': {
    id: 'Tamu Puas',
    en: 'Happy Guests'
  },
  'stats.satisfaction': {
    id: 'Kepuasan',
    en: 'Satisfaction'
  },
  'stats.support': {
    id: 'Dukungan',
    en: 'Support'
  },

  // Features Section
  'features.title': {
    id: 'Mengapa Memilih Kami',
    en: 'Why Choose Us'
  },
  'features.description': {
    id: 'Kami menyediakan layanan luar biasa dan pengalaman tak terlupakan untuk setiap tamu',
    en: 'We provide exceptional service and unforgettable experiences for every guest'
  },
  'features.secure.title': {
    id: 'Booking Aman',
    en: 'Secure Booking'
  },
  'features.secure.description': {
    id: 'Proses pembayaran yang aman dan terpercaya dengan konfirmasi instan',
    en: 'Safe and secure payment processing with instant confirmation'
  },
  'features.support.title': {
    id: 'Dukungan 24/7',
    en: '24/7 Support'
  },
  'features.support.description': {
    id: 'Dukungan pelanggan sepanjang waktu untuk semua kebutuhan Anda',
    en: 'Round-the-clock customer support for all your needs'
  },
  'features.quality.title': {
    id: 'Kualitas Premium',
    en: 'Premium Quality'
  },
  'features.quality.description': {
    id: 'Properti yang dipilih dengan cermat dengan fasilitas premium',
    en: 'Carefully selected properties with premium amenities'
  },

  // Properties Section
  'properties.title': {
    id: 'Properti Unggulan',
    en: 'Featured Properties'
  },
  'properties.description': {
    id: 'Temukan koleksi properti luar biasa pilihan kami',
    en: 'Discover our handpicked selection of exceptional properties'
  },
  'properties.featured': {
    id: 'Unggulan',
    en: 'Featured'
  },
  'properties.viewDetails': {
    id: 'Lihat Detail',
    en: 'View Details'
  },
  'properties.viewAll': {
    id: 'Lihat Semua Properti',
    en: 'View All Properties'
  },
  'properties.night': {
    id: '/malam',
    en: '/night'
  },
  'properties.beds': {
    id: 'tempat tidur',
    en: 'beds'
  },
  'properties.noProperties': {
    id: 'Tidak Ada Properti Tersedia',
    en: 'No Properties Available'
  },
  'properties.checkLater': {
    id: 'Silakan periksa kembali nanti untuk properti unggulan.',
    en: 'Please check back later for featured properties.'
  },

  // Footer
  'footer.description': {
    id: 'Mitra terpercaya Anda untuk manajemen properti dan pengalaman booking yang luar biasa.',
    en: 'Your trusted partner for exceptional property management and booking experiences.'
  },
  'footer.quickLinks': {
    id: 'Tautan Cepat',
    en: 'Quick Links'
  },
  'footer.support': {
    id: 'Dukungan',
    en: 'Support'
  },
  'footer.contact': {
    id: 'Kontak',
    en: 'Contact'
  },
  'footer.helpCenter': {
    id: 'Pusat Bantuan',
    en: 'Help Center'
  },
  'footer.bookingGuide': {
    id: 'Panduan Booking',
    en: 'Booking Guide'
  },
  'footer.cancellationPolicy': {
    id: 'Kebijakan Pembatalan',
    en: 'Cancellation Policy'
  },
  'footer.privacyPolicy': {
    id: 'Kebijakan Privasi',
    en: 'Privacy Policy'
  },
  'footer.email': {
    id: 'Email: info@pms.com',
    en: 'Email: info@pms.com'
  },
  'footer.phone': {
    id: 'Telepon: +62 123 456 789',
    en: 'Phone: +62 123 456 789'
  },
  'footer.address': {
    id: 'Alamat: Jakarta, Indonesia',
    en: 'Address: Jakarta, Indonesia'
  },
  'footer.copyright': {
    id: '© 2025 Property Management System. Semua hak dilindungi.',
    en: '© 2025 Property Management System. All rights reserved.'
  },

  // Common
  'common.loading': {
    id: 'Memuat...',
    en: 'Loading...'
  },
  'common.error': {
    id: 'Terjadi kesalahan',
    en: 'An error occurred'
  },
  'common.success': {
    id: 'Berhasil',
    en: 'Success'
  },
  'common.cancel': {
    id: 'Batal',
    en: 'Cancel'
  },
  'common.save': {
    id: 'Simpan',
    en: 'Save'
  },
  'common.edit': {
    id: 'Edit',
    en: 'Edit'
  },
  'common.delete': {
    id: 'Hapus',
    en: 'Delete'
  },
  'common.view': {
    id: 'Lihat',
    en: 'View'
  },

  // Dashboard
  'dashboard.title': {
    id: 'Dashboard',
    en: 'Dashboard'
  },
  'dashboard.welcome': {
    id: 'Selamat datang',
    en: 'Welcome'
  },
  'dashboard.overview': {
    id: 'Ringkasan',
    en: 'Overview'
  },
  'dashboard.stats.totalProperties': {
    id: 'Total Properti',
    en: 'Total Properties'
  },
  'dashboard.stats.activeProperties': {
    id: 'Properti Aktif',
    en: 'Active Properties'
  },
  'dashboard.stats.monthlyRevenue': {
    id: 'Pendapatan Bulanan',
    en: 'Monthly Revenue'
  },
  'dashboard.stats.totalBookings': {
    id: 'Total Pemesanan',
    en: 'Total Bookings'
  },
  'dashboard.stats.occupancyRate': {
    id: 'Tingkat Hunian',
    en: 'Occupancy Rate'
  },
  'dashboard.stats.currentGuests': {
    id: 'Tamu Saat Ini',
    en: 'Current Guests'
  },
  'dashboard.stats.pendingActions': {
    id: 'Aksi Tertunda',
    en: 'Pending Actions'
  },
  'dashboard.stats.upcomingArrivals': {
    id: 'Kedatangan Mendatang',
    en: 'Upcoming Arrivals'
  },
  'dashboard.sections.quickActions': {
    id: 'Aksi Cepat',
    en: 'Quick Actions'
  },
  'dashboard.sections.recentActivity': {
    id: 'Aktivitas Terbaru',
    en: 'Recent Activity'
  },
  'dashboard.sections.todaysAgenda': {
    id: 'Agenda Hari Ini',
    en: "Today's Agenda"
  },
  'dashboard.sections.propertyPerformance': {
    id: 'Performa Properti',
    en: 'Property Performance'
  },
  'dashboard.sections.revenueChart': {
    id: 'Grafik Pendapatan',
    en: 'Revenue Chart'
  },
  'dashboard.sections.bookingTrends': {
    id: 'Tren Pemesanan',
    en: 'Booking Trends'
  },
  'dashboard.actions.newBooking': {
    id: 'Pemesanan Baru',
    en: 'New Booking'
  },
  'dashboard.actions.addProperty': {
    id: 'Tambah Properti',
    en: 'Add Property'
  },
  'dashboard.actions.viewReports': {
    id: 'Lihat Laporan',
    en: 'View Reports'
  },
  'dashboard.actions.manageUsers': {
    id: 'Kelola Pengguna',
    en: 'Manage Users'
  },
  'dashboard.actions.viewAllBookings': {
    id: 'Lihat Semua Pemesanan',
    en: 'View All Bookings'
  },
  'dashboard.actions.viewAllProperties': {
    id: 'Lihat Semua Properti',
    en: 'View All Properties'
  },
  'dashboard.actions.viewAllPayments': {
    id: 'Lihat Semua Pembayaran',
    en: 'View All Payments'
  },
  'dashboard.actions.viewSettings': {
    id: 'Pengaturan',
    en: 'Settings'
  },
  'dashboard.activity.newBooking': {
    id: 'Pemesanan baru',
    en: 'New booking'
  },
  'dashboard.activity.paymentReceived': {
    id: 'Pembayaran diterima',
    en: 'Payment received'
  },
  'dashboard.activity.checkIn': {
    id: 'Check-in',
    en: 'Check-in'
  },
  'dashboard.activity.checkOut': {
    id: 'Check-out',
    en: 'Check-out'
  },
  'dashboard.activity.verification': {
    id: 'Verifikasi',
    en: 'Verification'
  },
  'dashboard.activity.viewDetails': {
    id: 'Lihat Detail',
    en: 'View Details'
  },
  'dashboard.agenda.checkIn': {
    id: 'Check-in',
    en: 'Check-in'
  },
  'dashboard.agenda.checkOut': {
    id: 'Check-out',
    en: 'Check-out'
  },
  'dashboard.agenda.verification': {
    id: 'Verifikasi Diperlukan',
    en: 'Verification Required'
  },
  'dashboard.agenda.noAgenda': {
    id: 'Tidak ada agenda hari ini',
    en: 'No agenda for today'
  },
  'dashboard.roles.super_admin': {
    id: 'Super Admin',
    en: 'Super Admin'
  },
  'dashboard.roles.property_owner': {
    id: 'Pemilik Properti',
    en: 'Property Owner'
  },
  'dashboard.roles.staff': {
    id: 'Staff',
    en: 'Staff'
  },
  'dashboard.roles.guest': {
    id: 'Tamu',
    en: 'Guest'
  },
  'dashboard.status.pending': {
    id: 'Tertunda',
    en: 'Pending'
  },
  'dashboard.status.confirmed': {
    id: 'Dikonfirmasi',
    en: 'Confirmed'
  },
  'dashboard.status.completed': {
    id: 'Selesai',
    en: 'Completed'
  },
  'dashboard.status.cancelled': {
    id: 'Dibatalkan',
    en: 'Cancelled'
  },
  'dashboard.status.verified': {
    id: 'Terverifikasi',
    en: 'Verified'
  },
  'dashboard.status.active': {
    id: 'Aktif',
    en: 'Active'
  },
  'dashboard.status.inactive': {
    id: 'Tidak Aktif',
    en: 'Inactive'
  },
  'dashboard.activity.noActivity': {
    id: 'Tidak ada aktivitas terbaru',
    en: 'No recent activity'
  },

  // Properties Page
  'properties.pageTitle': {
    id: 'Properti - Sistem Manajemen Properti',
    en: 'Properties - Property Management System'
  },
  'properties.searchPlaceholder': {
    id: 'Cari properti berdasarkan nama atau lokasi...',
    en: 'Search properties by name or location...'
  },
  'properties.filters': {
    id: 'Filter',
    en: 'Filters'
  },
  'properties.clearFilters': {
    id: 'Bersihkan Filter',
    en: 'Clear Filters'
  },
  'properties.sortBy': {
    id: 'Urutkan berdasarkan',
    en: 'Sort by'
  },
  'properties.sort.featured': {
    id: 'Unggulan Dulu',
    en: 'Featured First'
  },
  'properties.sort.priceLow': {
    id: 'Harga: Rendah ke Tinggi',
    en: 'Price: Low to High'
  },
  'properties.sort.priceHigh': {
    id: 'Harga: Tinggi ke Rendah',
    en: 'Price: High to Low'
  },
  'properties.sort.name': {
    id: 'Nama A-Z',
    en: 'Name A-Z'
  },
  'properties.guests': {
    id: 'Tamu',
    en: 'Guests'
  },
  'properties.amenities': {
    id: 'Fasilitas',
    en: 'Amenities'
  },
  'properties.found': {
    id: 'properti ditemukan',
    en: 'properties found'
  },
  'properties.noResults': {
    id: 'Tidak ada properti yang sesuai dengan kriteria pencarian Anda.',
    en: 'No properties match your search criteria.'
  },
  'properties.tryAdjusting': {
    id: 'Coba sesuaikan filter atau kata kunci pencarian Anda.',
    en: 'Try adjusting your filters or search keywords.'
  }
};

// Create language store
export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      currentLanguage: 'id', // Default to Indonesian
      setLanguage: (lang: Language) => set({ currentLanguage: lang }),
      t: (key: string) => {
        const { currentLanguage } = get();
        const translation = translations[key];
        
        if (!translation) {
          console.warn(`Translation key "${key}" not found`);
          return key;
        }
        
        return translation[currentLanguage] || translation.en || key;
      },
    }),
    {
      name: 'language-storage',
    }
  )
);

// Hook for easy access
export const useTranslation = () => {
  const { currentLanguage, setLanguage, t } = useLanguageStore();
  
  return {
    currentLanguage,
    setLanguage,
    t,
    isIndonesian: currentLanguage === 'id',
    isEnglish: currentLanguage === 'en',
  };
};

// Currency formatting based on language
export const formatCurrencyByLanguage = (amount: number, language?: Language) => {
  const lang = language || useLanguageStore.getState().currentLanguage;
  
  if (lang === 'id') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } else {
    // Convert to USD (approximate rate: 1 USD = 15,000 IDR)
    const usdAmount = amount / 15000;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(usdAmount);
  }
};

export default useLanguageStore; 