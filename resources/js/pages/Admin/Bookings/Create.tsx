import React from 'react';
import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { type BreadcrumbItem, type Property } from '@/types';
import AdminLayout from '@/layouts/admin-layout';
import BookingForm, { type PaymentMethod } from './BookingForm';
import { type ServiceMaster } from '@/components/ExtraServiceSelector';

interface CreateBookingProps {
    properties: Property[];
    selectedProperty?: Property | null;
    prefilledData?: {
        property_id?: string;
        check_in_date?: string;
        check_out_date?: string;
    };
    availabilityData?: any;
    paymentMethods: PaymentMethod[];
    bankAccounts?: any[];
    serviceMasters?: ServiceMaster[];
    staffUsers?: any[];
}

export default function CreateBooking({
    properties,
    selectedProperty,
    prefilledData,
    paymentMethods,
    bankAccounts = [],
    serviceMasters = [],
    staffUsers = []
}: CreateBookingProps) {
    const { t } = useTranslation();

    // Breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings', href: '/admin/bookings' },
        { title: 'Create Booking' },
    ];

    // Prepare initial data
    const initialData = {
        property_id: prefilledData?.property_id ? Number(prefilledData.property_id) : (selectedProperty?.id || undefined),
        check_in: prefilledData?.check_in_date,
        check_out: prefilledData?.check_out_date,
        property: selectedProperty || undefined,
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Booking Create" subtitle="Create Booking">
            <div className="pb-32 lg:pb-0">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-brand-primary">Buat Booking Baru</h1>
                    <p className="text-muted-foreground mt-1">
                        Buat booking baru untuk tamu dengan ketersediaan dan harga real-time
                    </p>
                </div>

                <BookingForm
                    mode="create"
                    initialData={initialData}
                    properties={properties}
                    paymentMethods={paymentMethods}
                    bankAccounts={bankAccounts}
                    serviceMasters={serviceMasters}
                    staffUsers={staffUsers}
                />
            </div>
        </AdminLayout>
    );
}