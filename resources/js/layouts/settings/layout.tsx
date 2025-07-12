import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { 
    User, 
    Shield, 
    Palette, 
    Settings as SettingsIcon,
    ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: '/settings/profile',
        icon: User,
    },
    {
        title: 'Password',
        href: '/settings/password',
        icon: Shield,
    },
    {
        title: 'Appearance',
        href: '/settings/appearance',
        icon: Palette,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { t } = useTranslation();
    
    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="py-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-gray-500">
                            <SettingsIcon className="h-5 w-5" />
                            <span className="text-sm font-medium">Settings</span>
                            <ChevronRight className="h-4 w-4" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        {t('settings.profile')}
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                        {t('settings.profile_description')}
                    </p>
                </div>

                {/* Main Content */}
                <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
                    {/* Sidebar Navigation */}
                    <aside className="w-full lg:w-64">
                        <div className="sticky top-8">
                            <div className="rounded-lg border bg-white p-4 shadow-sm">
                                <h3 className="mb-4 text-sm font-semibold text-gray-900">
                                    Account Settings
                                </h3>
                                <nav className="flex flex-col space-y-1">
                                    {sidebarNavItems.map((item, index) => {
                                        const Icon = item.icon;
                                        const isActive = currentPath === item.href;
                                        
                                        return (
                                            <Button
                                                key={`${item.href}-${index}`}
                                                size="sm"
                                                variant={isActive ? "default" : "ghost"}
                                                asChild
                                                className={cn('w-full justify-start h-10', {
                                                    'bg-blue-600 text-white hover:bg-blue-700': isActive,
                                                    'text-gray-700 hover:bg-gray-100 hover:text-gray-900': !isActive,
                                                })}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {Icon && <Icon className="mr-3 h-4 w-4" />}
                                                    {item.title}
                                                </Link>
                                            </Button>
                                        );
                                    })}
                                </nav>
                            </div>
                        </div>
                    </aside>

                    {/* Content Area */}
                    <div className="flex-1">
                        <div className="rounded-lg border bg-white shadow-sm">
                            <div className="p-6">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
