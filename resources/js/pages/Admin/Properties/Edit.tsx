import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import PropertyForm, { PropertyFormData } from '@/components/Features/PropertyForm';
import { Button } from '@/components/ui/button';
import { Amenity, Property, BreadcrumbItem, PageProps } from '@/types';
import { ArrowLeft, Eye } from 'lucide-react';

interface Owner {
    id: number;
    name: string;
    email: string;
}

interface EditPropertyProps extends PageProps {
    property: Property & { amenities: Amenity[] };
    amenities: Amenity[];
    owners?: Owner[];
}

export default function EditProperty({ property, amenities, owners }: EditPropertyProps) {
    const { data, setData, put, processing, errors } = useForm<PropertyFormData>({
        name: property.name || '',
        type: property.type || 'homestay',
        description: property.description || '',
        address: property.address || '',
        location: property.location || 'selatan',
        lat: property.lat || null,
        lng: property.lng || null,
        maps_link: property.maps_link || '',
        tiktok_video_url: property.tiktok_video_url || '',
        capacity: property.capacity || 2,
        capacity_max: property.capacity_max || 4,
        bedroom_count: property.bedroom_count || 1,
        bathroom_count: property.bathroom_count || 1,
        base_rate: property.base_rate || 500000,
        weekend_premium_percent: property.weekend_premium_percent || 20,
        weekend_premium_type: property.weekend_premium_type || 'percentage',
        weekend_premium_fixed: property.weekend_premium_fixed || 0,
        cleaning_fee: property.cleaning_fee || 100000,
        extra_bed_rate: property.extra_bed_rate || 50000,
        status: property.status || 'active',
        house_rules: property.house_rules || '',
        check_in_time: property.check_in_time || '14:00',
        check_out_time: property.check_out_time || '12:00',
        min_stay_weekday: property.min_stay_weekday || 1,
        min_stay_weekend: property.min_stay_weekend || 2,
        min_stay_peak: property.min_stay_peak || 3,
        is_featured: property.is_featured || false,
        seo_title: property.seo_title || '',
        seo_description: property.seo_description || '',
        amenities: property.amenities?.map((a: Amenity) => a.id) || [],
        current_keybox_code: property.current_keybox_code || '',
        checkin_instructions: {
            welcome: property.checkin_instructions?.welcome ?? 'Selamat datang!',
            keybox_location: property.checkin_instructions?.keybox_location ?? 'Keybox terletak di depan pintu masuk',
            keybox_code: property.checkin_instructions?.keybox_code ?? 'Kode keybox: {{keybox_code}}',
            checkin_time: property.checkin_instructions?.checkin_time ?? 'Check-in time: 14:00 - 22:00',
            emergency_contact: property.checkin_instructions?.emergency_contact ?? 'Hubungi kami jika ada kendala: 0811-2500-082',
            additional_info: property.checkin_instructions?.additional_info ?? ['WiFi password tersedia di dalam rumah', 'Harap menjaga kebersihan selama menginap'],
        },
        ical_import_urls: (property.ical_import_urls && property.ical_import_urls.length > 0)
            ? property.ical_import_urls.map(u => u || '') : [''],
        ical_export_token: property.ical_export_token || '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Properties', href: '/admin/properties' },
        { title: property.name, href: `/admin/properties/${property.slug}` },
        { title: 'Edit', href: '' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/admin/properties/${property.slug}`, {
            onSuccess: () => console.log('Property updated'),
            onError: (errs) => console.error('Update failed:', errs),
        });
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${property.name} - Admin Dashboard`} />
            <div className="p-4 md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Edit Property</h1>
                        <p className="text-muted-foreground text-sm">Update property info and settings</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/properties/${property.slug}`}>
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/properties/${property.slug}`} target="_blank">
                                <Eye className="h-4 w-4 mr-1" /> Preview
                            </Link>
                        </Button>
                    </div>
                </div>
                <PropertyForm
                    mode="edit"
                    data={data}
                    setData={setData as any}
                    errors={errors}
                    processing={processing}
                    onSubmit={handleSubmit}
                    amenities={amenities}
                    owners={owners}
                    property={property}
                />
            </div>
        </AdminLayout>
    );
}
