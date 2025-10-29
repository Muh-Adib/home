import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem } from '@/types';

import GuestLayout from '@/layouts/guest-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    return (
        <GuestLayout showHeader showFooter variant="default">
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-brand-primary-10 to-brand-primary-20 rounded-lg p-6 border border-brand-primary-20">
                        <HeadingSmall title="Appearance settings" description="Update your account's appearance settings" />
                    </div>
                    <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                        <AppearanceTabs />
                    </div>
                </div>
            </SettingsLayout>
        </GuestLayout>
    );
}
