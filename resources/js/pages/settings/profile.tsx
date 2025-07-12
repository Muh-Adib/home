import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import DeleteUser from '@/components/delete-user';
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
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { 
    User, 
    Mail, 
    Shield, 
    CheckCircle, 
    AlertCircle, 
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
        
        // Add basic user data
        formData.append('name', data.name);
        formData.append('email', data.email);
        if (data.phone) formData.append('phone', data.phone);
        if (data.avatar) formData.append('avatar', data.avatar);
        
        // Add profile data
        if (data.address) formData.append('address', data.address);
        if (data.city) formData.append('city', data.city);
        if (data.state) formData.append('state', data.state);
        if (data.country) formData.append('country', data.country);
        if (data.postal_code) formData.append('postal_code', data.postal_code);
        if (data.birth_date) formData.append('birth_date', data.birth_date);
        if (data.gender) formData.append('gender', data.gender);
        if (data.bio) formData.append('bio', data.bio);

        router.post(route('profile.update'), formData, {
            preserveScroll: true,
            onSuccess: () => {
                if (data.avatar) {
                    setData('avatar', undefined);
                }
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
                            <Head title={`${t('settings.profile')} - Homsjogja`} />

            <SettingsLayout>
                <div className="space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-end">
                        <div className="flex items-center gap-2">
                            {user.email_verified_at ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {t('settings.verified')}
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 px-3 py-1">
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    {t('settings.unverified')}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        {/* Avatar & Basic Info */}
                        <Card className="shadow-sm border-0">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
                                <CardTitle className="flex items-center gap-2 text-blue-900">
                                    <User className="h-5 w-5" />
                                    {t('settings.personal_information')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* Avatar Section */}
                                    <div className="flex flex-col items-center gap-4 lg:w-1/3">
                                        <div className="relative group">
                                            <Avatar className="h-32 w-32 cursor-pointer ring-4 ring-gray-100 group-hover:ring-blue-200 transition-all duration-200" onClick={handleAvatarClick}>
                                                <AvatarImage src={avatarPreview || (user.avatar ? `/storage/${user.avatar}` : undefined)} alt={user.name} />
                                                <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-200 flex items-center justify-center">
                                                <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAvatarClick}
                                            className="flex items-center gap-2"
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
                                        
                                        <div className="text-center space-y-2">
                                            <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
                                            <p className="text-muted-foreground">{user.email}</p>
                                            {user.phone && (
                                                <p className="text-muted-foreground flex items-center justify-center gap-1">
                                                    <Phone className="h-4 w-4" />
                                                    {user.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Basic Info Form */}
                                    <div className="flex-1 space-y-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-base font-medium flex items-center gap-2">
                                                    <User className="h-4 w-4 text-gray-500" />
                                                    {t('settings.full_name')}
                                                </Label>
                                                <Input
                                                    id="name"
                                                    className="h-12 text-base"
                                                    value={data.name}
                                                    onChange={(e) => setData('name', e.target.value)}
                                                    required
                                                    autoComplete="name"
                                                    placeholder={t('settings.name_placeholder')}
                                                />
                                                <InputError className="mt-1" message={errors.name} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-base font-medium flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-gray-500" />
                                                    {t('settings.email_address')}
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        className="h-12 text-base"
                                                        value={data.email}
                                                        onChange={(e) => setData('email', e.target.value)}
                                                        required
                                                        autoComplete="username"
                                                        placeholder={t('settings.email_placeholder')}
                                                    />
                                                    {user.email_verified_at && (
                                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <InputError className="mt-1" message={errors.email} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="phone" className="text-base font-medium flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-gray-500" />
                                                    {t('settings.phone_number')}
                                                </Label>
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    className="h-12 text-base"
                                                    value={data.phone}
                                                    onChange={(e) => setData('phone', e.target.value)}
                                                    autoComplete="tel"
                                                    placeholder={t('settings.phone_placeholder')}
                                                />
                                                <InputError className="mt-1" message={errors.phone} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="gender" className="text-base font-medium flex items-center gap-2">
                                                    <UserIcon className="h-4 w-4 text-gray-500" />
                                                    {t('settings.gender')}
                                                </Label>
                                                <Select value={data.gender} onValueChange={(value) => setData('gender', value as 'male' | 'female' | 'other')}>
                                                    <SelectTrigger className="h-12 text-base">
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

                                            <div className="space-y-2">
                                                <Label htmlFor="birth_date" className="text-base font-medium flex items-center gap-2">
                                                    <Cake className="h-4 w-4 text-gray-500" />
                                                    {t('settings.birth_date')}
                                                </Label>
                                                <Input
                                                    id="birth_date"
                                                    type="date"
                                                    className="h-12 text-base"
                                                    value={data.birth_date}
                                                    onChange={(e) => setData('birth_date', e.target.value)}
                                                    autoComplete="bday"
                                                />
                                                <InputError className="mt-1" message={errors.birth_date} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="country" className="text-base font-medium flex items-center gap-2">
                                                    <Globe className="h-4 w-4 text-gray-500" />
                                                    {t('settings.country')}
                                                </Label>
                                                <Input
                                                    id="country"
                                                    className="h-12 text-base"
                                                    value={data.country}
                                                    onChange={(e) => setData('country', e.target.value)}
                                                    autoComplete="country"
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
                        <Card className="shadow-sm border-0">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-4">
                                <CardTitle className="flex items-center gap-2 text-green-900">
                                    <MapPin className="h-5 w-5" />
                                    {t('settings.address_information')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="address" className="text-base font-medium flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-gray-500" />
                                            {t('settings.address')}
                                        </Label>
                                        <Textarea
                                            id="address"
                                            className="min-h-[100px] text-base resize-none"
                                            value={data.address}
                                            onChange={(e) => setData('address', e.target.value)}
                                            placeholder={t('settings.address_placeholder')}
                                        />
                                        <InputError className="mt-1" message={errors.address} />
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="city" className="text-base font-medium">
                                                {t('settings.city')}
                                            </Label>
                                            <Input
                                                id="city"
                                                className="h-12 text-base"
                                                value={data.city}
                                                onChange={(e) => setData('city', e.target.value)}
                                                placeholder={t('settings.city_placeholder')}
                                            />
                                            <InputError className="mt-1" message={errors.city} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="state" className="text-base font-medium">
                                                {t('settings.state')}
                                            </Label>
                                            <Input
                                                id="state"
                                                className="h-12 text-base"
                                                value={data.state}
                                                onChange={(e) => setData('state', e.target.value)}
                                                placeholder={t('settings.state_placeholder')}
                                            />
                                            <InputError className="mt-1" message={errors.state} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="postal_code" className="text-base font-medium">
                                                {t('settings.postal_code')}
                                            </Label>
                                            <Input
                                                id="postal_code"
                                                className="h-12 text-base"
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
                        <Card className="shadow-sm border-0">
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-4">
                                <CardTitle className="flex items-center gap-2 text-purple-900">
                                    <FileText className="h-5 w-5" />
                                    {t('settings.bio')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="bio" className="text-base font-medium">
                                            {t('settings.bio_description')}
                                        </Label>
                                        <Textarea
                                            id="bio"
                                            className="min-h-[120px] text-base resize-none"
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

                        {/* Submit Section */}
                        <Card className="shadow-sm border-0">
                            <CardContent className="pt-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <Button 
                                            disabled={processing} 
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 px-8"
                                        >
                                            {processing ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                                    {t('settings.saving')}
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-5 w-5 mr-2" />
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
                                                <CheckCircle className="h-5 w-5" />
                                                <span className="text-sm font-medium">{t('settings.saved_successfully')}</span>
                                            </div>
                                        </Transition>
                                    </div>

                                    <div className="text-sm text-muted-foreground">
                                        {t('settings.last_updated')}: {new Date(user.updated_at || user.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </form>

                    {/* Account Security Section */}
                    <Card className="shadow-sm border-0">
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