import React, { useState, useCallback, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Trash2, Users, CreditCard, Calculator, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Property {
    id: number;
    name: string;
    slug: string;
    address: string;
    capacity: number;
    capacity_max: number;
    min_stay_weekday: number;
    min_stay_weekend: number;
    min_stay_peak: number;
    base_rate: number;
    cleaning_fee: number;
    extra_bed_rate: number;
}

interface GuestDetail {
    id: string;
    name: string;
    gender: 'male' | 'female';
    age_category: 'adult' | 'child' | 'infant';
    relationship_to_primary: string;
    phone?: string;
    email?: string;
}

interface BookingFormData {
    check_in_date: string;
    check_out_date: string;
    check_in_time: string;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country: string;
    guest_id_number: string;
    guest_gender: 'male' | 'female';
    relationship_type: 'keluarga' | 'teman' | 'kolega' | 'pasangan' | 'campuran';
    special_requests: string;
    dp_percentage: number;
    guests: GuestDetail[];
    [key: string]: any;
}

interface BookingErrors {
    [key: string]: string;
}

interface RateCalculation {
    nights: number;
    base_amount: number;
    weekend_premium: number;
    seasonal_premium: number;
    extra_bed_amount: number;
    cleaning_fee: number;
    tax_amount: number;
    total_amount: number;
    extra_beds: number;
    formatted: {
        total_amount: string;
        per_night: string;
    };
}

interface BookingCreateProps {
    property: Property;
    auth?: {
        user?: {
            id: number;
            name: string;
            email: string;
            phone?: string;
            gender?: string;
            role: string;
        }
    };
    initialAvailabilityData: {
        date_range: {
            start: string;
            end: string;
        };
        guest_count: number;
    };
    rateCalculation?: RateCalculation;
}

const relationshipOptions = [
    { value: 'keluarga', label: 'Keluarga' },
    { value: 'teman', label: 'Teman' },
    { value: 'kolega', label: 'Kolega' },
    { value: 'pasangan', label: 'Pasangan' },
    { value: 'campuran', label: 'Campuran' }
];

const relationshipToOptions = [
    { value: 'self', label: 'Diri sendiri' },
    { value: 'spouse', label: 'Pasangan' },
    { value: 'child', label: 'Anak' },
    { value: 'parent', label: 'Orang tua' },
    { value: 'sibling', label: 'Saudara' },
    { value: 'friend', label: 'Teman' },
    { value: 'colleague', label: 'Kolega' },
    { value: 'other', label: 'Lainnya' }
];

const checkInTimeOptions = [
    { value: '14:00', label: '14:00' },
    { value: '15:00', label: '15:00' },
    { value: '16:00', label: '16:00' },
    { value: '17:00', label: '17:00' },
    { value: '18:00', label: '18:00' },
];

const countries = [
    'Indonesia', 'Singapore', 'Malaysia', 'Thailand', 'Philippines', 'Vietnam', 
    'Cambodia', 'Laos', 'Myanmar', 'Brunei', 'Australia', 'New Zealand', 
    'Japan', 'South Korea', 'China', 'India', 'United States', 'United Kingdom', 
    'Germany', 'France', 'Netherlands', 'Other'
];

const getInitialFormData = (auth: any, initial: any): BookingFormData => {
    const user = auth?.user;
    return {
        check_in_date: initial.date_range.start,
        check_out_date: initial.date_range.end,
        check_in_time: '15:00',
        guest_male: 1,
        guest_female: 1,
        guest_children: 0,
        guest_name: user?.name || '',
        guest_email: user?.email || '',
        guest_phone: user?.phone || '',
        guest_country: 'Indonesia',
        guest_id_number: '',
        guest_gender: (user?.gender as 'male' | 'female') || 'male',
        relationship_type: 'keluarga',
        special_requests: '',
        dp_percentage: 50,
        guests: [],
    };
};

export default function BookingCreate({ property, auth, initialAvailabilityData, rateCalculation }: BookingCreateProps) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<BookingFormData>(
        getInitialFormData(auth, initialAvailabilityData)
    );
    const [guestDetails, setGuestDetails] = useState<GuestDetail[]>([]);
    const [showGuestDetails, setShowGuestDetails] = useState(false);
    const [validationErrors, setValidationErrors] = useState<BookingErrors>({});

    // Calculate total guests and extra beds
    const totalGuests = data.guest_male + data.guest_female + data.guest_children;
    const extraBeds = Math.max(0, totalGuests - property.capacity);

    // Guest details management
    const addGuestDetail = useCallback(() => {
        const newGuest: GuestDetail = {
            id: `guest_${Date.now()}`,
            name: '',
            gender: 'male',
            age_category: 'adult',
            relationship_to_primary: 'friend',
        };
        setGuestDetails(prev => [...prev, newGuest]);
    }, []);

    const updateGuestDetail = useCallback((id: string, field: keyof GuestDetail, value: any) => {
        setGuestDetails(prev => 
            prev.map(guest => 
                guest.id === id ? { ...guest, [field]: value } : guest
            )
        );
    }, []);

    const removeGuestDetail = useCallback((id: string) => {
        setGuestDetails(prev => prev.filter(guest => guest.id !== id));
    }, []);

    // Sync guest details with total guests
    useEffect(() => {
        if (totalGuests > 1) {
            const expectedGuestDetails = totalGuests - 1;
            const currentGuestDetails = guestDetails.length;
            if (currentGuestDetails < expectedGuestDetails) {
                for (let i = 0; i < expectedGuestDetails - currentGuestDetails; i++) {
                    addGuestDetail();
                }
            } else if (currentGuestDetails > expectedGuestDetails) {
                setGuestDetails(prev => prev.slice(0, expectedGuestDetails));
            }
        } else {
            setGuestDetails([]);
        }
    }, [totalGuests, addGuestDetail, guestDetails.length]);

    // Form validation
    const validateForm = useCallback(() => {
        const errors: BookingErrors = {};
        if (!data.guest_name?.trim()) errors.guest_name = 'Nama tamu wajib diisi';
        if (!data.guest_email?.trim()) errors.guest_email = 'Email wajib diisi';
        if (!data.guest_phone?.trim()) errors.guest_phone = 'Nomor telepon wajib diisi';
        if (!data.guest_country) errors.guest_country = 'Negara wajib diisi';
        if (!data.check_in_time) errors.check_in_time = 'Jam check-in wajib diisi';
        if (totalGuests <= 0) errors.guest_count = 'Jumlah tamu minimal 1';
        if (totalGuests > property.capacity_max) errors.guest_count = `Jumlah tamu maksimal ${property.capacity_max}`;
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [data, totalGuests, property.capacity_max]);

    // Form submission handler
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setData('guests', guestDetails);
        post(route('bookings.store', property.slug));
    };

    return (
        <AppLayout>
            <Head title={`Booking ${property.name} - Homsjogja`} />
            <div className="min-h-screen bg-slate-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* Form Section */}
                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-600" />
                                            Form Booking
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            {/* Dates Section */}
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <h3 className="font-semibold mb-3">Informasi Tanggal</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>Check-in</Label>
                                                        <Input value={data.check_in_date} disabled className="bg-gray-100" />
                                                    </div>
                                                    <div>
                                                        <Label>Check-out</Label>
                                                        <Input value={data.check_out_date} disabled className="bg-gray-100" />
                                                    </div>
                                                </div>
                                                <div className="mt-4">
                                                    <Label>Jam Check-in</Label>
                                                    <Select value={data.check_in_time} onValueChange={val => setData('check_in_time', val)}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {checkInTimeOptions.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {validationErrors.check_in_time && <p className="text-sm text-red-600 mt-1">{validationErrors.check_in_time}</p>}
                                                </div>
                                            </div>

                                            {/* Guest Count Section */}
                                            <div>
                                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                                    <Users className="h-5 w-5 text-blue-600" />
                                                    Jumlah Tamu
                                                </h3>
                                                <div className="grid grid-cols-3 gap-4 mb-4">
                                                    <div>
                                                        <Label>Laki-laki</Label>
                                                        <Input type="number" min={0} value={data.guest_male} onChange={e => setData('guest_male', parseInt(e.target.value) || 0)} />
                                                    </div>
                                                    <div>
                                                        <Label>Perempuan</Label>
                                                        <Input type="number" min={0} value={data.guest_female} onChange={e => setData('guest_female', parseInt(e.target.value) || 0)} />
                                                    </div>
                                                    <div>
                                                        <Label>Anak-anak</Label>
                                                        <Input type="number" min={0} value={data.guest_children} onChange={e => setData('guest_children', parseInt(e.target.value) || 0)} />
                                                    </div>
                                                </div>
                                                
                                                {/* Guest Summary */}
                                                <div className="bg-slate-50 p-4 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium">Total Tamu:</span>
                                                        <Badge variant={totalGuests > property.capacity_max ? "destructive" : "secondary"}>
                                                            {totalGuests} tamu
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        Kapasitas: {property.capacity} - {property.capacity_max} tamu
                                                    </div>
                                                    {extraBeds > 0 && (
                                                        <div className="text-sm text-blue-600">
                                                            Extra bed diperlukan: {extraBeds} (+Rp {(extraBeds * property.extra_bed_rate).toLocaleString()}/malam)
                                                        </div>
                                                    )}
                                                    {validationErrors.guest_count && (
                                                        <p className="text-sm text-red-600 mt-2">{validationErrors.guest_count}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* Primary Guest Section */}
                                            <div>
                                                <h3 className="font-semibold mb-4">Data Tamu Utama</h3>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>Nama Lengkap *</Label>
                                                        <Input value={data.guest_name} onChange={e => setData('guest_name', e.target.value)} />
                                                        {validationErrors.guest_name && <p className="text-sm text-red-600 mt-1">{validationErrors.guest_name}</p>}
                                                    </div>
                                                    <div>
                                                        <Label>Jenis Kelamin *</Label>
                                                        <Select value={data.guest_gender} onValueChange={val => setData('guest_gender', val)}>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="male">Laki-laki</SelectItem>
                                                                <SelectItem value="female">Perempuan</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                                    <div>
                                                        <Label>Email *</Label>
                                                        <Input value={data.guest_email} onChange={e => setData('guest_email', e.target.value)} />
                                                        {validationErrors.guest_email && <p className="text-sm text-red-600 mt-1">{validationErrors.guest_email}</p>}
                                                    </div>
                                                    <div>
                                                        <Label>Telepon *</Label>
                                                        <Input value={data.guest_phone} onChange={e => setData('guest_phone', e.target.value)} />
                                                        {validationErrors.guest_phone && <p className="text-sm text-red-600 mt-1">{validationErrors.guest_phone}</p>}
                                                    </div>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                                    <div>
                                                        <Label>Negara *</Label>
                                                        <Select value={data.guest_country} onValueChange={val => setData('guest_country', val)}>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                        {validationErrors.guest_country && <p className="text-sm text-red-600 mt-1">{validationErrors.guest_country}</p>}
                                                    </div>
                                                    <div>
                                                        <Label>No. Identitas</Label>
                                                        <Input value={data.guest_id_number} onChange={e => setData('guest_id_number', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="mt-4">
                                                    <Label>Jenis Kelompok</Label>
                                                    <Select value={data.relationship_type} onValueChange={val => setData('relationship_type', val)}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {relationshipOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* Additional Guest Details */}
                                            {totalGuests > 1 && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="font-semibold">Detail Tamu Tambahan</h3>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setShowGuestDetails(!showGuestDetails)}
                                                        >
                                                            <UserPlus className="h-4 w-4 mr-2" />
                                                            {showGuestDetails ? 'Sembunyikan Detail' : 'Tampilkan Detail'}
                                                        </Button>
                                                    </div>

                                                    {showGuestDetails && (
                                                        <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                                                            {guestDetails.map((guest, idx) => (
                                                                <div key={guest.id} className="border rounded-lg p-4 bg-white">
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <h4 className="font-medium text-blue-600">Tamu {idx + 2}</h4>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => removeGuestDetail(guest.id)}
                                                                            className="text-red-600 hover:text-red-700"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <div className="grid md:grid-cols-2 gap-3">
                                                                        <div>
                                                                            <Label className="text-sm">Nama</Label>
                                                                            <Input
                                                                                value={guest.name}
                                                                                onChange={e => updateGuestDetail(guest.id, 'name', e.target.value)}
                                                                                placeholder="Nama tamu"
                                                                                className="text-sm"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-sm">Gender</Label>
                                                                            <Select 
                                                                                value={guest.gender} 
                                                                                onValueChange={val => updateGuestDetail(guest.id, 'gender', val)}
                                                                            >
                                                                                <SelectTrigger className="text-sm">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="male">Laki-laki</SelectItem>
                                                                                    <SelectItem value="female">Perempuan</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-sm">Kategori Usia</Label>
                                                                            <Select 
                                                                                value={guest.age_category}
                                                                                onValueChange={val => updateGuestDetail(guest.id, 'age_category', val)}
                                                                            >
                                                                                <SelectTrigger className="text-sm">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="adult">Dewasa</SelectItem>
                                                                                    <SelectItem value="child">Anak</SelectItem>
                                                                                    <SelectItem value="infant">Bayi</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-sm">Hubungan</Label>
                                                                            <Select 
                                                                                value={guest.relationship_to_primary}
                                                                                onValueChange={val => updateGuestDetail(guest.id, 'relationship_to_primary', val)}
                                                                            >
                                                                                <SelectTrigger className="text-sm">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {relationshipToOptions.map(opt => (
                                                                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <Button type="button" variant="outline" onClick={addGuestDetail} className="w-full">
                                                                <UserPlus className="h-4 w-4 mr-2" />
                                                                Tambah Tamu
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <Separator />

                                            {/* Special Requests */}
                                            <div>
                                                <Label>Permintaan Khusus (Opsional)</Label>
                                                <Textarea 
                                                    value={data.special_requests} 
                                                    onChange={e => setData('special_requests', e.target.value)} 
                                                    rows={3}
                                                    placeholder="Masukkan permintaan khusus jika ada..."
                                                />
                                            </div>

                                            {/* Submit Buttons */}
                                            <div className="flex gap-4 pt-4">
                                                <Link href={`/properties/${property.slug}`} className="flex-1">
                                                    <Button variant="outline" className="w-full">Batal</Button>
                                                </Link>
                                                <Button type="submit" disabled={processing} className="flex-1">
                                                    {processing ? 'Memproses...' : 'Lanjut ke Pembayaran'}
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Rate Summary Section */}
                            <div className="lg:col-span-1">
                                <div className="sticky top-4 space-y-6">
                                    {/* Property Info */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Detail Booking</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div>
                                                    <h3 className="font-semibold">{property.name}</h3>
                                                    <p className="text-sm text-gray-600">{property.address}</p>
                                                </div>
                                                <div className="text-sm">
                                                    <div className="flex justify-between">
                                                        <span>Check-in:</span>
                                                        <span>{data.check_in_date}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Check-out:</span>
                                                        <span>{data.check_out_date}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Total Tamu:</span>
                                                        <span>{totalGuests} orang</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Rate Calculation */}
                                    {rateCalculation ? (
                                        <Card className="shadow-xl border-0">
                                            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                                                <CardTitle className="flex items-center gap-2">
                                                    <Calculator className="h-5 w-5" />
                                                    Total Harga
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">Base Rate ({rateCalculation.nights} malam)</span>
                                                        <span className="font-medium">
                                                            Rp {rateCalculation.base_amount?.toLocaleString('id-ID') || '0'}
                                                        </span>
                                                    </div>

                                                    {rateCalculation.weekend_premium > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600">Weekend Premium</span>
                                                            <span className="font-medium">
                                                                Rp {rateCalculation.weekend_premium.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {rateCalculation.seasonal_premium > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600">Seasonal Premium</span>
                                                            <span className="font-medium">
                                                                Rp {rateCalculation.seasonal_premium.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {rateCalculation.extra_bed_amount > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600">Extra Beds ({extraBeds})</span>
                                                            <span className="font-medium">
                                                                Rp {rateCalculation.extra_bed_amount.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">Cleaning Fee</span>
                                                        <span className="font-medium">
                                                            Rp {rateCalculation.cleaning_fee.toLocaleString('id-ID')}
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">Tax (11%)</span>
                                                        <span className="font-medium">
                                                            Rp {rateCalculation.tax_amount.toLocaleString('id-ID')}
                                                        </span>
                                                    </div>
                                                    
                                                    <Separator />
                                                    
                                                    <div className="flex justify-between items-center text-lg font-bold">
                                                        <span>Total</span>
                                                        <span className="text-blue-600">
                                                            {rateCalculation.formatted.total_amount}
                                                        </span>
                                                    </div>

                                                    <Alert>
                                                        <CheckCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            Harga sudah termasuk semua biaya
                                                        </AlertDescription>
                                                    </Alert>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <Card className="shadow-xl border-0">
                                            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                <CardTitle className="flex items-center gap-2">
                                                    <Calculator className="h-5 w-5" />
                                                    Total Harga
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-center py-8">
                                                    <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                                    <p className="text-gray-500">Menghitung tarif...</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 
