import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

interface DashboardLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    showSidebar?: boolean;
    variant?: 'default' | 'compact';
}

export default function DashboardLayout({ 
    children, 
    breadcrumbs = [], 
    showSidebar = true,
    variant = 'default'
}: PropsWithChildren<DashboardLayoutProps>) {
    if (!showSidebar) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <AppShell variant="sidebar">
            <ErrorBoundary>
                <AppSidebar />
            </ErrorBoundary>
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className={cn(
                    "p-6",
                    variant === 'compact' ? "p-4" : "p-6"
                )}>
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}

function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}
