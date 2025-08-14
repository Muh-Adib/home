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
    Mail
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
    showFooter = true,
    variant = 'default'
}: GuestLayoutProps) {
    const { t } = useTranslation();
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    const isAuthenticated = !!auth?.user;

    return (
        <div className="min-h-screen bg-background">
            {showHeader && (
                <header className={`sticky top-0 z-50 w-full border-b bg-background ${variant === 'minimal' ? 'border-border shadow-sm' : 'border-border shadow-md'}`}>
                    <div className="container mx-auto px-6">
                        <div className="flex items-center justify-between h-16">
                            {/* Logo */}
                            <Link href="/" className="flex items-center space-x-2">
                                <AppLogoIcon className="w-8 h-8 text-primary dark:text-primary-foreground transition-colors" />
                                <span className="text-xl font-bold text-foreground">Homsjogja</span>
                            </Link>

                            {/* Navigation */}
                            <nav className="hidden md:flex items-center space-x-8">
                                <Link href="/properties" className="text-muted-foreground hover:text-primary transition-colors">
                                    Properti
                                </Link>
                                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                                    Tentang Kami
                                                </Link>
                                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                                    Kontak
                                                </Link>
                            </nav>

                            {/* Auth Buttons & Theme Toggle */}
                            <div className="flex items-center space-x-4">
                                <AppearanceToggleDropdown />
                                {isAuthenticated ? (
                                    <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                                        Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">
                                            Masuk
                                        </Link>
                                        <Link href="/register" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                                            Daftar
                                        </Link>
                                    </>
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
                <footer className={cn(
                    "bg-background border-t",
                    variant === 'minimal' ? "border-border/50" : "border-border"
                )}>
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="py-12">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                {/* Company Info */}
                                <div className="col-span-1 md:col-span-2">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <Crown className="h-8 w-8 text-primary" />
                                        <span className="text-2xl font-bold text-foreground">Homsjogja</span>
                                    </div>
                                    <p className="text-muted-foreground max-w-md leading-relaxed">
                                        Platform homestay terpercaya untuk pengelolaan villa dan homestay di Indonesia. 
                                        Pengalaman menginap dengan citarasa budaya Jawa yang autentik.
                                    </p>
                                </div>

                                {/* Quick Links */}
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">
                                        Quick Links
                                    </h3>
                                    <ul className="space-y-3">
                                        <li>
                                            <Link href="/properties" className="text-muted-foreground hover:text-primary transition-colors">
                                                {t('nav.browse_properties')}
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">
                                                {t('nav.help')}
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/support" className="text-muted-foreground hover:text-primary transition-colors">
                                                {t('nav.support')}
                                            </Link>
                                        </li>
                                    </ul>
                                </div>

                                {/* Contact */}
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">
                                        Contact
                                    </h3>
                                    <ul className="space-y-3 text-muted-foreground">
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

                            <div className="mt-8 pt-8 border-t border-border">
                                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                                    <p className="text-center md:text-left text-muted-foreground">
                                        © 2025 Homsjogja. All rights reserved.
                                    </p>
                                    <div className="flex items-center space-x-6 text-muted-foreground">
                                        <Link href="/privacy" className="hover:text-primary transition-colors">Privasi</Link>
                                        <Link href="/terms" className="hover:text-primary transition-colors">Ketentuan</Link>
                                        <span className="flex items-center">
                                            <Crown className="h-4 w-4 mr-1 text-primary" />
                                            Made with ❤️ in Jogja
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