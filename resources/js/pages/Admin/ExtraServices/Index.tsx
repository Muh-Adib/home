import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface ServiceMaster {
    id: number;
    name: string;
    description?: string;
    service_type: string;
    service_type_label: string;
    unit_price: number;
    thumbnail_url?: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

interface ExtraServicesIndexProps {
    services: {
        data: ServiceMaster[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        prev_page_url?: string;
        next_page_url?: string;
    };
    filters: {
        search?: string;
        service_type?: string;
        status?: string;
    };
    serviceTypes: Record<string, string>;
}

export default function ExtraServicesIndex({ services, filters, serviceTypes }: ExtraServicesIndexProps) {
    const [search, setSearch] = useState(filters?.search || '');
    const [typeFilter, setTypeFilter] = useState(filters?.service_type || 'all');
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [selectedService, setSelectedService] = useState<ServiceMaster | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const { processing, delete: deleteService } = useForm();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Extra Services', href: '#' },
    ];

    const handleSearch = () => {
        const params: any = {};
        if (search) params.search = search;
        if (typeFilter !== 'all') params.service_type = typeFilter;
        if (statusFilter !== 'all') params.status = statusFilter;

        router.get('/admin/extra-services', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setSearch('');
        setTypeFilter('all');
        setStatusFilter('all');
        router.get('/admin/extra-services');
    };

    const handleDelete = (service: ServiceMaster) => {
        setSelectedService(service);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (selectedService) {
            deleteService(route('admin.extra-services.destroy', selectedService.id), {
                onSuccess: () => {
                    setShowDeleteDialog(false);
                    setSelectedService(null);
                },
            });
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const activeCount = services.data.filter(s => s.is_active).length;
    const inactiveCount = services.total - activeCount;

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Extra Services Management" />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Extra Services Management</h1>
                        <p className="text-gray-600 mt-1">Kelola layanan tambahan yang tersedia untuk booking</p>
                    </div>
                    <Link href={route('admin.extra-services.create')}>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Service
                        </Button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{services.total}</div>
                            <p className="text-gray-600">Total Services</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                            <p className="text-gray-600">Active Services</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold text-gray-500">{inactiveCount}</div>
                            <p className="text-gray-600">Inactive Services</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <Input
                                    placeholder="Cari nama atau deskripsi..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full"
                                />
                            </div>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua Tipe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Tipe</SelectItem>
                                    {Object.entries(serviceTypes).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button onClick={handleSearch}>
                                <Search className="w-4 h-4 mr-2" />
                                Cari
                            </Button>
                            <Button variant="outline" onClick={clearFilters}>
                                Reset
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Services List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Services</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {services.data.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Tidak ada service ditemukan</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4">Thumbnail</th>
                                            <th className="text-left py-3 px-4">Nama</th>
                                            <th className="text-left py-3 px-4">Tipe</th>
                                            <th className="text-left py-3 px-4">Harga</th>
                                            <th className="text-left py-3 px-4">Status</th>
                                            <th className="text-left py-3 px-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {services.data.map((service) => (
                                            <tr key={service.id} className="border-b hover:bg-gray-50">
                                                <td className="py-3 px-4">
                                                    {service.thumbnail_url ? (
                                                        <img
                                                            src={service.thumbnail_url}
                                                            alt={service.name}
                                                            className="w-16 h-16 object-cover rounded"
                                                        />
                                                    ) : (
                                                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                                            <ImageIcon className="w-6 h-6 text-gray-400" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <div className="font-medium">{service.name}</div>
                                                        {service.description && (
                                                            <div className="text-sm text-gray-500">
                                                                {service.description.substring(0, 50)}
                                                                {service.description.length > 50 && '...'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge variant="outline">
                                                        {service.service_type_label}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-medium">
                                                        {formatPrice(service.unit_price)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge variant={service.is_active ? 'default' : 'secondary'}>
                                                        {service.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex space-x-2">
                                                        <Link href={route('admin.extra-services.edit', service.id)}>
                                                            <Button variant="outline" size="sm">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600"
                                                            onClick={() => handleDelete(service)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {(services.last_page > 1) && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-gray-600">
                                    Menampilkan {((services.current_page - 1) * services.per_page) + 1} sampai{' '}
                                    {Math.min(services.current_page * services.per_page, services.total)} dari{' '}
                                    {services.total} service
                                </div>
                                <div className="flex gap-2">
                                    {services.prev_page_url && (
                                        <Button
                                            variant="outline"
                                            onClick={() => router.get(services.prev_page_url!)}
                                        >
                                            Previous
                                        </Button>
                                    )}
                                    {services.next_page_url && (
                                        <Button
                                            variant="outline"
                                            onClick={() => router.get(services.next_page_url!)}
                                        >
                                            Next
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Service</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus service "{selectedService?.name}"? 
                            Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={processing}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={processing}
                        >
                            {processing ? 'Menghapus...' : 'Hapus'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

