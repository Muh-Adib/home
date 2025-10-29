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
    UserPlus,
    Crown,
    Phone,
    Mail,
    User,
    Settings,
    HelpCircle,
    Info
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import LanguageSwitcher from '@/components/language-switcher';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { useTranslation } from 'react-i18next';

interface GuestLayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;
    showFooter?: boolean;
    variant?: 'default' | 'minimal';
}

const publicNavItems = [
    { key: 'home', href: '/', icon: Home, label: 'nav.home' },
    { key: 'properties', href: '/properties', icon: Building2, label: 'nav.properties' },
    { key: 'about', href: '/about', icon: Info, label: 'nav.about' },
    { key: 'contact', href: '/contact', icon: Phone, label: 'nav.contact' },
];

const authNavItems = [
    { key: 'my_bookings', href: '/my-bookings', icon: Calendar, label: 'nav.my_bookings' },
    { key: 'my_payments', href: '/my-payments', icon: CreditCard, label: 'nav.my_payments' },
    { key: 'profile', href: '/settings/profile', icon: User, label: 'nav.profile' },
];

export default function GuestLayout({
    children,
    showHeader = true,
    showFooter = true,
    variant = 'default'
}: GuestLayoutProps) {
    const { t } = useTranslation();
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    const isAuthenticated = !!auth?.user;

    return (
        <div className="min-h-screen bg-background flex flex-col">
        {showHeader && (
            <header className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm ${variant === 'minimal' ? 'border-border shadow-sm' : 'border-border shadow-md'}`}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center space-x-2">
                            <AppLogoIcon className="w-8 h-8 text-brand-primary transition-colors" />
                            <span className="text-xl font-bold text-brand-primary">Homsjogja</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center space-x-8">
                            {!isAuthenticated ? (
                                publicNavItems.map((item) => (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        className="text-muted-foreground hover:text-brand-primary transition-colors font-medium"
                                    >
                                        {t(item.label)}
                                    </Link>
                                ))
                            ) : (
                                authNavItems.map((item) => (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        className="text-muted-foreground hover:text-brand-primary transition-colors font-medium"
                                    >
                                        {t(item.label)}
                                    </Link>
                                ))
                            )}
                        </nav>

                        {/* Right Section */}
                        <div className="flex items-center space-x-4">
                            <AppearanceToggleDropdown />
                            <LanguageSwitcher />
                            {isAuthenticated ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src="" alt={auth.user.name} />
                                                <AvatarFallback className="bg-brand-primary text-white">
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
                                <div className="hidden md:flex items-center space-x-2">
                                    <Link href="/login" className="text-muted-foreground hover:text-brand-primary transition-colors font-medium">
                                        {t('nav.login')}
                                    </Link>
                                    <Link href="/register" className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors font-medium">
                                        {t('nav.register')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>
        )}

        <div className="flex flex-1">
            {/* Main Content */}
            <main className="flex-1 pb-12 md:pb-0">
                {children}
            </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
            <div className="flex items-center justify-around py-1">
                {isAuthenticated ? (
                    authNavItems.map((item) => (
                        <Link
                            key={item.key}
                            href={item.href}
                            className="flex flex-col items-center py-1 px-2 text-xs text-muted-foreground hover:text-brand-primary transition-colors"
                        >
                            <item.icon className="h-4 w-4 mb-0.5" />
                            <span className="font-medium text-[10px] leading-tight">{t(item.label)}</span>
                        </Link>
                    ))
                ) : (
                    <>
                        <Link
                            href="/login"
                            className="flex flex-col items-center py-1 px-2 text-xs text-muted-foreground hover:text-brand-primary transition-colors"
                        >
                            <LogIn className="h-4 w-4 mb-0.5" />
                            <span className="font-medium text-[10px] leading-tight">{t('nav.login')}</span>
                        </Link>
                        <Link
                            href="/register"
                            className="flex flex-col items-center py-1 px-2 text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
                        >
                            <UserPlus className="h-4 w-4 mb-0.5" />
                            <span className="font-medium text-[10px] leading-tight">{t('nav.register')}</span>
                        </Link>
                        <Link
                            href="/properties"
                            className="flex flex-col items-center py-1 px-2 text-xs text-muted-foreground hover:text-brand-primary transition-colors"
                        >
                            <Building2 className="h-4 w-4 mb-0.5" />
                            <span className="font-medium text-[10px] leading-tight">{t('nav.properties')}</span>
                        </Link>
                        <Link
                            href="/contact"
                            className="flex flex-col items-center py-1 px-2 text-xs text-muted-foreground hover:text-brand-primary transition-colors"
                        >
                            <Phone className="h-4 w-4 mb-0.5" />
                            <span className="font-medium text-[10px] leading-tight">{t('nav.contact')}</span>
                        </Link>
                    </>
                )}
            </div>
        </nav>

            {/* Footer */}
            {showFooter && (
                <footer className={cn(
                    "bg-brand-background border-t",
                    variant === 'minimal' ? "border-border/50" : "border-border"
                )}>
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="py-12">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                {/* Company Info */}
                                <div className="col-span-1 md:col-span-2">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <AppLogoIcon className="w-8 h-8 text-brand-primary transition-colors" />
                                        <span className="text-2xl font-bold text-brand-primary">Homsjogja</span>
                                    </div>
                                    <p className="text-muted-foreground max-w-md leading-relaxed">
                                    Dari homestay yang hangat hingga villa yang eksklusif, Homsjogja menawarkan pengalaman menginap yang nyaman, autentik, dan memanjakan setiap tamu.
                                    </p>
                                </div>

                                {/* Quick Links */}
                                <div>
                                    <h3 className="text-sm font-semibold text-brand-primary tracking-wider uppercase mb-4">
                                        {t('nav.quick_links')}
                                    </h3>
                                    <ul className="space-y-3">
                                        <li>
                                            <Link href="/properties" className="text-muted-foreground hover:text-brand-primary transition-colors">
                                                {t('nav.browse_properties')}
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/help" className="text-muted-foreground hover:text-brand-primary transition-colors">
                                                {t('nav.help')}
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/support" className="text-muted-foreground hover:text-brand-primary transition-colors">
                                                {t('nav.support')}
                                            </Link>
                                        </li>
                                    </ul>
                                </div>

                                {/* Contact */}
                                <div>
                                    <h3 className="text-sm font-semibold text-brand-primary tracking-wider uppercase mb-4">
                                        {t('nav.contact')}
                                    </h3>
                                    <ul className="space-y-3 text-muted-foreground">
                                        <li className="flex items-center">
                                            <Mail className="h-4 w-4 mr-2 text-brand-primary" />
                                            <a href="mailto:contact@homsjogja.com" className="hover:text-brand-primary transition-colors">
                                                contact@homsjogja.com
                                            </a>
                                        </li>
                                        <li className="flex items-center">
                                            <Phone className="h-4 w-4 mr-2 text-brand-primary" />
                                            <a href="tel:+628112500082" className="hover:text-brand-primary transition-colors">
                                                +62 811 2500 082
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-border">
                                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                                    <p className="text-center md:text-left text-muted-foreground">
                                        © 2025 Homsjogja. {t('nav.all_rights_reserved')}
                                    </p>
                                    <div className="flex items-center space-x-6 text-muted-foreground">
                                        <Link href="/privacy" className="hover:text-brand-primary transition-colors">{t('nav.privacy')}</Link>
                                        <Link href="/terms" className="hover:text-brand-primary transition-colors">{t('nav.terms')}</Link>
                                        <span className="flex items-center">
                                            <AppLogoIcon className="w-4 h-4 mr-1 text-brand-primary transition-colors" />
                                            {t('nav.made_with_love_in_jogja')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
} 