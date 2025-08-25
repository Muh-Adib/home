import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SetPasswordForm {
    password: string;
    password_confirmation: string;
}

interface SetPasswordProps {
    email: string;
    token: string;
}

export default function SetPassword({ email, token }: SetPasswordProps) {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm<SetPasswordForm>({
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        post('/set-password', {
            onSuccess: () => {
                // Redirect to dashboard after successful password set
                window.location.href = '/dashboard';
            },
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title={t('auth.set_password')} />
            
            <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <h2 className="mt-6 text-3xl font-bold text-gray-900">
                            {t('auth.set_password_title')}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {t('auth.set_password_subtitle')}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            {email}
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center">
                                {t('auth.create_new_password')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Password */}
                                <div>
                                    <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                        {t('auth.password')}
                                    </Label>
                                    <div className="mt-1 relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                                            placeholder={t('auth.enter_password')}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <Eye className="h-5 w-5 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <Label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700">
                                        {t('auth.confirm_password')}
                                    </Label>
                                    <div className="mt-1 relative">
                                        <Input
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            required
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            className={`pr-10 ${errors.password_confirmation ? 'border-red-500' : ''}`}
                                            placeholder={t('auth.confirm_password')}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <Eye className="h-5 w-5 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password_confirmation && (
                                        <p className="mt-1 text-sm text-red-600">{errors.password_confirmation}</p>
                                    )}
                                </div>

                                {/* Password Requirements */}
                                <Alert>
                                    <Lock className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>{t('auth.password_requirements')}:</strong>
                                        <ul className="mt-2 text-sm space-y-1">
                                            <li>• {t('auth.password_min_length')}</li>
                                            <li>• {t('auth.password_contains_letter')}</li>
                                            <li>• {t('auth.password_contains_number')}</li>
                                            <li>• {t('auth.password_contains_symbol')}</li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full"
                                >
                                    {processing ? t('auth.setting_password') : t('auth.set_password')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
