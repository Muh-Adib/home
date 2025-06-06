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
    Wrench
} from 'lucide-react';
import AppLogo from './app-logo';

// Helper function untuk role-based navigation
const getNavItemsForRole = (userRole: User['role']): NavItem[] => {
    const baseItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
            icon: LayoutGrid,
        },
    ];

    const roleBasedItems: Record<User['role'], NavItem[]> = {
        super_admin: [
            ...baseItems,
            {
                title: 'Properties',
                href: '/admin/properties',
                icon: Building2,
            },
            {
                title: 'Bookings',
                href: '/admin/bookings',
                icon: Calendar,
            },
            {
                title: 'Payments',
                href: '/admin/payments',
                icon: CreditCard,
            },
            {
                title: 'Users',
                href: '/admin/users',
                icon: Users,
            },
            {
                title: 'Reports',
                href: '/admin/reports',
                icon: BarChart3,
            },
            {
                title: 'Amenities',
                href: '/admin/amenities',
                icon: Package,
            },
            {
                title: 'Settings',
                href: '/admin/settings',
                icon: Settings,
            },
        ],
        property_owner: [
            ...baseItems,
            {
                title: 'My Properties',
                href: '/admin/properties',
                icon: Building2,
            },
            {
                title: 'Bookings',
                href: '/admin/bookings',
                icon: Calendar,
            },
            {
                title: 'Payments',
                href: '/admin/payments',
                icon: CreditCard,
            },
            {
                title: 'Reports',
                href: '/admin/reports',
                icon: BarChart3,
            },
        ],
        property_manager: [
            ...baseItems,
            {
                title: 'Properties',
                href: '/admin/properties',
                icon: Building2,
            },
            {
                title: 'Bookings',
                href: '/admin/bookings',
                icon: Calendar,
            },
            {
                title: 'Payments',
                href: '/admin/payments',
                icon: CreditCard,
            },
            {
                title: 'Reports',
                href: '/admin/reports',
                icon: BarChart3,
            },
        ],
        front_desk: [
            ...baseItems,
            {
                title: 'Bookings',
                href: '/admin/bookings',
                icon: Calendar,
            },
            {
                title: 'Check In/Out',
                href: '/admin/checkin',
                icon: Shield,
            },
        ],
        finance: [
            ...baseItems,
            {
                title: 'Payments',
                href: '/admin/payments',
                icon: CreditCard,
            },
            {
                title: 'Financial Reports',
                href: '/admin/reports/financial',
                icon: DollarSign,
            },
            {
                title: 'Expenses',
                href: '/admin/expenses',
                icon: FileText,
            },
        ],
        housekeeping: [
            ...baseItems,
            {
                title: 'Room Status',
                href: '/admin/rooms',
                icon: Wrench,
            },
            {
                title: 'Maintenance',
                href: '/admin/maintenance',
                icon: Settings,
            },
        ],
        guest: [
            {
                title: 'Browse Properties',
                href: '/properties',
                icon: Home,
            },
            {
                title: 'My Bookings',
                href: '/my-bookings',
                icon: Calendar,
            },
        ],
    };

    return roleBasedItems[userRole] || baseItems;
};

const footerNavItems: NavItem[] = [
    {
        title: 'Documentation',
        href: '/help',
        icon: FileText,
    },
    {
        title: 'Support',
        href: '/support',
        icon: Shield,
    },
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
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
