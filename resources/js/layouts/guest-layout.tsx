import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { 
    Menu, 
    Search, 
    Home, 
    Building2, 
    Calendar, 
    CreditCard, 
    LogIn,
    UserPlus
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import LanguageSwitcher from '@/components/language-switcher';
import { useTranslation } from 'react-i18next';

interface GuestLayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;
    showFooter?: boolean;
}

const publicNavItems = [
    { key: 'home', href: '/', icon: Home },
    { key: 'properties', href: '/properties', icon: Building2 },
];

const authNavItems = [
    { key: 'my_bookings', href: '/my-bookings', icon: Calendar },
    { key: 'my_payments', href: '/my-payments', icon: CreditCard },
];

export default function GuestLayout({ 
    children, 
    showHeader = true, 
    showFooter = true 
}: GuestLayoutProps) {
    const { t } = useTranslation();
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    const isAuthenticated = !!auth?.user;

    return (
        <div className="min-h-screen bg-gray-50">
            {showHeader && (
                <header className="bg-white shadow-sm border-b">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between">
                            {/* Mobile menu button */}
                            <div className="lg:hidden">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9">
                                            <Menu className="h-5 w-5" />
                                            <span className="sr-only">Open menu</span>
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-72">
                                        <SheetHeader>
                                            <SheetTitle className="text-left">
                                                <AppLogoIcon className="h-8 w-8" />
                                            </SheetTitle>
                                        </SheetHeader>
                                        <div className="mt-6 space-y-4">
                                            {/* Public Navigation */}
                                            <div className="space-y-2">
                                                {publicNavItems.map((item) => (
                                                    <Link
                                                        key={item.key}
                                                        href={item.href}
                                                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                                    >
                                                        <item.icon className="h-5 w-5" />
                                                        {t(`nav.${item.key}`)}
                                                    </Link>
                                                ))}
                                            </div>

                                            {/* Authenticated User Navigation */}
                                            {isAuthenticated && (
                                                <>
                                                    <div className="border-t pt-4">
                                                        <div className="space-y-2">
                                                            {authNavItems.map((item) => (
                                                                <Link
                                                                    key={item.key}
                                                                    href={item.href}
                                                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                                                >
                                                                    <item.icon className="h-5 w-5" />
                                                                    {t(`nav.${item.key}`)}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* Authentication Links */}
                                            {!isAuthenticated && (
                                                <div className="border-t pt-4 space-y-2">
                                                    <Link
                                                        href="/login"
                                                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                                    >
                                                        <LogIn className="h-5 w-5" />
                                                        {t('auth.sign_in')}
                                                    </Link>
                                                    <Link
                                                        href="/register"
                                                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-white bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        <UserPlus className="h-5 w-5" />
                                                        {t('auth.sign_up')}
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>

                            {/* Logo */}
                            <div className="flex items-center">
                                <Link href="/" className="flex items-center">
                                    <AppLogo />
                                </Link>
                            </div>

                            {/* Desktop Navigation */}
                            <div className="hidden lg:flex lg:items-center lg:space-x-8">
                                <NavigationMenu>
                                    <NavigationMenuList className="space-x-2">
                                        {publicNavItems.map((item) => (
                                            <NavigationMenuItem key={item.key}>
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        navigationMenuTriggerStyle(),
                                                        "h-9 px-3",
                                                        page.url === item.href && "bg-gray-100"
                                                    )}
                                                >
                                                    <item.icon className="mr-2 h-4 w-4" />
                                                    {t(`nav.${item.key}`)}
                                                </Link>
                                            </NavigationMenuItem>
                                        ))}

                                        {/* Authenticated Navigation */}
                                        {isAuthenticated && authNavItems.map((item) => (
                                            <NavigationMenuItem key={item.key}>
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        navigationMenuTriggerStyle(),
                                                        "h-9 px-3",
                                                        page.url === item.href && "bg-gray-100"
                                                    )}
                                                >
                                                    <item.icon className="mr-2 h-4 w-4" />
                                                    {t(`nav.${item.key}`)}
                                                </Link>
                                            </NavigationMenuItem>
                                        ))}
                                    </NavigationMenuList>
                                </NavigationMenu>
                            </div>

                            {/* Right side items */}
                            <div className="flex items-center space-x-4">
                                {/* Search Button */}
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <Search className="h-4 w-4" />
                                    <span className="sr-only">Search</span>
                                </Button>

                                {/* Language Switcher */}
                                <LanguageSwitcher />

                                {/* Authentication */}
                                {isAuthenticated ? (
                                    /* User Menu */
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="size-10 rounded-full p-1">
                                                <Avatar className="size-8 overflow-hidden rounded-full">
                                                    <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                                                    <AvatarFallback className="rounded-lg bg-gray-200 text-black">
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
                                    /* Auth Buttons */
                                    <div className="flex items-center space-x-2">
                                        <Link href="/login">
                                            <Button variant="ghost" size="sm">
                                                {t('auth.sign_in')}
                                            </Button>
                                        </Link>
                                        <Link href="/register">
                                            <Button size="sm">
                                                {t('auth.sign_up')}
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>
            )}

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            {showFooter && (
                <footer className="bg-white border-t">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="py-12">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                {/* Company Info */}
                                <div className="col-span-1 md:col-span-2">
                                    <AppLogo />
                                    <p className="mt-4 text-gray-600 max-w-md">
                                        Platform manajemen properti terpercaya untuk pengelolaan villa dan homestay di Indonesia.
                                    </p>
                                </div>

                                {/* Quick Links */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                                        Quick Links
                                    </h3>
                                    <ul className="mt-4 space-y-2">
                                        <li>
                                            <Link href="/properties" className="text-gray-600 hover:text-gray-900">
                                                {t('nav.browse_properties')}
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/help" className="text-gray-600 hover:text-gray-900">
                                                {t('nav.help')}
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/support" className="text-gray-600 hover:text-gray-900">
                                                {t('nav.support')}
                                            </Link>
                                        </li>
                                    </ul>
                                </div>

                                {/* Contact */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                                        Contact
                                    </h3>
                                    <ul className="mt-4 space-y-2 text-gray-600">
                                        <li>contact@company.com</li>
                                        <li>+62 123 4567 890</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-gray-200">
                                <p className="text-center text-gray-600">
                                    © 2024 Homsjogja. All rights reserved.
                                </p>
                            </div>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
} 