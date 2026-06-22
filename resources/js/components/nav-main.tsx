import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const { t } = useTranslation();
    
    if (items.length === 0) return null;

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton  
                            asChild 
                            isActive={item.href === page.url}
                            tooltip={{ children: t(`nav.${item.title}`) }}
                            className="group"
                        >
                            <Link 
                                href={item.href || null} 
                                prefetch
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 data-[active=true]:border-r-2 data-[active=true]:border-blue-600"
                            >
                                {item.icon && (
                                    <item.icon className="h-4 w-4 transition-colors group-hover:text-gray-900 data-[active=true]:text-blue-600" />
                                )}
                                <span className="truncate">{t(`nav.${item.title}`)}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
