import React, { useState } from 'react';
import { Link, usePage, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import {
    Menu,
    Home,
    Building2,
    Calendar,
    CreditCard,
    User,
    Settings,
    LogOut,
    Bell,
    Search,
    Crown,
    Phone,
    Mail,
    ChevronDown,
    BookOpen,
    Activity,
    Star,
    HelpCircle
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import LanguageSwitcher from '@/components/language-switcher';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { useTranslation } from 'react-i18next';
import { useInitials } from '@/hooks/use-initials';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface DashboardLayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;
    showSidebar?: boolean;
    breadcrumbs?: Array<{ title: string; href?: string }>;
}

// Helper function to check if user is authenticated
const isAuthenticated = (user: User | null): user is User => {
    return user !== null && user !== undefined;
};

// Helper function to check if user is guest
const isGuest = (user: User | null): boolean => {
    return isAuthenticated(user) && user.role === 'guest';
};

const dashboardNavItems = [
    {
        key: 'dashboard',
        href: '/dashboard',
        icon: Home,
        label: 'Dashboard',
        description: 'Overview & stats'
    },
    {
        key: 'my_bookings',
        href: '/my-bookings',
        icon: Calendar,
        label: 'My Bookings',
        description: 'View all bookings'
    },
    {
        key: 'my_payments',
        href: '/my-payments',
        icon: CreditCard,
        label: 'Payments',
        description: 'Payment history'
    },
    {
        key: 'properties',
        href: '/properties',
        icon: Building2,
        label: 'Browse Properties',
        description: 'Find your next stay'
    },
];

export default function DashboardLayout({
    children,
    showHeader = true,
    showSidebar = true,
    breadcrumbs = []
}: DashboardLayoutProps) {
    const { t } = useTranslation();
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const logoutForm = useForm({});

    const handleLogout = () => {
        logoutForm.post('/logout');
    };

    return (
        <ErrorBoundary>
            <AppShell variant="header">
                {showHeader && (
                    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
                        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                {/* Logo & Mobile Menu */}
                                <div className="flex items-center space-x-3">
                                    {showSidebar && (
                                        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                                            <SheetTrigger asChild>
                                                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                                                    <Menu className="h-5 w-5" />
                                                    <span className="hidden sm:inline text-sm font-medium">Menu</span>
                                                </Button>
                                            </SheetTrigger>
                                            <SheetContent side="left" className="w-64 bg-card shadow-xl">
                                                <SheetHeader className="border-b border-border pb-4 bg-card/50 px-4 py-4">
                                                    <SheetTitle className="flex items-center space-x-2">
                                                        <AppLogoIcon className="w-6 h-6" variant="primary" />
                                                        <span className="text-lg font-bold text-foreground">Homsjogja</span>
                                                    </SheetTitle>
                                                </SheetHeader>
                                                <div className="mt-6 space-y-2 px-4">
                                                    {dashboardNavItems.map((item) => {
                                                        const Icon = item.icon;
                                                        return (
                                                            <Link
                                                                key={item.key}
                                                                href={item.href}
                                                                className={cn(
                                                                    "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                                                                    "hover:bg-accent hover:text-accent-foreground",
                                                                    "text-muted-foreground"
                                                                )}
                                                                onClick={() => setSidebarOpen(false)}
                                                            >
                                                                <Icon className="h-4 w-4" />
                                                                <span>{item.label}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </SheetContent>
                                        </Sheet>
                                    )}

                                    <Link href="/" className="flex items-center space-x-2">
                                        <AppLogoIcon className="w-8 h-8" variant="primary" />
                                        <span className="text-xl font-bold text-foreground">Homsjogja</span>
                                    </Link>
                                </div>

                                {/* Right Side Actions */}
                                <div className="flex items-center space-x-3">
                                    {/* Search */}
                                    <Button variant="ghost" size="sm" className="hidden sm:flex">
                                        <Search className="h-4 w-4" />
                                    </Button>

                                    {/* Notifications */}
                                    {isAuthenticated(auth.user) && !isGuest(auth.user) && (
                                        <NotificationBell
                                            userId={auth.user.id}
                                            className={cn("ml-1")}
                                        />
                                    )}

                                    {/* Theme Toggle */}
                                    <AppearanceToggleDropdown />

                                    {/* Language Switcher */}
                                    <LanguageSwitcher />

                                    {/* User Menu */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="text-xs">
                                                        {getInitials(auth.user?.name || 'U')}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56" align="end" forceMount>
                                            <div className="flex items-center justify-start gap-2 p-2">
                                                <div className="flex flex-col space-y-1 leading-none">
                                                    <p className="font-medium text-foreground">{auth.user?.name}</p>
                                                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                                                        {auth.user?.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href="/profile" className="flex items-center">
                                                    <User className="mr-2 h-4 w-4" />
                                                    <span>Profile</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/settings" className="flex items-center">
                                                    <Settings className="mr-2 h-4 w-4" />
                                                    <span>Settings</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/help" className="flex items-center">
                                                    <HelpCircle className="mr-2 h-4 w-4" />
                                                    <span>Help & Support</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <form onSubmit={(e) => {
                                                    e.preventDefault();
                                                    handleLogout();
                                                }} className="w-full">
                                                    <button
                                                        type="submit"
                                                        className="flex w-full items-center text-red-600 focus:text-red-600"
                                                        disabled={logoutForm.processing}
                                                    >
                                                        <LogOut className="mr-2 h-4 w-4" />
                                                        <span>{logoutForm.processing ? 'Logging out...' : 'Log out'}</span>
                                                    </button>
                                                </form>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                {/* Main Content */}
                <AppContent showHeader={showHeader} >
                    {children}
                </AppContent>

                {/* Footer */}
                <footer className="border-t border-border bg-card">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            {/* Company Info */}
                            <div className="col-span-1 md:col-span-2">
                                <div className="flex items-center space-x-3 mb-4">
                                    <Crown className="h-6 w-6 text-primary dark:text-primary" />
                                    <span className="text-xl font-bold text-foreground">Homsjogja</span>
                                </div>
                                <p className="text-muted-foreground max-w-md leading-relaxed text-sm">
                                    Platform homestay terpercaya untuk pengelolaan villa dan homestay di Indonesia.
                                    Pengalaman menginap dengan citarasa budaya Jawa yang autentik.
                                </p>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">
                                    Quick Links
                                </h3>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        <Link href="/properties" className="text-muted-foreground hover:text-primary transition-colors">
                                            Browse Properties
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">
                                            Help Center
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                                            Contact Us
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Contact */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">
                                    Contact
                                </h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center">
                                        <Mail className="h-4 w-4 mr-2 text-primary" />
                                        <a href="mailto:contact@homsjogja.com" className="hover:text-primary transition-colors">
                                            contact@homsjogja.com
                                        </a>
                                    </li>
                                    <li className="flex items-center">
                                        <Phone className="h-4 w-4 mr-2 text-primary" />
                                        <a href="tel:+628112500082" className="hover:text-primary transition-colors">
                                            +62 811 2500 082
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <Separator className="my-6" />

                        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                            <p className="text-center md:text-left text-muted-foreground text-sm">
                                © 2025 Homsjogja. All rights reserved.
                            </p>
                            <div className="flex items-center space-x-6 text-muted-foreground text-sm">
                                <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
                                <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
                                <span className="flex items-center">
                                    <Crown className="h-4 w-4 mr-1 text-primary dark:text-primary" />
                                    Made with ❤️ in Jogja
                                </span>
                            </div>
                        </div>
                    </div>
                </footer>
            </AppShell>
        </ErrorBoundary>
    );
}
