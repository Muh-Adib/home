import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import PropertyForm, { PropertyFormData } from '@/components/Features/PropertyForm';
import { Amenity, BreadcrumbItem } from '@/types';

interface Owner {
    id: number;
    name: string;
    email: string;
}

interface CreatePropertyProps {
    amenities: Amenity[];
    owners?: Owner[];
    bankAccounts: any[];
    paymentMethods?: any[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Properties', href: '/admin/properties' },
    { title: 'Create', href: '#' },
];

const DEFAULT_FORM: PropertyFormData = {
    name: '',
    type: 'homestay',
    description: '',
    address: '',
    location: 'selatan',
    lat: null,
    lng: null,
    maps_link: '',
    tiktok_video_url: '',
    capacity: 2,
    capacity_max: 4,
    bedroom_count: 1,
    bathroom_count: 1,
    base_rate: 500000,
    weekend_premium_percent: 20,
    weekend_premium_type: 'percentage',
    weekend_premium_fixed: 0,
    cleaning_fee: 0,
    extra_bed_rate: 0,
    status: 'active',
    house_rules: '',
    check_in_time: '14:00',
    check_out_time: '12:00',
    min_stay_weekday: 1,
    min_stay_weekend: 2,
    min_stay_peak: 3,
    is_featured: false,
    seo_title: '',
    seo_description: '',
    amenities: [],
    current_keybox_code: '',
    checkin_instructions: {
        welcome: 'Selamat datang!',
        keybox_location: 'Keybox terletak di depan pintu masuk',
        keybox_code: 'Kode keybox: {{keybox_code}}',
        checkin_time: 'Check-in time: 14:00 - 22:00',
        emergency_contact: 'Hubungi kami jika ada kendala: 0811-2500-082',
        wifi_name: '',
        wifi_password: '',
        additional_info: ['WiFi password tersedia di dalam rumah', 'Harap menjaga kebersihan selama menginap'],
    },
    ical_import_urls: [''],
    ical_export_token: '',
    files: [],
    ownership_model: 'owned',
    initial_build_capital: 0,
    lease_capital: 0,
    monthly_rent_cost: 0,
    monthly_mortgage_cost: 0,
    mortgage_interest_monthly: 0,
    owner_split_pct: 100,
    investor_split_pct: 0,
    bank_account_id: '',
    payment_method_id: '',
};

export default function CreateProperty({ amenities, owners, bankAccounts = [], paymentMethods = [] }: CreatePropertyProps) {
    const { data, setData, post, processing, errors } = useForm<PropertyFormData>(DEFAULT_FORM);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/properties', {
            onSuccess: () => console.log('Property created'),
            onError: (errs) => console.error('Create failed:', errs),
        });
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Property - Admin Dashboard" />
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create Property</h1>
                    <p className="text-muted-foreground text-sm">Add a new property to your portfolio</p>
                </div>
                <PropertyForm
                    mode="create"
                    data={data}
                    setData={setData as any}
                    errors={errors}
                    processing={processing}
                    onSubmit={handleSubmit}
                    amenities={amenities}
                    owners={owners}
                    bankAccounts={bankAccounts}
                    paymentMethods={paymentMethods}
                />
            </div>
        </AdminLayout>
    );
}
