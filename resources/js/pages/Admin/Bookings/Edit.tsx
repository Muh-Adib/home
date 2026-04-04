import React from 'react';
import { useTranslation } from 'react-i18next';
import { type BreadcrumbItem, type Booking, type Property } from '@/types';
import AdminLayout from '@/layouts/admin-layout';
import BookingForm, { type PaymentMethod } from './BookingForm';
import { type ServiceMaster } from '@/components/ExtraServiceSelector';

interface BookingEditProps {
    booking: Booking;
    properties: Property[];
    paymentMethods: PaymentMethod[];
    serviceMasters: ServiceMaster[];
}

export default function BookingEdit({ booking, properties, paymentMethods, serviceMasters = [] }: BookingEditProps) {
    const { t } = useTranslation();

    // Breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings', href: '/admin/bookings' },
        { title: 'Details', href: `/admin/bookings/${booking.booking_number}` },
        { title: 'Edit' },
    ];

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Edit Booking" subtitle="Edit booking details">
            <div className="pb-32 lg:pb-0">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-brand-primary">Ubah Booking</h1>
                    <p className="text-muted-foreground mt-1">
                        Ubah detail booking untuk {booking.booking_number}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <BookingForm
                            mode="edit"
                            initialData={booking}
                            properties={properties}
                            paymentMethods={paymentMethods}
                            serviceMasters={serviceMasters}
                            bookingNumber={booking.booking_number}
                        />
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}