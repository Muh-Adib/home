import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Home, Building2, Phone, Mail, User, Info, FileText } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import LanguageSwitcher from '@/components/language-switcher';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { useTranslation } from 'react-i18next';
import CookieConsent from "@/components/cookie-consent";
import { motion } from 'framer-motion';

interface GuestLayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;
    showFooter?: boolean;
    variant?: 'default' | 'minimal';
}

const publicNavItems = [
    { key: 'properties', href: '/properties', icon: Building2, label: 'nav.properties' },
    { key: 'articles', href: '/articles', icon: FileText, label: 'nav.articles' },
    { key: 'about', href: '/about', icon: Info, label: 'nav.about' },
];

const authNavItems = [
    { key: 'dashboard', href: '/dashboard', icon: Home, label: 'nav.dashboard' },
    { key: 'properties', href: '/properties', icon: Building2, label: 'nav.properties' },
    { key: 'articles', href: '/articles', icon: FileText, label: 'nav.articles' },
    { key: 'profile', href: '/settings/profile', icon: User, label: 'nav.profile' },
];

const mobileGuestItems = [
    { key: 'home', href: '/', icon: Home, label: 'nav.home', external: false },
    { key: 'properties', href: '/properties', icon: Building2, label: 'nav.properties', external: false },
    { key: 'articles', href: '/articles', icon: FileText, label: 'nav.articles', external: false },
    { key: 'contact', href: 'https://wa.me/628112500082', icon: Phone, label: 'nav.contact', external: true },
];

