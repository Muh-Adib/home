import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import GuestLayout from '@/layouts/guest-layout';
import AdminLayout from '@/layouts/admin-layout';
import SettingsLayout from '@/layouts/settings/layout';
import {
    User,
    Mail,
    Shield,
    CheckCircle,
    AlertCircle,
    LayoutGrid,
    Save,
    Phone,
    MapPin,
    FileText,
    Camera,
    Globe,
    Cake,
    User as UserIcon,
    Edit3
} from 'lucide-react';
import { useState, useRef } from 'react';

type ProfileForm = {
    name: string;
    email: string;
    phone?: string;
    avatar?: File;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    birth_date?: string;
    gender?: 'male' | 'female' | 'other';
    bio?: string;
}

interface ProfileProps {
    mustVerifyEmail: boolean;
    status?: string;
    user: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        avatar?: string;
        email_verified_at?: string;
        updated_at: string;
        created_at: string;
        profile?: {
            address?: string;
            city?: string;
            state?: string;
            country?: string;
            postal_code?: string;
            birth_date?: string;
            gender?: 'male' | 'female' | 'other';
            bio?: string;
        };
    };
}

export default function Profile({ mustVerifyEmail, status, user }: ProfileProps) {
    const { t } = useTranslation();
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar ? `/storage/${user.avatar}` : null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: route('home') || '/' },
        { title: t('settings.profile'), href: route('profile.edit') || '/settings/profile' },
    ];

    const { data, setData, errors, processing, recentlySuccessful } = useForm<ProfileForm>({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.profile?.address || '',
        city: user.profile?.city || '',
        state: user.profile?.state || '',
        country: user.profile?.country || 'Indonesia',
        postal_code: user.profile?.postal_code || '',
        birth_date: user.profile?.birth_date || '',
        gender: user.profile?.gender || undefined,
        bio: user.profile?.bio || '',
    });

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('avatar', file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setAvatarPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const formData = new FormData();

        // Add basic user data (required fields)
        formData.append('name', data.name);
        formData.append('email', data.email);

        // Add phone (send even if empty to allow clearing)
        if (data.phone !== undefined) {
            formData.append('phone', data.phone || '');
        }

        // Add avatar only if file is selected (new upload)
        if (data.avatar instanceof File) {
            formData.append('avatar', data.avatar);
        }

        // Add profile data - send all fields even if empty to allow clearing
        if (data.address !== undefined) {
            formData.append('address', data.address || '');
        }
        if (data.city !== undefined) {
            formData.append('city', data.city || '');
        }
        if (data.state !== undefined) {
            formData.append('state', data.state || '');
        }
        if (data.country !== undefined) {
            formData.append('country', data.country || '');
        }
        if (data.postal_code !== undefined) {
            formData.append('postal_code', data.postal_code || '');
        }
        if (data.birth_date !== undefined) {
            formData.append('birth_date', data.birth_date || '');
        }
        if (data.gender !== undefined) {
            formData.append('gender', data.gender || '');
        }
        if (data.bio !== undefined) {
            formData.append('bio', data.bio || '');
        }

        router.post(route('profile.update'), formData, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: (page) => {
                // Reset avatar preview after successful upload
                if (data.avatar instanceof File) {
                    setData('avatar', undefined);
                    // Update preview dengan avatar baru dari server response
                    const updatedUser = page.props?.user as typeof user;
                    if (updatedUser?.avatar) {
                        setAvatarPreview(`/storage/${updatedUser.avatar}`);
                    }
                }
            }
        });
    };

    const { props: pageProps } = usePage<SharedData>();
    const auth = pageProps.auth;
    const isGuest = !auth?.user || auth.user.role === 'guest';

    const mainContent = (
        <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <span className="text-sm font-bold text-slate-700">Status Akun Anda:</span>
                <div className="flex items-center gap-2">
                    {user.email_verified_at ? (
                        <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-none font-bold text-xs px-2.5 py-1 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 mr-1 text-emerald-600" />
                            {t('settings.verified')}
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-none font-bold text-xs px-2.5 py-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 mr-1 text-amber-600" />
                            {t('settings.unverified')}
                        </Badge>
                    )}
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                {/* Avatar & Basic Info */}
                <Card className="shadow-sm border border-slate-200 overflow-hidden rounded-2xl bg-white">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b pb-4">
                        <CardTitle className="flex items-center gap-2 text-blue-800 font-black">
                            <User className="h-5 w-5" />
                            {t('settings.personal_information')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-4 lg:w-1/3 p-4 bg-slate-50 rounded-xl border border-slate-100 h-fit">
                                <div className="relative group">
                                    <Avatar className="h-32 w-32 cursor-pointer ring-4 ring-white group-hover:ring-blue-100 transition-all duration-200" onClick={handleAvatarClick}>
                                        <AvatarImage src={avatarPreview || (user.avatar ? `/storage/${user.avatar}` : undefined)} alt={user.name} />
                                        <AvatarFallback className="text-2xl font-black bg-blue-600 text-white">
                                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-200 flex items-center justify-center">
                                        <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                    </div>
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="text-lg font-bold text-slate-800">{user.name}</h3>
                                    <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                                    {user.phone && (
                                        <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1 mt-1">
                                            <Phone className="h-3.5 w-3.5" />
                                            {user.phone}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAvatarClick}
                                    className="flex items-center gap-2 font-bold w-full"
                                >
                                    <Edit3 className="h-4 w-4" />
                                    {t('settings.change_avatar')}
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Basic Info Form */}
                            <div className="flex-1 space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name" className="text-xs font-bold text-slate-700">
                                            {t('settings.full_name')} *
                                        </Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                            placeholder={t('settings.name_placeholder')}
                                        />
                                        <InputError className="mt-1" message={errors.name} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                                            {t('settings.email_address')} *
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="email"
                                                type="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                required
                                                placeholder={t('settings.email_placeholder')}
                                            />
                                            {user.email_verified_at && (
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                </div>
                                            )}
                                        </div>
                                        <InputError className="mt-1" message={errors.email} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="phone" className="text-xs font-bold text-slate-700">
                                            {t('settings.phone_number')}
                                        </Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            placeholder={t('settings.phone_placeholder')}
                                        />
                                        <InputError className="mt-1" message={errors.phone} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="gender" className="text-xs font-bold text-slate-700">
                                            {t('settings.gender')}
                                        </Label>
                                        <Select value={data.gender} onValueChange={(value) => setData('gender', value as 'male' | 'female' | 'other')}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('settings.select_gender')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">{t('settings.male')}</SelectItem>
                                                <SelectItem value="female">{t('settings.female')}</SelectItem>
                                                <SelectItem value="other">{t('settings.other')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError className="mt-1" message={errors.gender} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="birth_date" className="text-xs font-bold text-slate-700">
                                            {t('settings.birth_date')}
                                        </Label>
                                        <Input
                                            id="birth_date"
                                            type="date"
                                            value={data.birth_date}
                                            onChange={(e) => setData('birth_date', e.target.value)}
                                        />
                                        <InputError className="mt-1" message={errors.birth_date} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="country" className="text-xs font-bold text-slate-700">
                                            {t('settings.country')}
                                        </Label>
                                        <Input
                                            id="country"
                                            value={data.country}
                                            onChange={(e) => setData('country', e.target.value)}
                                            placeholder={t('settings.country_placeholder')}
                                        />
                                        <InputError className="mt-1" message={errors.country} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Address Information */}
                <Card className="shadow-sm border border-slate-200 overflow-hidden rounded-2xl bg-white">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b pb-4">
                        <CardTitle className="flex items-center gap-2 text-blue-800 font-black">
                            <MapPin className="h-5 w-5" />
                            {t('settings.address_information')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="address" className="text-xs font-bold text-slate-700">
                                    {t('settings.address')}
                                </Label>
                                <Textarea
                                    id="address"
                                    className="min-h-[80px] resize-none"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder={t('settings.address_placeholder')}
                                />
                                <InputError className="mt-1" message={errors.address} />
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="city" className="text-xs font-bold text-slate-700">
                                        {t('settings.city')}
                                    </Label>
                                    <Input
                                        id="city"
                                        value={data.city}
                                        onChange={(e) => setData('city', e.target.value)}
                                        placeholder={t('settings.city_placeholder')}
                                    />
                                    <InputError className="mt-1" message={errors.city} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="state" className="text-xs font-bold text-slate-700">
                                        {t('settings.state')}
                                    </Label>
                                    <Input
                                        id="state"
                                        value={data.state}
                                        onChange={(e) => setData('state', e.target.value)}
                                        placeholder={t('settings.state_placeholder')}
                                    />
                                    <InputError className="mt-1" message={errors.state} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="postal_code" className="text-xs font-bold text-slate-700">
                                        {t('settings.postal_code')}
                                    </Label>
                                    <Input
                                        id="postal_code"
                                        value={data.postal_code}
                                        onChange={(e) => setData('postal_code', e.target.value)}
                                        placeholder={t('settings.postal_code_placeholder')}
                                    />
                                    <InputError className="mt-1" message={errors.postal_code} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bio Section */}
                <Card className="shadow-sm border border-slate-200 overflow-hidden rounded-2xl bg-white">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b pb-4">
                        <CardTitle className="flex items-center gap-2 text-blue-800 font-black">
                            <FileText className="h-5 w-5" />
                            {t('settings.bio')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="bio" className="text-xs font-bold text-slate-700">
                                    {t('settings.bio_description')}
                                </Label>
                                <Textarea
                                    id="bio"
                                    className="min-h-[100px] resize-none"
                                    value={data.bio}
                                    onChange={(e) => setData('bio', e.target.value)}
                                    placeholder={t('settings.bio_placeholder')}
                                />
                                <InputError className="mt-1" message={errors.bio} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Email Verification Alert */}
                {mustVerifyEmail && user.email_verified_at === null && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                            {t('settings.email_unverified')}{' '}
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="font-semibold underline hover:no-underline"
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

                {/* Submit Section */}
                <Card className="shadow-sm border border-slate-200 overflow-hidden rounded-2xl bg-white">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    className="font-bold bg-blue-600 hover:bg-blue-700 h-11 px-6"
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
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>{t('settings.saved_successfully')}</span>
                                    </div>
                                </Transition>
                            </div>

                            <div className="text-xs text-muted-foreground font-medium">
                                {t('settings.last_updated')}: {new Date(user.updated_at || user.created_at).toLocaleDateString("id-ID")}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </form>

            {/* Account Security Section */}
            <Card className="shadow-sm border border-slate-200 overflow-hidden rounded-2xl bg-white">
                <CardHeader className="bg-gradient-to-r from-red-50 to-slate-50 border-b pb-4">
                    <CardTitle className="flex items-center gap-2 text-red-800 font-black">
                        <Shield className="h-5 w-5" />
                        {t('settings.account_security')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <p className="text-muted-foreground text-xs font-medium">
                            {t('settings.security_description')}
                        </p>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">{t('settings.password')}</h4>
                                <p className="text-xs text-muted-foreground font-medium">{t('settings.password_description')}</p>
                            </div>
                            <Link href={route('password.edit') || '/settings/password'}>
                                <Button variant="outline" className="font-bold text-xs">
                                    {t('settings.change_password')}
                                </Button>
                            </Link>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">{t('settings.two_factor')}</h4>
                                <p className="text-xs text-muted-foreground font-medium">{t('settings.two_factor_description')}</p>
                            </div>
                            <Badge variant="secondary" className="font-bold text-[10px] bg-slate-200 text-slate-700">{t('settings.coming_soon')}</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    if (!isGuest) {
        return (
            <AdminLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: t('settings.profile') }]}>
                <Head title={`${t('settings.profile')} - Homsjogja`} />
                <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t('settings.profile')}</h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">
                                {t('settings.profile_description')}
                            </p>
                        </div>
                        <Button asChild variant="outline" className="font-bold gap-2">
                            <Link href="/dashboard">
                                <LayoutGrid className="h-4 w-4" />
                                Kembali ke Dashboard
                            </Link>
                        </Button>
                    </div>
                    {mainContent}
                </div>
            </AdminLayout>
        );
    }

    return (
        <GuestLayout showHeader showFooter variant="default">
            <Head title={`${t('settings.profile')} - Homsjogja`} />

            <SettingsLayout>
                {mainContent}
            </SettingsLayout>
        </GuestLayout>
    );
}