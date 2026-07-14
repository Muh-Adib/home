import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
    Search, 
    Building2, 
    Users, 
    Calendar, 
    Save, 
    UserCheck,
    Loader2
} from 'lucide-react';
import { type Booking, type Property, type BreadcrumbItem } from '@/types';

interface StaffUser {
    id: number;
    name: string;
    role: string;
}

interface PaginatedBookings {
    data: Booking[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total: number;
}

interface StaffTrackingProps {
    bookings: PaginatedBookings;
    properties: Property[];
    staffUsers: StaffUser[];
    filters: {
        search?: string;
        property_id?: string;
    };
}

export default function StaffTracking({ bookings, properties, staffUsers, filters }: StaffTrackingProps) {
    const [searchVal, setSearchVal] = useState(filters.search || '');
    const [propertyId, setPropertyId] = useState(filters.property_id || 'all');
    const [updatingRowId, setUpdatingRowId] = useState<number | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings', href: '/admin/bookings' },
        { title: 'Attribusi Staff & Closing' },
    ];

    // Helper to format date
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Filter submit
    const applyFilters = () => {
        router.get(
            route('admin.bookings.staff-tracking'),
            {
                search: searchVal || undefined,
                property_id: propertyId !== 'all' ? propertyId : undefined,
            },
            { preserveState: true }
        );
    };

    // Auto-filter on property select
    useEffect(() => {
        applyFilters();
    }, [propertyId]);

    // Handle single booking attribution update
    const handleUpdate = (booking: Booking, closedByVal: string, followedUpByVal: string) => {
        setUpdatingRowId(booking.id);
        
        router.put(
            route('admin.bookings.staff-tracking.update', booking.id),
            {
                closed_by: closedByVal === 'null' ? null : parseInt(closedByVal),
                followed_up_by: followedUpByVal === 'null' ? null : parseInt(followedUpByVal),
            },
            {
                onSuccess: () => {
                    toast.success('Attribusi staff booking berhasil diperbarui.');
                    setUpdatingRowId(null);
                },
                onError: (err) => {
                    console.error('Update attribution failed:', err);
                    toast.error('Gagal memperbarui attribusi.');
                    setUpdatingRowId(null);
                }
            }
        );
    };

    // State for temporary select values per row (so they can edit first, then click save)
    const [tempValues, setTempValues] = useState<Record<number, { closed_by: string; followed_up_by: string }>>({});

    // Initialize/sync row select states
    useEffect(() => {
        const initialMap: Record<number, { closed_by: string; followed_up_by: string }> = {};
        bookings.data.forEach((b) => {
            initialMap[b.id] = {
                closed_by: b.closed_by?.toString() || 'null',
                followed_up_by: b.followed_up_by?.toString() || 'null',
            };
        });
        setTempValues(initialMap);
    }, [bookings.data]);

    const handleSelectChange = (bookingId: number, field: 'closed_by' | 'followed_up_by', value: string) => {
        setTempValues((prev) => ({
            ...prev,
            [bookingId]: {
                ...prev[bookingId],
                [field]: value,
            }
        }));
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Attribusi Staff & Closing" />
            
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <UserCheck className="h-6 w-6 text-blue-600" />
                            Attribusi Staff (Closing & Follow Up)
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Ubah dan sesuaikan pencatatan staff yang melakukan input/closing serta follow up untuk setiap transaksi booking.
                        </p>
                    </div>
                </div>

                {/* Filters card */}
                <Card className="shadow-md border-slate-100 dark:border-slate-800">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Cari Kode Booking atau Nama Tamu..."
                                className="pl-9"
                                value={searchVal}
                                onChange={(e) => setSearchVal(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            />
                        </div>
                        <div className="w-full md:w-64">
                            <Select value={propertyId} onValueChange={setPropertyId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Unit Properti" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Unit Properti</SelectItem>
                                    {properties.map((p) => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={applyFilters} className="bg-blue-600 hover:bg-blue-700 font-bold px-6">
                            Filter
                        </Button>
                    </CardContent>
                </Card>

                {/* Bookings List Table */}
                <Card className="shadow-lg border-slate-100 dark:border-slate-800 overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/75 dark:bg-slate-900/50">
                                <TableRow>
                                    <TableHead className="font-bold py-4 pl-6">Kode Booking</TableHead>
                                    <TableHead className="font-bold py-4">Nama Tamu</TableHead>
                                    <TableHead className="font-bold py-4">Tanggal Inap</TableHead>
                                    <TableHead className="font-bold py-4">Unit / Properti</TableHead>
                                    <TableHead className="font-bold py-4 w-52">Closing / Input</TableHead>
                                    <TableHead className="font-bold py-4 w-52">Follow Up Booking</TableHead>
                                    <TableHead className="font-bold py-4 pr-6 text-right w-28">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center text-slate-400">
                                            Tidak ada data booking ditemukan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    bookings.data.map((b) => {
                                        const rowTemp = tempValues[b.id] || {
                                            closed_by: b.closed_by?.toString() || 'null',
                                            followed_up_by: b.followed_up_by?.toString() || 'null',
                                        };

                                        const isModified = 
                                            rowTemp.closed_by !== (b.closed_by?.toString() || 'null') ||
                                            rowTemp.followed_up_by !== (b.followed_up_by?.toString() || 'null');

                                        return (
                                            <TableRow key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                                                <TableCell className="font-black text-slate-800 dark:text-slate-200 py-4 pl-6">
                                                    <Link 
                                                        href={`/admin/bookings/${b.booking_number}`}
                                                        className="hover:underline text-blue-600"
                                                    >
                                                        {b.booking_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                                    {b.guest_name}
                                                </TableCell>
                                                <TableCell className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
                                                    {formatDate(b.check_in)} s.d {formatDate(b.check_out)}
                                                </TableCell>
                                                <TableCell className="text-slate-700 dark:text-slate-300">
                                                    <Badge variant="outline" className="gap-1 border-slate-200">
                                                        <Building2 className="h-3 w-3 text-slate-400" />
                                                        {b.property?.name || 'Unit'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={rowTemp.closed_by}
                                                        onValueChange={(val) => handleSelectChange(b.id, 'closed_by', val)}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Pilih Staff" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="null">-- Kosong --</SelectItem>
                                                            {staffUsers.map((st) => (
                                                                <SelectItem key={st.id} value={st.id.toString()}>
                                                                    {st.name} ({st.role})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={rowTemp.followed_up_by}
                                                        onValueChange={(val) => handleSelectChange(b.id, 'followed_up_by', val)}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Pilih Staff" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="null">-- Kosong --</SelectItem>
                                                            {staffUsers.map((st) => (
                                                                <SelectItem key={st.id} value={st.id.toString()}>
                                                                    {st.name} ({st.role})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleUpdate(b, rowTemp.closed_by, rowTemp.followed_up_by)}
                                                        disabled={updatingRowId === b.id || !isModified}
                                                        className={`h-8 font-bold ${
                                                            isModified 
                                                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' 
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200'
                                                        }`}
                                                    >
                                                        {updatingRowId === b.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Save className="h-3.5 w-3.5 mr-1" />
                                                                Simpan
                                                            </>
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {bookings.last_page > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                        {bookings.links.map((link, idx) => {
                            const isPrevOrNext = link.label.includes('Previous') || link.label.includes('Next');
                            
                            return (
                                <Link
                                    key={idx}
                                    href={link.url || '#'}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        link.active
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : !link.url
                                                ? 'text-slate-300 pointer-events-none'
                                                : 'bg-white hover:bg-slate-50 border text-slate-600'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
