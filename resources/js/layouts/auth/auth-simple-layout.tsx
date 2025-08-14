import AppLogoIcon from '@/components/app-logo-icon';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-background">
            <div className="relative flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-md">
                    <div className="flex flex-col gap-8">
                        {/* Header */}
                        <div className="flex flex-col items-center gap-6">
                            <Link 
                                href={route('home')} 
                                className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
                            >
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:shadow-blue-500/25">
                                    <AppLogoIcon className="size-8 fill-current text-white" />
                                </div>
                                <span className="sr-only">{title}</span>
                            </Link>

                            <div className="space-y-3 text-center">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    {title}
                                </h1>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        </div>

                        {/* Form Container */}
                        <div className="rounded-2xl bg-card p-8 shadow-lg border border-border">
                            {children}
                        </div>

                        {/* Footer */}
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                                {t('auth.all_rights_reserved')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