const mobileAuthItems = [
    { key: 'home', href: '/', icon: Home, label: 'nav.home', external: false },
    { key: 'properties', href: '/properties', icon: Building2, label: 'nav.properties', external: false },
    { key: 'articles', href: '/articles', icon: FileText, label: 'nav.articles', external: false },
    { key: 'profile', href: '/settings/profile', icon: User, label: 'nav.profile', external: false },
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

    const [scrolled, setScrolled] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [currentPath, setCurrentPath] = useState('');

    useEffect(() => { setCurrentPath(window.location.pathname); }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const isTransparent = !scrolled && variant !== 'minimal';
    const mobileItems = isAuthenticated ? mobileAuthItems : mobileGuestItems;

    return (
        <div className="min-h-screen bg-background flex flex-col">

            {/* ═══ DESKTOP NAVBAR — floating pill (Airbnb-style) ═══════ */}
            {showHeader && (
                <div className="hidden md:block sticky top-0 z-50 w-full pointer-events-none">
                    <div className="px-4 pt-3 pb-1">
                        <motion.nav
                            className="mx-auto max-w-5xl pointer-events-auto"
                            animate={{
                                backgroundColor: isTransparent
                                    ? 'rgba(255,255,255,0.10)'
                                    : isDark
                                        ? 'rgba(18,18,18,0.94)'
                                        : 'rgba(255,255,255,0.96)',
                                boxShadow: isTransparent
                                    ? 'inset 0 0 0 1px rgba(255,255,255,0.18)'
                                    : isDark
                                        ? '0 8px 32px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.07)'
                                        : '0 4px 24px rgba(0,0,0,0.09), inset 0 0 0 1px rgba(0,0,0,0.07)',
                                backdropFilter: 'blur(28px) saturate(180%)',
                            }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            style={{ borderRadius: '9999px' }}
                        >
                            <div className="flex items-center justify-between h-14 px-5">
                                {/* Logo */}
                                <Link href="/" className="flex items-center gap-2 shrink-0">
                                    <AppLogoIcon className="w-7 h-7 text-brand-primary" />
                                    <span className={cn(
                                        "text-[17px] font-bold tracking-tight transition-colors duration-300",
                                        isTransparent ? "text-white drop-shadow-sm" : "text-brand-primary"
                                    )}>
                                        Homsjogja
                                    </span>
                                </Link>

                                {/* Center nav links */}
                                <nav className="flex items-center gap-0.5">
                                    {(!isAuthenticated ? publicNavItems : authNavItems).map((item) => {
                                        const isActive = currentPath === item.href;
                                        return (
                                            <Link
                                                key={item.key}
                                                href={item.href}
                                                className={cn(
                                                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                                    isTransparent
                                                        ? cn("text-white/85 hover:text-white hover:bg-white/15",
                                                            isActive && "text-white bg-white/20 font-semibold")
                                                        : cn("text-muted-foreground hover:text-foreground hover:bg-muted/70",
                                                            isActive && "text-brand-primary bg-brand-primary/8 font-semibold")
                                                )}
                                            >
                                                {t(item.label)}
                                            </Link>
                                        );
                                    })}
                                </nav>

                                {/* Right: utilities + auth */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className={cn(
                                        "flex items-center gap-0.5",
                                        isTransparent && "[&_button]:text-white/80 [&_button:hover]:text-white"
                                    )}>
                                        <AppearanceToggleDropdown />
                                        <LanguageSwitcher />
                                    </div>
                                    <div className={cn("w-px h-5 mx-1", isTransparent ? "bg-white/25" : "bg-border")} />
                                    {isAuthenticated ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className={cn(
                                                    "flex items-center gap-2 rounded-full border transition-all duration-200 pl-3 pr-1 py-1",
                                                    isTransparent
                                                        ? "border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50"
                                                        : "border-border bg-background hover:border-brand-primary/40 hover:shadow-md"
                                                )}>
                                                    <span className={cn("text-sm font-medium", isTransparent ? "text-white" : "text-foreground")}>
                                                        {auth.user.name.split(' ')[0]}
                                                    </span>
                                                    <Avatar className="h-7 w-7">
                                                        <AvatarImage src="" alt={auth.user.name} />
                                                        <AvatarFallback className="bg-brand-primary text-white text-xs font-semibold">
                                                            {getInitials(auth.user.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-56 mt-2" align="end">
                                                <UserMenuContent user={auth.user} />
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href="/login"
                                                className={cn(
                                                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                                    isTransparent
                                                        ? "text-white/90 hover:text-white hover:bg-white/15"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                                )}
                                            >
                                                {t('nav.login')}
                                            </Link>
                                            <Link
                                                href="/register"
                                                className={cn(
                                                    "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm",
                                                    isTransparent
                                                        ? "bg-white text-brand-primary hover:bg-white/90 shadow-md"
                                                        : "bg-brand-primary text-white hover:bg-brand-primary/90"
                                                )}
                                            >
                                                {t('nav.register')}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.nav>
                    </div>
                </div>
            )}

            {/* ═══ MOBILE TOP BAR — logo + utilities only, NO hamburger ═ */}
            {showHeader && (
                <div className="md:hidden sticky top-0 z-50 w-full">
                    <motion.div
                        animate={{
                            backgroundColor: isTransparent
                                ? 'rgba(0,0,0,0)'
                                : isDark ? 'rgba(18,18,18,0.94)' : 'rgba(255,255,255,0.96)',
                            backdropFilter: isTransparent ? 'none' : 'blur(20px) saturate(180%)',
                            borderBottomColor: isTransparent
                                ? 'rgba(0,0,0,0)'
                                : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                        }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid' }}
                    >
                        <div className="flex items-center justify-between h-14 px-4">
                            <Link href="/" className="flex items-center gap-2">
                                <AppLogoIcon className="w-7 h-7 text-brand-primary" />
                                <span className={cn(
                                    "text-[17px] font-bold tracking-tight transition-colors duration-300",
                                    isTransparent ? "text-white drop-shadow-sm" : "text-brand-primary"
                                )}>
                                    Homsjogja
                                </span>
                            </Link>
                            <div className="flex items-center gap-1">
                                <div className={cn(isTransparent && "[&_button]:text-white/80")}>
                                    <AppearanceToggleDropdown />
                                </div>
                                {isAuthenticated ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className={cn(
                                                "flex items-center rounded-full border transition-all p-0.5 ml-1",
                                                isTransparent ? "border-white/30 bg-white/10" : "border-border bg-background"
                                            )}>
                                                <Avatar className="h-7 w-7">
                                                    <AvatarImage src="" alt={auth.user.name} />
                                                    <AvatarFallback className="bg-brand-primary text-white text-xs font-semibold">
                                                        {getInitials(auth.user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56 mt-2" align="end">
                                            <UserMenuContent user={auth.user} />
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <Link
                                        href="/register"
                                        className={cn(
                                            "ml-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                                            isTransparent ? "bg-white text-brand-primary shadow-sm" : "bg-brand-primary text-white"
                                        )}
                                    >
                                        {t('nav.register')}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ═══ MAIN CONTENT ══════════════════════════════════════════ */}
            <main className="flex-1 pb-28 md:pb-0">
                {children}
            </main>

            {/* ═══ MOBILE BOTTOM NAV — floating pill ═════════════════════ */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
                <div
                    className={cn(
                        "mx-4 mb-4 rounded-2xl border shadow-2xl pointer-events-auto",
                        isDark ? "bg-zinc-900/96 border-white/10" : "bg-white/97 border-black/[0.07]"
                    )}
                    style={{ backdropFilter: 'blur(28px) saturate(180%)' }}
                >
                    <div className="flex items-stretch justify-around px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                        {mobileItems.map((item) => {
                            const isActive = !item.external && currentPath === item.href;
                            const content = (
                                <span className="flex flex-col items-center gap-1 px-3 py-1 min-w-[56px]">
                                    <span className={cn(
                                        "flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200",
                                        isActive ? "bg-brand-primary/10" : "bg-transparent"
                                    )}>
                                        <item.icon className={cn(
                                            "w-5 h-5 transition-all duration-200",
                                            isActive ? "text-brand-primary" : "text-muted-foreground"
                                        )} />
                                    </span>
                                    <span className={cn(
                                        "text-[10px] font-medium leading-none transition-colors duration-200",
                                        isActive ? "text-brand-primary" : "text-muted-foreground"
                                    )}>
                                        {t(item.label)}
                                    </span>
                                </span>
                            );
                            if (item.external) {
                                return (
                                    <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-center">
                                        {content}
                                    </a>
                                );
                            }
                            return (
                                <Link key={item.key} href={item.href} className="flex items-center justify-center">
                                    {content}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* ═══ FOOTER ════════════════════════════════════════════════ */}
            {showFooter && (
                <footer className={cn(
                    "bg-background border-t",
                    variant === 'minimal' ? "border-border/50" : "border-border"
                )}>
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="py-12">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                {/* Company Info */}
                                <div className="md:col-span-5">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <AppLogoIcon className="w-8 h-8 text-brand-primary" />
                                        <span className="text-2xl font-bold text-brand-primary">Homsjogja</span>
                                    </div>
                                    <p className="text-muted-foreground max-w-md leading-relaxed mb-4">
                                        Dari homestay yang hangat hingga villa yang eksklusif, Homsjogja menawarkan pengalaman menginap yang nyaman, autentik, dan memanjakan setiap tamu.
                                    </p>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <AppLogoIcon className="w-4 h-4 mr-1 text-brand-primary" />
                                        {t('nav.made_with_love_in_jogja')}
                                    </div>
                                </div>

                                {/* Quick Links */}
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-semibold text-brand-primary tracking-wider uppercase mb-4">
                                        {t('nav.quick_links')}
                                    </h3>
                                    <ul className="space-y-3">
                                        {[
                                            { href: '/about', label: 'nav.about' },
                                            { href: '/properties', label: 'nav.browse_properties' },
                                            { href: '/articles', label: 'nav.articles' },
                                            { href: '/support', label: 'nav.support' },
                                            { href: '/faq', label: 'nav.faq' },
                                        ].map((link) => (
                                            <li key={link.href}>
                                                <Link href={link.href} className="text-sm text-muted-foreground hover:text-brand-primary transition-colors">
                                                    {t(link.label)}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Legal */}
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-semibold text-brand-primary tracking-wider uppercase mb-4">
                                        {t('nav.legal')}
                                    </h3>
                                    <ul className="space-y-3">
                                        {[
                                            { href: '/privacy', label: 'nav.privacy' },
                                            { href: '/tos', label: 'nav.tos' },
                                            { href: '/refundpolicy', label: 'nav.refundpolicy' },
                                            { href: '/paymentpolicy', label: 'nav.paymentpolicy' },
                                            { href: '/disclaimer', label: 'nav.disclaimer' },
                                        ].map((link) => (
                                            <li key={link.href}>
                                                <Link href={link.href} className="text-sm text-muted-foreground hover:text-brand-primary transition-colors">
                                                    {t(link.label)}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Contact */}
                                <div className="md:col-span-3">
                                    <h3 className="text-sm font-semibold text-brand-primary tracking-wider uppercase mb-4">
                                        {t('nav.contact')}
                                    </h3>
                                    <ul className="space-y-3 text-muted-foreground">
                                        <li className="flex items-start">
                                            <Mail className="h-4 w-4 mr-2 mt-0.5 text-brand-primary flex-shrink-0" />
                                            <a href="mailto:contact@homsjogja.com" className="text-sm hover:text-brand-primary transition-colors break-all">
                                                contact@homsjogja.com
                                            </a>
                                        </li>
                                        <li className="flex items-start">
                                            <Phone className="h-4 w-4 mr-2 mt-0.5 text-brand-primary flex-shrink-0" />
                                            <a href="tel:+628112500082" className="text-sm hover:text-brand-primary transition-colors">
                                                +62 811 2500 082
                                            </a>
                                        </li>
                                        <li className="flex items-start">
                                            <Home className="h-4 w-4 mr-2 mt-0.5 text-brand-primary flex-shrink-0" />
                                            <span className="text-sm">Yogyakarta, Indonesia</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-border">
                                <p className="text-center text-sm text-muted-foreground">
                                    © 2026 Homsjogja.{' '}
                                    <a href="/copyrightpolicy" className="hover:text-brand-primary transition-colors">
                                        {t('nav.all_rights_reserved')}
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </footer>
            )}

            <CookieConsent />
        </div>
    );
}
