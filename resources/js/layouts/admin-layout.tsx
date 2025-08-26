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
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, useForm, Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import AppLogoIcon from '@/components/app-logo-icon';
import { NotificationBell } from '@/components/notifications/notification-bell';

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
        ]
      },
      {
        title: 'Operations',
        href: '/admin/operations',
        icon: ListChecks,
        children: [
          { title: 'Cleaning Tasks', href: '/admin/cleaning-tasks', icon: ListChecks },
          { title: 'Cleaning Staff', href: '/admin/cleaning-staff', icon: Sparkles },
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
      <AppShell className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header selalu di atas */}
        {showHeader && (
          <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Left Section in Header */}
                <div className="flex items-center space-x-4">
                  {/* Mobile menu button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden h-9 w-9 p-0"
                  >
                    <Menu className="h-5 w-5 text-gray-900" />
                  </Button>

                  {/* Logo hanya di desktop */}
                  <div className="hidden lg:flex items-center space-x-2">
                    <AppLogoIcon variant="primary" className="h-7 w-7" />
                    <span className="text-lg font-bold text-gray-900">Homsjogja</span>
                  </div>

                  {/* Title & subtitle */}
                  {title && (
                    <div>
                      <h1 className="text-lg lg:text-xl font-semibold text-gray-900">{title}</h1>
                      {/* subtitle hanya tampil di desktop */}
                      <p className="hidden lg:block text-sm text-gray-600">{subtitle}</p>
                    </div>
                  )}
                </div>


                {/* Right Section */}
                <div className="flex items-center space-x-4">

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
                          <p className="text-sm font-medium leading-none">{auth.user.name}</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {auth.user.email}
                          </p>
                          <Badge variant="secondary" className="w-fit text-xs">
                            {getRoleDisplayName(auth.user.role)}
                          </Badge>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <UserIcon className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/settings" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <form onSubmit={handleLogout} className="w-full">
                          <button
                            type="submit"
                            disabled={logoutForm.processing}
                            className="flex w-full items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
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
            <SheetContent side="left" className="w-72 p-0 bg-white border-r border-gray-200">
              {/* Header logo */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-3">
                  <AppLogoIcon variant="primary" className="h-8 w-8" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Homsjogja</h2>
                    <p className="text-xs text-gray-500">Admin Panel</p>
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
            <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200">
              {/* Nav scrollable */}
              <div className="flex-1 overflow-y-auto px-2 py-4">
                <AdminSidebarContent navItems={navItems} />
              </div>
            </aside>
          )}

          {/* Main Content */}
          <AppContent
            variant="sidebar"
            className="flex-1 bg-gray-50"
            showHeader={showHeader}
          >
            <div className="p-6">
              {/* Breadcrumbs */}
              {breadcrumbs.length > 0 && (
                <nav className="mb-6">
                  <ol className="flex items-center space-x-2 text-sm text-gray-600">
                    {breadcrumbs.map((item, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && <span className="mx-2">/</span>}
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="hover:text-gray-900 hover:underline"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <span className="text-gray-900 font-medium">{item.title}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {children}
            </div>
          </AppContent>
        </div>
      </AppShell>
    </ErrorBoundary>

  );
}

// Admin Sidebar Content Component
function AdminSidebarContent({ navItems }: { navItems: ReturnType<typeof getAdminNavItems> }) {
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (title: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <nav className="space-y-1 px-3">
      {navItems.map((item) => (
        <div key={item.title}>
          {item.children ? (
            // Group with children
            <div>
              <button
                onClick={() => toggleExpanded(item.title)}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
                  expandedItems.has(item.title) && "bg-gray-100 text-gray-900"
                )}
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" />
                  {t(`nav.${item.title.toLowerCase().replace(/\s+/g, '_')}`)}
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedItems.has(item.title) && "rotate-180"
                  )}
                />
              </button>

              {expandedItems.has(item.title) && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="flex items-center px-3 py-2 text-sm text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      <child.icon className="mr-3 h-4 w-4" />
                      {t(`nav.${child.title.toLowerCase().replace(/\s+/g, '_')}`)}
                      {child.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
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
            <Link
              href={item.href}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <item.icon className="mr-3 h-5 w-5" />
              {t(item.title.toLowerCase().replace(/\s+/g, '_'))}
              {item.badge && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
