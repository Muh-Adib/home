import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { cn } from '@/lib/utils';

interface AppSidebarHeaderProps {
    breadcrumbs?: BreadcrumbItemType[];
    className?: string;
    showTrigger?: boolean;
}

export function AppSidebarHeader({ 
    breadcrumbs = [], 
    className,
    showTrigger = true 
}: AppSidebarHeaderProps) {
    return (
        <header className={cn(
            "flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4",
            className
        )}>
            <div className="flex items-center gap-2">
                {showTrigger && <SidebarTrigger className="-ml-1" />}
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
        </header>
    );
}
