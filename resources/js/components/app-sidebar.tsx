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
    ListChecks,
    LucideIcon,
    Sparkles,
    ClipboardList,
    CheckCircle,
    MapPin
} from 'lucide-react';
import AppLogo from './app-logo';
import { NotificationBell } from './notifications/notification-bell';
import { useTranslation } from 'react-i18next';

// Helper function untuk role-based navigation
const getNavItemsForRole = (userRole: User['role']): (NavItem & { title: string, href: string, icon: LucideIcon })[] => {
    const baseItems = [
        { title: 'dashboard', href: '/dashboard', icon: LayoutGrid },
    ];

    const roleBasedItems: Record<User['role'], (NavItem & { title: string, href: string, icon: LucideIcon })[]> = {
        super_admin: [
            ...baseItems,
            { title: 'properties', href: '/admin/properties', icon: Building2 },
            { title: 'bookings', href: '/admin/bookings', icon: Calendar },
            { title: 'payments', href: '/admin/payments', icon: CreditCard },
            { title: 'users', href: '/admin/users', icon: Users },
            { title: 'cleaning_tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
            { title: 'cleaning_schedules', href: '/admin/cleaning-schedules', icon: Calendar },
            { title: 'cleaning_staff', href: '/admin/cleaning-staff', icon: Sparkles },
            { title: 'reports', href: '/admin/reports', icon: BarChart3 },
            { title: 'amenities', href: '/admin/amenities', icon: Package },
            { title: 'settings', href: '/admin/settings', icon: Settings },
        ],
        property_owner: [
            ...baseItems,
            { title: 'my_properties', href: '/admin/properties', icon: Building2 },
            { title: 'bookings', href: '/admin/bookings', icon: Calendar },
            { title: 'payments', href: '/admin/payments', icon: CreditCard },
            { title: 'cleaning_tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
            { title: 'cleaning_staff', href: '/admin/cleaning-staff', icon: Sparkles },
            { title: 'reports', href: '/admin/reports', icon: BarChart3 },
        ],
        property_manager: [
            ...baseItems,
            { title: 'properties', href: '/admin/properties', icon: Building2 },
            { title: 'bookings', href: '/admin/bookings', icon: Calendar },
            { title: 'payments', href: '/admin/payments', icon: CreditCard },
            { title: 'cleaning_tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
            { title: 'cleaning_staff', href: '/admin/cleaning-staff', icon: Sparkles },
            { title: 'reports', href: '/admin/reports', icon: BarChart3 },
        ],
        front_desk: [
            ...baseItems,
            { title: 'bookings', href: '/admin/bookings', icon: Calendar },
            { title: 'check_in_out', href: '/admin/checkin', icon: Shield },
            { title: 'cleaning_staff', href: '/admin/cleaning-staff', icon: Sparkles },
        ],
        finance: [
            ...baseItems,
            { title: 'payments', href: '/admin/payments', icon: CreditCard },
            { title: 'financial_reports', href: '/admin/reports/financial', icon: DollarSign },
            { title: 'expenses', href: '/admin/expenses', icon: FileText },
        ],
        housekeeping: [
            ...baseItems,
            { title: 'cleaning_tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
            { title: 'cleaning_staff', href: '/admin/cleaning-staff', icon: Sparkles },
            { title: 'cleaning_schedules', href: '/admin/cleaning-schedules', icon: Calendar },
            { title: 'room_status', href: '/admin/rooms', icon: Wrench },
            { title: 'maintenance', href: '/admin/maintenance', icon: Settings },
        ],
        guest: [
            { title: 'browse_properties', href: '/properties', icon: Home },
            { title: 'my_bookings', href: '/my-bookings', icon: Calendar },
            { title: 'my_payments', href: '/my-payments', icon: CreditCard },
        ],
    };

    return roleBasedItems[userRole] || baseItems;
};

const footerNavItems: (NavItem & { title: string, href: string, icon: LucideIcon })[] = [
    { title: 'documentation', href: '/help', icon: FileText },
    { title: 'support', href: '/support', icon: Settings },
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
