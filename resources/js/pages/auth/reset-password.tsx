import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle, Lock, Shield } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { useTranslation } from 'react-i18next';

type ResetPasswordForm = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

interface ResetPasswordProps {
    email: string;
    token: string;
}

export default function ResetPassword({ email, token }: ResetPasswordProps) {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm<Required<ResetPasswordForm>>({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout 
            title={t('auth.reset_password_title')} 
            description={t('auth.reset_password_subtitle')}
        >
            <Head title={t('auth.reset_password')} />

            <form className="space-y-6" onSubmit={submit}>
                {/* Email Field (Hidden) */}
                <input type="hidden" name="email" value={data.email} />

                {/* Password Field */}
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                        {t('auth.new_password')}
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="new-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder={t('auth.enter_new_password')}
                            className="pl-10 h-12 border-border focus:border-brand-primary focus:ring-brand-primary "
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

                {/* Confirm Password Field */}
                <div className="space-y-2">
                    <Label htmlFor="password_confirmation" className="text-sm font-medium text-foreground">
                        {t('auth.confirm_new_password')}
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="password_confirmation"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            tabIndex={2}
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            placeholder={t('auth.enter_confirm_password')}
                            className="pl-10 h-12 border-border focus:border-brand-primary focus:ring-brand-primary "
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
                    tabIndex={3} 
                    disabled={processing}
                >
                    {processing ? (
                        <>
                            <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                            {t('auth.resetting_password')}
                        </>
                    ) : (
                        <>
                            <Shield className="h-4 w-4 mr-2" />
                            {t('auth.reset_password')}
                        </>
                    )}
                </Button>

                {/* Security Note */}
                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                    <div className="flex items-start">
                        <Shield className="h-4 w-4 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-green-800 dark:text-green-200">
                            {t('auth.security_info')}
                        </p>
                    </div>
                </div>
            </form>
        </AuthLayout>
    );
}
