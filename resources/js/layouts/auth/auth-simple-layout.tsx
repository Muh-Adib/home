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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 blur-3xl"></div>
            </div>

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
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    {title}
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        </div>

                        {/* Form Container */}
                        <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-xl ring-1 ring-gray-200/50 dark:bg-gray-800/80 dark:ring-gray-700/50">
                            {children}
                        </div>

                        {/* Footer */}
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t('auth.all_rights_reserved')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
