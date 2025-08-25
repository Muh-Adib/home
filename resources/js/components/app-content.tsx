import { SidebarInset } from '@/components/ui/sidebar';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface AppContentProps extends React.ComponentProps<'main'> {
    variant?: 'header' | 'sidebar';
    showHeader?: boolean;
}

export function AppContent({ 
    variant = 'header', 
    showHeader = true,
    children, 
    className,
    ...props 
}: AppContentProps) {
    if (variant === 'sidebar') {
        return (
            <SidebarInset className={cn(className)} {...props}>
                {children}
            </SidebarInset>
        );
    }

    return (
        <main 
            className={cn(
                "mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl",
                showHeader && "pt-16", // Add padding top if header is shown
                className
            )} 
            {...props}
        >
            {children}
        </main>
    );
}
