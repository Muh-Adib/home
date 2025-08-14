// Components
import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle, Shield, AlertTriangle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { useTranslation } from 'react-i18next';

type ConfirmPasswordForm = {
    password: string;
};

export default function ConfirmPassword() {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm<Required<ConfirmPasswordForm>>({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout 
            title={t('auth.confirm_password_title')} 
            description={t('auth.confirm_password_subtitle')}
        >
            <Head title={t('auth.confirm_password_title')} />

            <div className="space-y-6">
                {/* Security Notice */}
                <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
                    <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                            {t('auth.security_notice')}
                        </p>
                    </div>
                </div>

                <form className="space-y-6" onSubmit={submit}>
                    {/* Password Field */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-foreground">
                            {t('auth.password')}
                        </Label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder={t('auth.enter_password')}
                                className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

                    {/* Submit Button */}
                    <Button 
                        type="submit" 
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" 
                        tabIndex={2} 
                        disabled={processing}
                    >
                        {processing ? (
                            <>
                                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                {t('auth.confirming')}
                            </>
                        ) : (
                            <>
                                <Shield className="h-4 w-4 mr-2" />
                                {t('auth.confirm_password_title')}
                            </>
                        )}
                    </Button>
                </form>

                {/* Security Info */}
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        {t('auth.why_password_needed')}
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                        {t('auth.password_confirmation_reason')}
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}
