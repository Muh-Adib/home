import React, { useState } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { type BreadcrumbItem, type User } from '@/types';
import { type PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';
import { type PageProps } from '@/types';
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
  Sparkles,
  ListChecks,
  DollarSign,
  FileText,
  User as UserIcon,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
    { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid, badge: null },
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
          { title: 'Create Booking', href: '/admin/bookings/create', icon: Calendar },
          { title: 'Check-in/Out', href: '/admin/bookings/check-in-out', icon: Shield },
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
          { title: 'Staff Management', href: '/admin/staff', icon: Shield },
        ]
      },
      {
        title: 'Operations',
        href: '/admin/operations',
        icon: ListChecks,
        children: [
          { title: 'Cleaning Tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
          { title: 'Cleaning Staff', href: '/admin/cleaning-staff', icon: Sparkles },
          { title: 'Schedules', href: '/admin/schedules', icon: Calendar },
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
          { title: 'System Logs', href: '/admin/settings/logs', icon: FileText },
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
        ]
      },
      {
        title: 'Booking Management',
        href: '/admin/bookings',
        icon: BookOpen,
        children: [
          { title: 'All Bookings', href: '/admin/bookings', icon: BookOpen },
          { title: 'Create Booking', href: '/admin/bookings/create', icon: Calendar },
          { title: 'Check-in/Out', href: '/admin/bookings/check-in-out', icon: Shield },
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
          { title: 'Cleaning Tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
          { title: 'Cleaning Staff', href: '/admin/cleaning-staff', icon: Sparkles },
          { title: 'Inventory Items', href: '/admin/inventory/items', icon: Folder },
          { title: 'Inventory Purchases', href: '/admin/inventory/purchases', icon: Folder },
          { title: 'Inventory Usages', href: '/admin/inventory/usages', icon: Folder },
        ]
      }
    ],
    front_desk: [
      ...baseItems,
      {
        title: 'Booking Management',
        href: '/admin/bookings',
        icon: BookOpen,
        children: [
          { title: 'All Bookings', href: '/admin/bookings', icon: BookOpen },
          { title: 'Create Booking', href: '/admin/bookings/create', icon: Calendar },
          { title: 'Check-in/Out', href: '/admin/bookings/check-in-out', icon: Shield },
        ]
      },
      {
        title: 'Guest Services',
        href: '/admin/guests',
        icon: Users,
        children: [
          { title: 'Guest List', href: '/admin/guests', icon: Users },
          { title: 'Guest Support', href: '/admin/guest-support', icon: Shield },
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
          { title: 'Payment Status', href: '/admin/bookings/payment-status', icon: CreditCard },
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
          { title: 'Cleaning Tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
          { title: 'Cleaning Staff', href: '/admin/cleaning-staff', icon: Sparkles },
          { title: 'Schedules', href: '/admin/schedules', icon: Calendar },
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
          { title: 'Room Status', href: '/admin/bookings/room-status', icon: Building2 },
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
  const logoutForm = useForm({});

  const navItems = getAdminNavItems(auth.user.role);
  const isGuest = auth.user.role === 'guest';

  // Jika user adalah guest, redirect ke dashboard guest
  if (isGuest) {
    router.visit('/dashboard');
    return null;
  }

  const handleLogout = () => {
    logoutForm.post('/logout');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

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
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden h-9 w-9 p-0 hover:bg-brand-primary-20"
                  >
                    <Menu className="h-5 w-5 text-brand-primary" />
                  </Button>

                  {/* Desktop Sidebar Toggle - menggantikan logo */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
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
                  {/* Theme Toggle */}
                  <AppearanceToggleDropdown />

                  {/* Language Switcher */}
                  <LanguageSwitcher />

                  {/* Notifications */}
                  <NotificationBell userId={auth.user.id} />

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src="" alt={auth.user.name} />
                          <AvatarFallback>
                            {auth.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none text-brand-primary">{auth.user.name}</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {auth.user.email}
                          </p>
                          <Badge variant="secondary" className="w-fit text-xs bg-brand-primary-20 text-brand-primary border-brand-primary-30">
                            {getRoleDisplayName(auth.user.role)}
                          </Badge>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer hover:bg-brand-primary-20">
                          <UserIcon className="mr-2 h-4 w-4 text-brand-primary" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/settings" className="cursor-pointer hover:bg-brand-primary-20">
                          <Settings className="mr-2 h-4 w-4 text-brand-primary" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <form onSubmit={handleLogout} className="w-full">
                          <button
                            type="submit"
                            disabled={logoutForm.processing}
                            className="flex w-full items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            {logoutForm.processing ? "Logging out..." : "Log out"}
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

        <div className="flex flex-1">
          {/* Mobile Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-72 p-0 bg-brand-primary border-r border-brand-primary-20">
              {/* Header logo */}
              <div className="px-6 py-5 border-b border-white/20 bg-gradient-to-r from-brand-primary to-brand-primary-dark">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <AppLogoIcon variant="primary" className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Homsjogja</h2>
                    <p className="text-xs text-white/90 font-medium">Admin Panel</p>
                  </div>
                </div>
              </div>

              {/* Nav scrollable */}
              <div className="flex-1 overflow-y-auto py-4">
                <AdminSidebarContent navItems={navItems} />
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Sidebar */}
          {showSidebar && (
            <aside className={`hidden lg:flex lg:flex-col transition-all duration-300 ease-in-out ${
              sidebarCollapsed ? 'w-16' : 'w-64'
            } bg-brand-primary border-r border-brand-primary-20 shadow-lg`}>
              {/* Header logo */}
              <div className={`px-6 py-5 border-b border-white/20 bg-gradient-to-r from-brand-primary to-brand-primary-dark ${
                sidebarCollapsed ? 'px-3' : ''
              }`}>
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
                  <div className={`bg-white/20 rounded-lg ${sidebarCollapsed ? 'p-2' : 'p-2'}`}>
                    <AppLogoIcon variant="primary" className={`text-white ${sidebarCollapsed ? 'h-5 w-5' : 'h-6 w-6'}`} />
                  </div>
                  {!sidebarCollapsed && (
                    <div>
                      <h2 className="text-lg font-bold text-white">Homsjogja</h2>
                      <p className="text-xs text-white/90 font-medium">Admin Panel</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Nav scrollable */}
              <div className="flex-1 overflow-y-auto px-2 py-4">
                <TooltipProvider>
                  <AdminSidebarContent navItems={navItems} collapsed={sidebarCollapsed} />
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
                        {index > 0 && <span className="mx-2 text-brand-primary font-medium">/</span>}
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

              <div className="space-y-6">
                {children}
              </div>
            </div>
          </AppContent>
        </div>
      </AppShell>
    </ErrorBoundary>

  );
}

// Admin Sidebar Content Component
function AdminSidebarContent({ navItems, collapsed = false }: { 
  navItems: ReturnType<typeof getAdminNavItems>;
  collapsed?: boolean;
}) {
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (title: string) => {
    if (collapsed) return; // Don't expand when collapsed
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <nav className={`space-y-2 ${collapsed ? 'px-1' : 'px-3'}`}>
      {navItems.map((item) => (
        <div key={item.title}>
          {item.children ? (
            // Group with children
            <div>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggleExpanded(item.title)}
                      className={cn(
                        "flex items-center w-full rounded-lg transition-all duration-200 group",
                        "text-white hover:text-white hover:bg-white/15 hover:shadow-md",
                        expandedItems.has(item.title) && "bg-white/25 text-white shadow-lg",
                        "px-2 py-3 justify-center"
                      )}
                    >
                      <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-brand-primary text-white border-brand-primary-20">
                    <p>{t(`nav.${item.title.toLowerCase().replace(/\s+/g, '_')}`)}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => toggleExpanded(item.title)}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 group",
                    "text-white hover:text-white hover:bg-white/15 hover:shadow-md",
                    expandedItems.has(item.title) && "bg-white/25 text-white shadow-lg"
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    <span className="text-sm font-semibold">
                      {t(`nav.${item.title.toLowerCase().replace(/\s+/g, '_')}`)}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      expandedItems.has(item.title) && "rotate-180"
                    )}
                  />
                </button>
              )}

              {!collapsed && expandedItems.has(item.title) && (
                <div className="ml-6 mt-2 space-y-1 border-l-2 border-white/20 pl-4">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="flex items-center px-3 py-2 text-sm text-white/85 rounded-md hover:text-white hover:bg-white/10 hover:shadow-sm transition-all duration-200 group"
                    >
                      <child.icon className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                      {t(`nav.${child.title.toLowerCase().replace(/\s+/g, '_')}`)}
                      {child.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs bg-brand-accent text-white border-0 font-semibold">
                          {child.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Single item
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className="flex items-center px-2 py-3 text-sm font-semibold text-white/90 rounded-lg hover:text-white hover:bg-white/15 hover:shadow-md transition-all duration-200 group justify-center"
                  >
                    <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-brand-primary text-white border-brand-primary-20">
                  <p>{t(item.title.toLowerCase().replace(/\s+/g, '_'))}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href={item.href}
                className="flex items-center px-4 py-3 text-sm font-semibold text-white/90 rounded-lg hover:text-white hover:bg-white/15 hover:shadow-md transition-all duration-200 group"
              >
                <item.icon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                <span>{t(item.title.toLowerCase().replace(/\s+/g, '_'))}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs bg-brand-accent text-white border-0 font-semibold">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          )}
        </div>
      ))}
    </nav>
  );
}
