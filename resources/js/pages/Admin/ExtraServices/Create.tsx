import React, { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { BreadcrumbItem } from '@/types';
import ExtraServiceThumbnailUpload from '@/components/ExtraServiceThumbnailUpload';

interface CreateExtraServiceProps {
    serviceTypes: Record<string, string>;
}

export default function CreateExtraService({ serviceTypes }: CreateExtraServiceProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        service_type: '',
        unit_price: 0,
        vendor_unit_price: 0,
        discount_amount: 0,
        discount_limit: '' as string | number,
        is_active: true,
        sort_order: 0,
        thumbnail: null as File | null,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('admin.extra-services.store'), {
            forceFormData: true,
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Extra Services', href: '/admin/extra-services' },
        { title: 'Create Service', href: '' },
    ];

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Extra Service" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/extra-services">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Link>
                    </Button>

                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Tambah Extra Service
                        </h1>
                        <p className="text-muted-foreground">
                            Tambahkan layanan tambahan baru untuk booking
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informasi Dasar</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Name */}
                                    <div className="space-y-2">
                                        <Label htmlFor="name">
                                            Nama Service <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="Contoh: Extra Bed, Sarapan Pagi, dll"
                                            required
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-red-600">{errors.name}</p>
                                        )}
                                    </div>

                                    {/* Service Type */}
                                    <div className="space-y-2">
                                        <Label htmlFor="service_type">
                                            Tipe Service <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={data.service_type}
                                            onValueChange={(value) => setData('service_type', value)}
                                            required
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih tipe service" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(serviceTypes).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.service_type && (
                                            <p className="text-sm text-red-600">{errors.service_type}</p>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Deskripsi</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Deskripsi service (opsional)"
                                            rows={3}
                                        />
                                        {errors.description && (
                                            <p className="text-sm text-red-600">{errors.description}</p>
                                        )}
                                    </div>

                                    {/* Unit Price */}
                                    <div className="space-y-2">
                                        <Label htmlFor="unit_price">
                                            Harga Kita (Harga Jual) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="unit_price"
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={data.unit_price}
                                            onChange={(e) =>
                                                setData('unit_price', parseFloat(e.target.value) || 0)
                                            }
                                            placeholder="0"
                                            required
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Harga jual ke tamu per unit service (dalam Rupiah)
                                        </p>
                                        {errors.unit_price && (
                                            <p className="text-sm text-red-600">{errors.unit_price}</p>
                                        )}
                                    </div>

                                    {/* Vendor Unit Price */}
                                    <div className="space-y-2">
                                        <Label htmlFor="vendor_unit_price">Harga Vendor (Harga Beli)</Label>
                                        <Input
                                            id="vendor_unit_price"
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={data.vendor_unit_price}
                                            onChange={(e) =>
                                                setData('vendor_unit_price', parseFloat(e.target.value) || 0)
                                            }
                                            placeholder="0"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Harga beli/dasar dari vendor per unit service
                                        </p>
                                        {errors.vendor_unit_price && (
                                            <p className="text-sm text-red-600">{errors.vendor_unit_price}</p>
                                        )}
                                    </div>

                                    {/* Discount Amount */}
                                    <div className="space-y-2">
                                        <Label htmlFor="discount_amount">Nominal Diskon</Label>
                                        <Input
                                            id="discount_amount"
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={data.discount_amount}
                                            onChange={(e) =>
                                                setData('discount_amount', parseFloat(e.target.value) || 0)
                                            }
                                            placeholder="0"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Potongan harga untuk item ini (dalam Rupiah)
                                        </p>
                                        {errors.discount_amount && (
                                            <p className="text-sm text-red-600">{errors.discount_amount}</p>
                                        )}
                                    </div>

                                    {/* Discount Limit */}
                                    <div className="space-y-2">
                                        <Label htmlFor="discount_limit">Batas Jumlah Diskon (Opsional)</Label>
                                        <Input
                                            id="discount_limit"
                                            type="number"
                                            min="1"
                                            value={data.discount_limit}
                                            onChange={(e) =>
                                                setData('discount_limit', e.target.value ? parseInt(e.target.value) : '')
                                            }
                                            placeholder="Misal: 2 (diskon hanya berlaku untuk 2 pesanan awal)"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Kosongkan jika diskon berlaku untuk seluruh pesanan tanpa batas
                                        </p>
                                        {errors.discount_limit && (
                                            <p className="text-sm text-red-600">{errors.discount_limit}</p>
                                        )}
                                    </div>

                                    {/* Thumbnail Upload */}
                                    <ExtraServiceThumbnailUpload
                                        onFileChange={(file) => setData('thumbnail', file)}
                                        error={errors.thumbnail}
                                    />
                                </CardContent>
                            </Card>

                            {/* Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Pengaturan</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Active Status */}
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label htmlFor="is_active">Status Aktif</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Service akan langsung tersedia untuk dipilih
                                            </p>
                                        </div>
                                        <Switch
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => setData('is_active', checked)}
                                        />
                                    </div>

                                    {/* Sort Order */}
                                    <div className="space-y-2">
                                        <Label htmlFor="sort_order">Urutan Tampil</Label>
                                        <Input
                                            id="sort_order"
                                            type="number"
                                            value={data.sort_order}
                                            onChange={(e) =>
                                                setData('sort_order', parseInt(e.target.value) || 0)
                                            }
                                            placeholder="0"
                                            min="0"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Angka lebih kecil akan ditampilkan lebih dulu
                                        </p>
                                        {errors.sort_order && (
                                            <p className="text-sm text-red-600">{errors.sort_order}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-6 border-t">
                        <Button type="button" variant="outline" asChild>
                            <Link href="/admin/extra-services">Batal</Link>
                        </Button>

                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Menyimpan...' : 'Simpan Service'}
                        </Button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}

