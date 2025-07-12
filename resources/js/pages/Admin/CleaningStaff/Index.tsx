import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Building2, 
    MapPin, 
    Calendar,
    User,
    Key,
    CheckCircle,
    Clock,
    RefreshCw,
    ExternalLink,
    Sparkles,
    AlertCircle,
    Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type PageProps } from '@/types';

interface CleaningStaffProps extends PageProps {
    propertiesToClean: Array<{
        id: number;
        name: string;
        address: string;
        maps_link?: string;
        latest_booking?: {
            id: number;
            booking_number: string;
            check_out: string;
            guest_name: string;
            is_cleaned: boolean;
            keybox_code?: string;
        };
    }>;
    recentlyCleaned: Array<{
        id: number;
        name: string;
        address: string;
        latest_booking?: {
            id: number;
            booking_number: string;
            cleaned_at: string;
            keybox_code?: string;
            cleaned_by: string;
        };
    }>;
}

export default function CleaningStaffIndex({ propertiesToClean, recentlyCleaned }: CleaningStaffProps) {
    const { t } = useTranslation();
    const [keyboxCodes, setKeyboxCodes] = useState<Record<number, string>>({});
    const [isSubmitting, setIsSubmitting] = useState<Record<number, boolean>>({});
    const [errors, setErrors] = useState<Record<number, string>>({});
    const [successMessage, setSuccessMessage] = useState<string>('');

    const generateKeyboxCode = async (bookingId: number) => {
        try {
            const code = Math.floor(Math.random() * 900) + 100; // Generate 3-digit code
            setKeyboxCodes(prev => ({
                ...prev,
                [bookingId]: code.toString()
            }));
            setErrors(prev => ({ ...prev, [bookingId]: '' }));
        } catch (error) {
            console.error('Error generating keybox code:', error);
            setErrors(prev => ({ 
                ...prev, 
                [bookingId]: 'Gagal generate kode keybox' 
            }));
        }
    };

    const markAsCleaned = async (bookingId: number) => {
        const keyboxCode = keyboxCodes[bookingId];
        
        if (!keyboxCode || keyboxCode.length !== 3) {
            setErrors(prev => ({ 
                ...prev, 
                [bookingId]: 'Kode keybox harus 3 digit' 
            }));
            return;
        }

        setIsSubmitting(prev => ({ ...prev, [bookingId]: true }));
        setErrors(prev => ({ ...prev, [bookingId]: '' }));

        try {
            const response = await router.post(`/admin/cleaning-staff/mark-cleaned/${bookingId}`, {
                keybox_code: keyboxCode
            }, {
                onSuccess: () => {
                    setSuccessMessage('Properti berhasil ditandai sebagai sudah dibersihkan!');
                    setKeyboxCodes(prev => {
                        const newCodes = { ...prev };
                        delete newCodes[bookingId];
                        return newCodes;
                    });
                    // Reload page after 2 seconds to show updated data
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                },
                onError: (errors) => {
                    setErrors(prev => ({ 
                        ...prev, 
                        [bookingId]: errors.keybox_code || 'Terjadi kesalahan saat memproses' 
                    }));
                }
            });
        } catch (error) {
            console.error('Error marking as cleaned:', error);
            setErrors(prev => ({ 
                ...prev, 
                [bookingId]: 'Terjadi kesalahan saat memproses' 
            }));
        } finally {
            setIsSubmitting(prev => ({ ...prev, [bookingId]: false }));
        }
    };

    const validateKeyboxCode = (code: string) => {
        if (!code) return 'Kode keybox harus diisi';
        if (code.length !== 3) return 'Kode keybox harus 3 digit';
        if (!/^\d{3}$/.test(code)) return 'Kode keybox hanya boleh berisi angka';
        return '';
    };

    const handleKeyboxChange = (bookingId: number, value: string) => {
        const cleanValue = value.replace(/\D/g, '').slice(0, 3);
        setKeyboxCodes(prev => ({
            ...prev,
            [bookingId]: cleanValue
        }));
        
        const error = validateKeyboxCode(cleanValue);
        setErrors(prev => ({ 
            ...prev, 
            [bookingId]: error 
        }));
    };

    return (
        <AppLayout>
            <Head title="Dashboard Cleaning Staff" />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-blue-600" />
                        Dashboard Cleaning Staff
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Kelola properti yang perlu dibersihkan dan set kode keybox
                    </p>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <Alert className="mb-6 border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                            {successMessage}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Info Alert */}
                <Alert className="mb-6 border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                        Pastikan untuk mengisi kode keybox 3 digit sebelum menandai properti sebagai sudah dibersihkan. 
                        Kode ini akan digunakan untuk akses properti oleh tamu berikutnya.
                    </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Properties to Clean */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-orange-600" />
                                Properti yang Perlu Dibersihkan
                            </h2>
                            <Badge variant="destructive" className="text-sm">
                                {propertiesToClean.length} properti
                            </Badge>
                        </div>

                        {propertiesToClean.length === 0 ? (
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                    <p className="text-gray-600">Semua properti sudah dibersihkan!</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {propertiesToClean.map((property) => (
                                    <Card key={property.id} className="border-orange-200">
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-5 w-5 text-orange-600" />
                                                    {property.name}
                                                </div>
                                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                                    Perlu Dibersihkan
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <MapPin className="h-4 w-4" />
                                                    {property.address}
                                                </div>
                                                {property.latest_booking && (
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" />
                                                            <span>Check-out: {property.latest_booking.check_out}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4" />
                                                            <span>Tamu: {property.latest_booking.guest_name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Key className="h-4 w-4" />
                                                            <span>Booking: {property.latest_booking.booking_number}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {property.maps_link && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={property.maps_link} target="_blank" rel="noopener noreferrer">
                                                        <MapPin className="h-4 w-4 mr-2" />
                                                        Lihat di Maps
                                                        <ExternalLink className="h-4 w-4 ml-2" />
                                                    </a>
                                                </Button>
                                            )}

                                            <div className="space-y-3">
                                                <div>
                                                    <Label htmlFor={`keybox-${property.id}`}>Kode Keybox (3 digit)</Label>
                                                    <div className="flex gap-2 mt-1">
                                                        <Input
                                                            id={`keybox-${property.id}`}
                                                            type="text"
                                                            maxLength={3}
                                                            placeholder="000"
                                                            value={keyboxCodes[property.latest_booking?.id || 0] || ''}
                                                            onChange={(e) => handleKeyboxChange(property.latest_booking?.id || 0, e.target.value)}
                                                            className={`w-24 ${errors[property.latest_booking?.id || 0] ? 'border-red-500' : ''}`}
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => generateKeyboxCode(property.latest_booking?.id || 0)}
                                                            disabled={isSubmitting[property.latest_booking?.id || 0]}
                                                        >
                                                            <RefreshCw className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    {errors[property.latest_booking?.id || 0] && (
                                                        <p className="text-sm text-red-600 mt-1">
                                                            {errors[property.latest_booking?.id || 0]}
                                                        </p>
                                                    )}
                                                </div>

                                                <Button
                                                    onClick={() => markAsCleaned(property.latest_booking?.id || 0)}
                                                    disabled={isSubmitting[property.latest_booking?.id || 0] || !keyboxCodes[property.latest_booking?.id || 0] || keyboxCodes[property.latest_booking?.id || 0].length !== 3}
                                                    className="w-full"
                                                >
                                                    {isSubmitting[property.latest_booking?.id || 0] ? (
                                                        <>
                                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                            Memproses...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                            Tandai Sudah Dibersihkan
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recently Cleaned */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Baru Saja Dibersihkan
                            </h2>
                            <Badge variant="default" className="text-sm bg-green-100 text-green-800">
                                {recentlyCleaned.length} properti
                            </Badge>
                        </div>

                        {recentlyCleaned.length === 0 ? (
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">Belum ada properti yang dibersihkan</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {recentlyCleaned.map((property) => (
                                    <Card key={property.id} className="border-green-200">
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-5 w-5 text-green-600" />
                                                    {property.name}
                                                </div>
                                                <Badge variant="outline" className="text-green-600 border-green-300">
                                                    Sudah Dibersihkan
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <MapPin className="h-4 w-4" />
                                                    {property.address}
                                                </div>
                                                {property.latest_booking && (
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" />
                                                            <span>Dibersihkan: {property.latest_booking.cleaned_at}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4" />
                                                            <span>Oleh: {property.latest_booking.cleaned_by}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Key className="h-4 w-4" />
                                                            <span>Kode Keybox: {property.latest_booking.keybox_code}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 