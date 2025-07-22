// Components
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import { useTranslation } from 'react-i18next';

interface VerifyEmailProps {
    status?: string;
}

export default function VerifyEmail({ status }: VerifyEmailProps) {
    const { t } = useTranslation();
    const { post, processing } = useForm();

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <AuthLayout 
            title={t('auth.verify_email_title')} 
            description={t('auth.verify_email_subtitle')}
        >
            <Head title="Email Verification" />

            <div className="space-y-6">
                {/* Success Message */}
                {status && (
                    <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {status}
                        </div>
                    </div>
                )}

                {/* Email Icon */}
                <div className="flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Mail className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>

                {/* Instructions */}
                <div className="text-center space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {t('auth.check_your_email')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {t('auth.email_verification_sent')}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    <Button 
                        onClick={submit}
                        disabled={processing}
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? (
                            <>
                                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                {t('auth.sending_verification_email')}
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('auth.resend_verification_email')}
                            </>
                        )}
                    </Button>

                    <form method="post" action={route('logout')} className="text-center">
                        <Button 
                            type="submit" 
                            variant="outline"
                            className="w-full h-12 border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            {t('auth.logout')}
                        </Button>
                    </form>
                </div>

                {/* Help Text */}
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        {t('auth.didnt_receive_email')}
                    </h4>
                    <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                        <li className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                            {t('auth.check_spam_folder')}
                        </li>
                        <li className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                            {t('auth.correct_email_address')}
                        </li>
                        <li className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                            {t('auth.click_resend_above')}
                        </li>
                    </ul>
                </div>
            </div>
        </AuthLayout>
    );
}
