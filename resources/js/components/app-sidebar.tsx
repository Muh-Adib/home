import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type User, type PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { 
    Building2, 
    Calendar, 
    CreditCard, 
    DollarSign, 
    FileText, 
    LayoutGrid, 
    Settings, 
    Users, 
    Home,
    Package,
    BarChart3,
    Shield,
    Wrench,
    ListChecks
} from 'lucide-react';
import AppLogo from './app-logo';
import { NotificationBell } from './notifications/notification-bell';
import { useTranslation } from 'react-i18next';

// Helper function untuk role-based navigation
const getNavItemsForRole = (userRole: User['role']): (NavItem & { key: NavKey })[] => {
    const baseItems = [
        { key: 'dashboard', title: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    ];

    const roleBasedItems: Record<User['role'], (NavItem & { key: NavKey })[]> = {
        super_admin: [
            ...baseItems,
            { key: 'properties', href: '/admin/properties', icon: Building2 },
            { key: 'bookings', href: '/admin/bookings', icon: Calendar },
            { key: 'payments', href: '/admin/payments', icon: CreditCard },
            { key: 'users', href: '/admin/users', icon: Users },
            { key: 'cleaning_tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
            { key: 'cleaning_schedules', href: '/admin/cleaning-schedules', icon: Calendar },
            { key: 'reports', href: '/admin/reports', icon: BarChart3 },
            { key: 'amenities', href: '/admin/amenities', icon: Package },
            { key: 'settings', href: '/admin/settings', icon: Settings },
        ],
        property_owner: [
            ...baseItems,
            { key: 'my_properties', href: '/admin/properties', icon: Building2 },
            { key: 'bookings', href: '/admin/bookings', icon: Calendar },
            { key: 'payments', href: '/admin/payments', icon: CreditCard },
            { key: 'reports', href: '/admin/reports', icon: BarChart3 },
        ],
        property_manager: [
            ...baseItems,
            { key: 'properties', href: '/admin/properties', icon: Building2 },
            { key: 'bookings', href: '/admin/bookings', icon: Calendar },
            { key: 'payments', href: '/admin/payments', icon: CreditCard },
            { key: 'reports', href: '/admin/reports', icon: BarChart3 },
        ],
        front_desk: [
            ...baseItems,
            { key: 'bookings', href: '/admin/bookings', icon: Calendar },
            { key: 'check_in_out', href: '/admin/checkin', icon: Shield },
        ],
        finance: [
            ...baseItems,
            { key: 'payments', href: '/admin/payments', icon: CreditCard },
            { key: 'financial_reports', href: '/admin/reports/financial', icon: DollarSign },
            { key: 'expenses', href: '/admin/expenses', icon: FileText },
        ],
        housekeeping: [
            ...baseItems,
            { key: 'room_status', href: '/admin/rooms', icon: Wrench },
            { key: 'maintenance', href: '/admin/maintenance', icon: Settings },
        ],
        guest: [
            { key: 'browse_properties', href: '/properties', icon: Home },
            { key: 'my_bookings', href: '/my-bookings', icon: Calendar },
        ],
    };

    return roleBasedItems[userRole] || baseItems;
};

const footerNavItems: (NavItem & { key: 'documentation' | 'support' })[] = [
    { key: 'documentation', href: '/help', icon: FileText },
    { key: 'support', href: '/support', icon: Settings },
];

export function AppSidebar() {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const navItems = getNavItemsForRole(auth.user.role);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" /> 
                {/* Notification Bell - Show for all authenticated users except guests */}
                 {auth.user.role !== 'guest' && (
                                <NotificationBell 
                                    userId={auth.user.id} 
                                    className="ml-1" 
                                />
                            )}
                <NavUser />
                
            </SidebarFooter>
        </Sidebar>
    );
}
