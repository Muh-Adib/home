import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CheckCircle, XCircle, Home, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Guest {
    id: number;
    booking_number: string;
    property_name: string;
    location: 'selatan' | 'utara';
    guest_name: string;
    guest_phone?: string;
    nights?: number;
    check_out_date?: string;
    is_cleaned?: boolean;
    first_day_extra_beds?: number;
    extra_services?: string[];
}

interface PropertyUnit {
    id: number;
    name: string;
    location: 'selatan' | 'utara';
}

interface CheckInOutProps {
    checkOuts: Guest[];
    checkIns: Guest[];
    stayingGuests: Guest[];
    emptyUnits: PropertyUnit[];
    today: string;
}

function CheckInOut({ checkOuts, checkIns, stayingGuests, emptyUnits, today }: CheckInOutProps) {
    const [generating, setGenerating] = useState(false);

    const handleGenerateText = async () => {
        setGenerating(true);
        try {
            const response = await fetch(route('admin.bookings.check-in-out.generate-text'));
            const data = await response.json();

            if (data.success) {
                // Copy to clipboard
                await navigator.clipboard.writeText(data.text);
                toast.success('Text berhasil di-generate dan dicopy ke clipboard!');
            } else {
                toast.error('Gagal generate text');
            }
        } catch (error) {
            console.error('Error generating text:', error);
            toast.error('Terjadi kesalahan saat generate text');
        } finally {
            setGenerating(false);
        }
    };

    const handleRefresh = () => {
        router.reload();
    };

    const groupByLocation = <T extends { location: 'selatan' | 'utara' }>(items: T[]) => {
        const selatan = items.filter(item => item.location === 'selatan');
        const utara = items.filter(item => item.location === 'utara');
        return { selatan, utara };
    };

    const checkOutsGrouped = groupByLocation<Guest>(checkOuts);
    const checkInsGrouped = groupByLocation<Guest>(checkIns);
    const emptyUnitsGrouped = groupByLocation<PropertyUnit>(emptyUnits);

    return (
        <>
            <Head title="Check-In/Out Hari Ini - Admin" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

                    {/* Title */}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Check-In/Out Hari Ini</h1>
                        <p className="text-muted-foreground mt-1">
                            <Calendar className="inline h-4 w-4 mr-1" />
                            {new Date(today).toLocaleDateString('id-ID', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </p>
                    </div>

                    {/* Buttons berada di bawah saat mobile */}
                    <div className="flex flex-col md:flex-row w-full md:w-auto gap-2">
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            className="w-full md:w-auto"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>

                        <Button
                            onClick={handleGenerateText}
                            disabled={generating}
                            className="w-full md:w-auto"
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            {generating ? 'Generating...' : 'Generate & Copy Text'}
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center">
                                <div className="rounded-full p-3 bg-red-100 mr-4">
                                    <XCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Check-Out</p>
                                    <p className="text-2xl font-bold">{checkOuts.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center">
                                <div className="rounded-full p-3 bg-green-100 mr-4">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Check-In</p>
                                    <p className="text-2xl font-bold">{checkIns.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center">
                                <div className="rounded-full p-3 bg-blue-100 mr-4">
                                    <Home className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tamu Stay</p>
                                    <p className="text-2xl font-bold">{stayingGuests.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center">
                                <div className="rounded-full p-3 bg-gray-100 mr-4">
                                    <Home className="h-6 w-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Unit Kosong</p>
                                    <p className="text-2xl font-bold">{emptyUnits.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Check-Out Today */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            Check-Out Hari Ini ({checkOuts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">🏡 SELATAN</h3>
                                {checkOutsGrouped.selatan.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">Tidak ada check-out</p>
                                ) : (
                                    <div className="space-y-2">
                                        {checkOutsGrouped.selatan.map((guest, index) => (
                                            <div key={guest.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <span className="font-medium">{index + 1}. {guest.property_name}</span>
                                                    <span className="text-muted-foreground mx-2">-</span>
                                                    <span>{guest.guest_name}</span>
                                                    {guest.guest_phone && (
                                                        <>
                                                            <span className="text-muted-foreground mx-2">-</span>
                                                            <span className="text-sm">{guest.guest_phone}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {guest.is_cleaned ? (
                                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">Clean</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">Dirty</span>
                                                    )}
                                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">CO</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">🏡 UTARA</h3>
                                {checkOutsGrouped.utara.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">Tidak ada check-out</p>
                                ) : (
                                    <div className="space-y-2">
                                        {checkOutsGrouped.utara.map((guest, index) => (
                                            <div key={guest.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <span className="font-medium">{index + 1}. {guest.property_name}</span>
                                                    <span className="text-muted-foreground mx-2">-</span>
                                                    <span>{guest.guest_name}</span>
                                                    {guest.guest_phone && (
                                                        <>
                                                            <span className="text-muted-foreground mx-2">-</span>
                                                            <span className="text-sm">{guest.guest_phone}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {guest.is_cleaned ? (
                                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">Clean</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">Dirty</span>
                                                    )}
                                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">CO</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Check-In Today */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Check-In Hari Ini ({checkIns.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">🏡 SELATAN</h3>
                                {checkInsGrouped.selatan.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">Tidak ada check-in</p>
                                ) : (
                                    <div className="space-y-2">
                                        {checkInsGrouped.selatan.map((guest, index) => (
                                            <div key={guest.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <div className="flex items-center flex-wrap">
                                                        <span className="font-medium">{index + 1}. {guest.property_name}</span>
                                                        <span className="text-muted-foreground mx-2">-</span>
                                                        <span className="text-sm text-blue-600">{guest.nights} malam</span>
                                                        <span className="text-muted-foreground mx-2">-</span>
                                                        <span>{guest.guest_name}</span>
                                                        {guest.guest_phone && (
                                                            <>
                                                                <span className="text-muted-foreground mx-2">-</span>
                                                                <span className="text-sm">{guest.guest_phone}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {((guest.first_day_extra_beds && guest.first_day_extra_beds > 0) || (guest.extra_services && guest.extra_services.length > 0)) && (
                                                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                                                            {guest.first_day_extra_beds && guest.first_day_extra_beds > 0 ? (
                                                                <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                                                                    🛏️ Extrabed H1: {guest.first_day_extra_beds}
                                                                </span>
                                                            ) : null}
                                                            {guest.extra_services && guest.extra_services.length > 0 ? (
                                                                <span className="text-[10px] bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.5 rounded font-bold">
                                                                    ✨ Extra Service: {guest.extra_services.join(', ')}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {guest.is_cleaned ? (
                                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">Clean</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">Dirty</span>
                                                    )}
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">CI</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">🏡 UTARA</h3>
                                {checkInsGrouped.utara.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">Tidak ada check-in</p>
                                ) : (
                                    <div className="space-y-2">
                                        {checkInsGrouped.utara.map((guest, index) => (
                                            <div key={guest.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <div className="flex items-center flex-wrap">
                                                        <span className="font-medium">{index + 1}. {guest.property_name}</span>
                                                        <span className="text-muted-foreground mx-2">-</span>
                                                        <span className="text-sm text-blue-600">{guest.nights} malam</span>
                                                        <span className="text-muted-foreground mx-2">-</span>
                                                        <span>{guest.guest_name}</span>
                                                        {guest.guest_phone && (
                                                            <>
                                                                <span className="text-muted-foreground mx-2">-</span>
                                                                <span className="text-sm">{guest.guest_phone}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {((guest.first_day_extra_beds && guest.first_day_extra_beds > 0) || (guest.extra_services && guest.extra_services.length > 0)) && (
                                                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                                                            {guest.first_day_extra_beds && guest.first_day_extra_beds > 0 ? (
                                                                <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                                                                    🛏️ Extrabed H1: {guest.first_day_extra_beds}
                                                                </span>
                                                            ) : null}
                                                            {guest.extra_services && guest.extra_services.length > 0 ? (
                                                                <span className="text-[10px] bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.5 rounded font-bold">
                                                                    ✨ Extra Service: {guest.extra_services.join(', ')}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {guest.is_cleaned ? (
                                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">Clean</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">Dirty</span>
                                                    )}
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">CI</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Empty Units and Staying Guests */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Empty Units */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Home className="h-5 w-5 text-gray-600" />
                                Unit Kosong ({emptyUnits.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {emptyUnits.length === 0 ? (
                                <p className="text-muted-foreground text-sm">Semua unit terisi</p>
                            ) : (
                                <ul className="space-y-1">
                                    {emptyUnits.map((unit, index) => (
                                        <li key={unit.id} className="text-sm p-2 hover:bg-gray-50 rounded">
                                            {index + 1}. {unit.name}
                                            <span className="text-xs text-muted-foreground ml-2">
                                                ({unit.location === 'selatan' ? '🏡 Selatan' : '🏡 Utara'})
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    {/* Staying Guests */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Home className="h-5 w-5 text-blue-600" />
                                Tamu Stay ({stayingGuests.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stayingGuests.length === 0 ? (
                                <p className="text-muted-foreground text-sm">Tidak ada tamu stay</p>
                            ) : (
                                <ul className="space-y-1">
                                    {stayingGuests.map((guest, index) => (
                                        <li key={guest.id} className="text-sm p-2 hover:bg-gray-50 rounded flex items-center justify-between">
                                            <div>
                                                {index + 1}. {guest.property_name}
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    (CO: {new Date(guest.check_out_date!).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})
                                                </span>
                                            </div>
                                            {guest.is_cleaned ? (
                                                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">Clean</span>
                                            ) : (
                                                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">Dirty</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {stayingGuests.length > 0 && (
                                <Alert className="mt-4">
                                    <AlertDescription className="text-sm">
                                        ⚠️ Wajib pantau token untuk tamu stay
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

CheckInOut.layout = (page: React.ReactElement) => <AdminLayout  title="Check-In/Out Hari Ini">{page}</AdminLayout>;

export default CheckInOut;
