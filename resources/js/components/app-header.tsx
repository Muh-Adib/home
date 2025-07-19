import { Breadcrumbs } from '@/components/breadcrumbs';
import { Icon } from '@/components/icon';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type NavItem, type SharedData, type User } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import { BookOpen, CreditCard, Folder, LayoutGrid, ListChecks, Menu, Search, Settings, Users, BarChart3, Shield, Wrench, Home, Package, DollarSign, FileText, LogIn, UserPlus, LucideIcon, Building2, Sparkles, Calendar } from 'lucide-react';
import AppLogo from './app-logo';
import LanguageSwitcher from '@/components/language-switcher';
import { useTranslation } from 'react-i18next';

// Helper function to check if user is authenticated
const isAuthenticated = (user: User | null): user is User => {
    return user !== null && user !== undefined;
};

// Helper function to check if user is guest
const isGuest = (user: User | null): boolean => {
    return isAuthenticated(user) && user.role === 'guest';
};

const getHeaderNavItemsForRole = (user: User | null): (NavItem & { title: string, href: string, icon: LucideIcon })[] => {
    // Handle unauthenticated users
    if (!isAuthenticated(user)) {
        return [
            { title: 'browse_properties', href: route('properties.index'), icon: Home },
        ];
    }

    const baseItems = [
        { title: 'dashboard', href: route('dashboard'), icon: LayoutGrid },
    ];

    const roleBasedItems: Record<User['role'], (NavItem & { title: string, href: string, icon: LucideIcon })[]> = {
        super_admin: [
            ...baseItems,
            { title: 'properties', href: route('admin.properties.index'), icon: Folder },
            { title: 'bookings', href: route('admin.bookings.index'), icon: BookOpen },
            { title: 'payment_methods', href: route('admin.payment-methods.index'), icon: CreditCard },
            { title: 'users', href: route('admin.users.index'), icon: Users },
            { title: 'amenities', href: route('admin.amenities.index'), icon: Building2 },
            //{ title: 'cleaning_tasks', href: route('admin.cleaning-tasks.index'), icon: ListChecks },
            //{ title: 'cleaning_staff', href: route('admin.cleaning-staff.index'), icon: Sparkles },
            { title: 'settings', href: route('admin.settings.general'), icon: Settings },
        ],
        property_owner: [
            ...baseItems,
            { title: 'my_properties', href: route('admin.properties.index'), icon: Folder },
            { title: 'my_bookings', href: route('admin.bookings.index'), icon: BookOpen },
            //{ title: 'cleaning_tasks', href: route('admin.cleaning-tasks.index'), icon: ListChecks },
            //{ title: 'cleaning_staff', href: route('admin.cleaning-staff.index'), icon: Sparkles },
        ],
        property_manager: [
            ...baseItems,
            { title: 'properties', href: route('admin.properties.index'), icon: Folder },
            { title: 'bookings', href: route('admin.bookings.index'), icon: BookOpen },
            { title: 'payment_methods', href: route('admin.payment-methods.index'), icon: CreditCard },
            //{ title: 'cleaning_tasks', href: route('admin.cleaning-tasks.index'), icon: ListChecks },
            //{ title: 'cleaning_staff', href: route('admin.cleaning-staff.index'), icon: Sparkles },
        ],
        front_desk: [
            ...baseItems,
            { title: 'bookings', href: route('admin.bookings.index'), icon: BookOpen },
            { title: 'check_in_out', href: route('admin.bookings.index'), icon: Shield },
            //{ title: 'cleaning_staff', href: route('admin.cleaning-staff.index'), icon: Sparkles },
        ],
        finance: [
            ...baseItems,
            { title: 'bookings', href: route('admin.bookings.index'), icon: BookOpen },
            { title: 'payments', href: route('admin.payments.index'), icon: CreditCard },
            { title: 'payment_methods', href: route('admin.payment-methods.index'), icon: CreditCard },
        ],
        housekeeping: [
            ...baseItems,
            //{ title: 'cleaning_tasks', href: route('admin.cleaning-tasks.index'), icon: ListChecks },
            //{ title: 'cleaning_staff', href: route('admin.cleaning-staff.index'), icon: Sparkles },
            //{ title: 'cleaning_schedules', href: route('admin.cleaning-schedules.index'), icon: Calendar },
            { title: 'bookings', href: route('admin.bookings.index'), icon: BookOpen },
        ],
        guest: [
            { title: 'browse_properties', href: route('properties.index'), icon: Home },
            { title: 'my_bookings', href: route('my-bookings'), icon: BookOpen },
            { title: 'my_payments', href: route('my-payments'), icon: CreditCard },
        ],
    };

    return roleBasedItems[user.role] || baseItems;
};

const rightNavItems: (NavItem & { title: string, href: string, icon: LucideIcon })[] = [
    { title: 'help', href: '/help', icon: BookOpen },
    { title: 'support', href: '/support', icon: Folder },
];

