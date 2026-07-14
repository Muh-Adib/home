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
    MapPin,
    TrendingUp,
    Bell,
    HelpCircle,
    LogOut,
    Coins,
    UserCheck
} from 'lucide-react';
import AppLogo from './app-logo';
import { NotificationBell } from './notifications/notification-bell';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// Helper function untuk role-based navigation dengan grouping yang lebih baik
const getNavItemsForRole = (userRole: User['role']): {
    main: (NavItem & { title: string, href: string, icon: LucideIcon })[];
    management: (NavItem & { title: string, href: string, icon: LucideIcon })[];
    operations: (NavItem & { title: string, href: string, icon: LucideIcon })[];
    analytics: (NavItem & { title: string, href: string, icon: LucideIcon })[];
} => {
    const baseItems = {
        main: [
            { title: 'dashboard', href: '/dashboard', icon: LayoutGrid },
        ],
        management: [],
        operations: [],
        analytics: []
    };

    const roleBasedItems: Partial<Record<User['role'], {
        main?: (NavItem & { title: string, href: string, icon: LucideIcon })[];
        management?: (NavItem & { title: string, href: string, icon: LucideIcon })[];
        operations?: (NavItem & { title: string, href: string, icon: LucideIcon })[];
        analytics?: (NavItem & { title: string, href: string, icon: LucideIcon })[];
    }>> = {
        super_admin: {
            main: [
                { title: 'dashboard', href: '/dashboard', icon: LayoutGrid },
            ],
            management: [
                { title: 'properties', href: '/admin/properties', icon: Building2 },
                { title: 'users', href: '/admin/users', icon: Users },
                { title: 'amenities', href: '/admin/amenities', icon: Package },
                { title: 'extra_services', href: '/admin/extra-services', icon: Package },
            ],
            operations: [
                { title: 'bookings', href: '/admin/bookings', icon: Calendar },
                { title: 'booking_attribution', href: '/admin/bookings/staff-tracking', icon: UserCheck },
                { title: 'occupancy_report', href: '/admin/reports/occupancy', icon: BarChart3 },
                { title: 'payments', href: '/admin/payments', icon: CreditCard },
                { title: 'finance', href: '/admin/finance', icon: DollarSign },
                { title: 'payroll', href: '/admin/finance/payroll', icon: Coins },
                { title: 'cleaning_tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
                { title: 'cleaning_schedules', href: '/admin/cleaning-schedules', icon: Calendar },
                { title: 'cleaning_staff', href: '/admin/cleaning-staff', icon: Sparkles },
                { title: 'unit_damages', href: '/admin/unit-damages', icon: Wrench },
                { title: 'lost_and_founds', href: '/admin/lost-and-founds', icon: ClipboardList },
            ],
            analytics: [
                { title: 'rate_management', href: '/admin/rate-management', icon: DollarSign },
                { title: 'reports', href: '/admin/reports', icon: BarChart3 },
                { title: 'settings', href: '/admin/settings', icon: Settings },
            ]
        },
        property_owner: {
            main: [
                { title: 'dashboard', href: '/dashboard', icon: LayoutGrid },
            ],
            management: [
                { title: 'my_properties', href: '/admin/properties', icon: Building2 },
                { title: 'extra_services', href: '/admin/extra-services', icon: Package },
            ],
            operations: [
                { title: 'bookings', href: '/admin/bookings', icon: Calendar },
                { title: 'occupancy_report', href: '/admin/reports/occupancy', icon: BarChart3 },
                { title: 'payments', href: '/admin/payments', icon: CreditCard },
                { title: 'finance', href: '/admin/finance', icon: DollarSign },
                { title: 'cleaning_tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
                { title: 'cleaning_staff', href: '/admin/cleaning-staff', icon: Sparkles },
                { title: 'unit_damages', href: '/admin/unit-damages', icon: Wrench },
                { title: 'lost_and_founds', href: '/admin/lost-and-founds', icon: ClipboardList },
            ],
            analytics: [
                { title: 'rate_management', href: '/admin/rate-management', icon: DollarSign },
                { title: 'reports', href: '/admin/reports', icon: BarChart3 },
            ]
        },
        property_manager: {
            main: [
                { title: 'dashboard', href: '/dashboard', icon: LayoutGrid },
            ],
            management: [
                { title: 'properties', href: '/admin/properties', icon: Building2 },
            ],
            operations: [
                { title: 'bookings', href: '/admin/bookings', icon: Calendar },
                { title: 'occupancy_report', href: '/admin/reports/occupancy', icon: BarChart3 },
                { title: 'payments', href: '/admin/payments', icon: CreditCard },
                { title: 'finance', href: '/admin/finance', icon: DollarSign },
                { title: 'cleaning_tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
                { title: 'cleaning_staff', href: '/admin/cleaning-staff', icon: Sparkles },
                { title: 'unit_damages', href: '/admin/unit-damages', icon: Wrench },
                { title: 'lost_and_founds', href: '/admin/lost-and-founds', icon: ClipboardList },
            ],
            analytics: [
                { title: 'rate_management', href: '/admin/rate-management', icon: DollarSign },
                { title: 'reports', href: '/admin/reports', icon: BarChart3 },
            ]
        },
        front_desk: {
            main: [
                { title: 'dashboard', href: '/dashboard', icon: LayoutGrid },
            ],
            management: [],
            operations: [
                { title: 'bookings', href: '/admin/bookings', icon: Calendar },
                { title: 'occupancy_report', href: '/admin/reports/occupancy', icon: BarChart3 },
                { title: 'check_in_out', href: '/admin/checkin', icon: Shield },
                { title: 'cleaning_staff', href: '/admin/cleaning-staff', icon: Sparkles },
                { title: 'unit_damages', href: '/admin/unit-damages', icon: Wrench },
                { title: 'lost_and_founds', href: '/admin/lost-and-founds', icon: ClipboardList },
            ],
            analytics: []
        },
        finance: {
            main: [
                { title: 'dashboard', href: '/dashboard', icon: LayoutGrid },
            ],
            management: [],
            operations: [
                { title: 'payments', href: '/admin/payments', icon: CreditCard },
                { title: 'finance', href: '/admin/finance', icon: DollarSign },
                { title: 'payroll', href: '/admin/finance/payroll', icon: Coins },
            ],
            analytics: [
                { title: 'financial_reports', href: '/admin/reports/financial', icon: DollarSign },
                { title: 'expenses', href: '/admin/expenses', icon: FileText },
            ]
        },
        housekeeping: {
            main: [
                { title: 'dashboard', href: '/dashboard', icon: LayoutGrid },
            ],
            management: [],
            operations: [
                { title: 'cleaning_tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
                { title: 'cleaning_staff', href: '/admin/cleaning-staff', icon: Sparkles },
                { title: 'cleaning_schedules', href: '/admin/cleaning-schedules', icon: Calendar },
                { title: 'room_status', href: '/admin/rooms', icon: Wrench },
                { title: 'maintenance', href: '/admin/maintenance', icon: Settings },
                { title: 'unit_damages', href: '/admin/unit-damages', icon: Wrench },
                { title: 'lost_and_founds', href: '/admin/lost-and-founds', icon: ClipboardList },
            ],
            analytics: []
        },
        guest: {
            main: [
                { title: 'browse_properties', href: '/properties', icon: Home },
                { title: 'my_bookings', href: '/my-bookings', icon: Calendar },
                { title: 'my_payments', href: '/my-payments', icon: CreditCard },
            ],
            management: [],
            operations: [],
            analytics: []
        },
    };

    const roleItems = roleBasedItems[userRole] || {};

    return {
        main: roleItems.main ?? baseItems.main,
        management: roleItems.management ?? baseItems.management,
        operations: roleItems.operations ?? baseItems.operations,
        analytics: roleItems.analytics ?? baseItems.analytics,
    };
};

const footerNavItems: (NavItem & { title: string, href: string, icon: LucideIcon })[] = [
    { title: 'documentation', href: '/help', icon: FileText },
    { title: 'support', href: '/support', icon: HelpCircle },
];

interface AppSidebarProps {
    className?: string;
    variant?: 'desktop' | 'mobile';
}

export function AppSidebar({ className, variant = 'desktop' }: AppSidebarProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const { t } = useTranslation();
    
    // Add null checking untuk auth.user
    if (!auth?.user) {
        return (
            <Sidebar 
                collapsible="icon" 
                variant="inset" 
                className={cn(
                    "border-r border-border bg-card",
                    variant === 'mobile' && "w-64",
                    className
                )}
            >
                <SidebarHeader className="border-b border-border bg-card/50">
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
                    <div className="p-4 text-center text-muted-foreground">
                        <div className="animate-pulse">
                            <div className="h-4 bg-muted rounded mb-2"></div>
                            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                        </div>
                    </div>
                </SidebarContent>
            </Sidebar>
        );
    }

    const navItems = getNavItemsForRole(auth.user.role);

    return (
        <Sidebar 
            collapsible="icon" 
            variant="inset" 
            className={cn(
                "border-r border-border bg-card",
                variant === 'mobile' && "w-64",
                className
            )}
        >
            <SidebarHeader className="border-b border-border bg-card/50">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-accent">
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="py-4">
                {/* Main Navigation */}
                {navItems.main.length > 0 && (
                    <div className="mb-6">
                        <NavMain items={navItems.main} />
                    </div>
                )}

                {/* Management Section */}
                {navItems.management.length > 0 && (
                    <div className="mb-6">
                        <div className="px-3 mb-2">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Management
                            </h3>
                        </div>
                        <NavMain items={navItems.management} />
                    </div>
                )}

                {/* Operations Section */}
                {navItems.operations.length > 0 && (
                    <div className="mb-6">
                        <div className="px-3 mb-2">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Operations
                            </h3>
                        </div>
                        <NavMain items={navItems.operations} />
                    </div>
                )}

                {/* Analytics Section */}
                {navItems.analytics.length > 0 && (
                    <div className="mb-6">
                        <div className="px-3 mb-2">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Analytics
                            </h3>
                        </div>
                        <NavMain items={navItems.analytics} />
                    </div>
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-border bg-card/50">
                <div className="p-4 space-y-3">
                    {/* Notification Bell - Show for all authenticated users except guests */}
                    {auth.user.role !== 'guest' && (
                        <div className="flex items-center justify-center">
                            <NotificationBell 
                                userId={auth.user.id} 
                                className="w-full"
                            />
                        </div>
                    )}
                    
                    {/* Footer Navigation */}
                    <NavFooter items={footerNavItems} className="mb-3" />
                    
                    {/* User Section */}
                    <NavUser />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
