import React, { useState } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { type BreadcrumbItem, type User } from '@/types';
import { type PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';
import { type PageProps } from '@/types';
import { ToastProvider } from "@/components/ToastProvider";
import {
  LayoutGrid,
  Folder,
  BookOpen,
  CreditCard,
  Users,
  Building2,
  Settings,
  BarChart3,
  Shield,
  Calendar,
  ListChecks,
  DollarSign,
  FileText,
  User as UserIcon,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  MessageSquare,
  KeySquare,
  FilePen,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { router, useForm, Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import AppLogoIcon from '@/components/app-logo-icon';
import { NotificationBell } from '@/components/notifications/notification-bell';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import LanguageSwitcher from '@/components/language-switcher';

interface AdminLayoutProps extends PropsWithChildren<{}> {
  breadcrumbs?: BreadcrumbItem[];
  showHeader?: boolean;
  showSidebar?: boolean;
  title?: string;
  subtitle?: string;
}

// Navigation items berdasarkan role admin
const getAdminNavItems = (userRole: User['role']) => {
  const baseItems = [
    { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutGrid, badge: null },
    { title: 'Articles', href: '/admin/articles', icon: FilePen, badge: null },
  ];

  const roleBasedItems: Record<User['role'], Array<{
    title: string;
    href: string;
    icon: any;
    badge?: string | number | null;
    children?: Array<{
      title: string;
      href: string;
      icon: any;
      badge?: string | number | null;
    }>;
  }>> = {
    super_admin: [
      ...baseItems,
      {
        title: 'Property Management',
        href: '/admin/properties',
        icon: Folder,
        children: [
          { title: 'All Properties', href: '/admin/properties', icon: Folder },
          { title: 'Add Property', href: '/admin/properties/create', icon: Building2 },
          { title: 'Rate Management', href: '/admin/rate-management', icon: DollarSign },
          { title: 'Amenities', href: '/admin/amenities', icon: Building2 },
          { title: 'Extra Service', href: '/admin/extra-services', icon: Package },
        ]
      },
      {
        title: 'Booking Management',
        href: '/admin/bookings',
        icon: BookOpen,
        children: [
          { title: 'All Bookings', href: '/admin/bookings', icon: BookOpen },
          { title: 'Daily Operations', href: '/admin/bookings/daily-operations', icon: ListChecks },
          { title: 'Create Booking', href: '/admin/bookings/create', icon: Calendar },
          { title: 'Check-in/Out Report', href: '/admin/bookings/check-in-out', icon: Shield },
        ]
      },
      {
        title: 'Financial',
        href: '/admin/payments',
        icon: CreditCard,
        children: [
          { title: 'Payments', href: '/admin/payments', icon: CreditCard },
          { title: 'Payment Methods', href: '/admin/payment-methods', icon: DollarSign },
          { title: 'Reports', href: '/admin/reports', icon: BarChart3 },
          { title: 'Finance', href: '/admin/finance', icon: DollarSign },
          { title: 'Incomes', href: '/admin/finance/incomes', icon: DollarSign },
          { title: 'Expenses', href: '/admin/finance/expenses', icon: FileText },
          { title: 'Wallets', href: '/admin/finance/wallets', icon: CreditCard },
        ]
      },
      {
        title: 'User Management',
        href: '/admin/users',
        icon: Users,
        children: [
          { title: 'All Users', href: '/admin/users', icon: Users },
        ]
      },
      {
        title: 'Operations',
        href: '/admin/operations',
        icon: ListChecks,
        children: [
          { title: 'Inventory Items', href: '/admin/inventory/items', icon: Folder },
          { title: 'Inventory Purchases', href: '/admin/inventory/purchases', icon: Folder },
          { title: 'Inventory Usages', href: '/admin/inventory/usages', icon: Folder },
        ]
      },
      {
        title: 'System',
        href: '/admin/settings',
        icon: Settings,
        children: [
          { title: 'General Settings', href: '/admin/settings/general', icon: Settings },
          { title: 'WhatsApp GOWA', href: '/admin/gowa', icon: MessageSquare },
          { title: 'System Logs', href: '/admin/settings/system/logs', icon: FileText },
          { title: 'Legal', href: '/admin/legal/', icon: FileText },
          { title: 'AI Provider Keys', href: '/admin/settings/ai-keys', icon: KeySquare },
          { title: 'SEO Pages', href: '/admin/seo-pages', icon: Globe }
        ]
      }
    ],
    property_owner: [
      ...baseItems,
      {
        title: 'My Properties',
        href: '/admin/properties',
        icon: Folder,
        children: [
          { title: 'All Properties', href: '/admin/properties', icon: Folder },
          { title: 'Add Property', href: '/admin/properties/create', icon: Building2 },
          { title: 'Rate Management', href: '/admin/rate-management', icon: DollarSign },
          { title: 'Extra Service', href: '/admin/extra-services', icon: Package },
        ]
      },
      {
        title: 'My Bookings',
        href: '/admin/bookings',
        icon: BookOpen,
        children: [
          { title: 'All Bookings', href: '/admin/bookings', icon: BookOpen },
          { title: 'Create Booking', href: '/admin/bookings/create', icon: Calendar },
        ]
      },
      {
        title: 'Financial',
        href: '/admin/payments',
        icon: CreditCard,
        children: [
          { title: 'Payments', href: '/admin/payments', icon: CreditCard },
          { title: 'Reports', href: '/admin/reports', icon: BarChart3 },
          { title: 'Finance', href: '/admin/finance', icon: DollarSign },
          { title: 'Incomes', href: '/admin/finance/incomes', icon: DollarSign },
          { title: 'Expenses', href: '/admin/finance/expenses', icon: FileText },
          { title: 'Wallets', href: '/admin/finance/wallets', icon: CreditCard },
        ]
      }
    ],
    property_manager: [
      ...baseItems,
      {
        title: 'Property Management',
        href: '/admin/properties',
        icon: Folder,
        children: [
          { title: 'All Properties', href: '/admin/properties', icon: Folder },
          { title: 'Add Property', href: '/admin/properties/create', icon: Building2 },
          { title: 'Rate Management', href: '/admin/rate-management', icon: DollarSign },
        ]
      },
      {
        title: 'Booking Management',
        href: '/admin/bookings',
        icon: BookOpen,
        children: [
          { title: 'All Bookings', href: '/admin/bookings', icon: BookOpen },
          { title: 'Daily Operations', href: '/admin/bookings/daily-operations', icon: ListChecks },
          { title: 'Create Booking', href: '/admin/bookings/create', icon: Calendar },
          { title: 'Check-in/Out Report', href: '/admin/bookings/check-in-out', icon: Shield },
        ]
      },
      {
        title: 'Financial',
        href: '/admin/payments',
        icon: CreditCard,
        children: [
          { title: 'Payments', href: '/admin/payments', icon: CreditCard },
          { title: 'Payment Methods', href: '/admin/payment-methods', icon: DollarSign },
          { title: 'Finance', href: '/admin/finance', icon: DollarSign },
          { title: 'Incomes', href: '/admin/finance/incomes', icon: DollarSign },
          { title: 'Expenses', href: '/admin/finance/expenses', icon: FileText },
          { title: 'Wallets', href: '/admin/finance/wallets', icon: CreditCard },
        ]
      },
      {
        title: 'Operations',
        href: '/admin/operations',
        icon: ListChecks,
        children: [
          { title: 'Inventory Items', href: '/admin/inventory/items', icon: Folder },
          { title: 'Inventory Purchases', href: '/admin/inventory/purchases', icon: Folder },
          { title: 'Inventory Usages', href: '/admin/inventory/usages', icon: Folder },
        ]
      }
    ],
    front_desk: [
      ...baseItems,
      {
        title: 'Properties',
        href: '/admin/properties',
        icon: Folder,
        children: [
          { title: 'All Properties', href: '/admin/properties', icon: Folder },
          { title: 'Rate Management', href: '/admin/rate-management', icon: DollarSign },
        ]
      },
      {
        title: 'Booking Management',
        href: '/admin/bookings',
        icon: BookOpen,
        children: [
          { title: 'All Bookings', href: '/admin/bookings', icon: BookOpen },
          { title: 'Daily Operations', href: '/admin/bookings/daily-operations', icon: ListChecks },
          { title: 'Create Booking', href: '/admin/bookings/create', icon: Calendar },
          { title: 'Check-in/Out Report', href: '/admin/bookings/check-in-out', icon: Shield },
        ]
      },
      {
        title: 'Operations',
        href: '/admin/inventory',
        icon: Package,
        children: [
          { title: 'Inventory Items', href: '/admin/inventory/items', icon: Folder },
          { title: 'Inventory Purchases', href: '/admin/inventory/purchases', icon: Folder },
          { title: 'Inventory Usages', href: '/admin/inventory/usages', icon: Folder },
        ]
      }
    ],
    finance: [
      ...baseItems,
      {
        title: 'Financial Management',
        href: '/admin/payments',
        icon: CreditCard,
        children: [
          { title: 'Payments', href: '/admin/payments', icon: CreditCard },
          { title: 'Payment Methods', href: '/admin/payment-methods', icon: DollarSign },
          { title: 'Reports', href: '/admin/reports', icon: BarChart3 },
          { title: 'Finance', href: '/admin/finance', icon: DollarSign },
          { title: 'Incomes', href: '/admin/finance/incomes', icon: DollarSign },
          { title: 'Expenses', href: '/admin/finance/expenses', icon: FileText },
          { title: 'Wallets', href: '/admin/finance/wallets', icon: CreditCard },
        ]
      },
      {
        title: 'Booking Overview',
        href: '/admin/bookings',
        icon: BookOpen,
        children: [
          { title: 'All Bookings', href: '/admin/bookings', icon: BookOpen },
        ]
      }
    ],
    housekeeping: [
      ...baseItems,
      {
        title: 'Operations',
        href: '/admin/operations',
        icon: ListChecks,
        children: [
          { title: 'Inventory Items', href: '/admin/inventory/items', icon: Folder },
          { title: 'Inventory Purchases', href: '/admin/inventory/purchases', icon: Folder },
          { title: 'Inventory Usages', href: '/admin/inventory/usages', icon: Folder },
        ]
      },
      {
        title: 'Booking Overview',
        href: '/admin/bookings',
        icon: BookOpen,
        children: [
          { title: 'All Bookings', href: '/admin/bookings', icon: BookOpen },
        ]
      }
    ],
    guest: []
  };

  return roleBasedItems[userRole] || [];
};

export default function AdminLayout({
  children,
  breadcrumbs = [],
  showHeader = true,
  showSidebar = true,
  title,
  subtitle
}: AdminLayoutProps) {
  const page = usePage<PageProps>();
  const { auth } = page.props;
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  const navItems = getAdminNavItems(auth.user.role);
  const isGuest = auth.user.role === 'guest';

  // Jika user adalah guest, redirect ke dashboard guest
  if (isGuest) {
    router.visit('/dashboard');
    return null;
  }

  const toggleDesktopSidebar = () => setSidebarCollapsed(prev => !prev);
  const openMobileSidebar = () => setSidebarOpen(true);
  const closeMobileSidebar = () => setSidebarOpen(false);


  return (
    <ErrorBoundary>
      <AppShell className="min-h-screen bg-background flex flex-col">
        {/* Header selalu di atas */}
        {showHeader && (
          <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Left Section in Header */}
                <div className="flex items-center space-x-4">
                  {/* Mobile menu button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openMobileSidebar}
                    aria-label="Open navigation menu"
                    className="lg:hidden h-9 w-9 p-0 hover:bg-brand-primary-20"
                  >
                    <Menu className="h-5 w-5 text-brand-primary" />
                  </Button>

                  {/* Mobile branding — only visible below lg */}
                  <div className="flex items-center space-x-2 lg:hidden">
                    <div className="p-1.5 bg-brand-primary rounded-lg">
                      <AppLogoIcon variant="primary" className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-base font-bold text-brand-primary">Homsjogja</span>
                  </div>

                  {/* Desktop Sidebar Toggle - menggantikan logo */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleDesktopSidebar}
                    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className="hidden lg:flex h-9 w-9 p-0 hover:bg-brand-primary-20"
                  >
                    {sidebarCollapsed ? (
                      <PanelLeftOpen className="h-5 w-5 text-brand-primary" />
                    ) : (
                      <PanelLeftClose className="h-5 w-5 text-brand-primary" />
                    )}
                  </Button>

                  {/* Title & subtitle */}
                  {title && (
                    <div>
                      <h1 className="text-lg lg:text-xl font-semibold text-brand-primary">{title}</h1>
                      {/* subtitle hanya tampil di desktop */}
                      <p className="hidden lg:block text-sm text-muted-foreground">{subtitle}</p>
                    </div>
                  )}
                </div>

                {/* Right Section */}
                <div className="flex items-center space-x-4">
                  {/* Notifications */}
                  <NotificationBell userId={auth.user.id} />
                </div>
              </div>
            </div>
          </header>
        )}

        <div className="flex flex-1">
          {/* Mobile Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={(open) => !open && closeMobileSidebar()}>
            <SheetContent side="left" className="w-72 p-0 border-r border-white/[0.06]" style={{ background: 'linear-gradient(180deg, #0d1526 0%, #111827 100%)' }}>
              <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
              <SidebarLogoHeader collapsed={false} />
              <TooltipProvider>
                <div className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  <AdminSidebarNav navItems={navItems} collapsed={false} onNavClick={closeMobileSidebar} />
                </div>
                <AdminSidebarFooter collapsed={false} />
              </TooltipProvider>
            </SheetContent>
          </Sheet>

          {/* Desktop Sidebar */}
          {showSidebar && (
            <aside
              className={cn(
                "hidden lg:flex lg:flex-col h-[calc(100vh-4rem)] sticky top-16",
                "transition-all duration-300 ease-in-out border-r border-white/[0.06] shadow-2xl",
                sidebarCollapsed ? "w-[68px]" : "w-64"
              )}
              style={{ background: 'linear-gradient(180deg, #0d1526 0%, #111827 100%)' }}
            >
              <SidebarLogoHeader collapsed={sidebarCollapsed} />

              {/* Nav scrollable */}
              <div className="flex-1 overflow-y-auto py-3 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <TooltipProvider>
                  <AdminSidebarNav navItems={navItems} collapsed={sidebarCollapsed} />
                </TooltipProvider>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0">
                <TooltipProvider>
                  <AdminSidebarFooter collapsed={sidebarCollapsed} />
                </TooltipProvider>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <AppContent
            variant="sidebar"
            className="flex-1 bg-brand-background"
            showHeader={showHeader}
          >
            <div className="p-6 space-y-6">
              {/* Breadcrumbs */}
              {breadcrumbs.length > 0 && (
                <nav className="mb-6">
                  <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
                    {breadcrumbs.map((item, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && <ChevronRight className="mx-2 h-4 w-4 text-brand-primary flex-shrink-0" />}
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="hover:text-brand-primary hover:underline transition-colors duration-200"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <span className="text-brand-primary font-semibold">{item.title}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              <div className="container mx-auto">
                {children}
                <ToastProvider />
              </div>
            </div>
          </AppContent>
        </div>
      </AppShell>
    </ErrorBoundary>

  );
}

// Sidebar Logo Header sub-component
function SidebarLogoHeader({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn(
      "flex-shrink-0 border-b border-white/[0.06]",
      collapsed ? "px-3 py-4" : "px-5 py-4"
    )}>
      <div className={cn(
        "flex items-center",
        collapsed ? "justify-center" : "gap-3"
      )}>
        {/* Logo mark */}
        <div className={cn(
          "relative flex-shrink-0 rounded-xl flex items-center justify-center",
          "bg-gradient-to-br from-brand-primary to-brand-primary-dark shadow-lg shadow-brand-primary/30",
          collapsed ? "h-9 w-9" : "h-10 w-10"
        )}>
          <AppLogoIcon variant="primary" className={cn("text-white", collapsed ? "h-5 w-5" : "h-5 w-5")} />
          {/* Glow dot */}
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0f1629] shadow-sm" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-white leading-tight tracking-tight">Homsjogja</h2>
            <p className="text-[11px] text-white/40 font-medium tracking-wide uppercase mt-0.5">Admin Panel</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Admin Sidebar Navigation Component (Scrollable)
function AdminSidebarNav({ navItems, collapsed = false, onNavClick }: {
  navItems: ReturnType<typeof getAdminNavItems>;
  collapsed?: boolean;
  onNavClick?: () => void;
}) {
  const { t } = useTranslation();
  const page = usePage<PageProps>();
  const ziggy = page.props.ziggy as { location?: string };
  const currentPath = ziggy.location
    ? new URL(ziggy.location).pathname
    : '';

  const isChildActive = (href: string) => currentPath === href || currentPath.startsWith(href + '/');
  const isGroupActive = (children?: Array<{ href: string }>) =>
    children?.some((c) => isChildActive(c.href)) ?? false;

  const flatItems = navItems.filter(i => !i.children);
  const groupItems = navItems.filter(i => i.children);

  return (
    <nav className={cn("flex flex-col", collapsed ? "px-2 gap-1" : "px-3 gap-0.5")}>

      {/* Flat items (Dashboard, Articles) */}
      {flatItems.length > 0 && (
        <div className={cn("flex flex-col", collapsed ? "gap-1" : "gap-0.5 mb-2")}>
          {flatItems.map((item) => (
            collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-current={isChildActive(item.href) ? "page" : undefined}
                    onClick={() => onNavClick?.()}
                    className={cn(
                      "relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all duration-200 group",
                      isChildActive(item.href)
                        ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/40"
                        : "text-white/50 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {isChildActive(item.href) && (
                      <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-primary rounded-r-full" />
                    )}
                    <item.icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1e2d4a] text-white border-white/10 text-xs font-medium">
                  {t(`nav.${item.title.toLowerCase().replace(/\s+/g, '_')}`, item.title)}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isChildActive(item.href) ? "page" : undefined}
                onClick={() => onNavClick?.()}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                  isChildActive(item.href)
                    ? "bg-brand-primary text-white font-semibold shadow-md shadow-brand-primary/30"
                    : "text-white/55 hover:text-white hover:bg-white/[0.07]"
                )}
              >
                {isChildActive(item.href) && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-primary rounded-r-full" />
                )}
                <item.icon className={cn(
                  "h-[18px] w-[18px] flex-shrink-0 transition-all duration-200",
                  isChildActive(item.href) ? "text-white" : "text-white/40 group-hover:text-white/80 group-hover:scale-110"
                )} />
                <span className="truncate">{t(`nav.${item.title.toLowerCase().replace(/\s+/g, '_')}`, item.title)}</span>
                {item.badge && (
                  <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          ))}
        </div>
      )}

      {/* Group items with section labels */}
      {groupItems.map((item) => (
        <div key={item.title} className={cn(!collapsed && "mb-1")}>
          {/* Section label — expanded mode only */}
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25 truncate">
                {t(`nav.${item.title.toLowerCase().replace(/\s+/g, '_')}`, item.title)}
              </span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
          )}

          {/* Collapsed: group icon + all child icons inline */}
          {collapsed ? (
            <div className="flex flex-col gap-0.5">
              {/* Group icon — non-clickable, just a visual separator */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "relative flex items-center justify-center h-9 w-10 mx-auto rounded-lg cursor-default",
                      isGroupActive(item.children)
                        ? "text-brand-primary"
                        : "text-white/20"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1e2d4a] text-white border-white/10 text-xs font-medium">
                  {t(`nav.${item.title.toLowerCase().replace(/\s+/g, '_')}`, item.title)}
                </TooltipContent>
              </Tooltip>

              {/* Child icons */}
              {item.children?.map((child) => (
                <Tooltip key={child.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={child.href}
                      aria-current={isChildActive(child.href) ? "page" : undefined}
                      onClick={() => onNavClick?.()}
                      className={cn(
                        "relative flex items-center justify-center h-9 w-10 mx-auto rounded-xl transition-all duration-200 group",
                        isChildActive(child.href)
                          ? "bg-brand-primary text-white shadow-md shadow-brand-primary/40"
                          : "text-white/40 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {isChildActive(child.href) && (
                        <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-primary rounded-r-full" />
                      )}
                      <child.icon className="h-[15px] w-[15px] transition-transform duration-200 group-hover:scale-110" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1e2d4a] text-white border-white/10 text-xs font-medium">
                    {t(`nav.${child.title.toLowerCase().replace(/\s+/g, '_')}`, child.title)}
                  </TooltipContent>
                </Tooltip>
              ))}

              {/* Bottom divider */}
              <div className="mx-auto w-6 h-px bg-white/[0.08] my-1" />
            </div>
          ) : (
            /* Expanded: children list directly */
            <div className="flex flex-col gap-0.5 pb-1">
              {item.children?.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  aria-current={isChildActive(child.href) ? "page" : undefined}
                  onClick={() => onNavClick?.()}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 group",
                    isChildActive(child.href)
                      ? "bg-brand-primary text-white font-semibold shadow-md shadow-brand-primary/25"
                      : "text-white/45 hover:text-white/90 hover:bg-white/[0.06]"
                  )}
                >
                  {isChildActive(child.href) && (
                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-primary rounded-r-full" />
                  )}
                  <child.icon className={cn(
                    "h-4 w-4 flex-shrink-0 transition-all duration-200",
                    isChildActive(child.href)
                      ? "text-white"
                      : "text-white/30 group-hover:text-white/70 group-hover:scale-110"
                  )} />
                  <span className="truncate text-[13px]">
                    {t(`nav.${child.title.toLowerCase().replace(/\s+/g, '_')}`, child.title)}
                  </span>
                  {child.badge && (
                    <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                      {child.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

const ROLE_BADGE_COLORS: Record<User['role'], string> = {
  super_admin:      'bg-amber-500/20 text-amber-200 border-amber-500/30',
  property_owner:   'bg-blue-500/20 text-blue-200 border-blue-500/30',
  property_manager: 'bg-green-500/20 text-green-200 border-green-500/30',
  front_desk:       'bg-purple-500/20 text-purple-200 border-purple-500/30',
  finance:          'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  housekeeping:     'bg-orange-500/20 text-orange-200 border-orange-500/30',
  guest:            'bg-gray-500/20 text-gray-200 border-gray-500/30',
};

// Admin Sidebar Footer Component (Sticky at bottom)
function AdminSidebarFooter({ collapsed = false }: { collapsed?: boolean }) {
  const page = usePage<PageProps>();
  const { auth } = page.props;
  const logoutForm = useForm({});

  const getRoleDisplayName = (role: User['role']) => {
    const roleNames: Record<User['role'], string> = {
      super_admin: 'Super Administrator',
      property_owner: 'Property Owner',
      property_manager: 'Property Manager',
      front_desk: 'Front Desk',
      finance: 'Finance',
      housekeeping: 'Housekeeping',
      guest: 'Guest',
    };
    return roleNames[role];
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className={cn(
      "border-t border-white/[0.06] flex flex-col",
      collapsed ? "items-center px-2 py-3 gap-2" : "px-3 py-3 gap-2"
    )}>
      {/* Utility row */}
      <div className={cn(
        "flex items-center",
        collapsed ? "flex-col gap-1.5" : "gap-1.5 justify-end"
      )}>
        <LanguageSwitcher
          collapsed={collapsed}
          className={cn(
            "bg-transparent text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors",
            collapsed ? "h-9 w-9 p-0 flex items-center justify-center" : "h-8 px-2 text-xs"
          )}
        />
        <AppearanceToggleDropdown
          className={cn(
            "bg-transparent text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors",
            collapsed ? "h-9 w-9 flex items-center justify-center" : "h-8 w-8"
          )}
        />
      </div>

      {/* User button */}
      <DropdownMenu>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="relative flex items-center justify-center h-10 w-10 rounded-xl hover:bg-white/[0.07] transition-colors group">
                  <Avatar className="h-8 w-8 ring-2 ring-white/10 group-hover:ring-brand-primary/40 transition-all">
                    <AvatarImage src="" alt={auth.user.name} />
                    <AvatarFallback className="bg-brand-primary/30 text-white text-xs font-bold">
                      {getInitials(auth.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online dot */}
                  <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#111827]" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1e2d4a] text-white border-white/10">
              <p className="font-semibold text-sm">{auth.user.name}</p>
              <p className="text-xs text-white/50 mt-0.5">{getRoleDisplayName(auth.user.role)}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
              "hover:bg-white/[0.06] transition-colors group text-left",
              "ring-1 ring-white/[0.06] hover:ring-white/10"
            )}>
              <div className="relative flex-shrink-0">
                <Avatar className="h-8 w-8 ring-2 ring-white/10 group-hover:ring-brand-primary/40 transition-all">
                  <AvatarImage src="" alt={auth.user.name} />
                  <AvatarFallback className="bg-brand-primary/30 text-white text-xs font-bold">
                    {getInitials(auth.user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#111827]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white/90 truncate leading-tight">{auth.user.name}</p>
                <p className={cn(
                  "text-[10px] font-medium mt-0.5 truncate px-1.5 py-0.5 rounded-md w-fit",
                  ROLE_BADGE_COLORS[auth.user.role]
                )}>
                  {getRoleDisplayName(auth.user.role)}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-white/25 flex-shrink-0 group-hover:text-white/50 transition-colors" />
            </button>
          </DropdownMenuTrigger>
        )}

        <DropdownMenuContent className="w-56 bg-[#1a2540] border-white/10 text-white shadow-2xl" align="end" forceMount>
          <DropdownMenuLabel className="font-normal px-3 py-2.5">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-white">{auth.user.name}</p>
              <p className="text-xs text-white/40">{auth.user.email}</p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-white/[0.06]" />

          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer text-white/70 hover:text-white hover:bg-white/[0.07] focus:bg-white/[0.07] focus:text-white">
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/admin/settings" className="cursor-pointer text-white/70 hover:text-white hover:bg-white/[0.07] focus:bg-white/[0.07] focus:text-white">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/[0.06]" />

          <DropdownMenuItem asChild>
            <button
              onClick={() => logoutForm.post('/logout')}
              disabled={logoutForm.processing}
              className="flex w-full items-center px-2 py-1.5 text-sm cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors rounded-sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutForm.processing ? 'Logging out...' : 'Log out'}
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

