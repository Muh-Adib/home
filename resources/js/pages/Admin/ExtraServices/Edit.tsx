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

interface Property {
    id: number;
    name: string;
}

interface EditExtraServiceProps {
    service: {
        id: number;
        name: string;
        description?: string;
        service_type: string;
        unit_price: number;
        vendor_unit_price?: number;
        discount_amount?: number;
        discount_limit?: number | null;
        thumbnail_url?: string;
        thumbnail_path?: string;
        is_active: boolean;
        sort_order: number;
        property_id?: number | null;
        is_default?: boolean;
        default_quantity?: number;
        default_frequency?: 'once' | 'per_night' | 'first_night' | 'first_two_nights';
        discount_frequency?: 'all' | 'first_night';
    };
    serviceTypes: Record<string, string>;
    properties: Property[];
}

export default function EditExtraService({ service, serviceTypes, properties = [] }: EditExtraServiceProps) {
    const { data, setData, post, processing, errors, transform } = useForm({
        name: service.name,
        description: service.description || '',
        service_type: service.service_type,
        unit_price: service.unit_price,
        vendor_unit_price: service.vendor_unit_price || 0,
        discount_amount: service.discount_amount || 0,
        discount_limit: service.discount_limit || '',
        is_active: service.is_active,
        sort_order: service.sort_order,
        thumbnail: null as File | null,
        property_id: service.property_id || '',
        is_default: !!service.is_default,
        default_quantity: service.default_quantity || 1,
        default_frequency: service.default_frequency || 'once',
        discount_frequency: service.discount_frequency || 'all',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        transform((data) => ({
            ...data,
            _method: 'PUT',
        }));
        post(route('admin.extra-services.update', { service: service.id }), {
            forceFormData: true,
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Extra Services', href: '/admin/extra-services' },
        { title: 'Edit Service', href: '' },
    ];

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${service.name}`} />

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
                            Edit Extra Service
                        </h1>
                        <p className="text-muted-foreground">
                            Update informasi layanan tambahan
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

                                    {/* Discount Frequency */}
                                    <div className="space-y-2">
                                        <Label htmlFor="discount_frequency">Frekuensi Diskon</Label>
                                        <Select
                                            value={data.discount_frequency}
                                            onValueChange={(value) => setData('discount_frequency', value as any)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih frekuensi diskon" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Setiap Tanggal Menginap</SelectItem>
                                                <SelectItem value="first_night">Hanya Tanggal Awal Menginap</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-sm text-muted-foreground">
                                            Tentukan apakah diskon potongan harga berlaku untuk seluruh malam atau hanya malam pertama saja.
                                        </p>
                                        {errors.discount_frequency && (
                                            <p className="text-sm text-red-600">{errors.discount_frequency}</p>
                                        )}
                                    </div>

                                    {/* Thumbnail Upload */}
                                    <ExtraServiceThumbnailUpload
                                        thumbnailUrl={service.thumbnail_url}
                                        onFileChange={(file) => setData('thumbnail', file)}
                                        error={errors.thumbnail}
                                    />
                                </CardContent>
                            </Card>

                            {/* Unit-specific & Default Inputs Config */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Spesifikasi Unit & Default Input</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Property filter */}
                                    <div className="space-y-2">
                                        <Label htmlFor="property_id">Dikhususkan Untuk Unit (Opsional)</Label>
                                        <Select
                                            value={data.property_id ? data.property_id.toString() : 'global'}
                                            onValueChange={(value) =>
                                                setData('property_id', value === 'global' ? '' : parseInt(value))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Semua Unit (Global)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="global">Semua Unit (Global)</SelectItem>
                                                {properties.map((p) => (
                                                    <SelectItem key={p.id} value={p.id.toString()}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-sm text-muted-foreground">
                                            Pilih jika layanan ini hanya boleh muncul untuk unit tertentu saja.
                                        </p>
                                        {errors.property_id && (
                                            <p className="text-sm text-red-600">{errors.property_id}</p>
                                        )}
                                    </div>

                                    {/* is_default Switch */}
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label htmlFor="is_default">Jadikan Default Terpilih</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Secara otomatis tercentang/aktif saat input booking baru
                                            </p>
                                        </div>
                                        <Switch
                                            id="is_default"
                                            checked={data.is_default}
                                            onCheckedChange={(checked) => setData('is_default', checked)}
                                        />
                                    </div>

                                    {/* default_quantity Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="default_quantity">Jumlah Default</Label>
                                        <Input
                                            id="default_quantity"
                                            type="number"
                                            value={data.default_quantity}
                                            onChange={(e) =>
                                                setData('default_quantity', parseInt(e.target.value) || 1)
                                            }
                                            min="1"
                                            required
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Jumlah awal item yang terisi otomatis saat layanan ini dipilih/aktif
                                        </p>
                                        {errors.default_quantity && (
                                            <p className="text-sm text-red-600">{errors.default_quantity}</p>
                                        )}
                                    </div>

                                    {/* default_frequency Select */}
                                    <div className="space-y-2">
                                        <Label htmlFor="default_frequency">Frekuensi Default</Label>
                                        <Select
                                            value={data.default_frequency}
                                            onValueChange={(value) => setData('default_frequency', value as any)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih frekuensi default" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="once">Sekali per Booking (Global)</SelectItem>
                                                <SelectItem value="per_night">Setiap Malam Menginap (Harian)</SelectItem>
                                                <SelectItem value="first_night">Malam Pertama Saja (Awal 1 Malam)</SelectItem>
                                                <SelectItem value="first_two_nights">Dua Malam Pertama Saja (Awal 2 Malam)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-sm text-muted-foreground">
                                            Aturan pengulangan tanggal otomatis untuk layanan ini
                                        </p>
                                        {errors.default_frequency && (
                                            <p className="text-sm text-red-600">{errors.default_frequency}</p>
                                        )}
                                    </div>
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
                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}

