import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Building2, TrendingUp, Users, Calendar, CreditCard,
    CheckCircle, DollarSign, Home, AlertCircle
} from 'lucide-react';
import { User } from '@/types';
import { Link } from '@inertiajs/react';

interface RoleBasedActionsProps {
    user: User;
}

export function QuickActions({ user }: RoleBasedActionsProps) {
    const getActionsForRole = (role: User['role']) => {
        const roleActions: Record<User['role'], Array<{ title: string; href: string; icon: any; variant?: 'default' | 'secondary' | 'outline' }>> = {
            super_admin: [
                { title: 'Add Property', href: '/admin/properties/create', icon: Building2 },
                { title: 'View Reports', href: '/admin/reports', icon: TrendingUp, variant: 'secondary' },
                { title: 'Manage Users', href: '/admin/users', icon: Users, variant: 'outline' },
            ],
            property_owner: [
                { title: 'Add Property', href: '/admin/properties/create', icon: Building2 },
                { title: 'View Reports', href: '/admin/reports', icon: TrendingUp, variant: 'secondary' },
            ],
            property_manager: [
                { title: 'New Booking', href: '/admin/bookings/create', icon: Calendar },
                { title: 'Check Payments', href: '/admin/payments', icon: CreditCard, variant: 'secondary' },
            ],
            front_desk: [
                { title: 'Check In Guest', href: '/admin/checkin', icon: CheckCircle },
                { title: 'View Bookings', href: '/admin/bookings', icon: Calendar, variant: 'secondary' },
            ],
            finance: [
                { title: 'Verify Payments', href: '/admin/payments', icon: CreditCard },
                { title: 'Financial Report', href: '/admin/reports/financial', icon: DollarSign, variant: 'secondary' },
            ],
            housekeeping: [
                { title: 'Room Status', href: '/admin/rooms', icon: Home },
                { title: 'Maintenance Log', href: '/admin/maintenance', icon: AlertCircle, variant: 'secondary' },
            ],
            guest: [
                { title: 'Browse Properties', href: '/properties', icon: Building2 },
                { title: 'My Bookings', href: '/my-bookings', icon: Calendar, variant: 'secondary' },
            ],
        };

        return roleActions[role] || [];
    };

    const actions = getActionsForRole(user.role);

    if (actions.length === 0) return null;

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    Quick Actions
                </CardTitle>
                <CardDescription>Frequently used actions for your role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={index}
                                variant={action.variant || 'default'}
                                className="justify-start h-auto p-4 text-left group relative overflow-hidden"
                                asChild
                            >
                                <Link href={action.href}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                                    <span className="font-medium">{action.title}</span>
                                </Link>
                            </Button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