const activeItemStyles = 'text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100';

interface AppHeaderProps {
    breadcrumbs?: BreadcrumbItem[];
}

export function AppHeader({ breadcrumbs = [] }: AppHeaderProps) {
    const { t } = useTranslation();
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    const mainNavItems = getHeaderNavItemsForRole(auth.user);
    
    return (
        <>
            <div className="border-sidebar-border/80 border-b">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    {/* Mobile Menu */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="mr-2 h-[34px] w-[34px]">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="bg-sidebar flex h-full w-64 flex-col items-stretch justify-between">
                                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                                <SheetDescription className="sr-only">Main navigation menu for the application</SheetDescription>
                                <SheetHeader className="flex flex-row items-center justify-start p-4 border-b">
                                    <AppLogo />
                                </SheetHeader>
                                <div className="flex h-full flex-1 flex-col space-y-4 p-4">
                                    <div className="flex h-full flex-col justify-between text-sm">
                                        <div className="flex flex-col space-y-2">
                                            {mainNavItems.map((item) => (
                                                <Link 
                                                    key={item.title} 
                                                    href={item.href} 
                                                    className="flex items-center space-x-3 rounded-lg px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium"
                                                >
                                                    {item.icon && <Icon iconNode={item.icon} className="h-5 w-5" />}
                                                    <span>{t(`nav.${item.title}`)}</span>
                                                </Link>
                                            ))}
                                        </div>

                                        <div className="flex flex-col space-y-2 pt-4 border-t">
                                            {rightNavItems.map((item) => (
                                                <a
                                                    key={item.title}
                                                    href={item.href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center space-x-3 rounded-lg px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium"
                                                >
                                                    {item.icon && <Icon iconNode={item.icon} className="h-5 w-5" />}
                                                    <span>{t(`nav.${item.title}`)}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Logo - Link to appropriate dashboard based on authentication */}
                    <Link 
                        href={isAuthenticated(auth.user) ? route('dashboard') : route('home')} 
                        prefetch 
                        className="flex items-center space-x-2"
                    >
                        <AppLogo />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="ml-6 hidden h-full items-center space-x-6 lg:flex">
                        <NavigationMenu className="flex h-full items-stretch">
                            <NavigationMenuList className="flex h-full items-stretch space-x-2">
                                {mainNavItems.map((item, index) => (
                                    <NavigationMenuItem key={index} className="relative flex h-full items-center">
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                page.url === item.href && activeItemStyles,
                                                'h-9 cursor-pointer px-3',
                                            )}
                                        >
                                            {item.icon && <Icon iconNode={item.icon} className="mr-2 h-4 w-4" />}
                                            {t(`nav.${item.title}`)}
                                        </Link>
                                        {page.url === item.href && (
                                            <div className="absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-black dark:bg-white"></div>
                                        )}
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    <div className="ml-auto flex items-center space-x-2">
                        <div className="relative flex items-center space-x-1">
                            
                            {/* Conditional Rendering: Notification Bell - Only show for authenticated users (not guests or unauthenticated) */}
                            {isAuthenticated(auth.user) && !isGuest(auth.user) && (
                                <NotificationBell 
                                    userId={auth.user.id} 
                                    className="ml-1" 
                                />
                            )}
                            {isAuthenticated(auth.user) && (
                            <div className="hidden lg:flex">
                                {rightNavItems.map((item) => (
                                    <TooltipProvider key={item.title} delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <a
                                                    href={item.href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group text-accent-foreground ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md bg-transparent p-0 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                                                >
                                                    <span className="sr-only">{t(`nav.${item.title}`)}</span>
                                                    {item.icon && <Icon iconNode={item.icon} className="size-5 opacity-80 group-hover:opacity-100" />}
                                                </a>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{t(`nav.${item.title}`)}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>)}
                        </div>
                        
                        {/* Language Switcher */}
                        <LanguageSwitcher />
                        
                        {/* Conditional Rendering: User Menu vs Login/Register Buttons */}
                        {isAuthenticated(auth.user) ? (
                            // Authenticated User - Show user dropdown menu
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="size-10 rounded-full p-1">
                                        <Avatar className="size-8 overflow-hidden rounded-full">
                                            <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                                            <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                                {getInitials(auth.user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end">
                                    <UserMenuContent user={auth.user} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            // Unauthenticated User - Show Login/Register buttons
                            <div className="flex items-center space-x-2">
                                <Link href={route('login')}>
                                    <Button variant="outline" size="sm" className="text-sm">
                                        <LogIn className="mr-2 h-4 w-4" />
                                        {t('nav.login')}
                                    </Button>
                                </Link>
                                <Link href={route('register')}>
                                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm">
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        {t('nav.register')}
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="border-sidebar-border/70 flex w-full border-b">
                    <div className="mx-auto flex h-12 w-full items-center justify-start px-4 text-neutral-500 md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
