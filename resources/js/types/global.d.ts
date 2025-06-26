import type { route as routeFn } from 'ziggy-js';
import { Config } from 'ziggy-js';

declare global {
    const route: typeof routeFn;
}

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string;
    role: 'super_admin' | 'property_owner' | 'property_manager' | 'front_desk' | 'finance' | 'housekeeping' | 'guest';
    avatar?: string;
}

export interface NavItem {
    title: string;
    href: string;
    label?: string;
    disabled?: boolean;
    icon?: any;
}

export interface BreadcrumbItem {
    title: string;
    href?: string;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
    };
    ziggy: Config & { location: string };
    flash: {
        message?: string;
        error?: string;
    };
};

declare global {
    function route(name: string, params?: any): string;
}
