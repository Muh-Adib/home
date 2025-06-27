import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { User, Mail, Shield, CheckCircle, AlertCircle, Save } from 'lucide-react';

type ProfileForm = {
    name: string;
    email: string;
}

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: route('home') || '/' },
        { title: t('settings.profile'), href: route('profile.edit') || '/settings/profile' },
    ];

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm<Required<ProfileForm>>({
        name: auth.user.name,
        email: auth.user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('settings.profile')} - Property Management System`} />

            <SettingsLayout>
                <div className="space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <User className="h-6 w-6 text-blue-600" />
                                {t('settings.profile_information')}
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                {t('settings.profile_description')}
                            </p>
                        </div>
                        
                        {/* Account Status Badge */}
                        <div className="flex items-center gap-2">
                            {auth.user.email_verified_at ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {t('settings.verified')}
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {t('settings.unverified')}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Profile Form Card */}
                    <Card className="shadow-lg border-0">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-600" />
                                {t('settings.personal_information')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={submit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Name Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-base font-medium flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-500" />
                                            {t('settings.full_name')}
                                        </Label>
                                        <Input
                                            id="name"
                                            className="h-11 text-base"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                            autoComplete="name"
                                            placeholder={t('settings.name_placeholder')}
                                        />
                                        <InputError className="mt-1" message={errors.name} />
                                    </div>

                                    {/* Email Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-base font-medium flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            {t('settings.email_address')}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="email"
                                                type="email"
                                                className="h-11 text-base"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                required
                                                autoComplete="username"
                                                placeholder={t('settings.email_placeholder')}
                                            />
                                            {auth.user.email_verified_at && (
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                </div>
                                            )}
                                        </div>
                                        <InputError className="mt-1" message={errors.email} />
                                    </div>
                                </div>

                                {/* Email Verification Alert */}
                                {mustVerifyEmail && auth.user.email_verified_at === null && (
                                    <Alert className="bg-yellow-50 border-yellow-200">
                                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                                        <AlertDescription className="text-yellow-800">
                                            {t('settings.email_unverified')}{' '}
                                            <Link
                                                href={route('verification.send')}
                                                method="post"
                                                as="button"
                                                className="font-medium underline hover:no-underline"
                                            >
                                                {t('settings.resend_verification')}
                                            </Link>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Verification Success Message */}
                                {status === 'verification-link-sent' && (
                                    <Alert className="bg-green-50 border-green-200">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-800">
                                            {t('settings.verification_sent')}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Separator />

                                {/* Submit Section */}
                                <div className="flex items-center justify-between pt-4">
                                    <div className="flex items-center gap-4">
                                        <Button 
                                            disabled={processing} 
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                        >
                                            {processing ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    {t('settings.saving')}
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    {t('settings.save_changes')}
                                                </>
                                            )}
                                        </Button>

                                        <Transition
                                            show={recentlySuccessful}
                                            enter="transition ease-in-out duration-300"
                                            enterFrom="opacity-0 scale-95"
                                            enterTo="opacity-100 scale-100"
                                            leave="transition ease-in-out duration-300"
                                            leaveTo="opacity-0 scale-95"
                                        >
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle className="h-4 w-4" />
                                                <span className="text-sm font-medium">{t('settings.saved_successfully')}</span>
                                            </div>
                                        </Transition>
                                    </div>

                                    {/* Last Updated Info */}
                                    <div className="text-sm text-muted-foreground">
                                        {t('settings.last_updated')}: {new Date(auth.user.updated_at || auth.user.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Account Security Section */}
                    <Card className="shadow-lg border-0">
                        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
                            <CardTitle className="flex items-center gap-2 text-red-700">
                                <Shield className="h-5 w-5" />
                                {t('settings.account_security')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <p className="text-muted-foreground">
                                    {t('settings.security_description')}
                                </p>
                                
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                    <div>
                                        <h4 className="font-medium">{t('settings.password')}</h4>
                                        <p className="text-sm text-muted-foreground">{t('settings.password_description')}</p>
                                    </div>
                                    <Link href={route('password.edit') || '/settings/password'}>
                                        <Button variant="outline">
                                            {t('settings.change_password')}
                                        </Button>
                                    </Link>
                                </div>
                                
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                    <div>
                                        <h4 className="font-medium">{t('settings.two_factor')}</h4>
                                        <p className="text-sm text-muted-foreground">{t('settings.two_factor_description')}</p>
                                    </div>
                                    <Badge variant="secondary">{t('settings.coming_soon')}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Management */}
                    <DeleteUser />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
