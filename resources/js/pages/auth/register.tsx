import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle, Mail, Lock, User, MapPin, UserCheck, Phone } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AuthLayout from '@/layouts/auth-layout';
import { useTranslation } from 'react-i18next';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    country: string;
    gender: string;
    phone: string;
};

export default function Register() {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountryCode, setSelectedCountryCode] = useState('62');
    const { data, setData, post, processing, errors, reset } = useForm<Required<RegisterForm>>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        country: 'Indonesia',
        gender: 'male',
        phone: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        
        
        // Submit the form
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const countries = [
        'Indonesia',
        'Singapore',
        'Malaysia',
        'Thailand',
        'Philippines',
        'Vietnam',
        'Cambodia',
        'Laos',
        'Myanmar',
        'Brunei',
        'Australia',
        'New Zealand',
        'Japan',
        'South Korea',
        'China',
        'India',
        'United States',
        'United Kingdom',
        'Germany',
        'France',
        'Netherlands',
        'Other'
    ];

    const countryCodes = [
        { code: '62', country: 'Indonesia', flag: '🇮🇩', display: '+62' },
        { code: '65', country: 'Singapore', flag: '🇸🇬', display: '+65' },
        { code: '60', country: 'Malaysia', flag: '🇲🇾', display: '+60' },
        { code: '66', country: 'Thailand', flag: '🇹🇭', display: '+66' },
        { code: '63', country: 'Philippines', flag: '🇵🇭', display: '+63' },
        { code: '84', country: 'Vietnam', flag: '🇻🇳', display: '+84' },
        { code: '855', country: 'Cambodia', flag: '🇰🇭', display: '+855' },
        { code: '856', country: 'Laos', flag: '🇱🇦', display: '+856' },
        { code: '95', country: 'Myanmar', flag: '🇲🇲', display: '+95' },
        { code: '673', country: 'Brunei', flag: '🇧🇳', display: '+673' },
        { code: '61', country: 'Australia', flag: '🇦🇺', display: '+61' },
        { code: '64', country: 'New Zealand', flag: '🇳🇿', display: '+64' },
        { code: '81', country: 'Japan', flag: '🇯🇵', display: '+81' },
        { code: '82', country: 'South Korea', flag: '🇰🇷', display: '+82' },
        { code: '86', country: 'China', flag: '🇨🇳', display: '+86' },
        { code: '91', country: 'India', flag: '🇮🇳', display: '+91' },
        { code: '1', country: 'United States', flag: '🇺🇸', display: '+1' },
        { code: '44', country: 'United Kingdom', flag: '🇬🇧', display: '+44' },
        { code: '49', country: 'Germany', flag: '🇩🇪', display: '+49' },
        { code: '33', country: 'France', flag: '🇫🇷', display: '+33' },
        { code: '31', country: 'Netherlands', flag: '🇳🇱', display: '+31' },
    ];

    // Auto-update country code when country changes
    const handleCountryChange = (country: string) => {
        setData('country', country);
        const countryCode = countryCodes.find(cc => cc.country === country);
        if (countryCode) {
            setSelectedCountryCode(countryCode.code);
        }
    };

    // Handle phone number input
    const handlePhoneChange = (value: string) => {
        
        // Format phone number before submission
        let formattedPhone = value;
        
        // Remove any existing country code from input
        const countryCodeWithoutPlus = selectedCountryCode;
        const countryCodeWithPlus = '+' + selectedCountryCode;
        
        // Remove country code if user included it
        if (formattedPhone.startsWith(countryCodeWithPlus)) {
            formattedPhone = formattedPhone.replace(countryCodeWithPlus, '');
        } else if (formattedPhone.startsWith(countryCodeWithoutPlus)) {
            formattedPhone = formattedPhone.replace(countryCodeWithoutPlus, '');
        }
        
        // Remove leading zeros and any non-digit characters
        formattedPhone = formattedPhone.replace(/^0+/, '').replace(/\D/g, '');
        
        // Combine country code with phone number
        const finalPhone = selectedCountryCode + formattedPhone;
        setPhoneNumber(finalPhone);
        // Update the form data with formatted phone
        setData('phone', finalPhone);
    };

    // Get current country code display
    const getCurrentCountryCode = () => {
        const currentCode = countryCodes.find(cc => cc.code === selectedCountryCode);
        return currentCode ? currentCode.display : '+62';
    };

    return (
        <AuthLayout 
            title={t('auth.register_title')} 
            description={t('auth.register_subtitle')}
        >
            <Head title={t('auth.create_account')} />

            <form className="space-y-6" onSubmit={submit}>
                {/* Name Field */}
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-foreground">
                        {t('auth.full_name')}
                    </Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="name"
                            type="text"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={processing}
                            placeholder={t('auth.enter_full_name')}
                            className="pl-10 h-12 border-border focus:border-brand-primary focus:ring-brand-primary"
                        />
                    </div>  
                    <InputError message={errors.name} />
                </div>

                {/* Gender and Country Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="gender" className="text-sm font-medium text-foreground">
                            {t('auth.gender')}
                        </Label>
                        <Select value={data.gender} onValueChange={(value) => setData('gender', value)}>
                            <SelectTrigger className="h-12 border-border focus:border-brand-primary focus:ring-brand-primary ">
                                <SelectValue placeholder={t('auth.select_gender')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">{t('auth.male')}</SelectItem>
                                <SelectItem value="female">{t('auth.female')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.gender} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="country" className="text-sm font-medium text-foreground">
                            {t('auth.country')}
                        </Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Select value={data.country} onValueChange={handleCountryChange}>
                                <SelectTrigger className="pl-10 h-12 border-border focus:border-brand-primary focus:ring-brand-primary ">
                                    <SelectValue placeholder={t('auth.select_country')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {countries.map(country => (
                                        <SelectItem key={country} value={country}>
                                            {country}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <InputError message={errors.country} />
                    </div>
                </div>

                {/* Phone Number Field */}
                <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                        {t('auth.phone')}
                    </Label>
                    <div className="flex gap-2">
                        <div className="w-24">
                            <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}>
                                <SelectTrigger className="h-12 border-border focus:border-brand-primary focus:ring-brand-primary ">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {countryCodes.map(countryCode => (
                                        <SelectItem key={countryCode.code} value={countryCode.code}>
                                            <div className="flex items-center gap-2">
                                                <span>{countryCode.flag}</span>
                                                <span>{countryCode.display}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="phone"
                                type="tel"
                                required
                                tabIndex={2}
                                autoComplete="tel"
                                value={phoneNumber}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                disabled={processing}
                                placeholder="Contoh: 08123456789 atau 8123456789"
                                className="pl-10 h-12 border-border focus:border-brand-primary focus:ring-brand-primary "
                            />
                        </div>
                    </div>
                    <InputError message={errors.phone} />
                </div>
                
                {/* Email Field */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                        {t('auth.email_address')}
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="email"
                            type="email"
                            required
                            tabIndex={3}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            disabled={processing}
                            placeholder={t('auth.enter_email')}
                            className="pl-10 h-12 border-border focus:border-brand-primary focus:ring-brand-primary "
                        />
                    </div>
                    <InputError message={errors.email} />
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-foreground">
                            {t('auth.password')}
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                tabIndex={4}
                                autoComplete="new-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                disabled={processing}
                                placeholder={t('auth.create_password')}
                                className="pl-10 pr-10 h-12 border-border focus:border-primary focus:ring-primary bg-background text-foreground"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <InputError message={errors.password} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password_confirmation" className="text-sm font-medium text-foreground">
                            {t('auth.confirm_password')}
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="password_confirmation"
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                tabIndex={5}
                                autoComplete="new-password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                disabled={processing}
                                placeholder={t('auth.confirm_your_password')}
                                className="pl-10 pr-10 h-12 border-border focus:border-primary focus:ring-primary bg-background text-foreground"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <InputError message={errors.password_confirmation} />
                    </div>
                </div>

                {/* Password Requirements */}
                <div className="rounded-lg bg-brand-primary-20 p-4">
                    <h4 className="text-sm font-medium text-brand-primary mb-2">
                        {t('auth.password_requirements')}
                    </h4>
                    <ul className="text-xs text-brand-primary space-y-1">
                        <li className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full mr-2"></span>
                            {t('auth.password_requirements_8_chars')}
                        </li>
                        <li className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full mr-2"></span>
                            {t('auth.password_requirements_uppercase_lowercase')}
                        </li>
                        <li className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full mr-2"></span>
                            {t('auth.password_requirements_number')}
                        </li>
                    </ul>
                </div>

                {/* Submit Button */}
                <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" 
                    tabIndex={6} 
                    disabled={processing}
                >
                    {processing ? (
                        <>
                            <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                            {t('auth.creating_account')}
                        </>
                    ) : (
                        <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            {t('auth.create_account')}
                        </>
                    )}
                </Button>

                {/* Terms and Privacy */}
                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        {t('auth.terms_privacy')}{' '}
                        <TextLink href="/tos" className="text-blue-600 hover:text-blue-700">
                            {t('auth.terms_of_service')}
                        </TextLink>{' '}
                        {t('auth.and')}{' '}
                        <TextLink href="/privacy" className="text-blue-600 hover:text-blue-700">
                            {t('auth.privacy_policy')}
                        </TextLink>
                    </p>
                </div>

                {/* Divider 
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">
                            {t('auth.or_continue_with')}
                        </span>
                    </div>
                </div>*/}

                {/* Social Register Buttons 
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-12 border-gray-200 hover:bg-gray-50"
                    >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-12 border-gray-200 hover:bg-gray-5"
                    >
                        <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                    </Button>
                </div>*/}

                {/* Sign In Link */}
                <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('auth.have_account')}{' '}
                        <TextLink 
                            href={route('login')} 
                            className="font-medium text-blue-600 hover:text-blue-700" 
                            tabIndex={7}
                        >
                            {t('auth.sign_in')}
                        </TextLink>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
}
